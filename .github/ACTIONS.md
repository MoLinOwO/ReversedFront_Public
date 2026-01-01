# GitHub Actions 使用指南

## 🚀 自動化編譯流程

本專案使用 GitHub Actions 自動在三個平台編譯：
- ✅ Windows (64-bit)
- ✅ macOS (Universal/Intel)
- ✅ Linux (x86_64)

## 📋 觸發條件

### 自動觸發
1. **Push 到主分支**：每次推送到 `main` 或 `master` 分支
2. **Pull Request**：創建或更新 PR 時
3. **打標籤發布**：推送 `v*` 標籤（如 `v2.8.0`）

### 手動觸發
在 GitHub 網頁上：
1. 進入 **Actions** 頁面
2. 選擇 **跨平台編譯 (Nuitka)** workflow
3. 點擊 **Run workflow**
4. 選擇分支並執行

## 📦 下載編譯產物

### 方法 1: 從 Actions 下載
1. 進入 **Actions** 頁面
2. 點擊最新的成功運行
3. 在 **Artifacts** 區域下載：
   - `ReversedFront-Windows.zip`
   - `ReversedFront-macOS.dmg`
   - `ReversedFront-Linux.tar.gz`

### 方法 2: 從 Releases 下載（推薦）
如果是打標籤觸發的編譯：
1. 進入 **Releases** 頁面
2. 找到對應版本
3. 下載附件檔案

## 🏷️ 發布新版本

### 步驟 1: 更新版本號
編輯 `build.py`，修改版本號：
```python
'--file-version=2.8.0.0',
'--product-version=2.8.0.0',
```

### 步驟 2: 提交變更
```bash
git add build.py
git commit -m "Bump version to 2.8.0"
git push
```

### 步驟 3: 創建並推送標籤
```bash
git tag v2.8.0
git push origin v2.8.0
```

### 步驟 4: 等待編譯完成
- GitHub Actions 會自動編譯三個平台
- 編譯完成後自動創建 Release
- Release 中包含所有平台的下載檔案

## ⏱️ 編譯時間

大約耗時（取決於 GitHub 伺服器負載）：
- Windows: 15-25 分鐘
- macOS: 20-30 分鐘
- Linux: 10-20 分鐘

**並行執行**：三個平台同時編譯，總時間約 20-30 分鐘

## 🔧 自訂編譯

### 修改 Python 版本
編輯 `.github/workflows/build.yml`：
```yaml
python-version: ['3.13']  # 改為需要的版本
```

### 調整 Nuitka 參數
修改 `build.py` 中的 `nuitka_args`

### 添加平台特定處理
在 workflow 中添加條件步驟：
```yaml
- name: (Windows) 自訂步驟
  if: runner.os == 'Windows'
  run: |
    # Windows 特定指令
```

## 🐛 常見問題

### Q: 編譯失敗怎麼辦？
A: 
1. 查看 Actions 日誌找出錯誤訊息
2. 檢查是否遺漏依賴項目
3. 確認 `requirements.txt` 是最新的

### Q: macOS 缺少圖標？
A: 
1. 準備 `logo.icns` 文件
2. 或確保有 `logo192.png`（workflow 會自動轉換）

### Q: 編譯產物在哪裡？
A:
- **測試編譯**：Actions → Artifacts（保存 90 天）
- **正式發布**：Releases（永久保存）

### Q: 如何節省 GitHub Actions 配額？
A:
1. 只在需要時手動觸發
2. 限制自動觸發分支
3. 使用 `paths` 過濾器：
```yaml
on:
  push:
    paths:
      - '**.py'
      - '**.js'
      - 'mod/**'
```

## 📊 配額說明

GitHub 免費帳號的 Actions 配額：
- **公開倉庫**：無限制 ✅
- **私人倉庫**：每月 2000 分鐘

各平台計費倍率：
- Linux: 1x
- Windows: 2x
- macOS: 10x

**建議**：將倉庫設為公開，享受無限編譯時間

## 🔒 安全性

### 密鑰管理
如需數位簽章，添加 Repository Secrets：
1. Settings → Secrets and variables → Actions
2. 添加 `WINDOWS_CERT_PASSWORD` 等
3. 在 workflow 中使用：
```yaml
env:
  CERT_PASSWORD: ${{ secrets.WINDOWS_CERT_PASSWORD }}
```

### 簽章文件
**不要**將 `.pfx` 或私鑰提交到 Git！
使用 GitHub Secrets 儲存 base64 編碼後的證書：
```bash
# 本地編碼
base64 certificate.pfx > cert.b64

# workflow 中解碼
echo "${{ secrets.CERT_BASE64 }}" | base64 -d > cert.pfx
```

## 📝 最佳實踐

1. ✅ **使用語意化版本**：`v2.8.0`、`v2.8.1` 等
2. ✅ **編寫 Release Notes**：在 tag 訊息中說明變更
3. ✅ **測試後再發布**：先手動觸發測試，確認無誤後打標籤
4. ✅ **保持依賴更新**：定期更新 `requirements.txt`
5. ✅ **監控編譯時間**：優化慢的步驟

## 🎯 進階功能

### 添加測試階段
```yaml
- name: 運行測試
  run: |
    pip install pytest
    pytest tests/
```

### 快取依賴
```yaml
- name: 快取 pip
  uses: actions/cache@v3
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('requirements.txt') }}
```

### 並行矩陣測試
```yaml
strategy:
  matrix:
    os: [windows-latest, ubuntu-latest, macos-latest]
    python-version: ['3.11', '3.12', '3.13']
```

---

**參考資源**：
- [GitHub Actions 文檔](https://docs.github.com/actions)
- [Nuitka 文檔](https://nuitka.net/doc/user-manual.html)
- [本專案 Actions 頁面](../../actions)
