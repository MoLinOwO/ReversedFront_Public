// 勢力分布圖繪製模組
import { getFactionByColor, getFactionColor, getAllFactions } from './factionColorMap.js';

// marker 顏色快取（以 marker dom id 或座標為 key）
const markerColorCache = new Map();

// 據點座標與顏色快取（以座標為唯一 key）
const markerInfoCache = new Map();

function normalizeColor(color) {
    if (!color) return '';
    // 只取 rgb 數字
    let m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) return `rgb(${parseInt(m[1])},${parseInt(m[2])},${parseInt(m[3])})`;
    // hex 轉 rgb
    if (color[0] === '#') {
        let hex = color.replace('#','');
        if (hex.length === 3) hex = hex.split('').map(x=>x+x).join('');
        if (hex.length === 6) {
            return `rgb(${parseInt(hex.substr(0,2),16)},${parseInt(hex.substr(2,2),16)},${parseInt(hex.substr(4,2),16)})`;
        }
    }
    return color.trim();
}

export function collectMarkerData(canvasWidth, canvasHeight) {
    const markerSelector = '[class^="PortalMap_marker"], [class^="PortalMap_markerCapital"]';
    const markers = Array.from(document.querySelectorAll(markerSelector));
    const colorMap = {};
    // 先建立顏色對照表（標準化）
    markers.forEach(marker => {
        let color = marker.style.backgroundColor;
        if (!color) {
            const cs = window.getComputedStyle(marker);
            color = cs.backgroundColor;
        }
        color = normalizeColor(color);
        if (color) {
            if (!colorMap[color]) colorMap[color] = 0;
            colorMap[color]++;
        }
    });
    // 再組成 markerData
    const data = [];
    const seen = new Set();
    markers.forEach(marker => {
        const leftStr = marker.style.left || '';
        const topStr = marker.style.top || '';
        const leftPct = parseFloat(leftStr.replace('calc(', '').replace('%)', '')) / 100;
        const topPct = parseFloat(topStr.replace('calc(', '').replace('%)', '')) / 100;
        const x = Math.round(leftPct * canvasWidth);
        const y = Math.round(topPct * canvasHeight);
        const key = `${x},${y}`;
        let color = marker.style.backgroundColor;
        if (!color) {
            const cs = window.getComputedStyle(marker);
            color = cs.backgroundColor;
        }
        color = normalizeColor(color);
        // 用 colorMap 的 key 做標準化（確保與排行榜一致）
        let stdColor = Object.keys(colorMap).find(c => c === color) || color;
        const faction = getFactionByColor(stdColor);
        const mergeKey = `${key},${faction},${stdColor}`;
        if (!seen.has(mergeKey)) {
            data.push({ x, y, color: stdColor, faction, marker });
            seen.add(mergeKey);
        }
    });
    return data;
}

// 允許所有 rgb 對應表內的陣營
// const allowedFactions = getAllFactions().map(f => f.name); // 不再使用

// 動態載入 d3-delaunay
async function loadD3Delaunay() {
    if (window.d3 && window.d3.Delaunay) return window.d3.Delaunay;
    try {
        // The script will attach d3 to the window object, or return it as a module
        const d3 = await import('https://cdn.jsdelivr.net/npm/d3-delaunay@6/dist/d3-delaunay.min.js');
        return d3.Delaunay || (window.d3 && window.d3.Delaunay);
    } catch (error) {
        console.error("無法載入 d3-delaunay 函式庫:", error);
        return null;
    }
}

// 主繪製函式
export async function drawFactionMapBase(ctx, markerData) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const width = ctx.canvas.width, height = ctx.canvas.height;

    const validMarkerData = markerData.filter(m => isFinite(m.x) && isFinite(m.y) && m.faction && m.faction !== '未知');
    if (validMarkerData.length < 3) {
        console.warn("需要至少 3 個有效的據點才能繪製 Voronoi 圖。");
        return;
    }

    const Delaunay = await loadD3Delaunay();
    if (!Delaunay) {
        console.error("D3 Delaunay 函式庫載入失敗，無法繪製勢力圖。");
        return;
    }
    const points = validMarkerData.map(m => [m.x, m.y]);
    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, width, height]);

    // 1. 按顏色分組據點
    const sitesByColor = new Map();
    for (let i = 0; i < validMarkerData.length; i++) {
        const color = validMarkerData[i].color;
        if (!sitesByColor.has(color)) {
            sitesByColor.set(color, []);
        }
        sitesByColor.get(color).push(i);
    }

    // 2. 使用 clip 繪製合併後的半透明填充區
    ctx.globalAlpha = 0.22;
    for (const [color, sites] of sitesByColor.entries()) {
        ctx.save();
        ctx.beginPath();
        for (const i of sites) {
            const polygon = voronoi.cellPolygon(i);
            // 過濾極小cell（面積小於10px^2不繪製）
            if (polygon && polygon.length > 2) {
                let area = 0;
                for (let k = 0; k < polygon.length; k++) {
                    const [x1, y1] = polygon[k];
                    const [x2, y2] = polygon[(k + 1) % polygon.length];
                    area += (x1 * y2 - x2 * y1);
                }
                area = Math.abs(area) / 2;
                if (area < 10) continue; // 跳過極小cell
                ctx.moveTo(polygon[0][0], polygon[0][1]);
                for (let k = 1; k < polygon.length; k++) {
                    ctx.lineTo(polygon[k][0], polygon[k][1]);
                }
                ctx.closePath();
            }
        }
        // 使用 'evenodd' 規則進行剪裁，可正確處理領土中的「洞」
        try { ctx.clip('evenodd'); } catch(e) { ctx.clip(); } // 舊瀏覽器相容
        
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }
    ctx.globalAlpha = 1.0;

    // 3. 建立邊緣地圖以繪製邊界
    const edgeToSites = new Map();
    const round = p => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100];
    const edgeKey = (p1, p2) => {
        const r1 = round(p1);
        const r2 = round(p2);
        return r1[0] < r2[0] || (r1[0] === r2[0] && r1[1] < r2[1])
            ? `${r1.join(',')}:${r2.join(',')}`
            : `${r2.join(',')}:${r1.join(',')}`;
    };

    for (let i = 0; i < validMarkerData.length; i++) {
        const cell = voronoi.cellPolygon(i);
        // 過濾極小cell
        if (!cell || cell.length < 2) continue;
        let area = 0;
        for (let k = 0; k < cell.length; k++) {
            const [x1, y1] = cell[k];
            const [x2, y2] = cell[(k + 1) % cell.length];
            area += (x1 * y2 - x2 * y1);
        }
        area = Math.abs(area) / 2;
        if (area < 10) continue;
        for (let j = 0; j < cell.length; j++) {
            const p1 = cell[j];
            const p2 = cell[(j + 1) % cell.length];
            // 邊界長度過短不繪製
            const dx = p2[0] - p1[0];
            const dy = p2[1] - p1[1];
            if (Math.sqrt(dx*dx + dy*dy) < 2) continue;
            const key = edgeKey(p1, p2);
            if (!edgeToSites.has(key)) {
                edgeToSites.set(key, { sites: [], points: [p1, p2] });
            }
            edgeToSites.get(key).sites.push(i);
        }
    }

    // 4. 繪製邊界線
    const bgColor = '#181818';
    const bgWidth = 4; // 加粗背景線
    const fgWidth = 1.5; // 加粗前景線
    const borderColor = 'rgba(220, 220, 220, 0.8)'; // 統一的亮色邊界

    for (const { sites, points } of edgeToSites.values()) {
        const [p1, p2] = points;
        let draw = false;

        if (sites.length < 2) {
            // 地圖外邊緣
            draw = true;
        } else {
            // 內部陣營邊界
            const color1 = validMarkerData[sites[0]].color;
            const color2 = validMarkerData[sites[1]].color;
            if (color1 !== color2) {
                draw = true;
            }
        }

        if (draw) {
            // 繪製背景線 (較粗的深色線)
            ctx.beginPath();
            ctx.moveTo(p1[0], p1[1]);
            ctx.lineTo(p2[0], p2[1]);
            ctx.strokeStyle = bgColor;
            ctx.lineWidth = bgWidth;
            ctx.lineCap = 'round';
            ctx.stroke();

            // 繪製前景線 (較細的亮色線)
            ctx.beginPath();
            ctx.moveTo(p1[0], p1[1]);
            ctx.lineTo(p2[0], p2[1]);
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = fgWidth;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    }

    // 5. 外圍漸層淡出美化（方形遮罩，四邊均勻）
    const fadeMargin = Math.max(width, height) * 0.06;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    // 上方
    let grad = ctx.createLinearGradient(0, 0, 0, fadeMargin);
    grad.addColorStop(0, 'rgba(0,0,0,0.92)');
    grad.addColorStop(0.05, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, fadeMargin);
    // 下方
    grad = ctx.createLinearGradient(0, height, 0, height - fadeMargin);
    grad.addColorStop(0, 'rgba(0,0,0,0.92)');
    grad.addColorStop(0.05, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, height - fadeMargin, width, fadeMargin);
    // 左方
    grad = ctx.createLinearGradient(0, 0, fadeMargin, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.92)');
    grad.addColorStop(0.05, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, fadeMargin, height);
    // 右方
    grad = ctx.createLinearGradient(width, 0, width - fadeMargin, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.92)');
    grad.addColorStop(0.05, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(width - fadeMargin, 0, fadeMargin, height);
    ctx.restore();

    // 6. 不同色塊邊緣模糊融合
    // 工具：將 rgb/hex 轉為 rgba
    function toRgba(color, alpha) {
        if (!color) return `rgba(0,0,0,${alpha})`;
        if (color.startsWith('rgba')) {
            return color.replace(/rgba?\(([^)]+)\)/, (m, c) => {
                const parts = c.split(',').map(x=>x.trim());
                return `rgba(${parts[0]},${parts[1]},${parts[2]},${alpha})`;
            });
        }
        if (color.startsWith('rgb')) {
            return color.replace(/rgb\(([^)]+)\)/, (m, c) => {
                const parts = c.split(',').map(x=>x.trim());
                return `rgba(${parts[0]},${parts[1]},${parts[2]},${alpha})`;
            });
        }
        if (color[0] === '#') {
            let hex = color.replace('#','');
            if (hex.length === 3) hex = hex.split('').map(x=>x+x).join('');
            if (hex.length === 6) {
                const r = parseInt(hex.substr(0,2),16);
                const g = parseInt(hex.substr(2,2),16);
                const b = parseInt(hex.substr(4,2),16);
                return `rgba(${r},${g},${b},${alpha})`;
            }
        }
        return color;
    }

    for (const { sites, points } of edgeToSites.values()) {
        const [p1, p2] = points;
        let isBorder = false;
        let color1 = null, color2 = null;
        if (sites.length < 2) {
            continue;
        } else {
            color1 = validMarkerData[sites[0]].color;
            color2 = validMarkerData[sites[1]].color;
            if (color1 !== color2) {
                isBorder = true;
            }
        }
        if (!isBorder) continue;
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const len = Math.sqrt(dx*dx + dy*dy);
        if (len < 2) continue;
        const nx = -dy / len;
        const ny = dx / len;
        const blurWidth = 28; // 降低羽化寬度，減少重疊
        const p1a = [p1[0] + nx * blurWidth, p1[1] + ny * blurWidth];
        const p2a = [p2[0] + nx * blurWidth, p2[1] + ny * blurWidth];
        const p1b = [p1[0] - nx * blurWidth, p1[1] - ny * blurWidth];
        const p2b = [p2[0] - nx * blurWidth, p2[1] - ny * blurWidth];
        const grad = ctx.createLinearGradient(p1a[0], p1a[1], p1b[0], p1b[1]);
        grad.addColorStop(0, toRgba(color1, 0));
        grad.addColorStop(0.18, toRgba(color1, 0.25));
        grad.addColorStop(0.38, toRgba(color1, 0.7));
        grad.addColorStop(0.5, toRgba(color1, 1));
        grad.addColorStop(0.5, toRgba(color2, 1));
        grad.addColorStop(0.62, toRgba(color2, 0.7));
        grad.addColorStop(0.82, toRgba(color2, 0.25));
        grad.addColorStop(1, toRgba(color2, 0));
        ctx.save();
        ctx.globalAlpha = 0.18; // 降低疊加亮度，避免光暈點
        ctx.beginPath();
        ctx.moveTo(p1a[0], p1a[1]);
        ctx.lineTo(p2a[0], p2a[1]);
        ctx.lineTo(p2b[0], p2b[1]);
        ctx.lineTo(p1b[0], p1b[1]);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
    }

    ctx.canvas.style.pointerEvents = 'none'; // 確保不遮擋 UI
}
