(function() {
    // 保存原始 fetch 函數
    const originalFetch = window.fetch;
    
    // 覆寫 fetch 函數
    window.fetch = async function(resource, init) {
        let url = resource;
        if (resource instanceof Request) {
            url = resource.url;
        }
        
        // 1. 如果是完整的 URL (http/https/data/blob)，且不是指向我們的本地伺服器，則不攔截
        if (url.match(/^(http|https|data|blob):/i)) {
            if (!url.includes('localhost:8765')) {
                return originalFetch.apply(this, arguments);
            }
        }

        // 2. 嘗試解析路徑
        // 移除開頭的 ./ 或 /
        let cleanUrl = url.replace(/^[\.\/]+/, '');
        
        // 移除 assets/ 前綴 (如果有的話)
        if (cleanUrl.startsWith('assets/')) {
            cleanUrl = cleanUrl.substring(7);
        }

        // 3. 檢查是否是我們需要處理的資源 (只處理 passionfruit)
        if (cleanUrl.startsWith('passionfruit/') && window.__TAURI__) {
            const assetUrl = `http://localhost:8765/${cleanUrl}`;
            if (window.DEBUG_MODE) {
                console.log(`[ResourceCache] Fetch 重定向 ${url} -> ${assetUrl}`);
            }
            return originalFetch(assetUrl);
        }
        
        // 繼續使用原始的 fetch 函數
        return originalFetch.apply(this, arguments);
    };
    
    // 覆寫 XMLHttpRequest 的 open 方法
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        // 1. 如果是完整的 URL (http/https/data/blob)，且不是指向我們的本地伺服器，則不攔截
        if (url.match(/^(http|https|data|blob):/i)) {
            if (!url.includes('localhost:8765')) {
                return originalXhrOpen.apply(this, arguments);
            }
        }

        // 2. 嘗試解析路徑
        let cleanUrl = url.replace(/^[\.\/]+/, '');
        if (cleanUrl.startsWith('assets/')) {
            cleanUrl = cleanUrl.substring(7);
        }

        // 3. 檢查是否是我們需要處理的資源 (只處理 passionfruit)
        if (cleanUrl.startsWith('passionfruit/') && window.__TAURI__) {
            const assetUrl = `http://localhost:8765/${cleanUrl}`;
            
            if (window.DEBUG_MODE) {
                console.log(`[ResourceCache] XHR 重定向 ${url} -> ${assetUrl}`);
            }
            
            return originalXhrOpen.call(this, method, assetUrl, async, user, password);
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
            // 安全檢查：確保 url 是字串
            const urlStr = String(url);

            // 嚴格過濾：如果不包含 passionfruit，完全不干涉，直接使用原始 setter
            if (!urlStr.includes('passionfruit')) {
                originalImageSrc.set.call(this, url);
                return;
            }

            // 1. 如果是完整的 URL (http/https/data/blob)，且不是指向我們的本地伺服器，則不攔截
            if (urlStr.match(/^(http|https|data|blob):/i)) {
                if (!urlStr.includes('localhost:8765')) {
                    originalImageSrc.set.call(this, url);
                    return;
                }
            }

            // 2. 嘗試解析路徑
            let cleanUrl = urlStr.replace(/^[\.\/]+/, '');
            if (cleanUrl.startsWith('assets/')) {
                cleanUrl = cleanUrl.substring(7);
            }

            // 3. 檢查是否是我們需要處理的資源 (只處理 passionfruit)
            if (cleanUrl.startsWith('passionfruit/') && window.__TAURI__) {
                const assetUrl = `http://localhost:8765/${cleanUrl}`;
                
                if (window.DEBUG_MODE) {
                    console.log(`[ResourceCache] Image 重定向 ${url} -> ${assetUrl}`);
                }
                
                originalImageSrc.set.call(this, assetUrl);
                return;
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
