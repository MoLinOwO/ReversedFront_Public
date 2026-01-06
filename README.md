# ReversedFront PC

<div align="center">

> 《逆統戰：烽火》跨平台桌面顯微鏡  
> 基於 Rust + Tauri 2.0 打造的高性能原生應用

[![GitHub Release](https://img.shields.io/github/v/release/MoLinOwO/ReversedFront_Public?style=flat-square)](https://github.com/MoLinOwO/ReversedFront_Public/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/MoLinOwO/ReversedFront_Public/release.yml?style=flat-square)](https://github.com/MoLinOwO/ReversedFront_Public/actions)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=flat-square)](https://github.com/MoLinOwO/ReversedFront_Public/releases)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

</div>

---

## ✨ 核心特性

### 🚀 技術革命
- **🪶 極致輕量** - 安裝包僅 ~2 MB，運行時佔用 <50MB 記憶體
- **⚡ 原生性能** - 採用 Rust 後端 + 系統 WebView2/WebKit，啟動速度 <0.5s
- **🌍 全平台支援** - 完美支援 Windows 10+、macOS (Intel/M系列)、Linux (Ubuntu/Debian)
- **🔒 源碼保護** - JS 代碼經 Webpack Terser 深度混淆，資料與通訊全程加密

### 🎮 遊戲增強
| 功能 | 說明 |
|------|------|
| **多帳號矩陣** | 支援無限組帳號管理，一鍵自動登入切換 |
| **戰略儀表板** | 內建 Voronoi 勢力地圖、實時排行榜分析 |
| **沉浸式體驗** | 獨立 BGM/SE 音軌控制、自定義背景與 UI |
| **智能通知** | 背景執行時可接收戰報與活動提醒 |
| **資源優化** | 本地緩存機制，大幅減少流量消耗 |

---

## 📦 安裝與更新

### 下載最新版本
所有發布版本均透過 GitHub Actions 自動構建，確保安全無毒。
前往 **[Releases 頁面](https://github.com/MoLinOwO/ReversedFront_Public/releases/latest)** 下載：

| 平台 | 檔案類型 | 檔案名稱 | 建議用途 |
|------|----------|----------|----------|
| **Windows** | 安裝檔 | `ReversedFront_setup_x64.exe` | **推薦** (自動更新/捷徑) |
| | 可攜版 | `ReversedFront_x64.nsis.zip` | 免安裝隨身碟版 |
| **macOS** | 映像檔 | `ReversedFront_universal.dmg` | 支援 Intel 與 Apple Silicon |
| **Linux** | 軟體包 | `reversed-front_amd64.deb` | Ubuntu/Debian 系統 |
| | 通用檔 | `reversed-front_amd64.AppImage` | 任何 Linux 發行版 |

### 系統權限說明
- **Windows**: 使用 `WebView2` 運行，Win10/11 通常已預裝。
- **macOS**: 首次開啟若遇「無法驗證開發者」，請至 `系統設定` > `隱私權與安全性` 點擊「強制開啟」。
- **資料位置**: 
  - Win: `%LOCALAPPDATA%\com.reversedfront.app\`
  - Mac: `~/Library/Application Support/com.reversedfront.app/`
  - Linux: `~/.local/share/com.reversedfront.app/`

---

## 🛠️ 開發與構建

### 目錄結構
專案採用前後端分離架構，前端資源位於 `web/`，後端邏輯位於 `src-tauri/`。

```
ReversedFront/
├── web/                         # 前端資源根目錄
│   ├── mod/                     # 遊戲模組與核心邏輯
│   │   ├── js/                  # JavaScript 源碼 (Public 庫中已混淆)
│   │   ├── data/                # YAML 配置資料
│   │   └── webpack.config.js    # Webpack 打包配置
│   ├── static/                  # 靜態資源 (CSS, Media)
│   ├── tiles/                   # 地圖瓦片緩存
│   └── index.html               # 應用入口
├── src-tauri/                   # Rust 後端與 Tauri 配置
│   ├── src/                     # Rust 源碼
│   ├── resources/               # 構建時自動複製的資源
│   └── tauri.conf.json          # 應用配置
└── .github/workflows/           # CI/CD 自動化配置
```

### 本地開發環境
1. **安裝 Rust**: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2. **安裝 Node.js**: 建議使用 LTS 版本
3. **安裝依賴**:
   ```bash
   # 安裝 Tauri CLI
   cargo install tauri-cli --version "^2.0.0"
   
   # 安裝前端依賴
   cd web/mod
   npm install
   ```

### 編譯與運行
```bash
# 1. 構建前端 Webpack Bundle
cd web/mod
npx webpack --mode development

# 2. 啟動 Tauri 開發模式
cd ../../src-tauri
cargo tauri dev

# 3. 生產環境打包
cargo tauri build
```
*注意：`src-tauri/build.rs` 會在編譯時自動將 `web/` 下的資源複製到 `src-tauri/resources` 以解決路徑問題。*

---

## 🤖 CI/CD 自動化流程

本專案使用 GitHub Actions 實現全自動跨平台構建。

### 觸發機制
推送到 `public` 倉庫的 `v*` 標籤 (e.g. `v2.11.1`) 會觸發 Release 流程：
1. **檢出代碼**: 排除未加密的源代碼（僅在 Private 庫保留）
2. **前端構建**: 使用 Webpack 打包並混淆 JS (若由 Private 觸發)
3. **多平台編譯**:
   - `windows-latest`: 編譯 `.msi`, `.exe`
   - `macos-latest`: 編譯 Universal Binary `.dmg`
   - `ubuntu-22.04`: 編譯 `.deb`, `.AppImage`
4. **自動發布**: 將所有產物上傳至 GitHub Releases

### 手動觸發
可在 GitHub Actions 頁面手動執行 `release` workflow 進行測試構建。

---

## 📝 授權與免責

- 本專案代碼採用 [MIT License](LICENSE) 授權。
- 本軟體僅供技術研究與學習使用，開發者不對使用本軟體產生的任何後果負責。
- 請遵守當地法律法規與游戲服務條款。


<div align="center">
<sub>Made with ❤️ by MoLinOwO using Rust & Tauri</sub>
</div>


### 資料存放

| 平台 | 路徑 |
|------|------|
| Windows | `%LOCALAPPDATA%\com.reversedfront.app\` |
| macOS | `~/Library/Application Support/com.reversedfront.app/` |
| Linux | `~/.local/share/com.reversedfront.app/` |

**注意**: 敏感資料（帳號）儲存於本地，未上傳至雲端。

---

## 🧩 技術棧

```
┌─────────────────────────────────────┐
│          前端層 (WebView)            │
│  HTML5 + CSS3 + JavaScript (ES6+)   │
│  Webpack 5 + Terser 壓縮混淆         │
└─────────────────────────────────────┘
              ↕ IPC 通訊
┌─────────────────────────────────────┐
│          後端層 (Rust)               │
│  Tauri 2.0 核心                      │
│  Warp HTTP Server (資源伺服)         │
│  Reqwest (HTTP 客戶端)               │
│  Serde JSON (序列化)                 │
│  Directories (跨平台路徑)            │
└─────────────────────────────────────┘
              ↕ 系統呼叫
┌─────────────────────────────────────┐
│          作業系統                    │
│  WebView2 / WebKit / WebKitGTK      │
│  原生視窗管理 (WinAPI/Cocoa/GTK)     │
└─────────────────────────────────────┘
```

---

## 📝 授權協議

本專案採用 **MIT License** 授權。  
詳見 [LICENSE](LICENSE) 文件。

**免責聲明**: 本工具僅供學習研究使用，請勿用於違反遊戲服務條款的行為。

---

## 🤝 貢獻指南

歡迎提交 Issue 或 Pull Request！  

**開發流程**:
1. Fork 本專案
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

---

## 📮 聯絡方式

- **Issues**: [GitHub Issues](https://github.com/MoLinOwO/ReversedFront_PC/issues)
- **Discussions**: [GitHub Discussions](https://github.com/MoLinOwO/ReversedFront_PC/discussions)

---

<div align="center">

**Made with ❤️ using Rust & Tauri**

⭐ **如果覺得有幫助，請給個 Star！**

</div>
