# ReversedFront

現代東亞國戰手遊《逆統戰：烽火》輔助前端專案

## 專案說明
本專案為《逆統戰：烽火》遊戲的前端輔助工具，包含：
- 帳號管理（多組帳密切換、自動填入，僅桌面版）
- 功能選單（全螢幕切換、排行榜、退出遊戲等）
- 地圖陣營城市排行榜（即時分析地圖據點分布，浮層顯示，支援拖拉移動）
- 靜態資源與地圖資料整合
- 支援自訂退出提示語（exit_prompts.yaml，隨機顯示多組提示語與按鈕文字）
- RFcity.yaml：地圖據點資料，請一併打包
- **勢力分布圖美化（Voronoi 地圖）**：多種分界模式、圓角柔邊、極致羽化、無分界融合
- **音量調整功能**：可調整 BGM、SE 音量，支援靜音，設定自動保存
- **支援網頁版模組**：直接以瀏覽器開啟 index.html 或部署至 GitHub Pages/Cloudflare Pages 也能享有大部分輔助功能（帳號管理、全螢幕、退出遊戲等僅桌面版）

## 新增功能

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

可於專案根目錄編輯 `exit_prompts.yaml`，格式如下：

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

## 帳號密碼儲存說明（2025/06 更新）
- 帳號密碼資料會自動儲存在執行檔（exe）同目錄下的 `account_list.json`。
- 若該檔案不存在，程式會自動複製 `mod/data/account_list.json` 作為範本。
- 這樣可避免帳號資料被覆蓋，範本僅供初次建立使用。

## 打包與簽章指令（2025/06 更新）
本專案已整理結構，建議直接打包整個 mod 資料夾，指令如下：

1. 安裝 Nuitka（已安裝可略過）：
   ```sh
   pip install nuitka
   ```
2. 打包指令：
   ```powershell
   nuitka --onefile --windows-icon-from-ico=logo.ico --output-dir=dist --output-filename=ReversedFront.exe --assume-yes-for-downloads --windows-console-mode=disable \
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
     main.py
   ```
   - 這樣會把 mod 資料夾（含 data、js 等所有內容）完整打包進執行檔。

3. 用 signtool 加上數位簽章（需先用 PowerShell 產生 .pfx 憑證，或購買正式憑證）：
   ```powershell
   & "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe" sign /f "E:\moyul\Desktop\ReversedFront\mod\data\ReversedFront.pfx" /p <你的密碼> /tr http://timestamp.digicert.com /td sha256 /fd sha256 "E:\moyul\Desktop\ReversedFront\dist\ReversedFront.exe"
   ```
   - `<你的密碼>` 請填入你匯出 pfx 時設定的密碼
   - 若路徑不同請自行調整

- `--output-dir` 可自訂輸出路徑，請依個人需求調整（如 `output`、`dist` 等）。
- `--output-filename` 可自訂產生的執行檔名稱，預設為 `ReversedFront.exe`。
- `--assume-yes-for-downloads` 可自動同意 Nuitka 下載依賴工具，打包過程不會中斷。
- `--windows-console-mode=disable` 可隱藏 DOS/命令提示字元視窗，讓程式完全視窗化。
- 執行檔會自動包含所有前端與靜態資源。

## 注意事項
- 請安裝 Python 3.8+ 與 Nuitka。
- Nuitka 7.2 之後 `--include-data-files` 目標目錄請用 `./` 或子目錄，不能用 `.`。
- Nuitka 打包時會自動偵測依賴，若遇到缺少模組請先安裝。
- 若需推送到 GitHub，請先設定遠端 repo 並執行 `git push`。
- 若要消除 Windows 防毒誤判，建議加上數位簽章。
