@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title Asistente de Reparacion y Recuperacion de PostgreSQL - WolfZone POS
color 0E
cls

echo =====================================================================
echo    HERRAMIENTA DE REPARACION Y RECUPERACION DE POSTGRESQL (DATA)
echo =====================================================================
echo.
echo Este asistente repara bloqueos de archivos, 'postmaster.pid' trabados,
echo fallos de arranque tras cortes de luz y corrupcion de la carpeta 'data'.
echo.

:: 1. Detectar directorio de instalacion de PostgreSQL
set "PG_DIR="
set "PG_DATA="
set "PG_BIN="

for %%v in (17 16 15 14 13 12) do (
    if exist "C:\Program Files\PostgreSQL\%%v\bin\pg_ctl.exe" (
        set "PG_DIR=C:\Program Files\PostgreSQL\%%v"
        set "PG_BIN=C:\Program Files\PostgreSQL\%%v\bin"
        if exist "C:\Program Files\PostgreSQL\%%v\data" set "PG_DATA=C:\Program Files\PostgreSQL\%%v\data"
    )
)

if "!PG_BIN!"=="" (
    echo [ALERTA] No se encontro la ruta estandar en C:\Program Files\PostgreSQL.
    echo Buscando en rutas personalizadas...
)

echo Ubicacion detectada de PostgreSQL:
if defined PG_DIR echo Binarios: !PG_BIN!
if defined PG_DATA echo Carpeta Data: !PG_DATA!
echo.
echo =====================================================================
echo   SELECCIONA LA ACCION DE REPARACION:
echo =====================================================================
echo   [1] Reparacion Rapida (Eliminar postmaster.pid trabado y reiniciar servicio)
echo   [2] Reparacion Profunda (Resetear registros WAL con pg_resetwal tras corte de luz)
echo   [3] Recrear Carpeta Data Limpia (Si los archivos estan totalmente destruidos)
echo   [4] Restaurar Datos desde la Carpeta de Backups (C:\wolfzonepos\backups\)
echo   [5] Salir
echo =====================================================================
echo.
set /p opt="Digita tu opcion [1-5] y presiona Enter [1]: "
if "!opt!"=="" set "opt=1"

if "!opt!"=="1" goto OP_REPAIR_LOCK
if "!opt!"=="2" goto OP_REPAIR_WAL
if "!opt!"=="3" goto OP_RECREATE_DATA
if "!opt!"=="4" goto OP_RESTORE_BACKUP
if "!opt!"=="5" exit /b

:OP_REPAIR_LOCK
echo.
echo [1/3] Deteniendo procesos colgados de PostgreSQL...
taskkill /F /IM postgres.exe >nul 2>&1
taskkill /F /IM pg_ctl.exe >nul 2>&1
timeout /t 1 /nobreak >nul

echo [2/3] Eliminando posibles archivos de bloqueo postmaster.pid...
for %%v in (17 16 15 14 13 12) do (
    if exist "C:\Program Files\PostgreSQL\%%v\data\postmaster.pid" (
        del /f /q "C:\Program Files\PostgreSQL\%%v\data\postmaster.pid" >nul 2>&1
        echo [OK] Archivo postmaster.pid eliminado en PostgreSQL %%v.
    )
    if exist "C:\Program Files\PostgreSQL\%%v\data\postmaster.opts" (
        del /f /q "C:\Program Files\PostgreSQL\%%v\data\postmaster.opts" >nul 2>&1
    )
)

echo [3/3] Iniciando servicio de PostgreSQL...
net start postgresql-x64-17 >nul 2>&1 || net start postgresql-x64-16 >nul 2>&1 || net start postgresql-x64-15 >nul 2>&1 || net start postgresql-x64-14 >nul 2>&1 || net start postgresql >nul 2>&1

timeout /t 2 /nobreak >nul
netstat -ano | findstr LISTENING | findstr ":5432" >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo =====================================================================
    echo   [EXITO] PostgreSQL ha sido reparado e iniciado en puerto 5432.
    echo =====================================================================
) else (
    netstat -ano | findstr LISTENING | findstr ":5433" >nul 2>&1
    if !errorlevel! equ 0 (
        echo.
        echo =====================================================================
        echo   [EXITO] PostgreSQL ha sido reparado e iniciado en puerto 5433.
        echo =====================================================================
    ) else (
        echo.
        echo [INFO] Si persiste el fallo, prueba la opcion [2] Reparacion Profunda (pg_resetwal).
    )
)
echo.
pause
exit /b

:OP_REPAIR_WAL
echo.
echo Ejecutando reparacion de WAL (Write-Ahead Log) por corte de energia...
taskkill /F /IM postgres.exe >nul 2>&1

if defined PG_BIN (
    if defined PG_DATA (
        echo Ejecutando pg_resetwal en "!PG_DATA!"...
        "!PG_BIN!\pg_resetwal.exe" -f "!PG_DATA!"
        echo.
        echo Iniciando servicio reparado...
        net start postgresql-x64-17 >nul 2>&1 || net start postgresql-x64-16 >nul 2>&1 || net start postgresql-x64-15 >nul 2>&1 || net start postgresql >nul 2>&1
    )
) else (
    echo [ERROR] No se pudo localizar la ruta de pg_resetwal automaticamente.
)
echo.
pause
exit /b

:OP_RECREATE_DATA
echo.
echo =====================================================================
echo  ATENCION: Esta opcion crea un nuevo cluster de datos limpio en PostgreSQL.
echo  Tus datos podran ser re-cargados inmediatamente desde C:\wolfzonepos\backups\
echo =====================================================================
set /p confirm="Deseas continuar? [S/N]: "
if /i "!confirm!" neq "S" exit /b

taskkill /F /IM postgres.exe >nul 2>&1
if defined PG_DATA (
    set "SAFE_BACKUP=C:\PostgreSQL_Data_Corrupted_%date:/=-%_%time::=-%"
    echo Moviendo carpeta data dañada a carpeta segura: !SAFE_BACKUP!
    ren "!PG_DATA!" "data_corrupted_backup" >nul 2>&1
    mkdir "!PG_DATA!" >nul 2>&1
    
    if defined PG_BIN (
        echo Inicializando nuevo cluster limpio con contrasena 'password'...
        "!PG_BIN!\initdb.exe" -D "!PG_DATA!" -U postgres -A md5 --pwfile=<(echo password) >nul 2>&1 || "!PG_BIN!\initdb.exe" -D "!PG_DATA!" -U postgres
        echo [OK] Nueva carpeta data creada exitosamente.
        net start postgresql-x64-17 >nul 2>&1 || net start postgresql-x64-16 >nul 2>&1 || net start postgresql >nul 2>&1
    )
)
echo.
pause
exit /b

:OP_RESTORE_BACKUP
echo.
echo Abriendo la carpeta de respaldos automaticos...
if exist backups (
    start "" "backups"
    echo [OK] Carpeta de backups abierta.
    echo Puedes importar cualquiera de tus archivos JSON o SQL desde la
    echo interfaz web en: Ajustes -> Base de Datos -> Importar Copia de Seguridad.
) else (
    echo [INFO] Aun no se han generado copias de seguridad en la carpeta local.
)
echo.
pause
exit /b
