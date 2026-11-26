/**
 * Rutas de la API (farmadesk). Se registran desde startServer() en server.ts.
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import {
  requirePermission,
  agentKeyFor,
  verifyAgentKey,
} from '../auth.ts';

export interface RegisterFarmadeskRoutesDeps {
  PORT: number;
  limitPin: express.RequestHandler;
}

export function registerFarmadeskRoutes(app: express.Express, ctx: RegisterFarmadeskRoutesDeps) {
  const { PORT, limitPin } = ctx;
  // FARMADESK PRO AGENT DOWNLOADS & SCRIPT GENERATOR
  app.get('/api/farmadesk/script/agent.bat', (req, res) => {
    const branchId = (req.query.branchId as string) || 'suc-001';
    const host = req.headers.host || `localhost:${PORT}`;
    const httpProtocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const ps1Url = `${httpProtocol}://${host}/api/farmadesk/script/agent.ps1?branchId=${branchId}&agentKey=${agentKeyFor(branchId)}`;

    const batScript = `@echo off
chcp 65001 >nul
title FarmaDesk Pro(R) Agente de Control Remoto - Sede ${branchId}
color 0A
cls
echo ==============================================================================
echo    FARMADESK(R) PRO - CONECTANDO ESCRITORIO REMOTO DE ESTA PC A CENTRAL
echo ==============================================================================
echo.
echo [*] Sede ID: ${branchId}
echo [*] Servidor Central: ${host}
echo [*] Iniciando canal de video y control remoto en vivo...
echo.
powershell -ExecutionPolicy Bypass -NoProfile -Command "[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls13; iex (New-Object System.Net.WebClient).DownloadString('${ps1Url}')"
echo.
echo [!] Conexion finalizada. Presione cualquier tecla para reiniciar...
pause >nul
goto :eof
`;
    res.setHeader('Content-Type', 'application/x-bat');
    res.setHeader('Content-Disposition', `attachment; filename="Iniciar-FarmaDesk-${branchId}.bat"`);
    res.send(batScript);
  });

  app.get('/api/farmadesk/script/agent.ps1', (req, res) => {
    const branchId = (req.query.branchId as string) || 'suc-001';
    // Ruta pública para `iex`: exige sesión o la llave del agente de esa sede
    if (!req.auth && !verifyAgentKey(branchId, req.query.agentKey)) {
      return res.status(401).type('text/plain').send('# Acceso denegado: descargue el agente desde el panel FarmaDesk con sesión iniciada.');
    }
    const host = req.headers.host || `localhost:${PORT}`;
    const wsProtocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${host}/ws?type=farmadesk-agent&branchId=${branchId}&agentKey=${agentKeyFor(branchId)}`;

    const ps1Script = `# ==============================================================================
# FARMADESK® REMOTE DESKTOP AGENT v3.2 - WINDOWS NATIVE STREAMER & CONTROLLER
# Transmisión en tiempo real de pantalla física y control total de ratón y teclado
# Sede Destino: ${branchId}
# ==============================================================================

[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls13

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$signature = @"
[DllImport("user32.dll")]
public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
[DllImport("user32.dll")]
public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
[DllImport("user32.dll")]
public static extern bool LockWorkStation();
"@
try {
    Add-Type -MemberDefinition $signature -Name "WinInput" -Namespace "Win32Functions" -ErrorAction SilentlyContinue
} catch {}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  🖥️ FARMADESK® PRO AGENT - CONTROL REMOTO NATIVO ACTIVO" -ForegroundColor Green
Write-Host "  Conectando al servidor central: ${wsUrl}" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

$wsUrl = "${wsUrl}"
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$width = [int]($bounds.Width / 1.33)
$height = [int]($bounds.Height / 1.33)

while ($true) {
    $client = New-Object System.Net.WebSockets.ClientWebSocket
    $cts = New-Object System.Threading.CancellationTokenSource
    $bitmap = $null
    $graphics = $null

    try {
        Write-Host "[*] Conectando a $wsUrl..." -ForegroundColor Cyan
        $uri = New-Object System.Uri($wsUrl)
        $connectTask = $client.ConnectAsync($uri, $cts.Token)
        $connectTask.Wait(6000)

        if ($client.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
            Write-Host "  [+] ¡ENLACE FARMADESK ESTABLECIDO CON ÉXITO!" -ForegroundColor Green
            Write-Host "  [+] Transmitiendo pantalla real de Windows a 20 FPS..." -ForegroundColor Green
            Write-Host "  [+] Control bidireccional activo: ratón, teclado y comandos especiales." -ForegroundColor Green

            $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

            # Iniciar escucha de comandos del administrador en segundo plano (clics, ratón, teclado)
            $delegate = [System.Threading.WaitCallback] {
                param($state)
                $cl = $state.client
                $bd = $state.bounds
                $buf = New-Object System.Byte[] 8192
                $seg = New-Object System.ArraySegment[byte] -ArgumentList @($buf, 0, $buf.Length)
                
                try {
                    while ($cl.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
                        $receiveTask = $cl.ReceiveAsync($seg, [System.Threading.CancellationToken]::None)
                        $receiveTask.Wait()
                        $result = $receiveTask.Result
                        
                        if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
                            break
                        }
                        
                        $msgBytes = $buf[0..($result.Count - 1)]
                        $msgStr = [System.Text.Encoding]::UTF8.GetString($msgBytes)
                        
                        if ($msgStr) {
                            try {
                                $payload = $msgStr | ConvertFrom-Json
                                if ($payload.event -eq "farmadesk:agent:input") {
                                    $inputData = $payload.data
                                    
                                    # 1. Posicionar cursor si vienen coordenadas
                                    if ($null -ne $inputData.x -and $null -ne $inputData.y) {
                                        $absX = [int]($inputData.x * $bd.Width)
                                        $absY = [int]($inputData.y * $bd.Height)
                                        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($absX, $absY)
                                    }
                                    
                                    # 2. Control de Ratón
                                    if ($inputData.type -eq "click" -or $inputData.type -eq "leftclick") {
                                        [Win32Functions.WinInput]::mouse_event(0x0002, 0, 0, 0, 0) # Left Down
                                        [Win32Functions.WinInput]::mouse_event(0x0004, 0, 0, 0, 0) # Left Up
                                    } elseif ($inputData.type -eq "rightclick") {
                                        [Win32Functions.WinInput]::mouse_event(0x0008, 0, 0, 0, 0) # Right Down
                                        [Win32Functions.WinInput]::mouse_event(0x0010, 0, 0, 0, 0) # Right Up
                                    } elseif ($inputData.type -eq "doubleclick") {
                                        [Win32Functions.WinInput]::mouse_event(0x0002, 0, 0, 0, 0)
                                        [Win32Functions.WinInput]::mouse_event(0x0004, 0, 0, 0, 0)
                                        Start-Sleep -Milliseconds 50
                                        [Win32Functions.WinInput]::mouse_event(0x0002, 0, 0, 0, 0)
                                        [Win32Functions.WinInput]::mouse_event(0x0004, 0, 0, 0, 0)
                                    } elseif ($inputData.type -eq "mousedown") {
                                        if ($inputData.button -eq 2) {
                                            [Win32Functions.WinInput]::mouse_event(0x0008, 0, 0, 0, 0)
                                        } else {
                                            [Win32Functions.WinInput]::mouse_event(0x0002, 0, 0, 0, 0)
                                        }
                                    } elseif ($inputData.type -eq "mouseup") {
                                        if ($inputData.button -eq 2) {
                                            [Win32Functions.WinInput]::mouse_event(0x0010, 0, 0, 0, 0)
                                        } else {
                                            [Win32Functions.WinInput]::mouse_event(0x0004, 0, 0, 0, 0)
                                        }
                                    } elseif ($inputData.type -eq "scroll") {
                                        $delta = if ($null -ne $inputData.deltaY) { [int](-$inputData.deltaY * 120) } else { 120 }
                                        [Win32Functions.WinInput]::mouse_event(0x0800, 0, 0, $delta, 0)
                                    }
                                    
                                    # 3. Control de Teclado y Texto
                                    elseif ($inputData.type -eq "text" -and $null -ne $inputData.text) {
                                        [System.Windows.Forms.SendKeys]::SendWait($inputData.text)
                                    } elseif ($inputData.type -eq "keydown" -or $inputData.type -eq "key") {
                                        $key = $inputData.key
                                        if ($key -eq "Enter") { [System.Windows.Forms.SendKeys]::SendWait("{ENTER}") }
                                        elseif ($key -eq "Backspace") { [System.Windows.Forms.SendKeys]::SendWait("{BACKSPACE}") }
                                        elseif ($key -eq "Tab") { [System.Windows.Forms.SendKeys]::SendWait("{TAB}") }
                                        elseif ($key -eq "Escape") { [System.Windows.Forms.SendKeys]::SendWait("{ESC}") }
                                        elseif ($key -eq "Delete") { [System.Windows.Forms.SendKeys]::SendWait("{DEL}") }
                                        elseif ($key -eq "ArrowUp") { [System.Windows.Forms.SendKeys]::SendWait("{UP}") }
                                        elseif ($key -eq "ArrowDown") { [System.Windows.Forms.SendKeys]::SendWait("{DOWN}") }
                                        elseif ($key -eq "ArrowLeft") { [System.Windows.Forms.SendKeys]::SendWait("{LEFT}") }
                                        elseif ($key -eq "ArrowRight") { [System.Windows.Forms.SendKeys]::SendWait("{RIGHT}") }
                                        elseif ($key.Length -eq 1) { [System.Windows.Forms.SendKeys]::SendWait($key) }
                                    }
                                    
                                    # 4. Combinaciones Especiales de Windows
                                    elseif ($inputData.type -eq "special_action") {
                                        if ($inputData.action -eq "win_r") {
                                            [Win32Functions.WinInput]::keybd_event(0x5B, 0, 0, 0) # Win Down
                                            [Win32Functions.WinInput]::keybd_event(0x52, 0, 0, 0) # R Down
                                            [Win32Functions.WinInput]::keybd_event(0x52, 0, 2, 0) # R Up
                                            [Win32Functions.WinInput]::keybd_event(0x5B, 0, 2, 0) # Win Up
                                        } elseif ($inputData.action -eq "win_d") {
                                            [Win32Functions.WinInput]::keybd_event(0x5B, 0, 0, 0) # Win Down
                                            [Win32Functions.WinInput]::keybd_event(0x44, 0, 0, 0) # D Down
                                            [Win32Functions.WinInput]::keybd_event(0x44, 0, 2, 0) # D Up
                                            [Win32Functions.WinInput]::keybd_event(0x5B, 0, 2, 0) # Win Up
                                        } elseif ($inputData.action -eq "alt_tab") {
                                            [Win32Functions.WinInput]::keybd_event(0x12, 0, 0, 0) # Alt Down
                                            [Win32Functions.WinInput]::keybd_event(0x09, 0, 0, 0) # Tab Down
                                            [Win32Functions.WinInput]::keybd_event(0x09, 0, 2, 0) # Tab Up
                                            [Win32Functions.WinInput]::keybd_event(0x12, 0, 2, 0) # Alt Up
                                        } elseif ($inputData.action -eq "lock") {
                                            [Win32Functions.WinInput]::LockWorkStation()
                                        }
                                    }
                                }
                            } catch {}
                        }
                    }
                } catch {}
            }
            
            $stateObj = New-Object PSObject -Property @{ client = $client; bounds = $bounds }
            [System.Threading.ThreadPool]::QueueUserWorkItem($delegate, $stateObj) | Out-Null

            # Bucle de captura y transmisión de frames
            while ($client.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
                $graphics.CopyFromScreen($bounds.Left, $bounds.Top, 0, 0, $bounds.Size)
                
                # Redimensionar para rendimiento óptimo
                $scaledBmp = New-Object System.Drawing.Bitmap $width, $height
                $scaledG = [System.Drawing.Graphics]::FromImage($scaledBmp)
                $scaledG.DrawImage($bitmap, 0, 0, $width, $height)

                $ms = New-Object System.IO.MemoryStream
                $scaledBmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Jpeg)
                $bytes = $ms.ToArray()
                $base64 = [Convert]::ToBase64String($bytes)
                $ms.Dispose()
                $scaledG.Dispose()
                $scaledBmp.Dispose()

                $payload = @{
                    event = "farmadesk:agent:frame"
                    data = @{
                        branchId = "${branchId}"
                        frameBase64 = "data:image/jpeg;base64," + $base64
                        width = $width
                        height = $height
                        fps = 20
                        timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                    }
                } | ConvertTo-Json -Compress

                $sendBytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
                $segment = New-Object System.ArraySegment[byte] -ArgumentList @($sendBytes, 0, $sendBytes.Length)
                $sendTask = $client.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token)
                $sendTask.Wait(500)

                Start-Sleep -Milliseconds 50 # ~20 FPS fluido
            }
        } else {
            Write-Host "  [-] No se pudo conectar al servidor central ($wsUrl)." -ForegroundColor Red
        }
    }
    catch {
        Write-Host "Aviso del agente FarmaDesk: $_" -ForegroundColor Yellow
    }
    finally {
        if ($graphics) { $graphics.Dispose() }
        if ($bitmap) { $bitmap.Dispose() }
        if ($client) { try { $client.Dispose() } catch {} }
    }

    Write-Host "[!] Reintentando en 5 segundos... (Ctrl+C para salir)" -ForegroundColor DarkYellow
    Start-Sleep -Seconds 5
}
`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="farmadesk-agent-${branchId}.ps1"`);
    res.send(ps1Script);
  });

  app.get('/api/farmadesk/script/agent.py', (req, res) => {
    const branchId = (req.query.branchId as string) || 'suc-001';
    const host = req.headers.host || `localhost:${PORT}`;
    const wsProtocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${host}/ws?type=farmadesk-agent&branchId=${branchId}&agentKey=${agentKeyFor(branchId)}`;

    const pyScript = `# ==============================================================================
# FARMADESK® AGENT MULTIPLATAFORMA (PYTHON 3)
# Transmisor de pantalla real para Windows, Linux y macOS con control bidireccional
# ==============================================================================
import asyncio
import websockets
import json
import base64
import time
import io
import os

try:
    from PIL import ImageGrab
except ImportError:
    print("Instale Pillow: pip install pillow websockets")
    exit(1)

WS_URL = "${wsUrl}"
BRANCH_ID = "${branchId}"

async def send_frames(ws):
    print("🎥 Iniciando transmisión de pantalla...")
    while True:
        try:
            img = ImageGrab.grab()
            img.thumbnail((1280, 720))
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=65)
            base64_img = base64.b64encode(buffer.getvalue()).decode('utf-8')

            msg = {
                "event": "farmadesk:agent:frame",
                "data": {
                    "branchId": BRANCH_ID,
                    "frameBase64": f"data:image/jpeg;base64,{base64_img}",
                    "width": 1280,
                    "height": 720,
                    "fps": 15,
                    "timestamp": int(time.time() * 1000)
                }
            }
            await ws.send(json.dumps(msg))
            await asyncio.sleep(0.066) # ~15 FPS
        except Exception as e:
            print(f"Error en emisor de frames: {e}")
            break

async def receive_inputs(ws):
    print("🖱️ Canal de recepción de clics y movimientos activo...")
    try:
        import ctypes
        is_windows = os.name == 'nt'
    except ImportError:
        is_windows = False

    try:
        async for message in ws:
            try:
                payload = json.loads(message)
                if payload.get("event") == "farmadesk:agent:input":
                    data = payload.get("data", {})
                    if is_windows:
                        width = ctypes.windll.user32.GetSystemMetrics(0)
                        height = ctypes.windll.user32.GetSystemMetrics(1)
                        abs_x = int(data.get("x", 0) * width)
                        abs_y = int(data.get("y", 0) * height)
                        
                        ctypes.windll.user32.SetCursorPos(abs_x, abs_y)
                        if data.get("type") == "click":
                            ctypes.windll.user32.mouse_event(2, 0, 0, 0, 0) # Left Down
                            ctypes.windll.user32.mouse_event(4, 0, 0, 0, 0) # Left Up
                        elif data.get("type") == "mousedown":
                            ctypes.windll.user32.mouse_event(2, 0, 0, 0, 0)
                        elif data.get("type") == "mouseup":
                            ctypes.windll.user32.mouse_event(4, 0, 0, 0, 0)
            except Exception as e:
                pass
    except Exception as e:
        print(f"Error en canal de comandos: {e}")

async def run_farmadesk():
    print(f"🐺 Iniciando Agente FarmaDesk para {BRANCH_ID}...")
    print(f"Conectando a {WS_URL}...")
    async with websockets.connect(WS_URL) as ws:
        print("✅ Enlace activo. Transmitiendo escritorio real de la PC con control interactivo...")
        await asyncio.gather(
            send_frames(ws),
            receive_inputs(ws)
        )

if __name__ == '__main__':
    try:
        asyncio.run(run_farmadesk())
    except KeyboardInterrupt:
        print("\nAgente FarmaDesk detenido.")
`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="farmadesk-agent-${branchId}.py"`);
    res.send(pyScript);
  });

  // ==========================================
  // FARMADESK® REMOTE DESKTOP ENGINE
  // ==========================================
  const accessCodesStore = new Map<string, { code: string; branchId: string; branchName?: string; expiresAt: number; createdAt: number }>();
  const permanentPinsStore = new Map<string, string>(); // branchId -> PIN

  // 1. Generar Código de Asistencia Remota (6 dígitos temporales estilo Chrome Remote Desktop)
  // Llave del agente de control remoto de una sede (para armar el comando de instalación)
  app.get('/api/farmadesk/agent-key', requirePermission('canViewVncRemoteDesktop', 'canManageBranchLocations'), (req, res) => {
    const branchId = (req.query.branchId as string) || 'suc-001';
    res.json({ success: true, branchId, agentKey: agentKeyFor(branchId) });
  });

  app.post('/api/farmadesk/access-code/generate', (req, res) => {
    const { branchId, branchName } = req.body;
    const targetBranchId = branchId || 'branch-01';
    
    // Generar código de 6 dígitos con formato 123-456
    const num = Math.floor(100000 + Math.random() * 900000);
    const code = `${num}`.replace(/(\d{3})(\d{3})/, '$1-$2');
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutos de vigencia

    accessCodesStore.set(code, {
      code,
      branchId: targetBranchId,
      branchName: branchName || 'Sede Remota',
      expiresAt,
      createdAt: Date.now()
    });

    res.json({
      success: true,
      code,
      branchId: targetBranchId,
      expiresAt,
      validSeconds: 300
    });
  });

  // 2. Verificar Código de Asistencia Remota
  app.post('/api/farmadesk/access-code/verify', limitPin, (req, res) => {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Código requerido' });
    }

    const cleanCode = code.toString().trim();
    const entry = accessCodesStore.get(cleanCode);

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Código de acceso no válido o ya expirado.' });
    }

    if (Date.now() > entry.expiresAt) {
      accessCodesStore.delete(cleanCode);
      return res.status(410).json({ success: false, message: 'El código de acceso ha expirado. Genere uno nuevo.' });
    }

    res.json({
      success: true,
      branchId: entry.branchId,
      branchName: entry.branchName,
      message: 'Código de acceso verificado con éxito.'
    });
  });

  // 3. Verificar PIN de Seguridad para Acceso Permanente (Mis Equipos)
  app.post('/api/farmadesk/pin/verify', limitPin, (req, res) => {
    const { branchId, pin } = req.body;
    const targetBranchId = branchId || 'branch-01';
    const cleanPin = pin ? pin.toString().trim() : '';
    const storedPin = permanentPinsStore.get(targetBranchId);

    if (storedPin && cleanPin === storedPin) {
      return res.json({
        success: true,
        branchId: targetBranchId,
        message: 'PIN correcto. Acceso remoto concedido.'
      });
    }

    res.status(401).json({
      success: false,
      message: 'PIN de seguridad incorrecto. Intente nuevamente.'
    });
  });

  // 4. Configurar nuevo PIN de Seguridad
  app.post('/api/farmadesk/pin/set', (req, res) => {
    const { branchId, pin } = req.body;
    const targetBranchId = branchId || 'branch-01';
    if (!pin || pin.toString().trim().length < 4) {
      return res.status(400).json({ success: false, message: 'El PIN debe tener al menos 4 a 6 dígitos.' });
    }

    permanentPinsStore.set(targetBranchId, pin.toString().trim());
    res.json({
      success: true,
      branchId: targetBranchId,
      message: 'PIN de acceso remoto actualizado con éxito.'
    });
  });

  // DOWNLOADABLE .BAT INSTALLERS FOR BRANCH COMPUTERS
  app.get(['/api/farmadesk/download/farmadesk.exe', '/farmadesk.exe'], (_req, res) => {
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'farmadesk.exe'),
      path.join(process.cwd(), 'farmadesk.exe'),
      path.join('C:', 'Users', 'sun_d', '.gemini', 'antigravity', 'scratch', 'remote-desktop', 'farmadesk.exe')
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
        res.setHeader('Content-Disposition', 'attachment; filename="farmadesk.exe"');
        return res.sendFile(path.resolve(p));
      }
    }
    return res.status(404).send('Binario nativo farmadesk.exe no encontrado');
  });

  app.get(['/api/farmadesk/download/Iniciar-FarmaDesk.bat', '/api/farmadesk/download/Iniciar_FarmaDesk.bat', '/api/farmadesk/download/iniciar-farmadesk.bat'], (req, res) => {
    const branchId = (req.query.branchId as string) || 'branch-01';
    const filePath = fs.existsSync(path.join(process.cwd(), 'public', 'Iniciar-FarmaDesk.bat')) ? path.join(process.cwd(), 'public', 'Iniciar-FarmaDesk.bat') : path.join(process.cwd(), 'Iniciar-FarmaDesk.bat');
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      content = content.replace(/set BRANCH_ID=branch-01/g, `set BRANCH_ID=${branchId}`);
      res.setHeader('Content-Type', 'application/x-bat; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Iniciar-FarmaDesk-${branchId}.bat"`);
      return res.send(content);
    }
    res.status(404).send('Archivo Iniciar-FarmaDesk.bat no encontrado');
  });

  app.get('/api/farmadesk/download/INSTALAR_FARMADESK_REMOTO.bat', (req, res) => {
    const branchId = (req.query.branchId as string) || 'branch-01';
    const host = req.headers.host || `localhost:7777`;
    const serverUrl = `${req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'}://${host}`;
    
    const filePath = path.join(process.cwd(), 'INSTALAR_FARMADESK_REMOTO.bat');
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      content = content.replace(/set "DEFAULT_SERVER=http:\/\/localhost:7777"/g, `set "DEFAULT_SERVER=${serverUrl}"`);
      content = content.replace(/set "DEFAULT_SERVER=http:\/\/localhost:3000"/g, `set "DEFAULT_SERVER=${serverUrl}"`);
      content = content.replace(/set "BRANCH_ID=branch-01"/g, `set "BRANCH_ID=${branchId}"`);
      res.setHeader('Content-Type', 'application/x-bat; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="INSTALAR_FARMADESK_REMOTO_${branchId}.bat"`);
      return res.send(content);
    }
    res.status(404).send('Template no encontrado');
  });

  app.get('/api/farmadesk/download/INICIAR_FARMADESK_AGENTE.bat', (req, res) => {
    const branchId = (req.query.branchId as string) || 'branch-01';
    const filePath = path.join(process.cwd(), 'INICIAR_FARMADESK_AGENTE.bat');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'application/x-bat; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="INICIAR_FARMADESK_AGENTE_${branchId}.bat"`);
      return res.send(content);
    }
    res.status(404).send('Archivo no encontrado');
  });

  app.get('/api/farmadesk/download/CONFIGURAR_SERVIDOR_CENTRAL_RED.bat', (_req, res) => {
    const filePath = path.join(process.cwd(), 'CONFIGURAR_SERVIDOR_CENTRAL_RED.bat');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'application/x-bat; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="CONFIGURAR_SERVIDOR_CENTRAL_RED.bat"');
      return res.send(content);
    }
    res.status(404).send('Archivo no encontrado');
  });

  app.get('/api/farmadesk/download/INICIAR_PARQUEADERO.bat', (_req, res) => {
    const filePath = path.join(process.cwd(), 'INICIAR_PARQUEADERO.bat');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'application/x-bat; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="INICIAR_PARQUEADERO.bat"');
      return res.send(content);
    }
    res.status(404).send('Archivo no encontrado');
  });

  app.get('/api/farmadesk/download/INSTALAR_SISTEMA_NUEVO.bat', (_req, res) => {
    const filePath = path.join(process.cwd(), 'INSTALAR_SISTEMA_NUEVO.bat');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'application/x-bat; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="INSTALAR_SISTEMA_NUEVO.bat"');
      return res.send(content);
    }
    res.status(404).send('Archivo no encontrado');
  });

  app.get('/api/farmadesk/download/ACTUALIZAR_SISTEMA.bat', (_req, res) => {
    const filePath = path.join(process.cwd(), 'ACTUALIZAR_SISTEMA.bat');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'application/x-bat; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="ACTUALIZAR_SISTEMA.bat"');
      return res.send(content);
    }
    res.status(404).send('Archivo no encontrado');
  });

  app.get('/api/farmadesk/download/instalar_servicio_windows.bat', (_req, res) => {
    const filePath = path.join(process.cwd(), 'farmadesk-agent', 'instalar_servicio_windows.bat');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'application/x-bat; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="instalar_servicio_windows.bat"');
      return res.send(content);
    }
    res.status(404).send('Archivo no encontrado');
  });

}
