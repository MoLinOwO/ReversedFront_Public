import os
import sys
import shutil

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
    def save_config_volume(self, data):
        import json
        import traceback
        config_path = os.path.abspath(os.path.join(os.path.dirname(sys.argv[0]), 'config.json'))
        
        config = {}
        # --- 讀取現有設定 ---
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
            except json.JSONDecodeError as e:
                print(f'[警告] config.json 格式錯誤: {e}. 將重建設定檔。')
                # 格式錯誤，則建立新的 config 物件，但重新填入關鍵資訊
                config = {}
                try:
                    exe_path = os.path.abspath(sys.argv[0])
                    base_path = os.path.abspath(os.path.dirname(sys.argv[0]))
                    account_file = os.path.normpath(os.path.join(base_path, 'account_list.json'))
                    config['exe_path'] = exe_path
                    config['account_file'] = account_file
                    print('[資訊] 已在重建的 config 中重新加入 exe_path 與 account_file。')
                except Exception as e_inner:
                    print(f'[錯誤] 重建關鍵資訊時發生錯誤: {e_inner}')

        # --- 合併傳入的音量變更 ---
        if 'bgm' in data:
            config['bgm_volume'] = data['bgm']
        if 'se' in data:
            config['se_volume'] = data['se']
        if 'se147Muted' in data:
            config['se147_muted'] = data['se147Muted']

        # --- 寫回檔案 ---
        try:
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
            print(f'[音量設定] 寫入成功: {config_path}')
            return True
        except Exception as e:
            print(f'[錯誤] 寫入 config.json 失敗: {e}')
            print(traceback.format_exc())
            return {'error': str(e)}
    def get_config_volume(self):
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
        chromium_args=chromium_args,
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
webview.start(debug=True)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        os.execv(sys.executable, ['python'] + sys.argv[1:])
