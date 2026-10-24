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

:: 1. Detener procesos previos en puertos 3000 y 3001
echo [*] Paso 1/4: Deteniendo servidor POS en ejecucion...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo [*] Finalizando proceso en puerto 3000 - PID %%a
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do (
    echo [*] Finalizando proceso en puerto 3001 - PID %%a
    taskkill /F /PID %%a >nul 2>&1
)

:: 2. Esperar liberación de puertos
echo [*] Paso 2/4: Verificando liberacion de puertos...
ping 127.0.0.1 -n 3 >nul
netstat -ano | findstr /R /C:":3000.*LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [!] Forzando liberacion de puerto 3000...
    taskkill /F /IM node.exe >nul 2>&1
    ping 127.0.0.1 -n 2 >nul
)
echo [OK] Puertos liberados correctamente.

:: 3. Verificar PostgreSQL con limpieza preventiva de postmaster.pid
echo [*] Paso 3/4: Verificando base de datos PostgreSQL...
for %%v in (17 16 15 14 13 12) do (
    if exist "C:\Program Files\PostgreSQL\%%v\data\postmaster.pid" (
        del /f /q "C:\Program Files\PostgreSQL\%%v\data\postmaster.pid" >nul 2>&1
    )
)
netstat -ano | findstr LISTENING | findstr ":5432" >nul 2>&1 || netstat -ano | findstr LISTENING | findstr ":5433" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Servicio de PostgreSQL detenido. Iniciando base de datos...
    net start postgresql-x64-17 >nul 2>&1 || net start postgresql-x64-16 >nul 2>&1 || net start postgresql-x64-15 >nul 2>&1 || net start postgresql >nul 2>&1
    ping 127.0.0.1 -n 3 >nul
)
echo [OK] Base de datos PostgreSQL activa.

:: 4. Iniciar servidor Node.js en segundo plano (100% invisible)
echo [*] Paso 4/4: Iniciando servidor POS WolfZone en segundo plano...
if not exist "logs" mkdir "logs"
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process cmd -ArgumentList '/c npm run dev > logs\server_runtime.log 2>&1' -WindowStyle Hidden"

:: 5. Esperar disponibilidad del sistema
echo [*] Esperando disponibilidad del sistema...
set /a retries=0
:wait_loop
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3000/api/postgres/status' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto server_ready

set /a retries+=1
if %retries% GEQ 25 (
    echo [!] El servidor esta iniciando. Puedes acceder en http://localhost:3000
    goto launch_browser
)
ping 127.0.0.1 -n 2 >nul
goto wait_loop

:server_ready
echo [OK] Servidor y base de datos restablecidos exitosamente.

:launch_browser
echo [*] Abriendo pantalla de aplicacion...
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3000
    exit /b 0
)
if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3000
    exit /b 0
)
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:3000
    exit /b 0
)
start http://localhost:3000
exit /b 0
