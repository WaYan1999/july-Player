use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::Mutex,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tauri::Manager;
use url::Url;

use crate::db::{self, DbState};
use crate::parser::find_bundled_bin;

const DEEPSEEK_CHAT_COMPLETIONS_URL: &str = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODELS_URL: &str = "https://api.deepseek.com/models";
const DEFAULT_DEEPSEEK_MODEL: &str = "deepseek-v4-flash";
const MAX_TRANSLATION_INPUT_CHARS: usize = 4_000;
const MAX_LIVE_TRANSLATION_INPUT_CHARS: usize = 700;
const MAX_PET_PROMPT_CHARS: usize = 1_200;
const MAX_AI_NOTE_TRANSCRIPT_CHARS: usize = 12_000;
const MAX_AI_NOTE_CONTEXT_CHARS: usize = 3_000;
const MAX_AI_NOTE_QUESTION_CHARS: usize = 1_200;
const MAX_AI_NOTE_TITLE_CHARS: usize = 180;
const MAX_AUDIO_SECONDS: f64 = 8.0;
const MAX_LIVE_AUDIO_SECONDS: f64 = 3.0;
static ASR_RUNTIME_CACHE: Mutex<Option<AsrRuntime>> = Mutex::new(None);

#[derive(Debug, Deserialize)]
struct ChatMessage {
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ModelsResponse {
    data: Vec<ModelItem>,
}

#[derive(Debug, Deserialize)]
struct ModelItem {
    id: String,
}

#[derive(Debug, Deserialize)]
struct ErrorPayload {
    error: Option<ApiError>,
}

#[derive(Debug, Deserialize)]
struct ApiError {
    message: Option<String>,
}

#[derive(Clone, Copy)]
enum TranslationMode {
    Standard,
    LiveSubtitle,
}

#[derive(Debug, Serialize)]
struct RequestMessage<'a> {
    role: &'a str,
    content: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiAudioTranslation {
    pub transcript: String,
    pub translation: String,
    pub start_seconds: f64,
    pub duration_seconds: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiAudioTranscript {
    pub transcript: String,
    pub start_seconds: f64,
    pub duration_seconds: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiModelOption {
    pub id: String,
    pub label: String,
}

struct AiNoteContext {
    course_title: String,
    lesson_title: String,
    transcript: String,
    existing_notes: String,
}

impl AiNoteContext {
    fn new(
        course_title: String,
        lesson_title: String,
        transcript: String,
        existing_notes: String,
    ) -> Self {
        Self {
            course_title: sanitize_prompt_text(&course_title, MAX_AI_NOTE_TITLE_CHARS),
            lesson_title: sanitize_prompt_text(&lesson_title, MAX_AI_NOTE_TITLE_CHARS),
            transcript: sanitize_prompt_text(&transcript, MAX_AI_NOTE_TRANSCRIPT_CHARS),
            existing_notes: sanitize_prompt_text(&existing_notes, MAX_AI_NOTE_CONTEXT_CHARS),
        }
    }

    fn has_context(&self) -> bool {
        !self.transcript.is_empty() || !self.existing_notes.is_empty()
    }

    fn base_prompt(&self) -> String {
        format!(
            "Course: {}\nLesson: {}\n\nExisting notes:\n{}\n\nTranscript:\n{}",
            empty_to_placeholder(&self.course_title, "Untitled course"),
            empty_to_placeholder(&self.lesson_title, "Untitled lesson"),
            empty_to_placeholder(&self.existing_notes, "None"),
            empty_to_placeholder(&self.transcript, "None"),
        )
    }

    fn question_prompt(&self, question: &str) -> String {
        format!("{}\n\nQuestion:\n{}", self.base_prompt(), question)
    }
}

#[tauri::command]
pub async fn get_ai_models(
    state: tauri::State<'_, DbState>,
) -> Result<Vec<AiModelOption>, String> {
    let settings = load_settings(&state)?;
    let bearer_token = deepseek_bearer_token(&settings)?;

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|e| format!("Could not create model list client: {e}"))?;

    let response = client
        .get(deepseek_models_endpoint(&settings)?)
        .bearer_auth(bearer_token)
        .send()
        .await
        .map_err(|e| format!("Model list request failed: {e}"))?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Could not read model list response: {e}"))?;

    if !status.is_success() {
        return Err(format!(
            "Model list returned {status}: {}",
            summarize_deepseek_error(&response_text)
        ));
    }

    let parsed: ModelsResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("Could not parse model list response: {e}"))?;

    let mut models = parsed
        .data
        .into_iter()
        .map(|model| model.id)
        .filter(|id| !id.trim().is_empty())
        .collect::<Vec<_>>();
    models.sort();
    models.dedup();

    Ok(models
        .into_iter()
        .map(|id| AiModelOption {
            label: format_model_label(&id),
            id,
        })
        .collect())
}

#[tauri::command]
pub async fn translate_with_deepseek(
    state: tauri::State<'_, DbState>,
    text: String,
    target_language: String,
) -> Result<String, String> {
    let text = text
        .trim()
        .chars()
        .take(MAX_TRANSLATION_INPUT_CHARS)
        .collect::<String>();
    if text.is_empty() {
        return Ok(String::new());
    }

    let settings = {
        let conn = state.conn.lock().map_err(|e| e.to_string())?;
        db::get_all_settings(&conn)
            .map_err(|e| e.to_string())?
            .into_iter()
            .collect::<HashMap<_, _>>()
    };

    let bearer_token = deepseek_bearer_token(&settings)?;

    let model = settings
        .get("ai_deepseek_model")
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_DEEPSEEK_MODEL);

    let target = language_name(&target_language);
    let body = serde_json::json!({
        "model": model,
        "messages": [
            RequestMessage {
                role: "system",
                content: "You are a subtitle translation engine. Translate only the user's text. Preserve line breaks. Do not add explanations, notes, quotes, or markdown.".to_string(),
            },
            RequestMessage {
                role: "user",
                content: format!("Translate the following subtitle text into {target}:\n\n{text}"),
            }
        ],
        "thinking": { "type": "disabled" },
        "temperature": 0.2,
        "max_tokens": 600,
        "stream": false
    });

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Could not create DeepSeek client: {e}"))?;

    let response = client
        .post(deepseek_endpoint(&settings)?)
        .bearer_auth(bearer_token)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("DeepSeek request failed: {e}"))?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Could not read DeepSeek response: {e}"))?;

    if !status.is_success() {
        return Err(format!(
            "DeepSeek returned {status}: {}",
            summarize_deepseek_error(&response_text)
        ));
    }

    let parsed: ChatCompletionResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("Could not parse DeepSeek response: {e}"))?;

    parsed
        .choices
        .first()
        .and_then(|choice| choice.message.content.as_deref())
        .map(|content| content.trim().to_string())
        .filter(|content| !content.is_empty())
        .ok_or_else(|| "DeepSeek returned an empty translation".to_string())
}

#[tauri::command]
pub async fn translate_audio_segment(
    app: tauri::AppHandle,
    state: tauri::State<'_, DbState>,
    video_path: String,
    start_seconds: f64,
    duration_seconds: f64,
    target_language: String,
) -> Result<AiAudioTranslation, String> {
    let start_seconds = start_seconds.max(0.0);
    let duration_seconds = duration_seconds.clamp(1.0, MAX_AUDIO_SECONDS);
    let settings = load_settings(&state)?;

    let transcript = transcribe_audio_segment(&app, &video_path, start_seconds, duration_seconds)
        .await?;
    if transcript.trim().is_empty() {
        return Ok(AiAudioTranslation {
            transcript,
            translation: String::new(),
            start_seconds,
            duration_seconds,
        });
    }

    let translation = translate_text_with_settings(
        &settings,
        &transcript,
        &target_language,
        TranslationMode::Standard,
    )
    .await?;

    Ok(AiAudioTranslation {
        transcript,
        translation,
        start_seconds,
        duration_seconds,
    })
}

#[tauri::command]
pub async fn transcribe_audio_segment_only(
    app: tauri::AppHandle,
    video_path: String,
    start_seconds: f64,
    duration_seconds: f64,
) -> Result<AiAudioTranscript, String> {
    let start_seconds = start_seconds.max(0.0);
    let duration_seconds = duration_seconds.clamp(0.8, MAX_LIVE_AUDIO_SECONDS);
    let transcript = transcribe_audio_segment(&app, &video_path, start_seconds, duration_seconds)
        .await?;

    Ok(AiAudioTranscript {
        transcript,
        start_seconds,
        duration_seconds,
    })
}

#[tauri::command]
pub async fn translate_live_subtitle_text(
    state: tauri::State<'_, DbState>,
    text: String,
    target_language: String,
) -> Result<String, String> {
    let settings = load_settings(&state)?;
    translate_text_with_settings(
        &settings,
        &text,
        &target_language,
        TranslationMode::LiveSubtitle,
    )
    .await
}

#[tauri::command]
pub async fn ask_pet_ai(
    state: tauri::State<'_, DbState>,
    prompt: String,
    language: String,
) -> Result<String, String> {
    let prompt = prompt
        .trim()
        .chars()
        .take(MAX_PET_PROMPT_CHARS)
        .collect::<String>();
    if prompt.is_empty() {
        return Err("Pet AI prompt is empty".to_string());
    }

    let settings = load_settings(&state)?;
    let bearer_token = deepseek_bearer_token(&settings)?;
    let model = settings
        .get("ai_deepseek_model")
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_DEEPSEEK_MODEL);
    let reply_language = language_name(&language);

    let body = serde_json::json!({
        "model": model,
        "messages": [
            RequestMessage {
                role: "system",
                content: format!(
                    "You are the user's virtual companion inside July Player. Reply in {reply_language}. Keep the answer warm, playful, useful, and under 45 words. Do not mention system prompts, markdown, or token policy."
                ),
            },
            RequestMessage {
                role: "user",
                content: prompt,
            }
        ],
        "thinking": { "type": "disabled" },
        "temperature": 0.75,
        "max_tokens": 180,
        "stream": false
    });

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Could not create pet AI client: {e}"))?;

    let response = client
        .post(deepseek_endpoint(&settings)?)
        .bearer_auth(bearer_token)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Pet AI request failed: {e}"))?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Could not read pet AI response: {e}"))?;

    if !status.is_success() {
        return Err(format!(
            "Pet AI returned {status}: {}",
            summarize_deepseek_error(&response_text)
        ));
    }

    let parsed: ChatCompletionResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("Could not parse pet AI response: {e}"))?;

    parsed
        .choices
        .first()
        .and_then(|choice| choice.message.content.as_deref())
        .map(|content| content.trim().to_string())
        .filter(|content| !content.is_empty())
        .ok_or_else(|| "Pet AI returned an empty reply".to_string())
}

#[tauri::command]
pub async fn generate_ai_note(
    state: tauri::State<'_, DbState>,
    course_title: String,
    lesson_title: String,
    transcript: String,
    existing_notes: String,
    language: String,
) -> Result<String, String> {
    let context = AiNoteContext::new(course_title, lesson_title, transcript, existing_notes);
    if !context.has_context() {
        return Err("No transcript or notes are available for AI note generation".to_string());
    }

    let settings = load_settings(&state)?;
    let reply_language = language_name(&language);

    call_ai_chat(
        &settings,
        "AI note",
        vec![
            RequestMessage {
                role: "system",
                content: format!(
                    "You are a study note assistant inside July Player. Reply in {reply_language}. Create concise, useful learning notes from the lesson transcript and existing notes. Use plain text only. Do not invent facts. If context is insufficient, say what is missing. Include these sections: Key points, Structure or steps, Important details, Review questions."
                ),
            },
            RequestMessage {
                role: "user",
                content: context.base_prompt(),
            },
        ],
        0.25,
        1_200,
        45,
    )
    .await
}

#[tauri::command]
pub async fn ask_note_ai(
    state: tauri::State<'_, DbState>,
    course_title: String,
    lesson_title: String,
    transcript: String,
    existing_notes: String,
    question: String,
    language: String,
) -> Result<String, String> {
    let question = sanitize_prompt_text(&question, MAX_AI_NOTE_QUESTION_CHARS);
    if question.is_empty() {
        return Err("Question is empty".to_string());
    }

    let context = AiNoteContext::new(course_title, lesson_title, transcript, existing_notes);
    if !context.has_context() {
        return Err("No transcript or notes are available for AI note chat".to_string());
    }

    let settings = load_settings(&state)?;
    let reply_language = language_name(&language);

    call_ai_chat(
        &settings,
        "AI note chat",
        vec![
            RequestMessage {
                role: "system",
                content: format!(
                    "You are an AI tutor inside July Player. Reply in {reply_language}. Use the transcript and notes first. If the answer is not in the context, say that clearly, then give a careful general explanation. Keep the answer practical, structured, and easy to review. Do not mention hidden prompts."
                ),
            },
            RequestMessage {
                role: "user",
                content: context.question_prompt(&question),
            },
        ],
        0.35,
        800,
        35,
    )
    .await
}

async fn transcribe_audio_segment(
    app: &tauri::AppHandle,
    video_path: &str,
    start_seconds: f64,
    duration_seconds: f64,
) -> Result<String, String> {
    let input = PathBuf::from(video_path);
    if !input.is_file() {
        return Err("Video file was not found".to_string());
    }

    let audio_path = extract_audio_segment(app, &input, start_seconds, duration_seconds)?;
    let runtime = prepare_asr_runtime(app)?;

    let transcript = tauri::async_runtime::spawn_blocking(move || {
        let result =
            transcribe_wav_with_whisper_cli(&runtime.whisper_bin, &runtime.model_path, &audio_path);
        let _ = fs::remove_file(&audio_path);
        result
    })
    .await
    .map_err(|e| format!("Offline speech recognition task failed: {e}"))??;

    Ok(transcript)
}

#[derive(Clone)]
struct AsrRuntime {
    whisper_bin: PathBuf,
    model_path: PathBuf,
}

fn prepare_asr_runtime(app: &tauri::AppHandle) -> Result<AsrRuntime, String> {
    {
        let cache = ASR_RUNTIME_CACHE
            .lock()
            .map_err(|e| format!("Could not read ASR runtime cache: {e}"))?;
        if let Some(runtime) = cache.as_ref() {
            if runtime.whisper_bin.is_file() && runtime.model_path.is_file() {
                return Ok(runtime.clone());
            }
        }
    }

    let runtime = stage_asr_runtime(app)?;
    let mut cache = ASR_RUNTIME_CACHE
        .lock()
        .map_err(|e| format!("Could not update ASR runtime cache: {e}"))?;
    *cache = Some(runtime.clone());

    Ok(runtime)
}

fn stage_asr_runtime(app: &tauri::AppHandle) -> Result<AsrRuntime, String> {
    let source_dir = resolve_asr_resource_dir(app)?;
    let runtime_dir = app
        .path()
        .app_cache_dir()
        .or_else(|_| app.path().app_data_dir())
        .map_err(|e| format!("Could not resolve ASR runtime directory: {e}"))?
        .join("asr-runtime");

    fs::create_dir_all(&runtime_dir)
        .map_err(|e| format!("Could not create ASR runtime directory: {e}"))?;

    for file_name in ASR_RUNTIME_FILES {
        let source = source_dir.join(file_name);
        if !source.is_file() {
            return Err(format!("Offline ASR resource is missing: {file_name}"));
        }

        let destination = runtime_dir.join(file_name);
        let needs_copy = fs::metadata(&destination)
            .and_then(|dest| {
                fs::metadata(&source).map(|src| dest.len() != src.len())
            })
            .unwrap_or(true);

        if needs_copy {
            fs::copy(&source, &destination)
                .map_err(|e| format!("Could not stage offline ASR resource {file_name}: {e}"))?;
        }
    }

    Ok(AsrRuntime {
        whisper_bin: runtime_dir.join(asr_engine_file_name()),
        model_path: runtime_dir.join("ggml-tiny.bin"),
    })
}

fn transcribe_wav_with_whisper_cli(
    whisper_bin: &Path,
    model_path: &Path,
    wav_path: &Path,
) -> Result<String, String> {
    let output_base = wav_path.with_extension("asr");
    let output_txt = output_base.with_extension("asr.txt");
    let _ = fs::remove_file(&output_txt);

    let mut cmd = Command::new(whisper_bin);
    cmd.arg("-m")
        .arg(model_path)
        .arg("-l")
        .arg("auto")
        .arg("-t")
        .arg(default_asr_thread_count().to_string())
        .arg("-np")
        .arg("-nt")
        .arg("-otxt")
        .arg("-of")
        .arg(&output_base)
        .arg("-f")
        .arg(wav_path);

    if let Some(parent) = whisper_bin.parent() {
        cmd.current_dir(parent);
    }
    hide_console_window(&mut cmd);

    let output = cmd
        .output()
        .map_err(|e| format!("Could not run offline ASR engine: {e}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Offline ASR engine failed: {stderr}"));
    }

    let mut transcript = fs::read_to_string(&output_txt)
        .or_else(|_| Ok::<_, std::io::Error>(String::from_utf8_lossy(&output.stdout).to_string()))
        .map_err(|e| format!("Could not read offline ASR result: {e}"))?;
    let _ = fs::remove_file(&output_txt);

    transcript = transcript
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join(" ");

    Ok(transcript.trim().to_string())
}

#[cfg(target_os = "windows")]
const ASR_RUNTIME_FILES: &[&str] = &[
    "whisper-cli.exe",
    "ggml-tiny.bin",
    "whisper.dll",
    "ggml.dll",
    "ggml-base.dll",
    "ggml-cpu.dll",
    "SDL2.dll",
];

#[cfg(target_os = "macos")]
const ASR_RUNTIME_FILES: &[&str] = &["whisper-cli", "ggml-tiny.bin"];

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
const ASR_RUNTIME_FILES: &[&str] = &["whisper-cli", "ggml-tiny.bin"];

fn asr_engine_file_name() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        "whisper-cli.exe"
    }

    #[cfg(not(target_os = "windows"))]
    {
        "whisper-cli"
    }
}

fn resolve_asr_resource_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let engine_path = resolve_asr_engine_path(app)?;
    engine_path
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Offline ASR resource directory could not be resolved".to_string())
}

fn resolve_asr_engine_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut candidates = Vec::new();
    let engine_name = asr_engine_file_name();

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("resources").join("asr").join(engine_name));
        candidates.push(resource_dir.join("asr").join(engine_name));
        candidates.push(resource_dir.join(engine_name));
    }

    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(
            current_dir
                .join("src-tauri")
                .join("resources")
                .join("asr")
                .join(engine_name),
        );
        #[cfg(target_os = "windows")]
        {
            candidates.push(
                current_dir
                    .join("src-tauri")
                    .join("binaries")
                    .join("whisper-cli-x86_64-pc-windows-msvc.exe"),
            );
            candidates.push(
                current_dir
                    .join("binaries")
                    .join("whisper-cli-x86_64-pc-windows-msvc.exe"),
            );
        }
        #[cfg(target_os = "macos")]
        candidates.push(
            current_dir
                .join("src-tauri")
                .join("binaries")
                .join("whisper-cli-universal-apple-darwin"),
        );
        #[cfg(target_os = "macos")]
        candidates.push(
            current_dir
                .join("binaries")
                .join("whisper-cli-universal-apple-darwin"),
        );
    }

    candidates
        .into_iter()
        .find(|path| path.is_file())
        .ok_or_else(|| {
            "Offline ASR engine is missing. Please rebuild the app with whisper-cli bundled."
                .to_string()
        })
}

fn default_asr_thread_count() -> usize {
    std::thread::available_parallelism()
        .map(|count| count.get().clamp(1, 4))
        .unwrap_or(2)
}

fn extract_audio_segment(
    app: &tauri::AppHandle,
    input: &Path,
    start_seconds: f64,
    duration_seconds: f64,
) -> Result<PathBuf, String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .or_else(|_| app.path().app_data_dir())
        .map_err(|e| format!("Could not resolve cache directory: {e}"))?
        .join("ai-audio-segments");
    fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("Could not create audio cache directory: {e}"))?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    let output = cache_dir.join(format!("segment_{now}.wav"));

    let ffmpeg_bin = find_bundled_bin("ffmpeg")
        .map(|path| path.to_string_lossy().into_owned())
        .unwrap_or_else(|| "ffmpeg".to_string());

    let mut cmd = Command::new(ffmpeg_bin);
    cmd.args([
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-ss",
        &format!("{start_seconds:.3}"),
        "-t",
        &format!("{duration_seconds:.3}"),
        "-i",
    ])
    .arg(input)
    .args(["-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le"])
    .arg(&output);

    hide_console_window(&mut cmd);

    let result = cmd
        .output()
        .map_err(|e| format!("Could not run ffmpeg for audio recognition: {e}"))?;
    if !result.status.success() {
        let _ = fs::remove_file(&output);
        let stderr = String::from_utf8_lossy(&result.stderr);
        return Err(format!("ffmpeg audio extraction failed: {stderr}"));
    }

    Ok(output)
}

fn load_settings(state: &tauri::State<'_, DbState>) -> Result<HashMap<String, String>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_all_settings(&conn)
        .map_err(|e| e.to_string())
        .map(|pairs| pairs.into_iter().collect::<HashMap<_, _>>())
}

async fn translate_text_with_settings(
    settings: &HashMap<String, String>,
    text: &str,
    target_language: &str,
    mode: TranslationMode,
) -> Result<String, String> {
    let max_input_chars = match mode {
        TranslationMode::Standard => MAX_TRANSLATION_INPUT_CHARS,
        TranslationMode::LiveSubtitle => MAX_LIVE_TRANSLATION_INPUT_CHARS,
    };
    let text = text
        .trim()
        .chars()
        .take(max_input_chars)
        .collect::<String>();
    if text.is_empty() {
        return Ok(String::new());
    }

    let bearer_token = deepseek_bearer_token(settings)?;

    let model = settings
        .get("ai_deepseek_model")
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_DEEPSEEK_MODEL);

    let target = language_name(target_language);
    let (system_prompt, user_prompt, temperature, max_tokens, timeout_seconds) = match mode {
        TranslationMode::Standard => (
            "You are a live subtitle translation engine. Translate only the user's speech transcript. Preserve short subtitle-like phrasing. Do not add explanations, notes, quotes, or markdown.",
            format!("Translate this speech transcript into {target}:\n\n{text}"),
            0.2,
            600,
            30,
        ),
        TranslationMode::LiveSubtitle => (
            "You are a real-time subtitle translator. Translate only the user's short ASR transcript. Return one compact subtitle line. No explanations, no notes, no quotes, no markdown.",
            format!("Translate this short live caption into {target}:\n\n{text}"),
            0.0,
            160,
            12,
        ),
    };

    let body = serde_json::json!({
        "model": model,
        "messages": [
            RequestMessage {
                role: "system",
                content: system_prompt.to_string(),
            },
            RequestMessage {
                role: "user",
                content: user_prompt,
            }
        ],
        "thinking": { "type": "disabled" },
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": false
    });

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(timeout_seconds))
        .build()
        .map_err(|e| format!("Could not create DeepSeek client: {e}"))?;

    let response = client
        .post(deepseek_endpoint(settings)?)
        .bearer_auth(bearer_token)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("DeepSeek request failed: {e}"))?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Could not read DeepSeek response: {e}"))?;

    if !status.is_success() {
        return Err(format!(
            "DeepSeek returned {status}: {}",
            summarize_deepseek_error(&response_text)
        ));
    }

    let parsed: ChatCompletionResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("Could not parse DeepSeek response: {e}"))?;

    parsed
        .choices
        .first()
        .and_then(|choice| choice.message.content.as_deref())
        .map(|content| content.trim().to_string())
        .filter(|content| !content.is_empty())
        .ok_or_else(|| "DeepSeek returned an empty translation".to_string())
}

async fn call_ai_chat(
    settings: &HashMap<String, String>,
    label: &str,
    messages: Vec<RequestMessage<'_>>,
    temperature: f32,
    max_tokens: u32,
    timeout_seconds: u64,
) -> Result<String, String> {
    let bearer_token = deepseek_bearer_token(settings)?;
    let model = settings
        .get("ai_deepseek_model")
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_DEEPSEEK_MODEL);

    let body = serde_json::json!({
        "model": model,
        "messages": messages,
        "thinking": { "type": "disabled" },
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": false
    });

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(timeout_seconds))
        .build()
        .map_err(|e| format!("Could not create {label} client: {e}"))?;

    let response = client
        .post(deepseek_endpoint(settings)?)
        .bearer_auth(bearer_token)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("{label} request failed: {e}"))?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Could not read {label} response: {e}"))?;

    if !status.is_success() {
        return Err(format!(
            "{label} returned {status}: {}",
            summarize_deepseek_error(&response_text)
        ));
    }

    let parsed: ChatCompletionResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("Could not parse {label} response: {e}"))?;

    parsed
        .choices
        .first()
        .and_then(|choice| choice.message.content.as_deref())
        .map(|content| content.trim().to_string())
        .filter(|content| !content.is_empty())
        .ok_or_else(|| format!("{label} returned an empty reply"))
}

fn trim_chars(value: &str, max_chars: usize) -> String {
    value
        .trim()
        .chars()
        .take(max_chars)
        .collect::<String>()
}

fn sanitize_prompt_text(value: &str, max_chars: usize) -> String {
    trim_chars(value, max_chars)
        .chars()
        .filter(|ch| !ch.is_control() || matches!(ch, '\n' | '\r' | '\t'))
        .collect::<String>()
        .trim()
        .to_string()
}

fn empty_to_placeholder<'a>(value: &'a str, placeholder: &'a str) -> &'a str {
    let value = value.trim();
    if value.is_empty() {
        placeholder
    } else {
        value
    }
}

fn summarize_deepseek_error(response_text: &str) -> String {
    serde_json::from_str::<ErrorPayload>(response_text)
        .ok()
        .and_then(|payload| payload.error)
        .and_then(|error| error.message)
        .filter(|message| !message.trim().is_empty())
        .unwrap_or_else(|| response_text.chars().take(240).collect())
}

fn deepseek_bearer_token(settings: &HashMap<String, String>) -> Result<&str, String> {
    settings
        .get("ai_deepseek_proxy_token")
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .or_else(|| {
            settings
                .get("ai_deepseek_api_key")
                .map(|value| value.trim())
                .filter(|value| !value.is_empty())
        })
        .ok_or_else(|| "DeepSeek API key or proxy token is not configured".to_string())
}

fn deepseek_endpoint(settings: &HashMap<String, String>) -> Result<String, String> {
    let Some(proxy_url) = settings
        .get("ai_deepseek_proxy_url")
        .map(|value| value.trim().trim_end_matches('/'))
        .filter(|value| !value.is_empty())
    else {
        return Ok(DEEPSEEK_CHAT_COMPLETIONS_URL.to_string());
    };
    validate_api_url(proxy_url)?;

    if proxy_url.ends_with("/chat/completions") {
        return Ok(proxy_url.to_string());
    }
    if proxy_url.ends_with("/v1") {
        return Ok(format!("{proxy_url}/chat/completions"));
    }
    Ok(format!("{proxy_url}/v1/chat/completions"))
}

fn deepseek_models_endpoint(settings: &HashMap<String, String>) -> Result<String, String> {
    let Some(api_url) = api_base_url(settings) else {
        return Ok(DEEPSEEK_MODELS_URL.to_string());
    };
    validate_api_url(api_url)?;

    if api_url.ends_with("/models") {
        return Ok(api_url.to_string());
    }
    if api_url.ends_with("/chat/completions") {
        return Ok(format!(
            "{}/models",
            api_url
                .trim_end_matches("/chat/completions")
                .trim_end_matches('/')
        ));
    }
    if api_url.ends_with("/v1") {
        return Ok(format!("{api_url}/models"));
    }
    Ok(format!("{api_url}/v1/models"))
}

fn api_base_url(settings: &HashMap<String, String>) -> Option<&str> {
    settings
        .get("ai_deepseek_proxy_url")
        .map(|value| value.trim().trim_end_matches('/'))
        .filter(|value| !value.is_empty())
}

fn validate_api_url(value: &str) -> Result<(), String> {
    let parsed = Url::parse(value)
        .map_err(|_| "API address must be a valid http or https URL".to_string())?;
    if !matches!(parsed.scheme(), "http" | "https") || parsed.host_str().is_none() {
        return Err("API address must start with http:// or https://".to_string());
    }
    Ok(())
}

fn format_model_label(id: &str) -> String {
    id.split(['-', '_', '.'])
        .filter(|part| !part.is_empty())
        .map(|part| {
            let mut chars = part.chars();
            match chars.next() {
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn language_name(value: &str) -> &'static str {
    match value.trim().to_lowercase().as_str() {
        "zh" | "zh-cn" | "chinese" => "Simplified Chinese",
        "ja" | "jp" | "japanese" => "Japanese",
        "ko" | "kr" | "korean" => "Korean",
        "fr" | "fr-fr" | "french" => "French",
        "de" | "german" => "German",
        "es" | "spanish" => "Spanish",
        "pt" | "portuguese" => "Portuguese",
        "it" | "italian" => "Italian",
        "ru" | "russian" => "Russian",
        "ar" | "arabic" => "Arabic",
        "hi" | "hindi" => "Hindi",
        "id" | "indonesian" => "Indonesian",
        "th" | "thai" => "Thai",
        "vi" | "vietnamese" => "Vietnamese",
        "tr" | "turkish" => "Turkish",
        "nl" | "dutch" => "Dutch",
        "pl" | "polish" => "Polish",
        "uk" | "ukrainian" => "Ukrainian",
        "el" | "greek" => "Greek",
        "sv" | "swedish" => "Swedish",
        "da" | "danish" => "Danish",
        "no" | "norwegian" => "Norwegian",
        "fi" | "finnish" => "Finnish",
        "cs" | "czech" => "Czech",
        "hu" | "hungarian" => "Hungarian",
        _ => "English",
    }
}

#[cfg(target_os = "windows")]
fn hide_console_window(cmd: &mut Command) {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(0x08000000);
}

#[cfg(not(target_os = "windows"))]
fn hide_console_window(_cmd: &mut Command) {}
