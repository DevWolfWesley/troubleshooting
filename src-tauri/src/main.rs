const PROTECTED_DATABASE: &[u8] = include_bytes!("../resources/troubleshooting_base.dat");

const KEY: [u8; 32] = [
    0x57, 0x4f, 0x4c, 0x46, 0x2d, 0x54, 0x52, 0x42,
    0x2d, 0x32, 0x43, 0x2d, 0x39, 0x41, 0x37, 0x31,
    0x5f, 0x74, 0x65, 0x6c, 0x65, 0x6d, 0x65, 0x74,
    0x72, 0x69, 0x61, 0x5f, 0x77, 0x6f, 0x6c, 0x66,
];

#[tauri::command]
fn load_troubleshooting_database() -> Result<serde_json::Value, String> {
    let decoded = decode_database(PROTECTED_DATABASE);

    let json_text = String::from_utf8(decoded)
        .map_err(|error| format!("Erro ao converter base protegida para UTF-8: {}", error))?;

    let json: serde_json::Value = serde_json::from_str(&json_text)
        .map_err(|error| format!("Erro ao interpretar base protegida de troubleshooting: {}", error))?;

    Ok(json)
}

fn decode_database(data: &[u8]) -> Vec<u8> {
    data.iter()
        .enumerate()
        .map(|(index, byte)| {
            let key_byte = KEY[index % KEY.len()];
            let position_byte = ((index * 31 + 17) & 0xff) as u8;
            byte ^ key_byte ^ position_byte
        })
        .collect()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_troubleshooting_database])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}