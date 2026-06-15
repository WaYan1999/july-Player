use std::{collections::HashMap, time::Duration};

use serde::{Deserialize, Serialize};

use crate::db::{self, DbState};

const DEEPSEEK_CHAT_COMPLETIONS_URL: &str = "https://api.deepseek.com/chat/completions";
const DEFAULT_DEEPSEEK_MODEL: &str = "deepseek-v4-flash";
const MAX_TRANSLATION_INPUT_CHARS: usize = 4_000;

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
