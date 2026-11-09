use tauri::Manager;

#[derive(serde::Serialize)]
struct SystemInfo {
    app_name: String,
    app_version: String,
    os: String,
}

#[tauri::command]
fn get_system_info(app: tauri::AppHandle) -> SystemInfo {
    let info = app.package_info();
    SystemInfo {
        app_name: info.name.clone(),
        app_version: info.version.clone(),
        os: std::env::consts::OS.to_string(),
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![get_system_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
