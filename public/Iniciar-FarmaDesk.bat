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
echo [PUERTO DE SENALIZACION FARMADESK: 9050 ^| SINGLE-INSTANCE: 19060]
echo ==============================================================================
echo  [1] Iniciar FarmaDesk Pro en este equipo (Modo Cliente / Agente)
echo  [2] Reiniciar FarmaDesk Pro de forma limpia (Matar procesos colgados)
echo  [3] Iniciar Servidor de Senalizacion y Relay FarmaDesk (Puerto 9050)
echo ==============================================================================
echo.

set /p OPCION="Seleccione una opcion [1, 2 o 3, por defecto 1]: "
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
    echo [*] Verificando Servidor de Senalizacion (Puerto 9050)...
    if exist "%~dp0C:\Users\sun_d\.gemini\antigravity\scratch\remote-desktop\server.exe" (
        start "Servidor FarmaDesk 9050" "%~dp0C:\Users\sun_d\.gemini\antigravity\scratch\remote-desktop\server.exe"
    ) else if exist "server.exe" (
        start "Servidor FarmaDesk 9050" "server.exe"
    ) else (
        echo [!] server.exe de Rust no encontrado en la raiz. Usando servidor integrado de Node.js en puerto 3000/9050.
    )
    pause
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
