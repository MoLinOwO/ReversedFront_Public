/**
 * 鍵盤初始化腳本
 * 確保ESC和F11按鍵能被正確捕獲
 */

// 等待文檔加載完成
document.addEventListener('DOMContentLoaded', function() {
    // 確保腳本只運行一次
    if (window._keyboardInitDone) return;
    window._keyboardInitDone = true;
    
    console.log('初始化鍵盤監聽器');
    
    // 監聽鍵盤事件，但僅處理功能選單尚未打開時的 ESC 鍵和全局 F11 鍵
    window.addEventListener('keydown', function(event) {
        console.log('按鍵按下:', event.key, event.keyCode);
        
        // ESC 鍵 - 切換控制面板（無論面板狀態）
        if ((event.key === 'Escape' || event.keyCode === 27) && window.pywebview && window.pywebview.api) {
            // 檢查當前面板狀態
            console.log('觸發ESC切換功能選單');
            window.pywebview.api.toggle_menu();
            event.preventDefault();
        }
        
        // F11 鍵 - 切換全屏（使用窗口管理器）
        if (event.key === 'F11' || event.keyCode === 122) {
            console.log('keyboardInit: 觸發F11全屏切換');
            
            // 優先使用窗口管理器
            if (window.rfToggleFullscreen && typeof window.rfToggleFullscreen === 'function') {
                console.log('keyboardInit: 使用窗口管理器處理F11');
                window.rfToggleFullscreen();
            } else if (window.pywebview && window.pywebview.api && window.pywebview.api.toggle_fullscreen) {
                console.log('keyboardInit: 使用API處理F11');
                window.pywebview.api.toggle_fullscreen();
            }
            
            event.preventDefault();
            event.stopPropagation();
            return false;
        }
    }, true);
    
    // 添加全局函數供直接調用
    window.rfToggleMenu = function() {
        if (window.pywebview && window.pywebview.api && window.pywebview.api.toggle_menu) {
            window.pywebview.api.toggle_menu();
            return true;
        }
        return false;
    };
    
    window.rfToggleFullscreen = function() {
        if (window.pywebview && window.pywebview.api && window.pywebview.api.toggle_fullscreen) {
            window.pywebview.api.toggle_fullscreen();
            return true;
        }
        return false;
    };
    
    // 檢查5秒後是否成功載入
    setTimeout(function() {
        console.log('鍵盤監聽器已運行5秒');
        // 如果需要，這裡可以添加檢查代碼
    }, 5000);
});

// 即時執行初始化
(function() {
    if (document.readyState === 'loading') {
        // 如果文檔尚未加載完成，等待 DOMContentLoaded 事件
        console.log('等待文檔加載完成後初始化鍵盤...');
    } else {
        // 文檔已加載完成，立即初始化
        if (window._keyboardInitDone) return;
        window._keyboardInitDone = true;
        
        console.log('立即初始化鍵盤監聽器');
        
        // 與上面相同的代碼
        window.addEventListener('keydown', function(event) {
            console.log('按鍵按下:', event.key, event.keyCode);
            
            // ESC 鍵 - 切換控制面板（無論面板狀態）
            if ((event.key === 'Escape' || event.keyCode === 27) && window.pywebview && window.pywebview.api) {
                // 無論面板狀態，都執行切換
                console.log('觸發ESC切換功能選單');
                window.pywebview.api.toggle_menu();
                event.preventDefault();
            }
            
            // F11 鍵 - 切換全屏（使用窗口管理器）
            if (event.key === 'F11' || event.keyCode === 122) {
                console.log('keyboardInit: 觸發F11全屏切換');
                
                // 優先使用窗口管理器
                if (window.rfToggleFullscreen && typeof window.rfToggleFullscreen === 'function') {
                    console.log('keyboardInit: 使用窗口管理器處理F11');
                    window.rfToggleFullscreen();
                } else if (window.pywebview && window.pywebview.api && window.pywebview.api.toggle_fullscreen) {
                    console.log('keyboardInit: 使用API處理F11');
                    window.pywebview.api.toggle_fullscreen();
                }
                
                event.preventDefault();
                event.stopPropagation();
                return false;
            }
        }, true);
        
        window.rfToggleMenu = function() {
            if (window.pywebview && window.pywebview.api && window.pywebview.api.toggle_menu) {
                window.pywebview.api.toggle_menu();
                return true;
            }
            return false;
        };
        
        window.rfToggleFullscreen = function() {
            if (window.pywebview && window.pywebview.api && window.pywebview.api.toggle_fullscreen) {
                window.pywebview.api.toggle_fullscreen();
                return true;
            }
            return false;
        };
    }
})();

// 導出函數供其他模塊使用
export function initKeyboardControls() {
    if (window._keyboardInitDone) return;
    window._keyboardInitDone = true;
    
    console.log('通過模塊初始化鍵盤控制');
    
    // 與上面相同的代碼
    window.addEventListener('keydown', function(event) {
        console.log('按鍵按下:', event.key, event.keyCode);
        
        // ESC 鍵 - 切換控制面板（無論面板狀態）
        if (event.key === 'Escape' || event.keyCode === 27) {
            console.log('觸發ESC切換功能選單');
            if (window.pywebview && window.pywebview.api && window.pywebview.api.toggle_menu) {
                window.pywebview.api.toggle_menu();
                event.preventDefault();
            }
        }
        
        // F11 鍵 - 切換全屏 (使用視窗管理器)
        if (event.key === 'F11' || event.keyCode === 122) {
            console.log('keyboardInit: 觸發F11全屏切換 - 模塊初始化');
            
            // 優先使用窗口管理器
            if (window.rfToggleFullscreen && typeof window.rfToggleFullscreen === 'function') {
                console.log('keyboardInit: 使用窗口管理器處理F11');
                window.rfToggleFullscreen();
            } else if (window.pywebview && window.pywebview.api && window.pywebview.api.toggle_fullscreen) {
                console.log('keyboardInit: 使用API處理F11');
                window.pywebview.api.toggle_fullscreen();
            }
            
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            return false;
        }
    }, true);
}
