import { getFactionByColor } from './factionColorMap.js';

// 排行榜模組
export async function updateRanking() {
    if(location.hash !== '#/portalmap') return;
    function waitForMarkers(mapSelector, markerSelector, timeout = 12000) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            (function check() {
                const mapBox = document.querySelector(mapSelector);
                if (mapBox) {
                    const markers = mapBox.querySelectorAll(markerSelector);
                    if (markers.length > 0) return resolve({mapBox, markers});
                }
                if (Date.now() - start > timeout) return reject('地圖城市載入逾時');
                setTimeout(check, 300);
            })();
        });
    }
    try {
        const {mapBox, markers} = await waitForMarkers('.PortalMap_mapBox__3WtlM', '.PortalMap_marker__rzok1, .PortalMap_markerCapital__6ocPp');
        const colorMap = {};
        markers.forEach(marker => {
            if (!marker || !marker.style) return;
            const color = marker.style.backgroundColor;
            if (!colorMap[color]) colorMap[color] = 0;
            colorMap[color]++;
        });
        const sorted = Object.entries(colorMap).sort((a,b)=>b[1]-a[1]);
        let html = '<div style="font-size:2em;font-weight:700;text-align:center;margin-bottom:18px;letter-spacing:2px;color:#fff;">陣營城市排行榜</div>';
        html += '<div style="width:100%;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:0 8px 8px 8px;font-size:1.15em;font-weight:600;color:#fff;opacity:0.85;border-bottom:1.5px solid #444;">';
        html += '<span>陣營</span><span>城市數</span></div>';
        sorted.forEach(([color, count]) => {
            const factionName = getFactionByColor(color);
            html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 8px 12px 8px;font-size:1.18em;font-weight:500;">
                <span style="display:flex;align-items:center;gap:12px;">
                    <span style="display:inline-block;width:22px;height:22px;background:${color};border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px #0004;"></span>
                    <span style="color:#fff;">${factionName}</span>
                </span>
                <span style="color:#fff;">${count}</span>
            </div>`;
        });
        html += '</div>';
        document.getElementById('ranking-content').innerHTML = html;
    } catch(e) {
        document.getElementById('ranking-content').innerHTML = '排行榜載入失敗：' + e;
    }
}

export function setupRankingModalEvents() {
    let rankingUpdateTimer = null;
    let lastRankingHash = '';
    document.getElementById('show-portalmap-ranking').onclick = async function() {
        location.hash = '#/portalmap';
        document.getElementById('ranking-modal').style.display = 'flex';
        lastRankingHash = location.hash;
        await updateRanking();
        if(rankingUpdateTimer) clearInterval(rankingUpdateTimer);
        rankingUpdateTimer = setInterval(()=>{
            if(location.hash === '#/portalmap') {
                updateRanking();
            }
        }, 2000);
    };
    document.getElementById('close-ranking-modal').onclick = function() {
        document.getElementById('ranking-modal').style.display = 'none';
        if(rankingUpdateTimer) clearInterval(rankingUpdateTimer);
    };
    window.addEventListener('hashchange', function() {
        if(document.getElementById('ranking-modal').style.display === 'flex') {
            if(location.hash === '#/portalmap') {
                updateRanking();
                if(rankingUpdateTimer) clearInterval(rankingUpdateTimer);
                rankingUpdateTimer = setInterval(()=>{
                    if(location.hash === '#/portalmap') updateRanking();
                }, 2000);
            } else {
                if(rankingUpdateTimer) clearInterval(rankingUpdateTimer);
            }
        }
    });
}
