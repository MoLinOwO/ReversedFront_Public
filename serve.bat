@echo off
REM 啟動本地伺服器（需安裝 Python）
cd /d %~dp0
echo 正在啟動本地伺服器於端口 8080...
echo 請用瀏覽器訪問 http://localhost:8080
echo 按下 Ctrl+C 可結束伺服器
python -m http.server 8080
pause
