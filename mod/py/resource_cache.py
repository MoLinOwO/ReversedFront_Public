"""資源緩存管理模組"""

import os
import sys
import time
import shutil
import threading
import urllib.parse
import logging
import requests
import concurrent.futures
import tempfile
import multiprocessing
from queue import Queue
from pathlib import Path

# 禁用日誌
logger = logging.getLogger('ResourceCache')
logger.setLevel(logging.CRITICAL + 1)
logger.disabled = True
logging.basicConfig(handlers=[logging.NullHandler()])

class ResourceCacheManager:
    """資源緩存管理器 (純線程實現)"""
    _instance = None
    _is_initialized = False
    
    def __new__(cls, server_base_url="https://media.komisureiya.com/"):
        if cls._instance is None:
            cls._instance = super(ResourceCacheManager, cls).__new__(cls)
        return cls._instance
    
    def __init__(self, server_base_url="https://media.komisureiya.com/"):
        if ResourceCacheManager._is_initialized:
            return
            
        ResourceCacheManager._is_initialized = True
        self.server_base_url = server_base_url
        self.download_queue = Queue()  # 使用線程安全的隊列
        self.download_stats = {
            "start_time": time.time(),
            "bytes_downloaded": 0,
            "last_update": time.time()
        }
        self.queue_lock = threading.Lock()
        self.is_downloading = False
        self.should_stop = False  # 控制線程停止的標誌
        
        # 確定最佳線程池大小
        cpu_count = multiprocessing.cpu_count()
        self.max_workers = max(1, min(cpu_count * 2, 32))
        
        # 建立下載線程池
        self.executor = concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers)
        self.active_downloads = 0
        self.active_downloads_lock = threading.Lock()
        
        # 共享的HTTP會話 (線程安全)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://game.komisureiya.com/'
        })
        adapter = requests.adapters.HTTPAdapter(
            pool_connections=self.max_workers,
            pool_maxsize=self.max_workers * 2,
            max_retries=3
        )
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)
        self.app_name = "RF_Assist"
        
        # 判斷是否為打包環境
        if getattr(sys, 'frozen', False):
            if hasattr(sys, '_MEIPASS'):
                self.temp_dir = sys._MEIPASS
            else:
                self.temp_dir = None
        else:
            self.temp_dir = None
        
        # 使用隱藏的資源存儲目錄
        self.base_dir = self._get_resource_cache_dir()
        
        # 確保關鍵目錄存在
        passionfruit_dir = os.path.join(self.base_dir, 'passionfruit')
        if not os.path.exists(passionfruit_dir):
            try:
                os.makedirs(passionfruit_dir, exist_ok=True)
                # 在 Windows 上將目錄設為隱藏
                if os.name == 'nt':  
                    try:
                        import ctypes
                        ctypes.windll.kernel32.SetFileAttributesW(self.base_dir, 2)
                    except:
                        pass
            except Exception:
                pass
        
        # 原始應用目錄 (用於回退)
        self.app_dir = os.path.abspath(os.path.dirname(sys.argv[0]))
        
        # 設置資源追蹤
        self.downloaded_resources = set()  # 追蹤已下載的資源
        self.download_futures = []  # 追蹤執行中的下載任務
        self.download_thread = None  # 主下載監控線程
    
    def _get_resource_cache_dir(self):
        """獲取資源緩存目錄"""
        dir_name = self.app_name
        cache_dir = os.path.join(tempfile.gettempdir(), f".{dir_name}_cache")
        os.makedirs(cache_dir, exist_ok=True)
        return cache_dir
        
    def start_download_thread(self):
        """啟動下載執行緒 (純線程模式)"""
        with self.queue_lock:
            if self.download_thread is None or not self.download_thread.is_alive():
                # 重置停止標誌
                self.should_stop = False
                
                # 創建並啟動主下載線程
                self.download_thread = threading.Thread(
                    target=self._download_worker_thread,
                    daemon=True,
                    name="ResourceDownloader"
                )
                self.download_thread.start()
            # 如果線程已經在運行，什麼都不做
    
    def _download_single_file(self, url, local_path):
        """下載單個檔案的實現 (純線程版)"""
        try:
            # 處理路徑中的查詢參數
            if '?' in local_path:
                clean_path = local_path.split('?')[0]
                local_path = clean_path
            
            # 標準化路徑
            abs_path = os.path.normpath(os.path.join(self.base_dir, local_path))
            
            # 檢查檔案是否已存在
            if os.path.exists(abs_path):
                with self.queue_lock:
                    self.downloaded_resources.add(local_path)
                return True
            
            # 確保目錄存在
            dir_path = os.path.dirname(abs_path)
            os.makedirs(dir_path, exist_ok=True)
            
            # 使用臨時檔案避免下載中斷導致檔案損壞
            temp_file = abs_path + '.download'
            
            try:
                # 下載檔案
                response = self.session.get(url, stream=True, timeout=15)
                response.raise_for_status()
                
                # 獲取檔案大小
                total_size = int(response.headers.get('content-length', 0))
                bytes_downloaded = 0
                start_time = time.time()
                
                with open(temp_file, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=16384):  # 較大的塊大小
                        if chunk:
                            bytes_downloaded += len(chunk)
                            f.write(chunk)
                            
                            # 更新下載統計
                            current_time = time.time()
                            with self.active_downloads_lock:
                                self.download_stats["bytes_downloaded"] += len(chunk)
                                self.download_stats["last_update"] = current_time
                
                # 重命名到最終檔名
                if os.path.exists(temp_file):
                    os.rename(temp_file, abs_path)
                
                # 標記為已下載
                with self.queue_lock:
                    self.downloaded_resources.add(local_path)
                
                return True
                
            except Exception:
                # 處理下載錯誤，清理臨時檔案
                if os.path.exists(abs_path):
                    try:
                        os.remove(abs_path)
                    except:
                        pass
                
                if os.path.exists(temp_file):
                    try:
                        os.remove(temp_file)
                    except:
                        pass
                
                return False
                
        except Exception:
            return False
        finally:
            # 更新活動下載計數
            with self.active_downloads_lock:
                self.active_downloads -= 1
    
    def _download_worker_thread(self):
        """主下載工作線程 (純線程實現，無協程)"""
        while not self.should_stop:
            try:
                # 檢查隊列是否為空
                if self.download_queue.empty():
                    with self.active_downloads_lock:
                        if self.active_downloads == 0:
                            self.is_downloading = False
                    time.sleep(0.1)  # 短暫休眠以減少 CPU 使用
                    continue
                
                # 檢查是否已經達到並行下載上限
                with self.active_downloads_lock:
                    if self.active_downloads >= self.max_workers:
                        time.sleep(0.05)
                        continue
                
                # 從隊列獲取下載任務並提交到執行器
                try:
                    resource = self.download_queue.get(block=False)
                    url = resource['url']
                    local_path = resource['local_path']
                    
                    # 標記狀態
                    self.is_downloading = True
                    
                    # 增加活動下載計數
                    with self.active_downloads_lock:
                        self.active_downloads += 1
                    
                    # 提交下載任務到線程池
                    future = self.executor.submit(
                        self._download_single_file, 
                        url, 
                        local_path
                    )
                    
                    # 追蹤下載任務
                    self.download_futures.append(future)
                    
                    # 清理已完成的任務
                    self.download_futures = [f for f in self.download_futures if not f.done()]
                    
                except:
                    # 隊列為空，繼續循環
                    time.sleep(0.05)
                    continue
                    
            except Exception:
                # 全局異常處理
                time.sleep(0.1)
    
    def add_resource_to_queue(self, url, local_path):
        """添加資源到下載隊列 (純線程實現)"""
        # 標準化路徑
        local_path = local_path.replace('\\', '/')
        
        # 處理路徑參數
        clean_path = local_path
        if '?' in clean_path:
            clean_path = clean_path.split('?')[0]
        
        # 檢查檔案是否已存在
        abs_path = os.path.normpath(os.path.join(self.base_dir, clean_path))
        if os.path.exists(abs_path):
            with self.queue_lock:
                self.downloaded_resources.add(local_path)
            return
        
        # 避免重複下載 - 檢查是否已在下載列表中
        with self.queue_lock:
            if local_path in self.downloaded_resources:
                return
        
        # 添加到線程安全的下載隊列
        self.download_queue.put({
            'url': url,
            'local_path': local_path
        })
        
        # 標記為正在下載狀態
        self.is_downloading = True
        
        # 確保下載線程在運行
        self.start_download_thread()

    def check_resource(self, resource_path):
        """檢查資源是否存在，不存在則添加到下載隊列"""
        # 標準化路徑
        resource_path = resource_path.replace('\\', '/')
        
        # 處理資源路徑
        if resource_path.startswith('assets/passionfruit/'):
            resource_path = resource_path[len('assets/'):]
        elif not resource_path.startswith('passionfruit/'):
            # 非 passionfruit 開頭的資源路徑，不處理
            return False
            
        # 移除URL參數 (?t=xxx)
        clean_resource_path = resource_path
        if '?' in clean_resource_path:
            clean_resource_path = clean_resource_path.split('?')[0]
        
        # 構建本地路徑 (隱藏的資源目錄)
        local_path = clean_resource_path
        abs_path = os.path.normpath(os.path.join(self.base_dir, local_path))
        
        # 檢查資源是否已在下載完成列表中
        with self.queue_lock:
            if local_path in self.downloaded_resources:
                return True
        
        # 檢查資源是否存在於隱藏的資源目錄中
        if os.path.exists(abs_path):
            # 如果存在，則添加到已下載資源集合
            with self.queue_lock:
                self.downloaded_resources.add(local_path)
            return True
        
        # 針對 Nuitka/PyInstaller 打包環境的特殊處理
        if getattr(sys, 'frozen', False):
            if hasattr(sys, '_MEIPASS'):  # PyInstaller 環境
                # 檢查是否存在於臨時解壓目錄
                temp_path = os.path.join(sys._MEIPASS, local_path)
                if os.path.exists(temp_path):
                    try:
                        # 複製到我們的隱藏資源目錄
                        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
                        shutil.copy2(temp_path, abs_path)
                        # 標記為已下載
                        with self.queue_lock:
                            self.downloaded_resources.add(local_path)
                        return True
                    except:
                        pass
            
            # 檢查應用程序目錄（用於向後兼容）
            app_path = os.path.normpath(os.path.join(self.app_dir, local_path))
            if os.path.exists(app_path):
                try:
                    # 複製到我們的隱藏資源目錄
                    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
                    shutil.copy2(app_path, abs_path)
                    # 標記為已下載
                    with self.queue_lock:
                        self.downloaded_resources.add(local_path)
                    return True
                except:
                    pass
            
        # 檢查資源是否已在下載隊列中 (使用 Queue 對象)
        # 注意: Queue 沒有直接檢查內容的方法，所以這部分邏輯簡化了
        
        # 資源不存在，添加到下載隊列
        # 構建遠程URL (保留原始URL參數)
        remote_path = resource_path.replace('passionfruit/', '')
        remote_url = urllib.parse.urljoin(self.server_base_url, remote_path)
        
        # 添加到下載隊列
        self.add_resource_to_queue(remote_url, local_path)
        return False
        
    def get_queue_status(self):
        """獲取下載隊列狀態 (實時數據) - 純線程版本"""
        with self.active_downloads_lock:
            # 實時獲取最新狀態數據
            queue_length = self.download_queue.qsize()  # 使用 Queue 的 qsize 方法
            has_active_downloads = self.active_downloads > 0
            
            with self.queue_lock:
                downloaded_count = len(self.downloaded_resources)
            
            # 根據實際狀態判斷當前下載狀態
            is_actually_downloading = queue_length > 0 or has_active_downloads
            
            # 立即更新內部狀態，確保一致性
            self.is_downloading = is_actually_downloading
            
            # 返回精簡的數據結構
            return {
                'queueLength': queue_length,
                'isDownloading': is_actually_downloading,
                'activeDownloads': self.active_downloads,
                'maxWorkers': self.max_workers,
                'downloadedCount': downloaded_count
            }
            
    def shutdown(self):
        """關閉下載管理器，釋放資源 (純線程版本)"""
        # 1. 停止下載線程
        self.should_stop = True
        
        # 2. 清空下載隊列
        while not self.download_queue.empty():
            try:
                self.download_queue.get(block=False)
            except:
                pass
            
        # 3. 標記下載已完成
        with self.active_downloads_lock:
            self.is_downloading = False
            self.active_downloads = 0
            
        # 4. 取消所有執行中的任務
        for future in self.download_futures:
            if not future.done():
                future.cancel()
        
        # 5. 關閉執行器
        if hasattr(self, 'executor'):
            try:
                self.executor.shutdown(wait=False)
            except:
                pass
            
        # 6. 關閉 requests session
        if hasattr(self, 'session'):
            try:
                self.session.close()
            except:
                pass
