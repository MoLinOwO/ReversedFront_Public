use std::fs;
use std::process::Command;
use reqwest::Client;
use serde::Serialize;
use tauri::AppHandle;
use std::io::Write;
use regex::Regex;

const CLOUD_URL_WINDOWS: &str = "https://cloud.vtbmoyu.com/s/JKo6TTSGaiGFAts";
const CLOUD_URL_LINUX: &str = "https://cloud.vtbmoyu.com/s/6H6TS3BqmLzBHBP";
const CLOUD_URL_MACOS: &str = "https://cloud.vtbmoyu.com/s/KpR9YqwJgE4tZmy"; // 請替換為 macOS 的雲端連結

#[derive(Debug, Serialize, Clone)]
pub struct UpdateInfo {
    pub version: String,
    pub download_url: String,
    pub filename: String,
    pub has_update: bool,
}

pub async fn check_update(current_version: &str) -> Result<UpdateInfo, String> {
    let client = Client::builder()
        .user_agent("ReversedFront-Updater")
        .build()
        .map_err(|e| e.to_string())?;

    let cloud_url = if cfg!(target_os = "windows") {
        CLOUD_URL_WINDOWS
    } else if cfg!(target_os = "macos") {
        CLOUD_URL_MACOS
    } else {
        CLOUD_URL_LINUX
    };

    // Try Cloud
    match check_cloud(&client, cloud_url).await {
        Ok(info) => {
            if is_newer(&info.version, current_version) {
                return Ok(UpdateInfo { has_update: true, ..info });
            }
        }
        Err(e) => println!("Cloud update check failed: {}", e),
    }
    
    Ok(UpdateInfo {
        version: current_version.to_string(),
        download_url: "".to_string(),
        filename: "".to_string(),
        has_update: false,
    })
}

async fn check_cloud(client: &Client, cloud_url: &str) -> Result<UpdateInfo, String> {
    let download_url = format!("{}/download", cloud_url.trim_end_matches('/'));
    
    // Send HEAD request to get filename from Content-Disposition
    let resp = client.head(&download_url).send().await.map_err(|e| e.to_string())?;
    
    if !resp.status().is_success() {
        return Err(format!("Cloud API error: {}", resp.status()));
    }
    
    let headers = resp.headers();
    let content_disposition = headers.get("content-disposition")
        .and_then(|h| h.to_str().ok())
        .ok_or("No Content-Disposition header")?;
        
    // Parse filename
    let mut filename = String::new();
    
    // Try filename="..."
    let re_filename = Regex::new(r#"filename="([^"]+)""#).unwrap();
    if let Some(caps) = re_filename.captures(content_disposition) {
        filename = caps[1].to_string();
    } else {
        // Try filename*=UTF-8''...
        let re_filename_star = Regex::new(r"filename\*=UTF-8''([^;]+)").unwrap();
        if let Some(caps) = re_filename_star.captures(content_disposition) {
            filename = urlencoding::decode(&caps[1]).map_err(|e| e.to_string())?.to_string();
        }
    }
    
    if filename.is_empty() {
        return Err("Could not parse filename from Content-Disposition".to_string());
    }
    
    // Parse version from filename (e.g. ReversedFront_Setup_v2.10.exe or v2.11.1.exe)
    // Updated regex to support semantic versioning (e.g. 2.11.1)
    let re_version = Regex::new(r"v(\d+(\.\d+)+)").unwrap();
    let version = if let Some(caps) = re_version.captures(&filename) {
        caps[1].to_string()
    } else {
        return Err("Could not parse version from filename".to_string());
    };
    
    Ok(UpdateInfo {
        version,
        download_url,
        filename,
        has_update: false, // Set by caller
    })
}

fn is_newer(remote: &str, current: &str) -> bool {
    let parse_version = |v: &str| -> Vec<u32> {
        v.split('.')
         .filter_map(|s| s.parse::<u32>().ok())
         .collect()
    };

    let remote_parts = parse_version(remote);
    let current_parts = parse_version(current);

    for (r, c) in remote_parts.iter().zip(current_parts.iter()) {
        if r > c { return true; }
        if r < c { return false; }
    }
    
    // If common parts are equal, the one with more parts is newer (e.g. 2.11.1 > 2.11)
    remote_parts.len() > current_parts.len()
}

pub async fn download_and_install(app: AppHandle, url: &str, filename: &str) -> Result<(), String> {
    let client = Client::new();
    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    
    if !resp.status().is_success() {
        return Err(format!("Download failed: {}", resp.status()));
    }

    let content = resp.bytes().await.map_err(|e| e.to_string())?;
    
    let temp_dir = std::env::temp_dir();
    let installer_path = temp_dir.join(filename);
    
    let mut file = fs::File::create(&installer_path).map_err(|e| e.to_string())?;
    file.write_all(&content).map_err(|e| e.to_string())?;
    
    // Run installer
    if cfg!(target_os = "windows") {
        Command::new(&installer_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    } else if cfg!(target_os = "macos") {
        Command::new("open")
            .arg(&installer_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    } else {
        // Linux logic
        #[cfg(target_os = "linux")]
        Command::new("xdg-open")
            .arg(&installer_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    app.exit(0);
    Ok(())
}
