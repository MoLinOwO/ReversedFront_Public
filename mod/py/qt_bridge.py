"""Qt Bridge - JavaScript 與 Python 的橋接層"""

import json
from PyQt6.QtCore import QObject, pyqtSlot
from PyQt6.QtWidgets import QApplication


class QtBridge(QObject):
    """連接 JavaScript 和 Python 的橋接類"""
    
    def __init__(self, api, main_window=None):
        super().__init__()
        self.api = api
        self.main_window = main_window
    
    @pyqtSlot(result=str)
    def get_accounts(self):
        result = self.api.get_accounts() if self.api else []
        return json.dumps(result, ensure_ascii=False)
    
    @pyqtSlot(str, result=str)
    def add_account(self, data_json):
        data = json.loads(data_json)
        result = self.api.add_account(data) if self.api else False
        return json.dumps(result, ensure_ascii=False)
    
    @pyqtSlot(int, result=str)
    def delete_account(self, idx):
        result = self.api.delete_account(idx) if self.api else False
        return json.dumps(result, ensure_ascii=False)
    
    @pyqtSlot(int, result=str)
    def set_active_account(self, idx):
        result = self.api.set_active_account(idx) if self.api else False
        return json.dumps(result, ensure_ascii=False)
    
    @pyqtSlot(result=str)
    def get_active_account(self):
        result = self.api.get_active_account() if self.api else None
        return json.dumps(result, ensure_ascii=False)
    
    @pyqtSlot(int, int, result=bool)
    def set_window_size(self, width, height):
        return self.api.set_window_size(width, height) if self.api else False
    
    @pyqtSlot(result=bool)
    def toggle_fullscreen(self):
        if self.main_window:
            self.main_window.toggle_fullscreen_mode()
            return True
        return False
    
    @pyqtSlot()
    def toggle_menu(self):
        """切換控制面板顯示/隱藏"""
        script = """
        (function() {
            if (window.toggleControlPanel) {
                window.toggleControlPanel();
            } else {
                const panel = document.getElementById('custom-controls');
                const toggle = document.getElementById('custom-controls-toggle');
                if (panel && toggle) {
                    if (panel.style.display === 'none' || !panel.style.display) {
                        panel.style.display = 'block';
                        toggle.style.display = 'none';
                    } else {
                        panel.style.display = 'none';
                        toggle.style.display = 'flex';
                    }
                }
            }
        })();
        """
        if self.main_window and hasattr(self.main_window, 'browser'):
            self.main_window.browser.page().runJavaScript(script)
    
    @pyqtSlot(str, str, result=str)
    def save_yaml(self, filename, content):
        result = self.api.save_yaml(filename, content) if self.api else False
        return json.dumps(result, ensure_ascii=False)
    
    @pyqtSlot(str, result=str)
    def load_yaml(self, filename):
        result = self.api.load_yaml(filename) if self.api else None
        return json.dumps(result, ensure_ascii=False)
    
    @pyqtSlot()
    def exit_app(self):
        print("收到 exit_app 調用")
        if self.api:
            self.api.exit_app()
        QApplication.quit()
    
    @pyqtSlot(str, result=str)
    def save_config_volume(self, data_json):
        data = json.loads(data_json)
        result = self.api.save_config_volume(data) if self.api else False
        return json.dumps(result, ensure_ascii=False)
    
    @pyqtSlot(str, result=str)
    def get_config_volume(self, target_json):
        target = json.loads(target_json) if target_json else None
        result = self.api.get_config_volume(target) if self.api else {}
        return json.dumps(result, ensure_ascii=False)
    
    @pyqtSlot(str, str, result=bool)
    def save_report_faction_filter(self, faction, target_json):
        target = json.loads(target_json) if target_json else None
        return self.api.save_report_faction_filter(faction, target) if self.api else False
    
    @pyqtSlot(str, result=str)
    def get_report_faction_filter(self, target_json):
        target = json.loads(target_json) if target_json else None
        result = self.api.get_report_faction_filter(target) if self.api else '全部'
        return result
    
    @pyqtSlot(str, result=str)
    def check_resource_exists(self, resource_path):
        result = self.api.check_resource_exists(resource_path) if self.api else {'exists': False}
        return json.dumps(result, ensure_ascii=False)
    
    @pyqtSlot(result=str)
    def get_resource_download_status(self):
        result = self.api.get_resource_download_status() if self.api else {}
        return json.dumps(result, ensure_ascii=False)
    
    @pyqtSlot()
    def trigger_update(self):
        """觸發更新下載"""
        print("收到 trigger_update 調用")
        if self.main_window and hasattr(self.main_window, 'trigger_update'):
            self.main_window.trigger_update()
