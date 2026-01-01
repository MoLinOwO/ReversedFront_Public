#!/bin/bash
# macOS/Linux 打包腳本

set -e

echo "=================================="
echo "ReversedFront 跨平台打包腳本"
echo "=================================="

# 檢查 Python 版本
if ! command -v python3 &> /dev/null; then
    echo "錯誤: 未找到 python3"
    exit 1
fi

# 1. 前端 JS 打包
echo ""
echo "步驟 1/3: 打包前端 JavaScript..."
cd mod
npm install
npx webpack --mode production
cd ..
echo "✓ JavaScript 打包完成"

# 2. Python 編譯
echo ""
echo "步驟 2/3: 使用 Nuitka 編譯主程式..."
python3 build.py --clean

# 3. 平台特定處理
echo ""
echo "步驟 3/3: 平台特定處理..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "macOS 平台..."
    # 簽章
    if command -v codesign &> /dev/null; then
        echo "進行應用簽章..."
        codesign --deep --force --sign - dist/main.dist/ReversedFront.app
        echo "✓ 簽章完成"
    fi
    
    # 創建 DMG
    echo "創建 DMG 映像檔..."
    hdiutil create -volname "ReversedFront" \
        -srcfolder dist/main.dist/ReversedFront.app \
        -ov -format UDZO \
        ReversedFront.dmg
    echo "✓ DMG 已創建: ReversedFront.dmg"
    
elif [[ "$OSTYPE" == "linux"* ]]; then
    echo "Linux 平台..."
    chmod +x dist/main.dist/ReversedFront
    
    # 創建 tar.gz
    cd dist/main.dist
    tar -czf ../../ReversedFront-linux.tar.gz .
    cd ../..
    echo "✓ 已創建: ReversedFront-linux.tar.gz"
fi

echo ""
echo "=================================="
echo "🎉 打包完成！"
echo "=================================="
