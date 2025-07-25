import os
import sys
import time
import re
import requests
from bs4 import BeautifulSoup

def get_cloud_latest_info(cloud_url):
    VERSION_PATTERN = re.compile(r"v(\d+\.\d+)")
    try:
        resp = requests.get(cloud_url, timeout=10)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'html.parser')
        direct_div = soup.find('div', class_='directDownload')
        if not direct_div:
            return None, None, None
        file_div = direct_div.find('div')
        filename = file_div.text.strip().split('\xa0')[0] if file_div else None
        a_tag = direct_div.find('a', id='downloadFile')
        download_url = a_tag['href'] if a_tag else None
        remote_version = None
        if filename:
            m = VERSION_PATTERN.search(filename)
            if m:
                remote_version = m.group(1)
        return filename, remote_version, download_url
    except Exception as e:
        import logging
        logging.error(f"[更新] 雲端頁面解析失敗: {e}")
        return None, None, None

def try_cleanup_old_exe(prefix='ReversedFront'):
    """嘗試清理舊版本的執行檔"""
    try:
        exe_path = os.path.abspath(sys.argv[0])
        exe_dir = os.path.dirname(exe_path)
        
        # 完全移除日誌輸出，避免黑視窗閃爍
        class NullLogger:
            def __init__(self): pass
            def debug(self, *args, **kwargs): pass
            def info(self, *args, **kwargs): pass
            def warning(self, *args, **kwargs): pass
            def error(self, *args, **kwargs): pass
            def critical(self, *args, **kwargs): pass
        
        logger = NullLogger()
        
        for fname in os.listdir(exe_dir):
            if fname.endswith('.old') and fname.startswith(prefix):
                old_path = os.path.join(exe_dir, fname)
                for _ in range(5):  # 減少重試次數，避免長時間阻塞
                    try:
                        if os.path.exists(old_path):
                            os.remove(old_path)
                            # 移除日誌輸出，避免黑視窗閃爍
                        break
                    except Exception as e:
                        # 移除日誌輸出，避免黑視窗閃爍
                        time.sleep(0.2)  # 縮短等待時間
    except Exception as e:
        # 完全捕捉所有異常，避免黑視窗出現
        pass

def download_and_restart(filename, download_url, window, prefix='ReversedFront'):
    """下載新版本並重啟應用程式"""
    import subprocess
    
    # 移除日誌輸出，避免黑視窗閃爍
    class NullLogger:
        def __init__(self): pass
        def debug(self, *args, **kwargs): pass
        def info(self, *args, **kwargs): pass
        def warning(self, *args, **kwargs): pass
        def error(self, *args, **kwargs): pass
        def critical(self, *args, **kwargs): pass
    
    logger = NullLogger()
    
    # 處理檔案名稱
    base_filename = re.sub(r'_v\d+\.\d+', '', filename)
    if not base_filename.lower().endswith('.exe'):
        base_filename += '.exe'
        
    # 設定路徑
    exe_dir = os.path.dirname(sys.argv[0])
    download_path = os.path.join(exe_dir, base_filename + '.new')
    old_exe_path = os.path.abspath(sys.argv[0])
    old_exe_rename = os.path.join(exe_dir, base_filename + '.old')
    
    try:
        # 下載新版本
        window.evaluate_js('console.info("正在下載更新，請稍候...")')
        
        # 使用 with 確保資源正確關閉
        with requests.get(download_url, stream=True, timeout=30) as dl:
            dl.raise_for_status()
            with open(download_path, 'wb') as f:
                for chunk in dl.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
        
        # 通知用戶並關閉視窗
        window.evaluate_js(f'alert("新版已下載：{base_filename}，即將自動重啟！")')
        time.sleep(0.5)  # 縮短等待時間
        
        # 安全關閉視窗
        try:
            window.destroy()
        except Exception as e:
            # 移除日誌輸出，避免黑視窗閃爍
            pass
        
        # 替換舊檔案
        try:
            # 如果舊的重命名檔存在，先嘗試刪除
            if os.path.exists(old_exe_rename):
                os.remove(old_exe_rename)
                
            # 重命名當前執行檔
            os.rename(old_exe_path, old_exe_rename)
        except Exception as e:
            # 移除日誌輸出，避免黑視窗閃爍
            pass
            
        try:
            # 如果目標檔案已存在，先嘗試刪除
            target_path = os.path.join(exe_dir, base_filename)
            if os.path.exists(target_path):
                os.remove(target_path)
                
            # 重命名新下載的檔案
            os.rename(download_path, target_path)
        except Exception as e:
            # 移除日誌輸出，避免黑視窗閃爍
            pass
            
        # 使用 subprocess.Popen 啟動新程式，並設定 creationflags 避免顯示控制台視窗
        if sys.platform == 'win32':
            CREATE_NO_WINDOW = 0x08000000
            subprocess.Popen(
                [os.path.join(exe_dir, base_filename)],
                creationflags=CREATE_NO_WINDOW,
                close_fds=True
            )
        else:
            subprocess.Popen(
                [os.path.join(exe_dir, base_filename)],
                start_new_session=True
            )
            
        # 立即退出當前程序
        sys.exit(0)
    except Exception as e:
        # 移除日誌輸出，避免黑視窗閃爍
        pass
        window.evaluate_js(f'alert("下載新版本失敗: {str(e)}")')