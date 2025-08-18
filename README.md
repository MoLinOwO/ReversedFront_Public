# ReversedFront

現代東亞國戰手遊《逆統戰：烽火》輔助前端專案

## 專案說明
本專案為《逆統戰：烽火》遊戲的前端輔助工具，包含：
- **多帳號管理系統**：支援多組帳密切換、自動填入、多實例獨立運行（僅桌面版）
- **整合控制面板**：左側可摺疊選單，包含全部功能按鈕、下載狀態及選項
- **全局快捷鍵**：ESC鍵顯示/隱藏控制面板，F11全屏切換
- **智能音量控制**：BGM、SE 分別調整，支援戰報通知靜音，設定實時保存
- **地圖陣營城市排行榜**：即時分析地圖據點分布，浮層顯示，支援拖拉移動
- **靜態資源與地圖資料整合**：包含實時下載進度顯示
- **支援自訂退出提示語**：exit_prompts.yaml，隨機顯示多組提示語與按鈕文字
- **勢力分布圖美化（Voronoi 地圖）**：多種分界模式、圓角柔邊、極致羽化、無分界融合
- **支援網頁版模組**：直接以瀏覽器開啟 index.html 或部署至 GitHub Pages/Cloudflare Pages 也能享有大部分輔助功能
- **優化資源下載**：根據CPU核心數自動調整並行下載數量，提升下載速度
- **GPU加速渲染**：桌面版自動啟用 GPU 加速，提升畫面流暢度和效能

## 新增功能

### 多實例帳號隔離系統（2025/07 更新）
- 支援同時開啟多個應用實例，每個實例的帳號設定完全獨立
- 智能檔案鎖定機制，防止多實例之間的設定衝突
- 音量調整、戰報通知等設定按帳號分別儲存，互不干擾
- 自動檢測目標帳號，確保設定變更只影響當前選中的帳號

### 代碼優化與清理（2025/07 更新）
- 移除未使用的模組和重複代碼，提升程式執行效率
- 清理過時的緩存檔案和靜態資源，減少程式體積
- 簡化 API 結構，移除冗餘的錯誤處理邏輯
- 關閉非必要的調試輸出，優化使用者體驗

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

### 智能音量控制系統
- 功能選單內可調整背景音樂（BGM）、音效（SE）音量，支援靜音與即時預覽
- **戰報通知靜音功能**：可單獨關閉戰報音效（SE147），不影響其他遊戲音效
- 音量設定會自動保存於各帳號設定中，多實例環境下各帳號設定獨立
- 防止音量調整過程中清空帳號密碼，使用事件優化機制確保資料安全
- 桌面與網頁版皆可獨立調整音量設定

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
- **多實例支援**：支援同時開啟多個程式實例，每個實例的帳號設定完全獨立
- **智能檔案管理**：帳號密碼資料會自動儲存在系統臨時目錄的隱藏文件夾中
- **安全性提升**：提高安全性，同時避免帳號資料在升級時被覆蓋
- **自動管理機制**：程式會自動管理帳號資料，無需手動複製或移動檔案
- **檔案鎖定保護**：使用檔案鎖定機制防止多實例同時修改配置檔案造成資料損壞

## 系統要求
- Windows 10/11 64位元（建議 Windows 10 22H2 以上版本）
- 4GB RAM 以上
- 支援 GPU 加速的顯示卡（建議 DirectX 11 兼容）
- 網路連線

## 打包與簽章指令（2025/07 更新）

## 發佈與打包完整流程

### 1. 前端 JS 打包（Webpack）

1. 進入 mod 目錄，安裝依賴（僅首次或 package.json 有變動時）：
  ```sh
  cd mod
  npm install
  ```
2. 執行 Webpack 打包所有 js 成單一 bundle：
  ```sh
  npx webpack --config webpack.config.js --mode=production
  ```
  - 產物會在 `static/js/main.bundle.js`，index.html 只需引用此檔案。
  - 打包後 mod/js 內原始碼不會被發佈。
3. 回到專案根目錄，繼續執行 Python 打包。

### 2. Python 主程式打包（Nuitka）

1. 安裝 Nuitka（已安裝可略過）：
  ```sh
  pip install nuitka
  ```
2. 在專案根目錄執行：
  ```powershell
  nuitka --standalone --output-dir=Buildexe --output-filename=ReversedFront.exe --windows-icon-from-ico=logo.ico --assume-yes-for-downloads --windows-console-mode=disable \
    --include-data-dir=mod/py=mod/py \
    --include-data-files=mod/data/RFcity.yaml=mod/data/ \
    --include-data-files=mod/data/exit_prompts.yaml=mod/data/ \
    --include-data-files=mod/data/soldier-svgrepo-com.svg=mod/data/ \
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
  - 產物會在 `Buildexe/main.dist/`，僅包含必要執行檔與資源。
  - 不會包含 mod/js、node_modules、開發設定檔、簽章檔等。

### 3. 上數位簽章

1. 使用 signtool 對 Buildexe/main.dist/ReversedFront.exe 進行簽章：
   ```& "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe" sign /f "E:\moyul\Desktop\ReversedFront\mod\data\ReversedFront.pfx" /p a239294400 /tr http://timestamp.digicert.com /td sha256 /fd sha256 "E:\moyul\Desktop\ReversedFront\Buildexe\main.dist\ReversedFront.exe"
   ```

### 4. 製作安裝包（Inno Setup）

1. 使用 Inno Setup，來源資料夾設為 `Buildexe/main.dist`。
2. 圖示路徑設為專案根目錄的 logo.ico。
3. 產生的安裝包可直接分發。

### 注意事項
- config.json、帳號、音量等設定皆儲存於 mod/data 目錄。
- 多執行緒下載資源會自動存於 passionfruit 目錄。
- 視窗模式（全螢幕/最大化/一般）會自動保存於 config.json，重啟自動還原。

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

### 最新程式碼優化（2025/07 更新）
- **移除冗餘代碼**：清理未使用的模組、重複的 import 語句和過時的 JavaScript 檔案
- **API 結構簡化**：移除多餘的錯誤處理邏輯，簡化 save_config_volume 和 get_config_volume 方法
- **緩存檔案清理**：刪除過期的 Python 緩存檔案（.pyc），減少程式體積
- **調試模式優化**：關閉非必要的 console.log 輸出，保留重要的多實例調試資訊
- **記憶體使用優化**：重構資源下載管理系統，減少記憶體浪費

### 系統穩定性提升
- **多實例隔離**：每個程式實例的設定完全獨立，防止相互干擾
- **檔案鎖定機制**：防止多實例同時寫入配置檔案造成資料損壞
- **強化錯誤處理**：改善錯誤處理機制，防止程式崩潰
- **優化啟動流程**：加快載入速度，改善視覺效果和使用者體驗

## 注意事項
- 請安裝 Python 3.8+ 與 Nuitka。
- **多實例使用**：可同時開啟多個程式實例，每個實例的帳號和設定完全獨立
- **音量調整安全**：音量滑桿調整時會自動保護帳號密碼不被清空
- **戰報靜音功能**：可在音量控制中單獨關閉戰報通知音效（SE147）
- Nuitka 7.2 之後 `--include-data-files` 目標目錄請用 `./` 或子目錄，不能用 `.`。
- Nuitka 打包時會自動偵測依賴，若遇到缺少模組請先安裝。
- 若需推送到 GitHub，請先設定遠端 repo 並執行 `git push`。
- 若要消除 Windows 防毒誤判，建議加上數位簽章。
- ESC 鍵已設為控制面板快捷鍵，可在 keyboard_handler.py 中修改快捷鍵配置。

## 更新日誌
### 2025/07/25
- **多實例帳號隔離系統**：支援同時開啟多個程式實例，每個實例設定完全獨立
- **戰報通知靜音功能**：可單獨關閉戰報音效（SE147），不影響其他遊戲音效
- **音量控制事件優化**：防止音量調整過程中清空帳號密碼，確保資料安全
- **程式碼大幅優化**：移除冗餘代碼、清理未使用模組、簡化 API 結構
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