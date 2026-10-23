@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title Sistema de Control de Parqueadero POS - Servidor Local
color 0A
cls

echo =====================================================================
echo           SISTEMA DE CONTROL DE PARQUEADERO POS - LOCAL
echo =====================================================================
echo.

:: 1. Verificar Node.js
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado en este computador o no esta en el PATH.
    echo Para que el sistema funcione, descarga e instala Node.js desde:
    echo https://nodejs.org/
    echo.
    pause
    exit /b
)
echo [OK] Node.js detectado correctamente.

:: 2. Verificar archivo .env
if not exist .env (
    if exist .env.example (
        echo [INFO] Creando archivo de configuracion .env predeterminado...
        copy .env.example .env >nul 2>&1
        echo [OK] Archivo .env configurado con conexion PostgreSQL local.
    ) else (
        (
            echo PORT=3000
            echo DATABASE_URL=postgresql://postgres:password@localhost:5433/wolfzonepos_db
            echo DISABLE_HMR=true
        ) > .env
    )
)

:: 3. Verificar PostgreSQL local (puertos 5433 o 5432)
set "PG_ACTIVE_PORT="
netstat -ano | findstr LISTENING | findstr ":5433" >nul 2>&1
if %errorlevel% equ 0 (
    set "PG_ACTIVE_PORT=5433"
) else (
    netstat -ano | findstr LISTENING | findstr ":5432" >nul 2>&1
    if !errorlevel! equ 0 (
        set "PG_ACTIVE_PORT=5432"
    )
)

if "!PG_ACTIVE_PORT!"=="" (
    echo [INFO] El puerto 5433 / 5432 de PostgreSQL no parece estar escuchando.
    echo Intentando iniciar el servicio de Windows de PostgreSQL...
    
    :: Limpieza preventiva de posibles bloqueos postmaster.pid por corte de luz
    for %%v in (17 16 15 14 13 12) do (
        if exist "C:\Program Files\PostgreSQL\%%v\data\postmaster.pid" (
            del /f /q "C:\Program Files\PostgreSQL\%%v\data\postmaster.pid" >nul 2>&1
        )
    )

    net start postgresql-x64-17 >nul 2>&1 || net start postgresql-x64-16 >nul 2>&1 || net start postgresql-x64-15 >nul 2>&1 || net start postgresql-x64-14 >nul 2>&1 || net start postgresql >nul 2>&1
    
    netstat -ano | findstr LISTENING | findstr ":5433" >nul 2>&1
    if !errorlevel! equ 0 (
        set "PG_ACTIVE_PORT=5433"
    ) else (
        netstat -ano | findstr LISTENING | findstr ":5432" >nul 2>&1
        if !errorlevel! equ 0 (
            set "PG_ACTIVE_PORT=5432"
        )
    )
    
    if "!PG_ACTIVE_PORT!" neq "" (
        echo [OK] Servicio de PostgreSQL iniciado correctamente en puerto !PG_ACTIVE_PORT!.
    ) else (
        echo [INFO] PostgreSQL no esta activo en puerto 5433/5432. El sistema iniciara con modo de contingencia local IndexedDB.
        echo [TIP] Puedes ejecutar REPARAR_POSTGRESQL.bat si la carpeta data sufrio un corte de energia.
    )
) else (
    echo [OK] Servicio de PostgreSQL activo en puerto !PG_ACTIVE_PORT!.
)

:: 4. Verificar dependencias de Node.js
if not exist node_modules (
    echo.
    echo [INFO] No se detecto la carpeta node_modules. Instalando dependencias...
    echo Esto solo tardara un momento...
    call npm install
)
echo [OK] Dependencias listas.

:: 5. Gestionar conflicto de puerto 3000
set "DEV_PORT=3000"
netstat -ano | findstr LISTENING | findstr ":3000" >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo =====================================================================
    echo [ALERTA] El puerto 3000 ya esta siendo utilizado en este equipo.
    echo =====================================================================
    echo  [1] Liberar puerto 3000 automaticamente - Recomendado
    echo  [2] Iniciar en puerto alternativo 3001
    echo  [3] Intentar iniciar de todos modos
    echo.
    set /p port_opt="Digita tu opcion [1-3] y presiona Enter [1]: "
    if "!port_opt!"=="" set "port_opt=1"
    if "!port_opt!"=="1" (
        echo Buscando y liberando procesos previos en puerto 3000...
        for /f "tokens=5" %%a in ('netstat -aon ^| findstr "LISTENING" ^| findstr ":3000"') do (
            taskkill /F /PID %%a >nul 2>&1
        )
        ping 127.0.0.1 -n 2 >nul 2>&1
        echo [OK] Puerto 3000 liberado.
    )
    if "!port_opt!"=="2" (
        set "DEV_PORT=3001"
        echo [INFO] Usando puerto alternativo: 3001
    )
)

:: 6. Abrir en navegador y levantar el servidor
echo.
echo Abriendo la aplicacion en tu navegador...
start "" http://localhost:%DEV_PORT%

echo.
echo =====================================================================
echo  SERVIDOR LOCAL ACTIVO EN: http://localhost:%DEV_PORT%
echo  (Manten esta ventana abierta mientras uses el sistema en la taquilla)
echo =====================================================================
echo.
set "PORT=%DEV_PORT%"
call npm run dev
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Ocurrio un error al ejecutar el servidor local.
    echo Intenta ejecutar 'npm install' o verificar el archivo .env.
    echo.
    pause
)
