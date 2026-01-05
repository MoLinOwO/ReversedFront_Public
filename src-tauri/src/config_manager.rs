use std::fs;
use std::path::PathBuf;
use serde_json::Value;
use directories::ProjectDirs;

pub fn get_hidden_config_dir(target: &str) -> PathBuf {
    // Dev mode: use local assets folder
    #[cfg(debug_assertions)]
    {
        let mut path = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        if path.ends_with("src-tauri") {
            path.pop();
        }
        path.push("assets");
        if target == "passionfruit" {
            path.push("passionfruit");
        } else if target == "root" {
            // Return assets root
        } else {
            path.push("mod");
            path.push("data");
        }
        fs::create_dir_all(&path).unwrap_or_default();
        return path;
    }

    // Release mode: use installation directory
    #[cfg(not(debug_assertions))]
    {
        let exe_path = std::env::current_exe().unwrap_or_else(|_| PathBuf::from("."));
        let mut path = exe_path.parent().unwrap_or_else(|| std::path::Path::new(".")).to_path_buf();
        
        // 找到包含 assets 目錄的根目錄
        let mut search_path = path.clone();
        while !search_path.join("assets").exists() && search_path.parent().is_some() {
            search_path = search_path.parent().unwrap().to_path_buf();
        }
        
        // 如果找到 assets，使用該目錄作為根
        if search_path.join("assets").exists() {
            path = search_path.join("assets");
        }
        
        if target == "passionfruit" {
            path.push("passionfruit");
        } else if target == "root" {
            // Return assets root
        } else {
            path.push("mod");
            path.push("data");
        }
        fs::create_dir_all(&path).unwrap_or_default();
        return path;
    }

    // Fallback (should not happen)
    PathBuf::from(".")
}

pub fn get_config_file() -> PathBuf {
    get_hidden_config_dir("data").join("config.json")
}

pub fn load_config() -> Value {
    let config_file = get_config_file();
    if config_file.exists() {
        if let Ok(content) = fs::read_to_string(&config_file) {
            if let Ok(json) = serde_json::from_str(&content) {
                return json;
            }
        }
    } else {
        // Fallback: try to read config.json from project root
        let mut root_config = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        #[cfg(debug_assertions)]
        {
            if root_config.ends_with("src-tauri") {
                root_config.pop();
            }
        }
        root_config.push("config.json");
        
        if root_config.exists() {
             if let Ok(content) = fs::read_to_string(&root_config) {
                if let Ok(json) = serde_json::from_str(&content) {
                    // Save it to the correct location
                    let _ = fs::write(&config_file, &content);
                    return json;
                }
            }
        }
    }
    serde_json::json!({})
}

pub fn save_config(config: &Value) {
    let config_file = get_config_file();
    if let Ok(content) = serde_json::to_string_pretty(config) {
        let _ = fs::write(config_file, content);
    }
}

pub fn update_config_fields(fields: Value) {
    let mut config = load_config();
    
    // Extract target account if present
    let target_account = fields.get("target_account").cloned();
    
    if let Some(target) = target_account {
        if let Some(accounts) = config.get_mut("accounts").and_then(|v| v.as_array_mut()) {
            let target_email = target.get("account").and_then(|v| v.as_str()).unwrap_or("");
            
            for account in accounts {
                if account.get("account").and_then(|v| v.as_str()) == Some(target_email) {
                    // Ensure settings object exists
                    if !account.get("settings").is_some() {
                        account["settings"] = serde_json::json!({});
                    }
                    
                    if let Some(settings) = account.get_mut("settings").and_then(|v| v.as_object_mut()) {
                        // Update fields if they are not null
                        if let Some(bgm) = fields.get("bgm") {
                            if !bgm.is_null() {
                                settings.insert("bgm_volume".to_string(), bgm.clone());
                            }
                        }
                        if let Some(se) = fields.get("se") {
                            if !se.is_null() {
                                settings.insert("se_volume".to_string(), se.clone());
                            }
                        }
                        if let Some(muted) = fields.get("se147Muted") {
                            if !muted.is_null() {
                                settings.insert("se147_muted".to_string(), muted.clone());
                            }
                        }
                        if let Some(filter) = fields.get("report_faction_filter") {
                            if !filter.is_null() {
                                settings.insert("report_faction_filter".to_string(), filter.clone());
                            }
                        }
                    }
                    break;
                }
            }
        }
    } else {
        // Fallback to global update if no target account (legacy behavior, but safer)
        if let Value::Object(ref mut map) = config {
            if let Value::Object(fields_map) = fields {
                for (k, v) in fields_map {
                    if k != "target_account" && !v.is_null() {
                        map.insert(k, v);
                    }
                }
            }
        }
    }
    
    save_config(&config);
}

pub fn get_account_settings(target_account: Option<String>) -> Value {
    let config = load_config();
    
    // Default values
    let mut bgm = 1.0;
    let mut se = 1.0;
    let mut se147_muted = false;
    let mut report_faction_filter = "全部".to_string();

    if let Some(target_json) = target_account {
        if let Ok(target) = serde_json::from_str::<Value>(&target_json) {
             let target_email = target.get("account").and_then(|v| v.as_str()).unwrap_or("");
             if let Some(accounts) = config.get("accounts").and_then(|v| v.as_array()) {
                for account in accounts {
                    if account.get("account").and_then(|v| v.as_str()) == Some(target_email) {
                        if let Some(settings) = account.get("settings") {
                            if let Some(v) = settings.get("bgm_volume").and_then(|v| v.as_f64()) { bgm = v; }
                            if let Some(v) = settings.get("se_volume").and_then(|v| v.as_f64()) { se = v; }
                            if let Some(v) = settings.get("se147_muted").and_then(|v| v.as_bool()) { se147_muted = v; }
                            if let Some(v) = settings.get("report_faction_filter").and_then(|v| v.as_str()) { report_faction_filter = v.to_string(); }
                        }
                        break;
                    }
                }
             }
        }
    }

    serde_json::json!({
        "bgm": bgm,
        "se": se,
        "se147Muted": se147_muted,
        "report_faction_filter": report_faction_filter
    })
}
