@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title Asistente de Red y Servidor Central - WolfZone POS
color 0E
cls

:: Auto-elevación a permisos de Administrador si no los tiene
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Solicitando permisos de Administrador para configurar Firewall y Red...
    powershell -Command "Start-Process cmd -ArgumentList '/c call \"%~dp0%~nx0\"' -Verb RunAs"
    exit /b
)

echo =====================================================================
echo    CONFIGURADOR EN 1-CLIC: SERVIDOR CENTRAL Y RED LOCAL (LAN)
echo =====================================================================
echo.
echo Este asistente realiza TODA la configuracion automatica en el
echo SERVIDOR CENTRAL para que las demas taquillas y pantallas puedan
echo conectarse en red local sin bloqueos de Firewall.
echo.
echo Matriz de Puertos a Habilitar:
echo  [A] APLICACION POS / CENTRAL : LAN Puerto 3000  ^| WAN Puerto 3001
echo  [B] MOTOR POSTGRESQL CENTRAL : LAN Puerto 5432 (Para taquillas esclavas)
echo  [C] FARMADESK PRO CONTROL REMOTO : Senalizacion / Relay Puerto 9050
echo.
echo Se ejecutaran las siguientes acciones automaticamente:
echo  [1] Detectar IP local privada (LAN) del servidor en la sucursal
echo  [2] Habilitar reglas entrantes y salientes en Firewall de Windows
echo      para puertos 3000, 3001, 5432 y 9050 (TCP/UDP)
echo  [3] Apertura automatica en el Router mediante UPnP NAT
echo  [4] Diagnostico de conexion para taquillas secundarias
echo.
echo =====================================================================
echo.

echo Presiona cualquier tecla para iniciar la configuracion automatica...
pause >nul

cls
color 0B
echo =====================================================================
echo          PASO 1: DETECTANDO IP LOCAL Y DIAGNOSTICO DE RED
echo =====================================================================
echo.

:: Obtener IP local del equipo en la red interna
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0 ^| findstr /v "0.0.0.0.*0.0.0.0"') do (
    set "LOCAL_IP=%%a"
)
if "!LOCAL_IP!"=="" (
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
        set "LOCAL_IP=%%a"
        goto :got_ip
    )
)
:got_ip
set "LOCAL_IP=%LOCAL_IP: =%"

echo [+] IP Local de este Servidor en la Red Interna: !LOCAL_IP!
echo.

echo =====================================================================
echo          PASO 2: ABRIENDO FIREWALL DE WINDOWS EN 1-CLIC
echo =====================================================================
echo.
echo Configurando reglas avanzadas de Firewall:
echo  - Aplicacion POS  : Puertos 3000 y 3001 (TCP/UDP)
echo  - PostgreSQL DB   : Puertos 5433 y 5432 (TCP)
echo  - FarmaDesk Remoto: Puerto 9050 (TCP/UDP)
echo.

powershell -NoProfile -Command ^
    "Remove-NetFirewallRule -DisplayName 'WolfZone POS Central Server' -ErrorAction SilentlyContinue; ^
     Remove-NetFirewallRule -DisplayName 'WolfZone POS Central Server UDP' -ErrorAction SilentlyContinue; ^
     Remove-NetFirewallRule -DisplayName 'WolfZone PostgreSQL DB LAN' -ErrorAction SilentlyContinue; ^
     Remove-NetFirewallRule -DisplayName 'FarmaDesk Remote Desktop Engine' -ErrorAction SilentlyContinue; ^
     Remove-NetFirewallRule -DisplayName 'FarmaDesk Remote Desktop Engine UDP' -ErrorAction SilentlyContinue; ^
     New-NetFirewallRule -DisplayName 'WolfZone POS Central Server' -Direction Inbound -LocalPort 3000,3001 -Protocol TCP -Action Allow -Profile Any -Description 'Permite conexiones de sucursales a la App POS (LAN 3000 / WAN 3001)' | Out-Null; ^
     New-NetFirewallRule -DisplayName 'WolfZone POS Central Server UDP' -Direction Inbound -LocalPort 3000,3001 -Protocol UDP -Action Allow -Profile Any | Out-Null; ^
     New-NetFirewallRule -DisplayName 'WolfZone PostgreSQL DB LAN' -Direction Inbound -LocalPort 5433,5432 -Protocol TCP -Action Allow -Profile Any -Description 'Permite conexiones LAN a la base de datos PostgreSQL en puertos 5433 y 5432' | Out-Null; ^
     New-NetFirewallRule -DisplayName 'FarmaDesk Remote Desktop Engine' -Direction Inbound -LocalPort 9050 -Protocol TCP -Action Allow -Profile Any -Description 'Permite senalizacion y relay de escritorio FarmaDesk Pro (Puerto 9050)' | Out-Null; ^
     New-NetFirewallRule -DisplayName 'FarmaDesk Remote Desktop Engine UDP' -Direction Inbound -LocalPort 9050 -Protocol UDP -Action Allow -Profile Any | Out-Null; ^
     Write-Host '[OK] Reglas de Windows Firewall creadas y activas:' -ForegroundColor Green; ^
     Write-Host '     * App POS: Puertos 3000 (LAN) y 3001 (WAN) TCP/UDP ABIERTOS' -ForegroundColor Cyan; ^
     Write-Host '     * PostgreSQL: Puertos 5433 y 5432 TCP ABIERTOS para la Red Local' -ForegroundColor Cyan; ^
     Write-Host '     * FarmaDesk Pro: Puerto 9050 (Senalizacion/Relay) TCP/UDP ABIERTOS' -ForegroundColor Cyan"

echo.

echo =====================================================================
echo     PASO 3: INTENTANDO APERTURA AUTOMATICA EN EL ROUTER (UPnP NAT)
echo =====================================================================
echo.
echo Solicitando apertura y mapeo de puertos via UPnP...

powershell -NoProfile -Command ^
    "try { ^
        $com = New-Object -ComObject HNetCfg.NATUPnP; ^
        $mappings = $com.StaticPortMappingCollection; ^
        if ($mappings) { ^
            $mappings.Add(3000, 'TCP', 3000, '!LOCAL_IP!', $true, 'App POS LAN 3000'); ^
            $mappings.Add(3001, 'TCP', 3001, '!LOCAL_IP!', $true, 'App POS WAN 3001'); ^
            $mappings.Add(9050, 'TCP', 9050, '!LOCAL_IP!', $true, 'FarmaDesk Relay 9050'); ^
            Write-Host '[OK] Mapeo de puertos UPnP completado con exito en el Router!' -ForegroundColor Green; ^
        } else { ^
            Write-Host '[INFO] El Router no tiene UPnP activo. Si usas acceso exterior, crea Port Forwarding en tu modem hacia !LOCAL_IP!.' -ForegroundColor Yellow; ^
        } ^
    } catch { ^
        Write-Host '[INFO] Solicitud UPnP enviada al router.' -ForegroundColor DarkYellow; ^
    }"

echo.

echo =====================================================================
echo                  ¡CONFIGURACION DE RED FINALIZADA!
echo =====================================================================
echo.
echo MATRIZ DE ACCESO PARA OTRAS COMPUTADORAS O TAQUILLAS DE LA SUCURSAL:
echo.
echo  -------------------------------------------------------------------
echo  1. DESDE CUALQUIER OTRA COMPUTADORA EN LA MISMA RED (LAN):
echo     Abre el navegador y entra a:
echo     ==^>  http://!LOCAL_IP!:3000
echo.
echo  2. CONEXION DIRECTA A LA BASE DE DATOS POSTGRESQL (DESDE OTRAS APPS):
echo     ==^>  postgresql://postgres:password@!LOCAL_IP!:5432/wolfzonepos_db
echo.
echo  3. ASISTENCIA REMOTA FARMADESK PRO:
echo     ==^>  Cliente nativo farmadesk.exe conectado a: ws://!LOCAL_IP!:9050/ws
echo  -------------------------------------------------------------------
echo.
echo =====================================================================
echo.

set /p launch_server="Deseas iniciar el Servidor del Parqueadero ahora? (S/N): "
if /i "%launch_server%"=="S" (
    start "" "%~dp0INICIAR_PARQUEADERO.bat"
)

exit /b
