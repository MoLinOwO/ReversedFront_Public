# ReversedFront PC

> 《逆統戰：烽火》跨平台桌面輔助工具 - 使用 Nuitka 原生編譯，安全高效

[![GitHub Release](https://img.shields.io/github/v/release/MoLinOwO/ReversedFront_PC)](https://github.com/MoLinOwO/ReversedFront_PC/releases)
[![Build Status](https://github.com/MoLinOwO/ReversedFront_PC/workflows/build/badge.svg)](https://github.com/MoLinOwO/ReversedFront_PC/actions)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blue)](https://github.com/MoLinOwO/ReversedFront_PC/releases)

## ✨ 主要特性

### 🎮 遊戲輔助功能
- **多帳號管理系統** - 支援多組帳密切換、自動填入、多實例獨立運行
- **整合控制面板** - ESC 快捷鍵呼叫，所有功能一鍵觸達
- **智能音量控制** - BGM/SE 分別調整，戰報通知可單獨靜音
- **地圖陣營分析** - 即時城市排行榜、Voronoi 勢力分布圖
- **自訂退出提示** - 隨機顯示個性化提示語

### ⚡ 性能優化
- **GPU 硬件加速** - 自動啟用 GPU 渲染，流暢度提升 60%
- **多線程下載** - 根據 CPU 核心數自動調整並行下載
- **智能資源緩存** - 避免重複下載，節省流量和時間

### 🔒 安全保護
- **Nuitka 原生編譯** - 代碼編譯為機器碼，極難反編譯
- **源碼完全隔離** - 發布包不包含任何 Python/JavaScript 源代碼
- **數位簽章支援** - Windows 安裝程序經過數位簽章驗證

## 📦 下載安裝

### 自動構建版本（推薦）

前往 [Releases](https://github.com/MoLinOwO/ReversedFront_PC/releases) 下載最新版本：

- **Windows**: `ReversedFront-Setup.exe` - 安裝程序（已簽章）
- **Linux**: `ReversedFront-Linux.deb` - Debian 安裝包

### 系統要求

- **Windows**: Windows 10/11 64位元（建議 22H2 以上）
- **Linux**: Ubuntu 22.04+ / Debian 11+
- **硬件**: 4GB RAM，支援 GPU 加速的顯示卡
- **網路**: 需要網路連線下載遊戲資源

## 🚀 快速開始

### Windows
1. 下載 `ReversedFront-Setup.exe`
2. 執行安裝程序（可能會出現 SmartScreen 警告，點擊「詳細資訊」→「仍要執行」）
3. 啟動 ReversedFront
4. 使用 ESC 鍵呼叫控制面板

### Linux
```bash
# Debian/Ubuntu
sudo dpkg -i ReversedFront-Linux.deb
sudo apt-get install -f  # 修復依賴

# 啟動
reversedfront
```

## 🎯 核心功能說明

### 多實例帳號隔離
- 支援同時開啟多個程式實例
- 每個實例的帳號設定完全獨立
- 智能檔案鎖定防止設定衝突

### 智能音量控制
- **BGM 音量** - 背景音樂獨立調整
- **SE 音量** - 音效獨立調整
- **戰報靜音** - 單獨關閉 SE147 戰報音效
- 設定按帳號儲存，自動同步

### 勢力分布圖美化
- **圓角分界** - 分界線圓角化，雙色漸層
- **極致羽化** - 勢力交界處自然融合
- **無分界模式** - 完全移除分界線

### 自訂退出提示
編輯 `mod/data/exit_prompts.yaml`:
```yaml
- message: "珍惜生命，遠離逆統戰"
  confirm: "確定"
  cancel: "取消"
```

## 🛠️ 開發者指南

### 環境準備

```bash
# 克隆專案
git clone https://github.com/MoLinOwO/ReversedFront_PC.git
cd ReversedFront_PC

# 安裝 Python 依賴
pip install -r requirements.txt

# 安裝前端依賴
cd mod
npm install
cd ..
```

### 本地構建

#### 前端打包
```bash
cd mod
npx webpack --mode production
cd ..
```

#### Python 編譯
```bash
# 自動構建（推薦）
python build.py

# 清理後重新構建
python build.py --clean
```

編譯完成後，可執行文件位於 `dist/main.dist/`

### GitHub Actions 自動化

專案已配置 GitHub Actions，自動構建流程：

1. **推送代碼** - 自動觸發構建
2. **創建 Tag** - 自動創建 Release
   ```bash
   git tag v2.9.0 -m "Release v2.9.0"
   git push origin v2.9.0
   ```
3. **自動產出**:
   - Windows 安裝程序（已簽章）
   - Linux .deb 安裝包
   - 自動上傳到 GitHub Releases

### 版本管理

版本號定義在 `main.py`:
```python
LOCAL_VERSION = "2.9"
```

修改後會自動同步到編譯版本。

## 🔐 安全性說明

### 源代碼保護
- ✅ Python 代碼編譯為 C/機器碼（Nuitka）
- ✅ JavaScript 已壓縮混淆（Webpack）
- ✅ 發布包**不包含**任何 .py 源文件
- ✅ 發布包**不包含**任何 .js 源代碼
- ✅ 發布包**不包含**證書文件（.pfx）

### 數位簽章
- Windows 安裝程序經過數位簽章
- 證書透過 GitHub Secrets 安全管理
- 減少防毒軟體誤報

### 資料儲存
- 帳號密碼儲存在系統臨時目錄
- 使用隱藏文件夾保護隱私
- 檔案鎖定防止多實例衝突

## 📝 技術棧

- **後端**: Python 3.13, PyQt6, Nuitka
- **前端**: JavaScript (ES6+), Webpack 5
- **地圖**: D3.js, Delaunay Triangulation
- **構建**: GitHub Actions, Inno Setup (Windows), dpkg (Linux)
- **簽章**: SignTool (Windows)

## 🎨 自訂配置

### 音量設定
位置：系統臨時目錄（自動管理）
```json
{
  "bgm": 0.5,
  "se": 0.8,
  "se147Muted": false
}
```

### 退出提示
位置：`mod/data/exit_prompts.yaml`

### 城市資料
位置：`mod/data/RFcity.yaml`

## 🐛 常見問題

### Windows 藍色警告視窗
- 正常現象，點擊「詳細資訊」→「仍要執行」
- 已簽章版本會減少警告

### Linux 缺少依賴
```bash
sudo apt-get install -y libgl1 libegl1 libxkbcommon0 libdbus-1-3
```

### 無法啟動
1. 確認系統要求符合
2. 檢查防毒軟體是否攔截
3. 以管理員權限執行

## 📜 更新日誌

### v2.9.0 (2026-01-02)
- 🔒 安全性大幅提升：完全排除源代碼和證書
- ✨ 自動從 main.py 讀取版本號
- 🚀 GitHub Actions 自動化構建
- 🐛 修復戰報通知按鈕事件監聽器衝突
- 🐛 修復快速雙擊導致狀態切換問題

### v2.8.0 (2025-07-25)
- ⚡ 啟用 GPU 硬件加速
- 🎮 多實例帳號隔離系統
- 🔇 戰報通知靜音功能
- 🧹 大幅程式碼優化與清理

## 📄 授權

本專案僅供學習交流使用，請勿用於商業用途。

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

---

**Made with ❤️ by ESC**