(function() {
    // 保存原始 fetch 函數
    const originalFetch = window.fetch;
    
    // 覆寫 fetch 函數
    window.fetch = async function(resource, init) {
        let url = resource;
        if (resource instanceof Request) {
            url = resource.url;
        }
        
        // 檢查是否是媒體資源
        const resourcePathMatch = url.match(/\/(assets\/passionfruit\/|passionfruit\/)(.+)$/);
        if (resourcePathMatch) {
            const resourcePath = resourcePathMatch[1] + resourcePathMatch[2];
            
            try {
                // 檢查資源是否存在
                const checkResult = await window.pywebview.api.check_resource_exists(resourcePath);
                
                // 避免過多的日誌輸出，只在調試模式下輸出日誌
                if (window.DEBUG_MODE) {
                    console.log(`[ResourceCache] 檢查資源: ${resourcePath}, 結果:`, checkResult);
                }
                
                // 如果資源正在下載中，可以在這裡處理 UI 提示
                if (!checkResult.exists && checkResult.downloading && window.DEBUG_MODE) {
                    console.log(`[ResourceCache] 資源 ${resourcePath} 不存在，已加入下載隊列`);
                    // 這裡可以添加下載進度的 UI 更新
                }
            } catch (err) {
                // 只在有確實錯誤時輸出日誌
                console.error(`[ResourceCache] 檢查資源失敗:`, err);
            }
        }
        
        // 繼續使用原始的 fetch 函數
        return originalFetch.apply(this, arguments);
    };
    
    // 覆寫 XMLHttpRequest 的 open 方法
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        // 檢查是否是媒體資源
        const resourcePathMatch = url.match(/\/(assets\/passionfruit\/|passionfruit\/)(.+)$/);
        if (resourcePathMatch) {
            const resourcePath = resourcePathMatch[1] + resourcePathMatch[2];
            
            // 使用 Promise 轉換為同步調用
            const checkPromise = window.pywebview.api.check_resource_exists(resourcePath);
            const self = this;
            
            // 添加請求開始事件監聽
            this.addEventListener('loadstart', function() {
                checkPromise.then(checkResult => {
                    // 避免過多的日誌輸出
                    if (window.DEBUG_MODE) {
                        console.log(`[ResourceCache] XHR 檢查資源: ${resourcePath}, 結果:`, checkResult);
                        
                        if (!checkResult.exists && checkResult.downloading) {
                            console.log(`[ResourceCache] XHR 資源 ${resourcePath} 不存在，已加入下載隊列`);
                        }
                    }
                }).catch(err => {
                    // 只在確實有錯誤時輸出日誌
                    console.error(`[ResourceCache] XHR 檢查資源失敗:`, err);
                });
            });
        }
        
        // 繼續使用原始的 open 方法
        return originalXhrOpen.apply(this, arguments);
    };
    
    // 監控圖片元素加載
    const originalImageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
        get: function() {
            return originalImageSrc.get.call(this);
        },
        set: function(url) {
            // 檢查是否是 passionfruit 資源
            const resourcePathMatch = url.match(/\/(assets\/passionfruit\/|passionfruit\/)(.+)$/);
            if (resourcePathMatch) {
                const resourcePath = resourcePathMatch[1] + resourcePathMatch[2];
                
                // 異步檢查資源
                window.pywebview.api.check_resource_exists(resourcePath)
                    .then(checkResult => {
                        if (window.DEBUG_MODE) {
                            console.log(`[ResourceCache] Image 檢查資源: ${resourcePath}, 結果:`, checkResult);
                        }
                    })
                    .catch(err => {
                        // 只在確實有錯誤時輸出日誌
                        console.error(`[ResourceCache] Image 檢查資源失敗:`, err);
                    });
            }
            
            // 設置原始 src
            originalImageSrc.set.call(this, url);
        },
        configurable: true
    });
    
    // 移除 HTMLMediaElement 的攔截器，避免與 globalAudioControl.js 衝突
    // globalAudioControl.js 已經處理了音訊和影片的 src 設置
    // 這裡只監控圖片資源即可
    // 資源下載狀態已整合到左側控制面板，無需獨立的狀態指示器
    
    // 添加全局調試變數
    window.DEBUG_MODE = false; // 設置為 false 以禁用大量的控制台輸出
    
    if (window.DEBUG_MODE) {
        console.log('[ResourceCache] 資源監控已啟動，狀態顯示已整合至控制面板');
    }
})();
