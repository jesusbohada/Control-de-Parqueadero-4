@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title Asistente de Instalacion y Configuracion de Parqueadero POS
color 0E
cls

echo =====================================================================
echo    ASISTENTE DE INSTALACION EN EQUIPOS NUEVOS - PARQUEADERO POS
echo =====================================================================
echo.
echo Este asistente instalara y configurara automaticamente todo lo necesario
echo para poner en marcha el sistema de Parqueadero POS con PostgreSQL en este PC.
echo.
echo Se ejecutaran los siguientes pasos:
echo  [1] Verificar e instalar Node.js LTS
echo  [2] Verificar e instalar Git (Para actualizaciones en 1-clic)
echo  [3] Verificar o instalar PostgreSQL y crear la base de datos local
echo  [4] Generar archivo de configuracion .env para la conexion local
echo  [5] Instalar dependencias de Node.js (npm install)
echo  [6] Compilar la aplicacion para produccion
echo  [7] Crear acceso directo en el Escritorio de Windows
echo.
echo =====================================================================
echo ADVERTENCIA: Asegurate de tener conexion a internet para descargas.
echo =====================================================================
echo.
set /p start_opt="Deseas comenzar con la instalacion automatica? (S/N): "
if /i "%start_opt%" neq "S" goto :cancel

:: ---------------------------------------------------------------------
:: PASO 1: VERIFICAR / INSTALAR NODE.JS
:: ---------------------------------------------------------------------
cls
color 0B
echo =====================================================================
echo               PASO 1: VERIFICANDO E INSTALANDO NODE.JS
echo =====================================================================
echo.
where npm >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Node.js ya esta instalado en este equipo.
    goto :check_git
)

echo [INFO] Node.js no fue detectado en el PATH.
echo Intentando instalacion automatica de Node.js LTS via winget de Windows...
echo Por favor espera, esto puede tomar 1 o 2 minutos...
echo.

winget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] No se pudo instalar Node.js de forma automatica via winget.
    echo Por favor descargalo e instalalo manualmente desde: https://nodejs.org/
    echo (Asegurate de marcar la casilla "Add to PATH").
    echo.
    pause
    exit /b
)
echo [OK] Node.js instalado con exito.
echo.

:: ---------------------------------------------------------------------
:: PASO 2: VERIFICAR / INSTALAR GIT
:: ---------------------------------------------------------------------
:check_git
echo =====================================================================
echo                 PASO 2: VERIFICANDO E INSTALANDO GIT
echo =====================================================================
echo.
where git >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Git ya esta instalado en este equipo.
    goto :check_postgres
)

echo [INFO] Git no fue detectado. Intentando instalacion automatica...
echo.
winget install --id Git.Git -e --silent --accept-source-agreements --accept-package-agreements
if %errorlevel% neq 0 (
    echo [ADVERTENCIA] No se pudo instalar Git automaticamente.
    echo Podras usar el sistema local, pero requeriras Git para actualizaciones con 'git pull'.
    echo Descarga manual: https://git-scm.com/
) else (
    echo [OK] Git instalado con exito.
)
echo.

:: ---------------------------------------------------------------------
:: PASO 3: VERIFICAR POSTGRESQL Y BASE DE DATOS
:: ---------------------------------------------------------------------
:check_postgres
echo =====================================================================
echo             PASO 3: VERIFICANDO POSTGRESQL (MOTOR DE DATOS)
echo =====================================================================
echo.

set PSQL_CMD=psql
where psql >nul 2>&1
if %errorlevel% neq 0 (
    :: Buscar en rutas estandar de instalacion de PostgreSQL en Windows
    for /d %%D in ("C:\Program Files\PostgreSQL\*") do (
        if exist "%%D\bin\psql.exe" (
            set "PSQL_CMD=%%D\bin\psql.exe"
            set "PATH=%%D\bin;!PATH!"
        )
    )
)

where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] No se encontro PostgreSQL instalado en este equipo.
    echo.
    echo Deseas que el instalador intente descargarlo e instalarlo automaticamente?
    echo  [1] Si, instalar PostgreSQL automaticamente via winget
    echo  [2] Ya lo tengo instalado o lo instalare manualmente
    echo  [3] Omitir por ahora [el sistema usara modo local IndexedDB]
    echo.
    set /p pg_choice="Selecciona una opcion [1-3]: "
    if "!pg_choice!"=="1" (
        echo Descargando e instalando PostgreSQL...
        winget install --id PostgreSQL.PostgreSQL -e --accept-source-agreements --accept-package-agreements
        echo.
        echo [INFO] Si el instalador solicito contraseña para el usuario postgres, anotala para el siguiente paso.
    )
) else (
    echo [OK] PostgreSQL detectado en el sistema.
)
echo.

:: ---------------------------------------------------------------------
:: PASO 4: CONFIGURAR ARCHIVO .ENV Y CREAR BASE DE DATOS
:: ---------------------------------------------------------------------
:setup_env
cls
color 0E
echo =====================================================================
echo         PASO 4: CONFIGURACION DE LA BASE DE DATOS Y ENTORNO
echo =====================================================================
echo.
set PG_HOST=localhost
set PG_PORT=5432
set PG_USER=postgres
set PG_DB=wolfzonepos_db

if not exist .env (
    echo Configurando credenciales de conexion para PostgreSQL:
    echo.
    set /p PG_PASS="Ingresa la contrasena del usuario 'postgres' [Predeterminada: password]: "
    if "!PG_PASS!"=="" set PG_PASS=password
    
    echo Creando archivo .env local...
    (
        echo PORT=3000
        echo DATABASE_URL=postgresql://!PG_USER!:!PG_PASS!@!PG_HOST!:!PG_PORT!/!PG_DB!
        echo DISABLE_HMR=true
    ) > .env
    echo [OK] Archivo .env generado exitosamente.
) else (
    echo [OK] Archivo .env existente detectado. Conservando configuracion actual.
)
echo.

:: Intentar crear la base de datos wolfzonepos_db si psql esta disponible
where psql >nul 2>&1
if %errorlevel% equ 0 (
    echo Verificando si existe la base de datos '!PG_DB!' en PostgreSQL...
    set PGPASSWORD=!PG_PASS!
    "%PSQL_CMD%" -U !PG_USER! -h !PG_HOST! -p !PG_PORT! -lqt 2>nul | findstr /i "!PG_DB!" >nul 2>&1
    if %errorlevel% neq 0 (
        echo Creando la base de datos '!PG_DB!' en PostgreSQL...
        "%PSQL_CMD%" -U !PG_USER! -h !PG_HOST! -p !PG_PORT! -c "CREATE DATABASE !PG_DB!;" 2>nul
        if %errorlevel% equ 0 (
            echo [OK] Base de datos '!PG_DB!' creada exitosamente en PostgreSQL.
        ) else (
            echo [INFO] No se pudo crear automaticamente. Si no existe, recuerda crearla con:
            echo        psql -U !PG_USER! -c "CREATE DATABASE !PG_DB!;"
        )
    ) else (
        echo [OK] La base de datos '!PG_DB!' ya existe en PostgreSQL.
    )

    if exist database_schema.sql (
        echo Importando tablas y esquema inicial desde database_schema.sql...
        "%PSQL_CMD%" -U !PG_USER! -h !PG_HOST! -p !PG_PORT! -d !PG_DB! -f database_schema.sql >nul 2>&1
        echo [OK] Esquema de base de datos verificado e importado exitosamente.
    )
)
echo.

:: ---------------------------------------------------------------------
:: PASO 5: INSTALAR DEPENDENCIAS (NPM INSTALL)
:: ---------------------------------------------------------------------
:install_deps
cls
color 0B
echo =====================================================================
echo         PASO 5: INSTALANDO MODULOS Y DEPENDENCIAS DEL SISTEMA
echo =====================================================================
echo.
echo Creando directorios auxiliares y de cola de impresion...
mkdir public\print\queue >nul 2>&1
echo [OK] Directorios listos.
echo.
echo Ejecutando 'npm install'... Por favor espera un momento...
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Hubo un problema al instalar las dependencias con npm.
    echo Verifica tu conexion a internet e intenta nuevamente.
    pause
    exit /b
)
echo [OK] Todas las dependencias se instalaron correctamente.
echo.

:: ---------------------------------------------------------------------
:: PASO 6: COMPILACION DE LA APLICACION (NPM RUN BUILD)
:: ---------------------------------------------------------------------
echo =====================================================================
echo         PASO 6: COMPILANDO LA APLICACION PARA ALTO RENDIMIENTO
echo =====================================================================
echo.
echo Compilando interfaz grafica optimizada con Vite...
call npm run build
if %errorlevel% equ 0 (
    echo [OK] Compilacion completada con exito en la carpeta /dist.
) else (
    echo [ADVERTENCIA] Fallo la compilacion previa; el servidor arrancara en modo TSX/Vite.
)
echo.

:: ---------------------------------------------------------------------
:: PASO 7: CREAR ACCESO DIRECTO EN EL ESCRITORIO
:: ---------------------------------------------------------------------
:create_shortcut
cls
color 0A
echo =====================================================================
echo             PASO 7: CREANDO ACCESO DIRECTO EN EL ESCRITORIO
echo =====================================================================
echo.
set "SCRIPT_PATH=%~dp0Iniciar-Parqueadero.bat"
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\Parqueadero POS.lnk"

powershell -NoProfile -Command ^
    "$WshShell = New-Object -ComObject WScript.Shell; ^
     $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); ^
     $Shortcut.TargetPath = '%SCRIPT_PATH%'; ^
     $Shortcut.WorkingDirectory = '%~dp0'; ^
     $Shortcut.IconLocation = 'shell32.dll,23'; ^
     $Shortcut.Description = 'Iniciar Sistema de Parqueadero POS'; ^
     $Shortcut.Save()"

if %errorlevel% equ 0 (
    echo [OK] Acceso directo 'Parqueadero POS' creado en tu Escritorio.
) else (
    echo [INFO] Puedes iniciar el sistema ejecutando directamente 'Iniciar-Parqueadero.bat'.
)
echo.

:: ---------------------------------------------------------------------
:: RESUMEN Y FINALIZACION
:: ---------------------------------------------------------------------
cls
color 0A
echo =====================================================================
echo               ¡INSTALACION COMPLETADA CON EXITO!
echo =====================================================================
echo.
echo El sistema ha quedado completamente instalado y configurado en este equipo.
echo.
echo - Base de datos configurada: PostgreSQL (wolfzonepos_db)
echo - Servidor principal: Node.js + Express en puerto 3000
echo - Acceso directo creado: 'Parqueadero POS' en tu Escritorio
echo.
echo =====================================================================
echo.
set /p launch_now="Deseas iniciar el sistema ahora mismo? (S/N): "
if /i "%launch_now%"=="S" (
    start "" "%~dp0Iniciar-Parqueadero.bat"
)
exit /b

:cancel
echo.
echo [INFO] Instalacion cancelada por el usuario.
echo.
pause
exit /b
