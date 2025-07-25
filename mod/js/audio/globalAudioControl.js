// 全域音量控制與音訊攔截
// 可用 window.setBGMVolume(0~1) 和 window.setSEVolume(0~1) 控制音量

(function(){
    // --- Part 0: Helper --- 
    function getAudioTypeFromUrl(url) {
        if (typeof url !== 'string') {
            return null;
        }
        // Normalize URL for consistent matching
        const normalizedUrl = url.toLowerCase().replace(/\\/g, '/');

        if (!normalizedUrl.endsWith('.mp3')) {
            return null;
        }

        // Order of checking is important: from most specific to most general.
        
        // 1. Special case for battle report sound
        if (normalizedUrl.includes('se147.mp3')) {
            return 'SE147';
        }

        // 2. BGM paths (Removed leading slashes for broader matching)
        if (normalizedUrl.includes('audio/music/') || normalizedUrl.includes('passionfruit/audio/music/')) {
            return 'BGM';
        }

        // 3. General sound effects path (Removed leading slashes for broader matching)
        if (normalizedUrl.includes('passionfruit/audio/')) {
            return 'SE';
        }
        
        // 4. Fallback for any other mp3s that were not caught.
        return 'SE';
    }

    // --- Part 1: <audio>/<video> interception (Enhanced) ---
    const origSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    const origPlay = HTMLMediaElement.prototype.play;
    const origVolumeDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');

    Object.defineProperty(HTMLMediaElement.prototype, 'src', {
        ...origSrcDescriptor,
        set: function(url) {
            let correctedUrl = url;
            // Fix for game constructing bad URLs like "undefined/audio/music/BGM07.mp3"
            if (typeof url === 'string' && url.startsWith('undefined/')) {
                correctedUrl = url.substring(10); // "undefined/".length is 10
            }

            const type = getAudioTypeFromUrl(correctedUrl);
            this._rf_type = type;
            if (type === 'BGM') {
                this.volume = window._rf_bgm_volume ?? 1.0;
            } else if (type === 'SE147') {
                this.volume = window._rf_se_volume ?? 1.0;
            } else {
                this.volume = window._rf_se_volume ?? 1.0;
            }
            // Apply the corrected URL, not the original one
            return origSrcDescriptor.set.call(this, correctedUrl);
        }
    });

    HTMLMediaElement.prototype.play = function() {
        const type = this._rf_type || getAudioTypeFromUrl(this.currentSrc || this.src);
        if (type === 'SE147' && window._rf_se147Muted) {
            this.pause();
            this.currentTime = 0;
            return Promise.resolve();
        }
        return origPlay.apply(this, arguments);
    };

    // NEW: Intercept volume changes to enforce master volume
    if (origVolumeDescriptor) {
        Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
            get: origVolumeDescriptor.get,
            set: function(value) {
                // This setter is now the single point of truth for volume.
                // It ignores what the game's scripts are trying to set (`value`)
                // and instead applies our master volume.
                this._rf_intended_volume = value; // Store for debugging if needed

                const type = this._rf_type || getAudioTypeFromUrl(this.currentSrc || this.src);
                
                let newVolume;
                if (type === 'BGM') {
                    newVolume = window._rf_bgm_volume ?? 1.0;
                } else { // SE, SE147, or null
                    newVolume = window._rf_se_volume ?? 1.0;
                }
                
                // Only call the original setter if the volume actually needs to change to prevent potential issues.
                if (origVolumeDescriptor.get.call(this) !== newVolume) {
                    origVolumeDescriptor.set.call(this, newVolume);
                }
            }
        });
    }

    const OrigAudio = window.Audio;
    window.Audio = function(src) {
        return new OrigAudio(src);
    };
    window.Audio.prototype = OrigAudio.prototype;

    function setMediaVolume() {
        window._rf_is_setting_volume = true;
        try {
            document.querySelectorAll('audio,video').forEach(el => {
                const type = el._rf_type || getAudioTypeFromUrl(el.currentSrc || el.src || '');

                if (type === 'BGM') {
                    el.volume = window._rf_bgm_volume ?? 1.0;
                } else if (type === 'SE147') {
                    el.volume = window._rf_se_volume ?? 1.0;
                    el.muted = window._rf_se147Muted;
                } else { // SE or null
                    el.volume = window._rf_se_volume ?? 1.0;
                }
            });
        } finally {
            window._rf_is_setting_volume = false;
        }
    }

    // --- Part 2: Global Volume Control & Dedicated SE147 Player ---
    window._rf_bgm_volume = 1.0;
    window._rf_se_volume = 1.0;
    window._rf_se147Muted = false;
    window._rf_bgmGainNodes = [];
    window._rf_seGainNodes = [];

    let rf_se147_context = null;
    let rf_se147_gainNode = null;
    let rf_se147_buffer = null; // Cache the decoded buffer

    function initializeSe147Player() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext && !rf_se147_context) {
            try {
                rf_se147_context = new AudioContext();
                rf_se147_gainNode = rf_se147_context.createGain();
                rf_se147_gainNode.connect(rf_se147_context.destination);
                updateSe147Volume(); // Set initial volume
            } catch (e) {
                console.error("RF: Failed to create dedicated AudioContext for SE147", e);
            }
        }
    }

    function updateSe147Volume() {
        if (rf_se147_gainNode && rf_se147_context) {
            const newVolume = window._rf_se147Muted ? 0 : window._rf_se_volume;
            rf_se147_gainNode.gain.setValueAtTime(newVolume, rf_se147_context.currentTime);
        }
    }

    function playSe147(bufferOrUrl) {
        initializeSe147Player();
        if (!rf_se147_context || !rf_se147_gainNode) return;
        if (window._rf_se147Muted) return; // Don't play if muted

        const play = (buffer) => {
            try {
                const source = rf_se147_context.createBufferSource();
                source.buffer = buffer;
                source.connect(rf_se147_gainNode);
                source.start(0);
            } catch (e) {
                console.error("RF: Error playing SE147 sound:", e);
            }
        };

        if (typeof bufferOrUrl === 'string') { // It's a URL
            const url = bufferOrUrl;
            if (rf_se147_buffer) {
                play(rf_se147_buffer);
            } else {
                // Use original fetch to avoid hijacking loop
                origFetch(url)
                    .then(response => response.arrayBuffer())
                    .then(arrayBuffer => rf_se147_context.decodeAudioData(arrayBuffer))
                    .then(audioBuffer => {
                        rf_se147_buffer = audioBuffer; // Cache it
                        play(audioBuffer);
                    })
                    .catch(e => console.error("RF: Error fetching/decoding SE147:", e));
            }
        } else if (bufferOrUrl) { // It's an AudioBuffer
            const buffer = bufferOrUrl;
            if (!rf_se147_buffer) {
                rf_se147_buffer = buffer; // Cache it for future plays
            }
            play(buffer);
        }
    }

    window.setBGMVolume = function(v) {
        window._rf_bgm_volume = v;
        setMediaVolume();
        window._rf_bgmGainNodes.forEach(node => {
            if (node && node.gain) node.gain.value = v;
        });
        // 新增：同步存檔，並加上錯誤提示
        if (window.pywebview && window.pywebview.api && window.pywebview.api.save_config_volume) {
            window.pywebview.api.save_config_volume({
                bgm: v,
                se: window._rf_se_volume,
                se147Muted: window._rf_se147Muted
            }).catch(e => { console.error('音量設定保存失敗', e); });
        } else {
            console.warn('pywebview API 尚未注入，音量設定未保存');
        }
    };

    window.setSEVolume = function(v) {
        window._rf_se_volume = v;
        setMediaVolume();
        window._rf_seGainNodes.forEach(node => {
            if (node && node.gain) node.gain.value = v;
        });
        updateSe147Volume();
        // 新增：同步存檔，並加上錯誤提示
        if (window.pywebview && window.pywebview.api && window.pywebview.api.save_config_volume) {
            window.pywebview.api.save_config_volume({
                bgm: window._rf_bgm_volume,
                se: v,
                se147Muted: window._rf_se147Muted
            }).catch(e => { console.error('音量設定保存失敗', e); });
        } else {
            console.warn('pywebview API 尚未注入，音量設定未保存');
        }
    };

    // 增加參數 skipSave 用於控制是否跳過保存設置
    window.setSE147Muted = function(muted, skipSave = false) {
        // 設置全局變量
        window._rf_se147Muted = muted;
        setMediaVolume();
        updateSe147Volume();
        
        // 同步更新UI元素
        const se147Button = document.getElementById('se147-toggle-button');
        const se147Toggle = document.getElementById('se147-toggle');
        
        // 更新按鈕狀態
        if (se147Button) {
            se147Button.textContent = `戰報通知：${!muted ? '開' : '關'}`;
            se147Button.style.backgroundColor = !muted ? '#5cb85c' : '#d9534f';
        }
        
        // 更新複選框狀態
        if (se147Toggle) {
            se147Toggle.checked = muted;
        }
        
        // 只在不跳過保存設置時才執行保存操作
        if (!skipSave) {
            // 保存到 config.json
            if (window.pywebview && window.pywebview.api && window.pywebview.api.save_config_volume) {
                window.pywebview.api.save_config_volume({
                    bgm: window._rf_bgm_volume,
                    se: window._rf_se_volume,
                    se147Muted: muted
                }).catch(e => { console.error('戰報通知狀態保存失敗', e); });
            } else {
                console.warn('pywebview API 尚未注入，戰報通知狀態未保存');
            }
        }
    };

    // 初始化戰報通知按鈕狀態
    const se147Button = document.getElementById('se147-toggle-button');
    const se147Toggle = document.getElementById('se147-toggle');
    if (se147Button && se147Toggle) {
        se147Button.addEventListener('click', function() {
            const newState = !se147Toggle.checked;
            se147Toggle.checked = newState;
            window.setSE147Muted(!newState);
        });
        // 初始化狀態
        const initialState = !window._rf_se147Muted;
        se147Toggle.checked = initialState;
        se147Button.textContent = `戰報通知：${initialState ? '開' : '關'}`;
        se147Button.style.backgroundColor = initialState ? '#5cb85c' : '#d9534f';
    }

    // 新增：強制更新狀態
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

    // REMOVED: No longer needed with volume interception.
    // setInterval(setMediaVolume, 50); 

    // --- Part 3: Web Audio API Interception (HIJACKING IMPLEMENTATION) ---
    const OrigAudioContext = window.AudioContext || window.webkitAudioContext;
    if (!OrigAudioContext) return;

    const audioBufferTypes = new WeakMap();

    // 1a. Intercept fetch
    const origFetch = window.fetch;
    window.fetch = function(resource, options) {
        const url = resource instanceof Request ? resource.url : resource;
        const type = getAudioTypeFromUrl(url);

        const promise = origFetch.apply(this, arguments);
        if (type) { // BGM or SE
            return promise.then(response => {
                const clone = response.clone();
                const originalArrayBuffer = clone.arrayBuffer;
                clone.arrayBuffer = function() {
                    return originalArrayBuffer.apply(this, arguments).then(arrayBuffer => {
                        try {
                            arrayBuffer._rf_type = type;
                        } catch (e) {
                            console.warn("RF: Failed to tag ArrayBuffer from fetch", e);
                        }
                        return arrayBuffer;
                    });
                };
                return clone;
            });
        }
        return promise;
    };

    // 1b. Intercept XMLHttpRequest
    const origXhrOpen = window.XMLHttpRequest.prototype.open;
    const origXhrSend = window.XMLHttpRequest.prototype.send;
    window.XMLHttpRequest.prototype.open = function(method, url, ...args) {
        const type = getAudioTypeFromUrl(url);
        if (type) {
            this._rf_type = type;
            this._rf_url = url;
        }
        return origXhrOpen.apply(this, arguments);
    };
    window.XMLHttpRequest.prototype.send = function() {
        if (this._rf_type && this.responseType === 'arraybuffer') {
            const type = this._rf_type;
            const origOnLoad = this.onload;
            this.onload = function() {
                if (this.response) {
                    try {
                        this.response._rf_type = type;
                    } catch (e) {
                        console.warn('RF: Could not tag ArrayBuffer from XHR:', e);
                    }
                }
                if (origOnLoad) {
                    origOnLoad.apply(this, arguments);
                }
            };
        }
        return origXhrSend.apply(this, arguments);
    };

    // 2. Intercept decodeAudioData to tag the final AudioBuffer
    const origDecodeAudioData = OrigAudioContext.prototype.decodeAudioData;
    OrigAudioContext.prototype.decodeAudioData = function(audioData, ...args) {
        const type = audioData ? audioData._rf_type : null;
        if (type) {
            const promise = origDecodeAudioData.apply(this, [audioData, ...args]);
            return promise.then(buffer => {
                audioBufferTypes.set(buffer, type);
                return buffer;
            });
        }
        return origDecodeAudioData.apply(this, [audioData, ...args]);
    };

    // 3. Intercept AudioNode.connect to group GainNodes
    const AudioNodeProto = (window.AudioNode || window.webkitAudioNode)?.prototype;
    if (AudioNodeProto && AudioNodeProto.connect) {
        const origConnect = AudioNodeProto.connect;
        AudioNodeProto.connect = function(destination) {
            if (this.buffer && destination) {
                const bufferType = audioBufferTypes.get(this.buffer);

                // HIJACK SE147
                if (bufferType === 'SE147') {
                    playSe147(this.buffer); // Play it with our own player
                    return destination; // Prevent original connection by returning here, but allow chaining
                }

                if (destination.gain) {
                    if (bufferType === 'BGM') {
                        if (!window._rf_bgmGainNodes.includes(destination)) {
                            window._rf_bgmGainNodes.push(destination);
                        }
                        destination.gain.value = window._rf_bgm_volume ?? 1.0;
                    } else if (bufferType === 'SE') {
                        if (!window._rf_seGainNodes.includes(destination)) {
                            window._rf_seGainNodes.push(destination);
                        }
                        destination.gain.value = window._rf_se_volume ?? 1.0;
                    }
                }
            }
            return origConnect.apply(this, arguments);
        };
    }

    // 初始化音量與戰報通知設定
    if (window.pywebview && window.pywebview.api && window.pywebview.api.get_config_volume) {
        window.pywebview.api.get_config_volume().then(cfg => {
            // 不使用 setBGMVolume/setSEVolume 來避免觸發保存操作
            // 只設置內存中的值和音頻節點，但不觸發配置保存
            if (typeof cfg.bgm === 'number') {
                window._rf_bgm_volume = cfg.bgm;
                window._rf_bgmGainNodes.forEach(node => {
                    if (node && node.gain) node.gain.value = cfg.bgm;
                });
                setMediaVolume();
            }
            
            if (typeof cfg.se === 'number') {
                window._rf_se_volume = cfg.se;
                window._rf_seGainNodes.forEach(node => {
                    if (node && node.gain) node.gain.value = cfg.se;
                });
                setMediaVolume();
                updateSe147Volume();
            }
            
            if (typeof cfg.se147Muted === 'boolean') {
                // 使用 skipSave=true 來避免在初始化時保存設置
                window.setSE147Muted(cfg.se147Muted, true);
            }
            
            // 若 customControls.js 已載入，則同步 UI
            if (window.updateCustomControlsUI) window.updateCustomControlsUI(cfg);
        });
    }
})();