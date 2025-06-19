// 用於管理地圖據點資料的模組
import YAML from 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm';
import * as api from './api.js';

const YAML_FILE = 'mod/data/RFcity.yaml';

export async function saveMarkerDataToYaml(markerData) {
    const yamlStr = YAML.dump(markerData);
    // 儲存到本地 RFcity.yaml
    await api.saveYaml(YAML_FILE, yamlStr);
}

export async function loadMarkerDataFromYaml() {
    try {
        const yamlStr = await api.loadYaml(YAML_FILE);
        return YAML.load(yamlStr) || {};
    } catch {
        return {};
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
