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
    function syncFactionFilterFromConfig() {
        if (window.pywebview && window.pywebview.api && window.pywebview.api.get_report_faction_filter) {
            window.pywebview.api.get_report_faction_filter().then(val => {
                if (val && options.includes(val)) {
                    select.value = val;
                } else {
                    select.value = '全部';
                }
                if (window.updateFactionFilter) window.updateFactionFilter(select.value);
            });
        } else {
            // 網頁版：預設為全部
            select.value = '全部';
            if (window.updateFactionFilter) window.updateFactionFilter('全部');
        }
    }
    window.addEventListener('pywebviewready', syncFactionFilterFromConfig);
    document.addEventListener('DOMContentLoaded', syncFactionFilterFromConfig);

    // 監聽變更
    select.addEventListener('change', function() {
        if (window.pywebview && window.pywebview.api && window.pywebview.api.save_report_faction_filter) {
            window.pywebview.api.save_report_faction_filter(this.value);
        }
        if (window.updateFactionFilter) window.updateFactionFilter(this.value);
    });
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
    // 新增：戰報通知過濾下拉選單
    createFactionFilterDropdown(controlsPanel);
}

export { setupRankingPanelDrag };