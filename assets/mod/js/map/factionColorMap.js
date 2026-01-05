// 陣營顏色對應表模組
// 以 rgb 格式為主

const factionColorMap = [
  { name: '蒙古', color: 'rgb(0, 138, 247)' },
  { name: '臺灣', color: 'rgb(6, 133, 158)' },  // 更新為實際顏色
  { name: '滿洲', color: 'rgb(252, 185, 0)' },
  { name: '香港', color: 'rgb(174, 67, 236)' },
  { name: '反賊聯盟', color: 'rgb(255, 255, 255)' },
  { name: '藏國', color: 'rgb(70, 190, 127)' },
  { name: '維吾爾', color: 'rgb(116, 160, 246)' },
  { name: '哈薩克', color: 'rgb(0, 233, 228)' },  // 更新為實際顏色
  { name: '紅軍', color: 'rgb(253, 30, 25)' },
  { name: '新中國狂歡', color: 'rgb(109, 109, 109)' }
];

function getFactionColor(factionName) {
  const found = factionColorMap.find(f => f.name === factionName);
  return found ? found.color : 'rgb(109,109,109)';
}

function normalizeColor(color) {
  // 將 hex 轉 rgb，rgba 轉 rgb，並去除空格
  if (!color) return '';
  color = color.trim().replace(/\s+/g, '');
  // hex 轉 rgb
  if (color[0] === '#') {
    let r, g, b;
    if (color.length === 7) {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    } else if (color.length === 4) {
      r = parseInt(color[1] + color[1], 16);
      g = parseInt(color[2] + color[2], 16);
      b = parseInt(color[3] + color[3], 16);
    }
    return `rgb(${r},${g},${b})`;
  }
  // rgba 轉 rgb
  if (color.startsWith('rgba')) {
    const m = color.match(/rgba\((\d+),(\d+),(\d+),/);
    if (m) return `rgb(${m[1]},${m[2]},${m[3]})`;
  }
  // rgb 直接回傳
  if (color.startsWith('rgb')) return color.replace(/\s+/g, '');
  return color;
}

function getFactionByColor(color) {
  if (!color) return '未知';
  
  color = normalizeColor(color);
  color = color.replace(/\s+/g, '');
  
  // 先嘗試精確匹配（去除空格）
  let found = factionColorMap.find(f => f.color.replace(/\s+/g, '') === color);
  
  // 如果沒找到，嘗試模糊匹配（處理 rgb(7,162,188) vs rgb(7, 162, 188) 的差異）
  if (!found) {
    const match = color.match(/rgb\((\d+),(\d+),(\d+)\)/);
    if (match) {
      const r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
      found = factionColorMap.find(f => {
        const m = f.color.replace(/\s+/g, '').match(/rgb\((\d+),(\d+),(\d+)\)/);
        if (!m) return false;
        return parseInt(m[1]) === r && parseInt(m[2]) === g && parseInt(m[3]) === b;
      });
    }
  }
  
  return found ? found.name : '未知';
}

function getAllFactions() {
  return factionColorMap.map(f => ({ ...f }));
}

export { getFactionColor, getFactionByColor, getAllFactions };