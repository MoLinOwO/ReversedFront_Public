// 勢力分布圖開關
import { collectMarkerData, drawFactionMapBaseOptimized } from './factionMap.js';

export function setupFactionMapControl(factionMapBtn, factionMapContainer) {
    let factionMapVisible = false;
    let factionMapObserver = null;
    let factionMapDebounceTimer = null;
    const canvas = document.getElementById('faction-map-canvas');
    const ctx = canvas.getContext('2d');
    function alignCanvasToMapArea() {
        const mapArea = document.querySelector('.PortalMap_mapArea__h7Err');
        if (!mapArea) return;
        const bounds = mapArea.getBoundingClientRect();
        // 以 mapArea 為定位基準
        factionMapContainer.style.position = 'absolute';
        factionMapContainer.style.left = '0px';
        factionMapContainer.style.top = '0px';
        factionMapContainer.style.width = bounds.width + 'px';
        factionMapContainer.style.height = bounds.height + 'px';
        factionMapContainer.style.pointerEvents = 'none'; // 不擋互動
        // canvas 尺寸同步
        canvas.width = bounds.width;
        canvas.height = bounds.height;
        canvas.style.width = bounds.width + 'px';
        canvas.style.height = bounds.height + 'px';
    }
    function ensureCanvasLayer() {
        const mapArea = document.querySelector('.PortalMap_mapArea__h7Err');
        if (!mapArea) return;
        // 插入 mapArea 內部，並放在地圖圖層（img）之後、marker 之前
        const mapImg = mapArea.querySelector('img.PortalMap_fakeMapImg__y7a1r, img.PortalMap_mapImg__JJkQ7');
        if (mapImg && factionMapContainer.parentNode !== mapArea) {
            // 插在地圖圖層之後
            if (mapImg.nextSibling) {
                mapArea.insertBefore(factionMapContainer, mapImg.nextSibling);
            } else {
                mapArea.appendChild(factionMapContainer);
            }
        }
        // 設定 z-index 讓 canvas 在地圖圖層上、marker 下
        factionMapContainer.style.zIndex = '2';
        canvas.style.zIndex = '2';
    }
    function hideFactionMapImmediate() {
        // 無論 factionMapVisible 狀態都強制隱藏與清理
        factionMapContainer.style.display = 'none';
        factionMapBtn.textContent = '顯示勢力分布圖';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        disableFactionMapObserver();
        window.removeEventListener('resize', alignCanvasToMapArea);
        factionMapVisible = false;
    }
    window.addEventListener('hashchange', function() {
        if (location.hash !== '#/portalmap') {
            hideFactionMapImmediate();
        }
    });
    // 新增 popstate 監聽，處理 history.pushState/replaceState 導致的頁面切換
    window.addEventListener('popstate', function() {
        if (location.hash !== '#/portalmap') {
            hideFactionMapImmediate();
        }
    });
    // 初始化時強制隱藏（避免 reload 或進入其他頁殘留）
    if (location.hash !== '#/portalmap') {
        hideFactionMapImmediate();
    }
    factionMapBtn.onclick = function() {
        if (location.hash !== '#/portalmap') {
            hideFactionMapImmediate();
            return;
        }
        factionMapVisible = !factionMapVisible;
        if (factionMapVisible) {
            ensureCanvasLayer();
            alignCanvasToMapArea();
            factionMapContainer.style.display = 'block';
            factionMapBtn.textContent = '隱藏勢力分布圖';
            const markerData = collectMarkerData(canvas.width, canvas.height);
            drawFactionMapBaseOptimized(ctx, markerData);
            enableFactionMapObserver();
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
        const markerRoot = document.querySelector('.PortalMap_mapBox__3WtlM') || document.body;
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
                if (factionMapDebounceTimer) clearTimeout(factionMapDebounceTimer);
                factionMapDebounceTimer = setTimeout(() => {
                    const markerData = collectMarkerData(canvas.width, canvas.height);
                    drawFactionMapBaseOptimized(ctx, markerData);
                }, 200);
            }
        });
        factionMapObserver.observe(markerRoot, {
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style'],
            childList: true
        });
    }
    function disableFactionMapObserver() {
        if (factionMapObserver) { factionMapObserver.disconnect(); factionMapObserver = null; }
        if (factionMapDebounceTimer) { clearTimeout(factionMapDebounceTimer); factionMapDebounceTimer = null; }
    }
    // --- 自動偵測是否離開地圖頁，若離開則強制隱藏勢力分布圖 ---
    let autoHideTimer = setInterval(() => {
        // 只要勢力分布圖有顯示，且地圖主體不存在，就強制隱藏
        if (factionMapVisible && !document.querySelector('.PortalMap_mapArea__h7Err')) {
            hideFactionMapImmediate();
        }
    }, 500);
    // 若有需要可在適當時機 clearInterval(autoHideTimer);
}
