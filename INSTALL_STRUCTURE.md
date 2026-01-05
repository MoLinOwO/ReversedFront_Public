# 用戶安裝後的路徑結構模擬

## Windows 平台

### 安裝程式位置
```
C:\Program Files\ReversedFront\
├── ReversedFront.exe              # 主程式
├── webview2loader.dll             # WebView2 運行庫
└── resources\                     # 內嵌資源（唯讀，打包在程式內）
    ├── index.html                 # ✅ 主入口頁面
    ├── manifest.json              # ✅ PWA manifest
    ├── transporter.html           # ✅ 轉跳頁面
    └── _internal\                 # Tauri 內部資源
```

### 用戶資料目錄 (AppData)
```
C:\Users\<使用者>\AppData\Local\com.reversedfront.app\
├── mod\
│   ├── js\
│   │   ├── main.bundle.js              # ✅ 混淆壓縮後的 JS (難以閱讀)
│   │   ├── main.bundle.js.LICENSE.txt
│   │   ├── 706.main.bundle.js
│   │   └── tauri_bridge.js
│   └── data\
│       ├── config.json                 # 用戶配置
│       ├── exit_prompts.yaml
│       └── RFcity.yaml
├── static\
│   ├── css\
│   │   └── main.f4ae5b14.css
│   ├── js\
│   │   ├── 787.969164ee.chunk.js
│   │   ├── main.94fae2cd.js
│   │   └── main.94fae2cd.js.LICENSE.txt
│   └── media\
│       └── cursor_48.fcdcf111809b181cad55.cur
├── dexopt\
│   ├── baseline.prof
│   └── baseline.profm
└── tiles\
    └── tilemapresource.xml
    └── 0/, 1/, 2/, 3/, 4/, 5/, 6/...   # 地圖瓦片
```

## macOS 平台

### 應用程式位置
```
/Applications/ReversedFront.app\
├── Contents\
│   ├── MacOS\
│   │   └── ReversedFront              # 主程式
│   ├── Resources\                     # 內嵌資源（唯讀）
│   │   ├── index.html                 # ✅ 主入口頁面
│   │   ├── manifest.json              # ✅ PWA manifest
│   │   └── transporter.html           # ✅ 轉跳頁面
│   └── Info.plist
```

### 用戶資料目錄
```
~/Library/Application Support/com.reversedfront.app/
├── mod/
│   ├── js/
│   │   ├── main.bundle.js              # ✅ 混淆壓縮後
│   │   └── tauri_bridge.js
│   └── data/
│       └── config.json
├── static/
├── dexopt/
└── tiles/
```

## Linux 平台

### 應用程式位置
```
/opt/ReversedFront/                    # 或 /usr/bin/
├── reversed-front                     # 主程式
└── resources/                         # 內嵌資源（唯讀）
    ├── index.html                     # ✅ 主入口頁面
    ├── manifest.json                  # ✅ PWA manifest
    └── transporter.html               # ✅ 轉跳頁面
```

### 用戶資料目錄
```
~/.local/share/com.reversedfront.app/
├── mod/
│   ├── js/
│   │   ├── main.bundle.js              # ✅ 混淆壓縮後
│   │   └── tauri_bridge.js
│   └── data/
│       └── config.json
├── static/
├── dexopt/
└── tiles/
```

---

## 🔒 代碼保護說明

### ❌ 用戶看不到的（您的商業邏輯）：
```
assets/mod/js/account/accountManager.js
assets/mod/js/core/api.js
assets/mod/js/core/utils.js
assets/mod/js/map/factionMap.js
assets/mod/js/ui/customControls.js
... 所有原始碼檔案
```

### ✅ 用戶只能看到：
```javascript
// main.bundle.js (混淆後的範例)
!function(){var e={427:function(e,t,n){var r=n(379)...
function a(e){return e&&e.__esModule?e:{default:e}}
var s=a(n(42)),c=a(n(99));window.addEventListener("DOMContentLoaded"...
```

### 保護機制：
- ✅ 變數名混淆：`accountManager` → `a`
- ✅ 移除註解和空白
- ✅ 移除 console.log
- ✅ 代碼壓縮成一行
- ✅ 原始檔案結構完全隱藏

---

## 首次啟動流程

1. **檢測 AppData 是否為空**
   ```
   如果 C:\Users\xxx\AppData\Local\com.reversedfront.app\ 不存在
   ```

2. **從安裝目錄複製預設資料**
   ```
   從 resources\ 複製 mod/data/ 到 AppData
   ```

3. **正常執行**
   ```
   讀取 AppData 中的配置和資源
   用戶數據保存在 AppData（可讀寫）
   ```
