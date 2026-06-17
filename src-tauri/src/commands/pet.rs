use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};
use serde::Serialize;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

const DESKTOP_PET_LABEL: &str = "july-desktop-pet";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopPetWindowState {
    open: bool,
    visible: bool,
}

fn desktop_pet_state(app: &tauri::AppHandle) -> DesktopPetWindowState {
    if app.get_webview_window(DESKTOP_PET_LABEL).is_some() {
        return DesktopPetWindowState {
            open: true,
            visible: true,
        };
    }

    DesktopPetWindowState {
        open: false,
        visible: false,
    }
}

fn show_existing_desktop_pet(window: tauri::WebviewWindow) {
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

fn build_desktop_pet_window(app: tauri::AppHandle, url: String) {
    if let Some(window) = app.get_webview_window(DESKTOP_PET_LABEL) {
        show_existing_desktop_pet(window);
        return;
    }

    let window = match WebviewWindowBuilder::new(
        &app,
        DESKTOP_PET_LABEL,
        WebviewUrl::App(url.into()),
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
    .visible(false)
    .focused(true)
    .center()
    .build() {
        Ok(window) => window,
        Err(_) => return,
    };

    let _ = window.show();
    let _ = window.set_focus();
}

#[tauri::command]
pub fn open_desktop_pet(
    app: tauri::AppHandle,
    language: Option<String>,
    pet_variant: Option<String>,
) -> Result<DesktopPetWindowState, String> {
    let language = language.unwrap_or_else(|| "en".to_string());
    let pet_variant = pet_variant.unwrap_or_else(|| "builtin".to_string());
    let url = format!(
        "#/desktop-pet?language={}&pet={}",
        utf8_percent_encode(&language, NON_ALPHANUMERIC),
        utf8_percent_encode(&pet_variant, NON_ALPHANUMERIC)
    );

    let app_for_thread = app.clone();
    std::thread::spawn(move || {
        let app_for_task = app_for_thread.clone();
        if let Err(error) = app_for_thread
            .run_on_main_thread(move || build_desktop_pet_window(app_for_task, url))
        {
            eprintln!("failed to schedule desktop pet window: {error}");
        }
    });

    Ok(DesktopPetWindowState {
        open: false,
        visible: false,
    })
}

#[tauri::command]
pub fn close_desktop_pet(app: tauri::AppHandle) -> Result<DesktopPetWindowState, String> {
    if let Some(window) = app.get_webview_window(DESKTOP_PET_LABEL) {
        let _ = window.hide();
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(desktop_pet_state(&app))
}

#[tauri::command]
pub fn is_desktop_pet_open(app: tauri::AppHandle) -> DesktopPetWindowState {
    desktop_pet_state(&app)
}
