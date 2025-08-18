import os
import sys
import json
import shutil

def get_hidden_config_dir(target="data"):
    """
    獲取設定檔目錄。
    target: "data" 則回傳 mod/data，"passionfruit" 則回傳 passionfruit
    """
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
    if target == "passionfruit":
        config_dir = os.path.join(root, "passionfruit")
    else:
        config_dir = os.path.join(root, "mod", "data")
    os.makedirs(config_dir, exist_ok=True)
    return config_dir

def get_config_file():
    # 儲存於 mod/data/config.json
    hidden_dir = get_hidden_config_dir("data")
    hidden_config = os.path.join(hidden_dir, 'config.json')
    return hidden_config


def update_config_fields(fields: dict, force_update=False):
    """
    統一更新 config.json 指定欄位，其餘欄位完整保留。
    僅更新 value 不為 None 的欄位。
    
    Args:
        fields (dict): 要更新的欄位
        force_update (bool): 如果為True，強制更新；如果為False，只有當值不同時才更新
    """
    CONFIG_FILE = get_config_file()
    config = {}
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                config = json.load(f)
        except Exception:
            config = {}
            
    # 檢查是否需要更新
    need_update = False
    for k, v in fields.items():
        if v is not None:
            if force_update or k not in config or config[k] != v:
                config[k] = v
                need_update = True
    
    # 只有當有變更時才寫入文件
    if need_update:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)


def save_exe_path_to_config():
    """
    保存執行路徑到配置，但不覆蓋現有的值如果不是同一個程序
    檢測是否與現有配置中的exe_path不同，如果不同，保留現有值
    """
    exe_path = os.path.abspath(sys.argv[0])
    
    # 檢查現有配置中的exe_path
    current_config = {}
    config_file = get_config_file()
    if os.path.exists(config_file):
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                current_config = json.load(f)
        except Exception:
            pass
    
    # 如果現有配置中沒有exe_path或與當前路徑相同，則更新
    if 'exe_path' not in current_config or current_config['exe_path'] == exe_path:
        update_config_fields({'exe_path': exe_path}, force_update=False)
    # 否則，表示這是多個實例在運行，保留現有配置


def get_account_file():
    """
    此方法保留用於向後兼容，但現在帳戶儲存在 config.json 中
    如果需要使用舊版帳號檔，將會自動合併到新配置中
    """
    # 檢查是否有舊的帳號檔需要合併
    base_path = os.path.abspath(os.path.dirname(sys.argv[0]))
    old_account_file = os.path.normpath(os.path.join(base_path, 'account_list.json'))
    hidden_dir = get_hidden_config_dir()
    old_hidden_account_file = os.path.normpath(os.path.join(hidden_dir, 'account_list.json'))
    
    # 如果有任一舊帳號文件存在，嘗試合併到新配置
    for old_file in [old_account_file, old_hidden_account_file]:
        if os.path.exists(old_file):
            try:
                # 讀取舊帳號文件
                with open(old_file, 'r', encoding='utf-8') as f:
                    old_data = json.load(f)
                    
                # 獲取當前配置
                config_file = get_config_file()
                config = {}
                if os.path.exists(config_file):
                    with open(config_file, 'r', encoding='utf-8') as f:
                        config = json.load(f)
                
                # 合併帳戶數據
                if 'accounts' in old_data and old_data['accounts']:
                    config['accounts'] = old_data['accounts']
                    if 'active' in old_data:
                        config['active'] = old_data['active']
                    
                    # 保存合併後的配置
                    with open(config_file, 'w', encoding='utf-8') as f:
                        json.dump(config, f, ensure_ascii=False, indent=2)
                    
                    # 備份舊文件
                    backup_file = f"{old_file}.bak"
                    shutil.copyfile(old_file, backup_file)
            except Exception:
                pass
                
    return get_config_file()  # 返回配置文件路徑
