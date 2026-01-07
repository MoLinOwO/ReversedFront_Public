import * as api from '../core/api.js';
import { $ } from '../core/utils.js';

// 帳號管理模組

// 用 window.currentSelectedAccountIdx 儲存目前選取的帳號 index
if (typeof window.currentSelectedAccountIdx !== 'number') {
    const savedIdx = sessionStorage.getItem('currentSelectedAccountIdx');
    window.currentSelectedAccountIdx = savedIdx !== null ? parseInt(savedIdx) : 0;
}

export async function renderAccountManager(accountSection, autofillActiveAccount) {
    let accounts = [];
    try {
        accounts = await api.getAccounts();
    } catch(e) {}
    // 若目前選取 index 超出範圍，自動歸零
    if (window.currentSelectedAccountIdx >= accounts.length) {
        window.currentSelectedAccountIdx = 0;
        sessionStorage.setItem('currentSelectedAccountIdx', 0);
    }
    let html = '';
    html += '<div style="margin-bottom:8px;font-size:1em;">帳號管理</div>';
    html += '<div id="account-list" style="min-height:60px;max-height:120px;overflow-y:auto;margin-bottom:8px;">';
    accounts.forEach((acc, i) => {
        html += `<div style="display:flex;align-items:center;margin-bottom:2px;">
            <input type="radio" name="account-radio" value="${i}" ${i===window.currentSelectedAccountIdx?'checked':''} style="margin-right:6px;">
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
            window.currentSelectedAccountIdx = parseInt(this.value);
            sessionStorage.setItem('currentSelectedAccountIdx', window.currentSelectedAccountIdx);

            // 同步後端的 active_account_index，確保重啟後仍維持同一個帳號
            try {
                await api.setActiveAccount(window.currentSelectedAccountIdx);
            } catch (e) {}

            renderAccountManager(accountSection, autofillActiveAccount);
            autofillActiveAccount();
            // 切換帳號時自動同步音量UI（含se147_muted）
            if (window.syncAudioControlsWithConfig && window.__TAURI__?.core) {
                try {
                    const accounts = await window.__TAURI__.core.invoke('get_accounts');
                    const accountIdx = parseInt(this.value);
                    if (accounts && accountIdx < accounts.length) {
                        const targetAccount = accounts[accountIdx];
                        window.syncAudioControlsWithConfig(targetAccount);
                    } else {
                        window.syncAudioControlsWithConfig();
                    }
                } catch (e) {
                    window.syncAudioControlsWithConfig();
                }
            }
            // 切換帳號時同步戰報通知過濾 select
            if (window.syncFactionFilterFromConfig) {
                setTimeout(window.syncFactionFilterFromConfig, 300);
            }
            // 新增：同步控制面板帳號 select 狀態
            const accountSelect = document.getElementById('account-select');
            if (accountSelect) {
                accountSelect.selectedIndex = window.currentSelectedAccountIdx;
                accountSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        };
    });
    document.querySelectorAll('.del-account-btn').forEach(btn => {
        btn.onclick = async function() {
            await api.deleteAccount(parseInt(this.dataset.idx));
            // 若刪除的是目前選取的帳號，index 歸零
            if (window.currentSelectedAccountIdx >= accounts.length - 1) window.currentSelectedAccountIdx = 0;
            sessionStorage.setItem('currentSelectedAccountIdx', window.currentSelectedAccountIdx);
            renderAccountManager(accountSection, autofillActiveAccount);
        };
    });
    $("#add-account-form").onsubmit = async function(e) {
        e.preventDefault();
        const account = $("#add-account-input").value;
        const password = $("#add-password-input").value;
        if(account && password) {
            await api.addAccount({account,password});
            // 新增帳號後自動選到最後一個
            window.currentSelectedAccountIdx = accounts.length;
            sessionStorage.setItem('currentSelectedAccountIdx', window.currentSelectedAccountIdx);
            renderAccountManager(accountSection, autofillActiveAccount);
            autofillActiveAccount();
        }
    };
}

// 自動攔截登入並保存帳號
export function setupLoginInterceptor(accountSection, autofillActiveAccount) {
    const checkAndAttachInterceptor = () => {
        // 嘗試更通用的選擇器策略
        let formBox = document.querySelector('.Login_loginFormBox__LKcQJ');
        
        // 如果找不到特定 class，嘗試尋找包含密碼輸入框的容器
        if (!formBox) {
            const pwdInput = document.querySelector('input[type="password"]');
            if (pwdInput) {
                // 往上找直到找到看起來像表單容器的元素 (通常有 button)
                let parent = pwdInput.parentElement;
                let depth = 0;
                while (parent && parent !== document.body && depth < 5) {
                    if (parent.querySelector('button') || parent.querySelector('[class*="Btn"]')) {
                        formBox = parent;
                        break;
                    }
                    parent = parent.parentElement;
                    depth++;
                }
            }
        }

        // 確保只綁定一次
        if (formBox && !formBox.dataset.interceptorAttached) {
            // 尋找按鈕：多種策略
            let loginBtn = formBox.querySelector('.Login_formBtn__L1ZuE');
            if (!loginBtn) loginBtn = formBox.querySelector('button');
            if (!loginBtn) loginBtn = formBox.querySelector('input[type="submit"]');
            if (!loginBtn) loginBtn = formBox.querySelector('[class*="Btn"]'); // 包含 Btn 的 class
            if (!loginBtn) loginBtn = formBox.querySelector('[class*="btn"]'); // 包含 btn 的 class
            if (!loginBtn) loginBtn = formBox.querySelector('[role="button"]'); // role="button"
            
            const accountInput = formBox.querySelector('input[type="text"]');
            const passwordInput = formBox.querySelector('input[type="password"]');

            if (accountInput && passwordInput) {
                formBox.dataset.interceptorAttached = 'true';
                
                const saveAccount = async () => {
                    const account = accountInput.value;
                    const password = passwordInput.value;
                    
                    if (account && password) {
                        try {
                            // 新增或更新帳號 (後端會處理重複並更新密碼)
                            await api.addAccount({account, password});

                            // 獲取最新帳號列表以找到索引
                            const accounts = await api.getAccounts();
                            const idx = accounts.findIndex(a => a.account === account);
                            
                            if (idx !== -1) {
                                // 更新當前選擇
                                window.currentSelectedAccountIdx = idx;
                                sessionStorage.setItem('currentSelectedAccountIdx', idx);
                                
                                // 更新 UI
                                if (accountSection) {
                                    renderAccountManager(accountSection, autofillActiveAccount);
                                }
                                
                                // 同步音量等設定
                                if (window.syncAudioControlsWithConfig) {
                                    window.syncAudioControlsWithConfig(accounts[idx]);
                                }
                                
                                // 同步戰報過濾
                                if (window.syncFactionFilterFromConfig) {
                                    setTimeout(window.syncFactionFilterFromConfig, 300);
                                }
                                
                                // 同步控制面板 select
                                const accountSelect = document.getElementById('account-select');
                                if (accountSelect) {
                                    accountSelect.selectedIndex = idx;
                                    accountSelect.dispatchEvent(new Event('change', { bubbles: true }));
                                }

                                // 同步後端 active_account_index
                                try {
                                    await api.setActiveAccount(idx);
                                } catch (e) {}
                            }
                        } catch (e) {
                            console.error('Failed to save account on login:', e);
                        }
                    }
                };

                if (loginBtn) {
                    // 監聽點擊事件 (使用 mousedown 確保在頁面跳轉前觸發)
                    loginBtn.addEventListener('mousedown', saveAccount);
                    // 備用：click
                    loginBtn.addEventListener('click', (e) => {
                        // 這裡不做事，依賴 mousedown，或者如果 mousedown 沒觸發(例如鍵盤操作)
                    });
                }
                
                // 監聽 Enter 鍵
                const handleEnter = (e) => {
                    if (e.key === 'Enter') {
                        saveAccount();
                    }
                };
                passwordInput.addEventListener('keydown', handleEnter);
                accountInput.addEventListener('keydown', handleEnter);
            }
        }
    };

    // 使用 MutationObserver 監控登入表單的出現
    const observer = new MutationObserver((mutations) => {
        checkAndAttachInterceptor();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    
    // 立即檢查一次
    checkAndAttachInterceptor();
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

// 獲取當前應該用來自動登入的帳號
// 這裡統一依照後端的 active_account_index 決定，
// 而功能選單在切換帳號時會呼叫 setActiveAccount 保持同步。
async function getCurrentSelectedAccountForLogin() {
    try {
        // 優先使用後端記錄的 active account（與功能選單同步）
        const activeAccount = await api.getActiveAccount();
        if (activeAccount && activeAccount.account && activeAccount.password) {
            console.log(`自動登入將使用後端活動帳號: ${activeAccount.account}`);
            return activeAccount;
        }

        // 如果尚未設定 active，退回到帳號列表中的第一個
        const accounts = await api.getAccounts();
        if (accounts && accounts.length > 0) {
            const first = accounts[0];
            console.log(`自動登入找不到活動帳號，改用第一個帳號: ${first.account}`);
            return first;
        }

        return null;
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