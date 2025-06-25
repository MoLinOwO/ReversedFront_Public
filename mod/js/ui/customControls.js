import { setupPanelDrag } from './panelDrag.js';
import { loadExitPromptsAndShow } from './exitConfirm.js';
import { setupFactionMapControl } from '../map/factionMapControl.js';
import { setupAudioControls } from '../audio/audioControls.js';
import { setupRankingPanelDrag } from './rankingPanelDrag.js';

function getDomOrWarn(id, warnMsg) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn(warnMsg || `找不到 DOM 元素：${id}`);
    }
    return el;
}

export function setupCustomControls() {
    // 快取常用節點
    const controlsPanel = getDomOrWarn('custom-controls', 'custom-controls 不存在，無法掛載功能選單事件');
    const controlsToggle = getDomOrWarn('custom-controls-toggle', 'custom-controls-toggle 不存在，無法掛載功能選單事件');
    if (!controlsPanel || !controlsToggle) return;

    // 控制面板拖拉與展開收合
    setupPanelDrag(controlsPanel, controlsToggle);

    // 退出遊戲按鈕
    const exitBtn = getDomOrWarn('exit-app', 'exit-app 按鈕不存在，無法掛載退出事件');
    if (exitBtn) {
        exitBtn.onclick = function() {
            loadExitPromptsAndShow();
        };
    }

    // 勢力分布圖開關
    const factionMapBtn = document.getElementById('toggle-faction-map');
    const factionMapContainer = document.getElementById('faction-map-canvas-container');
    if (factionMapBtn && factionMapContainer) {
        setupFactionMapControl(factionMapBtn, factionMapContainer);
    }

    // 音量與通知控制
    setupAudioControls(controlsPanel);
}

export { setupRankingPanelDrag };