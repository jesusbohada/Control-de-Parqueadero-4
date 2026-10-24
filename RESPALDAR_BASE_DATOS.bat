@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title WolfZone POS - Copia de Seguridad Inmediata
color 0A
cls

echo ======================================================================
echo    WOLFZONE POS - GENERADOR DE COPIA DE SEGURIDAD (BACKUP)
echo ======================================================================
echo.

if not exist "backups" mkdir "backups"

echo [*] Solicitando copia de seguridad instantanea al sistema...
echo.

netstat -ano | findstr /R /C:":3000.*LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :server_running
goto :server_stopped

:server_running
echo [*] Conectando con servidor local en ejecucion (puerto 3000)...
powershell -NoProfile -Command "try { $r = Invoke-RestMethod -Uri 'http://localhost:3000/api/database/backup/now' -Method Post -TimeoutSec 10; Write-Host ('[OK] ' + $r.message) -ForegroundColor Green } catch { Write-Host ('[!] Fallo API, ejecutando script directo...') -ForegroundColor Yellow; exit 1 }"
if %ERRORLEVEL% EQU 0 goto :show_list

:server_stopped
echo [*] Ejecutando respaldo directo desde PostgreSQL...
node scripts/export_database_backup.cjs
goto :show_list

:show_list
echo.
echo ======================================================================
echo    ULTIMAS COPIAS DE SEGURIDAD EN LA CARPETA /backups/
echo ======================================================================
echo.

powershell -NoProfile -Command "$files = Get-ChildItem -Path 'backups' -Filter '*.json' | Sort-Object LastWriteTime -Descending | Select-Object -First 5; if ($files) { foreach ($f in $files) { $size = [math]::Round($f.Length / 1KB, 1); Write-Host ('  - ' + $f.Name + '  [' + $f.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss') + '] (' + $size + ' KB)') -ForegroundColor Cyan } } else { Write-Host '  No hay copias disponibles.' -ForegroundColor Gray }"

echo.
echo ======================================================================
echo Opciones:
echo  [1] Abrir carpeta /backups/ en el Explorador de Windows (Para copiar a USB)
echo  [2] Salir
echo ======================================================================
echo.
set /p opt="Digita tu opcion [1-2] y presiona Enter [2]: "
if "!opt!"=="1" (
    start "" explorer.exe "%~dp0backups"
)
exit /b 0
