// Tauri API 封裝

function isTauri() {
    return window.__TAURI__ && window.__TAURI__.core;
}

export async function getAccounts() {
    if (!isTauri()) return [];
    return await window.__TAURI__.core.invoke('get_accounts');
}

export async function getActiveAccount() {
    if (!isTauri()) return null;
    return await window.__TAURI__.core.invoke('get_active_account');
}

export async function addAccount(accountObj) {
    if (!isTauri()) return false;
    return await window.__TAURI__.core.invoke('add_account', { data: JSON.stringify(accountObj) });
}

export async function deleteAccount(idx) {
    if (!isTauri()) return false;
    return await window.__TAURI__.core.invoke('delete_account', { idx });
}

export async function setActiveAccount(idx) {
    if (!isTauri()) return false;
    return await window.__TAURI__.core.invoke('set_active_account', { idx });
}

export async function saveYaml(filename, content) {
    if (!isTauri()) return false;
    return await window.__TAURI__.core.invoke('save_yaml', { filename, content });
}

export async function loadYaml(filename) {
    if (!isTauri()) return '';
    return await window.__TAURI__.core.invoke('load_yaml', { filename });
}

export async function exitApp() {
    if (!isTauri()) {
        window.close();
        return;
    }
    return await window.__TAURI__.core.invoke('exit_app');
}
