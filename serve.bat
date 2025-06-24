@echo off
REM 啟動本地伺服器（需安裝 Python）
cd /d %~dp0
python -m http.server 8080
pause
