use crate::parser::find_bundled_bin;
use serde::Serialize;
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::UNIX_EPOCH;
use tauri::Manager;

const VIDEO_QUALITY_CACHE_VERSION: u8 = 2;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreparedVideoQuality {
    pub path: String,
    pub original_width: u32,
    pub original_height: u32,
    pub target_height: u32,
    pub converted: bool,
}

#[derive(Debug, Clone, Copy)]
struct VideoResolution {
    width: u32,
    height: u32,
}

#[derive(Debug, Clone)]
struct SubtitleStream {
    index: u64,
    language: Option<String>,
}

#[tauri::command]
pub async fn prepare_video_quality(
    app: tauri::AppHandle,
    video_path: String,
    quality: String,
) -> Result<PreparedVideoQuality, String> {
    let app_handle = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        prepare_video_quality_blocking(&app_handle, &video_path, &quality)
    })
    .await
    .map_err(|e| format!("Video quality task failed: {e}"))?
}

fn prepare_video_quality_blocking(
    app: &tauri::AppHandle,
    video_path: &str,
    quality: &str,
) -> Result<PreparedVideoQuality, String> {
    let target_height = quality_target_height(quality)?;
    let input = PathBuf::from(video_path);
    if !input.is_file() {
        return Err("Video file was not found".to_string());
    }

    let resolution = probe_video_resolution(&input)?;
    if resolution.height >= target_height {
        return Ok(PreparedVideoQuality {
            path: input.to_string_lossy().to_string(),
            original_width: resolution.width,
            original_height: resolution.height,
            target_height,
            converted: false,
        });
    }

    let cache_dir = app
        .path()
        .app_cache_dir()
        .or_else(|_| app.path().app_data_dir())
        .map_err(|e| format!("Could not resolve cache directory: {e}"))?
        .join("upscaled-videos");
    fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("Could not create video cache directory: {e}"))?;

    let output = cache_dir.join(format!(
        "{}_{}.mp4",
        cache_key(&input, target_height),
        quality_label(target_height)
    ));

    if output.is_file() {
        return Ok(PreparedVideoQuality {
            path: output.to_string_lossy().to_string(),
            original_width: resolution.width,
            original_height: resolution.height,
            target_height,
            converted: true,
        });
    }

    let temp_output = output.with_extension("tmp.mp4");
    let _ = fs::remove_file(&temp_output);

    transcode_video(&input, &temp_output, target_height)?;
    fs::rename(&temp_output, &output)
        .map_err(|e| format!("Could not finish converted video: {e}"))?;

    Ok(PreparedVideoQuality {
        path: output.to_string_lossy().to_string(),
        original_width: resolution.width,
        original_height: resolution.height,
        target_height,
        converted: true,
    })
}

fn quality_target_height(quality: &str) -> Result<u32, String> {
    match quality.trim().to_lowercase().as_str() {
        "1080p" | "1080" | "fullhd" | "full-hd" => Ok(1080),
        "2k" | "1440p" | "1440" | "qhd" => Ok(1440),
        other => Err(format!("Unsupported video quality: {other}")),
    }
}

fn quality_label(target_height: u32) -> &'static str {
    match target_height {
        1440 => "2k",
        _ => "1080p",
    }
}

fn cache_key(input: &Path, target_height: u32) -> String {
    let mut hasher = DefaultHasher::new();
    VIDEO_QUALITY_CACHE_VERSION.hash(&mut hasher);
    input.to_string_lossy().hash(&mut hasher);
    target_height.hash(&mut hasher);

    if let Ok(meta) = fs::metadata(input) {
        meta.len().hash(&mut hasher);
        if let Ok(modified) = meta.modified() {
            if let Ok(duration) = modified.duration_since(UNIX_EPOCH) {
                duration.as_secs().hash(&mut hasher);
                duration.subsec_nanos().hash(&mut hasher);
            }
        }
    }

    format!("{:016x}", hasher.finish())
}

fn probe_video_resolution(path: &Path) -> Result<VideoResolution, String> {
    let ffprobe_bin = find_bundled_bin("ffprobe")
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_else(|| "ffprobe".to_string());

    let mut cmd = Command::new(ffprobe_bin);
    cmd.args([
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "json",
    ])
    .arg(path);

    hide_console_window(&mut cmd);

    let output = cmd
        .output()
        .map_err(|e| format!("Could not run ffprobe: {e}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffprobe failed: {stderr}"));
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Could not parse ffprobe output: {e}"))?;
    let stream = json
        .get("streams")
        .and_then(|streams| streams.as_array())
        .and_then(|streams| streams.first())
        .ok_or_else(|| "No video stream found".to_string())?;

    let width = stream
        .get("width")
        .and_then(|value| value.as_u64())
        .ok_or_else(|| "Could not read video width".to_string())? as u32;
    let height = stream
        .get("height")
        .and_then(|value| value.as_u64())
        .ok_or_else(|| "Could not read video height".to_string())? as u32;

    Ok(VideoResolution { width, height })
}

fn transcode_video(input: &Path, output: &Path, target_height: u32) -> Result<(), String> {
    let ffmpeg_bin = find_bundled_bin("ffmpeg")
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_else(|| "ffmpeg".to_string());
    let scale_filter = format!("scale=-2:{target_height}:flags=lanczos,setsar=1");
    let subtitle_streams = probe_text_subtitle_streams(input)?;

    let mut cmd = Command::new(ffmpeg_bin);
    cmd.args(["-hide_banner", "-loglevel", "error", "-y", "-i"])
        .arg(input)
        .args(["-map", "0:v:0", "-map", "0:a?"]);

    for stream in &subtitle_streams {
        cmd.args(["-map", &format!("0:{}", stream.index)]);
    }

    cmd.args([
        "-vf",
        &scale_filter,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
    ]);

    if !subtitle_streams.is_empty() {
        cmd.args(["-c:s", "mov_text"]);
        for (idx, stream) in subtitle_streams.iter().enumerate() {
            if let Some(language) = stream.language.as_deref() {
                cmd.args([
                    format!("-metadata:s:s:{idx}"),
                    format!("language={language}"),
                ]);
            }
        }
    }

    cmd.args(["-movflags", "+faststart", "-max_muxing_queue_size", "1024"])
        .arg(output);

    hide_console_window(&mut cmd);

    let output_result = cmd
        .output()
        .map_err(|e| format!("Could not run ffmpeg: {e}"))?;
    if !output_result.status.success() {
        let _ = fs::remove_file(output);
        let stderr = String::from_utf8_lossy(&output_result.stderr);
        return Err(format!("ffmpeg failed: {stderr}"));
    }

    Ok(())
}

fn probe_text_subtitle_streams(path: &Path) -> Result<Vec<SubtitleStream>, String> {
    let ffprobe_bin = find_bundled_bin("ffprobe")
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_else(|| "ffprobe".to_string());

    let mut cmd = Command::new(ffprobe_bin);
    cmd.args([
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_streams",
        "-select_streams",
        "s",
    ])
    .arg(path);

    hide_console_window(&mut cmd);

    let output = cmd
        .output()
        .map_err(|e| format!("Could not run ffprobe: {e}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffprobe failed: {stderr}"));
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Could not parse ffprobe subtitle output: {e}"))?;
    let streams = json
        .get("streams")
        .and_then(|streams| streams.as_array())
        .cloned()
        .unwrap_or_default();

    let mut result = Vec::new();
    for stream in streams {
        let codec = stream
            .get("codec_name")
            .and_then(|codec| codec.as_str())
            .unwrap_or("");
        if matches!(
            codec,
            "dvd_subtitle" | "hdmv_pgs_subtitle" | "dvbsub" | "pgssub"
        ) {
            continue;
        }

        let Some(index) = stream.get("index").and_then(|index| index.as_u64()) else {
            continue;
        };
        let language = stream
            .get("tags")
            .and_then(|tags| tags.get("language"))
            .and_then(|language| language.as_str())
            .filter(|language| !language.eq_ignore_ascii_case("und"))
            .map(|language| language.to_string());

        result.push(SubtitleStream { index, language });
    }

    Ok(result)
}

#[cfg(target_os = "windows")]
fn hide_console_window(cmd: &mut Command) {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(0x08000000);
}

#[cfg(not(target_os = "windows"))]
fn hide_console_window(_cmd: &mut Command) {}
