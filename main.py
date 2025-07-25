"""逆統戰：烽火 - 桌面輔助工具"""

# 最基本的導入，用於立即禁用輸出
import os
import sys
try:
    # 使用 NUL 而非 'nul'，避免一些殺毒軟體的誤判
    sys.stdout = open(os.devnull, 'w')
    sys.stderr = open(os.devnull, 'w')
except Exception:
    pass

import webview
import builtins
from mod.py.sys_utils import init_app_environment

# 初始化應用環境
init_app_environment()

# 版本與資源配置
LOCAL_VERSION = "2.3"
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
from mod.py import account_settings_manager
try:
    from mod.py.account_settings_manager import AccountSettingsManager
    account_settings_manager_instance = AccountSettingsManager()
    # 全局變量供 API 使用
    account_settings_manager.account_settings_manager = account_settings_manager_instance
    print("成功初始化帳號設定管理器")
except Exception as e:
    print(f"初始化帳號設定管理器失敗: {e}")

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
        
        # 初始化並啟動鍵盤處理器
        keyboard_handler = init_keyboard_handler(window)
        if not start_keyboard_handler():
            # 如果啟動失敗，嘗試再次初始化並啟動
            window.evaluate_js("""
                console.log('正在重新初始化鍵盤處理...');
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
    # 減少一些不必要或可能導致誤判的參數
    gpu_args = [
        '--enable-gpu',
        '--ignore-gpu-blacklist',
        '--disable-logging',
        '--disable-dev-shm-usage',  # 避免共享內存問題
        '--gpu-rasterization',  # 啟用GPU光柵化
        '--enable-accelerated-2d-canvas',  # 啟用加速2D繪圖
        '--enable-webgl',  # 啟用WebGL
        '--disable-features=UseOzonePlatform',  # 修復全屏問題
    ]
    
    # 創建視窗 (使用錯誤處理確保啟動)
    try:
        # 檢查是否有保存的窗口狀態
        # 預設設定 - 全屏模式不限制大小，視窗模式才固定大小
        window_options = {
            'title': '逆統戰：烽火',
            'url': index_file,
            'js_api': api,
            'width': 1280,  # 視窗化模式初始寬度
            'height': 720,  # 視窗化模式初始高度
            'resizable': False,  # 禁止調整大小，保持固定尺寸（僅視窗模式）
            'frameless': False,  # 有框架的視窗，便於系統管理
            'easy_drag': True,   # 允許簡易拖拽
            'fullscreen': True,  # 默認全屏啟動
            'min_size': (800, 600),  # 最小視窗尺寸
            'maximized': False,  # 不使用最大化，直接使用全屏
            'confirm_close': False,  # 避免關閉確認對話框
            'text_select': False,  # 禁止文字選擇
            'background_color': '#000000'  # 黑色背景
        }
        
        # 嘗試完整參數創建視窗
        window = webview.create_window(**window_options)
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
        
        # 強制清理其他資源和記憶體
        import gc
        gc.collect()
            
    # 註冊關閉事件
    window.events.closing += on_closing
    
    # 註冊視窗關閉後的處理函數
    def on_closed():
        """當視窗完全關閉後執行"""
        import sys
        import threading
        
        # 使用更優雅的方式退出，避免強制終止被誤判
        def clean_exit():
            sys.exit(0)
            
        # 使用計時器來確保視窗有時間完全關閉
        timer = threading.Timer(0.5, clean_exit)
        timer.daemon = True
        timer.start()
        
    # 註冊關閉後事件
    window.events.closed += on_closed
    
    # 啟動資源下載執行緒
    resource_manager.start_download_thread()
    
    # 啟動 webview，使用優化後的 GPU 加速參數
    try:
        # 先打印一些信息方便調試
        print(f"正在啟動 PyWebView，版本: {webview.__version__}")
        print(f"使用 GUI 引擎: cef")
        print(f"窗口參數: {window_options}")
        
        # 啟動 webview
        webview.start(
            debug=False,            # 關閉調試
            http_server=False,      # 不使用 HTTP 服務器
            gui='cef',              # 使用 CEF 引擎
            localization={},        # 空本地化設置
            args=gpu_args,          # GPU 加速參數
            private_mode=False      # 非隱私模式，允許儲存狀態
        )
    except Exception as e:
        # 備用方案：記錄錯誤並使用基本參數
        import traceback
        print(f"啟動 PyWebView 時發生錯誤: {e}")
        traceback.print_exc()
        try:
            webview.start()
        except Exception as e2:
            print(f"使用基本參數啟動 PyWebView 也失敗: {e2}")
            traceback.print_exc()

if __name__ == "__main__":
    try:
        # 確保帳戶檔案存在
        from mod.py.account_settings_manager import ensure_account_file
        ensure_account_file()
        
        # 啟動主視窗
        start_main_window()
    except Exception as e:
        print(f"啟動失敗: {e}")
        # 靜默退出程序
        sys.exit(0)
