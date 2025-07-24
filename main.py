"""逆統戰：烽火 - 桌面輔助工具"""

# 最基本的導入，用於立即禁用輸出
import os
import sys
try:
    sys.stdout = open('nul' if sys.platform == 'win32' else '/dev/null', 'w')
    sys.stderr = open('nul' if sys.platform == 'win32' else '/dev/null', 'w')
except Exception:
    pass

import webview
import builtins
from mod.py.sys_utils import init_app_environment

# 初始化應用環境
init_app_environment()

# 版本與資源配置
LOCAL_VERSION = "2.0"
CLOUD_PAGE_URL = "https://cloud.vtbmoyu.com/s/JKo6TTSGaiGFAts"
RESOURCE_SERVER_BASE = "https://media.komisureiya.com/"

# 導入主要模組
from mod.py.config_utils import save_exe_path_to_config, get_account_file
from mod.py.account_manager import ensure_account_file
from mod.py.resource_cache import ResourceCacheManager
from mod.py.auto_update import get_cloud_latest_info, download_and_restart
from mod.py.resource_interceptor import inject_resource_interceptor
from mod.py.keyboard_handler import init_keyboard_handler, start_keyboard_handler
from mod.py.api import Api

# 存儲exe路徑並獲取帳號文件
save_exe_path_to_config()
ACCOUNT_FILE = get_account_file()

# 建立資源緩存管理器實例
resource_manager = ResourceCacheManager(server_base_url=RESOURCE_SERVER_BASE)

# 檢查index.html
static_dir = os.path.abspath(os.path.dirname(__file__))
index_file = os.path.join(static_dir, 'index.html')
if not os.path.exists(index_file):
    raise FileNotFoundError('找不到 index.html，請確認檔案存在於同一資料夾')

def on_loaded():
    """當視窗加載完成後執行"""
    import threading
    
    # 使用線程鎖避免重複初始化
    if not hasattr(builtins, 'APP_INIT_LOCK'):
        builtins.APP_INIT_LOCK = threading.Lock()
    
    with builtins.APP_INIT_LOCK:
        if getattr(builtins, 'APP_LOADED', False):
            return
        builtins.APP_LOADED = True
    
    try:
        window = webview.windows[0]
        
        # 檢查更新
        from mod.py.auto_update import try_cleanup_old_exe
        try_cleanup_old_exe()
        
        # 版本更新檢查
        try:
            filename, remote_version, download_url = get_cloud_latest_info(CLOUD_PAGE_URL)
            if remote_version and remote_version != LOCAL_VERSION and download_url:
                if window.evaluate_js(f'confirm("發現新版本 v{remote_version}，是否下載？")'):
                    download_and_restart(filename, download_url, window)
        except Exception:
            pass
        
        # 資源攔截和鍵盤處理
        inject_resource_interceptor()
        init_keyboard_handler(window)
        start_keyboard_handler()
    except Exception:
        pass

def start_main_window() -> None:
    """啟動主視窗"""
    # 建立 API 實例
    api = Api(resource_manager)
    
    # GPU 加速參數設定
    gpu_args = [
        '--enable-gpu',
        '--ignore-gpu-blacklist',
        '--disable-logging',
        '--no-sandbox'
    ]
    
    # 創建視窗 (使用錯誤處理確保啟動)
    try:
        # 嘗試完整參數創建視窗
        window = webview.create_window(
            '逆統戰：烽火',
            index_file,
            js_api=api,
            width=1280,
            height=720,
            resizable=True,
            fullscreen=True
        )
    except Exception:
        # 備用方案：使用最基本參數
        window = webview.create_window(
            '逆統戰：烽火',
            index_file,
            js_api=api
        )

    # 註冊載入完成事件
    window.events.loaded += on_loaded
    
    # 註冊窗口關閉事件
    def on_closing():
        """當窗口即將關閉時處理"""
        # 停止鍵盤監聽
        from mod.py.keyboard_handler import stop_keyboard_handler
        stop_keyboard_handler()
        
        # 關閉資源管理器
        if resource_manager:
            resource_manager.shutdown()
            
    # 註冊關閉事件
    window.events.closing += on_closing
    
    # 啟動資源下載執行緒
    resource_manager.start_download_thread()
    
    # 啟動 webview，使用 GPU 加速參數
    try:
        webview.start(debug=False, http_server=False, gui='cef', localization={}, args=gpu_args)
    except Exception:
        # 備用方案：使用基本參數
        webview.start()

if __name__ == "__main__":
    try:
        # 確保帳戶檔案存在
        ensure_account_file()
        
        # 啟動主視窗
        start_main_window()
    except Exception:
        # 靜默退出程序
        sys.exit(0)
