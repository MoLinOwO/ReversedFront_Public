// 全局錯誤監聽和頁面加載追踪
(function() {
    let loadCount = parseInt(sessionStorage.getItem('rf_load_count') || '0') + 1;
    sessionStorage.setItem('rf_load_count', loadCount.toString());
    
    // 記錄加載時間戳
    const loadTime = new Date().toISOString();
    const prevLoadTime = sessionStorage.getItem('rf_prev_load_time');
    if (prevLoadTime) {
        const timeDiff = new Date() - new Date(prevLoadTime);
        console.log(`%c[頁面加載] 第 ${loadCount} 次加載 (距離上次 ${timeDiff}ms)`, 'color: #00ff00; font-size: 14px; font-weight: bold');
    } else {
        console.log(`%c[頁面加載] 第 ${loadCount} 次加載`, 'color: #00ff00; font-size: 14px; font-weight: bold');
    }
    sessionStorage.setItem('rf_prev_load_time', loadTime);
    
    if (loadCount > 3) {
        console.error(`%c[警告] 頁面在短時間內重複加載 ${loadCount} 次！`, 'color: #ff0000; font-size: 16px; font-weight: bold');
    }
    
    // 追踪導航變化
    let lastUrl = window.location.href;
    setInterval(() => {
        if (window.location.href !== lastUrl) {
            console.log(`%c[導航變化] ${lastUrl} -> ${window.location.href}`, 'color: #ffaa00; font-size: 12px');
            lastUrl = window.location.href;
        }
    }, 100);
    
    // 追踪 history API
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
        console.log('[History] pushState:', args[2]);
        return originalPushState.apply(this, args);
    };
    
    history.replaceState = function(...args) {
        console.log('[History] replaceState:', args[2]);
        return originalReplaceState.apply(this, args);
    };
    
    window.addEventListener('popstate', (e) => {
        console.log('[History] popstate:', window.location.href);
    });
    
    // 監聽未捕獲錯誤
    window.addEventListener('error', (event) => {
        const isMediaError = event.target && (event.target.tagName === 'AUDIO' || event.target.tagName === 'VIDEO' || event.target.tagName === 'IMG');
        
        console.error('[全局錯誤]', {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error,
            target: event.target?.tagName,
            isMediaError: isMediaError
        });
        
        // 特別處理媒體錯誤：完全阻止冒泡
        if (isMediaError) {
            event.stopPropagation();
            event.stopImmediatePropagation();
            console.warn(`%c[媒體錯誤已攔截] ${event.target.tagName}: ${event.target.src}`, 'color: #ffaa00; font-size: 12px');
        }
        
        // 阻止默認行為，防止某些錯誤觸發重載
        event.preventDefault();
    }, true);
    
    // 監聽未處理的 Promise 拒絕
    window.addEventListener('unhandledrejection', (event) => {
        console.error('[未處理的Promise拒絕]', event.reason);
        // 阻止默認行為，防止頁面重載
        event.preventDefault();
    });
    
    // 監聽資源加載錯誤
    window.addEventListener('error', (event) => {
        if (event.target !== window) {
            console.warn('[資源加載失敗]', {
                tagName: event.target.tagName,
                src: event.target.src || event.target.href,
                currentSrc: event.target.currentSrc
            });
            // 阻止錯誤冒泡
            event.stopPropagation();
            event.preventDefault();
        }
    }, true);
    
    // 監聽 beforeunload 事件,記錄重載原因和堆棧
    let unloadCount = 0;
    window.addEventListener('beforeunload', (e) => {
        unloadCount++;
        console.error(`%c[即將卸載 #${unloadCount}] 頁面即將重新加載或關閉`, 'color: #ff6600; font-size: 14px; font-weight: bold');
        console.trace('[卸載堆棧] 觸發來源:');
        
        // 記錄到 sessionStorage 供下次加載檢查
        const unloadInfo = {
            count: unloadCount,
            time: new Date().toISOString(),
            url: window.location.href,
            loadCount: loadCount
        };
        sessionStorage.setItem('rf_last_unload', JSON.stringify(unloadInfo));
    });
    
    // 檢查上次卸載資訊
    const lastUnload = sessionStorage.getItem('rf_last_unload');
    if (lastUnload) {
        try {
            const info = JSON.parse(lastUnload);
            const timeSinceUnload = new Date() - new Date(info.time);
            console.warn(`%c[卸載資訊] 上次卸載於 ${timeSinceUnload}ms 前`, 'color: #ff9900; font-size: 12px', info);
        } catch (e) {}
    }
    
    // ============================================
    // 被動加載模式: 監控並阻止重載行為
    // 注意: WebView 的 location 屬性通常是不可配置的,
    // 所以我們只監控函數調用,不嘗試覆蓋屬性
    // ============================================
    
    // 1. 嘗試攔截 location.reload() (如果可配置)
    try {
        const originalReload = window.location.reload;
        if (originalReload) {
            window.location.reload = function(...args) {
                console.error('%c[阻止重載] location.reload() 被調用', 'color: #ff0000; font-size: 16px; font-weight: bold');
                console.trace('[阻止重載] 調用堆棧:');
                // 不執行重載
                return;
            };
        }
    } catch (e) {
        console.warn('[診斷] location.reload 不可覆蓋 (這是正常的):', e.message);
    }
    
    // 2. 攔截 location.replace() 同 URL 替換
    try {
        const originalReplace = window.location.replace;
        if (originalReplace) {
            window.location.replace = function(url) {
                if (!url || url === window.location.href) {
                    console.error('%c[阻止重載] location.replace() 同 URL 被攔截', 'color: #ff0000; font-size: 16px; font-weight: bold');
                    console.trace('[阻止重載] 調用堆棧:');
                    return;
                }
                return originalReplace.call(this, url);
            };
        }
    } catch (e) {
        console.warn('[診斷] location.replace 不可覆蓋:', e.message);
    }
    
    // 3. 攔截 location.assign() 同 URL 分配
    try {
        const originalAssign = window.location.assign;
        if (originalAssign) {
            window.location.assign = function(url) {
                if (!url || url === window.location.href) {
                    console.error('%c[阻止重載] location.assign() 同 URL 被攔截', 'color: #ff0000; font-size: 16px; font-weight: bold');
                    console.trace('[阻止重載] 調用堆棧:');
                    return;
                }
                return originalAssign.call(this, url);
            };
        }
    } catch (e) {
        console.warn('[診斷] location.assign 不可覆蓋:', e.message);
    }
    
    // 4. 攔截 history.go(0) 刷新
    try {
        const originalGo = window.history.go;
        if (originalGo) {
            window.history.go = function(delta) {
                if (delta === 0 || delta === undefined) {
                    console.error('%c[阻止重載] history.go(0) 被攔截', 'color: #ff0000; font-size: 16px; font-weight: bold');
                    console.trace('[阻止重載] 調用堆棧:');
                    return;
                }
                return originalGo.call(this, delta);
            };
        }
    } catch (e) {
        console.warn('[診斷] history.go 不可覆蓋:', e.message);
    }
    
    console.log('%c[被動加載模式] 重載監控已啟動 (盡力而為)', 'color: #00ff00; font-size: 14px; font-weight: bold');
    console.log('[診斷] 全局錯誤監聽已啟動');
})();

// 匯入所有主要功能 js
import './account/accountManager.js';
import './audio/audioControls.js';
import './audio/globalAudioControl.js';
import './core/api.js';
import './core/entrypoint.js';
import './core/index.js';
import './core/resource_interceptor.js';
import './core/utils.js';
import './map/factionColorMap.js';
import './map/factionMap.js';
import './map/factionMapControl.js';
import './map/markerConnections.js';
import './map/markerData.js';
import './map/markerDialogs.js';
import './map/markerInteraction.js';
import './map/markerUtils.js';
import './map/rankingModal.js';
import './ui/customControls.js';
// import './ui/dialogResponsive.js';
import './ui/exitConfirm.js';
import './ui/keyboardInit.js';
import './ui/notificationBox.js';
import './ui/panelDrag.js';
import './ui/rankingModal.js';
import './ui/rankingPanelDrag.js';
import './ui/resizewindows.js';
import './ui/swordsIcon.js';
import './ui/windowManager.js';
