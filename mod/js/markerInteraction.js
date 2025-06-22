import { loadMarkerDataFromYaml } from './markerData.js';
import { getCityName, getMarkerId } from './markerUtils.js';
import { showEditDialog, showDetailDialog } from './markerDialogs.js';
import { drawConnectionLinesOptimized, clearConnectionLines } from './markerConnections.js';

// --- End 修正版 ---

// 儲存 observer 以便重複呼叫時清理
let _rf_marker_map_observer = null;

export function setupMarkerInteractionOptimized({ useCanvas = false } = {}) {
    let markerData = {};
    let tooltip = document.getElementById('map-tooltip-optimized');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'map-tooltip-optimized';
        tooltip.style.position = 'fixed';
        tooltip.style.background = 'rgba(30,30,30,0.92)';
        tooltip.style.color = '#fff';
        tooltip.style.padding = '6px 12px';
        tooltip.style.borderRadius = '8px';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.zIndex = 99999;
        tooltip.style.fontSize = '1em';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);
    }
    function showTooltip(e, text) {
        tooltip.textContent = text;
        tooltip.style.display = 'block';
        let left = e.clientX + 12;
        let top = e.clientY + 8;
        setTimeout(() => {
            const rect = tooltip.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            if (rect.right > vw - 8) left = vw - rect.width - 8;
            if (rect.bottom > vh - 8) top = vh - rect.height - 8;
            if (left < 8) left = 8;
            if (top < 8) top = 8;
            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';
        }, 0);
    }
    function hideTooltip() {
        tooltip.style.display = 'none';
    }
    async function bindMarkers() {
        const { loadMarkerDataFromYaml } = await import('./markerData.js');
        const { getCityName, getMarkerId } = await import('./markerUtils.js');
        const { showEditDialog, showDetailDialog } = await import('./markerDialogs.js');
        const { drawConnectionLinesOptimized, clearConnectionLines } = await import('./markerConnections.js');
        markerData = await loadMarkerDataFromYaml();
        const markers = Array.from(document.querySelectorAll('[class^="PortalMap_marker"], [class^="PortalMap_markerCapital"]'));
        markers.forEach(marker => {
            // 先移除舊事件
            if (marker._rf_marker_handlers) {
                marker.removeEventListener('mouseenter', marker._rf_marker_handlers.mouseenter);
                marker.removeEventListener('mousemove', marker._rf_marker_handlers.mousemove);
                marker.removeEventListener('mouseleave', marker._rf_marker_handlers.mouseleave);
                marker.removeEventListener('click', marker._rf_marker_handlers.click);
                marker.removeEventListener('dblclick', marker._rf_marker_handlers.dblclick);
            }
            // 處理士兵SVG與光輝
            const swords = marker.querySelector('.PortalMap_marker2swords__1V7ah');
            if (swords && swords.tagName === 'IMG') {
                const leftStr = marker.style.left || '';
                const topStr = marker.style.top || '';
                const leftPct = parseFloat(leftStr.replace('calc(', '').replace('%)', '')) / 100;
                const topPct = parseFloat(topStr.replace('calc(', '').replace('%)', '')) / 100;
                const canvas = document.getElementById('faction-map-canvas');
                let x = leftPct, y = topPct;
                if (canvas) {
                    x = Math.round(leftPct * canvas.width);
                    y = Math.round(topPct * canvas.height);
                }
                let color = marker.style.backgroundColor;
                if (!color) {
                    const cs = window.getComputedStyle(marker);
                    color = cs.backgroundColor;
                }
                swords.dataset.x = x;
                swords.dataset.y = y;
                swords.dataset.color = color;
                const id = getMarkerId(marker);
                const data = markerData[id] || {};
                let factionColor = marker.style.backgroundColor || '#888';
                if (data.faction && window.getFactionColor) {
                    try {
                        factionColor = window.getFactionColor(data.faction) || factionColor;
                    } catch {}
                }
                if (!window._soldierSvgCache) window._soldierSvgCache = {};
                let svgUrl = window._soldierSvgCache[factionColor];
                if (!svgUrl) {
                    const soldierPath = "M148.204,202.609l1.379,23.581c0.237,4.028,2.331,7.717,5.669,9.982c3.32,2.252,7.519,2.856,11.369,1.58l12.621-4.183L148.204,202.609z M511.983,153.352c-0.304-5.214-4.628-9.238-9.784-9.238c-0.193,0-0.387,0.006-0.582,0.017l-14.706,0.86l-0.501-8.569c-0.306-5.214-4.628-9.238-9.784-9.238c-0.193,0-0.387,0.006-0.582,0.017c-5.409,0.317-9.536,4.957-9.221,10.366l0.501,8.569l-79.533,4.652l-19.782-35.024c-1.920-3.335-5.518-5.35-9.365-5.218l-79.706,2.543c-4.735,0.151-8.772,3.476-9.829,8.094l-5.615,24.55l21.907-1.093l2.237-10.971l65.423-2.087l11.491,20.567l-14.716,0.861c13.8,20.885,5.559,48.911-16.953,59.171l-6.104,2.782l10.304,30.286c3.954,11.623,16.581,17.832,28.194,13.879c11.618-3.953,17.832-16.575,13.879-28.194c-11.117-32.675-8.724-25.643-13.659-40.147l37.381-2.186c5.409-0.317,9.536-4.957,9.221-10.366c-0.247-4.218-3.128-7.647-6.949-8.806l97.611-5.708C508.172,163.402,512.299,158.762,511.983,153.352z M206.773,53.045c-26.768-4.088-51.798,14.296-55.888,41.077c-4.526,29.623,18.376,56.458,48.543,56.458c23.815,0,44.716-17.381,48.423-41.647C251.941,82.157,233.549,57.134,206.773,53.045z M336.32,166.143c-5.09-11.167-18.271-16.092-29.436-11.004l-81.045,36.939c-8.178-4.584-66.046-37.059-74.61-41.822c-11.75-6.535-16.266-19.697-16.266-19.697c-9.933-0.071-19.482,3.832-26.521,10.839c-7.039,7.008-10.984,16.54-10.957,26.472c0.528,61.581,0.432,111.869,0.351,133.039c-0.027,6.905,1.002,13.896,3.043,20.491c4.407,14.247,13.026,43.684,22.571,84.787H26.665C11.938,406.19,0,418.128,0,432.855c0,14.727,11.938,26.665,26.665,26.665h130.432c8.143,0,15.84-3.721,20.898-10.103c5.058-6.382,6.922-14.726,5.063-22.652l-22.422-95.568l73.378-7.277l-16.648,104.75c-2.567,16.15,9.895,30.854,26.367,30.854c12.883,0,24.216-9.358,26.302-22.483l22.072-138.882c1.298-8.162-1.263-16.465-6.933-22.479c-5.67-6.014-13.805-9.059-22.032-8.242l-57.92,5.744l0.148-13.942c-2.717-2.2-2.532-2.137-15.431-15.003l-19.073,6.32c-7.552,2.502-16.143,1.556-23.185-3.223c-6.761-4.588-11.083-12.198-11.56-20.356c-1.913-32.717-2.021-31.378-1.465-35.068c14.386,8.063-4.26-2.388,79.287,44.443c6.176,3.464,13.635,3.775,20.079,0.838l91.297-41.612C336.484,190.488,341.41,177.31,336.32,166.143z";
                    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='48' viewBox='0 0 512 512'>
                    <defs>
                        <filter id='glow' x='-30%' y='-30%' width='160%' height='160%'>
                            <feGaussianBlur stdDeviation='8' result='coloredBlur'/>
                            <feMerge>
                                <feMergeNode in='coloredBlur'/>
                                <feMergeNode in='SourceGraphic'/>
                            </feMerge>
                        </filter>
                    </defs>
                    <path d='${soldierPath}' fill='${factionColor}' filter='url(#glow)'/>
                    </svg>`;
                    svgUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
                    window._soldierSvgCache[factionColor] = svgUrl;
                }
                if (swords.src !== svgUrl) swords.src = svgUrl;
                swords.onerror = function() { this.style.display = 'none'; };
                swords.onload = function() { this.style.display = ''; };
                const left = marker.style.left;
                const top = marker.style.top;
                if (left) swords.style.left = left;
                if (top) swords.style.top = top;
                swords.style.transform = 'translate(-50%, -50%) scale(0.65)';
                swords.style.backgroundColor = '';
                swords.style.borderRadius = '';
                swords.style.filter = '';
                swords.style.mixBlendMode = '';
                swords.style.boxShadow = 'none';
                swords.style.background = 'none';
                swords.style.border = 'none';
            }
            marker.style.cursor = 'pointer';
            marker.style.boxShadow = `0 0 8px 2px ${marker.style.backgroundColor}, 0 0 18px 6px ${marker.style.backgroundColor.replace(')',',0.35)')}`;
            marker.style.transition = 'box-shadow 0.2s';
            const has2Swords = marker.querySelector('.PortalMap_marker2swords__1V7ah') !== null;
            // 新事件處理
            const mouseenter = function(e) {
                const id = getMarkerId(marker);
                const data = markerData[id];
                const cityName = (data && data.cityName) ? data.cityName : getCityName(marker);
                showTooltip(e, cityName);
                clearConnectionLines();
                if (data && data.airport) drawConnectionLinesOptimized(marker, markerData, 'airport');
                if (data && data.port) drawConnectionLinesOptimized(marker, markerData, 'port');
            };
            const mousemove = function(e) {
                tooltip.style.left = (e.clientX + 12) + 'px';
                tooltip.style.top = (e.clientY + 8) + 'px';
            };
            const mouseleave = function() {
                hideTooltip();
                clearConnectionLines();
                // 強制重設 tooltip 狀態，避免殘留
                tooltip.textContent = '';
            };
            const click = function(e) {
                if (e.detail === 1) {
                    setTimeout(() => {
                        if (!marker._dblClicked) {
                            if (has2Swords) {
                                if (marker.dataset && marker.dataset.url) {
                                    window.open(marker.dataset.url, '_blank');
                                }
                            } else {
                                showDetailDialog(marker, markerData);
                            }
                        }
                        marker._dblClicked = false;
                        // 點擊後也強制清除 tooltip 與航線
                        hideTooltip();
                        clearConnectionLines();
                        tooltip.textContent = '';
                    }, 200);
                }
            };
            const dblclick = function(e) {
                marker._dblClicked = true;
                if (has2Swords) {
                    showDetailDialog(marker, markerData);
                } else {
                    showEditDialog(marker, markerData);
                }
                // 雙擊後也強制清除 tooltip 與航線
                hideTooltip();
                clearConnectionLines();
                tooltip.textContent = '';
            };
            marker.addEventListener('mouseenter', mouseenter);
            marker.addEventListener('mousemove', mousemove);
            marker.addEventListener('mouseleave', mouseleave);
            marker.addEventListener('click', click);
            marker.addEventListener('dblclick', dblclick);
            marker._rf_marker_handlers = { mouseenter, mousemove, mouseleave, click, dblclick };
        });
    }
    bindMarkers();
    // 動態監聽地圖刷新
    const mapBox = document.querySelector('.PortalMap_mapBox__3WtlM');
    if (mapBox) {
        // 清理舊 observer
        if (_rf_marker_map_observer) {
            _rf_marker_map_observer.disconnect();
        }
        _rf_marker_map_observer = new MutationObserver(() => {
            bindMarkers();
        });
        _rf_marker_map_observer.observe(mapBox, { childList: true, subtree: true });
    }
}
// --- End ---
