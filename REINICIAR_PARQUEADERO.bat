@echo off
chcp 65001 >nul
title WolfZone POS - Reiniciar Servidor
color 0E
cls

echo ======================================================================
echo    WOLFZONE POS - REINICIAR SERVICIO DE PARQUEADERO
echo ======================================================================
echo.

cd /d "%~dp0"

REM 1. Detener procesos previos en puertos 3000 y 3001
echo [*] Paso 1/3: Deteniendo procesos de servidor POS...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo [*] Finalizando proceso en puerto 3000 - PID %%a
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do (
    echo [*] Finalizando proceso en puerto 3001 - PID %%a
    taskkill /F /PID %%a >nul 2>&1
)

REM 2. Esperar liberacion de puertos
echo [*] Paso 2/3: Verificando liberacion de puertos...
ping 127.0.0.1 -n 2 >nul
netstat -ano | findstr /R /C:":3000.*LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [!] Forzando detencion de procesos node.exe residuales...
    taskkill /F /IM node.exe >nul 2>&1
    ping 127.0.0.1 -n 2 >nul
)
echo [OK] Puertos liberados.

REM 3. Iniciar nuevamente el sistema
echo [*] Paso 3/3: Iniciando nuevamente el sistema...
call "%~dp0INICIAR_PARQUEADERO.bat" %*
exit /b 0
