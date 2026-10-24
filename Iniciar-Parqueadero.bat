@echo off
chcp 65001 >nul
title WolfZone POS - Control de Parqueadero
color 0A
cls

echo ======================================================================
echo    WOLFZONE POS - CONTROL DE PARQUEADERO (MODO AUTOMATICO / SERVICIO)
echo ======================================================================
echo.

cd /d "%~dp0"

:: Parametros de ejecucion: --no-browser, --headless o --silent
set "OPEN_BROWSER=1"
if /i "%~1"=="--no-browser" set "OPEN_BROWSER=0"
if /i "%~1"=="--headless" set "OPEN_BROWSER=0"
if /i "%~1"=="--silent" set "OPEN_BROWSER=0"
if /i "%~1"=="--server-only" set "OPEN_BROWSER=0"

:: 1. Limpieza preventiva y verificación del servicio de PostgreSQL
echo [*] Verificando base de datos PostgreSQL...
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

:: 2. Verificar si el servidor Node.js ya esta activo en puerto 3000
echo [*] Verificando servidor local en puerto 3000...
netstat -ano | findstr /R /C:":3000.*LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] El servidor POS ya se encuentra en ejecucion.
    if "%OPEN_BROWSER%"=="1" goto launch_browser
    goto end
)

:: 3. Iniciar servidor Node.js en segundo plano (100% invisible sin ventana en barra de tareas)
echo [*] Iniciando servidor POS WolfZone en segundo plano...
if not exist "logs" mkdir "logs"
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process cmd -ArgumentList '/c npm run dev > logs\server_runtime.log 2>&1' -WindowStyle Hidden"

:: 4. Esperar a que el servidor responda
echo [*] Esperando disponibilidad del sistema...
set /a retries=0
:wait_loop
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3000/api/postgres/status' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto server_ready

set /a retries+=1
if %retries% GEQ 20 (
    echo [!] El servidor tardo mas de lo esperado.
    if "%OPEN_BROWSER%"=="1" goto launch_browser
    goto end
)
ping 127.0.0.1 -n 2 >nul
goto wait_loop

:server_ready
echo [OK] Servidor y base de datos listos y en linea.

if "%OPEN_BROWSER%"=="0" (
    echo [OK] Modo servidor en segundo plano activo sin ventana de navegador.
    goto end
)

:launch_browser
echo [*] Abriendo pantalla de operacion de taquilla...

:: Prioridad 1: Microsoft Edge en modo App (sin barra de navegacion ni URL)
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3000
    goto end
)
if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3000
    goto end
)

:: Prioridad 2: Google Chrome en modo App
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:3000
    goto end
)

:: Fallback: Navegador predeterminado del sistema
start http://localhost:3000

:end
echo.
echo ======================================================================
echo    [OK] SERVICIO WOLFZONE POS OPERATIVO EN SEGUNDO PLANO
echo ======================================================================
if "%OPEN_BROWSER%"=="1" ping 127.0.0.1 -n 3 >nul
exit /b 0
