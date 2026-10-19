@echo off
chcp 65001 >nul
title WolfZone POS - Configurar Auto-Arranque Windows
color 0B
cls

echo ======================================================================
echo    WOLFZONE POS - INSTALADOR DE ACCESOS Y AUTO-ARRANQUE
echo ======================================================================
echo.

cd /d "%~dp0"

set "TARGET_DIR=%~dp0"
set "LAUNCHER_VBS=%TARGET_DIR%Iniciar-Parqueadero-Silencioso.vbs"
set "LAUNCHER_BAT=%TARGET_DIR%Iniciar-Parqueadero.bat"
set "ICON_PATH=%TARGET_DIR%public\favicon.ico"

echo [*] Creando acceso directo en el ESCRITORIO...
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$s = $ws.CreateShortcut([System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), 'WolfZone POS Parqueadero.lnk')); " ^
  "$s.TargetPath = '%LAUNCHER_BAT%'; " ^
  "$s.WorkingDirectory = '%TARGET_DIR%'; " ^
  "$s.Description = 'Sistema de Control de Parqueadero WolfZone POS'; " ^
  "if (Test-Path '%ICON_PATH%') { $s.IconLocation = '%ICON_PATH%,0'; }; " ^
  "$s.Save();"

echo [OK] Acceso directo creado en el Escritorio.

echo [*] Configurando arranque automtico al encender el computador (Carpeta Inicio)...
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$startup = [System.Environment]::GetFolderPath('Startup'); " ^
  "$s = $ws.CreateShortcut([System.IO.Path]::Combine($startup, 'WolfZone POS AutoStart.lnk')); " ^
  "$s.TargetPath = '%LAUNCHER_VBS%'; " ^
  "$s.WorkingDirectory = '%TARGET_DIR%'; " ^
  "$s.Description = 'Arranque automtico de Taquilla WolfZone POS'; " ^
  "$s.Save();"

echo [OK] Auto-arranque de Windows configurado exitosamente.

echo.
echo ======================================================================
echo    CONFIGURACIN EXITOSA:
echo    1. Icono 'WolfZone POS Parqueadero' listo en tu Escritorio.
echo    2. El sistema se abrir automticamente cada vez que enciendas la PC.
echo ======================================================================
echo.
pause
exit
