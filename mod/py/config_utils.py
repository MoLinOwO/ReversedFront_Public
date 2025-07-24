import os
import sys
import json
import shutil
import tempfile

def get_hidden_config_dir():
    """獲取設定檔目錄（使用統一的應用目錄）"""
    app_name = "RF_Assist"
    # 使用系統臨時目錄，用下劃線前綴標記
    config_dir = os.path.join(tempfile.gettempdir(), f"__{app_name}")
    # 確保目錄存在
    os.makedirs(config_dir, exist_ok=True)
    return config_dir

def get_config_file():
    # 先檢查隱藏目錄中的設定檔
    hidden_dir = get_hidden_config_dir()
    hidden_config = os.path.join(hidden_dir, 'config.json')
    
    # 如果隱藏設定檔存在，則優先使用它
    if os.path.isfile(hidden_config):
        return hidden_config
    
    # 否則使用應用程式目錄中的設定檔
    base_path = os.path.abspath(os.path.dirname(sys.argv[0]))
    app_config = os.path.normpath(os.path.join(base_path, 'config.json'))
    
    # 如果應用程式目錄中的設定檔存在，則複製到隱藏目錄
    if os.path.isfile(app_config):
        try:
            # 先讀取現有設定檔內容
            with open(app_config, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # 寫入到隱藏目錄
            with open(hidden_config, 'w', encoding='utf-8') as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
                
            return hidden_config
        except Exception:
            # 讀取或寫入失敗時，使用應用程式目錄中的設定檔
            return app_config
    
    # 如果沒有任何設定檔，則使用隱藏目錄中的新檔案
    return hidden_config


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
    # 現在帳號檔將存放在隱藏目錄中
    hidden_dir = get_hidden_config_dir()
    account_file = os.path.normpath(os.path.join(hidden_dir, 'account_list.json'))
    update_config_fields({'exe_path': exe_path, 'account_file': account_file})


def get_account_file():
    CONFIG_FILE = get_config_file()
    
    # 從設定檔獲取帳號檔位置
    account_file = None
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
                if 'account_file' in config:
                    account_file = config['account_file']
        except Exception:
            pass
    
    # 如果沒有設定或找不到檔案，則使用隱藏目錄中的帳號檔
    if not account_file or not os.path.exists(account_file):
        hidden_dir = get_hidden_config_dir()
        account_file = os.path.normpath(os.path.join(hidden_dir, 'account_list.json'))
        
        # 檢查應用程式目錄中是否有舊的帳號檔
        base_path = os.path.abspath(os.path.dirname(sys.argv[0]))
        old_account_file = os.path.normpath(os.path.join(base_path, 'account_list.json'))
        
        if os.path.exists(old_account_file):
            # 如果舊帳號檔存在，則複製到隱藏目錄
            try:
                shutil.copyfile(old_account_file, account_file)
            except Exception:
                pass
    
    # 若帳號檔案不存在，複製範本
    if not os.path.exists(account_file):
        sample_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '../data/account_list.json'))
        if os.path.exists(sample_path):
            try:
                shutil.copyfile(sample_path, account_file)
            except Exception:
                pass
    
    # 更新設定檔中的帳號檔路徑
    update_config_fields({'account_file': account_file})
    return account_file
