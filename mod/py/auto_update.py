import os
import sys
import time
import re
import urllib.request
import urllib.error
import html.parser

class SimpleHTMLParser(html.parser.HTMLParser):
    """簡單的 HTML 解析器，用於替代 BeautifulSoup"""
    def __init__(self):
        super().__init__()
        self.download_url = None
        self.filename = None
        self.in_direct_download = False
        self.in_file_div = False
        self.file_div_data = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == 'div' and 'class' in attrs_dict and 'directDownload' in attrs_dict['class']:
            self.in_direct_download = True
        elif tag == 'div' and self.in_direct_download and not self.in_file_div:
            self.in_file_div = True
        elif tag == 'a' and self.in_direct_download and 'id' in attrs_dict and attrs_dict['id'] == 'downloadFile':
            if 'href' in attrs_dict:
                self.download_url = attrs_dict['href']

    def handle_data(self, data):
        if self.in_file_div:
            self.file_div_data.append(data)

    def handle_endtag(self, tag):
        if tag == 'div' and self.in_file_div:
            self.in_file_div = False
            if self.file_div_data:
                self.filename = ''.join(self.file_div_data).strip().split('\xa0')[0]
        elif tag == 'div' and self.in_direct_download:
            self.in_direct_download = False

def get_cloud_latest_info(cloud_url):
    VERSION_PATTERN = re.compile(r"v(\d+\.\d+)")
    try:
        # 使用 urllib 代替 requests
        req = urllib.request.Request(
            cloud_url,
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            html_content = response.read().decode('utf-8')
        
        # 使用自定義簡易 HTML 解析器代替 BeautifulSoup
        parser = SimpleHTMLParser()
        parser.feed(html_content)
        
        filename = parser.filename
        download_url = parser.download_url
        
        remote_version = None
        if filename:
            m = VERSION_PATTERN.search(filename)
            if m:
                remote_version = m.group(1)
        
        return filename, remote_version, download_url
    except Exception as e:
        import logging
        logging.error(f"[更新] 雲端頁面解析失敗: {e}")
        return None, None, None

def try_cleanup_old_exe(prefix='ReversedFront'):
    """嘗試清理舊版本的執行檔"""
    try:
        exe_path = os.path.abspath(sys.argv[0])
        exe_dir = os.path.dirname(exe_path)
        
        for fname in os.listdir(exe_dir):
            if fname.endswith('.old') and fname.startswith(prefix):
                old_path = os.path.join(exe_dir, fname)
                try:
                    if os.path.exists(old_path):
                        os.remove(old_path)
                except Exception:
                    # 靜默處理錯誤
                    pass
    except Exception:
        # 完全捕捉所有異常，避免程序中斷
        pass

def download_and_restart(filename, download_url, window, prefix='ReversedFront'):
    """下載新版本並重啟應用程式"""
    import tempfile
    import shutil
    
    # 處理檔案名稱
    base_filename = re.sub(r'_v\d+\.\d+', '', filename)
    if not base_filename.lower().endswith('.exe'):
        base_filename += '.exe'
        
    # 設定路徑 - 使用臨時目錄來下載，減少被誤判的可能
    exe_dir = os.path.dirname(sys.argv[0])
    temp_dir = tempfile.gettempdir()
    download_path = os.path.join(temp_dir, base_filename + '.new')
    old_exe_path = os.path.abspath(sys.argv[0])
    old_exe_rename = os.path.join(exe_dir, base_filename + '.old')
    
    try:
        # 下載新版本
        window.evaluate_js('console.info("正在下載更新，請稍候...")')
        
        # 使用 urllib 代替 requests
        req = urllib.request.Request(
            download_url,
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        
        with urllib.request.urlopen(req, timeout=30) as dl:
            with open(download_path, 'wb') as f:
                while True:
                    chunk = dl.read(8192)  # 讀取 8KB 的數據塊
                    if not chunk:
                        break
                    f.write(chunk)
        
        # 通知用戶並關閉視窗
        window.evaluate_js(f'alert("新版已下載：{base_filename}，即將自動重啟！")')
        time.sleep(0.5)  # 縮短等待時間
        
        # 安全關閉視窗
        try:
            window.destroy()
        except Exception as e:
            # 移除日誌輸出，避免黑視窗閃爍
            pass
        
        # 替換舊檔案
        try:
            # 如果舊的重命名檔存在，先嘗試刪除
            if os.path.exists(old_exe_rename):
                os.remove(old_exe_rename)
                
            # 重命名當前執行檔
            os.rename(old_exe_path, old_exe_rename)
        except Exception as e:
            # 移除日誌輸出，避免黑視窗閃爍
            pass
            
        try:
            # 如果目標檔案已存在，先嘗試刪除
            target_path = os.path.join(exe_dir, base_filename)
            if os.path.exists(target_path):
                os.remove(target_path)
                
            # 重命名新下載的檔案
            os.rename(download_path, target_path)
        except Exception as e:
            # 移除日誌輸出，避免黑視窗閃爍
            pass
            
        # 使用更安全的方式啟動新程式，避免被殺毒軟體誤判
        if sys.platform == 'win32':
            try:
                # 使用 startfile 替代 subprocess.Popen
                os.startfile(os.path.join(exe_dir, base_filename))
            except Exception as e:
                # 備用方案 - 需要導入 subprocess
                import subprocess
                subprocess.Popen(
                    [os.path.join(exe_dir, base_filename)],
                    shell=False,
                    close_fds=True
                )
        else:
            # 非 Windows 平台仍使用 Popen
            import subprocess
            subprocess.Popen(
                [os.path.join(exe_dir, base_filename)],
                close_fds=True
            )
            
        # 立即退出當前程序
        sys.exit(0)
    except Exception as e:
        # 移除日誌輸出，避免黑視窗閃爍
        pass
        window.evaluate_js(f'alert("下載新版本失敗: {str(e)}")')
