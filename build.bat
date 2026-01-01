@echo off
REM Windows 打包腳本

echo ==================================
echo ReversedFront Windows 打包腳本
echo ==================================

REM 1. 前端 JS 打包
echo.
echo 步驟 1/3: 打包前端 JavaScript...
cd mod
call npm install
call npx webpack --mode production
cd ..
echo ✓ JavaScript 打包完成

REM 2. Python 編譯
echo.
echo 步驟 2/3: 使用 Nuitka 編譯主程式...
python build.py --clean

if errorlevel 1 (
    echo ✗ 編譯失敗
    pause
    exit /b 1
)

REM 3. 數位簽章（如果有 pfx 檔案）
echo.
echo 步驟 3/3: 數位簽章...
if exist "mod\data\ReversedFront.pfx" (
    echo 找到簽章檔案，進行簽章...
    "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe" sign ^
        /f "mod\data\ReversedFront.pfx" ^
        /p a239294400 ^
        /tr http://timestamp.digicert.com ^
        /td sha256 ^
        /fd sha256 ^
        "dist\main.dist\ReversedFront.exe"
    echo ✓ 簽章完成
) else (
    echo ⚠ 未找到簽章檔案，跳過簽章
)

echo.
echo ==================================
echo 🎉 打包完成！
echo ==================================
echo.
echo 輸出位置: dist\main.dist\
echo.
echo 下一步: 使用 Inno Setup 創建安裝包
pause
