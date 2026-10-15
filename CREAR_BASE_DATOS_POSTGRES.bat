@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title Asistente de Base de Datos PostgreSQL - WolfZone POS
color 0B
cls

echo =====================================================================
echo    CREADOR / VERIFICADOR DE BASE DE DATOS POSTGRESQL - WOLFZONE POS
echo =====================================================================
echo.
echo Este asistente te permite verificar la conexion a PostgreSQL,
echo crear la base de datos 'wolfzonepos_db' e importar el esquema 'database_schema.sql'.
echo.

set "PG_HOST=localhost"
set "PG_PORT=5433"
set "PG_USER=postgres"
set "PG_DB=wolfzonepos_db"
set "PSQL_CMD="

:: Auto-deteccion de puerto activo (5433 o 5432)
netstat -ano | findstr LISTENING | findstr ":5433" >nul 2>&1
if %errorlevel% equ 0 (
    set "PG_PORT=5433"
) else (
    netstat -ano | findstr LISTENING | findstr ":5432" >nul 2>&1
    if !errorlevel! equ 0 (
        set "PG_PORT=5432"
    )
)

:: 1. Detectar psql en PATH
where psql >nul 2>&1
if %errorlevel% equ 0 (
    set "PSQL_CMD=psql"
)

:: 2. Si no esta en PATH, buscar en directorios comunes de PostgreSQL en Windows
if "!PSQL_CMD!"=="" (
    for /d %%D in ("C:\Program Files\PostgreSQL\*") do (
        if exist "%%D\bin\psql.exe" (
            set "PSQL_CMD=%%D\bin\psql.exe"
            set "PATH=%%D\bin;!PATH!"
        )
    )
)
if "!PSQL_CMD!"=="" (
    for /d %%D in ("C:\Program Files (x86)\PostgreSQL\*") do (
        if exist "%%D\bin\psql.exe" (
            set "PSQL_CMD=%%D\bin\psql.exe"
            set "PATH=%%D\bin;!PATH!"
        )
    )
)
if "!PSQL_CMD!"=="" (
    for /d %%D in ("C:\PostgreSQL\*") do (
        if exist "%%D\bin\psql.exe" (
            set "PSQL_CMD=%%D\bin\psql.exe"
            set "PATH=%%D\bin;!PATH!"
        )
    )
)

:: 3. Si aun no se encuentra psql.exe
if "!PSQL_CMD!"=="" (
    echo =====================================================================
    echo [ADVERTENCIA] No se detecto PostgreSQL instalado en este equipo.
    echo =====================================================================
    echo.
    echo  [1] Instalar PostgreSQL 16 LTS automaticamente via winget (Windows)
    echo  [2] Abrir pagina oficial de descarga de PostgreSQL en el navegador
    echo  [3] Omitir (El sistema funcionara en modo navegador IndexedDB)
    echo.
    set /p pg_opt="Selecciona una opcion [1-3]: "
    if "!pg_opt!"=="1" (
        echo.
        echo [INFO] Iniciando instalacion de PostgreSQL con winget...
        echo Durante la instalacion, recuerda la contrasena que asignes al usuario 'postgres'.
        winget install --id PostgreSQL.PostgreSQL.16 -e --accept-source-agreements --accept-package-agreements
        if !errorlevel! neq 0 (
            winget install --id PostgreSQL.PostgreSQL -e --accept-source-agreements --accept-package-agreements
        )
        echo.
        echo Instalacion finalizada. Por favor vuelve a ejecutar este script.
        pause
        exit /b
    )
    if "!pg_opt!"=="2" (
        start "" https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
        echo Descarga el instalador de Windows, ejecutalo y asigna la contrasena a postgres.
        pause
        exit /b
    )
    echo.
    echo [INFO] Continuando sin PostgreSQL. Los datos se almacenaran en el navegador (IndexedDB).
    pause
    exit /b
)

echo [OK] Motor PostgreSQL detectado: !PSQL_CMD!
echo.

:: 4. Verificar e iniciar servicio de Windows si es necesario
echo [1/3] Verificando servicio de PostgreSQL en Windows...
netstat -ano | findstr LISTENING | findstr ":5433" >nul 2>&1 || netstat -ano | findstr LISTENING | findstr ":5432" >nul 2>&1
if %errorlevel% neq 0 (
    echo Iniciando servicio de PostgreSQL...
    net start postgresql-x64-17 >nul 2>&1 || net start postgresql-x64-16 >nul 2>&1 || net start postgresql-x64-15 >nul 2>&1 || net start postgresql >nul 2>&1
)
echo [OK] Servicio verificado.
echo.

:: 5. Solicitar credenciales y puerto
echo [2/3] Verificando credenciales de acceso...
set /p PG_PORT_INPUT="Ingresa el puerto de PostgreSQL [Predeterminado: !PG_PORT!]: "
if "!PG_PORT_INPUT!" neq "" set "PG_PORT=!PG_PORT_INPUT!"

echo Host: %PG_HOST%  ^| Puerto: !PG_PORT!  ^| Usuario: %PG_USER%
echo.
set /p PG_PASS="Ingresa la contrasena del usuario postgres [Predeterminada: password o 123456]: "
if "!PG_PASS!"=="" set "PG_PASS=password"
set "PGPASSWORD=!PG_PASS!"

echo.
echo Probando conexion con PostgreSQL en puerto !PG_PORT!...
"!PSQL_CMD!" -U %PG_USER% -h %PG_HOST% -p !PG_PORT! -c "\q" 2>nul
if %errorlevel% neq 0 (
    echo [INFO] No se pudo conectar en puerto !PG_PORT!. Probando puerto alternativo...
    if "!PG_PORT!"=="5433" (set "ALT_PORT=5432") else (set "ALT_PORT=5433")
    "!PSQL_CMD!" -U %PG_USER% -h %PG_HOST% -p !ALT_PORT! -c "\q" 2>nul
    if !errorlevel! equ 0 (
        echo [OK] Conectado exitosamente en puerto alternativo: !ALT_PORT!
        set "PG_PORT=!ALT_PORT!"
    ) else (
        echo.
        echo [ERROR] No se pudo conectar a PostgreSQL con esa contrasena en puertos 5433 / 5432.
        echo Verifica si la contrasena ingresada coincide con la que definiste al instalar PostgreSQL.
        echo.
        set /p PG_PASS_RETRY="Reintentar con otra contrasena: "
        if "!PG_PASS_RETRY!" neq "" (
            set "PGPASSWORD=!PG_PASS_RETRY!"
            "!PSQL_CMD!" -U %PG_USER% -h %PG_HOST% -p !PG_PORT! -c "\q" 2>nul
            if !errorlevel! neq 0 (
                echo [ERROR] Conexion rechazada nuevamente.
                pause
                exit /b
            )
        ) else (
            pause
            exit /b
        )
    )
)
echo [OK] Conexion establecida exitosamente en puerto !PG_PORT!.
echo.

:: 6. Crear base de datos wolfzonepos_db
echo [3/3] Creando o verificando base de datos '%PG_DB%'...
"!PSQL_CMD!" -U %PG_USER% -h %PG_HOST% -p !PG_PORT! -lqt | findstr /i "%PG_DB%" >nul 2>&1
if %errorlevel% neq 0 (
    echo Creando base de datos '%PG_DB%'...
    "!PSQL_CMD!" -U %PG_USER% -h %PG_HOST% -p !PG_PORT! -c "CREATE DATABASE %PG_DB%;"
    if !errorlevel! equ 0 (
        echo [OK] Base de datos creada exitosamente.
    ) else (
        echo [ERROR] Hubo un problema al crear la base de datos.
    )
) else (
    echo [OK] La base de datos '%PG_DB%' ya existe.
)

:: 7. Aplicar esquema SQL
if exist "%~dp0database_schema.sql" (
    echo.
    echo Aplicando tablas y estructura desde 'database_schema.sql'...
    "!PSQL_CMD!" -U %PG_USER% -h %PG_HOST% -p !PG_PORT! -d %PG_DB% -f "%~dp0database_schema.sql"
    echo [OK] Tablas e indices creados / actualizados.
) else if exist "%~dp0schema.sql" (
    echo.
    echo Aplicando tablas y estructura desde 'schema.sql'...
    "!PSQL_CMD!" -U %PG_USER% -h %PG_HOST% -p !PG_PORT! -d %PG_DB% -f "%~dp0schema.sql"
    echo [OK] Tablas e indices creados / actualizados.
)

:: 8. Actualizar archivo .env con el puerto y la contrasena correcta
(
    echo PORT=3000
    echo DATABASE_URL=postgresql://%PG_USER%:%PGPASSWORD%@localhost:!PG_PORT!/%PG_DB%
    echo DISABLE_HMR=true
) > .env
echo [OK] Archivo .env sincronizado con puerto !PG_PORT! y credenciales.

echo.
echo =====================================================================
echo  ¡CONFIGURACION DE POSTGRESQL COMPLETADA EXITOSAMENTE (PUERTO !PG_PORT!)!
echo =====================================================================
echo Ya puedes iniciar el sistema con: INICIAR_PARQUEADERO.bat
echo.
pause
