// 音量與通知控制
export function setupAudioControls(controlsPanel) {
    // 獲取前端當前選中的帳號資訊
    function getCurrentSelectedAccount() {
        const selectedRadio = document.querySelector('input[name="account-radio"]:checked');
        if (selectedRadio) {
            const accountIdx = parseInt(selectedRadio.value);
            const accountSpan = selectedRadio.parentElement.querySelector('span');
            if (accountSpan) {
                const accountName = accountSpan.textContent.trim();
                // 這裡我們只能取得帳號名稱，密碼需要從 API 獲取
                return { accountName, accountIdx };
            }
        }
        return null;
    }

    // 獲取完整的帳號資訊（包含密碼）
    async function getCurrentAccountData() {
        const selected = getCurrentSelectedAccount();
        if (!selected) return null;
        
        try {
            const accounts = await window.pywebview.api.get_accounts();
            if (accounts && selected.accountIdx < accounts.length) {
                return accounts[selected.accountIdx];
            }
        } catch (e) {
            console.error('獲取帳號列表失敗:', e);
        }
        return null;
    }

    if (!document.getElementById('rf-audio-controls')) {
        const audioContainer = document.createElement('div');
        audioContainer.id = 'rf-audio-controls';
        audioContainer.innerHTML = `
            <div style="border-top: 1px solid #555; margin: 16px 0 12px 0;"></div>
            <div style="margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; font-size: 0.95em;">
                <label for="bgm-volume-slider" style="margin-right: 10px;">BGM音量</label>
                <input type="range" id="bgm-volume-slider" min="0" max="1" step="0.01" value="0" style="flex-grow: 1; margin: 0 8px; accent-color:#2a7cff;">
                <span class="volume-value" style="width: 30px; text-align: right; font-variant-numeric: tabular-nums;">0</span>
            </div>
            <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; font-size: 0.95em;">
                <label for="se-volume-slider" style="margin-right: 10px;">音效音量</label>
                <input type="range" id="se-volume-slider" min="0" max="1" step="0.01" value="0" style="flex-grow: 1; margin: 0 8px; accent-color:#1dbf60;">
                <span class="volume-value" style="width: 30px; text-align: right; font-variant-numeric: tabular-nums;">0</span>
            </div>
            <div style="margin-bottom: 4px;">
                <button id="se147-toggle-button" style="width:100%; background:#d9534f; color:#fff; border:none; padding:8px 0; border-radius:6px; cursor:pointer; font-size: 0.95em; transition: background-color 0.2s;">戰報通知：關</button>
                <input type="checkbox" id="se147-toggle" style="display: none;">
            </div>
        `;
        controlsPanel.appendChild(audioContainer);
        
        // 在 DOM 元素創建後立即嘗試同步設定
        setTimeout(() => {
            if (!hasSynced) {
                initialSync();
            }
        }, 50);
    }
    window.updateCustomControlsUI = function(cfg) {
        if (!cfg) {
            console.warn('updateCustomControlsUI: 沒有提供配置數據');
            return;
        }
        
        console.log('updateCustomControlsUI: 更新音量控制 UI，配置:', cfg);
        
        const bgmSlider = document.getElementById('bgm-volume-slider');
        const bgmValueSpan = bgmSlider ? bgmSlider.parentElement.querySelector('.volume-value') : null;
        if (bgmSlider && typeof cfg.bgm === 'number') {
            console.log(`更新 BGM 滑塊: ${cfg.bgm}`);
            bgmSlider.value = cfg.bgm;
            if (bgmValueSpan) bgmValueSpan.textContent = Math.round(cfg.bgm * 100);
            
            // 實際應用 BGM 音量到音頻系統
            window._rf_bgm_volume = cfg.bgm;
            if (window._rf_bgmGainNodes && Array.isArray(window._rf_bgmGainNodes)) {
                window._rf_bgmGainNodes.forEach(node => {
                    if (node && node.gain) node.gain.value = cfg.bgm;
                });
            }
            if (window.setMediaVolume) window.setMediaVolume();
        } else {
            console.warn('updateCustomControlsUI: BGM 滑塊不存在或 BGM 值無效');
        }
        
        const seSlider = document.getElementById('se-volume-slider');
        const seValueSpan = seSlider ? seSlider.parentElement.querySelector('.volume-value') : null;
        if (seSlider && typeof cfg.se === 'number') {
            console.log(`更新 SE 滑塊: ${cfg.se}`);
            seSlider.value = cfg.se;
            if (seValueSpan) seValueSpan.textContent = Math.round(cfg.se * 100);
            
            // 實際應用 SE 音量到音頻系統
            window._rf_se_volume = cfg.se;
            if (window._rf_seGainNodes && Array.isArray(window._rf_seGainNodes)) {
                window._rf_seGainNodes.forEach(node => {
                    if (node && node.gain) node.gain.value = cfg.se;
                });
            }
            if (window.setMediaVolume) window.setMediaVolume();
            if (window.updateSe147Volume) window.updateSe147Volume();
        } else {
            console.warn('updateCustomControlsUI: SE 滑塊不存在或 SE 值無效');
        }
        
        // 強制以 window._rf_se147Muted 為唯一依據刷新 UI
        const se147Toggle = document.getElementById('se147-toggle');
        const se147Button = document.getElementById('se147-toggle-button');
        if (se147Toggle && se147Button) {
            const muted = (typeof cfg.se147Muted === 'boolean') ? cfg.se147Muted : !!window._rf_se147Muted;
            console.log(`更新 SE147 切換按鈕: ${muted}`);
            se147Toggle.checked = muted;
            se147Button.textContent = `戰報通知：${!muted ? '開' : '關'}`;
            se147Button.style.backgroundColor = !muted ? '#5cb85c' : '#d9534f';
            window._rf_se147Muted = muted;
            // 實際應用 SE147 靜音狀態
            if (window.updateSe147Volume) window.updateSe147Volume();
        } else {
            console.warn('updateCustomControlsUI: SE147 切換按鈕不存在');
        }
        
        console.log('updateCustomControlsUI: UI 更新完成');
    };
    const bgmSlider = document.getElementById('bgm-volume-slider');
    if (bgmSlider) {
        // 防止連續多次觸發保存
        let bgmSaveTimeout = null;
        let isBgmSliding = false;  // 追蹤是否正在滑動
        
        // 滑動開始時 - 滑鼠和觸控支援
        bgmSlider.addEventListener('mousedown', function() {
            isBgmSliding = true;
            clearTimeout(bgmSaveTimeout);  // 清除先前的保存計時器
        });
        
        bgmSlider.addEventListener('touchstart', function() {
            isBgmSliding = true;
            clearTimeout(bgmSaveTimeout);  // 清除先前的保存計時器
        });
        
        // 滑動過程中更新，但不保存
        bgmSlider.addEventListener('input', function() {
            const value = Number(this.value);
            
            // 立即更新 UI 和播放
            this.parentElement.querySelector('.volume-value').textContent = Math.round(value * 100);
            if (window.setBGMVolume) {
                // 只設置內存中的值，不觸發保存
                window._rf_bgm_volume = value;
                // 確保 _rf_bgmGainNodes 存在且是陣列
                if (window._rf_bgmGainNodes && Array.isArray(window._rf_bgmGainNodes)) {
                    window._rf_bgmGainNodes.forEach(node => {
                        if (node && node.gain) node.gain.value = value;
                    });
                }
                if (window.setMediaVolume) window.setMediaVolume();
            }
            
            // 滑動過程中不保存，只在滑動結束時保存
            clearTimeout(bgmSaveTimeout);
        });
        
        // 滑動結束時 - 滑鼠和觸控支援
        document.addEventListener('mouseup', function() {
            if (isBgmSliding) {
                isBgmSliding = false;
                
                // 滑動結束後執行一次保存
                const value = Number(bgmSlider.value);
                if (window.pywebview && window.pywebview.api && window.pywebview.api.save_config_volume) {
                    getCurrentAccountData().then(targetAccount => {
                        const saveData = {
                            bgm: value,
                            se: null,  // 不傳入則不更新
                            se147Muted: null  // 不傳入則不更新
                        };
                        if (targetAccount) {
                            saveData.target_account = targetAccount;
                        }
                        window.pywebview.api.save_config_volume(saveData).catch(e => { 
                            console.error('音量設定保存失敗', e); 
                        });
                    });
                }
            }
        });
        
        // 觸控結束支援
        document.addEventListener('touchend', function() {
            if (isBgmSliding) {
                isBgmSliding = false;
                
                // 滑動結束後執行一次保存
                const value = Number(bgmSlider.value);
                if (window.pywebview && window.pywebview.api && window.pywebview.api.save_config_volume) {
                    getCurrentAccountData().then(targetAccount => {
                        const saveData = {
                            bgm: value,
                            se: null,  // 不傳入則不更新
                            se147Muted: null  // 不傳入則不更新
                        };
                        if (targetAccount) {
                            saveData.target_account = targetAccount;
                        }
                        window.pywebview.api.save_config_volume(saveData).catch(e => { 
                            console.error('音量設定保存失敗', e); 
                        });
                    });
                }
            }
        });
    }
    
    const seSlider = document.getElementById('se-volume-slider');
    if (seSlider) {
        // 防止連續多次觸發保存
        let seSaveTimeout = null;
        let isSeSliding = false;   // 追蹤是否正在滑動
        
        // 滑動開始時 - 滑鼠和觸控支援
        seSlider.addEventListener('mousedown', function() {
            isSeSliding = true;
            clearTimeout(seSaveTimeout);  // 清除先前的保存計時器
        });
        
        seSlider.addEventListener('touchstart', function() {
            isSeSliding = true;
            clearTimeout(seSaveTimeout);  // 清除先前的保存計時器
        });
        
        // 滑動過程中更新，但不保存
        seSlider.addEventListener('input', function() {
            const value = Number(this.value);
            
            // 立即更新 UI 和播放
            this.parentElement.querySelector('.volume-value').textContent = Math.round(value * 100);
            if (window.setSEVolume) {
                // 只設置內存中的值，不觸發保存
                window._rf_se_volume = value;
                // 確保 _rf_seGainNodes 存在且是陣列
                if (window._rf_seGainNodes && Array.isArray(window._rf_seGainNodes)) {
                    window._rf_seGainNodes.forEach(node => {
                        if (node && node.gain) node.gain.value = value;
                    });
                }
                if (window.setMediaVolume) window.setMediaVolume();
                if (window.updateSe147Volume) window.updateSe147Volume();
            }
            
            // 滑動過程中不保存，只在滑動結束時保存
            clearTimeout(seSaveTimeout);
        });
        
        // 滑動結束時 - 滑鼠和觸控支援
        document.addEventListener('mouseup', function() {
            if (isSeSliding) {
                isSeSliding = false;
                
                // 滑動結束後執行一次保存
                const value = Number(seSlider.value);
                if (window.pywebview && window.pywebview.api && window.pywebview.api.save_config_volume) {
                    getCurrentAccountData().then(targetAccount => {
                        const saveData = {
                            bgm: null,  // 不傳入則不更新
                            se: value,
                            se147Muted: null  // 不傳入則不更新
                        };
                        if (targetAccount) {
                            saveData.target_account = targetAccount;
                        }
                        window.pywebview.api.save_config_volume(saveData).catch(e => { 
                            console.error('音量設定保存失敗', e); 
                        });
                    });
                }
            }
        });
        
        // 觸控結束支援
        document.addEventListener('touchend', function() {
            if (isSeSliding) {
                isSeSliding = false;
                
                // 滑動結束後執行一次保存
                const value = Number(seSlider.value);
                if (window.pywebview && window.pywebview.api && window.pywebview.api.save_config_volume) {
                    getCurrentAccountData().then(targetAccount => {
                        const saveData = {
                            bgm: null,  // 不傳入則不更新
                            se: value,
                            se147Muted: null  // 不傳入則不更新
                        };
                        if (targetAccount) {
                            saveData.target_account = targetAccount;
                        }
                        window.pywebview.api.save_config_volume(saveData).catch(e => { 
                            console.error('音量設定保存失敗', e); 
                        });
                    });
                }
            }
        });
    }
    const se147Button = document.getElementById('se147-toggle-button');
    const se147Toggle = document.getElementById('se147-toggle');
    if (se147Button && se147Toggle) {
        // 使用一個變量跟踪操作狀態，避免重複操作
        let isWriting = false;
        
        // 更新按鈕UI的輔助函數，確保視覺呈現與狀態一致
        const updateSe147ButtonUI = (muted) => {
            se147Toggle.checked = muted;
            se147Button.textContent = `戰報通知：${!muted ? '開' : '關'}`;
            se147Button.style.backgroundColor = !muted ? '#5cb85c' : '#d9534f';
        };
        
        se147Button.addEventListener('click', async function() {
            if (isWriting) return;
            isWriting = true;
            se147Button.disabled = true;
            try {
                // 取反當前 window._rf_se147Muted 狀態
                const newMuted = !window._rf_se147Muted;
                // 立即更新 UI，提供即時反饋
                updateSe147ButtonUI(newMuted);
                window._rf_se147Muted = newMuted;
                if (window.setMediaVolume) window.setMediaVolume();
                if (window.updateSe147Volume) window.updateSe147Volume();
                // 保存設置
                if (window.pywebview && window.pywebview.api && window.pywebview.api.save_config_volume) {
                    const targetAccount = await getCurrentAccountData();
                    const saveData = {
                        bgm: null,
                        se: null,
                        se147Muted: newMuted
                    };
                    if (targetAccount) {
                        saveData.target_account = targetAccount;
                    }
                    await window.pywebview.api.save_config_volume(saveData);
                }
            } catch (e) {
                console.error('戰報通知設定失敗', e);
            } finally {
                // 無論成功或失敗都強制同步一次狀態
                if (window.pywebview && window.pywebview.api && window.pywebview.api.get_config_volume) {
                    try {
                        const targetAccount = await getCurrentAccountData();
                        const cfg = await window.pywebview.api.get_config_volume(targetAccount);
                        window.updateCustomControlsUI(cfg);
                    } catch (e) {
                        // 忽略同步失敗
                    }
                }
                se147Button.disabled = false;
                isWriting = false;
            }
        });
    }
    let hasSynced = false;
    
    // 創建一個全局可調用的音量同步函數
    window.syncAudioControlsWithConfig = async function(targetAccount = null) {
        if (!window.pywebview || !window.pywebview.api || !window.pywebview.api.get_config_volume) {
            console.log('API 尚未準備好，跳過音量同步');
            return;
        }
        
        try {
            console.log('開始音量同步...');
            
            // 如果沒有提供目標帳號，則獲取當前帳號
            if (!targetAccount) {
                targetAccount = await getCurrentAccountData();
            }
            
            console.log('使用帳號資料:', targetAccount);
            const cfg = await window.pywebview.api.get_config_volume(targetAccount);
            console.log('獲取音量設定:', cfg);
            
            // 使用 globalAudioControl.js 提供的統一音頻配置應用函數
            if (window.applyAudioConfig) {
                window.applyAudioConfig(cfg);
            } else {
                // 備用方案：手動設置
                if (typeof cfg.bgm === 'number') {
                    window._rf_bgm_volume = cfg.bgm;
                    if (window._rf_bgmGainNodes && Array.isArray(window._rf_bgmGainNodes)) {
                        window._rf_bgmGainNodes.forEach(node => {
                            if (node && node.gain) node.gain.value = cfg.bgm;
                        });
                    }
                }
                
                if (typeof cfg.se === 'number') {
                    window._rf_se_volume = cfg.se;
                    if (window._rf_seGainNodes && Array.isArray(window._rf_seGainNodes)) {
                        window._rf_seGainNodes.forEach(node => {
                            if (node && node.gain) node.gain.value = cfg.se;
                        });
                    }
                }
                
                if (typeof cfg.se147Muted === 'boolean') {
                    window._rf_se147Muted = cfg.se147Muted;
                }
                
                // 應用音量設定到音頻系統
                if (window.setMediaVolume) window.setMediaVolume();
                if (window.updateSe147Volume) window.updateSe147Volume();
            }
            
            // 更新UI顯示
            if (window.updateCustomControlsUI) {
                window.updateCustomControlsUI(cfg);
            }
            
            console.log('音量同步完成');
        } catch (e) {
            console.error('音量同步失敗:', e);
        }
    };
    
    const initialSync = () => {
        if (hasSynced) return;
        
        // 檢查必要的元素和 API 是否就緒
        const bgmSlider = document.getElementById('bgm-volume-slider');
        const seSlider = document.getElementById('se-volume-slider');
        
        if (!bgmSlider || !seSlider) {
            setTimeout(initialSync, 100);
            return;
        }
        
        if (window.pywebview && window.pywebview.api && window.pywebview.api.get_config_volume) {
            hasSynced = true;
            
            // 使用新的全局同步函數
            window.syncAudioControlsWithConfig();
        } else {
            setTimeout(initialSync, 250);
        }
    };
    
    // 監聽多個事件以確保初始化
    window.addEventListener('pywebviewready', initialSync);
    document.addEventListener('DOMContentLoaded', initialSync);
    
    // 額外的延遲初始化，確保在帳號管理器載入後也能同步
    setTimeout(() => {
        if (!hasSynced) {
            initialSync();
        }
    }, 1000);
}