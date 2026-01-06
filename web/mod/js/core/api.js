// 支援 Tauri 2.0

function isTauri() {
    return window.__TAURI__ && window.__TAURI__.core;
}

export async function getAccounts() {
    if (isTauri()) {
        return await window.__TAURI__.core.invoke('get_accounts');
    }
    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_accounts) {
        const res = await window.pywebview.api.get_accounts();
        return typeof res === 'string' ? JSON.parse(res) : res;
    }
    return [];
}

export async function getActiveAccount() {
    if (isTauri()) {
        return await window.__TAURI__.core.invoke('get_active_account');
    }
    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_active_account) {
        const res = await window.pywebview.api.get_active_account();
        return typeof res === 'string' ? JSON.parse(res) : res;
    }
    return null;
}

export async function addAccount(accountObj) {
    if (isTauri()) {
        return await window.__TAURI__.core.invoke('add_account', { data: JSON.stringify(accountObj) });
    }
    if (window.pywebview && window.pywebview.api && window.pywebview.api.add_account) {
        // Python 端 qt_bridge 預期接收 JSON 字串
        return await window.pywebview.api.add_account(JSON.stringify(accountObj));
    }
    return false;
}

export async function deleteAccount(idx) {
    if (isTauri()) {
        return await window.__TAURI__.core.invoke('delete_account', { idx });
    }
    if (window.pywebview && window.pywebview.api && window.pywebview.api.delete_account) {
        return await window.pywebview.api.delete_account(idx);
    }
    return false;
}

export async function setActiveAccount(idx) {
    if (isTauri()) {
        return await window.__TAURI__.core.invoke('set_active_account', { idx });
    }
    if (window.pywebview && window.pywebview.api && window.pywebview.api.set_active_account) {
        return await window.pywebview.api.set_active_account(idx);
    }
    return false;
}

export async function saveYaml(filename, content) {
    if (isTauri()) {
        return await window.__TAURI__.core.invoke('save_yaml', { filename, content });
    }
    if (window.pywebview && window.pywebview.api && window.pywebview.api.save_yaml) {
        return await window.pywebview.api.save_yaml(filename, content);
    }
    return false;
}

export async function loadYaml(filename) {
    if (isTauri()) {
        return await window.__TAURI__.core.invoke('load_yaml', { filename });
    }
    if (window.pywebview && window.pywebview.api && window.pywebview.api.load_yaml) {
        return await window.pywebview.api.load_yaml(filename);
    }
    return '';
}

export async function exitApp() {
    if (isTauri()) {
        return await window.__TAURI__.core.invoke('exit_app');
    }
    if (window.pywebview && window.pywebview.api && window.pywebview.api.exit_app) {
        return await window.pywebview.api.exit_app();
    }
    window.close();
}
