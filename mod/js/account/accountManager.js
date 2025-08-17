import * as api from '../core/api.js';
import { $ } from '../core/utils.js';

// 帳號管理模組
export async function renderAccountManager(accountSection, autofillActiveAccount) {
    let accounts = [];
    let activeIdx = 0;
    try {
        accounts = await api.getAccounts();
        const active = await api.getActiveAccount();
        if(active && accounts.length) {
            activeIdx = accounts.findIndex(a => a.account === active.account && a.password === active.password);
            if(activeIdx < 0) activeIdx = 0;
        }
    } catch(e) {}
    let html = '';
    html += '<div style="margin-bottom:8px;font-size:1em;">帳號管理</div>';
    html += '<div id="account-list" style="max-height:120px;overflow-y:auto;margin-bottom:8px;">';
    accounts.forEach((acc, i) => {
        html += `<div style="display:flex;align-items:center;margin-bottom:2px;">
            <input type="radio" name="account-radio" value="${i}" ${i===activeIdx?'checked':''} style="margin-right:6px;">
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${acc.account}</span>
            <button type="button" class="del-account-btn" data-idx="${i}" style="margin-left:6px;background:#333;color:#fff;border:none;border-radius:3px;padding:2px 7px;cursor:pointer;">刪除</button>
        </div>`;
    });
    html += '</div>';
    html += `<button id="show-add-account" style="background:#444;color:#fff;border:none;padding:6px 0;border-radius:6px;cursor:pointer;width:100%;margin-bottom:4px;">新增帳號</button>`;
    html += `<form id="add-account-form" style="display:none;flex-direction:column;gap:4px;margin-bottom:4px;">
        <input id="add-account-input" type="text" placeholder="帳號" style="padding:5px;border-radius:4px;border:1px solid #444;background:#222;color:#fff;">
        <input id="add-password-input" type="password" placeholder="密碼" style="padding:5px;border-radius:4px;border:1px solid #444;background:#222;color:#fff;">
        <button type="submit" style="background:#444;color:#fff;border:none;padding:6px 0;border-radius:6px;cursor:pointer;">儲存</button>
    </form>`;
    accountSection.innerHTML = html;
    $("#show-add-account").onclick = function() {
        $("#add-account-form").style.display = 'flex';
        this.style.display = 'none';
    };
    document.querySelectorAll('input[name="account-radio"]').forEach(radio => {
        radio.onchange = async function() {
            await api.setActiveAccount(parseInt(this.value));
            renderAccountManager(accountSection, autofillActiveAccount);
            autofillActiveAccount();
            
            // 當切換帳號時，重新同步音量設定
            if (window.syncAudioControlsWithConfig && window.pywebview && window.pywebview.api) {
                try {
                    const accounts = await window.pywebview.api.get_accounts();
                    const accountIdx = parseInt(this.value);
                    if (accounts && accountIdx < accounts.length) {
                        const targetAccount = accounts[accountIdx];
                        console.log(`切換到帳號 ${targetAccount.account}，開始同步音量設定...`);
                        
                        // 使用全局音量同步函數
                        await window.syncAudioControlsWithConfig(targetAccount);
                    }
                } catch (e) {
                    console.error('切換帳號時同步音量設定失敗:', e);
                }
            }
        };
    });
    document.querySelectorAll('.del-account-btn').forEach(btn => {
        btn.onclick = async function() {
            await api.deleteAccount(parseInt(this.dataset.idx));
            renderAccountManager(accountSection, autofillActiveAccount);
        };
    });
    $("#add-account-form").onsubmit = async function(e) {
        e.preventDefault();
        const account = $("#add-account-input").value;
        const password = $("#add-password-input").value;
        if(account && password) {
            await api.addAccount({account,password});
            renderAccountManager(accountSection, autofillActiveAccount);
            autofillActiveAccount();
        }
    };
}

// 自動登入功能
window.autoLogin = function(account, password) {
    if (!location.hash.startsWith('#/users/log_in')) return;
    let tryCount = 0;
    let fillTimer = setInterval(function() {
        // 若已經跳轉到 home，直接結束輪詢
        if (location.hash.startsWith('#/home')) {
            clearInterval(fillTimer);
            return;
        }
        var loginBtn = document.querySelector('.Login_loginRow1__idwSI .Login_formBtn__L1ZuE');
        if (loginBtn) {
            ['mousedown','mouseup','click'].forEach(ev => {
                loginBtn.dispatchEvent(new MouseEvent(ev, { bubbles: true }));
            });
        }
        var formBox = document.querySelector('.Login_loginFormBox__LKcQJ');
        if (formBox) {
            var accountInput = formBox.querySelector('input[type="text"]');
            var passwordInput = formBox.querySelector('input[type="password"]');
            if (accountInput && passwordInput) {
                var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(accountInput, account);
                nativeSetter.call(passwordInput, password);
                ['input','change','blur'].forEach(ev => {
                    accountInput.dispatchEvent(new Event(ev, { bubbles: true }));
                    passwordInput.dispatchEvent(new Event(ev, { bubbles: true }));
                });
                clearInterval(fillTimer);
                // 輪詢等待確定按鈕出現再點擊（模擬滑鼠點擊）
                let submitTry = 0;
                let submitTimer = setInterval(function() {
                    if (location.hash.startsWith('#/home')) {
                        clearInterval(submitTimer);
                        return;
                    }
                    var submitBtn = formBox.querySelector('.Login_formBtn__L1ZuE.ClickEffect');
                    if (submitBtn) {
                        ['mousedown','mouseup','click'].forEach(ev => {
                            submitBtn.dispatchEvent(new MouseEvent(ev, { bubbles: true }));
                        });
                        clearInterval(submitTimer);
                    }
                    if (++submitTry > 30) clearInterval(submitTimer);
                }, 200);
            }
        }
        if (++tryCount > 30) {
            clearInterval(fillTimer);
        }
    }, 200);
};

export async function autofillActiveAccount() {
    let savedAccount = null;
    try {
        savedAccount = await getCurrentSelectedAccountForLogin();
    } catch(e) {}
    if(savedAccount) {
        console.log(`自動填入將使用選擇的帳號: ${savedAccount.account}`);
        let tryCount = 0;
        let autofillTimer = setInterval(function() {
            let accountInput = Array.from(document.querySelectorAll('input'))
                .filter(el => !el.closest('#custom-controls'))
                .find(el => el.placeholder && el.placeholder.includes('帳號'));
            let passwordInput = Array.from(document.querySelectorAll('input'))
                .filter(el => !el.closest('#custom-controls'))
                .find(el => el.type === 'password');
            if (!accountInput || !passwordInput) {
                const inputs = Array.from(document.querySelectorAll('input'))
                    .filter(el => !el.closest('#custom-controls'));
                if (inputs.length >= 2) {
                    accountInput = inputs[0];
                    passwordInput = inputs[1];
                }
            }
            if (accountInput && passwordInput) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeInputValueSetter.call(accountInput, savedAccount.account);
                nativeInputValueSetter.call(passwordInput, savedAccount.password);
                ['input','change','blur'].forEach(ev=>{
                    accountInput.dispatchEvent(new Event(ev, { bubbles: true }));
                    passwordInput.dispatchEvent(new Event(ev, { bubbles: true }));
                });
                const loginBtn = Array.from(document.querySelectorAll('div[class*="Login_text__SoiB+"]')).find(div => {
                    return Array.from(div.querySelectorAll('*')).some(
                        el => el.textContent && el.textContent.includes('帳號登入')
                    );
                });
                if(loginBtn) {
                    ['mousedown','mouseup','click'].forEach(ev=>{
                        loginBtn.dispatchEvent(new MouseEvent(ev, { bubbles: true }));
                    });
                } else {
                    const btn = Array.from(document.querySelectorAll('button,input[type="button"],input[type="submit"]')).find(
                        el => el.textContent.includes('登入') || el.value === '登入'
                    );
                    if(btn) {
                        ['mousedown','mouseup','click'].forEach(ev=>{
                            btn.dispatchEvent(new MouseEvent(ev, { bubbles: true }));
                        });
                    }
                }
                clearInterval(autofillTimer);
            }
            if(++tryCount > 20) clearInterval(autofillTimer);
        }, 800);
    }
}

// 獲取當前界面選擇的帳號
async function getCurrentSelectedAccountForLogin() {
    try {
        const accounts = await api.getAccounts();
        if (!accounts || accounts.length === 0) return null;
        
        // 查找當前選中的 radio button
        const selectedRadio = document.querySelector('input[name="account-radio"]:checked');
        if (selectedRadio) {
            const selectedIdx = parseInt(selectedRadio.value);
            if (selectedIdx >= 0 && selectedIdx < accounts.length) {
                const selectedAccount = accounts[selectedIdx];
                console.log(`自動登入將使用界面選擇的帳號: ${selectedAccount.account} (索引: ${selectedIdx})`);
                return selectedAccount;
            }
        }
        
        // 如果沒有找到選中的 radio，回退到 active account
        const activeAccount = await api.getActiveAccount();
        if (activeAccount) {
            console.log(`自動登入回退到配置中的活動帳號: ${activeAccount.account}`);
        }
        return activeAccount;
    } catch (e) {
        console.error('獲取當前選擇帳號失敗:', e);
        return null;
    }
}

// 進入 /#/users/log_in 頁面自動觸發 autoLogin
window.addEventListener('hashchange', async function() {
    if (location.hash.startsWith('#/users/log_in')) {
        try {
            const savedAccount = await getCurrentSelectedAccountForLogin();
            if (savedAccount && savedAccount.account && savedAccount.password) {
                setTimeout(() => {
                    window.autoLogin(savedAccount.account, savedAccount.password);
                }, 300); // 延遲以確保畫面渲染完成
            }
        } catch(e) {}
    }
});
// 若一開始就位於登入頁，也要觸發
if (location.hash.startsWith('#/users/log_in')) {
    (async () => {
        try {
            const savedAccount = await getCurrentSelectedAccountForLogin();
            if (savedAccount && savedAccount.account && savedAccount.password) {
                setTimeout(() => {
                    window.autoLogin(savedAccount.account, savedAccount.password);
                }, 300);
            }
        } catch(e) {}
    })();
}

// 監控 hash 變化，方便 SPA/React 路由偵測
window.addEventListener('hashchange', function() {});

// 輪詢 hash 變化，防止 React Router 沒有觸發 hashchange
let lastHash = location.hash;
let hashPollTimer = setInterval(() => {
    if (location.hash !== lastHash) {
        if (location.hash.startsWith('#/users/log_in')) {
            (async () => {
                try {
                    const savedAccount = await getCurrentSelectedAccountForLogin();
                    if (savedAccount && savedAccount.account && savedAccount.password) {
                        setTimeout(() => {
                            window.autoLogin(savedAccount.account, savedAccount.password);
                        }, 300);
                    }
                } catch(e) {}
            })();
        }
        // 若已經跳轉到 home，直接結束 hash 輪詢
        if (location.hash.startsWith('#/home')) {
            clearInterval(hashPollTimer);
        }
        lastHash = location.hash;
    }
}, 300);