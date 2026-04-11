@echo off
title Tranquilo – Servidor
cd /d "C:\IA Projects\Claude Code\cognia_finance\tranquilo"

echo.
echo  ================================
echo   Tranquilo – Iniciando...
echo  ================================
echo.

:: Obtener IP local
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do (
  set IP=%%a
  goto :found
)
:found
set IP=%IP: =%

echo  En tu PC:     http://localhost:3000
echo  En tu celular: http://%IP%:3000
echo.
echo  (Asegurate de estar en la misma WiFi)
echo  ================================
echo.

start /b powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 5; Start-Process 'http://localhost:3000'"
npx next dev -H 0.0.0.0
