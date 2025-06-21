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
