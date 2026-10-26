@echo off
chcp 65001 >nul
title WolfZone POS - Configurador de Auto-Arranque en Segundo Plano
color 0B
cls

echo ======================================================================
echo    WOLFZONE POS - CONFIGURADOR DE AUTO-ARRANQUE EN SEGUNDO PLANO
echo ======================================================================
echo.
echo Este asistente permite configurar la aplicacion para que inicie
echo automaticamente en segundo plano cada vez que se encienda este PC.
echo.

cd /d "%~dp0"
set "TARGET_DIR=%~dp0"
set "LAUNCHER_VBS=%TARGET_DIR%Iniciar-Parqueadero-Silencioso.vbs"
set "LAUNCHER_BAT=%TARGET_DIR%INICIAR_PARQUEADERO.bat"
set "RESTART_BAT=%TARGET_DIR%Reiniciar-Parqueadero.bat"
set "STOP_BAT=%TARGET_DIR%Detener-Parqueadero.bat"
set "ICON_PATH=%TARGET_DIR%public\favicon.ico"

echo Selecciona el modo de auto-arranque deseado para esta maquina:
echo.
echo  [1] MODO SERVIDOR CENTRAL (Recomendado para la Maquina Central)
echo      * Inicia PostgreSQL y el Servidor Node.js 100%% en segundo plano.
echo      * NO abre navegador (servicio silencioso sin ventanas).
echo      * Siempre disponible en red local para todas las sucursales.
echo.
echo  [2] MODO SUCURSAL / TAQUILLA (Recomendado para la Maquina de la Caja)
echo      * Inicia el servicio en segundo plano de forma 100%% transparente.
echo      * Abre automaticamente la pantalla POS de cobro lista para operar.
echo.
echo  [3] Solo crear accesos directos en el Escritorio (Sin auto-arranque)
echo.
echo  [4] Desinstalar / Desactivar Auto-Arranque
echo.
set /p opt="Digita tu opcion [1-4] y presiona Enter: "

if "%opt%"=="4" goto :uninstall
if "%opt%"=="3" goto :desktop_shortcuts_only
if "%opt%"=="2" goto :setup_pos_branch
if "%opt%"=="1" goto :setup_server_central
goto :setup_pos_branch

:setup_server_central
cls
color 0A
echo ======================================================================
echo    CONFIGURANDO MODO SERVIDOR CENTRAL (100%% EN SEGUNDO PLANO)
echo ======================================================================
echo.

:: 1. Crear Tarea en Programador de Tareas de Windows (Task Scheduler)
echo [*] Registrando servicio en el Programador de Tareas de Windows...
schtasks /create /tn "WolfZonePOS_AutoStart" /tr "wscript.exe \"%LAUNCHER_VBS%\" --no-browser" /sc onlogon /rl highest /f >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Tarea de arranque del sistema registrada exitosamente.
) else (
    echo [INFO] Usando metodo de Carpeta de Inicio de Windows...
)

:: 2. Acceso en Carpeta de Inicio de Windows con bandera --no-browser
echo [*] Creando acceso directo en Carpeta de Inicio de Windows...
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$startup = [System.Environment]::GetFolderPath('Startup'); " ^
  "$s = $ws.CreateShortcut([System.IO.Path]::Combine($startup, 'WolfZone POS AutoStart.lnk')); " ^
  "$s.TargetPath = 'wscript.exe'; " ^
  "$s.Arguments = '\"%LAUNCHER_VBS%\" --no-browser'; " ^
  "$s.WorkingDirectory = '%TARGET_DIR%'; " ^
  "$s.Description = 'Servicio en segundo plano de Servidor Central WolfZone POS'; " ^
  "$s.Save();"

echo [OK] Auto-arranque en segundo plano configurado con exito.
goto :create_desktop_shortcuts

:setup_pos_branch
cls
color 0A
echo ======================================================================
echo    CONFIGURANDO MODO SUCURSAL / CAJA (SEGUNDO PLANO + PANTALLA POS)
echo ======================================================================
echo.

:: 1. Crear Tarea en Programador de Tareas de Windows
echo [*] Registrando auto-arranque en Programador de Tareas de Windows...
schtasks /create /tn "WolfZonePOS_AutoStart" /tr "wscript.exe \"%LAUNCHER_VBS%\"" /sc onlogon /rl highest /f >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Tarea de arranque de taquilla registrada exitosamente.
)

:: 2. Acceso en Carpeta de Inicio de Windows
echo [*] Creando acceso directo en Carpeta de Inicio de Windows...
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$startup = [System.Environment]::GetFolderPath('Startup'); " ^
  "$s = $ws.CreateShortcut([System.IO.Path]::Combine($startup, 'WolfZone POS AutoStart.lnk')); " ^
  "$s.TargetPath = 'wscript.exe'; " ^
  "$s.Arguments = '\"%LAUNCHER_VBS%\"'; " ^
  "$s.WorkingDirectory = '%TARGET_DIR%'; " ^
  "$s.Description = 'Arranque automatico de Taquilla WolfZone POS'; " ^
  "$s.Save();"

echo [OK] Auto-arranque de taquilla configurado con exito.
goto :create_desktop_shortcuts

:create_desktop_shortcuts
echo.
echo [*] Generando accesos directos en el ESCRITORIO...

:: Acceso de Inicio
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$s = $ws.CreateShortcut([System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), 'WolfZone POS Parqueadero.lnk')); " ^
  "$s.TargetPath = '%LAUNCHER_BAT%'; " ^
  "$s.WorkingDirectory = '%TARGET_DIR%'; " ^
  "$s.Description = 'Sistema de Control de Parqueadero WolfZone POS'; " ^
  "if (Test-Path '%ICON_PATH%') { $s.IconLocation = '%ICON_PATH%,0'; }; " ^
  "$s.Save();"

:: Acceso de Reinicio
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$s = $ws.CreateShortcut([System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), 'Reiniciar WolfZone POS.lnk')); " ^
  "$s.TargetPath = '%RESTART_BAT%'; " ^
  "$s.WorkingDirectory = '%TARGET_DIR%'; " ^
  "$s.Description = 'Reiniciar Servicio de Parqueadero WolfZone POS'; " ^
  "if (Test-Path '%ICON_PATH%') { $s.IconLocation = '%ICON_PATH%,0'; }; " ^
  "$s.Save();"

:: Acceso de Detener
powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$s = $ws.CreateShortcut([System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), 'Detener WolfZone POS.lnk')); " ^
  "$s.TargetPath = '%STOP_BAT%'; " ^
  "$s.WorkingDirectory = '%TARGET_DIR%'; " ^
  "$s.Description = 'Detener Servicio de Parqueadero WolfZone POS'; " ^
  "$s.Save();"

echo [OK] Accesos directos 'WolfZone POS Parqueadero', 'Reiniciar' y 'Detener' listos en el Escritorio.

echo.
echo ======================================================================
echo    INSTALACION COMPLETADA EXITOSAMENTE
echo ======================================================================
echo Cada vez que inicies o reinicies este computador, el sistema se
echo ejecutara automaticamente en SEGUNDO PLANO sin ventanas molestas.
echo ======================================================================
echo.
pause
exit /b 0

:desktop_shortcuts_only
echo.
echo [*] Generando accesos directos unicamente en el Escritorio...
goto :create_desktop_shortcuts

:uninstall
cls
color 0E
echo ======================================================================
echo    DESINSTALANDO AUTO-ARRANQUE DE WINDOWS
echo ======================================================================
echo.
call "%TARGET_DIR%Desinstalar-AutoArranque-Windows.bat"
exit /b 0
