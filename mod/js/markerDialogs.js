// marker 彈窗相關
import { getCityName, getMarkerId, getFactionByColor, getAllUniqueValues, getAllRewardCombos } from './markerUtils.js';

function parseMaterialType(bracket) {
    if (!bracket) return '';
    const colorMap = { '紅': '游擊隊', '黃': '資助家', '綠': '間諜', '藍': '宣傳家' };
    const color = bracket[0];
    const level = bracket[1];
    const type = colorMap[color] || '';
    if (!type || !level) return '';
    return `${type}${level}級素材`;
}

function getFactionColorStyle(faction) {
    // 對應顏色
    const map = {
        '蒙古': 'rgb(0, 138, 247)',
        '臺灣': 'rgb(7, 162, 188)',
        '滿洲': 'rgb(252, 185, 0)',
        '香港': 'rgb(174, 67, 236)',
        '反賊聯盟': 'rgb(255, 255, 255)',
        '藏國': 'rgb(70, 190, 127)',
        '維吾爾': 'rgb(116, 160, 246)',
        '哈薩克': 'rgb(0, 205, 197)',
        '紅軍': 'rgb(253, 30, 25)',
        '新中國狂歡': 'rgb(109, 109, 109)'
    };
    return map[faction] || 'rgb(109,109,109)';
}

function showEditDialog(marker, markerData) {
    const id = getMarkerId(marker);
    const color = marker.style.backgroundColor;
    const faction = getFactionByColor(color);
    const data = markerData[id] || { cityName: '', id: '', npc: [], reward: [], sovereignty: '', airport: '', port: '' };
    // 快速選單資料（去重）
    const npcOptions = Array.from(new Set(getAllUniqueValues(markerData, 'npc')));
    const rewardComboOptions = Array.from(new Set(getAllRewardCombos(markerData)));
    const sovereigntyOptions = Array.from(new Set(getAllUniqueValues(markerData, 'sovereignty')));
    const airportOptions = Array.from(new Set(getAllUniqueValues(markerData, 'airport')));
    const portOptions = Array.from(new Set(getAllUniqueValues(markerData, 'port')));
    let html = `<div style=\"font-size:1.3em;font-weight:bold;margin-bottom:18px;letter-spacing:1px;\">編輯據點資訊</div>`;
    html += `<div style=\"display:flex;flex-direction:column;gap:14px;\">`;
    html += `<label style=\"font-size:1em;\">城市名稱：<input id=\"edit-cityName\" value=\"${data.cityName||''}\" placeholder=\"可留空\" style=\"width:100%;padding:7px 10px;border-radius:6px;border:1.5px solid #888;background:#222;color:#fff;font-size:1em;\"></label>`;
    html += `<label style=\"font-size:1em;\">ID：<input id=\"edit-id\" value=\"${data.id||''}\" placeholder=\"可留空\" style=\"width:100%;padding:7px 10px;border-radius:6px;border:1.5px solid #888;background:#222;color:#fff;font-size:1em;\"></label>`;
    // NPC支援
    html += `<label style=\"font-size:1em;\">NPC支援（多項以,分隔）：<input id=\"edit-npc\" value=\"${(data.npc||[]).join(',')}\" style=\"width:70%;padding:7px 10px;border-radius:6px;border:1.5px solid #888;background:#222;color:#fff;font-size:1em;\">`;
    if (npcOptions.length) {
        html += `<select id=\"npc-select\" style=\"margin-left:8px;padding:7px 10px;border-radius:6px;background:#222;color:#fff;\">`;
        html += `<option value=\"\">快速選擇</option>`;
        npcOptions.forEach(opt => {
            html += `<option value=\"${opt}\">${opt}</option>`;
        });
        html += `</select>`;
    }
    html += `</label>`;
    // 佔領獎勵
    html += `<label style=\"font-size:1em;\">佔領獎勵（多項以,分隔）：<input id=\"edit-reward\" value=\"${(data.reward||[]).join(',')}\" style=\"width:70%;padding:7px 10px;border-radius:6px;border:1.5px solid #888;background:#222;color:#fff;font-size:1em;\">`;
    if (rewardComboOptions.length) {
        html += `<select id=\"reward-select\" style=\"margin-left:8px;padding:7px 10px;border-radius:6px;background:#222;color:#fff;\">`;
        html += `<option value=\"\">快速選擇組合</option>`;
        rewardComboOptions.forEach(opt => {
            html += `<option value=\"${opt}\">${opt}</option>`;
        });
        html += `</select>`;
    }
    html += `</label>`;
    // 主權
    html += `<label style=\"font-size:1em;\">主權：<input id=\"edit-sovereignty\" value=\"${data.sovereignty||''}\" style=\"width:70%;padding:7px 10px;border-radius:6px;border:1.5px solid #888;background:#222;color:#fff;font-size:1em;\">`;
    if (sovereigntyOptions.length) {
        html += `<select id=\"sovereignty-select\" style=\"margin-left:8px;padding:7px 10px;border-radius:6px;background:#222;color:#fff;\">`;
        html += `<option value=\"\">快速選擇</option>`;
        sovereigntyOptions.forEach(opt => {
            html += `<option value=\"${opt}\">${opt}</option>`;
        });
        html += `</select>`;
    }
    html += `</label>`;
    // 機場
    html += `<label style=\"font-size:1em;\">機場前往：<input id=\"edit-airport\" value=\"${data.airport||''}\" style=\"width:70%;padding:7px 10px;border-radius:6px;border:1.5px solid #888;background:#222;color:#fff;font-size:1em;\">`;
    if (airportOptions.length) {
        html += `<select id=\"airport-select\" style=\"margin-left:8px;padding:7px 10px;border-radius:6px;background:#222;color:#fff;\">`;
        html += `<option value=\"\">快速選擇</option>`;
        airportOptions.forEach(opt => {
            html += `<option value=\"${opt}\">${opt}</option>`;
        });
        html += `</select>`;
    }
    html += `</label>`;
    // 港口
    html += `<label style=\"font-size:1em;\">港口前往：<input id=\"edit-port\" value=\"${data.port||''}\" style=\"width:70%;padding:7px 10px;border-radius:6px;border:1.5px solid #888;background:#222;color:#fff;font-size:1em;\">`;
    if (portOptions.length) {
        html += `<select id=\"port-select\" style=\"margin-left:8px;padding:7px 10px;border-radius:6px;background:#222;color:#fff;\">`;
        html += `<option value=\"\">快速選擇</option>`;
        portOptions.forEach(opt => {
            html += `<option value=\"${opt}\">${opt}</option>`;
        });
        html += `</select>`;
    }
    html += `</label>`;
    html += `<label style=\"font-size:1em;\">控制：<input value=\"${faction}\" disabled style=\"width:100%;padding:7px 10px;border-radius:6px;border:1.5px solid #888;background:#333;color:#fff;font-size:1em;\"></label>`;
    html += `</div>`;
    html += `<div style=\"display:flex;gap:18px;justify-content:center;margin-top:28px;\">`
        + `<button id=\"save-marker-data\" style=\"background:#2a7cff;color:#fff;border:none;padding:10px 32px;border-radius:8px;font-size:1.1em;cursor:pointer;font-weight:bold;letter-spacing:2px;\">儲存</button>`
        + `<button id=\"close-marker-dialog\" style=\"background:#444;color:#fff;border:none;padding:10px 32px;border-radius:8px;font-size:1.1em;cursor:pointer;font-weight:bold;letter-spacing:2px;\">關閉</button>`
        + `</div>`;
    let dialog = document.getElementById('marker-edit-dialog');
    if (!dialog) {
        dialog = document.createElement('div');
        dialog.id = 'marker-edit-dialog';
        dialog.tabIndex = 0;
        dialog.style.position = 'fixed';
        dialog.style.left = '50%';
        dialog.style.top = '50%';
        dialog.style.transform = 'translate(-50%,-50%)';
        dialog.style.background = 'rgba(30,30,30,0.98)';
        dialog.style.color = '#fff';
        dialog.style.padding = '36px 44px 32px 44px';
        dialog.style.borderRadius = '18px';
        dialog.style.zIndex = 100000;
        dialog.style.boxShadow = '0 8px 48px #000c';
        dialog.style.minWidth = '380px';
        dialog.style.maxWidth = '96vw';
        dialog.style.outline = 'none';
        document.body.appendChild(dialog);
    }
    dialog.innerHTML = html;
    dialog.style.display = 'block';
    dialog.focus();
    document.getElementById('close-marker-dialog').onclick = () => dialog.style.display = 'none';
    setTimeout(()=>{
        function outsideClick(e) {
            if (dialog.style.display !== 'block') return;
            if (!dialog.contains(e.target)) {
                dialog.style.display = 'none';
                document.removeEventListener('mousedown', outsideClick);
            }
        }
        document.addEventListener('mousedown', outsideClick);
    }, 0);
    // 快速選單事件
    if (npcOptions.length) {
        const npcSelect = document.getElementById('npc-select');
        if (npcSelect) {
            npcSelect.onchange = function() {
                if (this.value) {
                    let v = document.getElementById('edit-npc').value;
                    if (v && !v.endsWith(',')) v += ',';
                    document.getElementById('edit-npc').value = v + this.value;
                    this.value = '';
                }
            };
        }
    }
    if (rewardComboOptions.length) {
        const rewardSelect = document.getElementById('reward-select');
        if (rewardSelect) {
            rewardSelect.onchange = function() {
                if (this.value) {
                    document.getElementById('edit-reward').value = this.value;
                    this.value = '';
                }
            };
        }
    }
    if (sovereigntyOptions.length) {
        const sovereigntySelect = document.getElementById('sovereignty-select');
        if (sovereigntySelect) {
            sovereigntySelect.onchange = function() {
                if (this.value) {
                    document.getElementById('edit-sovereignty').value = this.value;
                    this.value = '';
                }
            };
        }
    }
    if (airportOptions.length) {
        const airportSelect = document.getElementById('airport-select');
        if (airportSelect) {
            airportSelect.onchange = function() {
                if (this.value) {
                    document.getElementById('edit-airport').value = this.value;
                    this.value = '';
                }
            };
        }
    }
    if (portOptions.length) {
        const portSelect = document.getElementById('port-select');
        if (portSelect) {
            portSelect.onchange = function() {
                if (this.value) {
                    document.getElementById('edit-port').value = this.value;
                    this.value = '';
                }
            };
        }
    }
    document.getElementById('save-marker-data').onclick = async () => {
        markerData[id] = {
            cityName: document.getElementById('edit-cityName').value,
            id: document.getElementById('edit-id').value,
            npc: document.getElementById('edit-npc').value.split(',').map(s=>s.trim()).filter(Boolean),
            reward: document.getElementById('edit-reward').value.split(',').map(s=>s.trim()).filter(Boolean),
            sovereignty: document.getElementById('edit-sovereignty').value,
            airport: document.getElementById('edit-airport').value,
            port: document.getElementById('edit-port').value
        };
        if (window.saveMarkerDataToYaml) {
            await window.saveMarkerDataToYaml(markerData);
        }
        dialog.style.display = 'none';
    };
}

function showDetailDialog(marker, markerData) {
    // 僅在 #/portalmap 顯示
    if (!location.hash.startsWith('#/portalmap')) return;
    const id = getMarkerId(marker);
    const color = marker.style.backgroundColor;
    const data = markerData[id] || { cityName: getCityName(marker), id, npc: [], reward: [], sovereignty: '', airport: '', port: '' };
    const faction = getFactionByColor(color);
    const factionColor = getFactionColorStyle(faction);
    const isWhiteFaction = faction === '反賊聯盟';
    let html = `<div style='font-size:1.45em;font-weight:700;margin-bottom:16px;letter-spacing:1px;text-align:center;'>${data.cityName||''} <span style='font-size:0.9em;font-weight:normal;color:#eee;'>(ID: ${data.id||''})</span></div>`;
    html += `<hr style='border:none;border-top:2px solid #fff5;margin:0 0 18px 0;'>`;
    html += `<div style='display:flex;gap:18px;margin-bottom:10px;align-items:center;'><span style='font-weight:bold;font-size:1.15em;'>主權</span><span style='background:#333;padding:4px 18px;border-radius:8px;font-size:1.1em;'>${data.sovereignty||''}</span></div>`;
    html += `<div style='display:flex;gap:18px;align-items:center;'><span style='font-weight:bold;font-size:1.15em;'>控制</span><span style='background:${factionColor};color:${isWhiteFaction?'#222':'#fff'};padding:4px 18px;border-radius:8px;font-size:1.1em;font-weight:bold;box-shadow:0 1px 6px #0003;'>${faction}</span></div>`;
    // 新增分隔線
    html += `<hr style='border:none;border-top:2px solid #fff5;margin:18px 0 10px 0;'>`;
    // 新增顯示機場與港口
    if (data.airport) {
        html += `<div style='display:flex;gap:18px;margin-bottom:10px;align-items:center;'><span style='font-weight:bold;font-size:1.15em;'>機場前往</span><span style='background:#1dbf60;padding:4px 18px;border-radius:8px;font-size:1.1em;'>${data.airport}</span></div>`;
    }
    if (data.port) {
        html += `<div style='display:flex;gap:18px;margin-bottom:10px;align-items:center;'><span style='font-weight:bold;font-size:1.15em;'>港口前往</span><span style='background:#1dbf60;padding:4px 18px;border-radius:8px;font-size:1.1em;'>${data.port}</span></div>`;
    }
    html += `<hr style='border:none;border-top:2px solid #fff5;margin:18px 0 10px 0;'>`;
    if (data.npc && data.npc.length) {
        html += `<div style='font-weight:bold;font-size:1.15em;margin-bottom:8px;'>NPC 支援</div>`;
        html += `<div style='display:flex;gap:12px;margin-bottom:10px;'>`;
        data.npc.forEach(n=>{
            const npcColor = getFactionColorStyle(n);
            const isWhite = n === '反賊聯盟';
            html += `<span style='background:${npcColor};color:${isWhite?'#222':'#fff'};padding:4px 16px;border-radius:8px;font-size:1.1em;font-weight:bold;'>${n}</span>`;
        });
        html += `</div>`;
        html += `<hr style='border:none;border-top:2px solid #fff5;margin:18px 0 10px 0;'>`;
    }
    if (data.reward && data.reward.length) {
        html += `<div style='font-weight:bold;font-size:1.15em;margin-bottom:8px;'>佔領獎勵</div>`;
        data.reward.forEach(rw=>{
            let match = rw.match(/^(.*?)(\((.*?)\))?:(\d+)/);
            if (match) {
                const name = match[1].trim();
                const bracket = match[3] || '';
                const value = match[4];
                const material = parseMaterialType(bracket);
                html += `<div style='display:flex;align-items:center;gap:10px;padding:4px 0 4px 0;font-size:1.1em;'>`;
                html += `<span style='min-width:70px;'>${name}</span>`;
                html += `<span style='font-weight:bold;color:#ffd700;min-width:36px;text-align:right;'>${value}</span>`;
                html += material ? `<span style='font-size:0.98em;color:#fff;opacity:0.85;'>丨${material}</span>` : '';
                html += `</div>`;
            } else {
                html += `<div style='padding:4px 0;font-size:1.1em;'>${rw}</div>`;
            }
        });
    }
    html += `<div style='display:flex;gap:18px;justify-content:center;margin-top:18px;'>`;
    html += `<button id='close-marker-detail-dialog' style='background:#444;color:#fff;border:none;padding:12px 38px;border-radius:10px;font-size:1.18em;cursor:pointer;font-weight:bold;letter-spacing:2px;'>關閉</button>`;
    html += `</div>`;
    let dialog = document.getElementById('marker-detail-dialog');
    if (!dialog) {
        dialog = document.createElement('div');
        dialog.id = 'marker-detail-dialog';
        dialog.tabIndex = 0;
        dialog.style.position = 'fixed';
        dialog.style.left = '50%';
        dialog.style.top = '50%';
        dialog.style.transform = 'translate(-50%,-50%)';
        dialog.style.background = `${factionColor}CC`;
        dialog.style.backdropFilter = 'blur(18px)';
        dialog.style.webkitBackdropFilter = 'blur(18px)';
        dialog.style.color = '#fff';
        dialog.style.padding = '0';
        dialog.style.borderRadius = '22px';
        dialog.style.zIndex = 100000;
        dialog.style.boxShadow = '0 8px 48px #000c';
        dialog.style.minWidth = '380px';
        dialog.style.maxWidth = '96vw';
        dialog.style.outline = 'none';
        document.body.appendChild(dialog);
    } else {
        dialog.style.background = `${factionColor}CC`;
        dialog.style.backdropFilter = 'blur(18px)';
        dialog.style.webkitBackdropFilter = 'blur(18px)';
    }
    dialog.innerHTML = `<div style='padding:38px 38px 28px 38px;'>${html}</div>`;
    dialog.style.display = 'block';
    dialog.focus();
    document.getElementById('close-marker-detail-dialog').onclick = () => dialog.style.display = 'none';
    // 點擊視窗外自動關閉
    setTimeout(()=>{
        function outsideClick(e) {
            if (dialog.style.display !== 'block') return;
            if (!dialog.contains(e.target)) {
                dialog.style.display = 'none';
                document.removeEventListener('mousedown', outsideClick);
            }
        }
        document.addEventListener('mousedown', outsideClick);
    }, 0);
    // hash 變動自動關閉
    function hashClose() {
        if (!location.hash.startsWith('#/portalmap')) {
            dialog.style.display = 'none';
            window.removeEventListener('hashchange', hashClose);
        }
    }
    window.addEventListener('hashchange', hashClose);
    // 拖拉功能
    let isDragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
    dialog.onmousedown = function(e) {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = dialog.getBoundingClientRect();
        origX = rect.left;
        origY = rect.top;
        dialog.style.transition = 'none';
        document.body.style.userSelect = 'none';
    };
    window.onmousemove = function(e) {
        if (!isDragging) return;
        let dx = e.clientX - startX;
        let dy = e.clientY - startY;
        let newLeft = origX + dx;
        let newTop = origY + dy;
        // 邊界修正
        const rect = dialog.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const minX = 8, minY = 8;
        const maxX = vw - rect.width - 8;
        const maxY = vh - rect.height - 8;
        if (newLeft < minX) newLeft = minX;
        if (newTop < minY) newTop = minY;
        if (newLeft > maxX) newLeft = maxX;
        if (newTop > maxY) newTop = maxY;
        dialog.style.left = newLeft + 'px';
        dialog.style.top = newTop + 'px';
        dialog.style.transform = 'none';
    };
    window.onmouseup = function() {
        isDragging = false;
        document.body.style.userSelect = '';
    };
}

export { showEditDialog, showDetailDialog };
