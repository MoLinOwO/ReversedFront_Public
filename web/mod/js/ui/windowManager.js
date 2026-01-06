/**
 * 視窗管理模組
 * 負責管理全屏切換、視窗大小和視窗狀態
 */

// 視窗狀態 (全局可訪問)
window.windowState = {
    isFullScreen: false,
    previousState: null,
    lastToggleTime: 0,
    debug: false,  // 關閉除錯輸出
    // 固定視窗大小
    fixedWidth: 1280,
    fixedHeight: 720,
    // 記錄面板位置，確保一致性
    panelPosition: { x: 20, y: 20 },
    // 已保存的面板狀態
    savedPanelState: null
};

// 使用本地變量方便模塊內部使用
const windowState = window.windowState;

// 記錄 F11 事件處理狀態
let f11HandlerInitialized = false;

/**
 * 切換全屏顯示
 * 使用統一的方法調用 API
 */
export function toggleFullscreen() {
    // 防止短時間內重複觸發
    const now = Date.now();
    if (now - windowState.lastToggleTime < 500) {
        console.log('防止重複觸發全屏切換');
        return;
    }
    windowState.lastToggleTime = now;

    console.log('視窗管理器: 切換全屏顯示');
    
    try {
        // 獲取當前全屏狀態
        const isCurrentlyFullScreen = document.fullscreenElement || 
            document.webkitFullscreenElement || 
            document.mozFullScreenElement ||
            document.msFullscreenElement;
        
        // 更新全局狀態
        windowState.isFullScreen = !!isCurrentlyFullScreen;
        
        // 保存面板狀態（在全屏切換前）
        savePanelState();
        
        // 只有當從全屏切換到窗口模式時，才設置固定窗口大小
        if (windowState.isFullScreen) {
            // 當前是全屏，即將切換到窗口模式
            // 使用 JS 向 Python 發送請求，設置固定窗口大小
            try {
                if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.set_window_size === 'function') {
                    console.log('視窗管理器: 將在退出全屏後設置固定窗口大小', windowState.fixedWidth, windowState.fixedHeight);
                    // 將當前狀態標記為即將從全屏退出
                    windowState.exitingFullscreen = true;
                }
            } catch(e) {
                console.error('視窗管理器: 處理全屏退出失敗', e);
            }
        } else {
            // 當前是窗口模式，即將切換到全屏
            // 保存當前窗口大小，以便在返回窗口模式時使用
            windowState.savedWidth = window.innerWidth || windowState.fixedWidth;
            windowState.savedHeight = window.innerHeight || windowState.fixedHeight;
            console.log(`視窗管理器: 保存當前窗口大小 ${windowState.savedWidth}x${windowState.savedHeight}`);
        }
        
        // 調用 API 切換全屏
        if (window.pywebview && window.pywebview.api && window.pywebview.api.toggle_fullscreen) {
            console.log('視窗管理器: 調用 pywebview API 切換全屏');
            window.pywebview.api.toggle_fullscreen();
        } else {
            console.warn('視窗管理器: 找不到 pywebview API');
            // 使用瀏覽器原生方法作為備用
            fallbackToggleFullscreen();
        }
        
        // 延遲恢復面板狀態和確保窗口大小
        setTimeout(() => {
            restorePanelState();
            
            // 再次檢查當前狀態
            const isStillFullScreen = document.fullscreenElement || 
                document.webkitFullscreenElement || 
                document.mozFullScreenElement ||
                document.msFullscreenElement;
            
            // 只有當之前是全屏且現在不是全屏，才設置固定窗口大小
            if (windowState.exitingFullscreen && !isStillFullScreen && 
                window.pywebview && window.pywebview.api && 
                typeof window.pywebview.api.set_window_size === 'function') {
                
                console.log('視窗管理器: 從全屏退出，設置固定窗口大小');
                window.pywebview.api.set_window_size(windowState.fixedWidth, windowState.fixedHeight);
                
                // 重設標記
                windowState.exitingFullscreen = false;
            }
            
            // 更新全屏狀態
            windowState.isFullScreen = !!isStillFullScreen;
        }, 300);
    } catch(e) {
        console.error('視窗管理器: 切換全屏失敗', e);
        
        // 在失敗時嘗試原生方法
        try {
            fallbackToggleFullscreen();
            
            // 還原面板狀態
            setTimeout(restorePanelState, 300);
        } catch(e2) {
            console.error('視窗管理器: 備用全屏切換也失敗', e2);
        }
    }
}

/**
 * 備用的瀏覽器原生全屏切換方法
 */
function fallbackToggleFullscreen() {
    try {
        const isFullScreen = document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement ||
                           document.msFullscreenElement;
        
        if (!isFullScreen) {
            const docElm = document.documentElement;
            if (docElm.requestFullscreen) {
                docElm.requestFullscreen();
            } else if (docElm.webkitRequestFullscreen) {
                docElm.webkitRequestFullscreen();
            } else if (docElm.mozRequestFullScreen) {
                docElm.mozRequestFullScreen();
            } else if (docElm.msRequestFullscreen) {
                docElm.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    } catch(e) {
        console.error('備用全屏切換失敗', e);
    }
}

/**
 * 保存面板狀態
 */
function savePanelState() {
    try {
        const controls = document.getElementById('custom-controls');
        const toggle = document.getElementById('custom-controls-toggle');
        if (!controls || !toggle) return;
        
        const isOpen = controls.style.display !== 'none' && controls.style.display !== '';
        let position = windowState.panelPosition || { x: 20, y: 20 };
        
        // 獲取當前位置
        try {
            const rect = isOpen ? controls.getBoundingClientRect() : toggle.getBoundingClientRect();
            
            // 檢查位置是否有效
            if (rect && rect.left >= 0 && rect.top >= 0) {
                position = { x: rect.left, y: rect.top };
                
                // 更新全局保存的面板位置
                windowState.panelPosition = position;
                
                console.log('視窗管理器: 更新面板位置', position);
            }
        } catch(e) {
            console.error('獲取面板位置失敗', e);
        }
        
        const panelState = {
            isOpen: isOpen,
            position: position,
            timestamp: Date.now()
        };
        
        // 保存到全局狀態和 localStorage
        windowState.savedPanelState = panelState;
        localStorage.setItem('rf_panel_state', JSON.stringify(panelState));
        console.log('視窗管理器: 面板狀態已保存', panelState);
    } catch(e) {
        console.error('保存面板狀態失敗', e);
    }
}

/**
 * 恢復面板狀態
 */
function restorePanelState() {
    try {
        const controls = document.getElementById('custom-controls');
        const toggle = document.getElementById('custom-controls-toggle');
        if (!controls || !toggle) return;
        
        // 優先使用全局保存的狀態
        let panelState = windowState.savedPanelState;
        
        // 如果全局狀態不可用，則嘗試從 localStorage 獲取
        if (!panelState) {
            const savedState = localStorage.getItem('rf_panel_state');
            if (savedState) {
                try {
                    panelState = JSON.parse(savedState);
                } catch(e) {
                    console.error('解析面板狀態失敗', e);
                }
            }
        }
        
        // 如果有面板狀態
        if (panelState) {
            // 檢查時間戳是否有效（10秒內的保存）
            if (Date.now() - panelState.timestamp > 10000) {
                console.log('視窗管理器: 面板狀態已過期，使用默認位置');
                // 使用默認位置或全局保存的位置
                panelState.position = windowState.panelPosition || { x: 20, y: 20 };
            }
            
            // 檢查位置是否有效
            if (panelState.position && 
                panelState.position.x !== undefined && 
                panelState.position.y !== undefined) {
                
                // 確保位置在可見區域內
                let x = panelState.position.x;
                let y = panelState.position.y;
                
                // 限制位置在視窗範圍內
                const maxX = window.innerWidth - 100; // 留一些空間以確保至少部分可見
                const maxY = window.innerHeight - 100;
                
                if (x < 0) x = 0;
                if (y < 0) y = 0;
                if (x > maxX) x = maxX;
                if (y > maxY) y = maxY;
                
                // 應用位置
                controls.style.left = x + 'px';
                controls.style.top = y + 'px';
                toggle.style.left = x + 'px';
                toggle.style.top = y + 'px';
                
                // 更新全局保存的面板位置
                windowState.panelPosition = { x, y };
                console.log('視窗管理器: 面板位置已更新', windowState.panelPosition);
            }
            
            // 恢復開/關狀態
            if (panelState.isOpen) {
                controls.style.display = 'block';
                toggle.style.display = 'none';
            } else {
                controls.style.display = 'none';
                toggle.style.display = 'flex';
            }
            
            console.log('視窗管理器: 面板狀態已恢復', panelState);
        } else {
            // 如果沒有有效的面板狀態，使用默認設置
            const defaultPosition = { x: 20, y: 20 };
            
            controls.style.left = defaultPosition.x + 'px';
            controls.style.top = defaultPosition.y + 'px';
            toggle.style.left = defaultPosition.x + 'px';
            toggle.style.top = defaultPosition.y + 'px';
            
            // 更新全局保存的面板位置
            windowState.panelPosition = defaultPosition;
            
            console.log('視窗管理器: 使用默認面板位置', defaultPosition);
        }
    } catch(e) {
        console.error('恢復面板狀態失敗', e);
    }
}

/**
 * 監聽 F11 按鍵
 */
function setupF11Listener() {
    // 避免重複初始化
    if (f11HandlerInitialized) {
        console.log('視窗管理器: F11 監聽器已存在，不重複初始化');
        return;
    }
    
    // 添加事件監聽器，設置為最高捕獲優先級
    window.addEventListener('keydown', function f11Handler(event) {
        // 僅處理 F11 鍵
        if (event.key === 'F11' || event.keyCode === 122) {
            console.log('視窗管理器: 檢測到 F11 按鍵');
            toggleFullscreen();
            
            // 防止事件冒泡和默認行為
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            return false;
        }
    }, true);  // 使用捕獲階段確保最先處理

    // 標記為已初始化
    f11HandlerInitialized = true;
    console.log('視窗管理器: F11 監聽器已設置');
}

/**
 * 初始化視窗管理器
 */
export function initWindowManager() {
    console.log('視窗管理器: 初始化');
    
    // 設置 F11 按鍵監聽
    setupF11Listener();
    
    // 監聽全屏變更事件
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // 建立全局訪問點 - 確保這些方法可以被全局使用
    window.rfToggleFullscreen = toggleFullscreen;
    window.savePanelState = savePanelState;
    window.restorePanelState = restorePanelState;
    
    // 設置標誌，表明窗口管理器已初始化
    window._windowManagerInitialized = true;
    
    console.log('視窗管理器: 初始化完成');
}

/**
 * 處理全屏變更事件
 */
function handleFullscreenChange() {
    const isFullScreen = document.fullscreenElement || 
                       document.webkitFullscreenElement || 
                       document.mozFullScreenElement ||
                       document.msFullscreenElement;
                       
    windowState.isFullScreen = !!isFullScreen;
    console.log(`視窗管理器: 全屏狀態變更為 ${windowState.isFullScreen ? '全屏' : '窗口模式'}`);
    
    // 在狀態變更後恢復面板
    setTimeout(restorePanelState, 200);
}

// 自動初始化
document.addEventListener('DOMContentLoaded', initWindowManager);

// 如果文檔已載入，立即初始化
if (document.readyState !== 'loading') {
    initWindowManager();
}
