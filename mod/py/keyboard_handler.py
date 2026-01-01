"""
鍵盤事件處理模組
處理鍵盤事件，如 ESC 鍵呼叫功能選單、F11 切換全屏等
使用 PyQt6 處理
"""

import logging

# 使用標準 logging 模組但完全禁用它
logging.basicConfig(level=logging.CRITICAL + 1)
logger = logging.getLogger(__name__)
logger.disabled = True

class KeyboardHandler:
    def __init__(self, page=None, webview=None):
        """初始化鍵盤事件處理器"""
        self.page = page
        self.webview = webview
        self.is_menu_visible = False
        self.is_running = False
    
    def toggle_menu(self):
        """切換控制面板顯示狀態"""
        self.is_menu_visible = not self.is_menu_visible
        # PyQt6 版本不需要通過 JS 調用，由主視窗處理
    
    def toggle_fullscreen(self):
        """切換全屏模式"""
        # PyQt6 版本由主視窗直接處理
        return True
    
    def start(self):
        """開始監聽鍵盤事件"""
        if self.is_running:
            return True
        
        self.is_running = True
        return True
    
    def stop(self):
        """停止監聽鍵盤事件"""
        if not self.is_running:
            return
        
        self.is_running = False

# 全局實例，用於主程序引用
_instance = None

def init_keyboard_handler(page=None, webview=None):
    """初始化全局鍵盤事件處理器"""
    global _instance
    if _instance is None:
        _instance = KeyboardHandler(page, webview)
    elif page is not None or webview is not None:
        _instance.page = page
        _instance.webview = webview
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
