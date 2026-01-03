// 封裝 pywebview API 互動
export async function getAccounts() {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_accounts) {
        return await window.pywebview.api.get_accounts();
    }
    return [];
}

export async function getActiveAccount() {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_active_account) {
        return await window.pywebview.api.get_active_account();
    }
    return null;
}

export async function addAccount(accountObj) {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.add_account) {
        // Python 端 qt_bridge 預期接收 JSON 字串
        return await window.pywebview.api.add_account(JSON.stringify(accountObj));
    }
    return false;
}

export async function deleteAccount(idx) {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.delete_account) {
        return await window.pywebview.api.delete_account(idx);
    }
    return false;
}

export async function setActiveAccount(idx) {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.set_active_account) {
        return await window.pywebview.api.set_active_account(idx);
    }
    return false;
}

export async function saveYaml(filename, content) {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.save_yaml) {
        return await window.pywebview.api.save_yaml(filename, content);
    }
    return false;
}

export async function loadYaml(filename) {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.load_yaml) {
        return await window.pywebview.api.load_yaml(filename);
    }
    return '';
}

export async function exitApp() {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.exit_app) {
        return await window.pywebview.api.exit_app();
    }
    window.close();
}
