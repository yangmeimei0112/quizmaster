@echo off
chcp 65001 >nul
title QuizMaster 個人題庫系統

echo ========================================================
echo   正在啟動 QuizMaster 個人題庫系統...
echo ========================================================

cd /d "%~dp0"

:: 檢查 port 3000 是否已經啟動
netstat -ano | findstr :3000 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo [提示] 伺服器已在運行中，正在為您打開瀏覽器...
    start http://localhost:3000
    exit /b
)

:: 自動在 2 秒後開啟瀏覽器
start "" powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3000'"

echo [啟動中] 正在開啟本機服務 http://localhost:3000 ...
echo [說明] 請勿關閉此視窗，關閉視窗將停止題庫網站。
echo ========================================================
npm run dev