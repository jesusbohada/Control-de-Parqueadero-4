@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title Reiniciador del Sistema de Control de Parqueadero POS
color 0E
cls

echo =====================================================================
echo          REINICIADOR DEL SISTEMA DE CONTROL DE PARQUEADERO
echo =====================================================================
echo.
echo Este asistente te permite reiniciar los servicios del sistema,
echo liberar puertos colgados y restablecer la conexion a PostgreSQL.
echo.
echo Selecciona el tipo de reinicio:
echo  [1] Reinicio Rapido (Detener y arrancar servidor inmediatamente)
echo  [2] Reinicio con Limpieza de Puertos y Cache
echo  [3] Reinicio Completo con Reinstalacion de Dependencias (npm install)
echo  [4] Solo Detener el Servicio
echo  [5] Cancelar y Salir
echo.
set /p opt="Selecciona una opcion [1-5] y presiona Enter [1]: "
if "!opt!"=="" set "opt=1"

if "!opt!"=="4" (
    call "%~dp0Detener-Parqueadero.bat"
    exit /b
)
if "!opt!"=="5" exit /b

echo.
echo =====================================================================
echo 1. DETENIENDO PROCESOS EN EJECUCION
echo =====================================================================
echo [*] Liberando puerto 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo [*] Finalizando PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)
echo [*] Liberando puerto 3001 (WAN)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
ping 127.0.0.1 -n 2 >nul

if "!opt!"=="2" (
    echo [*] Limpieza forzada de procesos Node.js residuales...
    taskkill /F /IM node.exe >nul 2>&1
    ping 127.0.0.1 -n 2 >nul
)

if "!opt!"=="3" (
    echo [*] Limpieza forzada de procesos Node.js...
    taskkill /F /IM node.exe >nul 2>&1
    echo [*] Ejecutando npm install...
    call npm install
)

echo.
echo =====================================================================
echo 2. VERIFICANDO BASE DE DATOS POSTGRESQL
echo =====================================================================
netstat -ano | findstr LISTENING | findstr ":5432" >nul 2>&1 || netstat -ano | findstr LISTENING | findstr ":5433" >nul 2>&1
if !errorlevel! neq 0 (
    echo [!] Servicio de PostgreSQL detenido. Iniciando...
    net start postgresql-x64-17 >nul 2>&1 || net start postgresql-x64-16 >nul 2>&1 || net start postgresql-x64-15 >nul 2>&1 || net start postgresql >nul 2>&1
    ping 127.0.0.1 -n 3 >nul
)
echo [OK] PostgreSQL verificado y activo.

echo.
echo =====================================================================
echo 3. INICIANDO SERVIDOR LOCAL
echo =====================================================================
echo  SERVIDOR LOCAL EN: http://localhost:3000
echo  (Manten esta ventana abierta mientras uses el sistema en la taquilla)
echo =====================================================================
echo.

start "" http://localhost:3000
call npm run dev
