#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
跨平台打包腳本 - 使用 Nuitka 編譯
支援 Windows、macOS、Linux
"""

import os
import sys
import platform
import subprocess
import shutil
from pathlib import Path

def convert_icon_for_platform():
    """從 logo.ico 轉換到各平台需要的格式"""
    platform_name = platform.system().lower()
    
    if not os.path.exists('logo.ico'):
        print("  WARNING: 未找到 logo.ico，將使用默認圖標")
        return False
    
    # macOS 和 Linux 才需要轉換
    if platform_name == 'windows':
        return True
    
    try:
        from PIL import Image
        
        if platform_name == 'darwin':  # macOS
            if not os.path.exists('logo.icns'):
                print("  >> 從 logo.ico 創建 logo.icns...")
                img = Image.open('logo.ico')
                # 調整到合適大小
                if img.size[0] < 512:
                    img = img.resize((512, 512), Image.Resampling.LANCZOS)
                
                # 創建 iconset
                iconset_dir = 'icon.iconset'
                os.makedirs(iconset_dir, exist_ok=True)
                
                sizes = [16, 32, 128, 256, 512]
                for size in sizes:
                    img_resized = img.resize((size, size), Image.Resampling.LANCZOS)
                    img_resized.save(f'{iconset_dir}/icon_{size}x{size}.png')
                    if size <= 256:
                        img_resized_2x = img.resize((size*2, size*2), Image.Resampling.LANCZOS)
                        img_resized_2x.save(f'{iconset_dir}/icon_{size}x{size}@2x.png')
                
                # 使用 iconutil 創建 .icns
                result = subprocess.run(['iconutil', '-c', 'icns', iconset_dir, '-o', 'logo.icns'], 
                                      capture_output=True, text=True)
                shutil.rmtree(iconset_dir)
                
                if result.returncode == 0:
                    print("  OK: logo.icns 已創建")
                    return True
                else:
                    print(f"  WARNING: iconutil 失敗: {result.stderr}")
                    return False
                
        elif platform_name == 'linux':
            # Linux 需要 PNG 格式
            created = False
            if not os.path.exists('logo192.png'):
                print("  >> 從 logo.ico 創建 logo192.png...")
                img = Image.open('logo.ico')
                img = img.resize((192, 192), Image.Resampling.LANCZOS)
                img.save('logo192.png')
                print("  OK: logo192.png 已創建")
                created = True
            if not os.path.exists('logo512.png'):
                print("  >> 從 logo.ico 創建 logo512.png...")
                img = Image.open('logo.ico')
                img = img.resize((512, 512), Image.Resampling.LANCZOS)
                img.save('logo512.png')
                print("  OK: logo512.png 已創建")
                created = True
            return True
            
    except ImportError:
        print("  WARNING: 未安裝 Pillow，跳過圖標轉換")
        print("  提示: 在 requirements.txt 中已包含 Pillow")
        return False
    except Exception as e:
        print(f"  WARNING: 圖標轉換失敗: {e}")
        print("  將繼續編譯，但可能沒有自定義圖標")
        return False
    
    return True


# 設定 Windows 控制台 UTF-8 輸出
if platform.system() == 'Windows':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


def get_platform_info():
    """獲取平台資訊"""
    system = platform.system().lower()
    if system == 'darwin':
        return 'macos', '.app', 'ReversedFront.app'
    elif system == 'linux':
        return 'linux', '', 'ReversedFront'
    elif system == 'windows':
        return 'windows', '.exe', 'ReversedFront.exe'
    else:
        raise RuntimeError(f"不支援的平台: {system}")


def build_nuitka():
    """使用 Nuitka 編譯主程式"""
    platform_name, ext, output_name = get_platform_info()
    
    print("=" * 60)
    print(f"開始編譯 {platform_name.upper()} 版本")
    print("=" * 60)
    
    # 轉換圖標
    print("\n檢查並轉換圖標...")
    convert_icon_for_platform()
    
    # 基礎 Nuitka 參數
    nuitka_args = [
        sys.executable, '-m', 'nuitka',
        '--standalone',
        '--output-dir=dist',
        f'--output-filename={output_name}',
        '--assume-yes-for-downloads',
        '--enable-plugin=pyqt6',
        '--nowarn-mnemonic=options-nanny',  # 忽略 PyQt6 macOS 警告
        
        # 公司與產品資訊
        '--company-name=ESC',
        '--product-name=ReversedFront',
        '--file-version=2.8.0.0',
        '--product-version=2.8.0.0',
        '--file-description=ReversedFront - 逆統戰：烽火輔助工具',
        
        # 包含資料目錄（只包含非 Python 的資源文件）
        '--include-data-dir=static=static',
        '--include-data-dir=tiles=tiles',
        '--include-data-dir=dexopt=dexopt',
        '--include-data-dir=mod/data=mod/data',
        
        # 包含單獨的資料檔案
        '--include-data-files=index.html=index.html',
        '--include-data-files=manifest.json=manifest.json',
        '--include-data-files=robots.txt=robots.txt',
        '--include-data-files=transporter.html=transporter.html',
    ]
    
    # 平台特定參數
    if platform_name == 'windows':
        nuitka_args.extend([
            '--windows-console-mode=disable',
            '--windows-icon-from-ico=logo.ico',
        ])
    elif platform_name == 'macos':
        base_macos_args = [
            '--macos-create-app-bundle',
            '--macos-app-name=ReversedFront',
            '--macos-app-version=2.8.0',
        ]
        # 圖標為可選
        if os.path.exists('logo.icns'):
            base_macos_args.extend([
                '--macos-app-icon=logo.icns',
            ])
            print("  >> 使用 logo.icns 圖標")
        else:
            print("  WARNING: 未找到 logo.icns，將使用默認圖標")
        nuitka_args.extend(base_macos_args)
    elif platform_name == 'linux':
        base_linux_args = []
        # 圖標為可選
        if os.path.exists('logo192.png'):
            base_linux_args.extend([
                '--linux-icon=logo192.png',
                '--include-data-files=logo192.png=./',
            ])
        if os.path.exists('logo512.png'):
            base_linux_args.append('--include-data-files=logo512.png=./')
        nuitka_args.extend(base_linux_args)
    
    # 添加主程式
    nuitka_args.append('main.py')
    
    # 執行編譯
    print("\n執行 Nuitka 編譯...")
    print(f"指令: {' '.join(nuitka_args)}\n")
    
    try:
        subprocess.run(nuitka_args, check=True)
        print("\n" + "=" * 60)
        print(f"SUCCESS: 編譯成功！")
        print(f"輸出位置: dist/main.dist/")
        print("=" * 60)
        return True
    except subprocess.CalledProcessError as e:
        print("\n" + "=" * 60)
        print(f"ERROR: 編譯失敗: {e}")
        print("=" * 60)
        return False


def create_desktop_file():
    """Linux: 創建 .desktop 檔案"""
    if platform.system().lower() != 'linux':
        return
    
    desktop_content = """[Desktop Entry]
Type=Application
Name=ReversedFront
Comment=逆統戰：烽火輔助工具
Exec=ReversedFront
Icon=logo
Terminal=false
Categories=Game;Utility;
"""
    
    desktop_file = Path('dist/main.dist/ReversedFront.desktop')
    desktop_file.write_text(desktop_content)
    print(f"OK: 已創建 .desktop 檔案: {desktop_file}")


def create_macos_info_plist():
    """macOS: 創建 Info.plist"""
    if platform.system().lower() != 'darwin':
        return
    
    # Nuitka 會自動生成，這裡只是補充說明
    print("OK: macOS App Bundle 已由 Nuitka 自動生成")


def package_resources():
    """打包資源檔案"""
    print("\n檢查資源完整性...")
    
    required_files = [
        'index.html',
        'manifest.json',
        'mod/data/RFcity.yaml',
        'mod/data/exit_prompts.yaml',
    ]
    
    # 檢查 static/js 目錄下是否有 JS 文件
    static_js_dir = Path('static/js')
    has_js = False
    if static_js_dir.exists():
        js_files = list(static_js_dir.glob('*.js'))
        if js_files:
            has_js = True
            print(f"找到 {len(js_files)} 個 JS 文件")
    
    if not has_js:
        required_files.append('static/js/main.bundle.js')  # 觸發錯誤提示
    
    missing = []
    for file in required_files:
        if not Path(file).exists():
            missing.append(file)
    
    if missing:
        print("WARNING: 缺少以下檔案:")
        for f in missing:
            print(f"  - {f}")
        return False
    
    print("OK: 所有資源檔案完整")
    return True


def clean_build():
    """清理舊的編譯檔案"""
    dirs_to_clean = ['dist', 'build', '__pycache__']
    
    print("\n清理舊的編譯檔案...")
    for dir_name in dirs_to_clean:
        if Path(dir_name).exists():
            shutil.rmtree(dir_name)
            print(f"OK: 已刪除 {dir_name}/")


def main():
    """主函數"""
    print("\n" + "=" * 60)
    print("ReversedFront 跨平台打包工具 (Nuitka)")
    print("=" * 60)
    
    # 檢查資源
    if not package_resources():
        print("\nERROR: 請先完成前端 JS 打包: cd mod && npx webpack --mode production")
        return 1
    
    # 清理舊檔案
    if '--clean' in sys.argv:
        clean_build()
    
    # 開始編譯
    success = build_nuitka()
    
    if success:
        # 平台特定後處理
        create_desktop_file()
        create_macos_info_plist()
        
        platform_name, _, _ = get_platform_info()
        print(f"\n>> {platform_name.upper()} 版本打包完成！")
        print(f"\n[OUTPUT] 輸出目錄: dist/main.dist/")
        
        if platform_name == 'macos':
            print("\n[macOS] 發布提示:")
            print("   1. 對 .app 進行簽章: codesign --deep --force --sign - dist/main.dist/ReversedFront.app")
            print("   2. 創建 DMG: hdiutil create -volname ReversedFront -srcfolder dist/main.dist/ReversedFront.app -ov -format UDZO ReversedFront.dmg")
        elif platform_name == 'windows':
            print("\n[Windows] 發布提示:")
            print("   1. 使用 Inno Setup 創建安裝包")
            print("   2. 對 .exe 進行數位簽章")
        elif platform_name == 'linux':
            print("\n[Linux] 發布提示:")
            print("   1. 創建 AppImage: appimagetool dist/main.dist/")
            print("   2. 或打包成 .deb/.rpm")
        
        return 0
    else:
        return 1


if __name__ == '__main__':
    sys.exit(main())
