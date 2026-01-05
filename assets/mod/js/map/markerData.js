// 用於管理地圖據點資料的模組
import YAML from 'js-yaml';
import * as api from '../core/api.js';

const YAML_FILE = 'RFcity.yaml';

export async function saveMarkerDataToYaml(markerData) {
    const yamlStr = YAML.dump(markerData);
    // 儲存到本地 RFcity.yaml
    await api.saveYaml(YAML_FILE, yamlStr);
}

export async function loadMarkerDataFromYaml() {
    // 桌面版（pywebview）
    if (window.pywebview) {
        try {
            const yamlStr = await api.loadYaml(YAML_FILE);
            return YAML.load(yamlStr) || {};
        } catch (e) {
            console.warn('[markerData] 桌面版讀取 RFcity.yaml 失敗:', e);
            return {};
        }
    } else {
        // 網頁版：直接 fetch yaml 檔
        try {
            // 用相對路徑，避免靜態主機根目錄問題
            const res = await fetch('mod/data/RFcity.yaml');
            if (!res.ok) {
                console.warn('[markerData] fetch RFcity.yaml 失敗，HTTP 狀態:', res.status);
                return {};
            }
            const yamlStr = await res.text();
            const data = YAML.load(yamlStr) || {};
            if (Object.keys(data).length === 0) {
                console.warn('[markerData] RFcity.yaml 內容為空或格式錯誤');
            }
            return data;
        } catch (e) {
            console.warn('[markerData] 網頁版讀取 RFcity.yaml 失敗:', e);
            return {};
        }
    }
}

export function importYamlFile(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = YAML.load(e.target.result);
            if (data) {
                callback(data);
            }
        } catch {}
    };
    reader.readAsText(file);
}