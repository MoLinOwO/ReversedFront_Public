// 動態插入功能選單相關 DOM 結構
(function insertCustomControlsDOM() {
    if (document.getElementById('custom-controls-toggle')) return; // 已插入則跳過
    const main = document.querySelector('main') || document.body;
    main.insertAdjacentHTML('beforeend', `
    <div id="custom-controls-toggle" aria-label="展開功能選單" style="position:fixed;top:20px;right:20px;z-index:10000;background:#222c;backdrop-filter:blur(2px);border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 12px #000a;">
        <img src="./static/media/logo_monthlycard.fc4baca34b9e97ab8974.png" alt="功能選單" style="width:32px;height:32px;object-fit:contain;"/>
    </div>
    <div id="custom-controls" style="position:fixed;top:20px;right:20px;z-index:9999;background:rgba(34,34,34,0.82);backdrop-filter:blur(4px);border-radius:10px;padding:20px 18px 16px 18px;box-shadow:0 2px 12px #000a;color:#fff;min-width:220px;font-family:sans-serif;display:none;">
        <div style="margin-bottom:12px;font-size:1.1em;font-weight:bold;letter-spacing:1px;">功能選單</div>
        <button id="toggle-fullscreen" aria-label="切換全螢幕/視窗" style="width:100%;margin-bottom:10px;background:#333c;color:#fff;border:none;padding:8px 0;border-radius:6px;cursor:pointer;">切換全螢幕/視窗</button>
        <button id="show-portalmap-ranking" aria-label="顯示陣營據點排行榜" style="width:100%;margin-bottom:10px;background:#2a7cff;color:#fff;border:none;padding:8px 0;border-radius:6px;cursor:pointer;">陣營據點排行榜</button>
        <button id="toggle-faction-map" aria-label="顯示勢力分布圖" style="width:100%;margin-bottom:10px;background:#1dbf60;color:#fff;border:none;padding:8px 0;border-radius:6px;cursor:pointer;">顯示勢力分布圖</button>
        <button id="exit-app" aria-label="退出遊戲" style="width:100%;margin-bottom:10px;background:#d9534f;color:#fff;border:none;padding:8px 0;border-radius:6px;cursor:pointer;">退出遊戲</button>
        <div id="account-section"></div>
        <div id="account-status" style="margin-top:6px;font-size:0.92em;color:#7fffd4;"></div>
    </div>
    <div id="ranking-modal" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:12000;background:none;align-items:center;justify-content:center;pointer-events:none;">
      <div id="ranking-panel" style="background:rgba(30,34,44,0.72);padding:32px 36px 24px 36px;border-radius:22px;min-width:0;max-width:92vw;max-height:82vh;overflow:auto;box-shadow:0 4px 32px #0008;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;backdrop-filter:blur(6px);pointer-events:auto;cursor:move;">
        <button id="close-ranking-modal" aria-label="關閉排行榜" style="position:absolute;top:14px;right:18px;background:rgba(60,60,60,0.7);color:#fff;border:none;border-radius:50%;width:36px;height:36px;font-size:1.3em;cursor:pointer;z-index:1;box-shadow:0 2px 8px #000a;">×</button>
        <div id="ranking-content" style="margin-top:8px;width:100%;"></div>
      </div>
    </div>
    <div id="faction-map-canvas-container" style="position:absolute;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:1000;display:none;">
        <canvas id="faction-map-canvas" width="1920" height="1080" style="width:100vw;height:100vh;"></canvas>
    </div>
    `);
})();

import './globalAudioControl.js';
import { renderAccountManager, autofillActiveAccount } from './accountManager.js';
import { updateRanking, setupRankingModalEvents } from './rankingModal.js';
import { setupCustomControls, setupRankingPanelDrag } from './customControls.js';
import { setupMarkerInteractionOptimized } from './markerInteraction.js';
import { initializeMessageObserver } from './notificationBox.js';
import { saveMarkerDataToYaml } from './markerData.js';

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
    // 帳號管理
    const accountSection = document.getElementById('account-section');
    await renderAccountManager(accountSection, autofillActiveAccount);
    autofillActiveAccount();
    // 排行榜
    setupRankingModalEvents();
    // 控制面板與拖拉
    setupCustomControls();
    setupRankingPanelDrag();
    // 全螢幕切換
    document.getElementById('toggle-fullscreen').onclick = function() {
        if(window.pywebview && window.pywebview.api && window.pywebview.api.toggle_fullscreen) {
            window.pywebview.api.toggle_fullscreen();
        } else {
            alert('未偵測到 pywebview API');
        }
    };
    // 只初始化一次 marker 互動
    if (!markerInteractionInitialized) {
        setupMarkerInteractionOptimized();
        markerInteractionInitialized = true;
    }
});
document.addEventListener('DOMContentLoaded', () => {
    try {
        initializeMessageObserver(); // 初始化訊息觀察者
        if (!markerInteractionInitialized) {
            setupMarkerInteractionOptimized();
            markerInteractionInitialized = true;
        }
        setupCustomControls(); // 確保 DOM ready 時也掛載
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
