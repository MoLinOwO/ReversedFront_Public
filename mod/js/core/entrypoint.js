// 導入鍵盤初始化腳本與視窗管理器
import { initKeyboardControls } from '../ui/keyboardInit.js';
import { initWindowManager, toggleFullscreen } from '../ui/windowManager.js';

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
}, 500);

// 動態插入功能選單相關 DOM 結構
(function insertCustomControlsDOM() {
    if (document.getElementById('custom-controls-toggle')) return; // 已插入則跳過
    const main = document.querySelector('main') || document.body;
    // 判斷是否 pywebview
    const isDesktop = !!window.pywebview;
    // 懸浮按鈕位置：桌面版中央，網頁版左上
    const toggleBtnStyle = isDesktop
        ? 'position:fixed;top:20%;left:50%;transform:translate(-50%,-50%);'
        : 'position:fixed;top:16px;left:16px;transform:none;';
    main.insertAdjacentHTML('beforeend', `
    <div id="custom-controls-toggle" aria-label="展開功能選單" style="${toggleBtnStyle}z-index:10000;background:#222c;backdrop-filter:blur(2px);border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 12px #000a;">
        <img src="./static/media/logo_monthlycard.fc4baca34b9e97ab8974.png" alt="功能選單" style="width:32px;height:32px;object-fit:contain;"/>
    </div>
    <div id="custom-controls" style="position:fixed;top:20px;right:20px;z-index:9999;background:rgba(34,34,34,0.82);backdrop-filter:blur(4px);border-radius:10px;padding:20px 18px 16px 18px;box-shadow:0 2px 12px #000a;color:#fff;min-width:220px;max-width:420px;width:90vw;font-family:sans-serif;display:none;transition:transform 0.2s cubic-bezier(.4,2,.6,1);transform-origin:top right;max-height:88vh;overflow:auto;">
        <div style="margin-bottom:12px;font-size:1.1em;font-weight:bold;letter-spacing:1px;">功能選單</div>
        ${isDesktop ? `<button id="toggle-fullscreen" aria-label="切換全螢幕/視窗" style="width:100%;margin-bottom:10px;background:#333c;color:#fff;border:none;padding:8px 0;border-radius:6px;cursor:pointer;">切換全螢幕/視窗</button>` : ''}
        <button id="show-portalmap-ranking" aria-label="顯示陣營據點排行榜" style="width:100%;margin-bottom:10px;background:#2a7cff;color:#fff;border:none;padding:8px 0;border-radius:6px;cursor:pointer;">陣營據點排行榜</button>
        <button id="toggle-faction-map" aria-label="顯示勢力分布圖" style="width:100%;margin-bottom:10px;background:#1dbf60;color:#fff;border:none;padding:8px 0;border-radius:6px;cursor:pointer;">顯示勢力分布圖</button>
        ${isDesktop ? `<button id="exit-app" aria-label="退出遊戲" style="width:100%;margin-bottom:10px;background:#d9534f;color:#fff;border:none;padding:8px 0;border-radius:6px;cursor:pointer;">退出遊戲</button>` : ''}
        <div id="account-section"></div>
        <div id="account-status" style="margin-top:6px;font-size:0.92em;color:#7fffd4;"></div>
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

    // 比例縮放功能選單（僅桌面版縮放，手機直接 100%）
    function scaleCustomControls() {
        const controls = document.getElementById('custom-controls');
        if (!controls) return;
        if (window.innerWidth <= 600) {
            controls.style.transform = 'scale(1)';
            controls.style.width = '96vw';
            controls.style.maxWidth = '96vw';
            controls.style.left = '2vw';
            controls.style.right = '2vw';
            controls.style.top = '12vw';
            controls.style.borderRadius = '12px';
        } else {
            const scale = Math.max(0.7, Math.min(1, window.innerWidth / 1280));
            controls.style.transform = `scale(${scale})`;
            controls.style.width = '';
            controls.style.maxWidth = '420px';
            controls.style.left = '';
            controls.style.right = '20px';
            controls.style.top = '20px';
            controls.style.borderRadius = '10px';
        }
    }
    window.addEventListener('resize', scaleCustomControls);
    scaleCustomControls();
})();

import '../audio/globalAudioControl.js';
import { renderAccountManager, autofillActiveAccount } from '../account/accountManager.js';
import { updateRanking, setupRankingModalEvents } from '../ui/rankingModal.js';
import { setupCustomControls, setupRankingPanelDrag } from '../ui/customControls.js';
import { setupMarkerInteractionOptimized } from '../map/markerInteraction.js';
import { initializeMessageObserver } from '../ui/notificationBox.js';
import { saveMarkerDataToYaml } from '../map/markerData.js';

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

window.addEventListener('pywebviewready', async function() {
    // 帳號管理（僅桌面版顯示）
    const accountSection = document.getElementById('account-section');
    if (window.pywebview) {
        // 桌面專屬按鈕動態插入（將切換全螢幕移到最下方）
        const controls = document.getElementById('custom-controls');
        if (controls && !document.getElementById('exit-app')) {
            controls.insertAdjacentHTML('beforeend', `<button id="exit-app" aria-label="退出遊戲" style="width:100%;margin-bottom:10px;background:#d9534f;color:#fff;border:none;padding:8px 0;border-radius:6px;cursor:pointer;">退出遊戲</button>`);
        }
        if (controls && !document.getElementById('toggle-fullscreen')) {
            controls.insertAdjacentHTML('beforeend', `<button id="toggle-fullscreen" aria-label="切換全螢幕/視窗" style="width:100%;margin-bottom:0;background:#333c;color:#fff;border:none;padding:8px 0;border-radius:6px;cursor:pointer;">切換全螢幕/視窗</button>`);
        }
        await renderAccountManager(accountSection, autofillActiveAccount);
        autofillActiveAccount();
    } else {
        accountSection.innerHTML = '';
    }
    // 排行榜
    setupRankingModalEvents();
    // 控制面板與拖拉
    setupCustomControls();
    setupRankingPanelDrag();
    // 全螢幕切換
    const fullscreenBtn = document.getElementById('toggle-fullscreen');
    if (fullscreenBtn) {
        fullscreenBtn.onclick = function() {
            // 使用視窗管理器的統一方法
            if (typeof toggleFullscreen === 'function') {
                console.log('使用視窗管理器切換全屏');
                toggleFullscreen();
            } else if (window.rfToggleFullscreen) {
                console.log('使用全局方法切換全屏');
                window.rfToggleFullscreen();
            } else if (window.pywebview && window.pywebview.api && window.pywebview.api.toggle_fullscreen) {
                console.log('直接使用 API 切換全屏');
                window.pywebview.api.toggle_fullscreen();
            } else {
                console.warn('未偵測到任何可用的全屏切換方法');
            }
        };
    }
    // 只初始化一次 marker 互動
    if (!markerInteractionInitialized) {
        setupMarkerInteractionOptimized();
        markerInteractionInitialized = true;
    }
});
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeMessageObserver(); // 初始化訊息觀察者
        if (!markerInteractionInitialized) {
            setupMarkerInteractionOptimized();
            markerInteractionInitialized = true;
        }
        setupCustomControls(); // 確保 DOM ready 時也掛載
        setupRankingModalEvents(); // 確保排行榜事件綁定
        
        // 初始化鍵盤事件處理 - 只處理 F11 鍵，讓 ESC 由 keyboard_handler 處理
        document.addEventListener('keydown', function(event) {
            // 僅處理 F11 鍵 - 切換全屏
            if (event.key === 'F11' || event.keyCode === 122) {
                console.log('entrypoint.js 捕獲F11按鍵，觸發全屏切換');
                if (window.pywebview && window.pywebview.api && window.pywebview.api.toggle_fullscreen) {
                    window.pywebview.api.toggle_fullscreen();
                    event.preventDefault();
                    return false;
                }
            }
            
            // 注意：不再在此處理 ESC 鍵，避免重複觸發
        }, true);
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
    // 以滑鼠點擊位置為圓心
    dragOffsetX = e.offsetX - toggleBtn.offsetWidth / 2;
    dragOffsetY = e.offsetY - toggleBtn.offsetHeight / 2;
    document.body.style.userSelect = 'none';
});
window.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    toggleBtn.style.top = `${e.clientY - dragOffsetY}px`;
    toggleBtn.style.left = `${e.clientX - dragOffsetX}px`;
    toggleBtn.style.transform = 'translate(-50%,-50%)';
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
        if (!window.pywebview) {
            // 移除所有 marker 的 dblclick 事件
            setTimeout(() => {
                document.querySelectorAll('[class^="PortalMap_marker"], [class^="PortalMap_markerCapital"]').forEach(marker => {
                    marker.replaceWith(marker.cloneNode(true));
                });
            }, 500);
        }
    };
}