@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title Configurar Contrasena y Puerto de PostgreSQL - WolfZone POS
color 0B
cls

echo =====================================================================
echo    CONFIGURADOR RAPIDO DE CONTRASENA POSTGRESQL - WOLFZONE POS
echo =====================================================================
echo.
echo Este asistente te permite ingresar la contrasena correcta de tu
echo usuario 'postgres' para conectar la base de datos inmediatamente.
echo.

set "PG_HOST=localhost"
set "PG_USER=postgres"
set "PG_DB=wolfzonepos_db"
set "PG_PORT=5432"

:: Detectar puerto activo (5432 o 5433)
netstat -ano | findstr LISTENING | findstr ":5432" >nul 2>&1
if %errorlevel% equ 0 (
    set "PG_PORT=5432"
) else (
    netstat -ano | findstr LISTENING | findstr ":5433" >nul 2>&1
    if !errorlevel! equ 0 (
        set "PG_PORT=5433"
    )
)

echo [+] Puerto detectado en tu equipo: !PG_PORT!
echo.
set /p USER_PORT="Presiona Enter para usar puerto !PG_PORT! o escribe otro: "
if "!USER_PORT!" neq "" set "PG_PORT=!USER_PORT!"

echo.
echo ---------------------------------------------------------------------
echo Ingresa la contrasena que le asignaste al instalar PostgreSQL
echo (Ejemplos habituales: admin, 123456, postgres, password, root)
echo ---------------------------------------------------------------------
set /p USER_PASS="Contrasena de postgres: "

if "!USER_PASS!"=="" (
    echo [ERROR] No ingresaste ninguna contrasena.
    pause
    exit /b
)

:: Guardar en .env preservando variables existentes como GEMINI_API_KEY
node -e "const fs = require('fs'); const path = '.env'; let c = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : ''; const newDb = 'DATABASE_URL=postgresql://%PG_USER%:' + process.argv[1] + '@localhost:' + process.argv[2] + '/%PG_DB%'; if (c.includes('DATABASE_URL=')) { c = c.replace(/DATABASE_URL=.*/g, newDb); } else { c += (c.endsWith('\n') || !c ? '' : '\n') + newDb + '\n'; } if (!c.includes('PORT=')) c = 'PORT=3000\n' + c; fs.writeFileSync(path, c, 'utf8');" "!USER_PASS!" "!PG_PORT!"

echo.
echo [OK] Archivo .env actualizado con exito:
echo     DATABASE_URL=postgresql://%PG_USER%:****@localhost:!PG_PORT!/%PG_DB%
echo.
echo =====================================================================
echo ¡Listo! Ahora ejecuta INICIAR_PARQUEADERO.bat para iniciar el sistema.
echo =====================================================================
echo.
set /p RUN_NOW="Deseas iniciar el sistema ahora? (S/N): "
if /i "!RUN_NOW!"=="S" (
    start "" "%~dp0INICIAR_PARQUEADERO.bat"
)
