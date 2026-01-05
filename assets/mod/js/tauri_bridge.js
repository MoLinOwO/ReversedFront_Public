// Tauri Bridge - Shims window.pywebview.api to window.__TAURI__.core.invoke

// 1. Anti-Sleep & Visibility Override (Ported from main_window.py)
try {
    Object.defineProperty(document, 'hidden', { get: function() { return false; }, configurable: true });
    Object.defineProperty(document, 'visibilityState', { get: function() { return 'visible'; }, configurable: true });
    window.addEventListener('visibilitychange', function(e) { 
        e.stopImmediatePropagation();
        e.stopPropagation();
    }, true);
    console.log("[Tauri] Anti-Sleep & Visibility Override enabled");
} catch (e) {
    console.error("[Tauri] Failed to enable Anti-Sleep:", e);
}

window.pywebview = window.pywebview || {};
window.pywebview.api = window.pywebview.api || {};

const invoke = window.__TAURI__.core.invoke;
const getCurrentWindow = window.__TAURI__.window.getCurrentWindow;

// Track unload state to prevent IPC calls during reload
window.isUnloading = false;
window.addEventListener('beforeunload', () => {
    window.isUnloading = true;
});

// Implement UI methods directly in frontend where possible
window.pywebview.api.toggle_menu = function() {
    if (window.toggleControlPanel) {
        window.toggleControlPanel();
    } else {
        const panel = document.getElementById('custom-controls');
        const toggle = document.getElementById('custom-controls-toggle');
        if (panel && toggle) {
            if (panel.style.display === 'none' || !panel.style.display) {
                panel.style.display = 'block';
                toggle.style.display = 'none';
            } else {
                panel.style.display = 'none';
                toggle.style.display = 'flex';
            }
        }
    }
};

window.pywebview.api.toggle_fullscreen = async function() {
    console.log('[Tauri Bridge] toggle_fullscreen called');
    try {
        const win = getCurrentWindow();
        const isFullscreen = await win.isFullscreen();
        console.log('[Tauri Bridge] Current fullscreen state:', isFullscreen);
        await win.setFullscreen(!isFullscreen);
        console.log('[Tauri Bridge] Toggled fullscreen to:', !isFullscreen);
        return !isFullscreen;
    } catch (e) {
        console.error('[Tauri Bridge] toggle_fullscreen failed:', e);
        return false;
    }
};

window.pywebview.api.set_window_size = async function(width, height) {
    const win = getCurrentWindow();
    // Logical size
    await win.setSize(new window.__TAURI__.window.LogicalSize(width, height));
    return true;
};

// Backend methods
const apiMethods = [
    'get_accounts', 'add_account', 'delete_account', 'set_active_account', 'get_active_account',
    'save_yaml', 'load_yaml', 'exit_app',
    'save_config_volume', 'get_config_volume', 'save_report_faction_filter', 'get_report_faction_filter',
    'log_message',
    'check_for_updates', 'perform_update'
];

// Special handling for check_resource_exists to use local server instead of IPC
// This avoids "Couldn't find callback id" errors during reloads
window.pywebview.api.check_resource_exists = async function(resourcePath) {
    try {
        // Use HEAD request to check existence and trigger download if missing
        // The backend server handles the check_resource logic
        const response = await fetch(`http://localhost:8765/passionfruit/${resourcePath}`, { 
            method: 'HEAD',
            cache: 'no-cache'
        });
        
        return { 
            exists: response.ok, 
            downloading: !response.ok,
            path: resourcePath,
            absPath: "" // Not needed for frontend
        };
    } catch (e) {
        console.error("[Tauri Bridge] check_resource_exists failed:", e);
        return { exists: false, downloading: false, path: resourcePath, absPath: "" };
    }
};

// Special handling for get_resource_download_status to use local server instead of IPC
// This avoids "Couldn't find callback id" errors during reloads
window.pywebview.api.get_resource_download_status = async function() {
    try {
        const response = await fetch(`http://localhost:8765/status`, { 
            method: 'GET',
            cache: 'no-cache'
        });
        
        if (response.ok) {
            return await response.json();
        }
        return { queueLength: 0, isDownloading: false, activeDownloads: 0, maxWorkers: 4, downloadedCount: 0 };
    } catch (e) {
        // console.error("[Tauri Bridge] get_resource_download_status failed:", e);
        return { queueLength: 0, isDownloading: false, activeDownloads: 0, maxWorkers: 4, downloadedCount: 0 };
    }
};

apiMethods.forEach(method => {
    window.pywebview.api[method] = async function(...args) {
        try {
            let invokeArgs = {};
            
            if (method === 'add_account') {
                invokeArgs = { data: args[0] };
            } else if (method === 'delete_account') {
                invokeArgs = { idx: args[0] };
            } else if (method === 'set_active_account') {
                invokeArgs = { idx: args[0] };
            } else if (method === 'save_yaml') {
                invokeArgs = { filename: args[0], content: args[1] };
            } else if (method === 'load_yaml') {
                invokeArgs = { filename: args[0] };
            } else if (method === 'check_resource_exists') {
                invokeArgs = { resourcePath: args[0] };
            } else if (method === 'save_config_volume') {
                // Rust expects a JSON string, but frontend passes an object
                invokeArgs = { data: JSON.stringify(args[0]) };
            } else if (method === 'get_config_volume') {
                invokeArgs = { targetAccount: args[0] };
            } else if (method === 'save_report_faction_filter') {
                invokeArgs = { faction: args[0], targetAccount: args[1] };
            } else if (method === 'get_report_faction_filter') {
                invokeArgs = { targetAccount: args[0] };
            } else if (method === 'log_message') {
                invokeArgs = { message: args[0] };
            } else if (method === 'perform_update') {
                invokeArgs = { url: args[0], filename: args[1] };
            }
            
            if (window.isUnloading) {
                console.warn(`[Tauri Bridge] Skipping ${method} because app is unloading`);
                return null;
            }

            const result = await invoke(method, invokeArgs);
            
            if (typeof result === 'object' && result !== null) {
                 return result;
            }
            
            return result;
        } catch (e) {
            if (window.isUnloading) return null;
            console.error(`Error invoking ${method}:`, e);
            return null;
        }
    };
});

console.log("Tauri Bridge initialized");
window.dispatchEvent(new Event('pywebviewready'));
