# ReversedFront PC

<div align="center">

> 《逆統戰：烽火》跨平台桌面客戶端  
> 基於 Rust + Tauri 2.0 打造的高性能原生應用

[![GitHub Release](https://img.shields.io/github/v/release/MoLinOwO/ReversedFront_PC?style=flat-square)](https://github.com/MoLinOwO/ReversedFront_PC/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/MoLinOwO/ReversedFront_PC/release.yml?style=flat-square)](https://github.com/MoLinOwO/ReversedFront_PC/actions)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=flat-square)](https://github.com/MoLinOwO/ReversedFront_PC/releases)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

</div>

---

## ✨ 核心特性

### 🚀 技術優勢

- **🪶 極致輕量** - 原生應用體積僅 5-10MB，記憶體佔用降低 90%
- **⚡ 原生性能** - 採用系統 WebView (WebView2/WebKit)，支援 GPU 硬體加速
- **🌍 跨平台** - 單一代碼庫，原生支援 Windows / macOS (Intel & Apple Silicon) / Linux
- **🔒 安全可靠** - 代碼混淆保護、權限沙箱隔離、資料本地加密

### 🎮 遊戲增強

| 功能 | 說明 |
|------|------|
| **多帳號管理** | 快速切換多組帳號，自動填充帳密 |
| **ESC 控制面板** | 快捷鍵呼叫，集中管理所有功能 |
| **音量獨立控制** | BGM/SE 分離調節，戰報通知可靜音 |
| **地圖數據分析** | 城市排行榜、Voronoi 勢力分布視覺化 |
| **自動更新** | 檢測新版本並提示下載 |

### ⚙️ 技術亮點

```
📡 本地資源伺服器    → Rust Warp 高性能 HTTP Server
🎯 智能請求攔截      → 區分本地/遠端資源，優化載入速度
📦 斷點續傳下載      → 大型資源支援多線程下載與恢復
🔐 代碼保護         → Webpack Terser 混淆，防止逆向工程
```

---

## 📦 安裝指南

### 下載最新版本

前往 [**Releases**](https://github.com/MoLinOwO/ReversedFront_PC/releases/latest) 頁面下載：

| 平台 | 安裝包 | 說明 |
|------|--------|------|
| **Windows** | `*.msi` / `*.exe` | 標準安裝檔，自動配置環境 |
| **macOS** | `*.dmg` | Universal Binary（Intel + ARM） |
| **Linux** | `*.deb` / `*.AppImage` | Debian 系或通用執行檔 |

### 系統需求

| 平台 | 最低版本 | 備註 |
|------|---------|------|
| **Windows** | 10 (1809+) / 11 | 自動安裝 WebView2 Runtime |
| **macOS** | 10.15 Catalina | 支援 M1/M2/M3 晶片 |
| **Linux** | Ubuntu 20.04+ | 需安裝 `libwebkit2gtk-4.1-dev` |

---

## 🚀 快速開始

### Windows 安裝

```powershell
# 下載 .msi 檔案後雙擊安裝
# 或使用 winget 安裝（待支援）
# winget install ReversedFront
```

1. 執行安裝檔
2. 首次啟動會自動初始化資料目錄
3. 使用 `ESC` 鍵呼叫控制面板

**資料位置**: `C:\Users\<使用者>\AppData\Local\com.reversedfront.app\`

### macOS 安裝

```bash
# 下載 .dmg 檔案
open ReversedFront_universal.dmg
# 拖拽到 Applications 資料夾
```

**首次執行提示**: 若出現「無法打開」警告，請前往  
`系統設定` → `隱私權與安全性` → 點選「強制打開」

**資料位置**: `~/Library/Application Support/com.reversedfront.app/`

### Linux 安裝

#### Debian/Ubuntu (.deb)
```bash
sudo dpkg -i reversed-front_*.deb
sudo apt-get install -f  # 自動修復依賴
```

#### AppImage (通用)
```bash
chmod +x reversed-front_*.AppImage
./reversed-front_*.AppImage
```

**資料位置**: `~/.local/share/com.reversedfront.app/`

---

## 🛠️ 開發者文件

### 環境配置

#### 1. 安裝工具鏈

```bash
# Rust 環境
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Node.js (建議使用 nvm)
nvm install --lts
nvm use --lts

# Tauri CLI
cargo install tauri-cli --version "^2.0.0"
```

#### 2. 平台特定依賴

<details>
<summary><b>Windows</b></summary>

- Visual Studio 2022 (C++ Build Tools)
- WebView2 Runtime (通常已預裝)

</details>

<details>
<summary><b>macOS</b></summary>

```bash
xcode-select --install
```

</details>

<details>
<summary><b>Linux (Ubuntu/Debian)</b></summary>

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf \
  libsoup-3.0-dev
```

</details>

### 本地開發

```bash
# 克隆專案
git clone https://github.com/MoLinOwO/ReversedFront_PC.git
cd ReversedFront_PC

# 安裝前端依賴並編譯
cd assets/mod
npm install
npx webpack
cd ../..

# 開發模式（熱重載）
cd src-tauri
cargo tauri dev

# 生產構建
cargo tauri build
```

構建產物位置：
- Windows: `src-tauri/target/release/bundle/msi/`
- macOS: `src-tauri/target/release/bundle/dmg/`
- Linux: `src-tauri/target/release/bundle/deb/` 或 `appimage/`

### CI/CD 自動發布

專案已配置 GitHub Actions，推送標籤即可觸發多平台建置：

```bash
# 更新版本號（src-tauri/tauri.conf.json）
# 提交變更
git add .
git commit -m "chore: bump version to 2.11.1"

# 建立並推送標籤
git tag v2.11.1
git push origin main --tags
```

約 15-20 分鐘後，Release 頁面會自動出現所有平台的安裝包。

---

## 📂 專案結構

```
ReversedFront/
├── assets/                      # 前端資源（打包到應用）
│   ├── mod/                     # 遊戲模組
│   │   ├── js/                  # JavaScript 源碼
│   │   │   ├── account/         # 帳號管理
│   │   │   ├── audio/           # 音訊控制
│   │   │   ├── core/            # 核心功能
│   │   │   ├── map/             # 地圖分析
│   │   │   ├── ui/              # UI 組件
│   │   │   └── index.js         # 入口點
│   │   ├── data/                # 配置資料
│   │   ├── webpack.config.js    # Webpack 配置（含 Terser 混淆）
│   │   └── package.json
│   ├── static/                  # 靜態資源（React 打包產物）
│   ├── tiles/                   # 地圖瓦片
│   ├── index.html               # 主頁面
│   └── manifest.json
├── src-tauri/                   # Rust 後端
│   ├── src/
│   │   ├── main.rs              # 應用入口
│   │   ├── lib.rs               # 核心邏輯（setup hook）
│   │   ├── commands.rs          # Tauri 命令
│   │   ├── config_manager.rs    # 配置管理（AppData 路徑）
│   │   ├── account_manager.rs   # 帳號管理
│   │   ├── resource_manager.rs  # 資源伺服器
│   │   └── updater.rs           # 自動更新
│   ├── tauri.conf.json          # Tauri 配置
│   ├── Cargo.toml               # Rust 依賴
│   └── capabilities/            # 權限定義
├── .github/workflows/
│   └── release.yml              # CI/CD 配置
└── README.md
```

---

## 🔒 安全性說明

### 代碼保護

- **JS 混淆**: Webpack Terser 壓縮、變數名混淆、移除註解與 console
- **打包隔離**: 使用者安裝後僅獲得編譯產物（`main.bundle.js`），原始碼不暴露
- **權限沙箱**: Tauri Capabilities 限制僅允許必要的系統調用

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
