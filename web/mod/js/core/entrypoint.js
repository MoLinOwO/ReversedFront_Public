// 入口腳本
// Tauri API 工具函數
const invoke = () => window.__TAURI__?.core?.invoke;
const toggleControlPanel = () => {
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
};
// 導入鍵盤初始化腳本與視窗管理器
import { initKeyboardControls } from '../ui/keyboardInit.js';
import { initWindowManager, toggleFullscreen } from '../ui/windowManager.js';
import { setupLoginInterceptor, renderAccountManager, autofillActiveAccount } from '../account/accountManager.js';
import { setupCustomControls, setupRankingPanelDrag } from '../ui/customControls.js';
import { setupRankingModalEvents, updateRanking } from '../ui/rankingModal.js';
import '../audio/globalAudioControl.js';
import { setupMarkerInteractionOptimized } from '../map/markerInteraction.js';
import { initializeMessageObserver } from '../ui/notificationBox.js';
import { saveMarkerDataToYaml } from '../map/markerData.js';
import { initUpdatePrompt } from '../ui/updatePrompt.js';

// 立即初始化視窗管理器（優先於其他模塊）
if (typeof initWindowManager === 'function') {
    console.log('entrypoint.js: 立即初始化視窗管理器');
    try {
        initWindowManager();
        console.log('entrypoint.js: 視窗管理器初始化成功');
    } catch (e) {
        console.error('entrypoint.js: 視窗管理器初始化失敗', e);
    }
}

// 確保鍵盤控制被初始化 (延遲執行，確保優先級較低)
setTimeout(() => {
    if (typeof initKeyboardControls === 'function') {
        console.log('entrypoint.js: 延遲初始化鍵盤控制');
        initKeyboardControls();
    }
    // 初始化更新提示
    if (typeof initUpdatePrompt === 'function') {
        initUpdatePrompt();
    }
}, 500);

// 動態插入功能選單相關 DOM 結構
function insertCustomControlsDOM() {
    if (document.getElementById('custom-controls-toggle')) return; // 已插入則跳過
    const main = document.querySelector('main') || document.body;
    // 判斷是否 pywebview 或 Tauri（延遲檢查以確保 Qt WebChannel 已注入）
    const isDesktop = !!window.__TAURI__ || (window.__TAURI__ && !!window.__TAURI__.core);
    console.log('insertCustomControlsDOM: isDesktop =', isDesktop, 'window.__TAURI__ =', !!window.__TAURI__, 'Tauri =', !!(window.__TAURI__ && window.__TAURI__.core));
    // 懸浮按鈕位置：桌面版中央，網頁版左上
    const toggleBtnStyle = isDesktop
        ? 'position:fixed;top:20%;left:50%;' // 不加 transform
        : 'position:fixed;top:16px;left:16px;';
    main.insertAdjacentHTML('beforeend', `
    <div id="custom-controls-toggle" aria-label="展開功能選單" style="${toggleBtnStyle}z-index:10000;background:#222c;backdrop-filter:blur(2px);border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 12px #000a;">
        <img src="./static/media/logo_monthlycard.fc4baca34b9e97ab8974.png" alt="功能選單" style="width:32px;height:32px;object-fit:contain;"/>
    </div>
    <div id="custom-controls" style="position:fixed;z-index:9999;background:rgba(34,34,34,0.82);backdrop-filter:blur(4px);border-radius:10px;padding:20px 18px 16px 18px;box-shadow:0 2px 12px #000a;color:#fff;min-width:220px;max-width:420px;font-family:sans-serif;display:none;transition:transform 0.2s cubic-bezier(.4,2,.6,1);max-height:88vh;overflow:auto;">
        <div style="margin-bottom:12px;font-size:1.1em;font-weight:bold;letter-spacing:1px;">功能選單</div>
        <button id="show-portalmap-ranking" aria-label="顯示陣營據點排行榜" style="width:100%;margin-bottom:10px;background:#2a7cff;color:#fff;border:none;padding:8px 0;border-radius:6px;cursor:pointer;">陣營據點排行榜</button>
        <button id="toggle-faction-map" aria-label="顯示勢力分布圖" style="width:100%;margin-bottom:10px;background:#1dbf60;color:#fff;border:none;padding:8px 0;border-radius:6px;cursor:pointer;">顯示勢力分布圖</button>
        <div id="account-section"></div>
        <div id="account-status" style="margin-top:6px;font-size:0.92em;color:#7fffd4;"></div>
        <!-- 音量控制、戰報過濾、下載狀態將由 setupCustomControls 動態添加 -->
        <!-- ESC 提示將由 setupCustomControls 動態添加 -->
        <!-- 桌面專屬按鈕（退出、全螢幕）容器將由 setupCustomControls 創建並在最後添加 -->
    </div>
    <div id="ranking-modal" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:12000;background:none;align-items:center;justify-content:center;pointer-events:auto;overflow:hidden;">
      <div id="ranking-panel" style="background:rgba(30,34,44,0.92);padding:3vw 2vw 2vw 2vw;border-radius:22px;min-width:320px;max-width:96vw;width:min(540px,92vw);max-height:88vh;overflow:auto;box-shadow:0 4px 32px #0008;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;backdrop-filter:blur(6px);pointer-events:auto;cursor:move;">
        <button id="close-ranking-modal" aria-label="關閉排行榜" style="position:absolute;top:14px;right:18px;background:rgba(60,60,60,0.7);color:#fff;border:none;border-radius:50%;width:36px;height:36px;font-size:1.3em;cursor:pointer;z-index:1;box-shadow:0 2px 8px #000a;">×</button>
        <div id="ranking-content" style="margin-top:8px;width:100%;max-height:70vh;overflow:auto;"></div>
      </div>
    </div>
    <div id="faction-map-canvas-container" style="position:absolute;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:1000;display:none;">
        <canvas id="faction-map-canvas" width="1920" height="1080" style="width:100vw;height:100vh;"></canvas>
    </div>
    `);

    // 展開 custom-controls 時自動定位在 toggleBtn 旁邊
    const controls = document.getElementById('custom-controls');
    const toggleBtn = document.getElementById('custom-controls-toggle');
    function showCustomControls() {
        if (!controls || !toggleBtn) return;
        // 先顯示，等內容渲染後再定位（兩次 rAF 保證內容載入）
        controls.style.display = '';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const btnRect = toggleBtn.getBoundingClientRect();
                // 固定 panelWidth，桌面 320px，手機 96vw
                let panelWidth = window.innerWidth <= 600 ? Math.floor(window.innerWidth * 0.96) : 320;
                panelWidth = Math.max(220, Math.min(420, panelWidth));
                controls.style.width = panelWidth + 'px';
                controls.style.maxWidth = '420px';
                controls.style.minWidth = '220px';
                // 動態定位：預設在圓點右側，若超出則往左，但panelWidth不變
                let left = btnRect.left + btnRect.width + 12;
                if (left + panelWidth > window.innerWidth) {
                    left = btnRect.left - panelWidth - 12;
                }
                // 若還是超出，直接貼齊螢幕邊緣
                left = Math.max(0, Math.min(window.innerWidth - panelWidth, left));
                let top = btnRect.top;
                // 若下方空間不足，往上移
                const panelHeight = Math.min(controls.offsetHeight || 480, window.innerHeight * 0.88);
                if (top + panelHeight > window.innerHeight) {
                    top = window.innerHeight - panelHeight - 12;
                }
                top = Math.max(0, top);
                controls.style.left = left + 'px';
                controls.style.top = top + 'px';
                controls.style.right = '';
                controls.style.borderRadius = window.innerWidth <= 600 ? '12px' : '10px';
            });
        });
    }
    function hideCustomControls() {
        if (controls) controls.style.display = 'none';
    }
    if (toggleBtn && controls) {
        toggleBtn.addEventListener('click', function() {
            if (controls.style.display === '' || controls.style.display === 'block') {
                hideCustomControls();
            } else {
                showCustomControls();
            }
        });
    }
    // 點擊外部自動關閉
    document.addEventListener('mousedown', function(e) {
        if (controls && controls.style.display !== 'none' && !controls.contains(e.target) && e.target !== toggleBtn) {
            hideCustomControls();
        }
    });

    // 重構：功能選單縮放與定位，桌面固定寬度，手機自適應
    function scaleCustomControls() {
        const controls = document.getElementById('custom-controls');
        if (!controls) return;
        if (window.innerWidth <= 600) {
            // 手機：寬度自適應，左右 2vw，圓角大
            controls.style.width = '96vw';
            controls.style.maxWidth = '96vw';
            controls.style.minWidth = '0';
            controls.style.left = '2vw';
            controls.style.right = '2vw';
            controls.style.top = '12vw';
            controls.style.borderRadius = '12px';
            controls.style.transform = 'none';
        } else {
            // 桌面：固定寬度，右上角，圓角小
            controls.style.width = '320px';
            controls.style.maxWidth = '420px';
            controls.style.minWidth = '220px';
            controls.style.left = '';
            controls.style.right = '20px';
            controls.style.top = '20px';
            controls.style.borderRadius = '10px';
            controls.style.transform = 'none';
        }
    }
    window.addEventListener('resize', scaleCustomControls);
    scaleCustomControls();
}

// 延遲調用 insertCustomControlsDOM，等待 Qt WebChannel 初始化
// 但要足夠早，讓後續代碼能找到這些 DOM 元素
let customControlsInserted = false;

// DOMContentLoaded 時插入 DOM
document.addEventListener('DOMContentLoaded', () => {
    if (!customControlsInserted) {
        console.log('DOMContentLoaded: 調用 insertCustomControlsDOM');
        insertCustomControlsDOM();
        customControlsInserted = true;
    }
});

// 如果 DOMContentLoaded 已經觸發，立即執行
if (document.readyState === 'loading') {
    // 還在加載中，上面的事件監聽會處理
} else {
    // 已經加載完成，立即執行
    console.log('Document already loaded: 調用 insertCustomControlsDOM');
    insertCustomControlsDOM();
    customControlsInserted = true;
}

// GPU 驗證：啟動時印出 WebGL 渲染器資訊
console.log((() => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'WebGL not supported';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    return debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : 'No debug info';
  } catch (e) {
    return 'Error: ' + e;
  }
})());

// 防止重複初始化
let markerInteractionInitialized = false;

// 封裝 pywebview 相關的初始化邏輯
let pywebviewFeaturesInitialized = false;
async function initPywebviewFeatures() {
    if (pywebviewFeaturesInitialized) return;
    pywebviewFeaturesInitialized = true;

    // 確保基礎 DOM 已插入
    if (!document.getElementById('custom-controls')) {
        insertCustomControlsDOM();
    }

    // 帳號管理（僅桌面版顯示）
    const accountSection = document.getElementById('account-section');
    if (accountSection) {
        await renderAccountManager(accountSection, autofillActiveAccount);
        autofillActiveAccount();
        
        // 啟動登入攔截器
        setupLoginInterceptor(accountSection, autofillActiveAccount);
        
        // 在帳號管理器渲染完成後，觸發音量控制同步
        setTimeout(() => {
            if (window.syncAudioControlsWithConfig) {
                window.syncAudioControlsWithConfig();
            }
        }, 500);
    }

    // 添加桌面專屬按鈕到最後的容器中
    // 確保 setupCustomControls 已經執行過，容器應該已存在
    // 如果不存在，嘗試手動創建或等待
    let desktopBtnsContainer = document.getElementById('desktop-buttons-container');
    if (!desktopBtnsContainer) {
        // 嘗試再次執行 setupCustomControls
        setupCustomControls();
        desktopBtnsContainer = document.getElementById('desktop-buttons-container');
    }

    if (desktopBtnsContainer && !document.getElementById('exit-app')) {
        desktopBtnsContainer.innerHTML = `
            <button id="exit-app" aria-label="退出遊戲" style="width:100%;margin-bottom:10px;background:#d9534f;color:#fff;border:none;padding:8px 0;border-radius:6px;cursor:pointer;margin-top:10px;">退出遊戲</button>
            <button id="toggle-fullscreen" aria-label="切換全螢幕/視窗" style="width:100%;margin-bottom:0;background:#333c;color:#fff;border:none;padding:8px 0;border-radius:6px;cursor:pointer;">切換全螢幕/視窗</button>
        `;
        
        // 綁定事件
        const exitBtn = document.getElementById('exit-app');
        if (exitBtn) {
            exitBtn.onclick = function() {
                if (!window.__TAURI__.core.exit_app) {
                    window.__TAURI__.core.invoke('exit_app');
                }
            };
        }
        const fsBtn = document.getElementById('toggle-fullscreen');
        if (fsBtn) {
            fsBtn.onclick = function() {
                if (!window.__TAURI__.core.toggle_fullscreen) {
                    window.__TAURI__.core.invoke('toggle_fullscreen');
                }
            };
        }
    }
}

// Tauri 環境下直接初始化
if (window.__TAURI__) {
    document.addEventListener('DOMContentLoaded', async () => {
        await initPywebviewFeatures();
    });
}

// Tauri 環境檢查
if (window.__TAURI__ && document.readyState !== 'loading') {
    initPywebviewFeatures();
}

// 通用初始化（不依賴 pywebview）
document.addEventListener('DOMContentLoaded', async () => {
    // ... existing code ...
    if (!customControlsInserted) {
        insertCustomControlsDOM();
        customControlsInserted = true;
    }
    
    setupRankingModalEvents();
    setupCustomControls();
    setupRankingPanelDrag();
    
    try {
        await initializeMessageObserver(); // 初始化訊息觀察者
        if (!markerInteractionInitialized) {
            setupMarkerInteractionOptimized();
            markerInteractionInitialized = true;
        }
        
        // 初始化鍵盤事件處理 - 只處理 F11 鍵，讓 ESC 由 keyboard_handler 處理
        document.addEventListener('keydown', function(event) {
            // 僅處理 F11 鍵 - 切換全屏
            if (event.key === 'F11' || event.keyCode === 122) {
                console.log('entrypoint.js 捕獲F11按鍵，觸發全屏切換');
                if (!window.__TAURI__ && window.__TAURI__?.core) {
                    window.__TAURI__.core.invoke('toggle_fullscreen');
                    event.preventDefault();
                    return false;
                }
            }
            
            // 注意：不再在此處理 ESC 鍵，避免重複觸發
        }, true);
        
        // 額外的音量控制同步檢查
        // 延遲執行以確保所有模組都已載入
        setTimeout(() => {
            if (!window.__TAURI__ && window.syncAudioControlsWithConfig) {
                console.log('DOMContentLoaded: 觸發額外的音量控制同步檢查');
                window.syncAudioControlsWithConfig();
            }
        }, 2000);
    } catch(e) {}
});
// 只偵測地圖 DOM 是否有變化，必要時才重新綁定 marker 互動
let lastMarkerCount = 0;
setInterval(() => {
    try {
        const markers = document.querySelectorAll('[class^="PortalMap_marker"], [class^="PortalMap_markerCapital"]');
        if (markers.length !== lastMarkerCount) {
            setupMarkerInteractionOptimized();
            lastMarkerCount = markers.length;
        }
    } catch(e) {}
}, 1000);

window.saveMarkerDataToYaml = saveMarkerDataToYaml;

// 修正拖移時滑鼠即為中心點
const toggleBtn = document.getElementById('custom-controls-toggle');
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
toggleBtn.addEventListener('mousedown', function(e) {
    isDragging = true;
    // 以滑鼠點擊位置為左上角
    dragOffsetX = e.offsetX;
    dragOffsetY = e.offsetY;
    document.body.style.userSelect = 'none';
});
window.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    const btnW = toggleBtn.offsetWidth;
    const btnH = toggleBtn.offsetHeight;
    let newLeft = e.clientX - dragOffsetX;
    let newTop = e.clientY - dragOffsetY;
    // 確保整個按鈕都在畫面內
    newLeft = Math.max(0, Math.min(window.innerWidth - btnW, newLeft));
    newTop = Math.max(0, Math.min(window.innerHeight - btnH, newTop));
    toggleBtn.style.left = `${newLeft}px`;
    toggleBtn.style.top = `${newTop}px`;
});
window.addEventListener('mouseup', function() {
    isDragging = false;
    document.body.style.userSelect = '';
});

// 禁止網頁版雙擊據點編輯
if (window.setupMarkerInteractionOptimized) {
    const origSetupMarkerInteractionOptimized = window.setupMarkerInteractionOptimized;
    window.setupMarkerInteractionOptimized = function(...args) {
        origSetupMarkerInteractionOptimized.apply(this, args);
        if (!window.__TAURI__) {
            // 移除所有 marker 的 dblclick 事件
            setTimeout(() => {
                document.querySelectorAll('[class^="PortalMap_marker"], [class^="PortalMap_markerCapital"]').forEach(marker => {
                    marker.replaceWith(marker.cloneNode(true));
                });
            }, 500);
        }
    };
}