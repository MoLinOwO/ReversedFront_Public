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
    
    def set_window_size(self, width: int, height: int) -> bool:
        """設置窗口固定大小"""
        try:
            if not webview.windows:
                print("沒有可用的窗口")
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
            
            print(f"設置窗口大小為: {width}x{height}")
            
            # 使用 PyWebView 的原生方法設置窗口大小
            window.resize(width, height)
            
            # 確保窗口居中顯示
            if hasattr(window, 'center'):
                window.center()
                
            return True
        except Exception as e:
            import traceback
            print(f"設置窗口大小時發生錯誤: {str(e)}")
            traceback.print_exc()
            return False
    
    def toggle_fullscreen(self) -> None:
        """切換全屏模式"""
        try:
            # 獲取第一個窗口
            if not webview.windows:
                print("沒有可用的窗口")
                return
            
            window = webview.windows[0]
            
            # 保存窗口狀態 - 先調用窗口管理器的方法
            js_save_state = """
                (function() {
                    try {
                        console.log('API: 保存窗口狀態...');
                        
                        // 使用窗口管理器的方法保存面板狀態
                        if (typeof window.savePanelState === 'function') {
                            window.savePanelState();
                            console.log('API: 使用窗口管理器保存面板狀態');
                        } else {
                            // 保存控制面板狀態的備用方法
                            const controls = document.getElementById('custom-controls');
                            const toggle = document.getElementById('custom-controls-toggle');
                            if (controls && toggle) {
                                const isOpen = controls.style.display !== 'none' && controls.style.display !== '';
                                let position = { x: 20, y: 20 };
                                
                                try {
                                    const rect = isOpen ? controls.getBoundingClientRect() : toggle.getBoundingClientRect();
                                    position = { x: rect.left, y: rect.top };
                                } catch(e) {}
                                
                                const panelState = {
                                    isOpen: isOpen,
                                    position: position,
                                    timestamp: Date.now()
                                };
                                
                                localStorage.setItem('rf_panel_state', JSON.stringify(panelState));
                                console.log('API: 面板狀態已保存到 localStorage');
                            }
                        }
                        return true;
                    } catch(e) {
                        console.error('API: 保存窗口狀態失敗:', e);
                        return false;
                    }
                })();
            """
            # 執行保存狀態腳本
            window.evaluate_js(js_save_state)
            
            # 切換全屏
            print("執行全屏切換")
            window.toggle_fullscreen()
            
            # 確保重設窗口和UI狀態
            js_restore = """
                (function() {
                    // 延遲執行，確保全屏轉換已完成
                    setTimeout(function() {
                        try {
                            console.log('API: 恢復UI狀態...');
                            
                            // 使用窗口管理器的方法恢復面板狀態
                            if (typeof window.restorePanelState === 'function') {
                                window.restorePanelState();
                                console.log('API: 使用窗口管理器恢復面板狀態');
                            } else {
                                // 恢復控制面板狀態的備用方法
                                const controls = document.getElementById('custom-controls');
                                const toggle = document.getElementById('custom-controls-toggle');
                                if (controls && toggle) {
                                    const savedState = localStorage.getItem('rf_panel_state');
                                    if (savedState) {
                                        const panelState = JSON.parse(savedState);
                                        
                                        // 恢復位置
                                        if (panelState.position) {
                                            controls.style.left = panelState.position.x + 'px';
                                            controls.style.top = panelState.position.y + 'px';
                                            toggle.style.left = panelState.position.x + 'px';
                                            toggle.style.top = panelState.position.y + 'px';
                                        }
                                        
                                        // 恢復開/關狀態
                                        if (panelState.isOpen) {
                                            controls.style.display = 'block';
                                            toggle.style.display = 'none';
                                        } else {
                                            controls.style.display = 'none';
                                            toggle.style.display = 'flex';
                                        }
                                        
                                        console.log('API: 面板狀態已從 localStorage 恢復');
                                    }
                                }
                            }
                            return true;
                        } catch(e) {
                            console.error('API: 恢復UI狀態失敗:', e);
                            return false;
                        }
                    }, 300);
                })();
            """
            # 執行恢復狀態腳本
            window.evaluate_js(js_restore)
            
            return True
        except Exception as e:
            # 記錄錯誤
            import traceback
            print(f"全屏切換發生錯誤: {str(e)}")
            traceback.print_exc()
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
        import os
        import sys
        
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
