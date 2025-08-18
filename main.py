import os
"""逆統戰：烽火 - 桌面輔助工具"""

# 最基本的導入，用於立即禁用輸出
import sys

import webview
from mod.py.sys_utils import init_app_environment

# 初始化應用環境
init_app_environment()

# 版本與資源配置
LOCAL_VERSION = "2.6"
CLOUD_PAGE_URL = "https://cloud.vtbmoyu.com/s/JKo6TTSGaiGFAts"
RESOURCE_SERVER_BASE = "https://media.komisureiya.com/"

# 導入主要模組
from mod.py.config_utils import save_exe_path_to_config
from mod.py.resource_cache import ResourceCacheManager
from mod.py.auto_update import get_cloud_latest_info, download_and_restart
from mod.py.resource_interceptor import inject_resource_interceptor
from mod.py.keyboard_handler import init_keyboard_handler, start_keyboard_handler
from mod.py.api import Api

# 存儲exe路徑
save_exe_path_to_config()

# 建立資源緩存管理器實例
resource_manager = ResourceCacheManager(server_base_url=RESOURCE_SERVER_BASE)

# 初始化帳號設定管理器
try:
    from mod.py.account_settings_manager import AccountSettingsManager
    account_settings_manager_instance = AccountSettingsManager()
    # 全局變量供 API 使用
    import mod.py.account_settings_manager as account_settings_manager
    account_settings_manager.account_settings_manager = account_settings_manager_instance
except Exception:
    pass

# 檢查index.html

static_dir = os.path.abspath(os.path.dirname(__file__))
index_file = os.path.join(static_dir, 'index.html')
if not os.path.exists(index_file):
    raise FileNotFoundError('找不到 index.html，請確認檔案存在於同一資料夾')


def on_loaded():
    try:
        window = webview.windows[0]
        from mod.py.auto_update import try_cleanup_old_exe
        try_cleanup_old_exe()
        try:
            filename, remote_version, download_url = get_cloud_latest_info(CLOUD_PAGE_URL)
            if remote_version and remote_version != LOCAL_VERSION and download_url:
                if window.evaluate_js(f'confirm("發現新版本 v{remote_version}，是否下載？")'):
                    download_and_restart(filename, download_url, window)
        except Exception:
            pass
        inject_resource_interceptor()
        keyboard_handler = init_keyboard_handler(window)
        if not start_keyboard_handler():
            window.evaluate_js("""
                if (window._rfKeyboardHandler) {
                    window._rfKeyboardHandler = false;
                }
            """)
            keyboard_handler = init_keyboard_handler(window)
            start_keyboard_handler()
    except Exception:
        pass

def start_main_window() -> None:
    """啟動主視窗"""
    # 建立 API 實例
    api = Api(resource_manager)
    
    # GPU 加速與視窗顯示參數設定 - 優化全屏切換
    gpu_args = [
        '--enable-gpu',
        '--ignore-gpu-blacklist',
        '--disable-logging',
        '--disable-dev-shm-usage',
        '--gpu-rasterization',
        '--enable-accelerated-2d-canvas',
        '--enable-webgl',
        '--disable-features=UseOzonePlatform',
    ]


    # 依據 config.json 設定 window_mode
    from mod.py.account_settings_manager import AccountSettingsManager
    manager = AccountSettingsManager()
    window_mode = manager.get_window_mode()
    fullscreen = window_mode == "fullscreen"
    maximized = window_mode == "maximized"
    window_options = {
        'title': '逆統戰：烽火',
        'url': index_file,
        'js_api': api,
        'width': 1280,
        'height': 720,
        'resizable': False,
        'frameless': False,
        'easy_drag': True,
        'fullscreen': fullscreen,
        'min_size': (800, 600),
        'maximized': maximized,
        'confirm_close': False,
        'text_select': False,
        'background_color': '#000000'
    }
    try:
        window = webview.create_window(**window_options)
    except Exception:
        window = webview.create_window(
            '逆統戰：烽火',
            index_file,
            js_api=api
        )

    # 註冊載入完成事件
    window.events.loaded += on_loaded
    # 註冊窗口關閉事件
    def on_closing():
        from mod.py.keyboard_handler import stop_keyboard_handler
        stop_keyboard_handler()
        if resource_manager:
            resource_manager.shutdown()
        import gc
        gc.collect()
    window.events.closing += on_closing
    try:
        webview.start(
            debug=False,
            http_server=False,
            gui='cef',
            localization={},
            args=gpu_args,
            private_mode=False
        )
    except Exception:
        try:
            webview.start()
        except Exception:
            pass

if __name__ == "__main__":
    try:
        from mod.py.account_settings_manager import ensure_account_file
        ensure_account_file()
        start_main_window()
    except Exception:
        sys.exit(0)
