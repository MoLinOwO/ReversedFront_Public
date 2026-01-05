# GitHub Actions 自動化編譯指南

## 🚀 全平台自動化構建

本專案已從 Python 遷移至 **Rust + Tauri** 架構，並使用 GitHub Actions 實現真正的跨平台自動化編譯。

支援平台：
- ✅ **Windows** (x64) - `.msi`, `.exe`
- ✅ **macOS** (Universal) - `.dmg`, `.app` (同時支援 Intel 與 Apple Silicon)
- ✅ **Linux** (x64) - `.deb`, `.AppImage`

## 📋 觸發機制

### 自動發布 (Release)
當您推送一個以 `v` 開頭的 Git Tag 時，會自動觸發完整構建流程並發布 Release。

```bash
# 範例：發布 v2.11.0
git tag v2.11.0
git push origin v2.11.0
```

**流程說明：**
1. 啟動三個並行作業 (Windows, macOS, Ubuntu)
2. 自動安裝 Rust, Node.js 及平台依賴
3. 編譯前端資源 (Webpack)
4. 編譯 Rust 後端與打包應用 (Tauri Build)
5. 將所有安裝檔上傳至 GitHub Releases 頁面

### 手動觸發 (Workflow Dispatch)
您也可以在 GitHub Actions 頁面手動觸發構建（通常用於測試）：
1. 進入 **Actions** 頁籤
2. 選擇 **Release** workflow
3. 點擊 **Run workflow**

## 🔧 Workflow 設定詳解

設定檔位於 `.github/workflows/release.yml`。

### 矩陣策略 (Matrix Strategy)
我們使用矩陣策略同時在三個作業系統上運行：

```yaml
matrix:
  include:
    - platform: 'macos-latest'
      args: '--target universal-apple-darwin' # 構建通用二進制
    - platform: 'ubuntu-22.04'
      args: ''
    - platform: 'windows-latest'
      args: ''
```

### 關鍵步驟

1. **環境設置**：
   - 使用 `dtolnay/rust-toolchain` 安裝穩定版 Rust
   - 使用 `actions/setup-node` 安裝 Node.js

2. **前端構建**：
   ```yaml
   - name: Build Frontend (Webpack)
     working-directory: assets/mod
     run: |
       npm install
       npx webpack
   ```

3. **Tauri 打包**：
   ```yaml
   - name: Build Tauri App
     run: cargo tauri build ${{ matrix.args }}
   ```

## 📦 產物說明

構建完成後，Release 頁面會出現以下檔案：

| 檔案類型 | 平台 | 用途 |
|---------|------|------|
| `ReversedFront_x.x.x_x64_en-US.msi` | Windows | 標準安裝程式 |
| `ReversedFront_x.x.x_x64_en-US.nsis.zip` | Windows | 可攜式壓縮包 |
| `ReversedFront_x.x.x_universal.dmg` | macOS | 應用程式安裝映像檔 |
| `reversed-front_x.x.x_amd64.deb` | Linux | Debian/Ubuntu 安裝包 |
| `reversed-front_x.x.x_amd64.AppImage` | Linux | 通用執行檔 (免安裝) |

## 🔐 簽章與安全 (進階)

若需要對應用程式進行數位簽章（消除 Windows SmartScreen 警告或 macOS Gatekeeper 限制），需在 GitHub Secrets 設定以下變數：

- **Windows**:
  - `TAURI_SIGNING_PRIVATE_KEY`: 私鑰內容
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: 私鑰密碼

- **macOS** (需 Apple Developer ID):
  - `APPLE_CERTIFICATE`: p12 證書 (Base64)
  - `APPLE_CERTIFICATE_PASSWORD`: 證書密碼
  - `APPLE_SIGNING_IDENTITY`: 簽章身分 ID

目前設定檔已預留 Windows 簽章的環境變數位置。

## 🐛 故障排除

### 常見錯誤

1. **Linux 編譯失敗**
   - 原因：缺少系統依賴
   - 解法：Workflow 中已包含 `libwebkit2gtk-4.0-dev` 等安裝步驟，請勿移除。

2. **版本號錯誤**
   - 原因：Tag 名稱與 `tauri.conf.json` 中的版本不一致
   - 注意：Tauri 要求嚴格的 SemVer 格式 (x.y.z)，Tag 建議使用 `v` 前綴。

3. **macOS 構建時間過長**
   - 原因：通用二進制需要編譯兩次 (x86_64 + aarch64)
   - 解法：這是正常現象，通常需 15-20 分鐘。

---

**參考文件**：
- [Tauri GitHub Action](https://github.com/tauri-apps/tauri-action)
- [Tauri CI/CD 指南](https://tauri.app/v1/guides/building/ci-cd)
