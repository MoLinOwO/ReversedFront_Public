// 音量與通知控制
export function setupAudioControls(controlsPanel) {
    if (!document.getElementById('rf-audio-controls')) {
        const audioContainer = document.createElement('div');
        audioContainer.id = 'rf-audio-controls';
        audioContainer.innerHTML = `
            <div style="border-top: 1px solid #555; margin: 16px 0 12px 0;"></div>
            <div style="margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; font-size: 0.95em;">
                <label for="bgm-volume-slider" style="margin-right: 10px;">BGM音量</label>
                <input type="range" id="bgm-volume-slider" min="0" max="1" step="0.01" value="1" style="flex-grow: 1; margin: 0 8px; accent-color:#2a7cff;">
                <span class="volume-value" style="width: 30px; text-align: right; font-variant-numeric: tabular-nums;">100</span>
            </div>
            <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; font-size: 0.95em;">
                <label for="se-volume-slider" style="margin-right: 10px;">音效音量</label>
                <input type="range" id="se-volume-slider" min="0" max="1" step="0.01" value="1" style="flex-grow: 1; margin: 0 8px; accent-color:#1dbf60;">
                <span class="volume-value" style="width: 30px; text-align: right; font-variant-numeric: tabular-nums;">100</span>
            </div>
            <div style="margin-bottom: 4px;">
                <button id="se147-toggle-button" style="width:100%; background:#5cb85c; color:#fff; border:none; padding:8px 0; border-radius:6px; cursor:pointer; font-size: 0.95em; transition: background-color 0.2s;">戰報通知：開</button>
                <input type="checkbox" id="se147-toggle" checked style="display: none;">
            </div>
        `;
        controlsPanel.appendChild(audioContainer);
    }
    window.updateCustomControlsUI = function(cfg) {
        if (!cfg) return;
        const bgmSlider = document.getElementById('bgm-volume-slider');
        const bgmValueSpan = bgmSlider ? bgmSlider.parentElement.querySelector('.volume-value') : null;
        if (bgmSlider && typeof cfg.bgm === 'number') {
            bgmSlider.value = cfg.bgm;
            if (bgmValueSpan) bgmValueSpan.textContent = Math.round(cfg.bgm * 100);
        }
        const seSlider = document.getElementById('se-volume-slider');
        const seValueSpan = seSlider ? seSlider.parentElement.querySelector('.volume-value') : null;
        if (seSlider && typeof cfg.se === 'number') {
            seSlider.value = cfg.se;
            if (seValueSpan) seValueSpan.textContent = Math.round(cfg.se * 100);
        }
        const se147Toggle = document.getElementById('se147-toggle');
        const se147Button = document.getElementById('se147-toggle-button');
        if (se147Toggle && se147Button && typeof cfg.se147Muted === 'boolean') {
            const isEnabled = !cfg.se147Muted;
            se147Toggle.checked = isEnabled;
            se147Button.textContent = `戰報通知：${isEnabled ? '開' : '關'}`;
            se147Button.style.backgroundColor = isEnabled ? '#5cb85c' : '#d9534f';
        }
    };
    const bgmSlider = document.getElementById('bgm-volume-slider');
    if (bgmSlider) {
        bgmSlider.addEventListener('input', function() {
            const value = Number(this.value);
            if (window.setBGMVolume) window.setBGMVolume(value);
            this.parentElement.querySelector('.volume-value').textContent = Math.round(value * 100);
        });
    }
    const seSlider = document.getElementById('se-volume-slider');
    if (seSlider) {
        seSlider.addEventListener('input', function() {
            const value = Number(this.value);
            if (window.setSEVolume) window.setSEVolume(value);
            this.parentElement.querySelector('.volume-value').textContent = Math.round(value * 100);
        });
    }
    const se147Button = document.getElementById('se147-toggle-button');
    const se147Toggle = document.getElementById('se147-toggle');
    if (se147Button && se147Toggle) {
        let isWriting = false;
        se147Button.addEventListener('click', async function() {
            if (isWriting) return;
            isWriting = true;
            se147Button.disabled = true;
            const newState = !se147Toggle.checked;
            if (window.setSE147Muted) {
                try {
                    await window.setSE147Muted(!newState);
                    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_config_volume) {
                        const cfg = await window.pywebview.api.get_config_volume();
                        window.updateCustomControlsUI(cfg);
                    }
                } catch (e) {
                    console.error('設定寫入或同步失敗', e);
                }
            }
            se147Button.disabled = false;
            isWriting = false;
        });
    }
    let hasSynced = false;
    const initialSync = () => {
        if (hasSynced) return;
        if (window.pywebview && window.pywebview.api && window.pywebview.api.get_config_volume) {
            hasSynced = true;
            window.pywebview.api.get_config_volume().then(cfg => {
                if (window.setBGMVolume && typeof cfg.bgm === 'number') window.setBGMVolume(cfg.bgm);
                if (window.setSEVolume && typeof cfg.se === 'number') window.setSEVolume(cfg.se);
                if (window.setSE147Muted && typeof cfg.se147Muted === 'boolean') window.setSE147Muted(cfg.se147Muted);
                window.updateCustomControlsUI(cfg);
            }).catch(e => { 
                console.error("Initial config sync failed:", e);
                hasSynced = false;
            });
        } else {
             setTimeout(initialSync, 250);
        }
    };
    window.addEventListener('pywebviewready', initialSync);
    document.addEventListener('DOMContentLoaded', initialSync);
}
