use std::fs;
use std::process::Command;
use reqwest::Client;
use serde::Serialize;
use tauri::{AppHandle, Manager};
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

/// 從檔名中解析版本號，支援語意化版本（例如 v2.11.2）
fn extract_version_from_filename(filename: &str) -> Option<String> {
    // 例如：ReversedFront_Setup_v2.10.exe、ReversedFront_v2.11.2.exe
    let re_version = Regex::new(r"v(\d+(\.\d+)+)").ok()?;
    re_version
        .captures(filename)
        .and_then(|caps| caps.get(1).map(|m| m.as_str().to_string()))
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
    
    // Parse version from filename (e.g. ReversedFront_Setup_v2.10.exe or ReversedFront_v2.11.2.exe)
    let version = extract_version_from_filename(&filename)
        .ok_or_else(|| "Could not parse version from filename".to_string())?;
    
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

/// 啟動應用程式時清理舊的安裝程式檔案
///
/// 目前假設安裝檔命名為 `ReversedFront_v2.11.2[.ext]` 這種格式，
/// 會刪除與目前執行檔位於同一目錄、且檔名以 `ReversedFront_v` 開頭的檔案，
/// 但不會刪除主程式本身。
pub fn cleanup_old_installers() {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(dir) = exe_path.parent() {
            if let Ok(entries) = fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();

                    // 不要刪除主程式本身
                    if path == exe_path {
                        continue;
                    }

                    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                        let is_installer = name.starts_with("ReversedFront_v");
                        if is_installer {
                            if let Err(e) = fs::remove_file(&path) {
                                eprintln!(
                                    "Failed to remove old installer {}: {}",
                                    path.display(),
                                    e
                                );
                            }
                        }
                    }
                }
            }
        }
    }
}

pub async fn download_and_install(app: AppHandle, url: &str, filename: &str) -> Result<(), String> {
    let client = Client::new();
    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    
    if !resp.status().is_success() {
        return Err(format!("Download failed: {}", resp.status()));
    }

    let content = resp.bytes().await.map_err(|e| e.to_string())?;

    // 優先下載到目前執行檔(.exe)所在目錄，失敗時退回暫存目錄
    let base_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::env::temp_dir());

    // 依照統一格式組成本地檔名：ReversedFront_v{version}[.ext]
    let local_filename = if let Some(ver) = extract_version_from_filename(filename) {
        let ext = std::path::Path::new(filename)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");

        if ext.is_empty() {
            format!("ReversedFront_v{}", ver)
        } else {
            format!("ReversedFront_v{}.{}", ver, ext)
        }
    } else {
        // 無法解析版本就退回使用原始檔名
        filename.to_string()
    };

    let installer_path = base_dir.join(&local_filename);

    let mut file = fs::File::create(&installer_path)
        .map_err(|e| format!("Failed to create installer {}: {}", installer_path.display(), e))?;
    file.write_all(&content).map_err(|e| e.to_string())?;

    // 先關閉主視窗，再啟動安裝程式
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.close();
    }

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
