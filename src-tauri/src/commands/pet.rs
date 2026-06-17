use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

const DESKTOP_PET_LABEL: &str = "july-desktop-pet";

#[tauri::command]
pub async fn open_desktop_pet(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(DESKTOP_PET_LABEL) {
        window.show().map_err(|e| e.to_string())?;
        let _ = window.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(
        &app,
        DESKTOP_PET_LABEL,
        WebviewUrl::App("index.html#/desktop-pet".into()),
    )
    .title("七月宠物")
    .inner_size(220.0, 220.0)
    .min_inner_size(160.0, 160.0)
    .resizable(false)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .focused(true)
    .center()
    .build()
    .map(|_| ())
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn close_desktop_pet(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(DESKTOP_PET_LABEL) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn is_desktop_pet_open(app: tauri::AppHandle) -> bool {
    app.get_webview_window(DESKTOP_PET_LABEL).is_some()
}
