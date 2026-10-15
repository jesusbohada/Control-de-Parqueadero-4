@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title Actualizador del Sistema de Control de Parqueadero POS
color 0B
cls

echo =====================================================================
echo          ACTUALIZADOR DEL SISTEMA DE CONTROL DE PARQUEADERO
echo =====================================================================
echo.
echo Directorio activo: %CD%
echo.

:: 1. Verificar Node.js
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado en este computador o no esta en el PATH.
    echo Descargalo desde: https://nodejs.org/
    echo.
    pause
    exit /b
)

:: 2. Verificar Git
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [ADVERTENCIA] Git no esta instalado en este computador.
    echo No es posible descargar actualizaciones automaticamente desde GitHub.
    echo Puedes reinstalar las dependencias locales o instalar Git desde https://git-scm.com/
    echo.
    set /p re_dep="Deseas reinstalar las dependencias locales con npm install? (S/N): "
    if /i "!re_dep!"=="S" goto :dependencies
    goto :end_success
)

:: 3. Verificar repositorio Git
if exist .git goto :repo_ok
echo [ADVERTENCIA] Esta carpeta no esta vinculada a un repositorio Git (posiblemente descargado como ZIP).
echo.
echo Opciones:
echo [1] Reinstalar dependencias de Node.js (npm install)
echo [2] Vincular esta carpeta a tu repositorio Git de GitHub
echo [3] Salir
echo.
set /p zip_opt="Selecciona una opcion (1-3): "
if "!zip_opt!"=="1" goto :dependencies
if "!zip_opt!"=="2" goto :initialize_git
goto :end_success

:initialize_git
echo.
echo Inicializando repositorio Git...
git init
set /p git_url="Ingresa la URL del repositorio de GitHub: "
if "!git_url!"=="" goto :end_success
git remote set-url origin !git_url! 2>nul || git remote add origin !git_url!
git fetch origin
git checkout -f main 2>nul || git checkout -f master 2>nul
echo Repositorio vinculado con exito.
goto :update_menu

:repo_ok
:update_menu
echo Selecciona el tipo de actualizacion:
echo [1] Actualizacion Estandar (Conserva tus configuraciones y .env)
echo [2] Actualizacion Forzada (Sobrescribe cambios locales de codigo - Recomendado)
echo [3] Solo reinstalar dependencias y recompilar (npm install + build)
echo [4] Cancelar y Salir
echo.
set /p opt="Selecciona una opcion (1-4): "
if "!opt!"=="1" goto :standard_update
if "!opt!"=="2" goto :forced_update
if "!opt!"=="3" goto :dependencies
goto :end_success

:standard_update
echo.
echo Descargando ultimos cambios con git pull...
git pull origin main 2>nul || git pull origin master 2>nul || git pull
goto :dependencies

:forced_update
echo.
echo [ADVERTENCIA] Esto actualizara el codigo con la ultima version remota.
git fetch --all
git reset --hard origin/main 2>nul || git reset --hard origin/master 2>nul || git reset --hard
git pull origin main 2>nul || git pull origin master 2>nul || git pull
goto :dependencies

:dependencies
echo.
echo =====================================================================
echo         INSTALANDO DEPENDENCIAS Y RECOMPILANDO APLICACION
echo =====================================================================
echo.
echo Ejecutando npm install...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Hubo un problema al instalar las dependencias con npm.
) else (
    echo [OK] Dependencias instaladas.
)

echo.
echo Recompilando frontend para produccion...
call npm run build
if %errorlevel% equ 0 (
    echo [OK] Compilacion optimizada completada.
)

:: Verificar que .env exista
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul 2>&1
        echo [OK] Archivo .env restaurado desde .env.example.
    )
)

:end_success
echo.
echo =====================================================================
echo                   ACTUALIZACION FINALIZADA
echo =====================================================================
echo.
echo Ya puedes iniciar el sistema con: INICIAR_PARQUEADERO.bat
echo.
pause
exit /b
