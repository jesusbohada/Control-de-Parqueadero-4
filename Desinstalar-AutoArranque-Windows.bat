@echo off
chcp 65001 >nul
title WolfZone POS - Desinstalar Auto-Arranque
color 0E
cls

echo ======================================================================
echo    WOLFZONE POS - REMOVER AUTO-ARRANQUE DE WINDOWS
echo ======================================================================
echo.

:: 1. Eliminar Tarea de Task Scheduler
echo [*] Eliminando tarea programada en Windows (si existe)...
schtasks /delete /tn "WolfZonePOS_AutoStart" /f >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Tarea programada 'WolfZonePOS_AutoStart' eliminada con exito.
) else (
    echo [INFO] No habia tarea programada registrada en Task Scheduler.
)

:: 2. Eliminar acceso de la carpeta Startup
echo [*] Eliminando acceso directo de la Carpeta Inicio de Windows...
powershell -NoProfile -Command ^
  "$startup = [System.Environment]::GetFolderPath('Startup'); " ^
  "$link = [System.IO.Path]::Combine($startup, 'WolfZone POS AutoStart.lnk'); " ^
  "if (Test-Path $link) { Remove-Item -Path $link -Force; Write-Host '[OK] Acceso en Carpeta Inicio eliminado con exito.' } else { Write-Host '[INFO] No habia acceso registrado en la Carpeta Inicio.' }"

echo.
echo ======================================================================
echo    Auto-arranque de Windows desactivado correctamente.
echo    El sistema ya no iniciara de forma automatica al encender el PC.
echo ======================================================================
echo.
pause
exit /b 0
