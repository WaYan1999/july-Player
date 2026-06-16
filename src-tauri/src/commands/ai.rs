use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    process::Command,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tauri::Manager;

use crate::db::{self, DbState};
use crate::parser::find_bundled_bin;

const DEEPSEEK_CHAT_COMPLETIONS_URL: &str = "https://api.deepseek.com/chat/completions";
const DEFAULT_ASR_TRANSCRIPTIONS_URL: &str = "https://api.openai.com/v1/audio/transcriptions";
const DEFAULT_DEEPSEEK_MODEL: &str = "deepseek-v4-flash";
const DEFAULT_ASR_MODEL: &str = "whisper-1";
const MAX_TRANSLATION_INPUT_CHARS: usize = 4_000;
const MAX_AUDIO_SECONDS: f64 = 8.0;

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
struct ErrorPayload {
    error: Option<ApiError>,
}

#[derive(Debug, Deserialize)]
struct ApiError {
    message: Option<String>,
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

#[derive(Debug, Deserialize)]
struct TranscriptionResponse {
    text: Option<String>,
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

    let api_key = settings
        .get("ai_deepseek_api_key")
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "DeepSeek API key is not configured".to_string())?;

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
        .post(DEEPSEEK_CHAT_COMPLETIONS_URL)
        .bearer_auth(api_key)
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

    let transcript = transcribe_audio_segment(
        &app,
        &settings,
        &video_path,
        start_seconds,
        duration_seconds,
    )
    .await?;
    if transcript.trim().is_empty() {
        return Ok(AiAudioTranslation {
            transcript,
            translation: String::new(),
            start_seconds,
            duration_seconds,
        });
    }

    let translation =
        translate_text_with_settings(&settings, &transcript, &target_language).await?;

    Ok(AiAudioTranslation {
        transcript,
        translation,
        start_seconds,
        duration_seconds,
    })
}

async fn transcribe_audio_segment(
    app: &tauri::AppHandle,
    settings: &HashMap<String, String>,
    video_path: &str,
    start_seconds: f64,
    duration_seconds: f64,
) -> Result<String, String> {
    let asr_api_key = settings
        .get("ai_asr_api_key")
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Audio recognition API key is not configured".to_string())?;

    let asr_model = settings
        .get("ai_asr_model")
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_ASR_MODEL);

    let asr_endpoint = settings
        .get("ai_asr_endpoint")
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_ASR_TRANSCRIPTIONS_URL);

    let input = PathBuf::from(video_path);
    if !input.is_file() {
        return Err("Video file was not found".to_string());
    }

    let audio_path = extract_audio_segment(app, &input, start_seconds, duration_seconds)?;
    let audio_bytes =
        fs::read(&audio_path).map_err(|e| format!("Could not read audio segment: {e}"))?;
    let _ = fs::remove_file(&audio_path);

    let file_name = audio_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("segment.wav")
        .to_string();
    let audio_part = reqwest::multipart::Part::bytes(audio_bytes)
        .file_name(file_name)
        .mime_str("audio/wav")
        .map_err(|e| format!("Could not prepare audio upload: {e}"))?;
    let form = reqwest::multipart::Form::new()
        .text("model", asr_model.to_string())
        .part("file", audio_part);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(45))
        .build()
        .map_err(|e| format!("Could not create audio recognition client: {e}"))?;

    let response = client
        .post(asr_endpoint)
        .bearer_auth(asr_api_key)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Audio recognition request failed: {e}"))?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Could not read audio recognition response: {e}"))?;

    if !status.is_success() {
        return Err(format!(
            "Audio recognition returned {status}: {}",
            summarize_deepseek_error(&response_text)
        ));
    }

    let parsed: TranscriptionResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("Could not parse audio recognition response: {e}"))?;

    Ok(parsed.text.unwrap_or_default().trim().to_string())
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
) -> Result<String, String> {
    let text = text
        .trim()
        .chars()
        .take(MAX_TRANSLATION_INPUT_CHARS)
        .collect::<String>();
    if text.is_empty() {
        return Ok(String::new());
    }

    let api_key = settings
        .get("ai_deepseek_api_key")
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "DeepSeek API key is not configured".to_string())?;

    let model = settings
        .get("ai_deepseek_model")
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_DEEPSEEK_MODEL);

    let target = language_name(target_language);
    let body = serde_json::json!({
        "model": model,
        "messages": [
            RequestMessage {
                role: "system",
                content: "You are a live subtitle translation engine. Translate only the user's speech transcript. Preserve short subtitle-like phrasing. Do not add explanations, notes, quotes, or markdown.".to_string(),
            },
            RequestMessage {
                role: "user",
                content: format!("Translate this speech transcript into {target}:\n\n{text}"),
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
        .post(DEEPSEEK_CHAT_COMPLETIONS_URL)
        .bearer_auth(api_key)
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

fn summarize_deepseek_error(response_text: &str) -> String {
    serde_json::from_str::<ErrorPayload>(response_text)
        .ok()
        .and_then(|payload| payload.error)
        .and_then(|error| error.message)
        .filter(|message| !message.trim().is_empty())
        .unwrap_or_else(|| response_text.chars().take(240).collect())
}

fn language_name(value: &str) -> &'static str {
    match value.trim().to_lowercase().as_str() {
        "zh" | "zh-cn" | "chinese" => "Simplified Chinese",
        "fr" | "fr-fr" | "french" => "French",
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
