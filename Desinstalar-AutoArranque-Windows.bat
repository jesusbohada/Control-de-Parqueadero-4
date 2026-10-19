@echo off
chcp 65001 >nul
title WolfZone POS - Desinstalar Auto-Arranque
color 0E
cls

echo ======================================================================
echo    WOLFZONE POS - REMOVER AUTO-ARRANQUE DE WINDOWS
echo ======================================================================
echo.

powershell -NoProfile -Command ^
  "$startup = [System.Environment]::GetFolderPath('Startup'); " ^
  "$link = [System.IO.Path]::Combine($startup, 'WolfZone POS AutoStart.lnk'); " ^
  "if (Test-Path $link) { Remove-Item -Path $link -Force; Write-Host '[OK] Acceso en Carpeta Inicio eliminado con exito.' } else { Write-Host '[INFO] No habia acceso registrado en la Carpeta Inicio.' }"

echo.
echo ======================================================================
echo    Auto-arranque de Windows desactivado.
echo ======================================================================
echo.
pause
exit
