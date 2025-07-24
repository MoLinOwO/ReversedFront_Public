"""
API 接口類模塊
提供給 WebView 的 JS API 接口
"""

import os
import sys
import threading
import traceback
import webview
from typing import Any, Dict, Optional

# 導入其他模塊
from mod.py.account_manager import get_accounts, add_account, delete_account, set_active_account, get_active_account
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
    
    def toggle_fullscreen(self) -> None:
        """切換全屏模式"""
        window = webview.windows[0]
        window.toggle_fullscreen()
    
    def save_yaml(self, filename: str, content: Any) -> Any:
        """保存 YAML 文件"""
        return save_yaml(filename, content)
    
    def load_yaml(self, filename: str) -> Any:
        """加載 YAML 文件"""
        return load_yaml(filename)
    
    def exit_app(self) -> None:
        """退出應用"""
        # 停止所有背景線程和服務
        def _cleanup_and_close():
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
                
            # 4. 最後才銷毀視窗
            try:
                if webview.windows:
                    webview.windows[0].destroy()
            except:
                pass
                
            # 5. 最後強制退出程序
            import sys
            import os
            try:
                # 使用 os._exit 確保完全退出，不執行任何清理操作
                os._exit(0)
            except:
                sys.exit(0)
                
        # 使用線程執行清理和關閉操作
        thread = threading.Thread(target=_cleanup_and_close)
        thread.daemon = True  # 設置為守護線程
        thread.start()
    
    def save_config_volume(self, data: Dict[str, Any]) -> Any:
        """保存音量設定到配置文件"""
        try:
            update_config_fields({
                'bgm_volume': data.get('bgm'),
                'se_volume': data.get('se'),
                'se147_muted': data.get('se147Muted')
            })
            # 移除日誌輸出，避免黑視窗閃爍
            return True
        except Exception as e:
            # 移除日誌輸出，避免黑視窗閃爍
            return {'error': str(e)}
    
    def get_config_volume(self) -> Dict[str, Any]:
        """從配置文件獲取音量設定"""
        import json
        from mod.py.config_utils import get_config_file
        config_path = get_config_file()
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                # 明確轉換欄位名稱，確保 JS 能正確同步
                return {
                    'bgm': config.get('bgm_volume', 1.0),
                    'se': config.get('se_volume', 1.0),
                    'se147Muted': config.get('se147_muted', False)
                }
            except Exception:
                return {'bgm': 1.0, 'se': 1.0, 'se147Muted': False}
        else:
            return {'bgm': 1.0, 'se': 1.0, 'se147Muted': False}
    
    def save_report_faction_filter(self, faction: str) -> bool:
        """保存戰報陣營過濾設定"""
        try:
            update_config_fields({'report_faction_filter': faction})
            # 移除日誌輸出，避免黑視窗閃爍
            return True
        except Exception as e:
            # 移除日誌輸出，避免黑視窗閃爍
            return False

    def get_report_faction_filter(self) -> str:
        """獲取戰報陣營過濾設定"""
        import json
        from mod.py.config_utils import get_config_file
        config_path = get_config_file()
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                return config.get('report_faction_filter', '全部')
            except Exception:
                return '全部'
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
