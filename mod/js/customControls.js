import { collectMarkerData, drawFactionMapBase } from './factionMap.js';

// 自訂控制面板與拖拉模組
export function setupCustomControls() {
    const controlsPanel = document.getElementById('custom-controls');
    const controlsToggle = document.getElementById('custom-controls-toggle');
    if (!controlsPanel || !controlsToggle) {
        console.warn('custom-controls 或 custom-controls-toggle 不存在，無法掛載功能選單事件');
        return;
    }
    // 展開/收合功能選單
    controlsToggle.onclick = function() {
        if(controlsPanel.style.display === 'none') {
            controlsPanel.style.display = 'block';
            controlsToggle.style.display = 'none';
        }
    };
    document.addEventListener('mousedown', function(e) {
        if(controlsPanel.style.display !== 'none' && !controlsPanel.contains(e.target) && !controlsToggle.contains(e.target)) {
            controlsPanel.style.display = 'none';
            controlsToggle.style.display = 'flex';
        }
    });
    // 讓功能選單可滑鼠拖拉移動
    (function() {
        const panel = controlsPanel;
        let isDragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
        panel.addEventListener('mousedown', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'FORM' || e.target.isContentEditable) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = panel.getBoundingClientRect();
            origX = rect.left;
            origY = rect.top;
            document.body.style.userSelect = 'none';
        });
        window.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            let dx = e.clientX - startX;
            let dy = e.clientY - startY;
            panel.style.left = (origX + dx) + 'px';
            panel.style.top = (origY + dy) + 'px';
            panel.style.right = 'auto';
        });
        window.addEventListener('mouseup', function() {
            if (isDragging) {
                // 拖拉結束時修正位置
                const rect = panel.getBoundingClientRect();
                const minX = 0, minY = 0;
                const maxX = window.innerWidth - rect.width;
                const maxY = window.innerHeight - rect.height;
                let newLeft = rect.left, newTop = rect.top;
                if (rect.left < minX) newLeft = minX;
                if (rect.top < minY) newTop = minY;
                if (rect.left > maxX) newLeft = maxX;
                if (rect.top > maxY) newTop = maxY;
                panel.style.left = newLeft + 'px';
                panel.style.top = newTop + 'px';
            }
            isDragging = false;
            document.body.style.userSelect = '';
        });
        panel.style.position = 'fixed';
        panel.style.top = panel.style.top || '20px';
        panel.style.right = panel.style.right || '20px';
    })();
    // 小按鈕也能拖拉移動，並同步展開選單位置
    (function() {
        const toggleBtn = controlsToggle;
        const panel = controlsPanel;
        let isDragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
        toggleBtn.addEventListener('mousedown', function(e) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = toggleBtn.getBoundingClientRect();
            origX = rect.left;
            origY = rect.top;
            document.body.style.userSelect = 'none';
        });
        window.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            let dx = e.clientX - startX;
            let dy = e.clientY - startY;
            toggleBtn.style.left = (origX + dx) + 'px';
            toggleBtn.style.top = (origY + dy) + 'px';
            toggleBtn.style.right = 'auto';
            panel.style.left = toggleBtn.style.left;
            panel.style.top = toggleBtn.style.top;
            panel.style.right = 'auto';
        });
        window.addEventListener('mouseup', function() {
            if (isDragging) {
                // 拖拉結束時修正位置
                const rect = toggleBtn.getBoundingClientRect();
                const minX = 0, minY = 0;
                const maxX = window.innerWidth - rect.width;
                const maxY = window.innerHeight - rect.height;
                let newLeft = rect.left, newTop = rect.top;
                if (rect.left < minX) newLeft = minX;
                if (rect.top < minY) newTop = minY;
                if (rect.left > maxX) newLeft = maxX;
                if (rect.top > maxY) newTop = maxY;
                toggleBtn.style.left = newLeft + 'px';
                toggleBtn.style.top = newTop + 'px';
                // 同步 panel 位置
                panel.style.left = newLeft + 'px';
                panel.style.top = newTop + 'px';
            }
            isDragging = false;
            document.body.style.userSelect = '';
        });
        toggleBtn.style.position = 'fixed';
        toggleBtn.style.top = toggleBtn.style.top || '20px';
        toggleBtn.style.right = toggleBtn.style.right || '20px';
    })();
    // 新增退出遊戲按鈕事件（自訂置中二次確認，支援多組提示語）
    const exitBtn = document.getElementById('exit-app');
    if (exitBtn) {
        exitBtn.onclick = function() {
            loadExitPromptsAndShow();
        };
    }
    async function loadExitPromptsAndShow() {
        let prompts = [
            { message: '確認要離開 逆統戰：烽火 嗎？', confirm: '確定', cancel: '取消' }
        ];
        if (window.pywebview && window.pywebview.api && window.pywebview.api.load_yaml) {
            try {
                const yamlStr = await window.pywebview.api.load_yaml('mod/data/exit_prompts.yaml');
                if (yamlStr) {
                    let loaded = null;
                    if (window.YAML && window.YAML.load) {
                        loaded = window.YAML.load(yamlStr);
                    } else {
                        // 動態 import js-yaml
                        try {
                            const mod = await import('https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm');
                            loaded = mod.load(yamlStr);
                        } catch {}
                    }
                    if (Array.isArray(loaded) && loaded.length > 0) prompts = loaded;
                }
            } catch {}
        }
        const prompt = prompts[Math.floor(Math.random() * prompts.length)];
        showExitConfirm(prompt);
    }
    function showExitConfirm(prompt) {
        if (document.getElementById('custom-exit-confirm')) return;
        const overlay = document.createElement('div');
        overlay.id = 'custom-exit-confirm';
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(0,0,0,0.32)';
        overlay.style.zIndex = '20000';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.innerHTML = `
          <div style="background:rgba(34,34,34,0.98);backdrop-filter:blur(6px);border-radius:14px;box-shadow:0 4px 32px #000a;padding:32px 36px 24px 36px;min-width:260px;max-width:90vw;display:flex;flex-direction:column;align-items:center;">
            <div style="font-size:1.18em;font-weight:bold;margin-bottom:18px;letter-spacing:1px;color:#fff;text-align:center;">${prompt.message}</div>
            <div style="display:flex;gap:18px;">
              <button id="exit-confirm-yes" style="min-width:90px;min-height:38px;font-size:1em;background:#d9534f;color:#fff;border:none;border-radius:8px;box-shadow:0 2px 8px #0003;cursor:pointer;transition:background 0.18s;">${prompt.confirm}</button>
              <button id="exit-confirm-no" style="min-width:90px;min-height:38px;font-size:1em;background:#444;color:#fff;border:none;border-radius:8px;box-shadow:0 2px 8px #0002;cursor:pointer;transition:background 0.18s;">${prompt.cancel}</button>
            </div>
          </div>
          <style>
            #exit-confirm-yes:hover { background: #b52b27 !important; }
            #exit-confirm-no:hover { background: #222 !important; }
          </style>
        `;
        document.body.appendChild(overlay);
        document.getElementById('exit-confirm-yes').onclick = function() {
            if (window.pywebview && window.pywebview.api && window.pywebview.api.exit_app) {
                window.pywebview.api.exit_app();
            } else {
                window.close();
            }
        };
        document.getElementById('exit-confirm-no').onclick = function() {
            document.body.removeChild(overlay);
        };
    }
    // 顯示 custom-controls 時自動修正位置，避免切換螢幕後跑出邊界
    if (controlsPanel && controlsToggle) {
        const fixPanelPosition = () => {
            const rect = controlsPanel.getBoundingClientRect();
            const minX = 0, minY = 0;
            const maxX = window.innerWidth - rect.width;
            const maxY = window.innerHeight - rect.height;
            let newLeft = rect.left, newTop = rect.top;
            if (rect.left < minX) newLeft = minX;
            if (rect.top < minY) newTop = minY;
            if (rect.left > maxX) newLeft = maxX;
            if (rect.top > maxY) newTop = maxY;
            controlsPanel.style.left = newLeft + 'px';
            controlsPanel.style.top = newTop + 'px';
        };
        // 每次顯示時修正
        const origShow = controlsToggle.onclick;
        controlsToggle.onclick = function() {
            if (controlsPanel.style.display === 'none') {
                controlsPanel.style.display = 'block';
                controlsToggle.style.display = 'none';
                setTimeout(fixPanelPosition, 0);
            }
        };
        // 螢幕尺寸變化時也修正
        window.addEventListener('resize', fixPanelPosition);
    }
    // 保護懸浮按鈕在 resize 時不消失，並自動回預設可見位置
    if (controlsToggle) {
        const ensureToggleVisible = () => {
            // 若 display 被異常設為 none，強制設回 flex
            if (controlsToggle.style.display === 'none' && document.getElementById('custom-controls').style.display === 'none') {
                controlsToggle.style.display = 'flex';
            }
            // 若位置超出視窗，回預設右上角
            const rect = controlsToggle.getBoundingClientRect();
            if (rect.right < 0 || rect.bottom < 0 || rect.left > window.innerWidth || rect.top > window.innerHeight) {
                controlsToggle.style.left = '';
                controlsToggle.style.top = '';
                controlsToggle.style.right = '20px';
                controlsToggle.style.top = '20px';
            }
        };
        window.addEventListener('resize', ensureToggleVisible);
    }
    // 勢力分布圖開關
    const factionMapBtn = document.getElementById('toggle-faction-map');
    const factionMapContainer = document.getElementById('faction-map-canvas-container');
    let factionMapVisible = false;
    let factionMapObserver = null;
    if (factionMapBtn && factionMapContainer) {
        const canvas = document.getElementById('faction-map-canvas');
        const ctx = canvas.getContext('2d');
        // 將勢力分布圖畫布對齊地圖區域
        function alignCanvasToMapArea() {
            const mapArea = document.querySelector('.PortalMap_mapArea__h7Err');
            if (!mapArea) return;
            const bounds = mapArea.getBoundingClientRect();
            // 設定 container 位置與大小
            factionMapContainer.style.position = 'absolute';
            factionMapContainer.style.left = bounds.left + window.scrollX + 'px';
            factionMapContainer.style.top = bounds.top + window.scrollY + 'px';
            factionMapContainer.style.width = bounds.width + 'px';
            factionMapContainer.style.height = bounds.height + 'px';
            // 設定 canvas 寬高
            canvas.width = bounds.width;
            canvas.height = bounds.height;
            canvas.style.width = bounds.width + 'px';
            canvas.style.height = bounds.height + 'px';
        }
        // 嘗試將 container 插入地圖圖層下方，並調整 z-index
        function ensureCanvasLayer() {
            // 依據你的地圖主容器 id/class 調整
            const mapLayer = document.querySelector('.PortalMap_map__');
            if (mapLayer && factionMapContainer.parentNode !== mapLayer.parentNode) {
                mapLayer.parentNode.insertBefore(factionMapContainer, mapLayer);
            }
            factionMapContainer.style.zIndex = '1000';
        }
        factionMapBtn.onclick = function() {
            factionMapVisible = !factionMapVisible;
            if (factionMapVisible) {
                ensureCanvasLayer();
                alignCanvasToMapArea();
                factionMapContainer.style.display = 'block';
                factionMapBtn.textContent = '隱藏勢力分布圖';
                const markerData = collectMarkerData(canvas.width, canvas.height);
                drawFactionMapBase(ctx, markerData);
                enableFactionMapObserver();
                // 畫布隨視窗縮放自動對齊
                window.addEventListener('resize', alignCanvasToMapArea);
            } else {
                factionMapContainer.style.display = 'none';
                factionMapBtn.textContent = '顯示勢力分布圖';
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                disableFactionMapObserver();
                window.removeEventListener('resize', alignCanvasToMapArea);
            }
        };
        function enableFactionMapObserver() {
            if (factionMapObserver) return;
            const markerRoot = document.body; // 或更精確的地圖容器
            factionMapObserver = new MutationObserver((mutationsList) => {
                let needUpdate = false;
                for (const m of mutationsList) {
                    if (m.type === 'attributes' && (m.attributeName === 'class' || m.attributeName === 'style')) {
                        needUpdate = true; break;
                    }
                    if (m.type === 'childList') {
                        needUpdate = true; break;
                    }
                }
                if (needUpdate && factionMapVisible) {
                    const markerData = collectMarkerData(canvas.width, canvas.height);
                    drawFactionMapBase(ctx, markerData);
                }
            });
            // 監聽所有 marker 相關變化
            factionMapObserver.observe(markerRoot, {
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style'],
                childList: true
            });
        }
        function disableFactionMapObserver() {
            if (factionMapObserver) { factionMapObserver.disconnect(); factionMapObserver = null; }
        }
    }
}

export function setupRankingPanelDrag() {
    // --- 排行榜浮層可拖拉 ---
    (function() {
        const panel = document.getElementById('ranking-panel');
        let isDragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
        panel.addEventListener('mousedown', function(e) {
            if (e.button !== 0 || e.target.id === 'close-ranking-modal') return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = panel.getBoundingClientRect();
            origX = rect.left;
            origY = rect.top;
            panel.style.transition = 'none';
            document.body.style.userSelect = 'none';
        });
        window.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            let dx = e.clientX - startX;
            let dy = e.clientY - startY;
            panel.style.left = (origX + dx) + 'px';
            panel.style.top = (origY + dy) + 'px';
            panel.style.transform = 'none';
        });
        window.addEventListener('mouseup', function() {
            isDragging = false;
            document.body.style.userSelect = '';
        });
        panel.style.position = 'fixed';
        panel.style.top = panel.style.top || '50%';
        panel.style.left = panel.style.left || '50%';
        panel.style.transform = panel.style.transform || 'translate(-50%,-50%)';
    })();
}
