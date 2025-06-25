// marker 資料處理與工具
const colorFactionMap = {
    'rgb(0, 138, 247)': '蒙古',
    'rgb(7, 162, 188)': '臺灣',
    'rgb(252, 185, 0)': '滿洲',
    'rgb(174, 67, 236)': '香港',
    'rgb(255, 255, 255)': '反賊聯盟',
    'rgb(70, 190, 127)': '藏國',
    'rgb(116, 160, 246)': '維吾爾',
    'rgb(0, 205, 197)': '哈薩克',
    'rgb(253, 30, 25)': '紅軍',
    'rgb(109, 109, 109)': '新中國狂歡'
};
function getCityName(marker) {
    let cityDiv = marker.parentElement && marker.parentElement.querySelector('[class*="CityName"], [class*="cityName"]');
    if (cityDiv) return cityDiv.textContent.trim();
    return marker.style.left + ',' + marker.style.top;
}
function getMarkerId(marker) {
    return marker.style.left + '_' + marker.style.top;
}
function getFactionByColor(color) {
    return colorFactionMap[color] || '未知';
}
function getAllUniqueValues(markerData, field) {
    const values = new Set();
    Object.values(markerData).forEach(d => {
        if (Array.isArray(d[field])) {
            d[field].forEach(v => values.add(v));
        } else if (d[field]) {
            values.add(d[field]);
        }
    });
    return Array.from(values).filter(Boolean);
}
function getAllRewardCombos(markerData) {
    const combos = new Set();
    Object.values(markerData).forEach(d => {
        if (Array.isArray(d.reward) && d.reward.length) {
            combos.add(d.reward.join(','));
        }
    });
    return Array.from(combos).filter(Boolean);
}
export { getCityName, getMarkerId, getFactionByColor, getAllUniqueValues, getAllRewardCombos };