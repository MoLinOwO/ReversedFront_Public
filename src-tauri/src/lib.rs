pub mod commands;
pub mod resource_manager;
pub mod config_manager;
pub mod account_manager;
pub mod updater;

use tauri::Manager;
use std::sync::Arc;
use std::fs;
use resource_manager::ResourceManager;
use warp::{Filter, http::StatusCode, http::Response};

pub struct AppState {
    pub resource_manager: Arc<ResourceManager>,
}

async fn handle_resource_request(
    path: warp::path::Tail,
    resource_manager: Arc<ResourceManager>
) -> Result<impl warp::Reply, warp::Rejection> {
    let path_str = path.as_str();
    let resource_key = path_str.to_string();
    let decoded_key = urlencoding::decode(&resource_key).unwrap_or_default().to_string();
    
    let response = match resource_manager.get_or_fetch(&decoded_key).await {
        Ok(Some(res)) => {
            let mime_type = match res.abs_path.extension().and_then(|e| e.to_str()) {
                Some("png") => "image/png",
                Some("jpg") | Some("jpeg") => "image/jpeg",
                Some("gif") => "image/gif",
                Some("mp4") => "video/mp4",
                Some("webm") => "video/webm",
                Some("mp3") => "audio/mpeg",
                Some("wav") => "audio/wav",
                Some("html") => "text/html",
                Some("js") => "text/javascript",
                Some("css") => "text/css",
                Some("json") => "application/json",
                Some("yaml") | Some("yml") => "text/yaml",
                _ => "application/octet-stream",
            };

            Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", mime_type)
                .body(res.data)
        }
        Ok(None) => Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Vec::new()),
        Err(e) => {
            eprintln!("[HTTP] Failed to serve {}: {}", decoded_key, e);
            Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .body(Vec::new())
        }
    };

    match response {
        Ok(resp) => Ok(resp),
        Err(e) => {
            eprintln!("[HTTP] Failed to build response {}: {}", decoded_key, e);
            Ok(Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Vec::new())
                .unwrap())
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Initialize AppData directory and copy static resources if needed
            #[cfg(not(debug_assertions))]
            {
                let app_data_dir = config_manager::get_hidden_config_dir("root");
                let resource_dir = app.path().resource_dir().unwrap_or_default();
                
                // Copy mod/data if not exists in AppData
                let target_mod_data = app_data_dir.join("mod").join("data");
                if !target_mod_data.exists() {
                    let source_mod_data = resource_dir.join("assets").join("mod").join("data");
                    if source_mod_data.exists() {
                        let _ = fs::create_dir_all(&target_mod_data);
                        // Simple recursive copy
                        if let Ok(entries) = fs::read_dir(&source_mod_data) {
                            for entry in entries.flatten() {
                                if let Ok(file_type) = entry.file_type() {
                                    if file_type.is_file() {
                                        let _ = fs::copy(entry.path(), target_mod_data.join(entry.file_name()));
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Dynamically allow access to the passionfruit directory
            let resource_dir = resource_manager::get_hidden_config_dir("passionfruit");
            if !resource_dir.exists() {
                let _ = fs::create_dir_all(&resource_dir);
            }

            let resource_manager = ResourceManager::new();
            app.manage(AppState {
                resource_manager: resource_manager.clone(),
            });

            // Start local HTTP server for resources
            let resource_manager_filter = warp::any().map(move || resource_manager.clone());
            let resource_manager_filter_status = resource_manager_filter.clone();
            
            tauri::async_runtime::spawn(async move {
                println!("Starting local resource server at http://127.0.0.1:8765/");
                let cors = warp::cors()
                    .allow_any_origin()
                    .allow_methods(vec!["GET", "POST", "OPTIONS"]);

                let resource_route = warp::path::tail()
                    .and(resource_manager_filter)
                    .and_then(handle_resource_request);
                
                let status_route = warp::path("status")
                    .and(resource_manager_filter_status)
                    .map(|rm: Arc<ResourceManager>| {
                        let status = rm.get_status();
                        warp::reply::json(&status)
                    });

                // status_route must come first because resource_route matches everything
                let routes = status_route.or(resource_route).with(cors);

                // Listen on port 8765 (same as old python server)
                warp::serve(routes).run(([127, 0, 0, 1], 8765)).await;
            });
            
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                let version = handle.package_info().version.to_string();
                if let Ok(info) = updater::check_update(&version).await {
                    if info.has_update {
                        // Call window.onUpdateFound(filename, version, url)
                        if let Some(window) = handle.get_webview_window("main") {
                            let script = format!(
                                "if(window.onUpdateFound) window.onUpdateFound('{}', '{}', '{}');",
                                info.filename, info.version, info.download_url
                            );
                            let _ = window.eval(&script);
                        }
                    }
                }
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_accounts,
            commands::add_account,
            commands::delete_account,
            commands::set_active_account,
            commands::get_active_account,
            commands::save_yaml,
            commands::load_yaml,
            commands::check_resource_exists,
            commands::get_resource_download_status,
            commands::exit_app,
            commands::save_config_volume,
            commands::save_report_faction_filter,
            commands::get_report_faction_filter,
            commands::get_config_volume,
            commands::log_message,
            commands::check_for_updates,
            commands::perform_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
