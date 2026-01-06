/**
 * 鍵盤初始化腳本
 * 確保ESC按鍵能被正確捕獲（F11已移至windowManager.js）
 */

// 等待文檔加載完成
document.addEventListener('DOMContentLoaded', function() {
    // 確保腳本只運行一次
    if (window._keyboardInitDone) return;
    window._keyboardInitDone = true;
    
    console.log('初始化鍵盤監聽器');
    
    // 監聽鍵盤事件
    window.addEventListener('keydown', function(event) {
        console.log('按鍵按下:', event.key, event.keyCode);
        
        // ESC 鍵 - 切換控制面板
        if (event.key === 'Escape' || event.keyCode === 27) {
            console.log('觸發ESC切換功能選單');
            const panel = document.getElementById('custom-controls');
            const toggle = document.getElementById('custom-controls-toggle');
            if (panel && toggle) {
                if (panel.style.display === 'none' || !panel.style.display) {
                    panel.style.display = 'block';
                    toggle.style.display = 'none';
                } else {
                    panel.style.display = 'none';
                    toggle.style.display = 'flex';
                }
            }
            event.preventDefault();
        }
        
        // F11 鍵處理已移至 windowManager.js
    }, true);
    
    // 添加全局函數供直接調用
    window.rfToggleMenu = function() {
        const panel = document.getElementById('custom-controls');
        const toggle = document.getElementById('custom-controls-toggle');
        if (panel && toggle) {
            if (panel.style.display === 'none' || !panel.style.display) {
                panel.style.display = 'block';
                toggle.style.display = 'none';
            } else {
                panel.style.display = 'none';
                toggle.style.display = 'flex';
            }
            return true;
        }
        return false;
    };
    
    // 檢查5秒後是否成功載入
    setTimeout(function() {
        console.log('鍵盤監聽器已運行5秒');
    }, 5000);
});

// 即時執行初始化
(function() {
    if (document.readyState === 'loading') {
        console.log('等待文檔加載完成後初始化鍵盤...');
    } else {
        if (window._keyboardInitDone) return;
        window._keyboardInitDone = true;
        
        console.log('立即初始化鍵盤監聽器');
        
        window.addEventListener('keydown', function(event) {
            console.log('按鍵按下:', event.key, event.keyCode);
            
            if (event.key === 'Escape' || event.keyCode === 27) {
                console.log('觸發ESC切換功能選單');
                const panel = document.getElementById('custom-controls');
                const toggle = document.getElementById('custom-controls-toggle');
                if (panel && toggle) {
                    if (panel.style.display === 'none' || !panel.style.display) {
                        panel.style.display = 'block';
                        toggle.style.display = 'none';
                    } else {
                        panel.style.display = 'none';
                        toggle.style.display = 'flex';
                    }
                }
                event.preventDefault();
            }
        }, true);
        
        window.rfToggleMenu = function() {
            const panel = document.getElementById('custom-controls');
            const toggle = document.getElementById('custom-controls-toggle');
            if (panel && toggle) {
                if (panel.style.display === 'none' || !panel.style.display) {
                    panel.style.display = 'block';
                    toggle.style.display = 'none';
                } else {
                    panel.style.display = 'none';
                    toggle.style.display = 'flex';
                }
                return true;
            }
            return false;
        };
    }
})();

// 導出函數供其他模塊使用
export function initKeyboardControls() {
    // 已在上方初始化，此函數保留以兼容舊代碼
    console.log('initKeyboardControls 已通過 DOMContentLoaded 初始化');
}