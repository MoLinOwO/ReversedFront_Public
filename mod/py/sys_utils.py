"""
系統工具模組 - 處理系統層級的操作，如輸出重定向和系統初始化
"""
import os
import sys
import time
import logging
import shutil
import tempfile
import builtins
import threading
import atexit

def silence_all_output():
    """完全禁用所有標準輸出和錯誤，避免產生黑視窗和被殺毒軟體誤判"""
    try:
        # 使用 os.devnull 替代直接使用 'nul' 字符串
        sys.stdout = open(os.devnull, 'w')
        sys.stderr = open(os.devnull, 'w')
        return True
    except Exception:
        return False

def disable_all_logging():
    """禁用所有日誌輸出"""
    logging.basicConfig(level=logging.CRITICAL+1)
    logger = logging.getLogger()
    logger.disabled = True
    
def setup_hidden_dirs():
    """設置所有必要的隱藏目錄"""
    from mod.py.config_utils import get_hidden_config_dir
    
    # 獲取隱藏目錄
    hidden_dir = get_hidden_config_dir()
    
    # 設置必要的配置文件
    setup_config_files(hidden_dir)
    
    return hidden_dir
    
def setup_config_files(hidden_dir):
    """設置必要的配置文件"""
    hidden_config = os.path.join(hidden_dir, 'config.json')
    root_dir = os.path.dirname(sys.argv[0])
    root_config = os.path.join(root_dir, 'mod', 'data', 'config.json')
    
    # 如果找不到mod目錄下的配置，嘗試應用根目錄
    if not os.path.isfile(root_config):
        root_config = os.path.join(root_dir, 'config.json')
    
    # 使用默認配置
    default_config = os.path.join(root_dir, 'mod', 'data', 'config.json')
    
    # 如果隱藏設定檔不存在
    if not os.path.isfile(hidden_config):
        # 先檢查根目錄是否有設定檔
        if os.path.isfile(root_config):
            try:
                shutil.copyfile(root_config, hidden_config)
            except Exception:
                pass
        # 如果根目錄也沒有，則使用預設範本
        elif os.path.isfile(default_config):
            try:
                shutil.copyfile(default_config, hidden_config)
            except Exception:
                pass

def disable_error_dialogs():
    """禁用 Python 和多處理器的錯誤對話框"""
    if getattr(sys, 'frozen', False) and not hasattr(sys, '_MEIPASS'):  # Nuitka
        try:
            # 設置環境變數，防止 Python 多處理器顯示錯誤對話框
            os.environ["PYTHONMULTIPROCESSING"] = "1"
            os.environ["PYTHONFAULTHANDLER"] = "0"
        except:
            pass

def cleanup_app_resources():
    """清理應用資源並確保正確退出"""
    # 嘗試停止鍵盤處理器
    try:
        from mod.py.keyboard_handler import stop_keyboard_handler
        stop_keyboard_handler()
    except:
        pass
    
    # 安全地結束所有執行緒 (不使用 thread._stop() 方法，改用標準方式)
    current_thread = threading.current_thread()
    threads = list(threading.enumerate())
    
    # 用更安全的方式通知其它線程退出 (可以在各線程加入檢查標誌)
    for thread in threads:
        if thread != current_thread and not thread.daemon:
            if hasattr(thread, 'stop') and callable(thread.stop):
                try:
                    thread.stop()
                except:
                    pass
    
    # 短暫等待線程自行終止
    time.sleep(0.2)
    
    # 安全退出程序
    sys.exit(0)

def init_app_environment():
    """初始化應用環境，執行所有必要的系統初始化步驟"""
    # 禁用所有輸出
    silence_all_output()
    
    # 禁用所有日誌
    disable_all_logging()
    
    # 禁用錯誤對話框
    disable_error_dialogs()
    
    # 設置隱藏目錄和配置文件
    hidden_dir = setup_hidden_dirs()
    
    # 初始化全局應用狀態
    builtins.APP_LOADED = False
    
    # 註冊退出時的清理函數
    atexit.register(cleanup_app_resources)
    
    return hidden_dir
