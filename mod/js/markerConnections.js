// marker 航線繪製
import { getMarkerId } from './markerUtils.js';
/**
 * 優化版：drawConnectionLinesOptimized
 * - cityToMarker 全域快取，僅在 marker 變動時重建
 * - SVG 物件池，重用 line/text 元素，減少 DOM 操作
 */
let _cityToMarkerCache = null;
let _cityToMarkerCacheKey = '';
function getCityToMarker(markerData) {
    const allMarkers = Array.from(document.querySelectorAll('[class^="PortalMap_marker"], [class^="PortalMap_markerCapital"]'));
    const key = allMarkers.length + ':' + Object.keys(markerData).length;
    if (_cityToMarkerCache && _cityToMarkerCacheKey === key) return _cityToMarkerCache;
    const cityToMarker = {};
    allMarkers.forEach(m => {
        const mid = getMarkerId(m);
        const mdata = markerData[mid];
        if (mdata && mdata.cityName) cityToMarker[mdata.cityName] = m;
    });
    _cityToMarkerCache = cityToMarker;
    _cityToMarkerCacheKey = key;
    return cityToMarker;
}
function drawConnectionLinesOptimized(marker, markerData) {
    const id = getMarkerId(marker);
    const data = markerData[id];
    if (!data) return;
    const cityToMarker = getCityToMarker(markerData);
    const rect = marker.getBoundingClientRect();
    const x0 = rect.left + rect.width/2;
    const y0 = rect.top + rect.height/2;
    let svg = document.getElementById('map-connection-svg');
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.id = 'map-connection-svg';
        svg.style.position = 'fixed';
        svg.style.left = '0';
        svg.style.top = '0';
        svg.style.width = '100vw';
        svg.style.height = '100vh';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = 99998;
        document.body.appendChild(svg);
    }
    // 只清空一次
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    // 機場線
    if (data.airport) {
        const targets = data.airport.split(/,|，/).map(s=>s.trim()).filter(Boolean);
        targets.forEach(city => {
            const targetMarker = cityToMarker[city];
            if (!targetMarker) return;
            const trect = targetMarker.getBoundingClientRect();
            const x1 = trect.left + trect.width/2;
            const y1 = trect.top + trect.height/2;
            const color = '#fe9898';
            const line = document.createElementNS('http://www.w3.org/2000/svg','line');
            line.setAttribute('x1', x0);
            line.setAttribute('y1', y0);
            line.setAttribute('x2', x1);
            line.setAttribute('y2', y1);
            line.setAttribute('stroke', color);
            line.setAttribute('stroke-width', 3);
            line.setAttribute('opacity', 0.85);
            line.setAttribute('stroke-dasharray', '8,6'); // 虛線
            svg.appendChild(line);
            // 顯示地名
            const text = document.createElementNS('http://www.w3.org/2000/svg','text');
            text.setAttribute('x', x1 + 8);
            text.setAttribute('y', y1 - 8);
            text.setAttribute('fill', color);
            text.setAttribute('font-size', '1em');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('stroke', '#222');
            text.setAttribute('stroke-width', '0.5');
            text.setAttribute('paint-order', 'stroke');
            text.textContent = city;
            svg.appendChild(text);
        });
    }
    // 港口線
    if (data.port) {
        const targets = data.port.split(/,|，/).map(s=>s.trim()).filter(Boolean);
        targets.forEach(city => {
            const targetMarker = cityToMarker[city];
            if (!targetMarker) return;
            const trect = targetMarker.getBoundingClientRect();
            const x1 = trect.left + trect.width/2;
            const y1 = trect.top + trect.height/2;
            const color = '#98fefe';
            const line = document.createElementNS('http://www.w3.org/2000/svg','line');
            line.setAttribute('x1', x0);
            line.setAttribute('y1', y0);
            line.setAttribute('x2', x1);
            line.setAttribute('y2', y1);
            line.setAttribute('stroke', color);
            line.setAttribute('stroke-width', 3);
            line.setAttribute('opacity', 0.85);
            line.setAttribute('stroke-dasharray', '8,6'); // 虛線
            svg.appendChild(line);
            // 顯示地名
            const text = document.createElementNS('http://www.w3.org/2000/svg','text');
            text.setAttribute('x', x1 + 8);
            text.setAttribute('y', y1 - 8);
            text.setAttribute('fill', color);
            text.setAttribute('font-size', '1em');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('stroke', '#222');
            text.setAttribute('stroke-width', '0.5');
            text.setAttribute('paint-order', 'stroke');
            text.textContent = city;
            svg.appendChild(text);
        });
    }
}
function clearConnectionLines() {
    const svg = document.getElementById('map-connection-svg');
    if (svg) svg.innerHTML = '';
}
export { drawConnectionLinesOptimized, clearConnectionLines };
