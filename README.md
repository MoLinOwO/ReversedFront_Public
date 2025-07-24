# ReversedFront

現代東亞國戰手遊《逆統戰：烽火》輔助前端專案

## 專案說明
本專案為《逆統戰：烽火》遊戲的前端輔助工具，包含：
- 帳號管理（多組帳密切換、自動填入，僅桌面版）
- 整合控制面板（左側可摺疊選單，包含全部功能按鈕、下載狀態及選項）
- 全局快捷鍵（ESC鍵顯示/隱藏控制面板，F11全屏切換）
- 地圖陣營城市排行榜（即時分析地圖據點分布，浮層顯示，支援拖拉移動）
- 靜態資源與地圖資料整合（包含實時下載進度顯示）
- 支援自訂退出提示語（exit_prompts.yaml，隨機顯示多組提示語與按鈕文字）
- RFcity.yaml：地圖據點資料，請一併打包
- **勢力分布圖美化（Voronoi 地圖）**：多種分界模式、圓角柔邊、極致羽化、無分界融合
- **音量調整功能**：可調整 BGM、SE 音量，支援靜音，設定自動保存
- **支援網頁版模組**：直接以瀏覽器開啟 index.html 或部署至 GitHub Pages/Cloudflare Pages 也能享有大部分輔助功能（帳號管理、全螢幕、退出遊戲等僅桌面版）
- **優化資源下載**：根據CPU核心數自動調整並行下載數量，提升下載速度
- **GPU加速渲染**：桌面版自動啟用 GPU 加速，提升畫面流暢度和效能

## 新增功能

### GPU加速渲染（2025/07 更新）
- 自動啟用 GPU 硬體加速，提升遊戲畫面流暢度
- 優化 CEF 渲染引擎參數配置，提高效能和穩定性
- 智能檢測系統環境，自動調整最佳渲染設定

### 整合控制面板（2025/07 更新）
- 將所有功能整合至左側可摺疊控制面板，界面更簡潔、操作更方便
- 按 ESC 鍵可快速顯示/隱藏控制面板，F11 鍵可切換全屏模式
- 控制面板內整合了資源下載狀態顯示，即時查看下載進度和詳細信息
- 面板內包含音量調整、排行榜顯示、全屏切換等所有功能按鈕

### 優化資源下載（2025/07 更新）
- 根據CPU核心數自動調整並行下載工作線程數量
- 在控制面板中實時顯示下載進度、隊列長度和活動下載數
- 桌面版會自動使用系統緩存目錄儲存資源文件，避免重複下載

### 音量調整
- 功能選單內可調整背景音樂（BGM）、音效（SE）音量，支援靜音與即時預覽
- 音量設定會自動保存於 config.json，桌面與網頁版皆可獨立調整

### 支援網頁版模組
- 直接以瀏覽器開啟 index.html 或部署至 GitHub Pages/Cloudflare Pages 也能使用大部分輔助功能
- 網頁版自動偵測環境，僅桌面版顯示帳號管理、全螢幕、退出遊戲等專屬功能
- 地圖據點、排行榜、勢力分布圖等輔助功能皆可於網頁版完整使用

## 勢力分布圖美化與自訂

主要 JS 檔案：`mod/js/factionMap.js`、`mod/js/customControls.js`

- 勢力分布圖（Voronoi）支援以下美化模式：
  - **圓角分界**：分界線自動圓角化，雙色漸層、極致柔邊，外觀現代且不遮 UI。
  - **極致羽化**：不同勢力色塊交界處自動產生羽化模糊漸層，色塊融合自然無銳利邊。
  - **無分界模式**：完全移除所有分界線，色塊純粹融合，適合極簡或特殊視覺需求。
- 所有模式皆自動對齊地圖區域，隨視窗縮放自適應。
- 可依需求調整圓角強度、羽化寬度、融合透明度等參數。
- 如需切換模式或微調，請修改 `factionMap.js` 相關區塊，或聯絡維護者協助。

## 退出提示語自訂

可於專案根目錄編輯 `mod/data/exit_prompts.yaml`，格式如下：

```yaml
- message: "珍惜生命，遠離逆統戰"
  confirm: "確定"
  cancel: "取消"
- message: "確定要治癒精神疾病嗎?"
  confirm: "確定"
  cancel: "我沒病"
- message: "你無法離開此遊戲，這可不是在鬧著玩的"
  confirm: "我不信離不開"
  cancel: "我信了"
```

每次點擊「退出遊戲」會隨機挑選一組提示語與按鈕。

## 帳號密碼儲存說明（2025/07 更新）
- 帳號密碼資料會自動儲存在系統臨時目錄的隱藏文件夾中
- 這樣可提高安全性，同時避免帳號資料在升級時被覆蓋
- 程式會自動管理帳號資料，無需手動複製或移動檔案

## 系統要求
- Windows 10/11 64位元（建議 Windows 10 22H2 以上版本）
- 4GB RAM 以上
- 支援 GPU 加速的顯示卡（建議 DirectX 11 兼容）
- 網路連線

## 打包與簽章指令（2025/07 更新）
本專案已整理結構，建議直接打包整個 mod 資料夾，指令如下：

1. 安裝 Nuitka（已安裝可略過）：
   ```sh
   pip install nuitka
   ```

2. 使用自動打包腳本（推薦）：
   ```
   build.bat
   ```
   - 這個腳本會自動檢查環境、安裝依賴並使用最佳參數進行打包
   - 打包完成的執行檔位於 `dist/ReversedFront.exe`

3. 也可使用原始打包指令（手動方式）：
   ```powershell
      nuitka --onefile --windows-icon-from-ico=logo.ico --output-dir=dist --output-filename=ReversedFront.exe --assume-yes-for-downloads --disable-console \
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
   - 這樣會把 mod 資料夾（含 data、js 等所有內容）完整打包進執行檔。

4. 打包與簽章（整合流程）：
   ```
   build_and_sign.bat
   ```
   - 執行此腳本可以選擇：「打包程式」、「簽署程式」或「打包並簽署程式」
   - 建議選擇第3項「打包並簽署程式」，一次完成整個流程
   - 系統會自動檢查環境、打包程式，然後使用內建的簽章檔案進行簽署
   - 簽署時需要輸入 mod/data/ReversedFront.pfx 的密碼
   - **數位簽章可有效防止被 Windows Defender 誤判為病毒**
   
   分開執行的方式：
   ```
   build.bat  (僅打包)
   sign.bat   (僅簽署)
   ```

### Nuitka 打包參數說明

- `--output-dir=dist` - 輸出到 dist 目錄
- `--output-filename=ReversedFront.exe` - 設定輸出檔名
- `--disable-console` - 隱藏命令提示字元視窗（新版 Nuitka 使用此參數）
- `--assume-yes-for-downloads` - 自動同意下載依賴項目
- `--windows-company-name="ESC"` - 設定公司名稱
- `--windows-product-name="ReversedFront"` - 設定產品名稱
- `--plugin-enable=pywebview-ui` - 啟用 pywebview 插件支援
- `--disable-plugin=anti-bloat` - 關閉可能導致程式不穩定的最佳化
- `--include-data-dir=mod=mod` - 包含 mod 目錄及其所有檔案

## 程式碼優化與維護

### 程式碼優化（2025/07 更新）
- 清理未使用或冗餘的代碼，提升執行效率
- 重構資源下載管理系統，提升下載速度和穩定性
- 優化記憶體使用，減少資源浪費

### 系統穩定性提升
- 強化錯誤處理機制，防止程式崩潰
- 優化啟動流程，加快載入速度
- 改善視覺效果和使用者體驗

## 注意事項
- 請安裝 Python 3.8+ 與 Nuitka。
- Nuitka 7.2 之後 `--include-data-files` 目標目錄請用 `./` 或子目錄，不能用 `.`。
- Nuitka 打包時會自動偵測依賴，若遇到缺少模組請先安裝。
- 若需推送到 GitHub，請先設定遠端 repo 並執行 `git push`。
- 若要消除 Windows 防毒誤判，建議加上數位簽章。
- ESC 鍵已設為控制面板快捷鍵，可在 keyboard_handler.py 中修改快捷鍵配置。

## 更新日誌
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
