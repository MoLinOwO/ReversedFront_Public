
export function initUpdatePrompt() {
    // 定義全局回調函數供後端調用
    window.onUpdateFound = function(filename, version, url) {
        console.log('[Update] 發現新版本:', version, filename);
        
        // 避免重複彈窗
        if (document.getElementById('rf-update-modal')) return;

        // 創建模態框
        const modal = document.createElement('div');
        modal.id = 'rf-update-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 20000;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(4px);
            font-family: "Microsoft JhengHei", sans-serif;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: #222;
            color: #fff;
            padding: 24px;
            border-radius: 12px;
            width: 400px;
            max-width: 90%;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            border: 1px solid #444;
            text-align: center;
            animation: fadeIn 0.3s ease-out;
        `;
        
        // 添加動畫樣式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
        
        content.innerHTML = `
            <h2 style="margin-top:0;color:#4CAF50;font-size:1.5em;">發現新版本 v${version}</h2>
            <p style="margin: 20px 0; color: #ccc; line-height: 1.5;">
                檢測到新的應用程式版本。<br>
                是否立即下載並安裝？
            </p>
            <div style="display:flex;justify-content:center;gap:16px;margin-top:24px;">
                <button id="btn-update-confirm" style="padding:10px 24px;background:#4CAF50;color:white;border:none;border-radius:6px;cursor:pointer;font-size:1em;transition:background 0.2s;">立即更新</button>
                <button id="btn-update-cancel" style="padding:10px 24px;background:#555;color:white;border:none;border-radius:6px;cursor:pointer;font-size:1em;transition:background 0.2s;">稍後再說</button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // 按鈕事件
        const btnCancel = document.getElementById('btn-update-cancel');
        const btnConfirm = document.getElementById('btn-update-confirm');
        
        btnCancel.onmouseover = () => btnCancel.style.background = '#666';
        btnCancel.onmouseout = () => btnCancel.style.background = '#555';
        
        btnConfirm.onmouseover = () => btnConfirm.style.background = '#45a049';
        btnConfirm.onmouseout = () => btnConfirm.style.background = '#4CAF50';
        
        btnCancel.onclick = () => {
            modal.remove();
        };
        
        btnConfirm.onclick = async () => {
            btnConfirm.disabled = true;
            btnConfirm.textContent = '下載中...';
            btnConfirm.style.background = '#666';
            btnConfirm.style.cursor = 'wait';
            btnCancel.style.display = 'none';
            
            const p = content.querySelector('p');
            if (p) p.textContent = '正在下載更新檔，下載完成後將自動重啟安裝...';
            
            // 僅在 Tauri 環境下才呼叫更新指令
            if (window.__TAURI__?.core) {
                try {
                    await window.__TAURI__.core.invoke('perform_update', { url, filename });
                } catch (e) {
                    console.error('Update failed:', e);
                    p.textContent = '更新失敗: ' + e;
                    p.style.color = '#ff5252';
                    btnConfirm.textContent = '重試';
                    btnConfirm.disabled = false;
                    btnConfirm.style.background = '#4CAF50';
                    btnConfirm.style.cursor = 'pointer';
                    btnCancel.style.display = 'inline-block';
                }
            } else {
                alert('無法調用更新 API');
                modal.remove();
            }
        };
    };
    
    console.log('Update prompt initialized');
}
