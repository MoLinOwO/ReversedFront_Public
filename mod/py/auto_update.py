import os
import sys
import time
import re
import requests

def get_github_latest_version(repo="MoLinOwO/ReversedFront_PC"):
    """從 GitHub Releases 獲取最新版本"""
    try:
        api_url = f"https://api.github.com/repos/{repo}/releases/latest"
        headers = {'Accept': 'application/vnd.github.v3+json'}
        resp = requests.get(api_url, headers=headers, timeout=10)
        resp.raise_for_status()
        
        data = resp.json()
        tag_name = data.get('tag_name', '')  # 例如: "v2.9.0"
        remote_version = tag_name.lstrip('v')  # 移除開頭的 v
        
        # 查找 Windows 安裝程式
        download_url = None
        filename = None
        for asset in data.get('assets', []):
            name = asset.get('name', '')
            if name.endswith('.exe') and 'Setup' in name:
                download_url = asset.get('browser_download_url')
                filename = name
                break
        
        return filename, remote_version, download_url
    except Exception as e:
        print(f"從 GitHub 獲取版本失敗: {e}")
        return None, None, None

def get_cloud_latest_info(cloud_url):
    """從雲端頁面獲取最新版本（備用方案）"""
    VERSION_PATTERN = re.compile(r"v(\d+\.\d+)")
    try:
        # 嘗試直接構建下載連結 (Nextcloud 分享連結 + /download)
        download_url = cloud_url.rstrip('/') + '/download'
        
        # 發送 HEAD 請求獲取檔名
        resp = requests.head(download_url, timeout=10, allow_redirects=True)
        resp.raise_for_status()
        
        filename = None
        if 'Content-Disposition' in resp.headers:
            cd = resp.headers['Content-Disposition']
            # 嘗試解析 filename="..."
            m = re.search(r'filename="([^"]+)"', cd)
            if m:
                filename = m.group(1)
            else:
                # 嘗試解析 filename*=UTF-8''...
                m = re.search(r"filename\*=UTF-8''([^;]+)", cd)
                if m:
                    import urllib.parse
                    filename = urllib.parse.unquote(m.group(1))
        
        if not filename:
            # 如果無法從 header 獲取，嘗試從 URL 或其他方式猜測，這裡先略過
            return None, None, None

        remote_version = None
        if filename:
            m = VERSION_PATTERN.search(filename)
            if m:
                remote_version = m.group(1)
                
        return filename, remote_version, download_url
    except Exception as e:
        print(f"雲端版本檢查失敗: {e}")
        return None, None, None

def try_cleanup_old_exe(prefix='ReversedFront'):
    """嘗試清理舊版本的執行檔與暫存的更新包"""
    try:
        exe_path = os.path.abspath(sys.argv[0])
        exe_dir = os.path.dirname(exe_path)
        current_exe_name = os.path.basename(exe_path)
        
        for fname in os.listdir(exe_dir):
            file_path = os.path.join(exe_dir, fname)
            should_delete = False
            
            # 1. 清理 .old 備份檔
            if fname.endswith('.old') and fname.startswith(prefix):
                should_delete = True
            
            # 2. 清理 _Update.exe 安裝包
            # 確保不是當前正在執行的程式
            elif (fname.endswith('.exe') and 
                  '_Update' in fname and 
                  fname.startswith(prefix) and 
                  fname.lower() != current_exe_name.lower()):
                should_delete = True
                
            if should_delete:
                for _ in range(5):
                    try:
                        if os.path.exists(file_path):
                            os.remove(file_path)
                        break
                    except Exception:
                        time.sleep(0.2)
    except Exception:
        pass

def prepare_update_paths(filename):
    """準備更新相關的路徑"""
    base_filename = re.sub(r'_v\d+\.\d+', '', filename)
    if not base_filename.lower().endswith('.exe'):
        base_filename += '.exe'
        
    # 檢查是否與當前執行檔名稱衝突
    current_exe = os.path.basename(sys.argv[0])
    if base_filename.lower() == current_exe.lower():
        name, ext = os.path.splitext(base_filename)
        base_filename = f"{name}_Update{ext}"
        
    exe_dir = os.path.dirname(sys.argv[0])
    download_path = os.path.join(exe_dir, base_filename + '.new')
    return base_filename, download_path

def perform_restart(base_filename, download_path):
    """執行替換檔案並重啟"""
    import subprocess
    
    exe_dir = os.path.dirname(sys.argv[0])
    old_exe_path = os.path.abspath(sys.argv[0])
    old_exe_rename = os.path.join(exe_dir, base_filename + '.old')
    
    # 替換舊檔案
    try:
        if os.path.exists(old_exe_rename):
            os.remove(old_exe_rename)
        os.rename(old_exe_path, old_exe_rename)
    except Exception:
        pass
        
    try:
        target_path = os.path.join(exe_dir, base_filename)
        if os.path.exists(target_path):
            os.remove(target_path)
        os.rename(download_path, target_path)
    except Exception:
        pass
        
    # 使用 subprocess.Popen 啟動新程式
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

def download_and_restart(filename, download_url, window, prefix='ReversedFront'):
    """(已棄用，保留相容性) 下載新版本並重啟應用程式"""
    base_filename, download_path = prepare_update_paths(filename)
    
    try:
        # 下載新版本
        print('正在下載更新，請稍候...')
        if hasattr(window, 'browser'):
            window.browser.page().runJavaScript('console.info("正在下載更新，請稍候...")')
        
        with requests.get(download_url, stream=True, timeout=30) as dl:
            dl.raise_for_status()
            with open(download_path, 'wb') as f:
                for chunk in dl.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
        
        # 通知用戶並關閉視窗
        print(f'新版已下載：{base_filename}，即將自動重啟！')
        if hasattr(window, 'browser'):
            window.browser.page().runJavaScript(f'alert("新版已下載：{base_filename}，即將自動重啟！")')
        time.sleep(0.5)
        
        # 安全關閉視窗
        try:
            if hasattr(window, 'close'):
                window.close()
        except Exception:
            pass
            
        perform_restart(base_filename, download_path)
    except Exception:
        pass