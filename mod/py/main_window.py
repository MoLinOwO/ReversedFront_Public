"""主視窗 - PyQt6 WebEngine 視窗"""

import os
import tempfile
from PyQt6.QtWidgets import QMainWindow
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEngineSettings, QWebEngineProfile
from PyQt6.QtCore import QUrl, QTimer
from PyQt6.QtWebChannel import QWebChannel

from .network_interceptor import NetworkInterceptor
from .qt_bridge import QtBridge
from .keyboard_handler import init_keyboard_handler, start_keyboard_handler


class MainWindow(QMainWindow):
    """主視窗類"""
    
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
        
        # 啟用控制台消息
        self.browser.page().javaScriptConsoleMessage = self.handle_console_message
        
        # 加載頁面
        url = QUrl("http://127.0.0.1:8765/index.html")
        print(f"正在加載頁面: {url.toString()}")
        self.browser.setUrl(url)
        
        # 頁面加載完成後的處理
        self.browser.loadFinished.connect(self.on_load_finished)
    
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
            self.inject_qt_bridge()
            QTimer.singleShot(5000, self.check_video_status)
            QTimer.singleShot(1000, self.init_keyboard)
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
    
    def inject_qt_bridge(self):
        """注入 Qt 橋接腳本"""
        print("開始注入 Qt 橋接腳本...")
        
        js_code = """
        (function() {
            console.log('初始化 Qt WebChannel...');
            new QWebChannel(qt.webChannelTransport, function(channel) {
                console.log('Qt WebChannel 初始化成功');
                window.qtBridge = channel.objects.pyqt;
                window.pywebview = {
                    api: {
                        get_accounts: async function() {
                            const result = await window.qtBridge.get_accounts();
                            return JSON.parse(result);
                        },
                        add_account: async function(data) {
                            const result = await window.qtBridge.add_account(JSON.stringify(data));
                            return JSON.parse(result);
                        },
                        delete_account: async function(idx) {
                            const result = await window.qtBridge.delete_account(idx);
                            return JSON.parse(result);
                        },
                        set_active_account: async function(idx) {
                            const result = await window.qtBridge.set_active_account(idx);
                            return JSON.parse(result);
                        },
                        get_active_account: async function() {
                            const result = await window.qtBridge.get_active_account();
                            return JSON.parse(result);
                        },
                        set_window_size: async function(w, h) {
                            return await window.qtBridge.set_window_size(w, h);
                        },
                        toggle_fullscreen: async function() {
                            return await window.qtBridge.toggle_fullscreen();
                        },
                        toggle_menu: async function() {
                            return await window.qtBridge.toggle_menu();
                        },
                        save_yaml: async function(filename, content) {
                            const result = await window.qtBridge.save_yaml(filename, content);
                            return JSON.parse(result);
                        },
                        load_yaml: async function(filename) {
                            const result = await window.qtBridge.load_yaml(filename);
                            return JSON.parse(result);
                        },
                        exit_app: async function() {
                            return await window.qtBridge.exit_app();
                        },
                        save_config_volume: async function(data) {
                            const result = await window.qtBridge.save_config_volume(JSON.stringify(data));
                            return JSON.parse(result);
                        },
                        get_config_volume: async function(target) {
                            const result = await window.qtBridge.get_config_volume(JSON.stringify(target || null));
                            return JSON.parse(result);
                        },
                        save_report_faction_filter: async function(faction, target) {
                            return await window.qtBridge.save_report_faction_filter(faction, JSON.stringify(target || null));
                        },
                        get_report_faction_filter: async function(target) {
                            return await window.qtBridge.get_report_faction_filter(JSON.stringify(target || null));
                        },
                        check_resource_exists: async function(path) {
                            const result = await window.qtBridge.check_resource_exists(path);
                            return JSON.parse(result);
                        },
                        get_resource_download_status: async function() {
                            const result = await window.qtBridge.get_resource_download_status();
                            return JSON.parse(result);
                        }
                    }
                };
                console.log('Qt 橋接已加載');
                window.dispatchEvent(new Event('pywebviewready'));
            });
        })();
        """
        self.browser.page().runJavaScript(js_code)
    
    def init_keyboard(self):
        """初始化鍵盤處理"""
        try:
            keyboard_handler = init_keyboard_handler(None, None)
            start_keyboard_handler()
        except Exception as e:
            print(f"鍵盤初始化失敗: {e}")
    
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
