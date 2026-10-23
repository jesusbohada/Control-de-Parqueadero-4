@echo off
chcp 65001 >nul
title WolfZone POS - Modo Kiosco e Impresión Instantánea
color 0A
cls
echo ==============================================================================
echo       WOLFZONE POS - CONTROL DE PARQUEADERO (MODO IMPRESIÓN INSTANTÁNEA)
echo ==============================================================================
echo.
echo [*] Configurando entorno de ejecución rápida para taquilla...
echo [*] Modo Kiosco de Impresión Silenciosa (--kiosk-printing) activado.
echo.

set PORT=3000
set URL=http://localhost:%PORT%

:: Verificar si el servidor ya esta activo en puerto 3000
netstat -ano | findstr /R /C:":3000.*LISTENING" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [*] El servidor POS no esta activo. Iniciando servidor automaticamente...
    call "%~dp0Iniciar-Parqueadero.bat"
    exit
)

:: Intentar con Microsoft Edge
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    echo [+] Iniciando con Microsoft Edge Kiosk...
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk-printing --app=%URL%
    exit
)

if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    echo [+] Iniciando con Microsoft Edge (x64) Kiosk...
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --kiosk-printing --app=%URL%
    exit
)

:: Intentar con Google Chrome
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    echo [+] Iniciando con Google Chrome Kiosk...
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=%URL%
    exit
)

if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    echo [+] Iniciando con Google Chrome (x86) Kiosk...
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=%URL%
    exit
)

:: Si no se encuentra Edge o Chrome en rutas estándar, abrir navegador por defecto
echo [!] Abriendo navegador predeterminado...
start %URL%
exit
