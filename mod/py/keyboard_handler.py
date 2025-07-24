"""
鍵盤事件處理模組
處理全局鍵盤事件，如 ESC 鍵呼叫功能選單、F11 切換全屏等
"""

import webview

# 移除日誌輸出，避免黑視窗閃爍
class NullLogger:
    def __init__(self): pass
    def debug(self, *args, **kwargs): pass
    def info(self, *args, **kwargs): pass
    def warning(self, *args, **kwargs): pass
    def error(self, *args, **kwargs): pass
    def critical(self, *args, **kwargs): pass

logger = NullLogger()

class KeyboardHandler:
    def __init__(self, window=None):
        """初始化鍵盤事件處理器"""
        self.window = window or (webview.windows[0] if webview.windows else None)
        self.is_menu_visible = False
        self.is_running = False
        self.handler_thread = None
        
        # 嘗試導入鍵盤監聽模塊
        try:
            import keyboard
            self.keyboard_module = keyboard
            self.has_keyboard_module = True
        except ImportError:
            logger.warning("未安裝 keyboard 模塊，無法使用全局鍵盤事件處理")
            self.has_keyboard_module = False
    
    def toggle_menu(self):
        """切換左側控制面板顯示狀態"""
        if not self.window:
            return
        
        self.is_menu_visible = not self.is_menu_visible
        try:
            # 呼叫前端控制左側控制面板的顯示/隱藏方法
            js_code = """
                (function() {
                    const controls = document.getElementById('custom-controls');
                    const toggle = document.getElementById('custom-controls-toggle');
                    if (controls && toggle) {
                        if (controls.style.display === 'none' || controls.style.display === '') {
                            controls.style.display = 'block';
                            controls.style.transform = 'scale(1)';
                        } else {
                            controls.style.transform = 'scale(0.8)';
                            setTimeout(() => { controls.style.display = 'none'; }, 200);
                        }
                        return true;
                    }
                    return false;
                })();
            """
            result = self.window.evaluate_js(js_code)
            # 移除日誌輸出，避免黑視窗閃爍
            pass
        except Exception as e:
            # 移除日誌輸出，避免黑視窗閃爍
            pass
    
    def toggle_fullscreen(self):
        """切換全屏模式"""
        if not self.window:
            return
        
        try:
            self.window.toggle_fullscreen()
            # 移除日誌輸出，避免黑視窗閃爍
            pass
        except Exception as e:
            # 移除日誌輸出，避免黑視窗閃爍
            pass
    
    def start(self):
        """開始監聽鍵盤事件"""
        if not self.has_keyboard_module:
            # 移除日誌輸出，避免黑視窗閃爍
            return False
        
        if self.is_running:
            return True
        
        try:
            # 註冊 ESC 鍵事件處理 - 控制左側面板
            self.keyboard_module.add_hotkey('esc', self.toggle_menu)
            # 註冊 F11 鍵事件處理 - 切換全屏
            self.keyboard_module.add_hotkey('f11', self.toggle_fullscreen)
            
            self.is_running = True
            # 移除日誌輸出，避免黑視窗閃爍
            return True
        except Exception as e:
            # 移除日誌輸出，避免黑視窗閃爍
            return False
    
    def stop(self):
        """停止監聽鍵盤事件"""
        if not self.has_keyboard_module or not self.is_running:
            return
        
        try:
            # 移除所有註冊的熱鍵
            self.keyboard_module.unhook_all_hotkeys()
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
