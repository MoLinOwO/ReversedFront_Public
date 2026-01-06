(function() {
    const originalFetch = window.fetch;
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalImageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    
    // 檢測是否為 passionfruit 資源
    function isPassionfruitResource(url) {
        if (!url) return false;
        if (url.match(/^(http|https|data|blob):/i)) return false;
        
        let cleanUrl = url.replace(/^[\.\/]+/, '').replace(/^assets\//, '');
        return cleanUrl.startsWith('passionfruit/');
    }
    
    // 觸發後台下載（不阻塞原始請求）
    function triggerBackgroundDownload(url) {
        if (!window.__TAURI__?.invoke) return;
        
        let cleanUrl = url.replace(/^[\.\/]+/, '').replace(/^assets\//, '');
        
        // 異步調用 Rust 命令檢查並下載
        window.__TAURI__.invoke('check_resource_exists', { resourcePath: cleanUrl })
            .catch(() => {}); // 靜默失敗，不影響原始請求
    }
    
    // 監聽 fetch（不攔截）
    window.fetch = async function(resource, init) {
        let url = resource instanceof Request ? resource.url : resource;
        
        if (isPassionfruitResource(url)) {
            triggerBackgroundDownload(url);
        }
        
        return originalFetch.apply(this, arguments);
    };
    
    // 監聽 XMLHttpRequest（不攔截）
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        if (isPassionfruitResource(url)) {
            triggerBackgroundDownload(url);
        }
        
        return originalXhrOpen.apply(this, arguments);
    };
    
    // 監聽圖片加載（不攔截）
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
        get: function() {
            return originalImageSrc.get.call(this);
        },
        set: function(url) {
            const urlStr = String(url);
            
            if (isPassionfruitResource(urlStr)) {
                triggerBackgroundDownload(urlStr);
            }
            
            originalImageSrc.set.call(this, url);
        },
        configurable: true
    });
})();
