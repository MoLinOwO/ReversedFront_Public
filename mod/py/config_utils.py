import os
import sys
import json
import shutil

def get_config_file():
    base_path = os.path.abspath(os.path.dirname(sys.argv[0]))
    return os.path.normpath(os.path.join(base_path, 'config.json'))


def update_config_fields(fields: dict):
    """
    統一更新 config.json 指定欄位，其餘欄位完整保留。
    僅更新 value 不為 None 的欄位。
    """
    CONFIG_FILE = get_config_file()
    config = {}
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except Exception:
            config = {}
    # 只更新有值的欄位
    for k, v in fields.items():
        if v is not None:
            config[k] = v
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def save_exe_path_to_config():
    exe_path = os.path.abspath(sys.argv[0])
    base_path = os.path.abspath(os.path.dirname(sys.argv[0]))
    account_file = os.path.normpath(os.path.join(base_path, 'account_list.json'))
    update_config_fields({'exe_path': exe_path, 'account_file': account_file})


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
