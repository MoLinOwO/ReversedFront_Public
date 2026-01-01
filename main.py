"""逆統戰：烽火 - 桌面輔助工具
Python 3.14+ Free-threaded 優化版本
"""

import os
import sys

from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import Qt

# 版本與資源配置
LOCAL_VERSION = "2.9"
CLOUD_PAGE_URL = "https://cloud.vtbmoyu.com/s/JKo6TTSGaiGFAts"
RESOURCE_SERVER_BASE = "https://media.komisureiya.com/"

# 導入模組
from mod.py.config_utils import save_exe_path_to_config
from mod.py.resource_cache import ResourceCacheManager
from mod.py.api import Api
from mod.py.http_server import start_http_server
from mod.py.main_window import MainWindow
from mod.py.free_threaded_utils import print_threading_info


def initialize_app():
    """初始化應用程序"""
    print("應用啟動中...")
    
    # Free-threaded: 打印線程模式資訊
    print_threading_info()
    
    # 存儲exe路徑
    save_exe_path_to_config()
    
    # 建立資源緩存管理器實例 (Free-threaded 優化版)
    resource_manager = ResourceCacheManager(server_base_url=RESOURCE_SERVER_BASE)
    
    # 初始化帳號設定管理器
    try:
        from mod.py.account_settings_manager import AccountSettingsManager
        account_settings_manager_instance = AccountSettingsManager()
        import mod.py.account_settings_manager as account_settings_manager
        account_settings_manager.account_settings_manager = account_settings_manager_instance
    except Exception:
        pass
    
    return resource_manager


def start_main_window(api_instance, resource_manager):
    """啟動主視窗"""
    print("創建 QApplication...")
    QApplication.setAttribute(Qt.ApplicationAttribute.AA_UseOpenGLES)
    app = QApplication(sys.argv)
    
    # 啟動 HTTP 服務器
    httpd = start_http_server(8765)
    
    print("創建主視窗...")
    window = MainWindow(api_instance, resource_manager)
    
    print("顯示視窗...")
    window.show()
    print(f"視窗已顯示: {window.isVisible()}")
    
    print("進入事件循環...")
    exit_code = app.exec()
    print(f"應用退出，退出碼: {exit_code}")
    sys.exit(exit_code)


if __name__ == "__main__":
    # 設置 Chromium 參數 - 完全啟用媒體支援與 GPU 加速
    os.environ['QTWEBENGINE_CHROMIUM_FLAGS'] = (
        '--autoplay-policy=no-user-gesture-required '
        '--enable-features=VaapiVideoDecoder '
        '--disable-features=UseChromeOSDirectVideoDecoder '
        '--enable-accelerated-mjpeg-decode '
        '--enable-gpu-rasterization '
        '--ignore-gpu-blocklist '
        '--disable-software-rasterizer '
        '--enable-zero-copy '
        '--enable-accelerated-video-decode '
        '--enable-accelerated-2d-canvas '
        '--disable-gpu-driver-bug-workarounds '
        '--enable-webgl '
        '--enable-webgl2-compute-context '
        '--num-raster-threads=4 '
    )
    
    print("=" * 50)
    print("逆統戰：烽火 - 啟動中...")
    print("=" * 50)
    
    try:
        print("1. 初始化帳號文件...")
        from mod.py.account_settings_manager import ensure_account_file
        ensure_account_file()
        print("   ✓ 完成")
        
        print("2. 初始化應用...")
        resource_manager = initialize_app()
        api_instance = Api(resource_manager)
        print("   ✓ 完成")
        
        print("3. 啟動主視窗...")
        start_main_window(api_instance, resource_manager)
        
    except Exception as e:
        import traceback
        print("\n" + "=" * 50)
        print("✗ 應用啟動失敗")
        print("=" * 50)
        print(f"錯誤: {e}")
        print("\n詳細錯誤信息:")
        traceback.print_exc()
        print("\n" + "=" * 50)
        input("\n按 Enter 鍵退出...")
        sys.exit(1)

