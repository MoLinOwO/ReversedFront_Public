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
        print(f"[更新] 雲端頁面解析失敗: {e}")
        return None, None, None

def try_cleanup_old_exe(prefix='ReversedFront'):
    exe_path = os.path.abspath(sys.argv[0])
    exe_dir = os.path.dirname(exe_path)
    for fname in os.listdir(exe_dir):
        if fname.endswith('.old') and fname.startswith(prefix):
            old_path = os.path.join(exe_dir, fname)
            for _ in range(10):
                try:
                    if os.path.exists(old_path):
                        os.remove(old_path)
                    break
                except Exception:
                    time.sleep(0.5)

def download_and_restart(filename, download_url, window, prefix='ReversedFront'):
    import subprocess
    base_filename = re.sub(r'_v\d+\.\d+', '', filename)
    if not base_filename.lower().endswith('.exe'):
        base_filename += '.exe'
    exe_dir = os.path.dirname(sys.argv[0])
    download_path = os.path.join(exe_dir, base_filename + '.new')
    old_exe_path = os.path.abspath(sys.argv[0])
    old_exe_rename = os.path.join(exe_dir, base_filename + '.old')
    try:
        with requests.get(download_url, stream=True, timeout=30) as dl:
            dl.raise_for_status()
            with open(download_path, 'wb') as f:
                for chunk in dl.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
        window.evaluate_js(f'alert("新版已下載：{base_filename}，即將自動重啟！")')
        time.sleep(1)
        window.destroy()
        try:
            os.rename(old_exe_path, old_exe_rename)
        except Exception:
            pass
        try:
            os.rename(download_path, os.path.join(exe_dir, base_filename))
        except Exception:
            pass
        subprocess.Popen([os.path.join(exe_dir, base_filename)])
        sys.exit(0)
    except Exception as e:
        window.evaluate_js(f'alert("下載新版本失敗: {e}")')
