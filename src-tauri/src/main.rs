#[tauri::command]
fn load_troubleshooting_database() -> Result<serde_json::Value, String> {
    const DATABASE_JSON: &str = include_str!("../../02 - Web/dados_troubleshooting.json");

    let json: serde_json::Value = serde_json::from_str(DATABASE_JSON)
        .map_err(|error| format!("Erro ao interpretar base embutida de troubleshooting: {}", error))?;

    Ok(json)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_troubleshooting_database])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}