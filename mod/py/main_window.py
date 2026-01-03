"""主視窗 - PyQt6 WebEngine 視窗"""

import os
import sys
import tempfile
from PyQt6.QtWidgets import QMainWindow
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEngineSettings, QWebEngineProfile, QWebEngineScript
from PyQt6.QtCore import QUrl, QTimer, pyqtSignal, QThread
from PyQt6.QtWebChannel import QWebChannel
import threading

from .network_interceptor import NetworkInterceptor
from .qt_bridge import QtBridge
from .keyboard_handler import init_keyboard_handler, start_keyboard_handler
from .auto_update import get_github_latest_version, get_cloud_latest_info, download_and_restart, try_cleanup_old_exe, prepare_update_paths, perform_restart
from .constants import LOCAL_VERSION, CLOUD_PAGE_URL
import requests

class UpdateDownloadThread(QThread):
    """更新下載線程"""
    progress_signal = pyqtSignal(int, str)  # 進度百分比, 速度/狀態文字
    finished_signal = pyqtSignal(str)       # 下載完成後的檔案路徑
    error_signal = pyqtSignal(str)          # 錯誤訊息

    def __init__(self, download_url, filename):
        super().__init__()
        self.download_url = download_url
        self.filename = filename
        self._is_running = True

    def run(self):
        try:
            base_filename, download_path = prepare_update_paths(self.filename)
            
            self.progress_signal.emit(0, "正在連接伺服器...")
            
            with requests.get(self.download_url, stream=True, timeout=30) as r:
                r.raise_for_status()
                total_length = r.headers.get('content-length')
                
                if total_length is None: # no content length header
                    self.progress_signal.emit(50, "正在下載 (未知大小)...")
                    with open(download_path, 'wb') as f:
                        f.write(r.content)
                    self.progress_signal.emit(100, "下載完成")
                else:
                    dl = 0
                    total_length = int(total_length)
                    import time
                    start_time = time.time()
                    last_emit_time = 0
                    last_percent = -1
                    
                    with open(download_path, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=8192):
                            if not self._is_running:
                                return
                            if chunk:
                                dl += len(chunk)
                                f.write(chunk)
                                
                                current_time = time.time()
                                percent = int(100 * dl / total_length)
                                
                                # 限制更新頻率：進度改變或超過 0.1 秒
                                if percent != last_percent or (current_time - last_emit_time) > 0.1:
                                    # 計算速度
                                    elapsed = current_time - start_time
                                    if elapsed > 0:
                                        speed = dl / elapsed / 1024 / 1024 # MB/s
                                        speed_text = f"{speed:.1f} MB/s"
                                    else:
                                        speed_text = "計算中..."
                                        
                                    self.progress_signal.emit(percent, f"{percent}% ({speed_text})")
                                    last_emit_time = current_time
                                    last_percent = percent
            
            self.finished_signal.emit(base_filename)
            
        except Exception as e:
            self.error_signal.emit(str(e))

    def stop(self):
        self._is_running = False


class MainWindow(QMainWindow):
    """主視窗類"""
    
    update_found_signal = pyqtSignal(str, str, str)
    update_progress_signal = pyqtSignal(int, str)
    update_finished_signal = pyqtSignal(str)
    update_error_signal = pyqtSignal(str)

    def __init__(self, api_instance, resource_manager=None):
        super().__init__()
        self.api_instance = api_instance
        self.resource_manager = resource_manager
        
        self.setWindowTitle("逆統戰：烽火")
        self.resize(1280, 720)
        self.setMinimumSize(800, 600)
        
        # 依據 config.json 設定 window_mode
        from .account_settings_manager import AccountSettingsManager
        manager = AccountSettingsManager()
        window_mode = manager.get_window_mode()
        
        if window_mode == "fullscreen":
            self.showFullScreen()
        elif window_mode == "maximized":
            self.showMaximized()
        
        # 創建 WebEngineView
        self.browser = QWebEngineView()
        self.setCentralWidget(self.browser)
        
        # 禁用右鍵選單
        from PyQt6.QtCore import Qt
        self.browser.setContextMenuPolicy(Qt.ContextMenuPolicy.NoContextMenu)
        
        # 配置 WebEngine 設置
        self._configure_webengine_settings()
        
        # 設置網絡請求攔截器
        self._setup_network_interceptor()
        
        # 設置 WebChannel
        self._setup_webchannel()
        
        # 注入啟動腳本 (在頁面加載前)
        self._inject_startup_scripts()
        
        # 啟用控制台消息
        self.browser.page().javaScriptConsoleMessage = self.handle_console_message
        
        # 加載頁面
        url = QUrl("http://127.0.0.1:8765/index.html")
        print(f"正在加載頁面: {url.toString()}")
        self.browser.setUrl(url)
        
        # 頁面加載完成後的處理
        self.browser.loadFinished.connect(self.on_load_finished)
        
        # 連接更新信號
        self.update_found_signal.connect(self.on_update_found)
        self.update_progress_signal.connect(self.on_update_progress)
        self.update_finished_signal.connect(self.on_update_finished)
        self.update_error_signal.connect(self.on_update_error)
    
    def _configure_webengine_settings(self):
        """配置 WebEngine 設置"""
        settings = self.browser.settings()
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessFileUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.JavascriptEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.PluginsEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalStorageEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.Accelerated2dCanvasEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.WebGLEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.PlaybackRequiresUserGesture, False)
        settings.setAttribute(QWebEngineSettings.WebAttribute.DnsPrefetchEnabled, True)
        
        try:
            settings.setAttribute(QWebEngineSettings.WebAttribute.AllowRunningInsecureContent, True)
        except:
            pass
    
    def _inject_startup_scripts(self):
        """注入啟動腳本 (在 DocumentCreation 時執行)"""
        script = QWebEngineScript()
        script.setName("startup_script")
        script.setInjectionPoint(QWebEngineScript.InjectionPoint.DocumentCreation)
        script.setWorldId(QWebEngineScript.ScriptWorldId.MainWorld)
        script.setRunsOnSubFrames(False)
        
        js_code = """
        (function() {
            // 1. Anti-Sleep & Visibility Override
            try {
                Object.defineProperty(document, 'hidden', { get: function() { return false; }, configurable: true });
                Object.defineProperty(document, 'visibilityState', { get: function() { return 'visible'; }, configurable: true });
                window.addEventListener('visibilitychange', function(e) { 
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                }, true);
            } catch (e) {}

            // 2. Qt Bridge & Resource Interceptor Setup
            window.pywebview = window.pywebview || {};
            window.pywebview.api = window.pywebview.api || {};
            
            let bridgeResolve;
            const bridgePromise = new Promise(resolve => { bridgeResolve = resolve; });
            
            // 嘗試初始化 QWebChannel
            function initChannel() {
                if (typeof QWebChannel !== 'undefined' && typeof qt !== 'undefined' && qt.webChannelTransport) {
                    new QWebChannel(qt.webChannelTransport, function(channel) {
                        window.qtBridge = channel.objects.pyqt;
                        bridgeResolve(window.qtBridge);
                        window.dispatchEvent(new Event('pywebviewready'));
                        console.log("[Startup] Qt Bridge initialized");
                    });
                    return true;
                }
                return false;
            }
            
            // 輪詢直到 QWebChannel 可用 (因為 qwebchannel.js 在 head 中加載)
            if (!initChannel()) {
                const timer = setInterval(() => {
                    if (initChannel()) clearInterval(timer);
                }, 50);
                // 10秒後超時停止
                setTimeout(() => clearInterval(timer), 10000);
            }

            // 輔助函數：調用 Bridge
            async function callBridge(method, ...args) {
                const bridge = await bridgePromise;
                return await bridge[method](...args);
            }

            // 定義 API 方法
            const apiMethods = [
                'get_accounts', 'add_account', 'delete_account', 'set_active_account', 'get_active_account',
                'set_window_size', 'toggle_fullscreen', 'toggle_menu', 'save_yaml', 'load_yaml', 'exit_app',
                'save_config_volume', 'get_config_volume', 'save_report_faction_filter', 'get_report_faction_filter',
                'check_resource_exists', 'get_resource_download_status', 'log'
            ];

            apiMethods.forEach(method => {
                window.pywebview.api[method] = async function(...args) {
                    const result = await callBridge(method, ...args);
                    try {
                        // 部分方法返回 JSON 字符串，部分返回原始值
                        if (typeof result === 'string' && (result.startsWith('{') || result.startsWith('['))) {
                            return JSON.parse(result);
                        }
                        return result;
                    } catch (e) {
                        return result;
                    }
                };
            });

            // 3. 資源攔截器 (Resource Interceptor)
            // 確保在 React 加載前就攔截所有資源請求
            
            const originalFetch = window.fetch;
            window.fetch = async function(resource, init) {
                let url = resource;
                if (resource instanceof Request) url = resource.url;
                
                const match = url.match(/\\/(assets\\/passionfruit\\/|passionfruit\\/)(.+)$/);
                if (match) {
                    const path = match[1] + match[2];
                    // 不等待檢查結果，直接發起檢查並繼續請求
                    // 如果資源不存在，後端會開始下載，前端請求可能會 404
                    // 但對於大資源，React 通常會重試或等待
                    // 若要嚴格等待下載，需要 await check_resource_exists
                    // 但這會阻塞所有請求，影響性能。
                    // 這裡選擇異步觸發檢查
                    window.pywebview.api.check_resource_exists(path).catch(() => {});
                }
                return originalFetch.apply(this, arguments);
            };

            const originalXhrOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url) {
                if (typeof url === 'string') {
                    const match = url.match(/\\/(assets\\/passionfruit\\/|passionfruit\\/)(.+)$/);
                    if (match) {
                        const path = match[1] + match[2];
                        window.pywebview.api.check_resource_exists(path).catch(() => {});
                    }
                }
                return originalXhrOpen.apply(this, arguments);
            };
            
            // 攔截 Image.src
            const originalImageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
            if (originalImageSrc) {
                Object.defineProperty(HTMLImageElement.prototype, 'src', {
                    get: function() { return originalImageSrc.get.call(this); },
                    set: function(url) {
                        if (typeof url === 'string') {
                            const match = url.match(/\\/(assets\\/passionfruit\\/|passionfruit\\/)(.+)$/);
                            if (match) {
                                const path = match[1] + match[2];
                                window.pywebview.api.check_resource_exists(path).catch(() => {});
                            }
                        }
                        originalImageSrc.set.call(this, url);
                    },
                    configurable: true
                });
            }
            
            console.log("[Startup] Resource Interceptor installed");
        })();
        """
        
        script.setSourceCode(js_code)
        self.browser.page().scripts().insert(script)
        print("啟動腳本已注入")

    def _setup_network_interceptor(self):
        """設置網絡請求攔截器"""
        profile = QWebEngineProfile.defaultProfile()
        
        # 設置緩存路徑
        try:
            cache_path = os.path.join(tempfile.gettempdir(), 'ReversedFront_cache')
            os.makedirs(cache_path, exist_ok=True)
            profile.setCachePath(cache_path)
            profile.setPersistentCookiesPolicy(QWebEngineProfile.PersistentCookiesPolicy.AllowPersistentCookies)
            print(f"緩存路徑: {cache_path}")
        except Exception as e:
            print(f"設置緩存失敗: {e}")
        
        self.network_interceptor = NetworkInterceptor()
        profile.setUrlRequestInterceptor(self.network_interceptor)
        print("網絡請求攔截器已安裝")
    
    def _setup_webchannel(self):
        """設置 WebChannel"""
        self.channel = QWebChannel()
        self.bridge = QtBridge(self.api_instance, main_window=self)
        self.channel.registerObject('pyqt', self.bridge)
        self.browser.page().setWebChannel(self.channel)
    
    def handle_console_message(self, level, message, line, source):
        """處理 JavaScript 控制台消息"""
        if "react-i18next" not in message:
            level_names = {0: "INFO", 1: "WARNING", 2: "ERROR"}
            level_str = level_names.get(level, "UNKNOWN")
            # 顯示 GPU 相關訊息
            if "GPU" in message or "WebGL" in message or "Canvas" in message:
                print(f"[JS {level_str}] {message}")
            # 顯示更詳細的影片相關日誌
            elif any(keyword in message for keyword in ['video', '影片', 'Video', 'HTMLVideoElement', '.mp4', '.webm']):
                print(f"[JS {level_str}] 影片: {message} (來源: {source}:{line})")
            else:
                print(f"[JS {level_str}] {message}")
    
    def on_load_finished(self, ok):
        """頁面加載完成"""
        print(f"頁面加載完成: ok={ok}")
        if ok:
            # self.inject_qt_bridge() # 已由 _inject_startup_scripts 取代
            QTimer.singleShot(5000, self.check_video_status)
            QTimer.singleShot(1000, self.init_keyboard)
            # 3秒後檢查更新（給頁面足夠的初始化時間）
            QTimer.singleShot(3000, self.check_for_updates)
        else:
            print("頁面加載失敗！")
    
    def check_gpu_status(self):
        """檢查 GPU 硬體加速狀態"""
        gpu_script = """
        (function() {
            console.log('======== GPU 狀態檢查 ========');
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    console.log('[GPU] 顯示卡:', gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
                    console.log('[GPU] 廠商:', gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
                }
                console.log('[GPU] WebGL 版本:', gl.getParameter(gl.VERSION));
                console.log('[GPU] GLSL 版本:', gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
                console.log('[GPU] WebGL 支援: ✓ 啟用');
            } else {
                console.log('[GPU] WebGL 支援: ✗ 未啟用');
            }
            const canvas2d = document.createElement('canvas');
            const ctx = canvas2d.getContext('2d', { willReadFrequently: false });
            console.log('[GPU] Canvas 2D 加速:', ctx ? '✓ 啟用' : '✗ 未啟用');
            console.log('[GPU] 硬體加速狀態: navigator.hardwareConcurrency =', navigator.hardwareConcurrency, '核心');
            console.log('==============================');
        })();
        """
        self.browser.page().runJavaScript(gpu_script)
    
    def check_video_status(self):
        """檢查影片狀態"""
        check_script = """
        (function() {
            const videos = document.querySelectorAll('video');
            const sources = document.querySelectorAll('source');
            console.log('[影片檢查] video 元素數量:', videos.length);
            console.log('[影片檢查] source 元素數量:', sources.length);
            if (videos.length > 0) {
                const v = videos[0];
                console.log('[影片檢查] video.src:', v.src);
                console.log('[影片檢查] video.currentSrc:', v.currentSrc);
                console.log('[影片檢查] readyState:', v.readyState);
                console.log('[影片檢查] networkState:', v.networkState);
                console.log('[影片檢查] error:', v.error ? v.error.code : null);
            }
            if (sources.length > 0) {
                sources.forEach((s, i) => {
                    console.log('[影片檢查] source', i, 'src:', s.src);
                    console.log('[影片檢查] source', i, 'type:', s.type);
                });
            }
            return videos.length + '/' + sources.length;
        })();
        """
        self.browser.page().runJavaScript(check_script)
    
    # inject_qt_bridge 已被 _inject_startup_scripts 取代，保留此方法為空或刪除
    def inject_qt_bridge(self):
        pass
    
    def init_keyboard(self):
        """初始化鍵盤處理"""
        try:
            keyboard_handler = init_keyboard_handler(None, None)
            start_keyboard_handler()
        except Exception as e:
            print(f"鍵盤初始化失敗: {e}")
    
    def check_for_updates(self):
        """檢查版本更新 (啟動線程)"""
        threading.Thread(target=self._check_update_worker, daemon=True).start()

    def _check_update_worker(self):
        """檢查版本更新的後台工作方法"""
        try:
            print(f"[更新檢查] 當前版本: v{LOCAL_VERSION}")
            print(f"[更新檢查] 正在從 GitHub 檢查最新版本...")
            
            # 嘗試清理舊版本執行檔
            try_cleanup_old_exe()
            
            # 優先使用 GitHub Releases API
            filename, remote_version, download_url = get_github_latest_version()
            
            # 如果 GitHub 失敗，嘗試雲端備用
            if not remote_version:
                print("[更新檢查] GitHub API 失敗，嘗試雲端備用...")
                filename, remote_version, download_url = get_cloud_latest_info(CLOUD_PAGE_URL)
            
            if not remote_version:
                print("[更新檢查] 無法獲取雲端版本資訊")
                return
            
            print(f"[更新檢查] 雲端版本: v{remote_version}")
            
            # 比較版本號
            def parse_version(v):
                """解析版本號為可比較的元組"""
                try:
                    return tuple(map(int, v.split('.')))
                except:
                    return (0, 0)
            
            local_ver = parse_version(LOCAL_VERSION)
            remote_ver = parse_version(remote_version)
            
            if remote_ver > local_ver:
                print(f"[更新檢查] 發現新版本: v{remote_version} (當前: v{LOCAL_VERSION})")
                self.update_found_signal.emit(filename, remote_version, download_url)
            else:
                print(f"[更新檢查] 當前已是最新版本 v{LOCAL_VERSION}")
                
        except Exception as e:
            print(f"[更新檢查] 檢查更新時發生錯誤: {e}")
            import traceback
            traceback.print_exc()

    def on_update_found(self, filename, remote_version, download_url):
        """處理發現更新的信號"""
        # 在網頁中顯示自定義更新提示模態框
        update_script = f"""
        (function() {{
            // 創建樣式
            const style = document.createElement('style');
            style.id = 'rf-update-style';
            style.textContent = `
                .rf-update-modal-overlay {{
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                    font-family: "Microsoft JhengHei", sans-serif;
                }}
                .rf-update-modal {{
                    background-color: #2b2b2b;
                    border: 1px solid #444;
                    border-radius: 8px;
                    padding: 24px;
                    width: 400px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                    color: #fff;
                    text-align: center;
                }}
                .rf-update-title {{
                    font-size: 20px;
                    font-weight: bold;
                    margin-bottom: 16px;
                    color: #4caf50;
                }}
                .rf-update-info {{
                    margin-bottom: 20px;
                    line-height: 1.6;
                    color: #ddd;
                }}
                .rf-update-version {{
                    font-weight: bold;
                    color: #fff;
                }}
                .rf-update-buttons {{
                    display: flex;
                    justify-content: center;
                    gap: 12px;
                }}
                .rf-btn {{
                    padding: 8px 20px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s;
                }}
                .rf-btn-confirm {{
                    background-color: #4caf50;
                    color: white;
                }}
                .rf-btn-confirm:hover {{
                    background-color: #45a049;
                }}
                .rf-btn-cancel {{
                    background-color: #666;
                    color: white;
                }}
                .rf-btn-cancel:hover {{
                    background-color: #555;
                }}
                /* 進度條樣式 */
                .rf-progress-container {{
                    width: 100%;
                    background-color: #444;
                    border-radius: 4px;
                    margin-top: 15px;
                    height: 10px;
                    overflow: hidden;
                    display: none;
                }}
                .rf-progress-bar {{
                    width: 0%;
                    height: 100%;
                    background-color: #4caf50;
                    transition: width 0.3s ease;
                }}
                .rf-progress-text {{
                    margin-top: 8px;
                    font-size: 12px;
                    color: #aaa;
                    display: none;
                }}
            `;
            if (!document.getElementById('rf-update-style')) {{
                document.head.appendChild(style);
            }}

            // 創建模態框 HTML
            const overlay = document.createElement('div');
            overlay.id = 'rf-update-overlay';
            overlay.className = 'rf-update-modal-overlay';
            overlay.innerHTML = `
                <div class="rf-update-modal">
                    <div class="rf-update-title">發現新版本！</div>
                    <div class="rf-update-info" id="rf-update-content">
                        <div>當前版本: <span class="rf-update-version">v{LOCAL_VERSION}</span></div>
                        <div>最新版本: <span class="rf-update-version">v{remote_version}</span></div>
                        <br>
                        <div>是否立即下載並更新？</div>
                        <div style="font-size: 12px; color: #aaa; margin-top: 4px;">（應用將自動重啟）</div>
                    </div>
                    
                    <div class="rf-progress-container" id="rf-progress-container">
                        <div class="rf-progress-bar" id="rf-progress-bar"></div>
                    </div>
                    <div class="rf-progress-text" id="rf-progress-text">準備下載...</div>

                    <div class="rf-update-buttons" id="rf-update-buttons">
                        <button class="rf-btn rf-btn-confirm" id="rf-update-confirm">立即更新</button>
                        <button class="rf-btn rf-btn-cancel" id="rf-update-cancel">稍後再說</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            // 綁定事件
            document.getElementById('rf-update-confirm').onclick = function() {{
                // 切換到下載狀態 UI
                document.getElementById('rf-update-buttons').style.display = 'none';
                document.getElementById('rf-progress-container').style.display = 'block';
                document.getElementById('rf-progress-text').style.display = 'block';
                document.getElementById('rf-update-content').innerHTML = '<div>正在下載更新...</div><div style="font-size: 12px; color: #aaa; margin-top: 4px;">請勿關閉程式</div>';
                
                window.qtBridge.trigger_update();
            }};
            
            document.getElementById('rf-update-cancel').onclick = function() {{
                overlay.remove();
            }};
        }})();
        """
        
        # 儲存更新資訊供後續使用
        self.update_info = {
            'filename': filename,
            'version': remote_version,
            'download_url': download_url
        }
        
        self.browser.page().runJavaScript(update_script)
    
    def trigger_update(self):
        """觸發更新下載"""
        if hasattr(self, 'update_info'):
            try:
                print(f"[更新] 開始下載: {self.update_info['filename']}")
                
                # 啟動下載線程
                self.download_thread = UpdateDownloadThread(
                    self.update_info['download_url'],
                    self.update_info['filename']
                )
                self.download_thread.progress_signal.connect(self.update_progress_signal.emit)
                self.download_thread.finished_signal.connect(self.update_finished_signal.emit)
                self.download_thread.error_signal.connect(self.update_error_signal.emit)
                self.download_thread.start()
                
            except Exception as e:
                print(f"[更新] 下載失敗: {e}")
                self.on_update_error(str(e))

    def on_update_progress(self, percent, status_text):
        """更新進度條"""
        script = f"""
        (function() {{
            const bar = document.getElementById('rf-progress-bar');
            const text = document.getElementById('rf-progress-text');
            if (bar) bar.style.width = '{percent}%';
            if (text) text.textContent = '{status_text}';
        }})();
        """
        self.browser.page().runJavaScript(script)

    def on_update_finished(self, base_filename):
        """下載完成"""
        script = f"""
        (function() {{
            const text = document.getElementById('rf-progress-text');
            if (text) text.textContent = '下載完成，正在重啟...';
        }})();
        """
        self.browser.page().runJavaScript(script)
        
        # 延遲一下讓使用者看到完成訊息
        QTimer.singleShot(1000, lambda: self._perform_restart(base_filename))

    def on_update_error(self, error_msg):
        """下載錯誤"""
        script = f"""
        (function() {{
            alert('更新失敗: {error_msg}');
            const overlay = document.getElementById('rf-update-overlay');
            if (overlay) overlay.remove();
        }})();
        """
        self.browser.page().runJavaScript(script)

    def _perform_restart(self, base_filename):
        """執行重啟"""
        try:
            # 獲取下載路徑
            _, download_path = prepare_update_paths(self.update_info['filename'])
            perform_restart(base_filename, download_path)
        except Exception as e:
            print(f"重啟失敗: {e}")
            self.on_update_error(f"重啟失敗: {e}")
    
    def toggle_fullscreen_mode(self):
        """切換全屏模式"""
        if self.isFullScreen():
            self.showNormal()
        else:
            self.showFullScreen()
    
    def showEvent(self, event):
        """視窗顯示事件"""
        super().showEvent(event)
        print(f"視窗大小: {self.width()}x{self.height()}")
        print(f"視窗可見: {self.isVisible()}")
    
    def closeEvent(self, event):
        """視窗關閉事件"""
        print("收到窗口關閉事件")
        if self.resource_manager:
            self.resource_manager.shutdown()
        import gc
        gc.collect()
        event.accept()
