import os
import sys
import json
import shutil

def get_config_file():
    base_path = os.path.abspath(os.path.dirname(sys.argv[0]))
    return os.path.normpath(os.path.join(base_path, 'config.json'))


def save_exe_path_to_config():
    CONFIG_FILE = get_config_file()
    exe_path = os.path.abspath(sys.argv[0])
    base_path = os.path.abspath(os.path.dirname(sys.argv[0]))
    account_file = os.path.normpath(os.path.join(base_path, 'account_list.json'))
    # 先讀取現有 config
    config = {}
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except Exception:
            config = {}
    # 更新欄位
    config['exe_path'] = exe_path
    config['account_file'] = account_file
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def get_account_file():
    CONFIG_FILE = get_config_file()
    base_path = os.path.abspath(os.path.dirname(sys.argv[0]))
    account_file = os.path.normpath(os.path.join(base_path, 'account_list.json'))
    # 若帳號檔案不存在，複製範本
    if not os.path.exists(account_file):
        sample_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '../data/account_list.json'))
        if os.path.exists(sample_path):
            shutil.copyfile(sample_path, account_file)
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
                if 'account_file' in config:
                    return config['account_file']
        except Exception:
            pass
    return account_file
