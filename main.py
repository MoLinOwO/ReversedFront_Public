import webview
from mod.py.account_manager import get_accounts, add_account, delete_account, set_active_account, get_active_account, ensure_account_file
from mod.py.config_utils import save_exe_path_to_config, get_account_file
from mod.py.yaml_utils import save_yaml, load_yaml
import os
import sys

# 啟動時儲存 exe 路徑到 config.json
save_exe_path_to_config()
ACCOUNT_FILE = get_account_file()

class Api:
    def get_accounts(self):
        return get_accounts()
    def add_account(self, data):
        return add_account(data)
    def delete_account(self, idx):
        return delete_account(idx)
    def set_active_account(self, idx):
        return set_active_account(idx)
    def get_active_account(self):
        return get_active_account()
    def toggle_fullscreen(self):
        window = webview.windows[0]
        window.toggle_fullscreen()
    def save_yaml(self, filename, content):
        return save_yaml(filename, content)
    def load_yaml(self, filename):
        return load_yaml(filename)
    def exit_app(self):
        import threading
        def _close():
            webview.windows[0].destroy()
        threading.Thread(target=_close).start()

# 設定靜態檔案資料夾
static_dir = os.path.abspath(os.path.dirname(__file__))
index_file = os.path.join(static_dir, 'index.html')
if not os.path.exists(index_file):
    raise FileNotFoundError('找不到 index.html，請確認檔案存在於同一資料夾')

api = Api()
chromium_args = [
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
    '--use-gl=desktop',  # 或可嘗試 '--use-angle=gl' 依顯卡環境調整
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
        chromium_args=chromium_args
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
webview.start()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        os.execv(sys.executable, ['python'] + sys.argv[1:])
