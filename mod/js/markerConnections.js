// marker 航線繪製
import { getMarkerId } from './markerUtils.js';
function drawConnectionLines(marker, markerData, type) {
    const id = getMarkerId(marker);
    const data = markerData[id];
    if (!data || !data[type]) return;
    const targets = data[type].split(/,|，/).map(s=>s.trim()).filter(Boolean);
    if (!targets.length) return;
    const allMarkers = Array.from(document.querySelectorAll('[class^="PortalMap_marker"], [class^="PortalMap_markerCapital"]'));
    const cityToMarker = {};
    allMarkers.forEach(m => {
        const mid = getMarkerId(m);
        const mdata = markerData[mid];
        if (mdata && mdata.cityName) cityToMarker[mdata.cityName] = m;
    });
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
    targets.forEach(city => {
        const targetMarker = cityToMarker[city];
        if (!targetMarker) return;
        const trect = targetMarker.getBoundingClientRect();
        const x1 = trect.left + trect.width/2;
        const y1 = trect.top + trect.height/2;
        const color = type === 'airport' ? '#fe9898' : '#98fefe';
        const line = document.createElementNS('http://www.w3.org/2000/svg','line');
        line.setAttribute('x1', x0);
        line.setAttribute('y1', y0);
        line.setAttribute('x2', x1);
        line.setAttribute('y2', y1);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-dasharray', '10,8');
        line.setAttribute('opacity', '0.85');
        svg.appendChild(line);
        let dx = x1 - x0;
        let dy = y1 - y0;
        let offsetX = 0, offsetY = 0, anchor = 'start';
        if (Math.abs(dx) > Math.abs(dy)) {
            offsetX = dx > 0 ? 16 : -16;
            offsetY = -8;
            anchor = dx > 0 ? 'start' : 'end';
        } else {
            offsetX = 0;
            offsetY = dy > 0 ? 22 : -16;
            anchor = 'middle';
        }
        const label = document.createElementNS('http://www.w3.org/2000/svg','text');
        label.textContent = city;
        label.setAttribute('x', x1 + offsetX);
        label.setAttribute('y', y1 + offsetY);
        label.setAttribute('fill', '#fff');
        label.setAttribute('font-size', '1.05em');
        label.setAttribute('font-weight', 'bold');
        label.setAttribute('stroke', '#222');
        label.setAttribute('stroke-width', '0.8');
        label.setAttribute('paint-order', 'stroke');
        label.setAttribute('style', 'pointer-events:none;user-select:none;text-shadow:0 2px 8px #000a;');
        label.setAttribute('text-anchor', anchor);
        svg.appendChild(label);
    });
}
function clearConnectionLines() {
    const svg = document.getElementById('map-connection-svg');
    if (svg) svg.innerHTML = '';
}
export { drawConnectionLines, clearConnectionLines };
