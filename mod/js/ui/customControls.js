import { setupPanelDrag } from './panelDrag.js';
import { loadExitPromptsAndShow } from './exitConfirm.js';
import { setupFactionMapControl } from '../map/factionMapControl.js';
import { setupAudioControls } from '../audio/audioControls.js';
import { setupRankingPanelDrag } from './rankingPanelDrag.js';
import { getFactionColor, getAllFactions } from '../map/factionColorMap.js';

function getDomOrWarn(id, warnMsg) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn(warnMsg || `找不到 DOM 元素：${id}`);
    }
    return el;
}

// 獲取當前選中的帳號（用於多實例隔離）
function getCurrentSelectedAccount() {
    const accountSelect = document.getElementById('account-select');
    if (!accountSelect || accountSelect.selectedIndex < 0) {
        return null;
    }
    return {
        accountIdx: accountSelect.selectedIndex,
        account: accountSelect.options[accountSelect.selectedIndex].text
    };
}

// 獲取完整的帳號資訊（包含密碼）
async function getCurrentAccountData() {
    const selected = getCurrentSelectedAccount();
    if (!selected) return null;
    try {
        const accounts = await window.pywebview.api.get_accounts();
        if (accounts && accounts.length > 0) {
            // 僅用帳號名稱（必要時可加密碼）比對
            let acc = accounts.find(a => a.account === selected.account);
            return acc || accounts[0];
        }
    } catch (e) {
        console.error('獲取帳號列表失敗:', e);
    }
    return null;
}

function createFactionFilterDropdown(controlsPanel) {
    if (document.getElementById('rf-faction-filter')) return;
    const container = document.createElement('div');
    container.style.marginBottom = '12px';
    const label = document.createElement('label');
    label.textContent = '戰報通知過濾：';
    label.style.marginRight = '8px';
    label.htmlFor = 'rf-faction-filter';
    const select = document.createElement('select');
    select.id = 'rf-faction-filter';
    select.style.padding = '2px 8px';
    select.style.borderRadius = '6px';
    select.style.fontSize = '0.95em';
    select.style.background = '#222';
    select.style.color = '#fff';
    select.style.border = '1px solid #555';
    select.style.marginLeft = '2px';
    const factions = getAllFactions().map(f => f.name);
    const options = ['全部', ...factions.filter(f => f !== '新中國狂歡')];
    for (const name of options) {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    }
    container.appendChild(label);
    container.appendChild(select);
    controlsPanel.appendChild(container);

    // 初始化選項，支援 pywebview 及網頁版
    async function syncFactionFilterFromConfig(retry = 0) {
        if (window.pywebview && window.pywebview.api && window.pywebview.api.get_report_faction_filter) {
            try {
                // 獲取當前帳號資訊用於多實例隔離
                const targetAccount = await getCurrentAccountData();
                if (!targetAccount && retry < 2) {
                    // 若帳號還沒切好，延遲再試一次，最多 retry 2 次
                    setTimeout(() => syncFactionFilterFromConfig(retry + 1), 200);
                    return;
                }
                const val = await window.pywebview.api.get_report_faction_filter(targetAccount);
                // 強制同步 select.value
                if (val && options.includes(val)) {
                    select.value = val;
                } else {
                    select.value = '全部';
                }
                // 除錯用：印出帳號與 select.value
                console.log('[帳號切換] 當前帳號:', targetAccount, '戰報通知過濾:', select.value);
                if (window.updateFactionFilter) window.updateFactionFilter(select.value);
            } catch (e) {
                console.error('獲取戰報篩選設定失敗:', e);
                select.value = '全部';
                if (window.updateFactionFilter) window.updateFactionFilter('全部');
            }
        } else {
            // 網頁版：預設為全部
            select.value = '全部';
            if (window.updateFactionFilter) window.updateFactionFilter('全部');
        }
    }
    // 掛到 window 讓外部可呼叫
    window.syncFactionFilterFromConfig = syncFactionFilterFromConfig;
    window.addEventListener('pywebviewready', syncFactionFilterFromConfig);
    document.addEventListener('DOMContentLoaded', syncFactionFilterFromConfig);

    // 監聽帳號選擇變更，重新同步戰報篩選設定
    function setupAccountChangeListener() {
        const accountSelect = document.getElementById('account-select');
        if (accountSelect) {
            accountSelect.addEventListener('change', () => {
                // 延遲一點以確保帳號變更完成
                setTimeout(syncFactionFilterFromConfig, 100);
            });
        } else {
            // 如果帳號選擇框還沒出現，稍後再試
            setTimeout(setupAccountChangeListener, 1000);
        }
    }
    setupAccountChangeListener();

    // 監聽變更
    select.addEventListener('change', async function() {
        if (window.pywebview && window.pywebview.api && window.pywebview.api.save_report_faction_filter) {
            try {
                // 獲取當前帳號資訊用於多實例隔離
                const targetAccount = await getCurrentAccountData();
                await window.pywebview.api.save_report_faction_filter(this.value, targetAccount);
            } catch (e) {
                console.error('保存戰報篩選設定失敗:', e);
            }
        }
        if (window.updateFactionFilter) window.updateFactionFilter(this.value);
    });
}

// 保留一些通用樣式以支援對話框功能
function addDialogStyles() {
    const styleId = 'rf-dialog-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .rf-download-status {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.9);
            padding: 15px;
            border-radius: 8px;
            z-index: 10000;
            color: white;
            min-width: 300px;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.7);
            border: 1px solid #555;
        }
        .rf-download-status h3 {
            margin-top: 0;
            padding-bottom: 10px;
            border-bottom: 1px solid #444;
        }
        .rf-download-status-close {
            position: absolute;
            top: 10px;
            right: 10px;
            cursor: pointer;
            font-size: 16px;
        }
        .rf-progress-bar {
            height: 10px;
            background-color: #333;
            border-radius: 5px;
            margin: 10px 0;
            overflow: hidden;
        }
        .rf-progress-bar-fill {
            height: 100%;
            background-color: #4CAF50;
            transition: width 0.3s;
        }
        .rf-download-stats {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
        }
        .rf-download-stat {
            text-align: center;
            padding: 5px;
            flex-grow: 1;
        }
    `;
    document.head.appendChild(style);
}

// 切換全屏模式
function toggleFullscreen() {
    if (window.pywebview?.api) {
        const isCurrentlyFullScreen = document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement;
        const targetMode = isCurrentlyFullScreen ? 'normal' : 'fullscreen';
        if (window.pywebview.api.set_window_mode) {
            window.pywebview.api.set_window_mode(targetMode);
        }
        window.pywebview.api.toggle_fullscreen();
        console.log('[控制面板] 切換全屏模式，預期狀態:', targetMode);
    }
}

// 下載狀態已整合到控制面板中，不再需要獨立的對話框
// 此函數保留為兼容性考慮，但不再創建獨立對話框
function showDownloadStatus() {
    // 只需切換控制面板的可見性
    const controlsPanel = document.getElementById('rf-controls-panel');
    if (controlsPanel) {
        controlsPanel.style.transform = 'translateX(0)';
    }
}

// 顯示音量設定
function showVolumeSettings() {
    if (window.pywebview?.api) {
        // 獲取當前音量設定
        window.pywebview.api.get_config_volume().then(volume => {
            // 創建對話框
            const dialog = document.createElement('div');
            dialog.className = 'rf-download-status'; // 重用樣式
            
            dialog.innerHTML = `
                <div class="rf-download-status-close" onclick="this.parentNode.remove()">✕</div>
                <h3>音量設定</h3>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">背景音樂音量</label>
                    <input type="range" id="bgm-volume" min="0" max="1" step="0.01" value="${volume.bgm}" style="width: 100%;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">音效音量</label>
                    <input type="range" id="se-volume" min="0" max="1" step="0.01" value="${volume.se}" style="width: 100%;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: flex; align-items: center;">
                        <input type="checkbox" id="se147-muted" ${volume.se147Muted ? 'checked' : ''}>
                        <span style="margin-left: 5px;">靜音147號音效 (炒股音效)</span>
                    </label>
                </div>
                <div style="text-align: center; margin-top: 15px;">
                    <button id="save-volume" style="padding: 5px 15px;">保存</button>
                    <button onclick="this.parentNode.parentNode.remove()" style="padding: 5px 15px; margin-left: 10px;">取消</button>
                </div>
            `;
            
            document.body.appendChild(dialog);
            
            // 添加保存按鈕事件
            document.getElementById('save-volume').addEventListener('click', function() {
                const newVolume = {
                    bgm: parseFloat(document.getElementById('bgm-volume').value),
                    se: parseFloat(document.getElementById('se-volume').value),
                    se147Muted: document.getElementById('se147-muted').checked
                };
                
                window.pywebview.api.save_config_volume(newVolume).then(() => {
                    dialog.remove();
                    
                    // 如果有 AudioManager，立即應用設定
                    if (window.AudioManager) {
                        window.AudioManager.setVolume(newVolume.bgm, newVolume.se);
                        window.AudioManager.setSE147Muted(newVolume.se147Muted);
                    }
                });
            });
        });
    }
}

// 關於頁面已移除

// 退出應用
function exitApp() {
    if (window.pywebview?.api) {
        if (confirm('確定要退出應用嗎？')) {
            window.pywebview.api.exit_app();
        }
    } else {
        loadExitPromptsAndShow();
    }
}

export function setupCustomControls() {
    // 快取常用節點
    const controlsPanel = getDomOrWarn('custom-controls', 'custom-controls 不存在，無法掛載控制面板事件');
    const controlsToggle = getDomOrWarn('custom-controls-toggle', 'custom-controls-toggle 不存在，無法掛載控制面板事件');
    if (!controlsPanel || !controlsToggle) return;

    // 控制面板拖拉與展開收合
    setupPanelDrag(controlsPanel, controlsToggle);
    
    // 添加ESC浮動提示 (顯示5秒後淡出)
    const floatingEscHint = document.createElement('div');
    floatingEscHint.textContent = '按 ESC 打開控制面板';
    floatingEscHint.style.position = 'fixed';
    floatingEscHint.style.bottom = '10px';
    floatingEscHint.style.right = '10px';
    floatingEscHint.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    floatingEscHint.style.color = 'white';
    floatingEscHint.style.padding = '5px 10px';
    floatingEscHint.style.borderRadius = '4px';
    floatingEscHint.style.fontSize = '12px';
    floatingEscHint.style.zIndex = '9990';
    floatingEscHint.style.opacity = '0.7';
    floatingEscHint.style.transition = 'opacity 1s';
    document.body.appendChild(floatingEscHint);
    
    // 5 秒後淡出提示
    setTimeout(() => {
        floatingEscHint.style.opacity = '0';
        setTimeout(() => floatingEscHint.remove(), 1000);
    }, 5000);

    // 退出遊戲按鈕
    const exitBtn = getDomOrWarn('exit-app');
    if (exitBtn) exitBtn.onclick = loadExitPromptsAndShow;

    // 勢力分布圖開關
    const factionMapBtn = document.getElementById('toggle-faction-map');
    const factionMapContainer = document.getElementById('faction-map-canvas-container');
    if (factionMapBtn && factionMapContainer) {
        setupFactionMapControl(factionMapBtn, factionMapContainer);
    }

    // 音量與通知控制
    setupAudioControls(controlsPanel);
    
    // 戰報通知過濾下拉選單
    createFactionFilterDropdown(controlsPanel);
    
        // 添加下載狀態區域（替代按鈕和右下角浮動提示）
    if (controlsPanel && !document.getElementById('rf-download-status-area')) {
        // 創建下載狀態區域
        const downloadArea = document.createElement('div');
        downloadArea.id = 'rf-download-status-area';
        downloadArea.style.width = '100%';
        downloadArea.style.padding = '10px';
        downloadArea.style.marginBottom = '10px';
        downloadArea.style.background = 'rgba(52, 152, 219, 0.2)';
        downloadArea.style.borderRadius = '6px';
        downloadArea.style.border = '1px solid rgba(52, 152, 219, 0.5)';
        
        // 初始內容 - 簡化版下載狀態顯示 (移除進度條，純數字顯示)
        downloadArea.innerHTML = `
            <div style="display:flex;align-items:center;">
                <div id="control-download-spinner" style="margin-right:10px;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-radius:50%;border-top-color:#fff;animation:spin 1s linear infinite;"></div>
                <div id="control-download-status-text" style="font-size:0.95em;flex-grow:1;font-weight:500;">準備就緒</div>
                <div id="control-download-progress-text" style="font-size:0.9em;color:white;margin-left:8px;min-width:40px;text-align:right;">0%</div>
            </div>
            <div id="control-download-details" style="display:flex;justify-content:space-between;margin-top:10px;font-size:0.85em;color:#bbb;">
                <div style="display:flex;gap:10px;">
                    <span id="control-download-queue" style="white-space:nowrap;">隊列: 0</span>
                    <span id="control-download-active" style="white-space:nowrap;">並行: 0</span>
                </div>
                <div>
                    <span id="control-download-completed" style="white-space:nowrap;">已完成: 0</span>
                </div>
            </div>
        `;        controlsPanel.appendChild(downloadArea);
        
        // 使用變數追蹤上一次的狀態，以便偵測變化
        const lastStatus = {
            queueLength: 0,
            activeDownloads: 0,
            downloadedCount: 0,
            isDownloading: false
        };
        
        // 設置定期更新下載狀態（優化版）
        function updateControlPanelDownloadStatus() {
            if (!window.pywebview?.api) return;
            
            // 使用 Promise 以提高可靠性
            Promise.resolve()
                .then(() => window.pywebview.api.get_resource_download_status())
                .then(status => {
                    const statusArea = document.getElementById('rf-download-status-area');
                    const statusText = document.getElementById('control-download-status-text');
                    const progressText = document.getElementById('control-download-progress-text');
                    const queueText = document.getElementById('control-download-queue');
                    const activeText = document.getElementById('control-download-active');
                    const completedText = document.getElementById('control-download-completed');
                    const spinner = document.getElementById('control-download-spinner');
                    
                    if (!statusArea || !statusText) return;
                    
                    // 從後端取得資料並確保值合法
                    const queueLength = typeof status.queueLength === 'number' ? status.queueLength : 0;
                    const activeDownloads = typeof status.activeDownloads === 'number' ? status.activeDownloads : 0;
                    const maxWorkers = typeof status.maxWorkers === 'number' ? status.maxWorkers : 0;
                    const downloadedCount = typeof status.downloadedCount === 'number' ? status.downloadedCount : 0;
                    const isDownloading = Boolean(status.isDownloading);
                    
                    // 判斷是否有變化需要更新 UI
                    const hasStatusChanged = 
                        queueLength !== lastStatus.queueLength || 
                        activeDownloads !== lastStatus.activeDownloads || 
                        downloadedCount !== lastStatus.downloadedCount || 
                        isDownloading !== lastStatus.isDownloading;
                    
                    // 只有在狀態變化時才更新 UI，減少不必要的 DOM 操作
                    if (hasStatusChanged) {
                        // 更新追蹤狀態
                        Object.assign(lastStatus, {
                            queueLength,
                            activeDownloads,
                            downloadedCount,
                            isDownloading
                        });
                        
                        // 計算進度
                        const total = queueLength + downloadedCount;
                        const progress = total > 0 ? Math.floor((downloadedCount / total) * 100) : 100;
                        
                        // 更新進度文字
                        progressText.textContent = `${progress}%`;
                        
                        // 根據下載狀態更新顯示
                        if (isDownloading && (queueLength > 0 || activeDownloads > 0)) {
                            // 顯示下載中狀態
                            statusText.textContent = `下載資源中`;
                            spinner.style.display = 'block';
                        } else if (downloadedCount > 0) {
                            // 下載已完成
                            statusText.textContent = `已完成`;
                            spinner.style.display = 'none';
                            progressText.textContent = '100%';
                        } else {
                            // 無下載
                            statusText.textContent = `準備就緒`;
                            spinner.style.display = 'none';
                            progressText.textContent = '0%';
                        }
                        
                        // 更新詳細資訊，增加空格並格式化數字
                        if (total > 0) {
                            queueText.textContent = `隊列: ${queueLength}`;
                            activeText.textContent = `並行: ${activeDownloads}`;
                            completedText.textContent = `已完成: ${downloadedCount}`;
                        } else {
                            queueText.textContent = `隊列: 0`;
                            activeText.textContent = `並行: 0`;
                            completedText.textContent = `已完成: 0`;
                        }
                    }
                })
                .catch(err => {
                    console.error("獲取下載狀態失敗", err);
                });
        }
        
        // 立即執行第一次更新
        updateControlPanelDownloadStatus();
        
        // 使用更高頻率的更新間隔，確保動態更新更流暢
        // 在網頁可見性變化時調整更新頻率
        let updateIntervalId = setInterval(updateControlPanelDownloadStatus, 150);
        
        // 當頁面隱藏時減少更新頻率，可見時恢復
        document.addEventListener('visibilitychange', () => {
            clearInterval(updateIntervalId);
            updateIntervalId = setInterval(
                updateControlPanelDownloadStatus, 
                document.hidden ? 500 : 150
            );
        });
    }
    
    // 關於按鈕已移除
    
    // 添加ESC鍵提示
    if (controlsPanel && !document.getElementById('rf-esc-hint')) {
        const escHint = document.createElement('div');
        escHint.id = 'rf-esc-hint';
        escHint.textContent = '按 ESC 打開/關閉控制面板';
        escHint.style.fontSize = '0.8em';
        escHint.style.color = '#aaa';
        escHint.style.textAlign = 'center';
        escHint.style.marginTop = '10px';
        controlsPanel.appendChild(escHint);
    }
    
    // 確保對話框樣式已添加
    addDialogStyles();
}

export { setupRankingPanelDrag };