"""
資源攔截模塊
處理資源下載攔截和注入以及其他前端腳本的注入
"""

import os
import logging
import webview

# 禁用日誌輸出
logger = logging.getLogger('ResourceInterceptor')
logger.setLevel(logging.CRITICAL + 1)
logger.disabled = True

def inject_js_file(window, js_path, description):
    """注入指定的 JS 檔案到視窗"""
    try:
        with open(js_path, 'r', encoding='utf-8') as f:
            js_content = f.read()
        
        window.evaluate_js(js_content)
        # 完全移除日誌輸出
        return True
    except Exception:
        # 完全移除錯誤日誌輸出
        return False

def inject_resource_interceptor():
    """注入資源請求攔截 JS 和其他前端功能腳本"""
    window = webview.windows[0]
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    
    # 添加調試模式標誌和版本號到前端全局變數 (在攔截器之前)
    try:
        # 直接指定版本號，避免模塊導入
        LOCAL_VERSION = "2.0"
            
        # 設置調試模式為 False 以禁用大量的控制台輸出
        window.evaluate_js("""
            window.DEBUG_MODE = false; 
            window.APP_VERSION = '""" + LOCAL_VERSION + """';
        """)
    except Exception:
        pass
    
    # 注入資源攔截器
    interceptor_js_path = os.path.join(base_path, 'mod', 'js', 'core', 'resource_interceptor.js')
    inject_js_file(window, interceptor_js_path, "資源請求攔截")
