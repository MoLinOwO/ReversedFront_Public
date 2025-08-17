# Rust 單檔包裝啟動器（ReversedFront.exe）

本專案內含 Rust 製作的單檔啟動器，可將 `ReversedFront.exe` 內嵌於啟動器本體，於執行時自動釋出至臨時目錄並啟動，無需黑色主控台視窗，且已套用 `logo.ico` 為圖標。

### 編譯步驟

# ReversedFront PC 專案

現代東亞國戰手遊《逆統戰：烽火》輔助前端專案，支援多帳號管理、地圖分析、音量控制、資源優化等多項功能，並提供 Windows 單檔啟動器與 Python/Nuitka 打包方案。

---

## 目錄
- [專案簡介](#專案簡介)
- [功能特色](#功能特色)
- [系統需求](#系統需求)
- [Rust 單檔啟動器](#rust-單檔啟動器)
- [Python/Nuitka 打包](#pythonnuitka-打包)
- [自訂與擴充](#自訂與擴充)
- [常見問題](#常見問題)
- [更新日誌](#更新日誌)

---

## 專案簡介

本專案為《逆統戰：烽火》PC 端輔助前端，整合多帳號管理、地圖勢力分析、音量控制、資源下載優化、GPU 加速渲染等功能，支援桌面版與網頁版模組，並可自訂退出提示語、分布圖美化等。

---

## 功能特色
- 多帳號管理與隔離，支援多實例獨立設定
- 整合控制面板，快捷鍵（ESC/F11）快速操作
- 智能音量控制，支援戰報靜音與即時預覽
- 地圖陣營城市排行榜、勢力分布圖美化（Voronoi/圓角/羽化/融合）
- 靜態資源與地圖資料整合，並行下載加速
- 支援網頁版模組，功能完整
- 退出提示語自訂（`mod/data/exit_prompts.yaml`）
- GPU 加速渲染，效能最佳化
- 多語系、可自訂 UI

---

## 系統需求
- Windows 10/11 64位元
- 4GB RAM 以上
- 支援 DirectX 11 之 GPU
- Python 3.8+（如需 Nuitka 打包）

---

## Rust 單檔啟動器

本專案內含 Rust 製作的單檔啟動器，將 `ReversedFront.exe` 內嵌於啟動器本體，執行時自動釋出至臨時目錄並啟動，無黑色主控台視窗，圖標為 `logo.ico`。

### 編譯流程
1. 確認 `rf_launcher/ReversedFront.exe` 及專案根目錄的 `logo.ico` 存在。
2. 於 `rf_launcher` 目錄執行：
  ```powershell
  cargo build --release
  ```
3. 產生的 `target/release/ReversedFront.exe` 即為單檔啟動器。

---

## Python/Nuitka 打包

1. 安裝 Nuitka：
  ```sh
  pip install nuitka
  ```
2. 推薦使用 `build.bat` 自動打包腳本：
  ```
  build.bat
  ```
  - 完成後執行檔於 `dist/ReversedFront.exe`
3. 進階用戶可用 Nuitka 指令手動打包：
  ```powershell
  nuitka --onefile --windows-icon-from-ico=logo.ico --output-dir=dist --output-filename=ReversedFront.exe --disable-console \
    --include-data-dir=mod=mod \
    --include-data-files=asset-manifest.json=./ \
    --include-data-files=index.android.bundle=./ \
    --include-data-files=index.html=./ \
    --include-data-files=logo.ico=./ \
    --include-data-files=logo192.png=./ \
    --include-data-files=logo512.png=./ \
    --include-data-files=manifest.json=./ \
    --include-data-files=robots.txt=./ \
    --include-data-dir=dexopt=dexopt \
    --include-data-dir=static=static \
    --include-data-dir=tiles=tiles \
    --windows-company-name="ESC" \
    --windows-product-name="ReversedFront" \
    --windows-file-version="2.0.0.0" \
    --windows-product-version="2.0.0.0" \
    --windows-file-description="ReversedFront PC" \
    main.py
  ```
4. 打包與簽章整合流程：
  ```
  build_and_sign.bat
  ```
  - 可選「打包」、「簽署」或「打包並簽署」
  - 簽章需輸入 `mod/data/ReversedFront.pfx` 密碼

---

## 自訂與擴充
- 退出提示語：編輯 `mod/data/exit_prompts.yaml`，可自訂多組訊息與按鈕文字
- 勢力分布圖美化：調整 `mod/js/factionMap.js` 參數，支援圓角、羽化、融合等多種模式
- 控制面板與快捷鍵：可於 `mod/js/customControls.js`、`mod/py/keyboard_handler.py` 自訂
- 多語系支援：可擴充語系檔案，支援繁中、簡中、日文等

---

## 更新日誌
- 2025/08：新增 Rust 單檔啟動器、圖標自動設定、README 全面重寫
- 2025/07：多帳號隔離、控制面板整合、GPU 加速、資源下載優化
- 2025/06：優化帳號儲存、數位簽章、API 結構簡化

---

如需協助或有新功能建議，請聯絡維護者 MoLinOwO。
- **檔案鎖定機制**：防止多實例同時修改配置檔案造成資料損壞
- **智能緩存清理**：自動清理過期的 Python 緩存檔案，減少程式體積

### 2025/07/24
- 啟用 GPU 加速渲染功能，提升遊戲畫面流暢度和效能
- 優化程式碼結構，清理未使用的冗餘代碼
- 改進資源管理系統，提升穩定性
- 更新 README 文件，增加更詳細的說明和配置指引

### 2025/07/23
- 整合控制面板，將所有功能集中於左側可摺疊面板中
- 添加全局快捷鍵：ESC 切換控制面板，F11 切換全屏
- 整合資源下載狀態顯示到控制面板，提供實時進度更新
- 根據 CPU 核心數自動優化並行下載數量

### 2025/06/15
- 優化帳號密碼儲存機制，避免資料被覆蓋
- 更新打包流程，簡化資源檔案結構
- 添加數位簽章支援，減少防毒軟體誤報
