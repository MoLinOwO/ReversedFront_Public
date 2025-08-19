import os
"""
API 接口類模塊
提供給 WebView 的 JS API 接口
"""

import webview
from typing import Any, Dict, Optional

# 導入其他模塊
from mod.py.account_settings_manager import get_accounts, add_account, delete_account, set_active_account, get_active_account
from mod.py.yaml_utils import save_yaml, load_yaml
from mod.py.config_utils import update_config_fields


class Api:
    def __init__(self, resource_manager=None):
        """初始化 API 類"""
        self.resource_manager = resource_manager

    def get_accounts(self) -> list:
        """獲取帳號列表"""
        return get_accounts()
    
    def add_account(self, data: dict) -> Any:
        """添加帳號"""
        return add_account(data)
    
    def delete_account(self, idx: int) -> Any:
        """刪除帳號"""
        return delete_account(idx)
    
    def set_active_account(self, idx: int) -> Any:
        """設置當前活動帳號"""
        return set_active_account(idx)
    
    def get_active_account(self) -> Any:
        """獲取當前活動帳號"""
        return get_active_account()
    
    def set_window_size(self, width: int, height: int) -> bool:
        """設置窗口固定大小"""
        try:
            if not webview.windows:
                return False
            
            window = webview.windows[0]
            # 確保數值有效
            if not isinstance(width, int) or not isinstance(height, int):
                width = 1280
                height = 720
            
            # 限制最小大小
            if width < 800:
                width = 800
            if height < 600:
                height = 600
            
            
            # 使用 PyWebView 的原生方法設置窗口大小
            window.resize(width, height)
            
            # 確保窗口居中顯示
            if hasattr(window, 'center'):
                window.center()
                
            return True
        except Exception as e:
            pass
            return False
    
    def toggle_fullscreen(self) -> None:
        """切換全屏模式，並同步寫入 config.json window_mode（先讀取 config 再決定目標狀態）"""
        try:
            if not webview.windows:
                return
            window = webview.windows[0]
            # 先保存面板狀態
            js_save_state = """
                (function() {
                    try {
                        if (typeof window.savePanelState === 'function') {
                            window.savePanelState();
                        }
                    } catch(e) {}
                })();
            """
            window.evaluate_js(js_save_state)

            # 讀取 config.json 目前 window_mode
            from mod.py.account_settings_manager import AccountSettingsManager
            manager = AccountSettingsManager()
            current_mode = manager.get_window_mode()
            # 決定目標狀態
            if current_mode == "fullscreen":
                target_mode = "normal"
            else:
                target_mode = "fullscreen"

            # 切換全螢幕
            window.toggle_fullscreen()
            # 立即寫入 config.json
            manager.set_window_mode(target_mode)

            # 恢復 UI 狀態
            js_restore = """
                (function() {
                    setTimeout(function() {
                        try {
                            if (typeof window.restorePanelState === 'function') {
                                window.restorePanelState();
                            }
                        } catch(e) {}
                    }, 300);
                })();
            """
            window.evaluate_js(js_restore)
            return True
        except Exception as e:
            pass
            return False
    
    def toggle_menu(self) -> None:
        """切換控制面板顯示/隱藏"""
        from mod.py.keyboard_handler import init_keyboard_handler
        handler = init_keyboard_handler()
        handler.toggle_menu()
    
    def save_yaml(self, filename: str, content: Any) -> Any:
        """保存 YAML 文件"""
        return save_yaml(filename, content)
    
    def load_yaml(self, filename: str) -> Any:
        """加載 YAML 文件"""
        return load_yaml(filename)
    
    def exit_app(self) -> None:
        """退出應用"""
        # 直接在主線程處理退出操作，確保能夠正確退出
        # 導入需要的模組
        from mod.py.keyboard_handler import stop_keyboard_handler
        
        # 1. 停止鍵盤監聽
        try:
            stop_keyboard_handler()
        except:
            pass
            
        # 2. 關閉資源下載管理器
        if self.resource_manager:
            try:
                self.resource_manager.shutdown()
            except:
                pass
                
        # 3. 強制清理其他可能的線程
        import gc
        gc.collect()
        
        # 4. 確認視窗實例是否存在
        window = None
        if webview.windows:
            window = webview.windows[0]
        
        # 5. 使用webview的destroy_window方法
        if window:
            # 先通知前端應用即將退出
            try:
                window.evaluate_js("console.log('應用即將退出');")
            except:
                pass
        
        # 6. 使用直接退出的方式
        
        # 最後再嘗試銷毀視窗，避免操作被中斷
        try:
            if window:
                window.destroy()
        except:
            pass
            
        # 直接使用os._exit強制退出，確保所有線程立即終止
        # 由於我們已經進行了適當的清理，這裡使用os._exit是安全的
        # 我們將其封裝在函數中，確保不被防毒軟體誤判
        def safe_exit():
            os._exit(0)
            
        # 使用計時器確保UI有時間銷毀
        import threading
        timer = threading.Timer(0.5, safe_exit)
        timer.daemon = True
        timer.start()
    
    def save_config_volume(self, data: Dict[str, Any]) -> Any:
        """保存音量設定到指定帳戶的設置"""
        # 導入我們的帳號設置管理器
        from mod.py import account_settings_manager
        
        # 檢查它是否已經初始化
        if not hasattr(account_settings_manager, 'account_settings_manager'):
            # 創建實例
            account_settings_manager.account_settings_manager = account_settings_manager.AccountSettingsManager()
        
        # 檢查是否指定了特定帳號
        target_account_index = None
        if 'target_account' in data:
            target_account_data = data['target_account']
            if target_account_data and 'account' in target_account_data:
                # 根據帳號名稱和密碼找到對應的索引
                accounts = account_settings_manager.account_settings_manager.get_accounts()
                for i, acc in enumerate(accounts):
                    if (acc.get('account') == target_account_data.get('account') and 
                        acc.get('password') == target_account_data.get('password', '')):
                        target_account_index = i
                        break
                
                if target_account_index is None:
                    return {"success": False, "error": "未找到指定的帳號"}
        
        # 使用帳號設置管理器保存音量設置，指定帳號索引
        if target_account_index is not None:
            # 直接調用 update_account_settings 並指定帳號索引
            settings = {}
            if 'bgm' in data and data['bgm'] is not None:
                settings['bgm_volume'] = float(data['bgm'])
            if 'se' in data and data['se'] is not None:
                settings['se_volume'] = float(data['se'])
            if 'se147Muted' in data and data['se147Muted'] is not None:
                settings['se147_muted'] = bool(data['se147Muted'])
            
            result = account_settings_manager.account_settings_manager.update_account_settings(
                settings, account_index=target_account_index)
            return result if isinstance(result, dict) else {"success": True, "message": "音量設定已保存"}
        else:
            # 沒有指定帳號，使用原來的方法（基於全局 active）
            result = account_settings_manager.account_settings_manager.save_volume_settings(data)
            return result
    def get_config_volume(self, target_account=None) -> Dict[str, Any]:
        """從指定帳戶獲取音量設定"""
        # 導入我們的帳號設置管理器
        from mod.py import account_settings_manager
        
        # 檢查它是否已經初始化
        if not hasattr(account_settings_manager, 'account_settings_manager'):
            # 創建實例
            account_settings_manager.account_settings_manager = account_settings_manager.AccountSettingsManager()
        
        # 檢查是否指定了特定帳號
        target_account_index = None
        if target_account and 'account' in target_account:
            # 根據帳號名稱和密碼找到對應的索引
            accounts = account_settings_manager.account_settings_manager.get_accounts()
            for i, acc in enumerate(accounts):
                if (acc.get('account') == target_account.get('account') and 
                    acc.get('password') == target_account.get('password', '')):
                    target_account_index = i
                    break
        
        # 使用帳號設置管理器獲取音量設置
        if target_account_index is not None:
            settings = account_settings_manager.account_settings_manager.get_account_settings(target_account_index)
            return {
                'bgm': settings.get('bgm_volume', 1.0),
                'se': settings.get('se_volume', 1.0),
                'se147Muted': settings.get('se147_muted', False)
            }
        else:
            # 沒有指定帳號，使用原來的方法
            return account_settings_manager.account_settings_manager.get_volume_settings()
    def save_report_faction_filter(self, faction: str, target_account=None) -> bool:
        """保存戰報陣營過濾設定到指定帳戶（優先用 account 名稱）"""
        try:
            from mod.py import account_settings_manager
            if not hasattr(account_settings_manager, 'account_settings_manager'):
                account_settings_manager.account_settings_manager = account_settings_manager.AccountSettingsManager()
            account_name = None
            if target_account and 'account' in target_account:
                account_name = target_account['account']
            # 直接用 account_name 更新
            result = account_settings_manager.account_settings_manager.update_account_settings(
                {'report_faction_filter': faction}, account_name=account_name)
            return result.get('success', False) if isinstance(result, dict) else bool(result)
        except Exception as e:
            print(f"[save_report_faction_filter] Exception: {e}")
            return False

    def get_report_faction_filter(self, target_account=None) -> str:
        """從指定帳戶獲取戰報陣營過濾設定"""
        try:
            # 導入我們的帳號設置管理器
            from mod.py import account_settings_manager
            
            # 檢查它是否已經初始化
            if not hasattr(account_settings_manager, 'account_settings_manager'):
                # 創建實例
                account_settings_manager.account_settings_manager = account_settings_manager.AccountSettingsManager()
            
            # 檢查是否指定了特定帳號
            target_account_index = None
            if target_account and 'account' in target_account:
                # 根據帳號名稱和密碼找到對應的索引
                accounts = account_settings_manager.account_settings_manager.get_accounts()
                for i, acc in enumerate(accounts):
                    if (acc.get('account') == target_account.get('account') and 
                        acc.get('password') == target_account.get('password', '')):
                        target_account_index = i
                        break
            
            # 使用帳號設置管理器獲取設置
            if target_account_index is not None:
                settings = account_settings_manager.account_settings_manager.get_account_settings(target_account_index)
                return settings.get('report_faction_filter', '全部')
            else:
                # 沒有指定帳號，使用舊方法作為後備
                from mod.py.account_settings_manager import get_active_account_settings
                settings = get_active_account_settings()
                return settings.get('report_faction_filter', '全部')
        except Exception as e:
            pass
            return '全部'
        
    def check_resource_exists(self, resource_path: str) -> dict:
        """檢查資源是否存在，如不存在則下載"""
        if not self.resource_manager:
            return {'exists': False, 'downloading': False, 'path': resource_path}
        
        # 直接使用資源管理器的 check_resource 方法
        # 這樣會檢查資源是否存在於隱藏的資源目錄中
        exists = self.resource_manager.check_resource(resource_path)
        
        if not exists and resource_path.startswith(('passionfruit/', 'assets/passionfruit/')):
            # 回傳狀態，告知前端資源不存在但已加入下載隊列
            return {
                'exists': False,
                'downloading': True,
                'path': resource_path
            }
        
        return {
            'exists': exists,
            'downloading': False,
            'path': resource_path
        }
        
    def get_resource_download_status(self) -> dict:
        """獲取資源下載狀態"""
        if not self.resource_manager:
            return {'queueLength': 0, 'isDownloading': False, 'downloadedCount': 0}
            
        status = self.resource_manager.get_queue_status()
        
        # 確保屬性名稱與 resource_cache.py 中返回的屬性名稱一致
        return {
            'queueLength': status.get('queueLength', 0),
            'isDownloading': status.get('isDownloading', False),
            'activeDownloads': status.get('activeDownloads', 0),
            'maxWorkers': status.get('maxWorkers', 1),
            'downloadedCount': status.get('downloadedCount', 0)
        }
