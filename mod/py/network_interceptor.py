"""網絡請求攔截器 - 記錄媒體資源請求"""

from PyQt6.QtWebEngineCore import QWebEngineUrlRequestInterceptor


class NetworkInterceptor(QWebEngineUrlRequestInterceptor):
    """攔截並記錄所有網絡請求，用於調試媒體資源載入問題"""
    
    def __init__(self):
        super().__init__()
        self.failed_requests = []
    
    def interceptRequest(self, info):
        url = info.requestUrl().toString()
        
        # 只記錄媒體相關請求
        if any(ext in url.lower() for ext in ['.mp3', '.mp4', '.wav', '.ogg', '.webm', '.m4a']):
            print(f"[網絡請求] {info.requestMethod().data().decode()} {url}")
