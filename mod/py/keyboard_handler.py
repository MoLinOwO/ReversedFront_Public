"""
鍵盤事件處理模組
處理鍵盤事件，如 ESC 鍵呼叫功能選單、F11 切換全屏等
使用 PyWebView 的內建事件機制代替 keyboard 庫，避免被誤判為惡意程式
"""

import webview
import threading
import logging

# 使用標準 logging 模組但完全禁用它
logging.basicConfig(level=logging.CRITICAL + 1)
logger = logging.getLogger(__name__)
logger.disabled = True

class KeyboardHandler:
    def __init__(self, window=None):
        """初始化鍵盤事件處理器"""
        self.window = window or (webview.windows[0] if webview.windows else None)
        self.is_menu_visible = False
        self.is_running = False
        self.handler_thread = None
    
    def toggle_menu(self):
        """切換控制面板顯示狀態"""
        if not self.window:
            return
        
        self.is_menu_visible = not self.is_menu_visible
        try:
            # 呼叫前端控制控制面板的顯示/隱藏方法，修復切換邏輯
            js_code = """
                (function() {
                    const controls = document.getElementById('custom-controls');
                    const toggle = document.getElementById('custom-controls-toggle');
                    if (controls && toggle) {
                        console.log('切換面板狀態', controls.style.display);
                        // 獲取當前的面板狀態
                        let panelState;
                        try {
                            panelState = JSON.parse(localStorage.getItem('rf_panel_state') || '{}');
                        } catch (e) {
                            panelState = { isOpen: false };
                        }

                        // 切換顯示狀態 - 修正 display 為空字符串的情況
                        const currentDisplay = controls.style.display;
                        const isHidden = currentDisplay === 'none' || currentDisplay === '';
                        
                        if (isHidden) {
                            // 面板當前隱藏，現在顯示它
                            controls.style.display = 'block';
                            toggle.style.display = 'none';
                            
                            // 使用保存的縮放因子或默認值
                            const scale = window.innerWidth <= 600 
                                ? 1 
                                : Math.max(0.7, Math.min(1, window.innerWidth / 1280));
                            controls.style.transform = `scale(${scale})`;
                            
                            // 更新並保存狀態
                            panelState.isOpen = true;
                            console.log('面板已顯示');
                        } else {
                            // 面板當前顯示，現在隱藏它
                            const scale = window.innerWidth <= 600 
                                ? 0.9 
                                : Math.max(0.7, Math.min(1, window.innerWidth / 1280)) * 0.8;
                            controls.style.transform = `scale(${scale})`;
                            
                            controls.style.display = 'none';
                            toggle.style.display = 'flex';
                            
                            // 更新並保存狀態
                            panelState.isOpen = false;
                            console.log('面板已隱藏');
                        }
                        
                        // 保存更新後的面板狀態
                        localStorage.setItem('rf_panel_state', JSON.stringify(panelState));
                        
                        return true;
                    }
                    return false;
                })();
            """
            result = self.window.evaluate_js(js_code)
        except Exception as e:
            # 記錄錯誤而不是靜默處理
            import traceback
            print(f"切換面板時發生錯誤: {str(e)}")
            traceback.print_exc()
    
    def toggle_fullscreen(self):
        """切換全屏模式 - 使用 API 進行全屏切換"""
        if not self.window:
            return False
        
        try:
            print("鍵盤處理器: 嘗試切換全屏模式")
            # 使用統一的 API 進行全屏切換
            import webview
            if webview.windows and len(webview.windows) > 0:
                # 調用 API 版本的全屏切換，確保統一邏輯
                if hasattr(webview.windows[0], 'js_api') and hasattr(webview.windows[0].js_api, 'toggle_fullscreen'):
                    print("鍵盤處理器: 調用 API 版本的全屏切換")
                    result = webview.windows[0].js_api.toggle_fullscreen()
                    return result
                else:
                    # 備用方案：直接呼叫原生方法
                    print("鍵盤處理器: 使用原生方法切換全屏")
                    self.window.toggle_fullscreen()
                    return True
            else:
                # 如果沒有 webview.windows，則使用當前 window 實例
                print("鍵盤處理器: 使用當前窗口切換全屏")
                self.window.toggle_fullscreen()
                return True
        except Exception as e:
            # 記錄錯誤，但不中斷執行
            import traceback
            print(f"鍵盤處理器: 全屏切換時發生錯誤 - {str(e)}")
            traceback.print_exc()
            return False
    
    def start(self):
        """開始監聽鍵盤事件"""
        if not self.window:
            # 移除日誌輸出，避免黑視窗閃爍
            return False
        
        if self.is_running:
            return True
        
        try:
            # 註冊視窗關閉事件
            self.window.events.closed += self.stop
            
            # 使用優化的JavaScript事件處理方式，優化ESC鍵處理邏輯
            js_code = """
                if (!window._rfKeyboardHandler) {
                    window._rfKeyboardHandler = true;
                    
                    // 直接添加到 window 對象，避免事件冒泡問題
                    window.addEventListener('keydown', function(event) {
                        console.log('按鍵按下:', event.key, event.keyCode);
                        
                        // ESC 鍵 - 切換控制面板 (根據面板當前狀態)
                        if (event.key === 'Escape' || event.keyCode === 27) {
                            console.log('觸發ESC功能選單');
                            
                            // 檢查是否在輸入狀態
                            const activeElement = document.activeElement;
                            const isInputActive = activeElement && (
                                activeElement.tagName === 'INPUT' || 
                                activeElement.tagName === 'TEXTAREA' || 
                                activeElement.isContentEditable
                            );
                            
                            // 如果不是在輸入狀態，則執行切換功能選單
                            if (!isInputActive && window.pywebview && window.pywebview.api) {
                                // 無論面板當前狀態，都執行切換
                                window.pywebview.api.toggle_menu();
                                event.preventDefault();
                                return false;
                            }
                        }
                        
                        // F11 鍵 - 切換全屏 (使用視窗管理器)
                        if (event.key === 'F11' || event.keyCode === 122) {
                            console.log('鍵盤處理器: 觸發F11全屏切換');
                            
                            // 優先使用窗口管理器
                            if (window.rfToggleFullscreen && typeof window.rfToggleFullscreen === 'function') {
                                console.log('鍵盤處理器: 使用窗口管理器處理F11');
                                try {
                                    window.rfToggleFullscreen();
                                } catch(e) {
                                    console.error('鍵盤處理器: 窗口管理器調用失敗', e);
                                    // 嘗試直接調用 API
                                    if (window.pywebview && window.pywebview.api) {
                                        window.pywebview.api.toggle_fullscreen();
                                    }
                                }
                            } else if (window.pywebview && window.pywebview.api) {
                                // 備用方案：直接調用 API
                                console.log('鍵盤處理器: 直接調用 pywebview API 切換全屏');
                                try {
                                    window.pywebview.api.toggle_fullscreen();
                                } catch(e) {
                                    console.error('鍵盤處理器: 全屏切換失敗', e);
                                }
                            } else {
                                console.warn('鍵盤處理器: 找不到全屏切換方法');
                            }
                            
                            // 防止事件冒泡和默認行為
                            event.preventDefault();
                            event.stopPropagation();
                            event.stopImmediatePropagation();
                            return false;
                        }
                    }, true);
                    
                    // 設置一個全局函數，可以從任何地方手動調用
                    window.rfToggleMenu = function() {
                        if (window.pywebview && window.pywebview.api) {
                            window.pywebview.api.toggle_menu();
                            return true;
                        }
                        return false;
                    };
                    
                    window.rfToggleFullscreen = function() {
                        if (window.pywebview && window.pywebview.api) {
                            window.pywebview.api.toggle_fullscreen();
                            return true;
                        }
                        return false;
                    };
                    
                    console.log('JavaScript鍵盤事件處理已啟動');
                    
                    // 創建一個持久化存儲初始化標誌
                    try {
                        localStorage.setItem('_rfKeyboardInitialized', 'true');
                    } catch(e) {}
                }
                return true;
            """
            self.window.evaluate_js(js_code)
            
            self.is_running = True
            # 移除日誌輸出，避免黑視窗閃爍
            return True
        except Exception as e:
            # 移除日誌輸出，避免黑視窗閃爍
            return False
    
    def stop(self):
        """停止監聽鍵盤事件"""
        if not self.is_running:
            return
        
        try:
            # 移除 JavaScript 鍵盤監聽器
            if self.window:
                js_code = """
                    if (window._rfKeyboardHandler) {
                        // 由於瀏覽器環境會被銷毀，實際上無需主動清理
                        // 但為確保清理完整，設置標誌為 false
                        window._rfKeyboardHandler = false;
                        return true;
                    }
                    return false;
                """
                self.window.evaluate_js(js_code)
            
            self.is_running = False
            # 移除日誌輸出，避免黑視窗閃爍
        except Exception as e:
            # 移除日誌輸出，避免黑視窗閃爍
            pass

# 全局實例，用於主程序引用
_instance = None

def init_keyboard_handler(window=None):
    """初始化全局鍵盤事件處理器"""
    global _instance
    if _instance is None:
        _instance = KeyboardHandler(window)
    elif window is not None:
        _instance.window = window
    return _instance

def start_keyboard_handler():
    """啟動全局鍵盤事件處理器"""
    global _instance
    if _instance is None:
        _instance = init_keyboard_handler()
    return _instance.start()

def stop_keyboard_handler():
    """停止全局鍵盤事件處理器"""
    global _instance
    if _instance:
        _instance.stop()
