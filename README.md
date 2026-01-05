# ReversedFront PC

> 《逆統戰：烽火》跨平台桌面輔助工具 - 使用 Rust + Tauri 2.0 重構，極致輕量與高效

[![GitHub Release](https://img.shields.io/github/v/release/MoLinOwO/ReversedFront_PC)](https://github.com/MoLinOwO/ReversedFront_PC/releases)
[![Build Status](https://github.com/MoLinOwO/ReversedFront_PC/workflows/Release/badge.svg)](https://github.com/MoLinOwO/ReversedFront_PC/actions)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](https://github.com/MoLinOwO/ReversedFront_PC/releases)

## ✨ 全新架構特性

### 🚀 核心升級 (Rust + Tauri v2)
- **極致輕量** - 安裝檔體積縮小 90% (僅約 5-10MB)
- **原生性能** - 使用系統原生 WebView (WebView2/WebKit)，記憶體佔用大幅降低
- **跨平台支援** - 完美支援 Windows、macOS (Intel/M1/M2) 與 Linux
- **安全性提升** - 嚴格的權限控制 (Capabilities) 與 CSP 策略

### 🎮 遊戲輔助功能
- **多帳號管理** - 支援多組帳密切換、自動填入
- **整合控制面板** - ESC 快捷鍵呼叫，所有功能一鍵觸達
- **智能音量控制** - BGM/SE 分別調整，戰報通知可單獨靜音
- **地圖陣營分析** - 即時城市排行榜、Voronoi 勢力分布圖
- **自動更新** - 內建版本檢查與自動更新提示

### ⚡ 資源管理優化
- **本地資源伺服器** - 內建 Rust 高效能 HTTP Server (Warp)
- **智能攔截** - 精準區分本地靜態資源與遠端資源，解決圖片載入問題
- **斷點續傳** - 支援大檔案 (BGM) 斷點續傳與多線程下載

## 📦 下載安裝

前往 [Releases](https://github.com/MoLinOwO/ReversedFront_PC/releases) 下載最新版本：

| 平台 | 檔案 | 說明 |
|------|------|------|
| **Windows** | `ReversedFront_x64_en-US.msi` | 標準安裝檔 |
| **Windows** | `ReversedFront_x64_en-US.nsis.zip` | 可攜式版本 (免安裝) |
| **macOS** | `ReversedFront_universal.dmg` | 支援 Intel 與 Apple Silicon |
| **Linux** | `reversed-front_amd64.deb` | Debian/Ubuntu 安裝包 |
| **Linux** | `reversed-front_amd64.AppImage` | 通用執行檔 |

### 系統要求

- **Windows**: Windows 10/11 (需安裝 WebView2 Runtime)
- **macOS**: macOS 10.15 Catalina 或更高版本
- **Linux**: Ubuntu 20.04+, Debian 11+ (需 `libwebkit2gtk-4.0`)

## 🚀 快速開始

### Windows
1. 下載並執行 `.msi` 安裝檔
2. 啟動 ReversedFront
3. 使用 ESC 鍵呼叫控制面板

### macOS
1. 下載 `.dmg` 檔案
2. 將 ReversedFront 拖入 Applications 資料夾
3. 首次執行若遇安全性提示，請至「系統設定」→「隱私權與安全性」允許執行

### Linux
```bash
# Debian/Ubuntu
sudo dpkg -i reversed-front_amd64.deb
sudo apt-get install -f  # 修復依賴

# AppImage
chmod +x reversed-front_amd64.AppImage
./reversed-front_amd64.AppImage
```

## 🛠️ 開發者指南

### 環境準備

1. **安裝 Rust**: [https://rustup.rs/](https://rustup.rs/)
2. **安裝 Node.js**: [https://nodejs.org/](https://nodejs.org/) (LTS 版本)
3. **安裝依賴**:
   - Windows: 安裝 Visual Studio C++ Build Tools
   - macOS: `xcode-select --install`
   - Linux: `sudo apt-get install libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`

### 本地構建

```bash
# 克隆專案
git clone https://github.com/MoLinOwO/ReversedFront_PC.git
cd ReversedFront_PC

# 安裝前端依賴
cd assets/mod
npm install
cd ../..

# 安裝 Tauri CLI
npm install -g @tauri-apps/cli

# 開發模式 (Hot Reload)
cd src-tauri
cargo tauri dev

# 生產構建
cargo tauri build
# 執行資源複製腳本 (Windows)
.\copy_resources.ps1
```

### 自動化發布

專案配置了 GitHub Actions，只需推送 Tag 即可觸發全平台打包：

```bash
git tag v2.11.0
git push origin v2.11.0
```

## 📝 技術棧

- **核心**: Rust, Tauri 2.0
- **後端**: Warp (HTTP Server), Reqwest (Download)
- **前端**: JavaScript (ES6+), Webpack 5
- **介面**: HTML5, CSS3 (WebView)

## 📄 授權

本專案僅供學習交流使用，請勿用於商業用途。

---

**Made with ❤️ by ESC**
