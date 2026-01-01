"""資源緩存管理模組
Python 3.14+ Free-threaded 優化：使用純線程實現高並發下載
"""

import os
import sys
import time
import shutil
import threading
import urllib.parse
import urllib.request
import urllib.error
import logging
import concurrent.futures
from queue import Queue
# 保留 requests 以兼容現有代碼
import requests

# 禁用日誌
logger = logging.getLogger('ResourceCache')
logger.setLevel(logging.CRITICAL + 1)
logger.disabled = True
logging.basicConfig(handlers=[logging.NullHandler()])


class ResourceCacheManager:
    """資源緩存管理器 (Python 3.14 Free-threaded 優化)
    
    Free-threaded 優化說明：
    - 移除 multiprocessing 依賴，純使用 threading
    - 在 NoGIL 模式下，I/O 密集型下載可真正並行執行
    - 使用線程安全的共享數據結構，避免進程間通信開銷
    - ThreadPoolExecutor 自動利用多核心處理並發下載
    """
    _instance = None
    _is_initialized = False
    _init_lock = threading.Lock()  # 保護初始化的鎖
    
    def __new__(cls, server_base_url="https://media.komisureiya.com/"):
        if cls._instance is None:
            # Free-threaded: 確保 Singleton 初始化的線程安全
            with cls._init_lock:
                if cls._instance is None:
                    cls._instance = super(ResourceCacheManager, cls).__new__(cls)
        return cls._instance
    
    def __init__(self, server_base_url="https://media.komisureiya.com/"):
        if ResourceCacheManager._is_initialized:
            return
        
        # Free-threaded: 雙重檢查鎖定模式 (DCL)
        with ResourceCacheManager._init_lock:
            if ResourceCacheManager._is_initialized:
                return
            
            ResourceCacheManager._is_initialized = True
            self.server_base_url = server_base_url
            
            # Free-threaded: Queue 已是線程安全的
            self.download_queue = Queue()
            
            # Free-threaded: 需要鎖保護的共享狀態
            self._stats_lock = threading.Lock()
            self.download_stats = {
                "start_time": time.time(),
                "bytes_downloaded": 0,
                "last_update": time.time()
            }
            
            self.queue_lock = threading.Lock()
            self.is_downloading = False
            self.should_stop = False
            
            # Python 3.14 Free-threaded: I/O 密集型使用 threading 優於 multiprocessing
            # CPU 核心數 * 2 適合 I/O bound 任務
            cpu_count = os.cpu_count() or 4
            self.max_workers = max(4, min(cpu_count * 2, 32))
            
            print(f"[Free-threaded] 資源下載線程池: {self.max_workers} workers (CPU: {cpu_count} 核心)")
            
            # ThreadPoolExecutor: NoGIL 下可真正並行執行
            self.executor = concurrent.futures.ThreadPoolExecutor(
                max_workers=self.max_workers,
                thread_name_prefix="ResourceDownload"
            )
            
            self.active_downloads = 0
            self.active_downloads_lock = threading.Lock()
            
            # 共享的 HTTP Session (requests.Session 是線程安全的)
            self.session = requests.Session()
            self.session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://game.komisureiya.com/'
            })
            adapter = requests.adapters.HTTPAdapter(
                pool_connections=self.max_workers,
                pool_maxsize=self.max_workers * 2,
                max_retries=3
            )
            self.session.mount('http://', adapter)
            self.session.mount('https://', adapter)
        
        # 判斷是否為打包環境
        if getattr(sys, 'frozen', False):
            if hasattr(sys, '_MEIPASS'):
                self.temp_dir = sys._MEIPASS
            else:
                self.temp_dir = None
        else:
            self.temp_dir = None
        
        # 使用 passionfruit 作為資源存儲目錄（只建立一次，不重複 passionfruit/passionfruit）
        self.base_dir = self._get_resource_cache_dir()
        if not os.path.exists(self.base_dir):
            try:
                os.makedirs(self.base_dir, exist_ok=True)
            except Exception:
                pass
        
        # 原始應用目錄 (用於回退)
        self.app_dir = os.path.abspath(os.path.dirname(sys.argv[0]))
        
        # 設置資源追蹤
        self.downloaded_resources = set()  # 追蹤已下載的資源
        self.download_futures = []  # 追蹤執行中的下載任務
        self.download_thread = None  # 主下載監控線程
    
    def _get_resource_cache_dir(self):
        """獲取 passionfruit 資源緩存目錄"""
        from mod.py.config_utils import get_hidden_config_dir
        cache_dir = get_hidden_config_dir("passionfruit")
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
        """下載單個檔案 (Free-threaded 優化)
        
        Python 3.14 優勢：
        - I/O 操作 (網絡、磁碟) 在 NoGIL 下可完全並行
        - 多個下載任務不會互相阻塞 CPU
        - 使用 Lock 確保共享狀態 (download_stats) 的線程安全
        """
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
                # Free-threaded: 網絡 I/O 在 NoGIL 下完全並行
                response = self.session.get(url, stream=True, timeout=15)
                response.raise_for_status()
                
                # 獲取檔案大小
                total_size = int(response.headers.get('content-length', 0))
                bytes_downloaded = 0
                start_time = time.time()
                
                with open(temp_file, 'wb') as f:
                    # Free-threaded: 16KB chunk size 適合多線程並發寫入
                    for chunk in response.iter_content(chunk_size=16384):
                        if chunk:
                            bytes_downloaded += len(chunk)
                            f.write(chunk)
                            
                            # Free-threaded: 使用 Lock 保護共享狀態更新
                            current_time = time.time()
                            with self._stats_lock:
                                self.download_stats["bytes_downloaded"] += len(chunk)
                                self.download_stats["last_update"] = current_time
                
                # 原子操作：重命名到最終檔名
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
        
        # 處理資源路徑，確保不會重複 passionfruit/passionfruit
        if resource_path.startswith('assets/passionfruit/'):
            resource_path = resource_path[len('assets/'):]
        elif resource_path.startswith('passionfruit/'):
            resource_path = resource_path[len('passionfruit/'):]
        else:
            # 非 passionfruit 開頭的資源路徑，不處理
            return False

        # 移除URL參數 (?t=xxx)
        clean_resource_path = resource_path
        if '?' in clean_resource_path:
            clean_resource_path = clean_resource_path.split('?')[0]

        # 構建本地路徑 (隱藏的資源目錄)
        local_path = clean_resource_path.lstrip('/')
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
        remote_url = urllib.parse.urljoin(self.server_base_url, local_path)
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
