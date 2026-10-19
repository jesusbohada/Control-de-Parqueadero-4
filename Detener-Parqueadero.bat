@echo off
chcp 65001 >nul
title WolfZone POS - Detener Servidor
color 0C
cls

echo ======================================================================
echo    WOLFZONE POS - DETENER SERVICIO DE PARQUEADERO
echo ======================================================================
echo.

cd /d "%~dp0"

echo [*] Buscando procesos activos en puerto 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo [*] Finalizando proceso POS con PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)

echo [*] Verificando liberación de puerto...
timeout /t 1 /nobreak >nul
netstat -ano | findstr /R /C:":3000.*LISTENING" >nul
if %ERRORLEVEL% EQU 0 (
    echo [!] Aún hay procesos en puerto 3000. Forzando detención de node.exe...
    taskkill /F /IM node.exe >nul 2>&1
)

echo.
echo ======================================================================
echo    [OK] SERVICIO POS DETENIDO CORRECTAMENTE
echo ======================================================================
echo.
timeout /t 3 /nobreak >nul
exit
