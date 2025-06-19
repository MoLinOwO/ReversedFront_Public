import * as api from './api.js';
import { $ } from './utils.js';

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

export async function autofillActiveAccount() {
    let savedAccount = null;
    try {
        savedAccount = await api.getActiveAccount();
    } catch(e) {}
    if(savedAccount) {
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
                const loginBtn = Array.from(document.querySelectorAll('div[class*="Login_formBtn"]')).find(div => {
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
