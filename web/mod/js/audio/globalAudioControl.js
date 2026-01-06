// 全域音訊控制模組
// 提供音量控制、passionfruit 資源後台下載檢測功能

(function() {
    // 辨識音訊類型
    function getAudioTypeFromUrl(url) {
        if (typeof url !== 'string') return null;
        const normalizedUrl = url.toLowerCase().replace(/\\/g, '/');
        if (!normalizedUrl.endsWith('.mp3')) return null;

        if (normalizedUrl.includes('se147.mp3')) return 'SE147';
        if (normalizedUrl.includes('audio/music/') || normalizedUrl.includes('passionfruit/audio/music/')) return 'BGM';
        if (normalizedUrl.includes('passionfruit/audio/')) return 'SE';
        
        return 'SE';
    }

    // 保存原始描述符
    const origSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    const origVolumeDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');

    // 攔截媒體錯誤避免干擾
    document.addEventListener('error', function(e) {
        if (e.target.tagName === 'AUDIO' || e.target.tagName === 'VIDEO') {
            e.stopImmediatePropagation();
            e.stopPropagation();
            e.preventDefault();
        }
    }, true);

    // 監聽 HTMLMediaElement src（檢測 passionfruit 資源並觸發後台下載）
    Object.defineProperty(HTMLMediaElement.prototype, 'src', {
        ...origSrcDescriptor,
        set: function(url) {
            if (typeof url !== 'string') {
                return origSrcDescriptor.set.call(this, url);
            }

            // 修正錯誤路徑
            let correctedUrl = url.startsWith('undefined/') ? url.substring(10) : url;
            
            const type = getAudioTypeFromUrl(correctedUrl);
            this._rf_type = type;
            
            // 只處理音訊，非音訊直接放行
            if (!type) {
                return origSrcDescriptor.set.call(this, correctedUrl);
            }
            
            // 檢測 passionfruit 音訊資源並觸發後台下載（不攔截原始請求）
            if (window.__TAURI__?.invoke && !correctedUrl.startsWith('http://') && !correctedUrl.startsWith('https://')) {
                const passionfruitMatch = correctedUrl.match(/(?:assets\/)?passionfruit\/(.+)$/);
                
                if (passionfruitMatch) {
                    let cleanUrl = `passionfruit/${passionfruitMatch[1]}`;
                    // 異步觸發後台下載
                    window.__TAURI__.invoke('check_resource_exists', { resourcePath: cleanUrl })
                        .catch(() => {}); // 靜默失敗
                } else {
                    // 假設 audio/ 開頭的路徑是 passionfruit 資源
                    let clean = correctedUrl.replace(/^\.\//, '');
                    if (clean.startsWith('audio/')) {
                        let cleanUrl = `passionfruit/${clean}`;
                        window.__TAURI__.invoke('check_resource_exists', { resourcePath: cleanUrl })
                            .catch(() => {});
                    }
                }
            }

            // 設置音量（不攔截原始請求）
            this.volume = (type === 'BGM') ? (window._rf_bgm_volume ?? 1.0) : (window._rf_se_volume ?? 1.0);
            return origSrcDescriptor.set.call(this, correctedUrl);
        }
    });

    // 攔截 play 方法以套用音量
    const origPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
        const type = this._rf_type || getAudioTypeFromUrl(this.currentSrc || this.src || '');
        if (type) {
            const targetVolume = (type === 'BGM') ? (window._rf_bgm_volume ?? 1.0) : (window._rf_se_volume ?? 1.0);
            if (this.volume !== targetVolume) {
                this.volume = targetVolume;
            }
            if (type === 'SE147' && window._rf_se147Muted) {
                this.muted = true;
            }
        }
        return origPlay.apply(this, arguments);
    };

    // 攔截 volume setter 以應用全域音量
    if (origVolumeDescriptor && origVolumeDescriptor.set) {
        Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
            get: origVolumeDescriptor.get,
            set: function(value) {
                const type = this._rf_type || getAudioTypeFromUrl(this.currentSrc || this.src);
                if (!type) return origVolumeDescriptor.set.call(this, value);
                
                this._rf_intended_volume = value;
                const newVolume = (type === 'BGM') ? (window._rf_bgm_volume ?? 1.0) : (window._rf_se_volume ?? 1.0);
                
                if (origVolumeDescriptor.get.call(this) !== newVolume) {
                    origVolumeDescriptor.set.call(this, newVolume);
                }
            }
        });
    }

    // 批量設置所有媒體元素音量
    function setMediaVolume() {
        document.querySelectorAll('audio,video').forEach(el => {
            const type = el._rf_type || getAudioTypeFromUrl(el.currentSrc || el.src || '');
            if (type === 'BGM') {
                el.volume = window._rf_bgm_volume ?? 1.0;
            } else if (type === 'SE147') {
                el.volume = window._rf_se_volume ?? 1.0;
                el.muted = window._rf_se147Muted;
            } else if (type) {
                el.volume = window._rf_se_volume ?? 1.0;
            }
        });
    }

    // 全域音量變數初始化
    window._rf_bgm_volume = 1.0;
    window._rf_se_volume = 1.0;
    window._rf_se147Muted = false;
    window._rf_bgmGainNodes = [];
    window._rf_seGainNodes = [];

    // SE147 專用 AudioContext
    let rf_se147_context = null;
    let rf_se147_gainNode = null;
    let rf_se147_buffer = null;

    // SE147 播放器初始化
    function initSE147Player() {
        if (rf_se147_context) return;
        
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        rf_se147_context = new AudioContext();
        rf_se147_gainNode = rf_se147_context.createGain();
        rf_se147_gainNode.connect(rf_se147_context.destination);
        rf_se147_gainNode.gain.value = window._rf_se_volume ?? 1.0;

        // 載入 SE147 音訊檔案
        const se147Url = './passionfruit/audio/SE147.mp3';
        fetch(se147Url)
            .then(response => response.arrayBuffer())
            .then(buffer => rf_se147_context.decodeAudioData(buffer))
            .then(audioBuffer => {
                rf_se147_buffer = audioBuffer;
            })
            .catch(() => {});
    }

    // 播放 SE147
    window.playSE147 = function() {
        if (window._rf_se147Muted) return;
        
        initSE147Player();
        if (!rf_se147_buffer || !rf_se147_context) return;

        const source = rf_se147_context.createBufferSource();
        source.buffer = rf_se147_buffer;
        source.connect(rf_se147_gainNode);
        source.start(0);
    };

    // BGM 音量控制
    window.setBGMVolume = function(volume, skipSave) {
        window._rf_bgm_volume = Math.max(0, Math.min(1, volume));
        setMediaVolume();
        
        window._rf_bgmGainNodes.forEach(node => {
            if (node && node.gain) {
                node.gain.setValueAtTime(window._rf_bgm_volume, node.context.currentTime);
            }
        });

        if (!skipSave && window.__TAURI__?.invoke) {
            window.__TAURI__.invoke('save_config_volume', {
                data: JSON.stringify({
                    bgm: window._rf_bgm_volume,
                    se: window._rf_se_volume,
                    se147Muted: window._rf_se147Muted
                })
            }).catch(() => {});
        }
    };

    // SE 音量控制
    window.setSEVolume = function(volume, skipSave) {
        window._rf_se_volume = Math.max(0, Math.min(1, volume));
        setMediaVolume();

        if (rf_se147_gainNode && rf_se147_gainNode.gain) {
            rf_se147_gainNode.gain.setValueAtTime(window._rf_se_volume, rf_se147_gainNode.context.currentTime);
        }
        
        window._rf_seGainNodes.forEach(node => {
            if (node && node.gain) {
                node.gain.setValueAtTime(window._rf_se_volume, node.context.currentTime);
            }
        });

        if (!skipSave && window.__TAURI__?.invoke) {
            window.__TAURI__.invoke('save_config_volume', {
                data: JSON.stringify({
                    bgm: window._rf_bgm_volume,
                    se: window._rf_se_volume,
                    se147Muted: window._rf_se147Muted
                })
            }).catch(() => {});
        }
    };

    // SE147 靜音控制
    window.setSE147Muted = function(muted, skipSave) {
        window._rf_se147Muted = !!muted;
        setMediaVolume();

        if (!skipSave && window.__TAURI__?.invoke) {
            window.__TAURI__.invoke('save_config_volume', {
                data: JSON.stringify({
                    bgm: window._rf_bgm_volume,
                    se: window._rf_se_volume,
                    se147Muted: muted
                })
            }).catch(() => {});
        }
    };

    // 強制更新 SE147 按鈕狀態
    window.forceUpdateSE147Button = function() {
        const se147Button = document.getElementById('se147-toggle-button');
        const se147Toggle = document.getElementById('se147-toggle');
        if (se147Button && se147Toggle) {
            const currentState = !window._rf_se147Muted;
            se147Toggle.checked = currentState;
            se147Button.textContent = `戰報通知：${currentState ? '開' : '關'}`;
            se147Button.style.backgroundColor = currentState ? '#5cb85c' : '#d9534f';
        }
    };

    // Web Audio API 攔截（用於追蹤 AudioBuffer 類型並套用音量）
    (function initWebAudioInterception() {
        const OrigAudioContext = window.AudioContext || window.webkitAudioContext;
        if (!OrigAudioContext) return;

        const audioBufferTypes = new WeakMap();

        // 攔截 fetch（標記音訊類型）
        const origFetch = window.fetch;
        window.fetch = function(resource, options) {
            const url = resource instanceof Request ? resource.url : resource;
            const type = getAudioTypeFromUrl(url);

            const promise = origFetch.apply(this, arguments);
            
            if (type) {
                promise.then(response => {
                    const clone = response.clone();
                    clone.arrayBuffer().then(buffer => {
                        audioBufferTypes.set(buffer, type);
                    }).catch(() => {});
                    return response;
                }).catch(() => {});
            }

            return promise;
        };

        // 攔截 XMLHttpRequest（標記音訊類型）
        const OrigXHR = XMLHttpRequest;
        const origXhrOpen = OrigXHR.prototype.open;
        OrigXHR.prototype.open = function(method, url, ...args) {
            this._rf_url = url;
            return origXhrOpen.call(this, method, url, ...args);
        };

        const origXhrSend = OrigXHR.prototype.send;
        OrigXHR.prototype.send = function(...args) {
            const url = this._rf_url;
            if (url) {
                const type = getAudioTypeFromUrl(url);
                if (type) {
                    this.addEventListener('load', function() {
                        if (this.response instanceof ArrayBuffer) {
                            audioBufferTypes.set(this.response, type);
                        }
                    });
                }
            }
            return origXhrSend.apply(this, args);
        };

        // 攔截 decodeAudioData（獲取類型並標記 AudioBuffer）
        const origDecodeAudioData = OrigAudioContext.prototype.decodeAudioData;
        OrigAudioContext.prototype.decodeAudioData = function(audioData, successCallback, errorCallback) {
            const type = audioBufferTypes.get(audioData);
            
            const wrappedSuccess = function(decodedBuffer) {
                if (type) {
                    audioBufferTypes.set(decodedBuffer, type);
                }
                if (successCallback) {
                    return successCallback(decodedBuffer);
                }
            };

            if (successCallback) {
                return origDecodeAudioData.call(this, audioData, wrappedSuccess, errorCallback);
            } else {
                return origDecodeAudioData.call(this, audioData).then(decodedBuffer => {
                    if (type) {
                        audioBufferTypes.set(decodedBuffer, type);
                    }
                    return decodedBuffer;
                });
            }
        };

        // 攔截 createBufferSource（套用音量）
        const origCreateBufferSource = OrigAudioContext.prototype.createBufferSource;
        OrigAudioContext.prototype.createBufferSource = function() {
            const source = origCreateBufferSource.call(this);
            const origSourceConnect = source.connect;

            source.connect = function(destination, ...args) {
                const buffer = this.buffer;
                if (buffer) {
                    const type = audioBufferTypes.get(buffer);
                    
                    if (type) {
                        const gainNode = source.context.createGain();
                        
                        if (type === 'BGM') {
                            gainNode.gain.value = window._rf_bgm_volume ?? 1.0;
                            window._rf_bgmGainNodes.push(gainNode);
                        } else {
                            gainNode.gain.value = window._rf_se_volume ?? 1.0;
                            window._rf_seGainNodes.push(gainNode);
                        }
                        
                        origSourceConnect.call(this, gainNode);
                        gainNode.connect(destination, ...args);
                        return gainNode;
                    }
                }
                
                return origSourceConnect.call(this, destination, ...args);
            };

            return source;
        };
    })();

    // 載入儲存的音量設定
    window.loadAudioConfig = function() {
        if (!window.__TAURI__?.invoke) return;

        window.__TAURI__.invoke('get_config_volume', {})
            .then(cfg => {
                if (typeof cfg.bgm === 'number') {
                    window.setBGMVolume(cfg.bgm, true);
                }
                
                if (typeof cfg.se === 'number') {
                    window.setSEVolume(cfg.se, true);
                }
                
                if (typeof cfg.se147Muted === 'boolean') {
                    window.setSE147Muted(cfg.se147Muted, true);
                }
            })
            .catch(() => {});
    };
})();
