// 影片格式修復 - 將 MP4 重定向到 WebM
// 因為 PyQt6 WebEngine 不支援 H.264 編解碼器

(function() {
    console.log('[影片修復] 啟動格式轉換攔截器');
    
    // 攔截 HTMLMediaElement.src 設置
    const originalSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    
    Object.defineProperty(HTMLMediaElement.prototype, 'src', {
        ...originalSrcDescriptor,
        set: function(url) {
            if (typeof url === 'string' && url.includes('americacover') && url.endsWith('.mp4')) {
                const webmUrl = url.replace('.mp4', '.webm');
                console.log('[影片修復] 重定向:', url, '->', webmUrl);
                return originalSrcDescriptor.set.call(this, webmUrl);
            }
            return originalSrcDescriptor.set.call(this, url);
        },
        get: originalSrcDescriptor.get
    });
    
    // 攔截 source 元素的 src 屬性
    const originalSourceSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLSourceElement.prototype, 'src');
    
    Object.defineProperty(HTMLSourceElement.prototype, 'src', {
        ...originalSourceSrcDescriptor,
        set: function(url) {
            if (typeof url === 'string' && url.includes('americacover') && url.endsWith('.mp4')) {
                const webmUrl = url.replace('.mp4', '.webm');
                console.log('[影片修復] Source 重定向:', url, '->', webmUrl);
                
                // 同時修改 type 屬性
                if (this.type === 'video/mp4') {
                    this.type = 'video/webm';
                }
                
                return originalSourceSrcDescriptor.set.call(this, webmUrl);
            }
            return originalSourceSrcDescriptor.set.call(this, url);
        },
        get: originalSourceSrcDescriptor.get
    });
    
    console.log('[影片修復] 格式轉換攔截器已安裝');
})();
