/**
 * Servidor WebSocket (/ws y /api/ws): sedes, paneles de administración y agentes FarmaDesk.
 * Un solo hub atiende los upgrades de todos los servidores HTTP (LAN, WAN 3001 y FarmaDesk 9050).
 */
import path from 'path';
import fs from 'fs';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import {
  clientIp,
  authorizeWsRequest,
  rejectWsUpgrade,
  type WsAuthResult,
} from './auth.ts';

export interface WsHubDeps {
  extractClientIp: (req: any) => string;
  loadAndValidateBranchesTelemetry: () => Record<string, any>;
  saveBranchesTelemetry: (telemetryMap: Record<string, any>) => boolean;
}

export function createWsHub(deps: WsHubDeps) {
  const { extractClientIp, loadAndValidateBranchesTelemetry, saveBranchesTelemetry } = deps;
  const wss = new WebSocketServer({ noServer: true });

  /** Autoriza y acepta upgrades en '/api/ws' o '/ws'; cualquier otra ruta se ignora. */
  function handleUpgrade(request: http.IncomingMessage, socket: any, head: Buffer) {
    try {
      const urlObj = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      const pathname = urlObj.pathname;
      if (pathname === '/api/ws' || pathname === '/ws') {
        const wsAuth = authorizeWsRequest(request);
        if (!wsAuth.ok) {
          console.warn(`[WebSocket RECHAZADO] ${clientIp(request as any)} → ${wsAuth.reason}`);
          rejectWsUpgrade(socket, wsAuth.reason);
          return;
        }
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request, wsAuth);
        });
      }
    } catch (e) {
      // Dejar que otros listeners o el cierre HTTP por defecto se encarguen
    }
  }

  // Client socket registry
  interface RegisteredClient {
    id: string;
    type: 'branch' | 'admin' | 'farmadesk-agent';
    branchId: string;
    ws: WebSocket;
  }
  const connectedClients = new Map<string, RegisteredClient>();

  // WebSocket connection handler
  // Eventos que mueven el mouse/teclado o ejecutan acciones en una sede: solo conexiones de confianza
  const WS_CONTROL_EVENTS = new Set(['farmadesk:admin:input', 'admin:control:action', 'farmadesk:remote-key:send']);

  wss.on('connection', (ws: WebSocket, request, wsAuth?: WsAuthResult) => {
    const wsTrusted = wsAuth?.trusted === true;
    let type = 'branch';
    let branchId = 'suc-001';
    const wsClientIp = extractClientIp(request);

    try {
      const urlObj = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      type = (urlObj.searchParams.get('type') || 'branch') as any;
      const rawBranchId = urlObj.searchParams.get('branchId') || 'suc-001';
      branchId = rawBranchId === 'branch-01' ? 'suc-001' : rawBranchId;
    } catch (e) {
      // fallback if parsing URL fails
    }

    const clientId = `${type}-${branchId}-${Math.random().toString(36).substring(2, 7)}`;
    connectedClients.set(clientId, { id: clientId, type: type as any, branchId, ws });

    console.log(`[WebSocket CONECTADO] Sede: ${branchId} | Tipo: ${type} | IP: ${wsClientIp} | ID Sesión: ${clientId}`);

    // If real local PC agent connects
    if (type === 'farmadesk-agent') {
      broadcastToAdmins(branchId, {
        event: 'farmadesk:agent:status',
        data: { branchId, status: 'online', publicIp: wsClientIp, timestamp: new Date().toISOString() }
      });
    } else if (type === 'branch') {
      broadcastToAdmins(branchId, {
        event: 'branch:status_change',
        data: { branchId, status: 'online', publicIp: wsClientIp, timestamp: new Date().toISOString() }
      });
    }

    ws.on('message', (messageStr) => {
      try {
        const payload = JSON.parse(messageStr.toString());
        const { event, data } = payload;

        if (WS_CONTROL_EVENTS.has(event) && !wsTrusted) {
          console.warn(`[WebSocket] Evento de control '${event}' bloqueado desde conexión sin credenciales (${clientId})`);
          return;
        }

        // FARMADESK: Frame de pantalla real enviado por el Agente instalado en la PC
        if (event === 'farmadesk:agent:frame') {
          broadcastToAdmins(branchId, {
            event: 'farmadesk:screen:frame',
            data
          });
        }

        // FARMADESK: Eventos de interacción del Admin (Clics, Ratón, Teclado) hacia el Agente PC
        else if (event === 'farmadesk:admin:input') {
          forwardToAgent(branchId, {
            event: 'farmadesk:agent:input',
            data
          });
        }

        // 1. branch:network_info -> Branch reports dynamic local network IP details to Central via WS
        if (event === 'branch:network_info') {
          const telemetryMap = loadAndValidateBranchesTelemetry();
          const existing = telemetryMap[branchId] || {};
          const resolvedWsIp = (wsClientIp && wsClientIp !== '127.0.0.1') 
            ? wsClientIp 
            : (data.publicIp || data.ipAddress || existing.publicIp || wsClientIp);

          const resolvedDomain = data.domain || data.ddnsDomain;

          telemetryMap[branchId] = {
            ...existing,
            ...data,
            id: branchId,
            publicIp: resolvedWsIp,
            reportedPublicIp: resolvedWsIp,
            domain: resolvedDomain || existing.domain,
            ddnsDomain: resolvedDomain || existing.ddnsDomain,
            localIp: data.ipAddress || existing.localIp,
            lastIpReportedAt: new Date().toISOString(),
            lastReportedAt: new Date().toISOString(),
            status: 'online',
            wsConnected: true
          };

          saveBranchesTelemetry(telemetryMap);
          console.log(`[WS Telemetría] Red recibida para Sede ${branchId}: IP Pública=${resolvedWsIp}, Local=${data.ipAddress}, SystemUrl=${data.systemUrl}`);

          // Overwrite IP dynamically in global-config.json for persistence
          const configPath = path.join(process.cwd(), 'global-config.json');
          if (fs.existsSync(configPath)) {
            try {
              const fileContent = fs.readFileSync(configPath, 'utf8');
              const gConfig = JSON.parse(fileContent);
              if (gConfig && Array.isArray(gConfig.branches)) {
                gConfig.branches = gConfig.branches.map((b: any) => {
                  const isMatch = b.id === branchId || 
                    (data.code && b.code?.toUpperCase() === data.code?.toUpperCase()) ||
                    (data.branchCode && b.code?.toUpperCase() === data.branchCode?.toUpperCase()) ||
                    b.code?.toUpperCase() === branchId?.toUpperCase();
                  if (isMatch) {
                    return {
                      ...b,
                      ipAddress: resolvedDomain || resolvedWsIp,
                      publicIp: resolvedWsIp,
                      reportedPublicIp: resolvedWsIp,
                      domain: resolvedDomain || b.domain,
                      ddnsDomain: resolvedDomain || b.ddnsDomain,
                      localIp: data.ipAddress || b.localIp,
                      farmadeskId: data.farmadeskId || b.farmadeskId || data.anydeskId || b.anydeskId,
                      farmadeskPassword: data.farmadeskPassword || b.farmadeskPassword || data.vncPassword || b.vncPassword,
                      farmadeskPort: 9050,
                      anydeskId: data.anydeskId || b.anydeskId,
                      rustdeskId: data.rustdeskId || b.rustdeskId,
                      vncPassword: data.vncPassword || b.vncPassword,
                      status: 'online',
                      lastSyncTimestamp: new Date().toISOString()
                    };
                  }
                  return b;
                });
                fs.writeFileSync(configPath, JSON.stringify(gConfig, null, 2), 'utf8');
                console.log(`[WS Telemetría] IP de Sede ${branchId} guardada persistentemente en global-config.json.`);
              }
            } catch (err) {
              console.error('[WS Telemetría] Error actualizando global-config.json:', err);
            }
          }

          // Broadcast to connected admins
          broadcastToAdmins(branchId, {
            event: 'branch:network_updated',
            data: telemetryMap[branchId]
          });
        }

        // 2. admin:control:action -> Admin sends remote command/keystroke/click to branch
        else if (event === 'admin:control:action') {
          console.log(`[WS Admin Acción] Remitiendo interacción a Sede ${branchId}:`, data.actionType);
          forwardToBranch(branchId, {
            event: 'branch:control:action_received',
            data
          });
        }

        // 3. branch:control:screen_update -> Branch replies with updated state or virtual screenshot
        else if (event === 'branch:control:screen_update') {
          broadcastToAdmins(branchId, {
            event: 'admin:control:screen_updated',
            data
          });
        }

        // 4. chat:message -> Real-time technical support chat
        else if (event === 'chat:message') {
          if (type === 'admin') {
            forwardToBranch(branchId, { event: 'chat:message_received', data });
          } else {
            broadcastToAdmins(branchId, { event: 'chat:message_received', data });
          }
        }

        // 5. webrtc:offer, webrtc:answer, webrtc:ice-candidate -> WebRTC P2P Signaling (Chrome Remote Desktop)
        else if (event === 'webrtc:offer' || event === 'webrtc:answer' || event === 'webrtc:ice-candidate') {
          if (type === 'admin') {
            forwardToBranch(branchId, { event, data });
            forwardToAgent(branchId, { event, data });
          } else {
            broadcastToAdmins(branchId, { event, data });
          }
        }

        // 6. farmadesk:clipboard:sync -> Bidirectional clipboard copy/paste sync
        else if (event === 'farmadesk:clipboard:sync') {
          if (type === 'admin') {
            forwardToBranch(branchId, { event: 'farmadesk:clipboard:received', data });
            forwardToAgent(branchId, { event: 'farmadesk:agent:input', data: { type: 'text', text: data.text } });
          } else {
            broadcastToAdmins(branchId, { event: 'farmadesk:clipboard:received', data });
          }
        }

        // 7. farmadesk:remote-key:send -> Send special keystrokes
        else if (event === 'farmadesk:remote-key:send') {
          forwardToAgent(branchId, { event: 'farmadesk:agent:input', data });
          forwardToBranch(branchId, { event: 'branch:control:action_received', data });
        }

        // 8. ping / link:ping -> Keep alive & real-time latency ping-pong
        else if (event === 'ping' || event === 'link:ping') {
          ws.send(JSON.stringify({
            event: 'pong',
            data: {
              time: Date.now(),
              clientTimestamp: data?.timestamp || data?.time || Date.now(),
              pingId: data?.pingId
            }
          }));
        }

      } catch (err: any) {
        console.error('[WS Error en Mensaje]', err.message);
      }
    });

    ws.on('close', () => {
      connectedClients.delete(clientId);
      console.log(`[WebSocket DESCONECTADO] Sesión terminada: ${clientId}`);

      if (type === 'farmadesk-agent') {
        broadcastToAdmins(branchId, {
          event: 'farmadesk:agent:status',
          data: { branchId, status: 'offline', timestamp: new Date().toISOString() }
        });
      } else if (type === 'branch') {
        // Notify admins that branch connection went offline
        broadcastToAdmins(branchId, {
          event: 'branch:status_change',
          data: { branchId, status: 'offline', timestamp: new Date().toISOString() }
        });
      }
    });
  });

  // Helper: Broadcast to admins looking at a specific branch
  function broadcastToAdmins(branchId: string, payload: any) {
    const msg = JSON.stringify(payload);
    connectedClients.forEach(client => {
      if (client.type === 'admin' && client.branchId === branchId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(msg);
      }
    });
  }

  // Helper: Forward a message to the active branch socket
  function forwardToBranch(branchId: string, payload: any) {
    const msg = JSON.stringify(payload);
    connectedClients.forEach(client => {
      if (client.type === 'branch' && client.branchId === branchId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(msg);
      }
    });
  }

  // Helper: Forward input interaction to the real FarmaDesk Pro desktop agent
  function forwardToAgent(branchId: string, payload: any) {
    const msg = JSON.stringify(payload);
    connectedClients.forEach(client => {
      if (client.type === 'farmadesk-agent' && client.branchId === branchId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(msg);
      }
    });
  }

  return { handleUpgrade, broadcastToAdmins };
}
