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
    const origLoad = HTMLMediaElement.prototype.load;

    // 全局媒體錯誤處理，防止加載失敗導致頁面崩潰
    document.addEventListener('error', function(e) {
        if (e.target.tagName === 'AUDIO' || e.target.tagName === 'VIDEO') {
            console.warn('[媒體加載失敗 - 已阻止冒泡]', {
                tag: e.target.tagName,
                src: e.target.src,
                currentSrc: e.target.currentSrc,
                error: e.target.error
            });
            // 阻止錯誤冒泡，防止觸發全局錯誤處理
            e.stopImmediatePropagation();
            e.stopPropagation();
            e.preventDefault();
        }
    }, true);

    // 攔截 HTMLMediaElement.load 方法，添加錯誤處理
    HTMLMediaElement.prototype.load = function() {
        // 先移除舊的錯誤監聽器（如果有）
        if (this._rfErrorHandler) {
            this.removeEventListener('error', this._rfErrorHandler);
        }
        
        // 添加新的錯誤處理器
        this._rfErrorHandler = function(e) {
            console.warn('[媒體加載錯誤 - 已捕獲]', {
                tag: this.tagName,
                src: this.src,
                currentSrc: this.currentSrc,
                errorCode: this.error ? this.error.code : 'unknown',
                errorMessage: this.error ? this.error.message : 'unknown'
            });
            // 阻止錯誤冒泡
            e.stopImmediatePropagation();
            e.stopPropagation();
            e.preventDefault();
        }.bind(this);
        
        this.addEventListener('error', this._rfErrorHandler, true);
        
        // 調用原始 load 方法
        return origLoad.call(this);
    };

    Object.defineProperty(HTMLMediaElement.prototype, 'src', {
        ...origSrcDescriptor,
        set: function(url) {
            console.log(`%c[音訊] src setter 被調用: ${url}`, 'color: #00aaff; font-size: 11px');
            
            // 如果正在加載 CDN，忽略 React 的重設
            if (this._rf_loading_cdn && !url.startsWith('http')) {
                console.log(`%c[音訊] 正在加載 CDN，忽略重設: ${url}`, 'color: #ff9800; font-size: 11px');
                return;
            }
            
            let correctedUrl = url;
            
            // Fix for game constructing bad URLs like "undefined/audio/music/BGM07.mp3"
            if (typeof url === 'string' && url.startsWith('undefined/')) {
                correctedUrl = url.substring(10); // "undefined/".length is 10
            }
            
            // 檢查檔案類型 - 只處理音訊檔案
            const type = getAudioTypeFromUrl(correctedUrl);
            this._rf_type = type;
            
            // 如果不是音訊檔案（例如影片），直接設置不攔截
            if (type === null) {
                console.log(`%c[音訊] 非音訊檔案，直接設置: ${correctedUrl}`, 'color: #888; font-size: 10px');
                return origSrcDescriptor.set.call(this, correctedUrl);
            }
            
            // 對所有音訊路徑重定向到本地服務器（但不攔截完整的 HTTP/HTTPS URL）
            if (typeof correctedUrl === 'string' && window.__TAURI__) {
                // 如果已經是完整的 HTTP/HTTPS URL，直接使用（不攔截 CDN）
                if (correctedUrl.startsWith('http://') || correctedUrl.startsWith('https://')) {
                    console.log(`%c[音訊] 完整 URL，不攔截: ${correctedUrl}`, 'color: #888; font-size: 10px');
                    
                    // 標記正在加載 CDN
                    this._rf_loading_cdn = true;
                    
                    // 先停止當前播放，確保可以設置新的 src
                    try {
                        this.pause();
                        this.currentTime = 0;
                    } catch (e) {
                        // 忽略錯誤
                    }
                    
                    // 直接設置 CDN URL
                    origSrcDescriptor.set.call(this, correctedUrl);
                    
                    // 設置音訊音量
                    if (type === 'BGM') {
                        this.volume = window._rf_bgm_volume ?? 1.0;
                    } else if (type === 'SE147') {
                        this.volume = window._rf_se_volume ?? 1.0;
                    } else {
                        this.volume = window._rf_se_volume ?? 1.0;
                    }
                    
                    // 強制重新加載新的 src
                    try {
                        this.load();
                        console.log(`%c[音訊] CDN URL 已設置並重新加載: ${correctedUrl}`, 'color: #00ff00; font-size: 11px');
                    } catch (e) {
                        console.warn('[音訊] load() 調用失敗:', e);
                    }
                    
                    return;
                } else {
                    // 提取資源路徑
                    let resourcePath;
                    let isPassionfruit = false;
                    
                    const passionfruitMatch = correctedUrl.match(/(?:assets\/)?passionfruit\/(.+)$/);
                    
                    if (passionfruitMatch) {
                        resourcePath = passionfruitMatch[1];
                        isPassionfruit = true;
                    } else {
                        // 對於 audio/music/BGM10.mp3 這樣的路徑，假設它是 passionfruit 資源
                        // 除非它明確看起來像 static
                        let clean = correctedUrl.replace(/^\.\//, '');
                        if (clean.startsWith('static/')) {
                            // 不攔截 static
                            isPassionfruit = false;
                        } else {
                            resourcePath = clean;
                            isPassionfruit = true;
                        }
                    }
                    
                    const originalUrl = correctedUrl;
                    if (isPassionfruit) {
                        correctedUrl = `http://localhost:8765/passionfruit/${resourcePath}`;
                        console.log(`%c[音訊] 重定向: ${originalUrl} -> ${correctedUrl}`, 'color: #00ff00; font-size: 11px');
                    } else {
                        // 不做任何改變
                        console.log(`%c[音訊] 不攔截: ${originalUrl}`, 'color: #888; font-size: 11px');
                    }
                }
            }

            // 設置音訊音量
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
        
        // 如果是影片或非音訊檔案，直接播放不攔截
        if (type === null) {
            // 捕獲播放錯誤，防止 Promise 拒絕導致頁面重載
            const playPromise = origPlay.apply(this, arguments);
            if (playPromise && playPromise.catch) {
                return playPromise.catch(err => {
                    console.warn('[媒體播放失敗 - 已捕獲]', {
                        tag: this.tagName,
                        src: this.src,
                        currentSrc: this.currentSrc,
                        error: err.name + ': ' + err.message
                    });
                    // 返回已解決的 Promise，防止錯誤冒泡
                    return Promise.resolve();
                });
            }
            return playPromise;
        }
        
        // 如果是 CDN URL 且 currentSrc 還沒更新，等待加載完成
        if (this.src && (this.src.startsWith('http://') || this.src.startsWith('https://')) && 
            this.src !== this.currentSrc && !this.src.includes('localhost:8765')) {
            console.log(`%c[音訊] 等待 CDN URL 加載完成: ${this.src}`, 'color: #ff9800; font-size: 11px');
            
            const mediaElement = this;
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    console.warn('[音訊] 等待 loadedmetadata 超時，嘗試直接播放');
                    mediaElement._rf_loading_cdn = false; // 清除標記
                    origPlay.apply(mediaElement, arguments).then(resolve).catch(err => {
                        console.warn('[音訊] CDN 播放失敗:', err);
                        resolve(); // 靜默失敗
                    });
                }, 2000);
                
                const onLoadedMetadata = () => {
                    clearTimeout(timeout);
                    mediaElement.removeEventListener('loadedmetadata', onLoadedMetadata);
                    mediaElement._rf_loading_cdn = false; // 清除標記
                    console.log(`%c[音訊] CDN 資源已加載，currentSrc: ${mediaElement.currentSrc}`, 'color: #00ff00; font-size: 11px');
                    origPlay.apply(mediaElement, arguments).then(resolve).catch(err => {
                        console.warn('[音訊] CDN 播放失敗:', err);
                        resolve(); // 靜默失敗
                    });
                };
                
                if (mediaElement.readyState >= 1) {
                    // 已經加載了 metadata
                    clearTimeout(timeout);
                    mediaElement._rf_loading_cdn = false; // 清除標記
                    console.log(`%c[音訊] CDN 資源已就緒，currentSrc: ${mediaElement.currentSrc}`, 'color: #00ff00; font-size: 11px');
                    origPlay.apply(mediaElement, arguments).then(resolve).catch(err => {
                        console.warn('[音訊] CDN 播放失敗:', err);
                        resolve(); // 靜默失敗
                    });
                } else {
                    mediaElement.addEventListener('loadedmetadata', onLoadedMetadata);
                }
            });
        }
        
        // 只攔截 SE147 靜音邏輯
        if (type === 'SE147' && window._rf_se147Muted) {
            this.pause();
            this.currentTime = 0;
            return Promise.resolve();
        }
        
        // 捕獲音訊播放錯誤，並在資源下載完成後重試
        const playPromise = origPlay.apply(this, arguments);
        if (playPromise && playPromise.catch) {
            const mediaElement = this;
            return playPromise.catch(err => {
                console.warn('[音訊播放失敗 - 已捕獲]', {
                    type: type,
                    src: this.src,
                    currentSrc: this.currentSrc,
                    error: err.name + ': ' + err.message
                });
                
                // 如果是 NotSupportedError 且是本地服務器 URL，嘗試等待下載完成
                if (err.name === 'NotSupportedError' && this.src && this.src.includes('localhost:8765')) {
                    console.log('[音訊] 資源可能正在下載，將在後台等待...');
                    // 不刷新頁面，靜默失敗，讓遊戲繼續運行
                    // 資源下載完成後，下次播放時會成功
                }
                
                return Promise.resolve();
            });
        }
        return playPromise;
    };

    // NEW: Intercept volume changes to enforce master volume
    if (origVolumeDescriptor) {
        Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
            get: origVolumeDescriptor.get,
            set: function(value) {
                const type = this._rf_type || getAudioTypeFromUrl(this.currentSrc || this.src);
                
                // 如果不是音訊檔案（例如影片），直接設置原始音量不攔截
                if (type === null) {
                    return origVolumeDescriptor.set.call(this, value);
                }
                
                // This setter is now the single point of truth for volume.
                // It ignores what the game's scripts are trying to set (`value`)
                // and instead applies our master volume.
                this._rf_intended_volume = value; // Store for debugging if needed
                
                let newVolume;
                if (type === 'BGM') {
                    newVolume = window._rf_bgm_volume ?? 1.0;
                } else { // SE, SE147
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

    // 初始化戰報通知按鈕狀態已移至 audioControls.js 的 setupAudioControls 函數中
    // 避免與 audioControls.js 中的事件監聽器衝突

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
    // 注意：這裡不再直接初始化，而是等待 audioControls.js 中的統一同步
    // 避免重複初始化和多帳號衝突
    
    // 提供一個手動同步的介面給其他模組使用
    window.applyAudioConfig = function(cfg) {
        if (!cfg) return;
        
        // 只設置內存中的值和音頻節點，但不觸發配置保存
        if (typeof cfg.bgm === 'number') {
            window._rf_bgm_volume = cfg.bgm;
            if (window._rf_bgmGainNodes && Array.isArray(window._rf_bgmGainNodes)) {
                window._rf_bgmGainNodes.forEach(node => {
                    if (node && node.gain) node.gain.value = cfg.bgm;
                });
            }
            if (window.setMediaVolume) window.setMediaVolume();
        }
        
        if (typeof cfg.se === 'number') {
            window._rf_se_volume = cfg.se;
            if (window._rf_seGainNodes && Array.isArray(window._rf_seGainNodes)) {
                window._rf_seGainNodes.forEach(node => {
                    if (node && node.gain) node.gain.value = cfg.se;
                });
            }
            if (window.setMediaVolume) window.setMediaVolume();
            if (window.updateSe147Volume) window.updateSe147Volume();
        }
        
        if (typeof cfg.se147Muted === 'boolean') {
            // 使用 skipSave=true 來避免在初始化時保存設置
            if (window.setSE147Muted) {
                window.setSE147Muted(cfg.se147Muted, true);
            }
        }
        
        console.log('音頻配置已應用:', cfg);
    };
})();