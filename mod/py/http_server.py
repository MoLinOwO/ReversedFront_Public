"""HTTP 服務器 - 提供本地文件訪問
Python 3.14+ Free-threaded 優化：使用 ThreadingMixIn 實現真正的多核並行處理
"""

import os
import threading
import socketserver
from http.server import SimpleHTTPRequestHandler
from concurrent.futures import ThreadPoolExecutor


class QuietHTTPRequestHandler(SimpleHTTPRequestHandler):
    """靜默的 HTTP 請求處理器，只記錄媒體文件請求
    
    Free-threaded 優勢：在 NoGIL 模式下，每個請求處理線程可真正並行執行
    """
    
    def log_message(self, format, *args):
        # 只記錄媒體文件請求
        if any(ext in self.path for ext in ['.mp4', '.webm', '.mp3']):
            print(f"[HTTP] {self.command} {self.path}")
    
    def end_headers(self):
        # 添加 CORS 和媒體相關標頭
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Accept-Ranges', 'bytes')
        SimpleHTTPRequestHandler.end_headers(self)


class ThreadedHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    """多線程 HTTP 服務器
    
    Python 3.14 Free-threaded 優化：
    - ThreadingMixIn 在 NoGIL 下可真正利用多核心
    - 多媒體文件並發請求不會互相阻塞
    - 記憶體開銷低於 multiprocessing，啟動速度快
    """
    daemon_threads = True  # 主線程結束時自動終止所有工作線程
    allow_reuse_address = True


def start_http_server(port=8765):
    """啟動多線程 HTTP 服務器
    
    Free-threaded 資源優勢：
    - 使用 threading 而非 multiprocessing，記憶體共享更高效
    - 在 python3.14t 下可真正並行處理多個請求
    - CPU 核心利用率提升，適合同時服務多個媒體文件請求
    """
    handler = QuietHTTPRequestHandler
    httpd = ThreadedHTTPServer(("127.0.0.1", port), handler)
    
    def serve():
        cpu_count = os.cpu_count() or 4
        print(f"HTTP 服務器啟動於 http://127.0.0.1:{port}")
        print(f"[Free-threaded] 多線程模式，可並行處理請求 (CPU 核心: {cpu_count})")
        httpd.serve_forever()
    
    # Free-threaded: 使用 daemon 線程，利用 NoGIL 特性
    thread = threading.Thread(target=serve, daemon=True, name="HTTP-Server")
    thread.start()
    return httpd
