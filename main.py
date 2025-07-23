import os
import sys
import shutil
import requests
import re
import subprocess
from typing import Any, Dict, Optional

# 本地版本號
LOCAL_VERSION = "1.8"
# 雲端分享頁面
CLOUD_PAGE_URL = "https://cloud.vtbmoyu.com/s/JKo6TTSGaiGFAts"
# 解析版本號用正則
VERSION_PATTERN = re.compile(r"v(\d+\.\d+)")

# 僅在根目錄沒有 config.json 時才複製範本，不覆蓋已存在檔案
root_config = os.path.abspath(os.path.join(os.path.dirname(sys.argv[0]), 'config.json'))
default_config = os.path.abspath(os.path.join(os.path.dirname(__file__), 'mod', 'data', 'config.json'))
if not os.path.isfile(root_config):
    if os.path.isfile(default_config):
        try:
            shutil.copyfile(default_config, root_config)
            print(f'[設定] 已從 {default_config} 複製預設 config.json 到 {root_config}')
        except Exception as e:
            print(f'[設定] 複製預設 config.json 失敗: {e}')

import webview
from mod.py.account_manager import get_accounts, add_account, delete_account, set_active_account, get_active_account, ensure_account_file
from mod.py.config_utils import save_exe_path_to_config, get_account_file
from mod.py.yaml_utils import save_yaml, load_yaml
from mod.py.auto_update import get_cloud_latest_info, download_and_restart, try_cleanup_old_exe

# 啟動時儲存 exe 路徑到 config.json
save_exe_path_to_config()
ACCOUNT_FILE = get_account_file()

class Api:
    def get_accounts(self) -> list:
        return get_accounts()
    def add_account(self, data: dict) -> Any:
        return add_account(data)
    def delete_account(self, idx: int) -> Any:
        return delete_account(idx)
    def set_active_account(self, idx: int) -> Any:
        return set_active_account(idx)
    def get_active_account(self) -> Any:
        return get_active_account()
    def toggle_fullscreen(self) -> None:
        window = webview.windows[0]
        window.toggle_fullscreen()
    def save_yaml(self, filename: str, content: Any) -> Any:
        return save_yaml(filename, content)
    def load_yaml(self, filename: str) -> Any:
        return load_yaml(filename)
    def exit_app(self) -> None:
        import threading
        def _close():
            webview.windows[0].destroy()
        threading.Thread(target=_close).start()
    def save_config_volume(self, data: Dict[str, Any]) -> Any:
        import traceback
        from mod.py.config_utils import update_config_fields
        try:
            update_config_fields({
                'bgm_volume': data.get('bgm'),
                'se_volume': data.get('se'),
                'se147_muted': data.get('se147Muted')
            })
            print(f'[音量設定] 寫入成功')
            return True
        except Exception as e:
            print(f'[錯誤] 寫入 config.json 失敗: {e}')
            print(traceback.format_exc())
            return {'error': str(e)}
    def get_config_volume(self) -> Dict[str, Any]:
        import json
        config_path = os.path.abspath(os.path.join(os.path.dirname(sys.argv[0]), 'config.json'))
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            # 明確轉換欄位名稱，確保 JS 能正確同步
            return {
                'bgm': config.get('bgm_volume', 1.0),
                'se': config.get('se_volume', 1.0),
                'se147Muted': config.get('se147_muted', False)
            }
        else:
            return {'bgm': 1.0, 'se': 1.0, 'se147Muted': False}
    def auto_login(self, account: str, password: str) -> Any:
        js_code = f'window.autoLogin({repr(account)}, {repr(password)});'
        window = webview.windows[0]
        return window.evaluate_js(js_code)
    def save_report_faction_filter(self, faction: str) -> bool:
        from mod.py.config_utils import update_config_fields
        try:
            update_config_fields({'report_faction_filter': faction})
            print(f'[戰報過濾] 寫入成功: {faction}')
            return True
        except Exception as e:
            print(f'[錯誤] 寫入 report_faction_filter 失敗: {e}')
            return False

    def get_report_faction_filter(self) -> str:
        import json
        config_path = os.path.abspath(os.path.join(os.path.dirname(sys.argv[0]), 'config.json'))
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                return config.get('report_faction_filter', '全部')
            except Exception:
                return '全部'
        return '全部'

# 設定靜態檔案資料夾
static_dir = os.path.abspath(os.path.dirname(__file__))
index_file = os.path.join(static_dir, 'index.html')
if not os.path.exists(index_file):
    raise FileNotFoundError('找不到 index.html，請確認檔案存在於同一資料夾')

def get_version_from_filename(filename: str) -> Optional[str]:
    match = VERSION_PATTERN.search(filename)
    if match:
        return match.group(1)
    return None

def try_cleanup_old_exe() -> None:
    import time
    # 啟動時自我刪除 .old 檔案
    exe_path = os.path.abspath(sys.argv[0])
    exe_dir = os.path.dirname(exe_path)
    for fname in os.listdir(exe_dir):
        if fname.endswith('.old') and fname.startswith('ReversedFront'):
            old_path = os.path.join(exe_dir, fname)
            for _ in range(10):
                try:
                    if os.path.exists(old_path):
                        os.remove(old_path)
                    break
                except Exception:
                    time.sleep(0.5)

try_cleanup_old_exe()

def download_and_restart(filename: str, download_url: str, window: Any) -> None:
    import time
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
        window.evaluate_js(f'alert("新版已下載：{base_filename}，請再次啟動！")')
        time.sleep(1)
        window.destroy()
        # 先將舊 exe 改名
        try:
            os.rename(old_exe_path, old_exe_rename)
        except Exception:
            pass
        # 將新檔案改名為正式檔名
        try:
            os.rename(download_path, os.path.join(exe_dir, base_filename))
        except Exception:
            pass
        # 用 subprocess 啟動新 exe
        subprocess.Popen([os.path.join(exe_dir, base_filename)])
        sys.exit(0)
    except Exception as e:
        window.evaluate_js(f'alert("下載新版本失敗: {e}")')

def start_main_window() -> None:
    api = Api()
    gpu_args = [
        '--enable-gpu',
        '--ignore-gpu-blacklist',
        '--enable-webgl',
        '--enable-accelerated-2d-canvas',
        '--enable-features=VaapiVideoDecoder',
        '--enable-zero-copy',
        '--enable-native-gpu-memory-buffers',
        '--enable-gpu-rasterization',
        '--enable-oop-rasterization',
        '--enable-accelerated-video-decode',
        '--use-gl=desktop',
        '--ignore-gpu-blocklist',
        '--disable-software-rasterizer',
        '--enable-features=CanvasOopRasterization'
    ]
    try:
        window = webview.create_window(
            '逆統戰：烽火',
            index_file,
            js_api=api,
            width=1280,
            height=720,
            resizable=True,
            fullscreen=True,
            gui='cef',
            chromium_args=gpu_args,
            minimized=True
        )
    except Exception:
        window = webview.create_window(
            '逆統戰：烽火',
            index_file,
            js_api=api,
            width=1280,
            height=720,
            resizable=True,
            fullscreen=True
        )

    def on_loaded():
        filename, remote_version, download_url = get_cloud_latest_info(CLOUD_PAGE_URL)
        if remote_version and remote_version != LOCAL_VERSION and download_url:
            js = f'confirm("發現新版本 v{remote_version}，是否下載？")'
            result = window.evaluate_js(js)
            if result:
                download_and_restart(filename, download_url, window)

    window.events.loaded += on_loaded
    webview.start()

if __name__ == "__main__":
    start_main_window()
