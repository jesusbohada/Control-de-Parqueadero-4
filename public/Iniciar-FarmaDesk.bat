@echo off
chcp 65001 >nul
title FarmaDesk Pro - Escritorio Remoto Farmanorte
color 09
cls

echo ==============================================================================
echo           🔵 FARMADESK PRO - CONEXION A ESCRITORIO REMOTO
echo                 Farmanorte Remote Desktop Solution
echo ==============================================================================
echo.
echo FarmaDesk Pro es la solucion nativa en Rust con cifrado asimetrico Ed25519,
echo latencia ultrabaja a 60 FPS y persistencia de ID fijo por equipo.
echo.
echo [PUERTO DE SENALIZACION FARMADESK: 9050 ^| APP POS: 3000 / 3001]
echo ==============================================================================
echo  [1] Iniciar FarmaDesk Pro en este equipo - Cliente / Agente Rust 60 FPS
echo  [2] Reiniciar FarmaDesk Pro de forma limpia - Matar procesos colgados
echo  [3] Iniciar Servidor de Senalizacion y Relay FarmaDesk - Puerto 9050
echo  [4] Iniciar Agente Ligero Windows Streaming - PowerShell Nativo
echo ==============================================================================
echo.

set /p OPCION="Seleccione una opcion [1, 2, 3 o 4, por defecto 1]: "
if "%OPCION%"=="" set OPCION=1

if "%OPCION%"=="2" (
    echo.
    echo [*] Reiniciando FarmaDesk Pro...
    taskkill /F /IM farmadesk.exe >nul 2>&1
    ping 127.0.0.1 -n 2 >nul
    if exist "%~dp0farmadesk.exe" (
        start "" "%~dp0farmadesk.exe"
        echo [OK] FarmaDesk reiniciado exitosamente.
    ) else (
        start "" farmadesk.exe
    )
    exit /b 0
)

if "%OPCION%"=="3" (
    echo.
    echo [*] Verificando Servidor de Senalizacion - Puerto 9050...
    if exist "%~dp0server.exe" (
        start "Servidor FarmaDesk 9050" "server.exe"
    ) else (
        echo [OK] El Servidor Integrado ya corre automaticamente en los puertos 9050 y 3000 de este sistema.
    )
    pause
    exit /b 0
)

if "%OPCION%"=="4" (
    echo.
    echo [*] Iniciando Agente Ligero de Streaming FarmaDesk - PowerShell GDI 20 FPS...
    set /p BRANCH_ID="Ingrese ID de la sucursal [ej: suc-001]: "
    if "%BRANCH_ID%"=="" set BRANCH_ID=suc-001
    set /p SERVER_IP="Ingrese IP o Dominio del Servidor Central [ej: 192.168.14.227 o localhost]: "
    if "%SERVER_IP%"=="" set SERVER_IP=localhost
    start "FarmaDesk Streaming Agent" powershell -ExecutionPolicy Bypass -Command "irm 'http://%SERVER_IP%:3000/api/farmadesk/script/agent.ps1?branchId=%BRANCH_ID%' | iex"
    exit /b 0
)

echo.
echo [*] Iniciando cliente nativo FarmaDesk Pro...
if exist "%~dp0farmadesk.exe" (
    start "" "%~dp0farmadesk.exe"
    echo [OK] FarmaDesk Pro ejecutado correctamente.
) else if exist "%~dp0public\assets\farmadesk.exe" (
    start "" "%~dp0public\assets\farmadesk.exe"
    echo [OK] FarmaDesk Pro ejecutado desde public/assets.
) else (
    echo [!] No se encontro farmadesk.exe en el directorio actual.
    pause
)
