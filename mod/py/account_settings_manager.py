"""
帳號設定管理器
集中管理所有與帳號相關的設定，包含音量控制、戰報通知等
支援多開時的設定同步
"""

import os
import json
import tempfile
import shutil
from typing import Dict, List, Any, Optional

from .config_utils import get_config_file

# 預設設定值
DEFAULT_SETTINGS = {
    'bgm_volume': 1.0,
    'se_volume': 1.0,
    'se147_muted': False,
    'report_faction_filter': '全部'
}

class AccountSettingsManager:
    def get_window_mode(self):
        """取得視窗模式 (normal/maximized/fullscreen/geometry)"""
        self._ensure_config_file()
        config = self._read_config()
        if not config:
            return "normal"
        return config.get("window_mode", "normal")

    def set_window_mode(self, mode):
        """設定視窗模式 (normal/maximized/fullscreen/geometry)"""
        self._ensure_config_file()
        config = self._read_config()
        if not config:
            config = {'accounts': [], 'active': 0}
        config["window_mode"] = mode
        return self._save_config(config)
    """帳號設定管理器，集中處理所有與帳號相關的設定"""

    def __init__(self):
        """初始化設定管理器"""
        from .config_utils import get_hidden_config_dir
        self._config_file = os.path.join(get_hidden_config_dir("data"), 'config.json')
        self._config_cache = None
        self._has_fcntl = False
        # 檢查是否支援檔案鎖定
        try:
            import fcntl
            self._has_fcntl = True
        except ImportError:
            self._has_fcntl = False

    def _get_lock(self, file_handle, exclusive=False):
        """獲取檔案鎖"""
        if not self._has_fcntl:
            return
            
        try:
            import fcntl
            if exclusive:
                fcntl.flock(file_handle, fcntl.LOCK_EX)
            else:
                fcntl.flock(file_handle, fcntl.LOCK_SH)
        except Exception as e:
            print(f"獲取檔案鎖失敗: {e}")

    def _release_lock(self, file_handle):
        """釋放檔案鎖"""
        if not self._has_fcntl:
            return
            
        try:
            import fcntl
            fcntl.flock(file_handle, fcntl.LOCK_UN)
        except Exception as e:
            print(f"釋放檔案鎖失敗: {e}")

    def _ensure_config_file(self):
        """確保配置檔案存在並包含有效結構"""
        if not os.path.exists(self._config_file):
            # 創建新的配置檔案
            self._save_config({'accounts': [], 'active': 0})
        else:
            try:
                # 讀取檔案內容，確認結構正確
                config = self._read_config(validate=True)
                if config is None:
                    # 如果讀取失敗或結構不正確，創建新的
                    self._save_config({'accounts': [], 'active': 0})
            except Exception as e:
                print(f"檢查配置檔案失敗: {e}")
                self._save_config({'accounts': [], 'active': 0})

    def _read_config(self, validate=False):
        """讀取配置檔案
        
        Args:
            validate: 是否驗證配置結構並自動修復
            
        Returns:
            配置數據字典，如果讀取失敗返回 None
        """
        if not os.path.exists(self._config_file):
            return None
            
        try:
            with open(self._config_file, 'r', encoding='utf-8') as f:
                self._get_lock(f, exclusive=False)  # 共享鎖用於讀取
                
                content = f.read()
                self._release_lock(f)
                
                if not content.strip():
                    return None
                    
                config = json.loads(content)
                
                # 驗證並修復結構
                if validate:
                    modified = False
                    
                    if 'accounts' not in config:
                        config['accounts'] = []
                        modified = True
                        
                    if 'active' not in config:
                        config['active'] = 0
                        modified = True
                    
                    # 確保 active 是有效索引
                    if not isinstance(config['active'], int) or config['active'] < 0:
                        config['active'] = 0
                        modified = True
                    
                    # 確保所有帳號都有 settings 欄位
                    for acc in config['accounts']:
                        if 'settings' not in acc:
                            acc['settings'] = DEFAULT_SETTINGS.copy()
                            modified = True
                    
                    # 如果有修改，保存回檔案
                    if modified:
                        self._save_config(config)
                
                return config
        except Exception as e:
            print(f"讀取配置檔案失敗: {e}")
            return None

    def _save_config(self, config):
        """安全地保存配置到檔案
        
        Args:
            config: 要保存的配置字典
            
        Returns:
            保存是否成功
        """
        try:
            # 使用臨時檔案避免寫入中斷導致檔案損壞
            temp_file = f"{self._config_file}.tmp"
            with open(temp_file, 'w', encoding='utf-8') as f:
                self._get_lock(f, exclusive=True)  # 獨佔鎖用於寫入
                
                json.dump(config, f, ensure_ascii=False, indent=2)
                
                self._release_lock(f)
            
            # 安全地替換檔案
            shutil.move(temp_file, self._config_file)
            return True
        except Exception as e:
            print(f"保存配置檔案失敗: {e}")
            return False

    def get_accounts(self):
        """獲取所有帳號列表"""
        self._ensure_config_file()
        config = self._read_config()
        return config.get('accounts', []) if config else []

    def get_active_account_index(self):
        """獲取當前活動帳號的索引"""
        self._ensure_config_file()
        config = self._read_config()
        if not config:
            return 0
        
        active = config.get('active', 0)
        accounts = config.get('accounts', [])
        
        # 確保活動帳號索引有效
        if not accounts:
            return 0
        
        if not isinstance(active, int) or active < 0 or active >= len(accounts):
            return 0
            
        return active

    def get_active_account(self):
        """獲取當前活動帳號的資料，總是讀取最新的配置"""
        # 每次都重新讀取配置，確保獲取最新資料
        config = self._read_config(validate=True)
        if not config:
            return None
            
        accounts = config.get('accounts', [])
        active = config.get('active', 0)
        
        if accounts and 0 <= active < len(accounts):
            return accounts[active]
        return None

    def set_active_account(self, index):
        """設置當前活動帳號
        
        Args:
            index: 帳號索引
            
        Returns:
            設置是否成功
        """
        self._ensure_config_file()
        config = self._read_config()
        if not config:
            return False
        
        accounts = config.get('accounts', [])
        
        # 確保索引有效
        if not accounts or not isinstance(index, int) or index < 0 or index >= len(accounts):
            return False
        
        # 更新活動帳號索引
        config['active'] = index
        return self._save_config(config)

    def add_account(self, data):
        """添加或更新帳號
        
        Args:
            data: 帳號資料，必須包含 account 和 password
                 可選包含 settings
                 
        Returns:
            添加/更新是否成功
        """
        if 'account' not in data or 'password' not in data:
            return False
            
        self._ensure_config_file()
        config = self._read_config()
        if not config:
            config = {'accounts': [], 'active': 0}
            
        accounts = config.get('accounts', [])
        
        # 查找是否已有相同帳號
        found = False
        for i, acc in enumerate(accounts):
            if acc['account'] == data['account']:
                # 更新現有帳號
                accounts[i]['password'] = data['password']
                # 保留原有設置或使用給定的設置
                if 'settings' in data:
                    accounts[i]['settings'] = data['settings']
                elif 'settings' not in accounts[i]:
                    accounts[i]['settings'] = DEFAULT_SETTINGS.copy()
                # 設為活動帳號
                config['active'] = i
                found = True
                break
        
        if not found:
            # 添加新帳號，確保包含 settings 欄位
            if 'settings' not in data:
                data['settings'] = DEFAULT_SETTINGS.copy()
            accounts.append(data)
            config['active'] = len(accounts) - 1
        
        # 保存更新後的配置
        config['accounts'] = accounts
        return self._save_config(config)

    def delete_account(self, index):
        """刪除帳號
        
        Args:
            index: 帳號索引
            
        Returns:
            刪除是否成功
        """
        self._ensure_config_file()
        config = self._read_config()
        if not config:
            return False
            
        accounts = config.get('accounts', [])
        active = config.get('active', 0)
        
        # 確保索引有效
        if not accounts or not isinstance(index, int) or index < 0 or index >= len(accounts):
            return False
        
        # 刪除帳號
        accounts.pop(index)
        
        # 調整活動帳號索引
        if active >= len(accounts):
            active = max(0, len(accounts) - 1)
        
        # 保存更新後的配置
        config['accounts'] = accounts
        config['active'] = active
        return self._save_config(config)

    def get_account_settings(self, account_index=None):
        """獲取指定帳號的設置，不指定則獲取當前活動帳號的設置
        
        Args:
            account_index: 帳號索引，不指定則使用當前活動帳號
            
        Returns:
            帳號設置字典，如果找不到帳號則返回預設設置
        """
        accounts = self.get_accounts()
        
        if account_index is None:
            account_index = self.get_active_account_index()
        
        if accounts and 0 <= account_index < len(accounts):
            account = accounts[account_index]
            if 'settings' in account:
                return account['settings']
        
        # 如果找不到帳號或沒有設置，返回預設設置
        return DEFAULT_SETTINGS.copy()

    def update_account_settings(self, settings, account_index=None):
        """更新帳號設置
        
        Args:
            settings: 要更新的設置字典
            account_index: 帳號索引，不指定則使用當前活動帳號
            
        Returns:
            更新是否成功
        """
        if not settings:
            return True  # 沒有設置需要更新
            
        self._ensure_config_file()
        
        # 重要：每次更新前先讀取最新的配置文件
        config = self._read_config()
        if not config:
            return False
            
        accounts = config.get('accounts', [])
        
        # 保留一份當前完整設定的備份，用於安全檢查
        original_settings = None
        
        # 若帳號列表為空，則先獲取現有帳號信息
        if not accounts:
            # 嘗試從本地獲取帳號信息
            try:
                account = self.get_active_account()
                if account and 'account' in account and 'password' in account:
                    # 保留完整帳號資訊
                    new_account = account.copy()  # 深度複製帳號資訊
                    if 'settings' not in new_account:
                        new_account['settings'] = DEFAULT_SETTINGS.copy()
                    accounts.append(new_account)
                    config['accounts'] = accounts
                    original_settings = new_account.get('settings', {}).copy()
            except Exception:
                # 創建默認帳號作為備用
                accounts.append({
                    'account': 'user0',
                    'password': '',
                    'settings': DEFAULT_SETTINGS.copy()
                })
                config['accounts'] = accounts
        
        if account_index is None:
            account_index = config.get('active', 0)
        
        # 確保索引有效
        if not isinstance(account_index, int) or account_index < 0:
            account_index = 0
            
        # 安全檢查：如果 account_index 超過了列表長度太多，可能是異常情況
        if account_index > len(accounts) + 5:
            account_index = 0  # 重置為首個帳號
        
        # 確保有足夠的帳號，但最多只擴展到合理範圍
        while len(accounts) <= account_index:
            if accounts:
                # 深度複製最後一個帳號的全部數據，避免引用問題
                import copy
                last_acc = copy.deepcopy(accounts[-1])
                
                # 保留原帳號名和密碼，僅初始化或補充設置
                if 'settings' not in last_acc or not isinstance(last_acc['settings'], dict):
                    last_acc['settings'] = DEFAULT_SETTINGS.copy()
                else:
                    # 保留設置但確保包含所有默認值
                    for key, value in DEFAULT_SETTINGS.items():
                        if key not in last_acc['settings']:
                            last_acc['settings'][key] = value
                
                accounts.append(last_acc)
                
                # 如果這是第一次擴展，保存原始設置用於安全檢查
                if original_settings is None and account_index == len(accounts) - 1:
                    original_settings = last_acc.get('settings', {}).copy()
            else:
                # 只有在完全沒有帳號時才創建空白帳號
                accounts.append({
                    'account': 'user0',
                    'password': '',
                    'settings': DEFAULT_SETTINGS.copy()
                })
        
        # 確保該帳號有完整的 settings 欄位並獲取備份
        if 'settings' not in accounts[account_index]:
            accounts[account_index]['settings'] = DEFAULT_SETTINGS.copy()
        elif not original_settings:
            # 保存原始設置用於安全檢查
            original_settings = accounts[account_index]['settings'].copy()
        
        # 更新設置，只更新有變更的設置
        need_update = False
        for key, value in settings.items():
            if (value is not None and 
                (key not in accounts[account_index]['settings'] or 
                 accounts[account_index]['settings'][key] != value)):
                accounts[account_index]['settings'][key] = value
                need_update = True
        
        # 安全檢查：確保帳號資訊不會被意外清空
        if ('account' in accounts[account_index] and 
            accounts[account_index]['account'] and 
            'password' in accounts[account_index]):
            # 帳號資訊沒有問題，可以正常保存
            pass
        elif original_settings:
            # 發現帳號資訊有問題，嘗試恢復 
            # 這是為了避免音量調整清除帳號資訊的問題
            current_account = self.get_active_account()
            if current_account and 'account' in current_account and current_account['account']:
                accounts[account_index]['account'] = current_account['account']
                accounts[account_index]['password'] = current_account.get('password', '')
                print("已恢復可能丟失的帳號資訊")
        
        # 只有在有變更時才保存
        if need_update:
            config['accounts'] = accounts
            save_result = self._save_config(config)
            if save_result:
                return {"success": True, "message": "音量設定已保存"}
            else:
                return {"success": False, "error": "保存設定失敗"}
            
        return {"success": True, "message": "無需更新"}
        
    def get_volume_settings(self):
        """獲取當前活動帳號的音量設置
        
        Returns:
            包含音量設置的字典
        """
        settings = self.get_account_settings()
        return {
            'bgm': settings.get('bgm_volume', 1.0),
            'se': settings.get('se_volume', 1.0),
            'se147Muted': settings.get('se147_muted', False)
        }
        
    def save_volume_settings(self, volume_data):
        """保存音量設置到當前活動帳號
        
        Args:
            volume_data: 包含音量設置的字典，可以包含 bgm, se, se147Muted
            
        Returns:
            包含保存結果的字典
        """
        # 印出調試資訊
        print(f"收到音量設定請求: {volume_data}")
        
        settings = {}
        
        # 只更新有提供的設置，避免覆蓋其他設置
        if 'bgm' in volume_data and volume_data['bgm'] is not None:
            settings['bgm_volume'] = float(volume_data['bgm'])
            
        if 'se' in volume_data and volume_data['se'] is not None:
            settings['se_volume'] = float(volume_data['se'])
            
        if 'se147Muted' in volume_data and volume_data['se147Muted'] is not None:
            settings['se147_muted'] = bool(volume_data['se147Muted'])
            
        # 先備份所有帳號資料
        backup_config = self._read_config()
        
        # 先獲取當前完整帳號資料
        current_account = self.get_active_account()
        if not current_account:
            # 如果沒有取得帳號資料，使用索引方法
            print("無法獲取當前帳號資料，使用索引方法")
            current_account_index = self.get_active_account_index()
            return self.update_account_settings(settings, account_index=current_account_index)
        
        # 保存當前帳號資料，用於安全檢查
        current_account_copy = {}
        if 'account' in current_account and current_account['account']:
            current_account_copy['account'] = current_account['account']
        if 'password' in current_account and current_account['password']:
            current_account_copy['password'] = current_account['password']
        
        print(f"當前帳號資訊: {current_account.get('account')}")
        
        # 關鍵：讀取當前配置以確認索引正確
        config = self._read_config()
        if not config or 'accounts' not in config:
            print("無法讀取配置文件")
            return {"success": False, "error": "無法讀取配置文件"}
            
        accounts = config['accounts']
        
        # 查找匹配的帳號索引
        account_index = None
        for i, acc in enumerate(accounts):
            if (acc.get('account') == current_account.get('account') and 
                acc.get('password') == current_account.get('password')):
                account_index = i
                break
        
        if account_index is not None:
            print(f"找到匹配帳號，索引為: {account_index}")
        else:
            print("未找到匹配帳號，使用活動索引")
        
        # 如果找到匹配帳號，使用該索引；否則使用活動索引
        result = None
        if account_index is not None:
            result = self.update_account_settings(settings, account_index=account_index)
        else:
            # 回退到默認方法
            current_account_index = self.get_active_account_index()
            result = self.update_account_settings(settings, account_index=current_account_index)
        
        # 再次檢查帳號資料是否被清空
        after_config = self._read_config()
        if after_config and 'accounts' in after_config:
            after_accounts = after_config['accounts']
            active = after_config.get('active', 0)
            
            # 確保活動索引有效
            if 0 <= active < len(after_accounts):
                after_account = after_accounts[active]
                
                # 檢查帳號資料是否被清空
                if ('account' not in after_account or not after_account['account']) and current_account_copy.get('account'):
                    print("檢測到帳號資訊丟失，嘗試恢復...")
                    
                    # 嘗試恢復帳號資訊
                    after_account['account'] = current_account_copy['account']
                    if 'password' in current_account_copy:
                        after_account['password'] = current_account_copy['password']
                    
                    # 儲存恢復的資訊
                    after_accounts[active] = after_account
                    after_config['accounts'] = after_accounts
                    self._save_config(after_config)
                    print("帳號資訊已恢復")
            
        # 處理回傳值格式
        if isinstance(result, dict):
            return result
        elif result:
            return {"success": True, "message": "音量設定已保存"}
        else:
            return {"success": False, "error": "保存音量設定失敗"}
        
    def get_report_faction_filter(self):
        """獲取戰報陣營過濾設置
        
        Returns:
            過濾陣營名稱
        """
        settings = self.get_account_settings()
        return settings.get('report_faction_filter', '全部')
        
    def save_report_faction_filter(self, faction):
        """保存戰報陣營過濾設置
        
        Args:
            faction: 陣營名稱
            
        Returns:
            保存是否成功
        """
        # 採用與音量設置相同的安全保存策略
        
        # 先獲取當前完整帳號資料
        current_account = self.get_active_account()
        if not current_account:
            # 如果沒有取得帳號資料，使用索引方法
            current_account_index = self.get_active_account_index()
            return self.update_account_settings({'report_faction_filter': faction}, account_index=current_account_index)
        
        # 關鍵：讀取當前配置以確認索引正確
        config = self._read_config()
        if not config or 'accounts' not in config:
            return False
            
        accounts = config['accounts']
        
        # 查找匹配的帳號索引
        account_index = None
        for i, acc in enumerate(accounts):
            if (acc.get('account') == current_account.get('account') and 
                acc.get('password') == current_account.get('password')):
                account_index = i
                break
                
        # 如果找到匹配帳號，使用該索引；否則使用活動索引
        if account_index is not None:
            return self.update_account_settings({'report_faction_filter': faction}, account_index=account_index)
        else:
            # 回退到默認方法
            current_account_index = self.get_active_account_index()
            return self.update_account_settings({'report_faction_filter': faction}, account_index=current_account_index)

# 創建單例實例
account_settings_manager = AccountSettingsManager()

# --------------------------------
# 兼容舊版 account_manager.py 的函數
# --------------------------------

def ensure_account_file():
    """確保配置文件存在並包含必要的帳戶結構 (兼容舊版API)"""
    if account_settings_manager:
        account_settings_manager._ensure_config_file()
    return True

def get_accounts():
    """獲取所有帳戶列表 (兼容舊版API)"""
    if account_settings_manager:
        return account_settings_manager.get_accounts()
    return []

def add_account(data):
    """添加帳號 (兼容舊版API)"""
    if account_settings_manager:
        return account_settings_manager.add_account(data)
    return False

def delete_account(idx):
    """刪除帳號 (兼容舊版API)"""
    if account_settings_manager:
        return account_settings_manager.delete_account(idx)
    return False

def set_active_account(idx):
    """設置當前活動帳戶 (兼容舊版API)"""
    if account_settings_manager:
        return account_settings_manager.set_active_account(idx)
    return False

def get_active_account():
    """獲取當前活動帳戶 (兼容舊版API)"""
    if account_settings_manager:
        return account_settings_manager.get_active_account()
    return None

def get_active_account_settings():
    """獲取當前活動帳戶的設置 (兼容舊版API)"""
    if account_settings_manager:
        return account_settings_manager.get_account_settings()
    return {}

def save_account_settings(settings, force_update=False):
    """保存當前活動帳戶的設置 (兼容舊版API)"""
    if account_settings_manager:
        return account_settings_manager.update_account_settings(settings)
    return False
