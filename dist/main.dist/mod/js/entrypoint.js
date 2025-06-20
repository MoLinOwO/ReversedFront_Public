import { renderAccountManager, autofillActiveAccount } from './accountManager.js';
import { updateRanking, setupRankingModalEvents } from './rankingModal.js';
import { setupCustomControls, setupRankingPanelDrag } from './customControls.js';
import { setupMarkerInteractionOptimized } from './markerInteraction.js';

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
});
document.addEventListener('DOMContentLoaded', () => {
    try {
        setupMarkerInteractionOptimized();
        setupCustomControls(); // 確保 DOM ready 時也掛載
    } catch(e) {}
});
// 直接定時偵測並啟用 marker 互動，無需依賴 hash/mapBox
setInterval(() => {
    try {
        setupMarkerInteractionOptimized();
    } catch(e) {}
}, 1000);
