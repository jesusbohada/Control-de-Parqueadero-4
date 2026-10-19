@echo off
chcp 65001 >nul
title WolfZone POS - Control de Parqueadero
color 0A
cls

echo ======================================================================
echo    WOLFZONE POS - CONTROL DE PARQUEADERO (MODO TAQUILLA)
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Verificar servicio de PostgreSQL
echo [*] Verificando base de datos PostgreSQL 16...
sc query postgresql-x64-16 | find "STATE" | find "RUNNING" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Servicio de PostgreSQL detenido. Iniciando base de datos...
    net start postgresql-x64-16 >nul 2>&1
    timeout /t 2 /nobreak >nul
)
echo [OK] Base de datos PostgreSQL activa.

:: 2. Verificar si el servidor Node.js ya est activo en puerto 3000
echo [*] Verificando servidor local en puerto 3000...
netstat -ano | findstr /R /C:":3000.*LISTENING" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] El servidor POS ya se encuentra en ejecucin.
    goto launch_browser
)

:: 3. Iniciar servidor Node.js en segundo plano
echo [*] Iniciando servidor POS WolfZone en segundo plano...
if not exist "logs" mkdir "logs"
start /b cmd /c "npm run dev > logs\server_runtime.log 2>&1"

:: 4. Esperar a que el servidor responda
echo [*] Esperando disponibilidad del sistema...
set /a retries=0
:wait_loop
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3000/api/postgres/status' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto server_ready

set /a retries+=1
if %retries% GEQ 20 (
    echo [!] El servidor tard ms de lo esperado, abriendo interfaz de todas formas...
    goto launch_browser
)
timeout /t 1 /nobreak >nul
goto wait_loop

:server_ready
echo [OK] Servidor y base de datos listos y en lnea.

:launch_browser
echo [*] Abriendo pantalla de operacin de taquilla...

:: Prioridad 1: Microsoft Edge en modo App (sin barra de navegacin ni URL)
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
echo    PARQUEADERO OPERATIVO - PUEDES CERRAR ESTA VENTANA SI DESEAS
echo ======================================================================
timeout /t 3 /nobreak >nul
exit
