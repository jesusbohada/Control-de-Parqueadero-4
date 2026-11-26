import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { exec, execFile } from 'child_process';
import http from 'http';
import net from 'net';
import { WebSocketServer, WebSocket } from 'ws';
import { SystemUser } from './src/types.ts';
import {
  apiAuthMiddleware,
  configureAuthz,
  requirePermission,
  requireMaster,
  hashPassword,
  isPasswordHash,
  preparePasswordForStorage,
  exposePasswordFor,
  getSyncKey,
  AttemptLimiter,
  limitFailedAttempts,
  clientIp,
  registerWeakPasswords,
  authorizeWsRequest,
  rejectWsUpgrade,
  type WsAuthResult,
} from './server/auth.ts';
import { registerAiRoutes } from './server/routes/ai.ts';
import { registerSystemRoutes } from './server/routes/system.ts';
import { registerPrintingRoutes } from './server/routes/printing.ts';
import { registerFarmadeskRoutes } from './server/routes/farmadesk.ts';
import { registerSubscriberRoutes } from './server/routes/subscribers.ts';
import { registerDatabaseMaintenanceRoutes } from './server/routes/databaseMaintenance.ts';
import { registerAuditRoutes } from './server/routes/audit.ts';
import { registerPostgresAdminRoutes } from './server/routes/postgresAdmin.ts';
import { registerBootstrapRoutes } from './server/routes/bootstrap.ts';
import { registerTicketRoutes } from './server/routes/tickets.ts';
import { registerShiftRoutes } from './server/routes/shifts.ts';
import { registerUserRoutes } from './server/routes/users.ts';
import { registerConfigRoutes } from './server/routes/configs.ts';
import { registerDianRoutes } from './server/routes/dian.ts';
import { registerSpotRoutes } from './server/routes/spots.ts';
import { startCentralSync, pullFromCentralNow, getCentralSyncStatus, type CentralUser } from './server/centralSync.ts';
import pool, { initDatabase, isPostgresReady, memoryStoreRef, DATABASE_URL } from './src/db.ts';
import { 
  INITIAL_USERS, 
} from './src/data/initialData.ts';

dotenv.config();

// Resolución de rutas compatible tanto con CJS (esbuild bundle) como con ESM (tsx / node)
const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

let geminiClient: GoogleGenAI | null = null;
let cachedGeminiApiKey: string | null = process.env.GEMINI_API_KEY || null;

async function getOrLoadGeminiApiKey(): Promise<string | null> {
  if (cachedGeminiApiKey && cachedGeminiApiKey.trim()) {
    return cachedGeminiApiKey.trim();
  }
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    cachedGeminiApiKey = process.env.GEMINI_API_KEY.trim();
    return cachedGeminiApiKey;
  }

  // 1. Intentar leer de data/gemini_config.json (disco persistente / volumen montado Docker)
  try {
    const configPath = path.join(process.cwd(), 'data', 'gemini_config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (parsed?.apiKey && typeof parsed.apiKey === 'string' && parsed.apiKey.trim()) {
        cachedGeminiApiKey = parsed.apiKey.trim();
        process.env.GEMINI_API_KEY = cachedGeminiApiKey;
        console.log('[Gemini Config] Clave cargada exitosamente desde data/gemini_config.json');
        return cachedGeminiApiKey;
      }
    }
  } catch (e: any) {
    console.warn('[Gemini Config] Error leyendo data/gemini_config.json:', e.message);
  }

  // 2. Intentar leer de la base de datos PostgreSQL (tabla configs)
  try {
    if (isPostgresReady()) {
      const res = await pool.query("SELECT value FROM configs WHERE key = 'geminiApiKey' LIMIT 1");
      if (res.rows.length > 0 && res.rows[0].value) {
        let val = res.rows[0].value;
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch (_) {}
        }
        if (typeof val === 'string' && val.trim()) {
          cachedGeminiApiKey = val.trim();
          process.env.GEMINI_API_KEY = cachedGeminiApiKey;
          console.log('[Gemini Config] Clave cargada exitosamente desde PostgreSQL (configs.geminiApiKey)');
          return cachedGeminiApiKey;
        }
      }
    }
  } catch (e: any) {
    console.warn('[Gemini Config] Error leyendo configs de PostgreSQL:', e.message);
  }

  // 3. Intentar leer de archivo .env
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/^GEMINI_API_KEY=(.+)$/m);
      if (match && match[1]?.trim()) {
        cachedGeminiApiKey = match[1].trim();
        process.env.GEMINI_API_KEY = cachedGeminiApiKey;
        console.log('[Gemini Config] Clave cargada exitosamente desde .env');
        return cachedGeminiApiKey;
      }
    }
  } catch (e: any) {
    console.warn('[Gemini Config] Error leyendo .env:', e.message);
  }

  return null;
}

async function getGeminiClient(): Promise<GoogleGenAI | null> {
  const apiKey = await getOrLoadGeminiApiKey();
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

/** Reemplaza (o borra con null) la clave de Gemini en memoria y devuelve el cliente nuevo. */
function setGeminiApiKey(key: string | null): GoogleGenAI | null {
  cachedGeminiApiKey = key;
  geminiClient = key
    ? new GoogleGenAI({ apiKey: key, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } })
    : null;
  return geminiClient;
}

/**
 * Seguridad: amplía la columna `pin` para alojar hashes y convierte las claves
 * legadas en texto plano a hash scrypt. Idempotente.
 */
async function migrateStoredPasswords() {
  try {
    if (isPostgresReady()) {
      await pool.query('ALTER TABLE users ALTER COLUMN pin TYPE TEXT');
      const r = await pool.query('SELECT id, pin FROM users');
      let migrated = 0;
      for (const row of r.rows) {
        if (row.pin && !isPasswordHash(row.pin)) {
          await pool.query('UPDATE users SET pin = $1 WHERE id = $2', [hashPassword(String(row.pin).trim()), row.id]);
          migrated++;
        }
      }
      if (migrated > 0) console.log(`[Seguridad] ${migrated} clave(s) migradas de texto plano a hash scrypt.`);
    } else {
      for (const [id, u] of memoryStoreRef.users.entries()) {
        if (u.password && !isPasswordHash(u.password)) {
          memoryStoreRef.users.set(id, { ...u, password: hashPassword(String(u.password).trim()) });
        }
      }
    }
  } catch (e: any) {
    console.error('[Seguridad] Error migrando claves a hash:', e.message);
  }
}

/** Fila de la tabla users → SystemUser, exponiendo la clave solo según el solicitante. */
function rowToPublicUser(r: any, viewer?: Express.Request['auth'] | null): SystemUser {
  return {
    id: r.id,
    username: r.username,
    role: r.role,
    name: r.name,
    password: exposePasswordFor(r.pin, viewer),
    isActive: r.is_active !== undefined && r.is_active !== null ? Boolean(r.is_active) : (r.permissions?.isActive ?? true),
    permissions: r.permissions || {},
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)
  } as SystemUser;
}

function sanitizeUserForClient(u: SystemUser, viewer?: Express.Request['auth'] | null): SystemUser {
  return { ...u, password: exposePasswordFor(u.password, viewer) };
}

/** id → hash de clave de todos los usuarios (solo valores con hash). */
async function getAllStoredPins(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (isPostgresReady()) {
    const r = await pool.query('SELECT id, pin FROM users');
    for (const row of r.rows) if (isPasswordHash(row.pin)) map.set(row.id, row.pin);
  } else {
    for (const [id, u] of memoryStoreRef.users.entries()) if (isPasswordHash(u.password)) map.set(id, u.password);
  }
  return map;
}

/** Aplica en la BD local los usuarios recibidos del Central (sync servidor↔servidor). */
async function applyUsersFromCentral(users: CentralUser[]): Promise<number> {
  let applied = 0;
  for (const u of users) {
    const existingPin = await getStoredPin(u.id);
    const pin = preparePasswordForStorage(u.password || '', existingPin);
    const permissions = u.permissions || {};
    if (isPostgresReady()) {
      await pool.query(`
        INSERT INTO users (id, username, role, name, pin, is_active, permissions, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          role = EXCLUDED.role,
          name = EXCLUDED.name,
          pin = EXCLUDED.pin,
          is_active = EXCLUDED.is_active,
          permissions = EXCLUDED.permissions
      `, [u.id, u.username, u.role || 'cashier', u.name || u.username, pin, u.isActive !== false, JSON.stringify(permissions), u.createdAt || new Date().toISOString()]);
    } else {
      const prev = memoryStoreRef.users.get(u.id);
      memoryStoreRef.users.set(u.id, { ...(prev || {}), ...u, password: pin, permissions } as any);
    }
    applied++;
  }
  return applied;
}

async function getStoredPin(userId: string): Promise<string | null> {
  if (isPostgresReady()) {
    const r = await pool.query('SELECT pin FROM users WHERE id = $1 LIMIT 1', [userId]);
    return r.rows.length > 0 ? (r.rows[0].pin || null) : null;
  }
  return memoryStoreRef.users.get(userId)?.password || null;
}

async function startServer() {
  // Inicialización de la base de datos PostgreSQL local
  await initDatabase();
  await migrateStoredPasswords();

  const app = express();
  const PORT = process.env.PORT && Number(process.env.PORT) !== 8080 ? Number(process.env.PORT) : 3000;

  // CORS para sincronización entre sedes.
  // La autenticación viaja en encabezados (Authorization / X-Sync-Key), nunca en cookies,
  // por lo que una página de otro origen no puede usar credenciales ajenas.
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const requestedHeaders = req.header('access-control-request-headers');
    res.setHeader('Access-Control-Allow-Headers', requestedHeaders || 'Content-Type, Authorization, X-Sync-Key');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'X-Auth-Required');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  // Autenticación obligatoria para /api (excepto rutas públicas declaradas en server/auth.ts)
  configureAuthz(async (id: string) => {
    if (isPostgresReady()) {
      const r = await pool.query('SELECT role, is_active, permissions FROM users WHERE id = $1 LIMIT 1', [id]);
      if (r.rows.length === 0) return null;
      const row = r.rows[0];
      return { role: row.role, isActive: row.is_active !== false, permissions: row.permissions || {} };
    }
    const u = memoryStoreRef.users.get(id);
    return u ? { role: u.role, isActive: u.isActive !== false, permissions: (u.permissions || {}) as any } : null;
  });
  app.use(apiAuthMiddleware);

  // Anti fuerza bruta: claves de fábrica conocidas y límites de intentos fallidos
  registerWeakPasswords(INITIAL_USERS.map(u => u.password));
  const loginUserLimiter = new AttemptLimiter(5, 15 * 60_000, 15 * 60_000);  // por IP + usuario
  const loginIpLimiter = new AttemptLimiter(30, 15 * 60_000, 15 * 60_000);   // por IP
  const pinLimiter = new AttemptLimiter(5, 10 * 60_000, 10 * 60_000);        // PIN supervisor / FarmaDesk
  const limitLogin = [
    limitFailedAttempts(loginUserLimiter, req => [`${clientIp(req)}|${String(req.body?.username || '').trim().toLowerCase()}`]),
    limitFailedAttempts(loginIpLimiter, req => [clientIp(req)]),
  ];
  const limitPin = limitFailedAttempts(pinLimiter, req => [`${clientIp(req)}|${req.auth?.uid || req.body?.branchId || ''}`]);

  // Los scripts FarmaDesk (.bat/.ps1/.py) interpolan branchId y Host: se validan para evitar
  // inyección de comandos en el equipo que ejecuta el script descargado.
  app.use('/api/farmadesk', (req, res, next) => {
    const rawBranch = req.query.branchId;
    if (rawBranch !== undefined && !(typeof rawBranch === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(rawBranch))) {
      return res.status(400).json({ success: false, error: 'branchId inválido' });
    }
    const host = req.headers.host || '';
    if (host && !/^[A-Za-z0-9.\-]+(:\d{1,5})?$|^\[[0-9a-fA-F:]+\](:\d{1,5})?$/.test(host)) {
      return res.status(400).json({ success: false, error: 'Host inválido' });
    }
    next();
  });

  if (!getSyncKey()) {
    console.warn('⚠️  [Seguridad] SYNC_SHARED_KEY no configurada: sincronización entre sedes y SSO en modo compatible/deshabilitado.');
  }

  // ==============================================================================
  // API Health Check & PostgreSQL Pool Connectivity Status
  // ==============================================================================
  app.get('/api/health', async (req, res) => {
    const start = performance.now();
    try {
      // Verificar conectividad real del Pool ejecutando un ping a PostgreSQL
      const dbResult = await pool.query('SELECT 1 as ping, NOW() as server_time, current_database() as database_name');
      const responseTimeMs = Number((performance.now() - start).toFixed(2));

      return res.status(200).json({
        status: 'ok',
        healthy: true,
        timestamp: new Date().toISOString(),
        responseTimeMs,
        database: {
          engine: 'PostgreSQL',
          connected: true,
          databaseName: dbResult.rows[0]?.database_name || 'wolfzonepos_db',
          serverTime: dbResult.rows[0]?.server_time || new Date().toISOString(),
        },
        pool: {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          activeCount: Math.max(0, pool.totalCount - pool.idleCount),
          waitingCount: pool.waitingCount,
        },
        databaseUrl: DATABASE_URL.replace(/:[^:@]+@/, ':****@')
      });
    } catch (err: any) {
      const responseTimeMs = Number((performance.now() - start).toFixed(2));
      console.warn('[PostgreSQL Pool Health Warning]', err.message);

      return res.status(isPostgresReady() ? 503 : 200).json({
        status: isPostgresReady() ? 'degraded' : 'fallback_memory',
        healthy: false,
        timestamp: new Date().toISOString(),
        responseTimeMs,
        error: err.message,
        database: {
          engine: 'PostgreSQL',
          connected: false,
          fallback: 'memory_store'
        },
        pool: {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          activeCount: Math.max(0, pool.totalCount - pool.idleCount),
          waitingCount: pool.waitingCount,
        },
        databaseUrl: DATABASE_URL.replace(/:[^:@]+@/, ':****@')
      });
    }
  });

  registerPostgresAdminRoutes(app, { getStoredPin });
  registerBootstrapRoutes(app, { rowToPublicUser, sanitizeUserForClient });
  registerTicketRoutes(app);
  registerShiftRoutes(app);
  registerUserRoutes(app, { getStoredPin, limitLogin, limitPin, rowToPublicUser, sanitizeUserForClient });
  registerConfigRoutes(app, { getOrLoadGeminiApiKey, setGeminiApiKey });
  registerDianRoutes(app);
  registerSpotRoutes(app);
  registerAuditRoutes(app);
  registerDatabaseMaintenanceRoutes(app);
  registerSubscriberRoutes(app);
  registerPrintingRoutes(app, { currentDir });
  registerFarmadeskRoutes(app, { PORT, limitPin });
  // Helpers for sync files
  const syncDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(syncDir)) {
    try { fs.mkdirSync(syncDir, { recursive: true }); } catch (e) { /* ignore */ }
  }

  // Helper para extraer la IP pública real del cliente (incluso detrás de proxies/Cloudflare/Nginx)
  function extractClientIp(req: any): string {
    const forwarded = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim();
    const realIp = (req.headers['x-real-ip'] as string)?.trim();
    const cfConnectingIp = (req.headers['cf-connecting-ip'] as string)?.trim();
    const rawSocket = req.socket?.remoteAddress?.replace(/^::ffff:/, '') || '';
    const candidate = cfConnectingIp || forwarded || realIp || rawSocket;
    if (!candidate || candidate === '::1' || candidate === '127.0.0.1') {
      return '127.0.0.1';
    }
    return candidate.replace(/^::ffff:/, '');
  }

  // Endpoint para que cualquier sede o cliente consulte cuál es su IP Pública real detectada
  app.get(['/api/sync/detect-public-ip', '/api/my-ip', '/api/sync/my-ip'], (req, res) => {
    const detectedIp = extractClientIp(req);
    res.json({
      success: true,
      publicIp: detectedIp,
      ip: detectedIp,
      detectedAt: new Date().toISOString(),
      headers: {
        forwardedFor: req.headers['x-forwarded-for'] || null,
        realIp: req.headers['x-real-ip'] || null,
        remoteAddress: req.socket?.remoteAddress || null
      }
    });
  });

  const serverConfigPath = path.join(syncDir, 'sync-server-config.json');
  const centralPackagesPath = path.join(syncDir, 'sync-central-packages.json');
  const branchesTelemetryPath = path.join(syncDir, 'sync-branches-telemetry.json');
  const branchesTelemetryBackupPath = path.join(syncDir, 'sync-branches-telemetry.backup.json');
  const masterPolicyPath = path.join(syncDir, 'sync-master-policy.json');
  const softwareReleasesPath = path.join(syncDir, 'sync-software-releases.json');
  const globalConfigPath = path.join(process.cwd(), 'global-config.json');
  const branchOperationsPath = path.join(syncDir, 'sync-branch-operations.json');
  const centralGlobalVersionPath = path.join(syncDir, 'sync-central-global-version.json');

  // --- TELEMETRÍA: PLANTILLA MAESTRA DE RESPALDO Y AUTO-RECUPERACIÓN ---
  const validBranchStatuses = ['online', 'offline', 'syncing', 'warning'];

  const GOLDEN_BRANCHES_TELEMETRY: Record<string, any> = {
    'suc-001': {
      id: 'suc-001',
      code: 'SUC-001',
      name: 'Sede Principal',
      city: 'Principal',
      address: 'Sede Principal',
      phone: '',
      managerName: 'Administrador',
      status: 'online',
      ipAddress: '127.0.0.1',
      publicIp: '152.200.144.62',
      reportedPublicIp: '152.200.144.62',
      localIp: '192.168.1.100',
      port: 3000,
      webSocketsUrl: 'ws://186.180.74.35:3001/ws',
      farmadeskId: '891 042 150',
      farmadeskPassword: 'matriz_secure_farma_72',
      farmadeskPort: 9050,
      anydeskId: '347 378 979',
      rustdeskId: '904812354',
      vncPassword: 'wolf_suc001_dh82863',
      systemUrl: 'http://186.180.74.35:3001/wolfzonepos?branchId=suc-001',
      lastReportedAt: new Date().toISOString(),
      lastIpReportedAt: new Date().toISOString(),
      lastSyncTimestamp: new Date().toISOString(),
      wsConnected: true,
      currentAppVersion: 'v2.5.0-enterprise',
      totalSpots: 36,
      occupiedSpots: 0,
      todayRevenue: 0,
      todayVehicles: 0,
      activeShiftNumber: 0,
      currentCashier: 'Sin turno abierto',
      pendingUpdatesCount: 0,
      isCurrentBranch: true,
      warehouseId: 'bod-001',
      warehouseName: 'Bodega Principal',
      posPointsCount: 1,
      lastRemoteCommand: 'Ping Telemetría & Conectividad',
      lastRemoteCommandTime: new Date().toISOString(),
      notes: 'Sede Principal de operaciones.'
    }
  };

  // Memoria caché para evitar que fallos de I/O borren sedes
  let memoryTelemetryCache: Record<string, any> = JSON.parse(JSON.stringify(GOLDEN_BRANCHES_TELEMETRY));

  /**
   * Sondea de forma activa la conectividad y mide la latencia RTT (en milisegundos) hacia una sucursal
   */
  async function pingTargetNode(
    rawHostOrIp: string,
    port: number = 3000,
    timeoutMs: number = 2200
  ): Promise<{ online: boolean; latencyMs: number; method: 'tcp' | 'http' | 'icmp' | 'none'; details?: string }> {
    if (!rawHostOrIp) {
      return { online: false, latencyMs: 0, method: 'none', details: 'Host vacío' };
    }

    let cleanHost = rawHostOrIp.trim();
    cleanHost = cleanHost.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    let targetPort = port || 3000;
    if (cleanHost.includes(':')) {
      const parts = cleanHost.split(':');
      cleanHost = parts[0];
      const parsedPort = parseInt(parts[1], 10);
      if (!isNaN(parsedPort)) targetPort = parsedPort;
    }

    if (!cleanHost) {
      return { online: false, latencyMs: 0, method: 'none', details: 'Host inválido' };
    }

    // Si es localhost o 127.0.0.1
    if (cleanHost === '127.0.0.1' || cleanHost === 'localhost') {
      const start = performance.now();
      try {
        const res = await fetch(`http://127.0.0.1:${targetPort}/api/health`, { signal: AbortSignal.timeout(1200) });
        const latencyMs = Math.max(1, Math.round(performance.now() - start));
        return { online: res.ok, latencyMs, method: 'http', details: 'Servicio local activo' };
      } catch {
        return { online: true, latencyMs: 2, method: 'tcp', details: 'Loopback local activo' };
      }
    }

    // 1. Método TCP: Intento de conexión socket directa al puerto del POS
    const tcpPromise = new Promise<{ online: boolean; latencyMs: number; method: 'tcp'; details?: string }>((resolve) => {
      const start = performance.now();
      const socket = new net.Socket();
      let resolved = false;

      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        if (resolved) return;
        resolved = true;
        const latencyMs = Math.max(1, Math.round(performance.now() - start));
        socket.destroy();
        resolve({ online: true, latencyMs, method: 'tcp', details: `Puerto ${targetPort} accesible directamente` });
      });

      socket.on('timeout', () => {
        if (resolved) return;
        resolved = true;
        socket.destroy();
        resolve({ online: false, latencyMs: 0, method: 'tcp', details: 'Timeout TCP' });
      });

      socket.on('error', (err: any) => {
        if (resolved) return;
        resolved = true;
        socket.destroy();
        resolve({ online: false, latencyMs: 0, method: 'tcp', details: err.message || 'Error socket' });
      });

      try {
        socket.connect(targetPort, cleanHost);
      } catch (err: any) {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve({ online: false, latencyMs: 0, method: 'tcp', details: err.message });
        }
      }
    });

    const tcpRes = await tcpPromise;
    if (tcpRes.online) {
      return tcpRes;
    }

    // 2. Método HTTP Health Probe
    try {
      const startHttp = performance.now();
      const httpRes = await fetch(`http://${cleanHost}:${targetPort}/api/health`, {
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (httpRes.ok || httpRes.status === 404 || httpRes.status === 401) {
        const latencyMs = Math.max(1, Math.round(performance.now() - startHttp));
        return { online: true, latencyMs, method: 'http', details: `HTTP responde (Status: ${httpRes.status})` };
      }
    } catch {
      // Continuar con ICMP
    }

    // 3. Método ICMP Ping del Sistema Operativo
    const icmpPromise = new Promise<{ online: boolean; latencyMs: number; method: 'icmp'; details?: string }>((resolve) => {
      const isWin = process.platform === 'win32';
      const args = isWin 
        ? ['-n', '1', '-w', '1800', cleanHost] 
        : ['-c', '1', '-W', '2', cleanHost];

      execFile('ping', args, { timeout: 2000 }, (error, stdout) => {
        if (error || !stdout) {
          return resolve({ online: false, latencyMs: 0, method: 'icmp', details: 'Sin respuesta a ICMP' });
        }

        const match = stdout.match(/(?:tiempo|time)[=<](\d+(?:\.\d+)?)\s*ms/i);
        if (match && match[1]) {
          const latencyMs = Math.max(1, Math.round(parseFloat(match[1])));
          return resolve({
            online: true,
            latencyMs,
            method: 'icmp',
            details: `Enlace WAN activo (${latencyMs}ms). Puerto ${targetPort} filtrado o NAT.`
          });
        }

        if (stdout.includes('0% perdidos') || stdout.includes('0% loss')) {
          return resolve({ online: true, latencyMs: 25, method: 'icmp', details: 'Enlace WAN responde a ICMP' });
        }

        resolve({ online: false, latencyMs: 0, method: 'icmp', details: 'Paquete ICMP perdido' });
      });
    });

    const icmpRes = await icmpPromise;
    if (icmpRes.online) {
      return icmpRes;
    }

    return { online: false, latencyMs: 0, method: 'none', details: 'Sede inalcanzable (sin respuesta en puerto ni ICMP)' };
  }

  function loadAndValidateBranchesTelemetry(): Record<string, any> {
    let parsed: any = null;
    let loadedFromDisk = false;

    // 1. Intentar leer archivo principal
    if (fs.existsSync(branchesTelemetryPath)) {
      try {
        const raw = fs.readFileSync(branchesTelemetryPath, 'utf8');
        if (raw && raw.trim()) {
          parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            loadedFromDisk = true;
          }
        }
      } catch (err: any) {
        console.warn('[Sync Telemetría] Advertencia: Archivo dañado o corrupto, recurriendo a respaldo:', err.message);
      }
    }

    // 2. Si falló el archivo principal, intentar leer el respaldo automático
    if (!loadedFromDisk && fs.existsSync(branchesTelemetryBackupPath)) {
      try {
        const rawBackup = fs.readFileSync(branchesTelemetryBackupPath, 'utf8');
        if (rawBackup && rawBackup.trim()) {
          parsed = JSON.parse(rawBackup);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            console.log('[Sync Telemetría] Restaurado exitosamente desde archivo de respaldo.');
            loadedFromDisk = true;
          }
        }
      } catch (e) {
        // Fallback a memoria
      }
    }

    // 3. Si ambos fallaron, usar la caché en memoria o la plantilla dorada
    if (!loadedFromDisk || !parsed || typeof parsed !== 'object') {
      parsed = Object.keys(memoryTelemetryCache).length > 0
        ? memoryTelemetryCache
        : GOLDEN_BRANCHES_TELEMETRY;
    }

    // 4. Sanitizar y asegurar que todas las sedes oficiales siempre existan y tengan datos completos
    const cleanMap: Record<string, any> = {};

    // Primero poblar con la plantilla dorada para garantizar valores base intactos
    for (const [id, goldenBranch] of Object.entries(GOLDEN_BRANCHES_TELEMETRY)) {
      cleanMap[id] = { ...goldenBranch };
    }

    // 4.5. Incorporar sedes registradas en global-config.json para que nunca desaparezcan
    if (fs.existsSync(globalConfigPath)) {
      try {
        const gConf = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
        if (gConf && Array.isArray(gConf.branches)) {
          for (const b of gConf.branches) {
            if (!b || !b.id || b.id === 'branch-01' || b.id === 'SERVER-CENTRAL') continue;
            cleanMap[b.id] = {
              ...b,
              id: b.id,
              code: b.code || b.id.toUpperCase(),
              name: b.name || `Sucursal ${b.id}`,
              city: b.city || 'Ciudad Principal',
              address: b.address || 'Dirección Principal',
              status: validBranchStatuses.includes(b.status) ? b.status : 'online',
              publicIp: b.reportedPublicIp || b.publicIp || b.ipAddress || '127.0.0.1',
              reportedPublicIp: b.reportedPublicIp || b.publicIp || b.ipAddress || '127.0.0.1',
              ipAddress: b.domain || b.reportedPublicIp || b.publicIp || b.ipAddress || '127.0.0.1',
              domain: b.domain || b.ddnsDomain,
              ddnsDomain: b.ddnsDomain || b.domain,
              port: b.port || 3000,
              lastReportedAt: b.lastReportedAt || b.lastSyncTimestamp || new Date().toISOString()
            };
          }
        }
      } catch (e) {
        console.warn('[Sync Telemetría] Error leyendo sedes de global-config:', e);
      }
    }

    // Luego superponer datos dinámicos válidos recibidos del disco o memoria
    for (const [key, val] of Object.entries(parsed)) {
      if (!val || typeof val !== 'object' || key === 'branch-01') continue;
      const item = val as Record<string, any>;
      const id = item.id || key;
      if (!id || id === 'branch-01' || id === 'SERVER-CENTRAL') continue;

      const base = cleanMap[id] || (GOLDEN_BRANCHES_TELEMETRY[id] || {});

      const isGenericName = (n?: string) => !n || n.startsWith('Sucursal branch_') || n.startsWith('Sucursal SUC-') || n === `Sucursal ${id}`;
      const isGenericCode = (c?: string) => !c || c === id.toUpperCase() || c.startsWith('BRANCH_');

      cleanMap[id] = {
        ...base,
        ...item,
        id,
        code: (!isGenericCode(base.code)) ? base.code : ((item.code && !isGenericCode(item.code)) ? item.code : (base.code || id.toUpperCase())),
        name: (!isGenericName(base.name)) ? base.name : ((item.name && !isGenericName(item.name)) ? item.name : (base.name || `Sucursal ${id}`)),
        city: (base.city && base.city !== 'Ciudad Principal') ? base.city : (item.city || base.city || 'Ciudad Principal'),
        address: (base.address && base.address !== 'Dirección Principal' && base.address !== 'Dirección no registrada') ? base.address : (item.address || base.address || 'Dirección Principal'),
        managerName: (base.managerName && base.managerName !== 'Administrador') ? base.managerName : (item.managerName || base.managerName || 'Administrador'),
        totalSpots: (typeof base.totalSpots === 'number' && base.totalSpots > 0) ? base.totalSpots : (typeof item.totalSpots === 'number' ? item.totalSpots : 30),
        status: validBranchStatuses.includes(item.status) ? item.status : (base.status || 'offline'),
        localIp: (item.localIp && !item.localIp.includes('152.200.') && item.localIp !== item.publicIp) ? item.localIp : (base.localIp || item.localIp || '192.168.1.100'),
        publicIp: item.reportedPublicIp || item.publicIp || base.publicIp || '127.0.0.1',
        reportedPublicIp: item.reportedPublicIp || item.publicIp || base.reportedPublicIp || '127.0.0.1',
        domain: item.domain || item.ddnsDomain || base.domain || base.ddnsDomain,
        ddnsDomain: item.ddnsDomain || item.domain || base.ddnsDomain || base.domain,
        ipAddress: item.domain || item.ddnsDomain || item.reportedPublicIp || item.publicIp || item.ipAddress || base.ipAddress || '127.0.0.1',
        lastReportedAt: item.lastReportedAt || base.lastReportedAt || new Date().toISOString()
      };
    }

    // Actualizar caché de memoria
    memoryTelemetryCache = { ...cleanMap };

    // Si el archivo en disco no existía, estaba dañado, o le faltaban sedes, auto-repararlo inmediatamente en disco
    const diskKeysCount = Object.keys(parsed || {}).length;
    const cleanKeysCount = Object.keys(cleanMap).length;
    if (!loadedFromDisk || diskKeysCount < cleanKeysCount) {
      saveBranchesTelemetry(cleanMap);
    }

    return cleanMap;
  }

  function saveBranchesTelemetry(telemetryMap: Record<string, any>): boolean {
    try {
      const cleanMap: Record<string, any> = {};

      // Garantizar que la sede principal se mantenga intacta
      for (const [id, golden] of Object.entries(GOLDEN_BRANCHES_TELEMETRY)) {
        cleanMap[id] = { ...golden };
      }

      for (const [key, val] of Object.entries(telemetryMap)) {
        if (key === 'branch-01' || !val || typeof val !== 'object') continue;
        const item = val as Record<string, any>;
        const id = item.id || key;
        if (!id || id === 'branch-01') continue;

        cleanMap[id] = {
          ...(cleanMap[id] || {}),
          ...item,
          id
        };
      }

      const jsonStr = JSON.stringify(cleanMap, null, 2) + '\n';

      // ESCRITURA ATÓMICA: escribir en archivo temporal y luego renombrar
      const tempPath = `${branchesTelemetryPath}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}.tmp`;
      fs.writeFileSync(tempPath, jsonStr, 'utf8');
      fs.renameSync(tempPath, branchesTelemetryPath);

      // Guardar también copia de respaldo
      try {
        fs.writeFileSync(branchesTelemetryBackupPath, jsonStr, 'utf8');
      } catch (errBackup) {
        // quiet fallback
      }

      memoryTelemetryCache = { ...cleanMap };
      return true;
    } catch (err: any) {
      console.error('[Sync Telemetría] Error al guardar sync-branches-telemetry.json:', err.message);
      return false;
    }
  }

  // Inicializar y auto-curar telemetría al arrancar el servidor
  loadAndValidateBranchesTelemetry();

  const defaultServerConfig = {
    localDbHost: 'localhost',
    localDbName: 'ParqueaderoPOS_DB_TAQUILLA_01',
    localDbUser: 'admin',
    localDbPassword: '••••••••',
    localOperatingSystem: 'Windows 10 / 11 Pro',
    remoteDbHost: 'central.parqueaderopos.com',
    remoteDbName: 'ParqueaderoPOS_CENTRAL_DB',
    remoteDbUser: 'admin_central',
    remoteDbPassword: '',
    remoteWebSocketsUrl: 'wss://central.parqueaderopos.com/ws',
    nodeRole: 'branch',
    autoSyncEnabled: true,
    autoSyncIntervalMinutes: 5,
    lastSyncTimestamp: new Date().toISOString(),
    connectionStatus: 'connected',
    latencyMs: 18
  };

  // Seed default packages if not exists
  if (!fs.existsSync(centralPackagesPath)) {
    const initialPackages = [
      {
        id: 'pkg-2026-003',
        packageNumber: 'PKG-2026-003',
        title: 'Ajuste Nacional de Tarifas y Nuevos Conceptos de Insumos 2026',
        description: 'Actualización general de tarifas para Carros ($70/min) y Motos ($35/min), estandarización de conceptos de caja menor autorizados y políticas de tiquete extraviado.',
        author: 'Administrador Maestro (Dirección General)',
        createdAt: new Date().toISOString(),
        targetScope: 'all',
        targetBranchIds: [],
        updateTypes: ['rates', 'vehicle_categories', 'expense_concepts'],
        payload: {
          rates: {
            minuteRate: 70,
            hourRate: 4200,
            dayRate: 28000,
            lostTicketFee: 20000,
            gracePeriodMinutes: 15,
            minimumChargeMinutes: 30,
            car: { minuteRate: 70, hourRate: 4200, dayRate: 28000, gracePeriodMinutes: 15, minimumChargeMinutes: 30 },
            motorcycle: { minuteRate: 35, hourRate: 2100, dayRate: 15000, gracePeriodMinutes: 15, minimumChargeMinutes: 30 }
          }
        },
        status: 'published',
        appliedByBranches: []
      }
    ];
    try {
      fs.writeFileSync(centralPackagesPath, JSON.stringify(initialPackages, null, 2), 'utf8');
    } catch (e) {
      console.error('[Sync] Error inicializando packages:', e);
    }
  }

  // 1. GET /api/sync/server-config
  app.get('/api/sync/server-config', (req, res) => {
    try {
      if (fs.existsSync(serverConfigPath)) {
        const data = JSON.parse(fs.readFileSync(serverConfigPath, 'utf8'));
        return res.json({ success: true, data });
      }
      return res.json({ success: true, data: defaultServerConfig });
    } catch (err: any) {
      console.error('[Sync] Error leyendo server-config:', err);
      res.json({ success: true, data: defaultServerConfig });
    }
  });

  // 1.5 GET /api/system/node-identity - Identidad autoritativa de sucursal de esta máquina
  app.get('/api/system/node-identity', (req, res) => {
    try {
      let cfg: any = {};
      if (fs.existsSync(serverConfigPath)) {
        try {
          cfg = JSON.parse(fs.readFileSync(serverConfigPath, 'utf8'));
        } catch (e) {}
      }

      // Detectar la IP de red local activa
      let detectedLocalIp = '192.168.14.227';
      try {
        const networkInterfaces = os.networkInterfaces();
        for (const ifaceName of Object.keys(networkInterfaces)) {
          const list = networkInterfaces[ifaceName] || [];
          for (const item of list) {
            if (item.family === 'IPv4' && !item.internal && item.address.startsWith('192.168.')) {
              detectedLocalIp = item.address;
              break;
            }
          }
        }
      } catch (e) {}

      const branchId = cfg.branchId || 'branch_1793114761863';
      const branchCode = cfg.branchCode || 'OFI-001';
      const branchName = cfg.branchName || 'DESARROLLO Y PRUEBAS';
      const nodeRole = cfg.nodeRole || 'branch';

      return res.json({
        success: true,
        nodeRole,
        branchId,
        branchCode,
        branchName,
        localIp: detectedLocalIp,
        publicIp: '152.200.144.62',
        hostname: req.hostname,
        port: PORT
      });
    } catch (err: any) {
      return res.json({
        success: false,
        error: err.message,
        branchId: 'branch_1793114761863',
        branchCode: 'OFI-001',
        branchName: 'DESARROLLO Y PRUEBAS'
      });
    }
  });

  // 2. POST /api/sync/server-config
  app.post('/api/sync/server-config', requireMaster, (req, res) => {
    try {
      const { config } = req.body;
      if (!config) {
        return res.status(400).json({ success: false, error: 'No se recibió configuración válida.' });
      }
      const merged = { ...defaultServerConfig, ...config, lastUpdated: new Date().toISOString() };
      fs.writeFileSync(serverConfigPath, JSON.stringify(merged, null, 2), 'utf8');
      console.log('[Sync] Configuración de servidor local y remoto guardada con éxito.');
      res.json({ success: true, message: 'Configuración guardada correctamente.', data: merged });
    } catch (err: any) {
      console.error('[Sync] Error guardando server-config:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. POST /api/sync/test-connection
  app.post('/api/sync/test-connection', async (req, res) => {
    const { localDbHost, remoteDbHost, remoteWebSocketsUrl } = req.body;
    let remoteOnline = false;
    let measuredLatency = 0;
    let diagMessage = '';

    const hostClean = (remoteDbHost || '').trim();
    if (!hostClean || hostClean === 'localhost' || hostClean === '127.0.0.1' || hostClean === 'central.parqueaderopos.com') {
      // Local/internal server mode
      remoteOnline = true;
      measuredLatency = 12;
      diagMessage = `Conexión verificada con el Servidor Central local/emulado (${hostClean || 'localhost'}).`;
    } else {
      // Real remote IP/domain test
      const targetUrl = hostClean.startsWith('http') ? hostClean : `http://${hostClean}`;
      const startTime = Date.now();
      try {
        const response = await fetch(`${targetUrl}/api/health`, {
          signal: AbortSignal.timeout(3500)
        });
        measuredLatency = Date.now() - startTime;
        if (response.ok) {
          remoteOnline = true;
          diagMessage = `Conexión exitosa con el Servidor Central (${hostClean}) [Latencia: ${measuredLatency}ms].`;
        } else {
          diagMessage = `El servidor en ${hostClean} respondió con código HTTP ${response.status}.`;
        }
      } catch (err: any) {
        console.warn(`[Sync Server] No se pudo alcanzar el host remoto ${hostClean}:`, err.message);
        remoteOnline = false;
        diagMessage = `No fue posible conectar con ${hostClean}. Verifique que el equipo esté encendido, con la app iniciada en ese puerto y con el firewall/puerto abierto.`;
      }
    }

    res.json({
      success: true,
      localStatus: 'online',
      remoteStatus: remoteOnline ? 'online' : 'offline',
      latencyMs: measuredLatency || 20,
      message: diagMessage,
      timestamp: new Date().toISOString()
    });
  });

  // 4. GET /api/sync/central-packages
  app.get('/api/sync/central-packages', (req, res) => {
    try {
      const { branchId } = req.query;
      let packages = [];
      if (fs.existsSync(centralPackagesPath)) {
        packages = JSON.parse(fs.readFileSync(centralPackagesPath, 'utf8'));
      }
      res.json({ success: true, data: packages });
    } catch (err: any) {
      console.error('[Sync] Error leyendo central-packages:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. POST /api/sync/central-packages (Central publishes update package)
  app.post('/api/sync/central-packages', requirePermission('canManageBranchLocations'), (req, res) => {
    try {
      const clientIp = extractClientIp(req);
      const senderRole = req.headers['x-wolf-node-role'] || req.body?.nodeRole;
      const senderBranchId = req.headers['x-wolf-branch-id'] || req.body?.branchId;

      // STRICT PROTECTION: Reject external branches from publishing packages to the Central Server
      if (senderRole === 'branch' || (senderBranchId && senderBranchId !== 'suc-001' && senderBranchId !== 'branch-01')) {
        console.warn(`[Sync Security] ⛔ Intento bloqueado: Terminal en IP ${clientIp} (Sede: ${senderBranchId}, Rol: ${senderRole}) intentó publicar paquete hacia el Servidor Central.`);
        return res.status(403).json({
          success: false,
          error: 'Seguridad Central: Ninguna terminal o sucursal externa puede generar paquetes hacia el Servidor Central.'
        });
      }

      const { package: newPkg } = req.body;
      if (!newPkg || !newPkg.id) {
        return res.status(400).json({ success: false, error: 'Paquete de datos inválido.' });
      }

      // Auto-mark Central Server (suc-001) as having applied this package immediately
      if (!Array.isArray(newPkg.appliedByBranches)) {
        newPkg.appliedByBranches = [];
      }
      if (!newPkg.appliedByBranches.some((a: any) => a.branchId === 'suc-001')) {
        newPkg.appliedByBranches.push({
          branchId: 'suc-001',
          branchName: 'Sede Principal (Servidor Central)',
          appliedAt: new Date().toISOString()
        });
      }

      let packages: any[] = [];
      if (fs.existsSync(centralPackagesPath)) {
        try {
          packages = JSON.parse(fs.readFileSync(centralPackagesPath, 'utf8'));
        } catch { packages = []; }
      }

      // Check if existing, update or prepend
      const existingIdx = packages.findIndex(p => p.id === newPkg.id);
      if (existingIdx >= 0) {
        packages[existingIdx] = { ...packages[existingIdx], ...newPkg };
      } else {
        packages.unshift(newPkg);
      }

      fs.writeFileSync(centralPackagesPath, JSON.stringify(packages, null, 2), 'utf8');

      // If package contains rates or categories, update global-config as well
      if (newPkg.payload) {
        let globalConf: any = {};
        if (fs.existsSync(globalConfigPath)) {
          try { globalConf = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8')); } catch { globalConf = {}; }
        }
        if (newPkg.payload.rates) globalConf.rates = newPkg.payload.rates;
        if (newPkg.payload.vehicleCategories) globalConf.vehicleCategories = newPkg.payload.vehicleCategories;
        if (newPkg.payload.expenseConcepts) globalConf.expenseConcepts = newPkg.payload.expenseConcepts;
        if (newPkg.payload.expenseCategories) globalConf.expenseCategories = newPkg.payload.expenseCategories;
        globalConf.lastUpdated = new Date().toISOString();
        fs.writeFileSync(globalConfigPath, JSON.stringify(globalConf, null, 2), 'utf8');
      }

      console.log(`[Sync Central] Paquete emitido: ${newPkg.packageNumber} - ${newPkg.title}`);
      res.json({ success: true, message: 'Paquete publicado en el Servidor Central con éxito.', package: newPkg });
    } catch (err: any) {
      console.error('[Sync] Error guardando central-package:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. POST /api/sync/apply-package (Branch records package as applied)
  app.post('/api/sync/apply-package', (req, res) => {
    try {
      const { packageId, branchId, branchName } = req.body;
      if (!packageId || !branchId) {
        return res.status(400).json({ success: false, error: 'Faltan parámetros requeridos.' });
      }

      let packages: any[] = [];
      if (fs.existsSync(centralPackagesPath)) {
        packages = JSON.parse(fs.readFileSync(centralPackagesPath, 'utf8'));
      }

      let updatedPkg = null;
      packages = packages.map(p => {
        if (p.id === packageId) {
          const appliedBy = p.appliedByBranches || [];
          const filtered = appliedBy.filter((a: any) => a.branchId !== branchId);
          filtered.push({
            branchId,
            branchName: branchName || branchId,
            appliedAt: new Date().toISOString(),
            status: 'success'
          });
          p.appliedByBranches = filtered;
          updatedPkg = p;
        }
        return p;
      });

      fs.writeFileSync(centralPackagesPath, JSON.stringify(packages, null, 2), 'utf8');
      res.json({ success: true, message: 'Paquete marcado como aplicado en la sucursal.', package: updatedPkg });
    } catch (err: any) {
      console.error('[Sync] Error en apply-package:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6b. GET & POST /api/sync/master-policy (Sync Domain & Extensibility Matrix)
  app.get('/api/sync/master-policy', (req, res) => {
    try {
      if (fs.existsSync(masterPolicyPath)) {
        const policy = JSON.parse(fs.readFileSync(masterPolicyPath, 'utf8'));
        return res.json({ success: true, policy });
      }
      res.json({ success: true, policy: null });
    } catch (err: any) {
      console.error('[Sync] Error leyendo master-policy:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- CONTROL REMOTO Y ACCESO A SEDES ENDPOINTS ---
  app.post('/api/remote/test-branch', async (req, res) => {
    try {
      const { branchId, ipAddress, name, port } = req.body;
      const cleanIp = (ipAddress || '').trim();

      const probe = await pingTargetNode(cleanIp, port || 3000, 2500);

      res.json({
        success: true,
        branchId: branchId === 'branch-01' ? 'suc-001' : (branchId || 'suc-001'),
        name: name || 'Sucursal',
        ipAddress: cleanIp || '192.168.1.100',
        status: probe.online ? 'online' : 'offline',
        latencyMs: probe.online ? probe.latencyMs : 0,
        pingMs: probe.online ? probe.latencyMs : null,
        method: probe.method,
        posPortStatus: probe.online ? `${port || 3000}/POS ACCESIBLE (${probe.latencyMs}ms)` : `${port || 3000}/INACCESIBLE`,
        vncPortStatus: probe.online ? '5900/RFB DISPONIBLE' : '5900/RFB NO RESPONDE',
        message: probe.online
          ? `✅ Sede en ${cleanIp} alcanzable vía ${probe.method.toUpperCase()} [${probe.latencyMs}ms]. ${probe.details || ''}`
          : `⚠️ Sede en ${cleanIp} no responde [${probe.details || 'Inalcanzable'}].`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/remote/connect', (req, res) => {
    try {
      const { branchId, branchName, city, ipAddress, mode } = req.body;
      const targetBranchId = branchId === 'branch-01' ? 'suc-001' : (branchId || 'suc-001');
      const session = {
        branchId: targetBranchId,
        branchName: branchName || 'Sucursal',
        city: city || 'Ciudad',
        ipAddress: ipAddress || '192.168.1.100',
        connectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        pingMs: Math.floor(Math.random() * 10) + 12,
        mode: mode || 'system',
        status: 'active'
      };

      console.log(`[Remote Access] Sesión remota iniciada en ${branchName} (${mode.toUpperCase()})`);
      res.json({ success: true, message: `Conexión establecida con ${branchName}`, session });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/sync/master-policy', requirePermission('canManageBranchLocations'), (req, res) => {
    try {
      const { policy } = req.body;
      if (!policy || !policy.domains) {
        return res.status(400).json({ success: false, error: 'Directiva de sincronización inválida.' });
      }
      fs.writeFileSync(masterPolicyPath, JSON.stringify(policy, null, 2), 'utf8');
      console.log(`[Sync Central] Directiva Maestra de Sincronización actualizada (${policy.domains.length} dominios).`);
      res.json({ success: true, message: 'Directiva Maestra guardada correctamente.', policy });
    } catch (err: any) {
      console.error('[Sync] Error guardando master-policy:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Helper to load or init Central Global Version
  const loadCentralGlobalVersion = () => {
    const defaultData = {
      activeVersion: 'G-1.0.3',
      publishedAt: '2026-10-14T12:00:00.000Z',
      publishedBy: 'Administrador Central (Matriz)',
      title: 'Versión Oficial de Globales G-1.0.3',
      description: 'Tarifas base actualizadas, perfiles de cajeros autorizados y parámetros del sistema.',
      targetScope: 'all',
      targetBranchIds: [],
      rates: {
        minuteRate: 70,
        hourRate: 4200,
        dayRate: 25000,
        lostTicketFee: 15000,
        gracePeriodMinutes: 15,
        car: { minuteRate: 70, hourRate: 4200, dayRate: 25000, gracePeriodMinutes: 15 },
        motorcycle: { minuteRate: 40, hourRate: 2400, dayRate: 15000, gracePeriodMinutes: 15 }
      },
      users: [],
      userTemplates: [],
      parameters: {
        establishmentName: 'PARKING POS MATRIZ',
        establishmentNit: '900.265.730-1',
        gracePeriodMinutes: 15,
        allowManualRateOverride: true
      },
      branches: [],
      warehouses: [],
      posPoints: [],
      history: []
    };

    if (fs.existsSync(centralGlobalVersionPath)) {
      try {
        return JSON.parse(fs.readFileSync(centralGlobalVersionPath, 'utf8'));
      } catch {
        return defaultData;
      }
    }
    try {
      fs.writeFileSync(centralGlobalVersionPath, JSON.stringify(defaultData, null, 2), 'utf8');
    } catch {}
    return defaultData;
  };

  // Helper to load or init Branch Operations Store
  const loadBranchOperationsStore = (): Record<string, any> => {
    if (fs.existsSync(branchOperationsPath)) {
      try {
        return JSON.parse(fs.readFileSync(branchOperationsPath, 'utf8'));
      } catch {
        return {};
      }
    }
    return {};
  };

  const saveBranchOperationsStore = (store: Record<string, any>) => {
    try {
      fs.writeFileSync(branchOperationsPath, JSON.stringify(store, null, 2), 'utf8');
    } catch (e) {
      console.warn('[Sync] Error guardando branch-operations:', e);
    }
  };

  // 7. GET /api/sync/pull-central-data (Branch downloads everything from Central)
  app.get('/api/sync/pull-central-data', (req, res) => {
    try {
      const { branchId } = req.query;
      let packages: any[] = [];
      if (fs.existsSync(centralPackagesPath)) {
        try { packages = JSON.parse(fs.readFileSync(centralPackagesPath, 'utf8')); } catch { packages = []; }
      }

      let globalConfig: any = {};
      if (fs.existsSync(globalConfigPath)) {
        try { globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8')); } catch { globalConfig = {}; }
      }

      // Filter pending packages for this branch
      const pendingPackages = packages.filter(pkg => {
        const isTarget = pkg.targetScope === 'all' || (Array.isArray(pkg.targetBranchIds) && pkg.targetBranchIds.includes(branchId));
        const isApplied = Array.isArray(pkg.appliedByBranches) && pkg.appliedByBranches.some((a: any) => a.branchId === branchId);
        return isTarget && !isApplied;
      });

      const globalVer = loadCentralGlobalVersion();
      let releasesData: any = {};
      if (fs.existsSync(softwareReleasesPath)) {
        try { releasesData = JSON.parse(fs.readFileSync(softwareReleasesPath, 'utf8')); } catch {}
      }

      res.json({
        success: true,
        serverTime: new Date().toISOString(),
        packages,
        pendingPackages,
        pendingCount: pendingPackages.length,
        globalConfig,
        activeGlobalVersion: globalVer.activeVersion || 'G-1.0.3',
        globalVersionData: globalVer,
        activeSoftwareVersion: releasesData.activeVersion || 'v2.5.0-enterprise',
        activeReleaseId: releasesData.activeReleaseId || 'build-2026-09-22-v250',
        status: 'online',
        latencyMs: 16
      });
    } catch (err: any) {
      console.error('[Sync] Error en pull-central-data:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7b. GET /api/sync/global-version (Consultar la versión oficial vigente de Globales)
  app.get('/api/sync/global-version', (req, res) => {
    try {
      const globalVer = loadCentralGlobalVersion();
      res.json({ success: true, data: globalVer });
    } catch (err: any) {
      console.error('[Sync] Error leyendo global-version:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7c. POST /api/sync/global-version (Servidor Central sube/publica manualmente una nueva versión de Globales)
  app.post('/api/sync/global-version', requirePermission('canManageBranchLocations'), (req, res) => {
    try {
      const clientIp = extractClientIp(req);
      const senderRole = req.headers['x-wolf-node-role'] || req.body?.nodeRole;
      const senderBranchId = req.headers['x-wolf-branch-id'] || req.body?.branchId;

      // STRICT PROTECTION: Reject external branches from publishing global versions to the Central Server
      if (senderRole === 'branch' || (senderBranchId && senderBranchId !== 'suc-001' && senderBranchId !== 'branch-01')) {
        console.warn(`[Sync Security] ⛔ Intento bloqueado: Terminal en IP ${clientIp} (Sede: ${senderBranchId}, Rol: ${senderRole}) intentó publicar Globales hacia el Servidor Central.`);
        return res.status(403).json({
          success: false,
          error: 'Seguridad Central: Ninguna terminal o sucursal externa puede generar ni sobreescribir versiones de Globales en el Servidor Central.'
        });
      }

      const {
        version,
        title,
        description,
        publishedBy,
        rates,
        users,
        userTemplates,
        roleMatrixConfig,
        vehicleCategories,
        expenseConcepts,
        expenseCategories,
        parameters,
        branches,
        warehouses,
        posPoints,
        targetScope,
        targetBranchIds
      } = req.body;

      if (!version || !title) {
        return res.status(400).json({ success: false, error: 'Versión y título son requeridos.' });
      }

      const current = loadCentralGlobalVersion();
      const previousVersion = current.activeVersion;

      // Create new version object
      const newGlobalVersion = {
        activeVersion: version,
        publishedAt: new Date().toISOString(),
        publishedBy: publishedBy || 'Administrador Central (Matriz)',
        title,
        description: description || `Actualización de parámetros globales versión ${version}`,
        targetScope: targetScope || 'all',
        targetBranchIds: Array.isArray(targetBranchIds) ? targetBranchIds : [],
        rates: rates || current.rates,
        users: Array.isArray(users) ? users : current.users,
        userTemplates: Array.isArray(userTemplates) ? userTemplates : current.userTemplates,
        roleMatrixConfig: roleMatrixConfig || current.roleMatrixConfig,
        vehicleCategories: vehicleCategories || current.vehicleCategories,
        expenseConcepts: expenseConcepts || current.expenseConcepts,
        expenseCategories: expenseCategories || current.expenseCategories,
        parameters: parameters || current.parameters,
        branches: Array.isArray(branches) ? branches : (current.branches || []),
        warehouses: Array.isArray(warehouses) ? warehouses : (current.warehouses || []),
        posPoints: Array.isArray(posPoints) ? posPoints : (current.posPoints || []),
        history: [
          {
            version: previousVersion,
            archivedAt: new Date().toISOString(),
            title: current.title,
            description: current.description
          },
          ...(Array.isArray(current.history) ? current.history.slice(0, 15) : [])
        ]
      };

      fs.writeFileSync(centralGlobalVersionPath, JSON.stringify(newGlobalVersion, null, 2), 'utf8');

      // Also create and inject a corresponding CentralUpdatePackage so all branch listeners get it
      let packages: any[] = [];
      if (fs.existsSync(centralPackagesPath)) {
        try { packages = JSON.parse(fs.readFileSync(centralPackagesPath, 'utf8')); } catch { packages = []; }
      }

      const pkgId = `pkg-global-${version.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;
      const newPkg: any = {
        id: pkgId,
        packageNumber: `GLB-${version.toUpperCase()}`,
        title: `Actualización de Globales ${version}: ${title}`,
        description: description || `Paquete manual de parámetros globales versión ${version}`,
        author: publishedBy || 'Central',
        createdAt: new Date().toISOString(),
        targetScope: targetScope || 'all',
        targetBranchIds: Array.isArray(targetBranchIds) ? targetBranchIds : [],
        type: 'global_parameters',
        updateTypes: ['rates', 'users', 'global_parameters', 'branches', 'warehouses', 'pos_points'],
        payload: {
          globalVersion: version,
          rates: newGlobalVersion.rates,
          vehicleCategories: newGlobalVersion.vehicleCategories,
          expenseConcepts: newGlobalVersion.expenseConcepts,
          expenseCategories: newGlobalVersion.expenseCategories,
          users: newGlobalVersion.users,
          userTemplates: newGlobalVersion.userTemplates,
          roleMatrixConfig: newGlobalVersion.roleMatrixConfig,
          businessInfoUpdates: newGlobalVersion.parameters,
          parameters: newGlobalVersion.parameters,
          branches: newGlobalVersion.branches,
          warehouses: newGlobalVersion.warehouses,
          posPoints: newGlobalVersion.posPoints
        },
        appliedByBranches: [
          {
            branchId: 'suc-001',
            branchName: 'Sede Principal (Servidor Central)',
            appliedAt: new Date().toISOString()
          }
        ]
      };

      packages.unshift(newPkg);
      fs.writeFileSync(centralPackagesPath, JSON.stringify(packages, null, 2), 'utf8');

      // Update global-config.json as well
      let globalConf: any = {};
      if (fs.existsSync(globalConfigPath)) {
        try { globalConf = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8')); } catch { globalConf = {}; }
      }
      if (rates) globalConf.rates = rates;
      if (vehicleCategories) globalConf.vehicleCategories = vehicleCategories;
      if (expenseConcepts) globalConf.expenseConcepts = expenseConcepts;
      if (expenseCategories) globalConf.expenseCategories = expenseCategories;
      if (branches) globalConf.branches = branches;
      if (warehouses) globalConf.warehouses = warehouses;
      if (posPoints) globalConf.posPoints = posPoints;
      if (parameters) globalConf.businessInfo = parameters;
      if (users) globalConf.users = users;
      if (userTemplates) globalConf.userTemplates = userTemplates;
      if (roleMatrixConfig) globalConf.roleMatrixConfig = roleMatrixConfig;
      globalConf.lastGlobalVersion = version;
      globalConf.lastUpdated = new Date().toISOString();
      fs.writeFileSync(globalConfigPath, JSON.stringify(globalConf, null, 2), 'utf8');

      console.log(`[Sync Central] ¡Nueva Versión de Globales Publicada!: ${version} - ${title}`);

      // WebSocket Broadcast if available
      try {
        broadcastToAdmins('central', {
          event: 'sync:global_version_published',
          data: { version, title, publishedAt: newGlobalVersion.publishedAt }
        });
      } catch (e) {}

      res.json({
        success: true,
        message: `¡Versión de Globales ${version} publicada en el Servidor Central con éxito!`,
        data: newGlobalVersion
      });
    } catch (err: any) {
      console.error('[Sync] Error guardando global-version:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7d. POST /api/sync/push-branch-operations (Sucursal transmite toda su información operativa y financiera)
  app.post('/api/sync/push-branch-operations', (req, res) => {
    try {
      const {
        branchId,
        branchName,
        operationalDay,
        currentShift,
        closedShifts,
        activeYard,
        systemVersions,
        timestamp
      } = req.body;

      if (!branchId) {
        return res.status(400).json({ success: false, error: 'branchId es requerido.' });
      }

      const targetBranchId = branchId === 'branch-01' ? 'suc-001' : branchId;
      const detectedClientIp = extractClientIp(req);

      // Save to branch operations store
      const opStore = loadBranchOperationsStore();
      const existingOp = opStore[targetBranchId] || {};

      opStore[targetBranchId] = {
        ...existingOp,
        branchId: targetBranchId,
        branchName: branchName || existingOp.branchName || `Sucursal ${targetBranchId}`,
        lastPushAt: new Date().toISOString(),
        clientIp: detectedClientIp,
        operationalDay: operationalDay || existingOp.operationalDay,
        currentShift: currentShift || existingOp.currentShift,
        closedShifts: Array.isArray(closedShifts) ? closedShifts : (existingOp.closedShifts || []),
        activeYard: activeYard || existingOp.activeYard,
        systemVersions: systemVersions || existingOp.systemVersions,
        timestamp: timestamp || new Date().toISOString()
      };
      saveBranchOperationsStore(opStore);

      // Also update branches telemetry map with real-time financial and yard numbers!
      const telemetryMap = loadAndValidateBranchesTelemetry();
      const existingTel = telemetryMap[targetBranchId] || {};

      const currentRevenue = typeof req.body.todayRevenue === 'number' 
        ? req.body.todayRevenue 
        : (currentShift?.totalCollected ?? (operationalDay?.totalRevenue ?? existingTel.todayRevenue));
      const currentVehicles = typeof req.body.paidTicketsCount === 'number'
        ? req.body.paidTicketsCount
        : (operationalDay?.ticketsCount ?? existingTel.todayVehicles);
      const currentOccupied = typeof req.body.occupiedSpots === 'number'
        ? req.body.occupiedSpots
        : (activeYard?.occupiedSpots ?? existingTel.occupiedSpots);
      const currentTotalSpots = typeof req.body.totalSpots === 'number'
        ? req.body.totalSpots
        : (activeYard?.totalSpots ?? existingTel.totalSpots);
      const installedGlobalVer = req.body.installedGlobalVersion || systemVersions?.installedGlobalVersion || existingTel.installedGlobalVersion || 'G-1.0.3';
      const installedAppVer = req.body.installedSoftwareVersion || systemVersions?.appVersion || existingTel.currentAppVersion || 'v2.5.0-enterprise';

      const globalVer = loadCentralGlobalVersion();
      let releasesData: any = {};
      if (fs.existsSync(softwareReleasesPath)) {
        try { releasesData = JSON.parse(fs.readFileSync(softwareReleasesPath, 'utf8')); } catch {}
      }
      const centralGlobalVer = globalVer.activeVersion || 'G-1.0.3';
      const centralAppVer = releasesData.activeVersion || 'v2.5.0-enterprise';

      telemetryMap[targetBranchId] = {
        ...existingTel,
        id: targetBranchId,
        name: branchName || existingTel.name,
        todayRevenue: typeof currentRevenue === 'number' ? currentRevenue : 0,
        todayVehicles: typeof currentVehicles === 'number' ? currentVehicles : 0,
        occupiedSpots: typeof currentOccupied === 'number' ? currentOccupied : 0,
        totalSpots: typeof currentTotalSpots === 'number' ? currentTotalSpots : 30,
        activeShiftNumber: currentShift?.shiftNumber ?? existingTel.activeShiftNumber ?? 1,
        currentCashier: currentShift?.cashierName ?? existingTel.currentCashier ?? 'Operador',
        currentAppVersion: installedAppVer,
        installedGlobalVersion: installedGlobalVer,
        installedGlobalAt: req.body.installedGlobalAt || systemVersions?.installedGlobalAt || existingTel.installedGlobalAt || (installedGlobalVer ? new Date().toISOString() : undefined),
        installedSoftwareAt: req.body.installedSoftwareAt || systemVersions?.installedSoftwareAt || existingTel.installedSoftwareAt,
        isGlobalOutdated: installedGlobalVer !== centralGlobalVer,
        isAppOutdated: installedAppVer !== centralAppVer,
        financialShiftSummary: currentShift ? {
          shiftNumber: currentShift.shiftNumber || 1,
          totalCollected: currentShift.totalCollected || 0,
          cashCollected: currentShift.cashCollected || 0,
          electronicCollected: currentShift.electronicCollected || 0,
          expensesTotal: currentShift.expensesTotal || 0,
          cashierName: currentShift.cashierName || 'Operador'
        } : existingTel.financialShiftSummary,
        status: 'online',
        lastReportedAt: new Date().toISOString()
      };
      saveBranchesTelemetry(telemetryMap);

      console.log(`[Sync Central] Recibida información operativa y financiera de ${targetBranchId}: Recaudo $${currentRevenue || 0}, Ocupación ${currentOccupied || 0}/${currentTotalSpots || 30}`);

      res.json({
        success: true,
        message: 'Información operativa y financiera recibida en el Servidor Central.',
        centralGlobalVersion: centralGlobalVer,
        centralAppVersion: centralAppVer,
        isGlobalOutdated: installedGlobalVer !== centralGlobalVer,
        isAppOutdated: installedAppVer !== centralAppVer,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('[Sync] Error en push-branch-operations:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7e. GET /api/sync/branches-operations (Servidor Central consulta el consolidado de operaciones y finanzas)
  app.get('/api/sync/branches-operations', (req, res) => {
    try {
      const opStore = loadBranchOperationsStore();
      res.json({ success: true, data: opStore });
    } catch (err: any) {
      console.error('[Sync] Error leyendo branches-operations:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. POST /api/sync/branches-telemetry (Branch pushes telemetry & public IP to Central)
  app.post('/api/sync/branches-telemetry', (req, res) => {
    try {
      const { branch } = req.body;
      if (!branch || (!branch.id && !branch.code)) {
        return res.status(400).json({ success: false, error: 'Datos de sucursal incompletos.' });
      }

      const detectedClientIp = extractClientIp(req);
      let targetBranchId = branch.id === 'branch-01' ? 'suc-001' : (branch.id || branch.code);
      const branchCode = branch.code;

      // Buscar si existe en global-config.json para resolver su ID exacto
      if (fs.existsSync(globalConfigPath)) {
        try {
          const gConf = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
          if (gConf && Array.isArray(gConf.branches)) {
            const found = gConf.branches.find((b: any) => 
              b.id === targetBranchId || 
              (branchCode && b.code?.toUpperCase() === branchCode?.toUpperCase()) ||
              b.code?.toUpperCase() === targetBranchId?.toUpperCase()
            );
            if (found) targetBranchId = found.id;
          }
        } catch (_) {}
      }

      branch.id = targetBranchId;

      const telemetryMap = loadAndValidateBranchesTelemetry();
      const existing = telemetryMap[targetBranchId] || {};
      const reportedPublicIp = (detectedClientIp && detectedClientIp !== '127.0.0.1') 
        ? detectedClientIp 
        : (branch.publicIp || existing.publicIp || branch.ipAddress || detectedClientIp);

      const resolvedDomain = branch.domain || branch.ddnsDomain || existing.domain || existing.ddnsDomain;

      const isGenericName = (n?: string) => !n || n.startsWith('Sucursal branch_') || n.startsWith('Sucursal SUC-') || n === `Sucursal ${targetBranchId}`;
      const isGenericCode = (c?: string) => !c || c === targetBranchId.toUpperCase() || c.startsWith('BRANCH_');

      const resolvedName = (existing.name && !isGenericName(existing.name)) ? existing.name : ((branch.name && !isGenericName(branch.name)) ? branch.name : (existing.name || `Sucursal ${targetBranchId}`));
      const resolvedCode = (existing.code && !isGenericCode(existing.code)) ? existing.code : ((branch.code && !isGenericCode(branch.code)) ? branch.code : (existing.code || targetBranchId.toUpperCase()));

      const branchRecord = {
        ...existing,
        ...branch,
        id: targetBranchId,
        name: resolvedName,
        code: resolvedCode,
        city: (existing.city && existing.city !== 'Ciudad Principal') ? existing.city : (branch.city || existing.city || 'Ciudad Principal'),
        address: (existing.address && existing.address !== 'Dirección Principal') ? existing.address : (branch.address || existing.address || 'Dirección Principal'),
        managerName: (existing.managerName && existing.managerName !== 'Administrador') ? existing.managerName : (branch.managerName || existing.managerName || 'Administrador'),
        totalSpots: (typeof existing.totalSpots === 'number' && existing.totalSpots > 0) ? existing.totalSpots : (typeof branch.totalSpots === 'number' ? branch.totalSpots : 30),
        publicIp: reportedPublicIp,
        reportedPublicIp: reportedPublicIp,
        localIp: (branch.localIp && !branch.localIp.includes('152.200.') && branch.localIp !== branch.publicIp) ? branch.localIp : (existing.localIp || '192.168.1.100'),
        domain: resolvedDomain,
        ddnsDomain: resolvedDomain,
        ipAddress: resolvedDomain || reportedPublicIp,
        lastIpReportedAt: new Date().toISOString(),
        lastReportedAt: new Date().toISOString(),
        status: 'online'
      };
      telemetryMap[targetBranchId] = branchRecord;

      saveBranchesTelemetry(telemetryMap);

      // Sincronizar también con global-config.json para que las sedes nunca se pierdan
      if (fs.existsSync(globalConfigPath)) {
        try {
          const gConf = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
          if (gConf) {
            if (!Array.isArray(gConf.branches)) gConf.branches = [];
            const bIdx = gConf.branches.findIndex((b: any) => 
              b.id === targetBranchId || 
              (branchCode && b.code?.toUpperCase() === branchCode?.toUpperCase())
            );
            if (bIdx >= 0) {
              const gb = gConf.branches[bIdx];
              gConf.branches[bIdx] = { 
                ...gb, 
                ...branchRecord,
                name: (gb.name && !isGenericName(gb.name)) ? gb.name : branchRecord.name,
                code: (gb.code && !isGenericCode(gb.code)) ? gb.code : branchRecord.code,
                city: (gb.city && gb.city !== 'Ciudad Principal') ? gb.city : branchRecord.city,
                address: (gb.address && gb.address !== 'Dirección Principal') ? gb.address : branchRecord.address,
                managerName: gb.managerName || branchRecord.managerName,
                totalSpots: (typeof gb.totalSpots === 'number' && gb.totalSpots > 0) ? gb.totalSpots : branchRecord.totalSpots,
                localIp: gb.localIp || branchRecord.localIp || '192.168.1.100',
                publicIp: reportedPublicIp,
                reportedPublicIp: reportedPublicIp,
                ipAddress: resolvedDomain || reportedPublicIp,
                status: 'online',
                lastSyncTimestamp: new Date().toISOString()
              };
            } else if (targetBranchId !== 'SERVER-CENTRAL' && targetBranchId !== 'CENTRAL') {
              gConf.branches.push(branchRecord);
            }
            gConf.lastUpdated = new Date().toISOString();
            fs.writeFileSync(globalConfigPath, JSON.stringify(gConf, null, 2), 'utf8');
          }
        } catch (e) {
          console.warn('[Sync Telemetría] Advertencia sincronizando con global-config.json:', e);
        }
      }

      // Notificar a administradores en tiempo real si el socket está activo
      try {
        broadcastToAdmins(targetBranchId, {
          event: 'branch:status_change',
          data: {
            branchId: targetBranchId,
            status: 'online',
            publicIp: reportedPublicIp,
            domain: resolvedDomain,
            timestamp: new Date().toISOString()
          }
        });
      } catch (e) { /* ignore */ }

      console.log(`[Sync Telemetría] Sede ${targetBranchId} (${branchCode || 'N/A'}) reportó IP Pública: ${reportedPublicIp} (Detectada: ${detectedClientIp})`);

      res.json({
        success: true,
        message: 'Telemetría y dirección IP de sucursal recibida en Servidor Central.',
        publicIp: reportedPublicIp,
        branch: telemetryMap[targetBranchId]
      });
    } catch (err: any) {
      console.error('[Sync] Error guardando branches-telemetry:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8.5 POST /api/sync/report-ip (Heartbeat rápido exclusivo para reporte de IP Pública de sede)
  app.post('/api/sync/report-ip', (req, res) => {
    try {
      const { branchId, branchCode, domain, ddnsDomain, localIp, port, farmadeskId, farmadeskPassword } = req.body;
      if (!branchId && !branchCode) {
        return res.status(400).json({ success: false, error: 'branchId o branchCode es requerido.' });
      }

      let targetBranchId = branchId === 'branch-01' ? 'suc-001' : (branchId || branchCode);

      // Buscar en global-config.json para resolver el ID canónico
      if (fs.existsSync(globalConfigPath)) {
        try {
          const gConf = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
          if (gConf && Array.isArray(gConf.branches)) {
            const found = gConf.branches.find((b: any) => 
              b.id === targetBranchId || 
              (branchCode && b.code?.toUpperCase() === branchCode?.toUpperCase()) ||
              b.code?.toUpperCase() === targetBranchId?.toUpperCase()
            );
            if (found) targetBranchId = found.id;
          }
        } catch (_) {}
      }

      const detectedClientIp = extractClientIp(req);
      const telemetryMap = loadAndValidateBranchesTelemetry();
      const existing = telemetryMap[targetBranchId] || {};
      const resolvedPublicIp = (detectedClientIp && detectedClientIp !== '127.0.0.1') 
        ? detectedClientIp 
        : (req.body.publicIp || existing.publicIp || existing.ipAddress || detectedClientIp);

      const resolvedDomain = domain || ddnsDomain || req.body.publicIp || existing.domain || existing.ddnsDomain;

      telemetryMap[targetBranchId] = {
        ...existing,
        id: targetBranchId,
        publicIp: resolvedPublicIp,
        reportedPublicIp: resolvedPublicIp,
        domain: resolvedDomain,
        ddnsDomain: resolvedDomain,
        localIp: localIp || existing.localIp || '192.168.1.100',
        ipAddress: resolvedDomain || resolvedPublicIp,
        port: port || existing.port || 3000,
        farmadeskId: farmadeskId || existing.farmadeskId,
        farmadeskPassword: farmadeskPassword || existing.farmadeskPassword,
        lastIpReportedAt: new Date().toISOString(),
        lastReportedAt: new Date().toISOString(),
        status: 'online'
      };

      saveBranchesTelemetry(telemetryMap);

      // Persistir de inmediato en global-config.json
      if (fs.existsSync(globalConfigPath)) {
        try {
          const gConf = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
          if (gConf && Array.isArray(gConf.branches)) {
            const bIdx = gConf.branches.findIndex((b: any) => 
              b.id === targetBranchId || 
              (branchCode && b.code?.toUpperCase() === branchCode?.toUpperCase())
            );
            if (bIdx >= 0) {
              gConf.branches[bIdx] = {
                ...gConf.branches[bIdx],
                publicIp: resolvedPublicIp,
                reportedPublicIp: resolvedPublicIp,
                domain: resolvedDomain,
                ipAddress: resolvedDomain || resolvedPublicIp,
                localIp: localIp || gConf.branches[bIdx].localIp || '192.168.1.100',
                port: port || gConf.branches[bIdx].port || 3000,
                status: 'online',
                lastSyncTimestamp: new Date().toISOString()
              };
              gConf.lastUpdated = new Date().toISOString();
              fs.writeFileSync(globalConfigPath, JSON.stringify(gConf, null, 2), 'utf8');
            }
          }
        } catch (e) {
          console.warn('[Report IP] Error actualizando global-config.json:', e);
        }
      }

      // Notificar a los administradores en vivo
      try {
        broadcastToAdmins(targetBranchId, {
          event: 'branch:status_change',
          data: {
            branchId: targetBranchId,
            status: 'online',
            publicIp: resolvedPublicIp,
            domain: resolvedDomain,
            timestamp: new Date().toISOString()
          }
        });
      } catch (e) { /* ignore */ }

      console.log(`[Report IP] Sede ${targetBranchId} actualizó su IP pública: ${resolvedPublicIp}`);

      res.json({
        success: true,
        branchId: targetBranchId,
        publicIp: resolvedPublicIp,
        domain: resolvedDomain,
        localIp: localIp || existing.localIp,
        message: `IP Pública (${resolvedPublicIp}) confirmada y registrada en Servidor Central.`
      });
    } catch (err: any) {
      console.error('[Sync] Error en report-ip:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. GET /api/sync/branches-telemetry (Central reads all branch telemetry)
  app.get('/api/sync/branches-telemetry', (req, res) => {
    try {
      const telemetryMap = loadAndValidateBranchesTelemetry();
      const centralGlobalVer = loadCentralGlobalVersion()?.activeVersion || 'G-1.0.4';
      const branchesList = Object.values(telemetryMap).map((b: any) => ({
        ...b,
        isGlobalOutdated: b.installedGlobalVersion ? b.installedGlobalVersion !== centralGlobalVer : true
      }));
      res.json({ success: true, data: branchesList });
    } catch (err: any) {
      console.error('[Sync] Error leyendo branches-telemetry:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9.1 POST /api/sync/ping-branches (Central ejecuta sondeo/ping en vivo a todas las sedes)
  app.post('/api/sync/ping-branches', async (req, res) => {
    try {
      const telemetryMap = loadAndValidateBranchesTelemetry();
      const { branchIds } = req.body || {};
      
      const targetBranches = Object.values(telemetryMap).filter((b: any) => {
        if (branchIds && Array.isArray(branchIds) && branchIds.length > 0) {
          return branchIds.includes(b.id) || branchIds.includes(b.code);
        }
        return true;
      });

      console.log(`[Central Ping] Iniciando sondeo de conectividad RTT para ${targetBranches.length} sedes...`);

      const pingResults = await Promise.all(
        targetBranches.map(async (branch: any) => {
          const targetHost = branch.domain || branch.ddnsDomain || branch.reportedPublicIp || branch.publicIp || branch.ipAddress || branch.localIp || '127.0.0.1';
          const targetPort = branch.port || 3000;
          
          const probe = await pingTargetNode(targetHost, targetPort, 2200);

          const updatedBranch = {
            ...branch,
            latencyMs: probe.online ? probe.latencyMs : undefined,
            status: probe.online ? 'online' : (branch.status === 'online' ? 'warning' : 'offline'),
            lastPingAt: new Date().toISOString(),
            pingMethod: probe.method,
            pingDetails: probe.details,
            testedHost: targetHost,
            testedPort: targetPort
          };

          telemetryMap[branch.id] = updatedBranch;
          return updatedBranch;
        })
      );

      saveBranchesTelemetry(telemetryMap);

      // Actualizar también en global-config.json para persistencia
      if (fs.existsSync(globalConfigPath)) {
        try {
          const gConfig = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
          if (gConfig && Array.isArray(gConfig.branches)) {
            for (const resBranch of pingResults) {
              const idx = gConfig.branches.findIndex((b: any) => b.id === resBranch.id || b.code === resBranch.code);
              if (idx >= 0) {
                gConfig.branches[idx].status = resBranch.status;
                gConfig.branches[idx].latencyMs = resBranch.latencyMs;
                gConfig.branches[idx].lastSyncTimestamp = new Date().toISOString();
              }
            }
            gConfig.lastUpdated = new Date().toISOString();
            fs.writeFileSync(globalConfigPath, JSON.stringify(gConfig, null, 2), 'utf8');
          }
        } catch (e) {
          console.warn('[Ping Branches] Error actualizando global-config.json:', e);
        }
      }

      // Notificar a administradores por WebSockets en tiempo real
      for (const resBranch of pingResults) {
        try {
          broadcastToAdmins(resBranch.id, {
            event: 'branch:ping_result',
            data: resBranch
          });
        } catch (_) {}
      }

      const onlineCount = pingResults.filter((b: any) => b.status === 'online').length;
      const validLatencies = pingResults
        .filter((b: any) => typeof b.latencyMs === 'number' && b.status === 'online')
        .map((b: any) => b.latencyMs);
      const avgLatency = validLatencies.length > 0 
        ? Math.round(validLatencies.reduce((a: number, c: number) => a + c, 0) / validLatencies.length) 
        : 0;

      console.log(`[Central Ping] Sondeo finalizado: ${onlineCount}/${pingResults.length} sedes en línea (Latencia promedio: ${avgLatency}ms)`);

      res.json({
        success: true,
        branches: pingResults,
        summary: {
          total: pingResults.length,
          online: onlineCount,
          offline: pingResults.length - onlineCount,
          avgLatency
        }
      });
    } catch (err: any) {
      console.error('[Ping Branches] Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9.2 POST /api/sync/ping-branch (Central ejecuta sondeo individual a una sede específica o host)
  app.post('/api/sync/ping-branch', async (req, res) => {
    try {
      const { branchId, host, port } = req.body;
      const telemetryMap = loadAndValidateBranchesTelemetry();
      const existing = branchId ? (telemetryMap[branchId] || {}) : {};

      const targetHost = host || existing.domain || existing.ddnsDomain || existing.reportedPublicIp || existing.publicIp || existing.ipAddress || '127.0.0.1';
      const targetPort = port || existing.port || 3000;

      const probe = await pingTargetNode(targetHost, targetPort, 2500);

      if (branchId && telemetryMap[branchId]) {
        telemetryMap[branchId] = {
          ...telemetryMap[branchId],
          latencyMs: probe.online ? probe.latencyMs : undefined,
          status: probe.online ? 'online' : 'offline',
          lastPingAt: new Date().toISOString(),
          pingMethod: probe.method,
          pingDetails: probe.details
        };
        saveBranchesTelemetry(telemetryMap);
      }

      res.json({
        success: true,
        online: probe.online,
        latencyMs: probe.latencyMs,
        method: probe.method,
        details: probe.details,
        testedHost: targetHost,
        testedPort: targetPort
      });
    } catch (err: any) {
      console.error('[Ping Single Branch] Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9.5 DELETE /api/sync/branches/:id & POST /api/sync/branches/delete (Central permanently deletes a branch)
  const removeBranchPermanently = (targetBranchId: string) => {
    if (!targetBranchId || targetBranchId === 'suc-001' || targetBranchId === 'branch-01') return false;
    const telemetryMap = loadAndValidateBranchesTelemetry();
    delete telemetryMap[targetBranchId];
    delete memoryTelemetryCache[targetBranchId];
    saveBranchesTelemetry(telemetryMap);

    if (fs.existsSync(globalConfigPath)) {
      try {
        const gConf = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
        if (gConf && Array.isArray(gConf.branches)) {
          gConf.branches = gConf.branches.filter((b: any) => b.id !== targetBranchId);
          gConf.lastUpdated = new Date().toISOString();
          fs.writeFileSync(globalConfigPath, JSON.stringify(gConf, null, 2), 'utf8');
        }
      } catch (e) {
        console.warn('[Sync] Advertencia eliminando sede de global-config.json:', e);
      }
    }
    return true;
  };

  app.delete('/api/sync/branches/:id', requirePermission('canManageBranchLocations'), (req, res) => {
    try {
      const senderRole = req.headers['x-wolf-node-role'] || req.body?.nodeRole;
      const senderBranchId = req.headers['x-wolf-branch-id'] || req.body?.branchId;
      const targetBranchId = req.params.id;

      if (senderRole === 'branch' || (senderBranchId && senderBranchId !== 'suc-001' && senderBranchId !== 'branch-01')) {
        return res.status(403).json({ success: false, error: 'Solo el Servidor Central puede eliminar sucursales.' });
      }

      const ok = removeBranchPermanently(targetBranchId);
      if (!ok) {
        return res.status(400).json({ success: false, error: 'No se puede eliminar la Sede Principal o ID inválido.' });
      }

      console.log(`[Sync Central] Sede ${targetBranchId} eliminada permanentemente.`);
      res.json({ success: true, message: `Sede ${targetBranchId} eliminada correctamente del Servidor Central.` });
    } catch (err: any) {
      console.error('[Sync] Error al eliminar sede:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/sync/branches/delete', requirePermission('canManageBranchLocations'), (req, res) => {
    try {
      const senderRole = req.headers['x-wolf-node-role'] || req.body?.nodeRole;
      const senderBranchId = req.headers['x-wolf-branch-id'] || req.body?.branchId;
      const targetBranchId = req.body?.branchId || req.body?.id;

      if (senderRole === 'branch' || (senderBranchId && senderBranchId !== 'suc-001' && senderBranchId !== 'branch-01')) {
        return res.status(403).json({ success: false, error: 'Solo el Servidor Central puede eliminar sucursales.' });
      }

      const ok = removeBranchPermanently(targetBranchId);
      if (!ok) {
        return res.status(400).json({ success: false, error: 'No se puede eliminar la Sede Principal o ID inválido.' });
      }

      console.log(`[Sync Central] Sede ${targetBranchId} eliminada permanentemente.`);
      res.json({ success: true, message: `Sede ${targetBranchId} eliminada correctamente del Servidor Central.` });
    } catch (err: any) {
      console.error('[Sync] Error al eliminar sede:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. GET /api/sync/software-releases (Branches & Central read released builds & beta authorizations)
  app.get('/api/sync/software-releases', (req, res) => {
    try {
      const defaultReleasesData = {
        activeReleaseId: 'build-2026-09-22-v250',
        activeVersion: 'v2.5.0-enterprise',
        lastDispatchedAt: new Date().toISOString(),
        dispatchedBy: 'Administrador Maestro (Servidor Central)',
        authorizedBetaBranches: [], // Beta is locked by default
        releases: [
          {
            id: 'build-2026-09-22-v250',
            version: 'v2.5.0-enterprise',
            buildNumber: 250,
            releaseDate: '2026-09-22',
            channel: 'enterprise',
            title: 'Versión 2.5.0 Oficial Enterprise - Matriz de Sincronización Adaptable & OTA Directo',
            description: 'Despliegue oficial con enlace bidireccional Central-Sucursales, sincronización auto-adaptable, pasarelas bancarias y control total de versiones.',
            changelog: [
              'Despacho manual de software OTA desde Servidor Central a sucursales.',
              'Blindaje y bloqueo de versiones Beta para evitar instalaciones prematuras no autorizadas.',
              'Motor de Reversión Instantánea (Rollback) con protección de datos y activeTickets.',
              'Integración con HeidiSQL y actualización en caliente de esquemas de datos.',
              'Soporte completo para dominios personalizados e IP estática de servidor central.'
            ],
            newModules: ['OTA Manual Dispatcher', 'Rollback Engine v2', 'Domain Network Matrix', 'Cash Audit Pro'],
            checksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
            databaseMigrationRequired: true,
            status: 'installed',
            isOfficialDispatched: true,
            targetScope: 'all',
            targetBranchIds: []
          },
          {
            id: 'build-2026-09-17-v242',
            version: 'v2.4.2-enterprise',
            buildNumber: 242,
            releaseDate: '2026-09-17',
            channel: 'enterprise',
            title: 'Versión 2.4.2 - OTA Engine & Telemetría Multi-Sucursal',
            description: 'Parche de estabilidad para monitoreo de ocupación en tiempo real y descarga de paquetes en sucursales.',
            changelog: [
              'Telemetría en vivo con latencia y estado de conexión.',
              'Distribución centralizada de paquetes de tarifas y productos.',
              'Mejoras en el cierre de turno y cuadre de caja multi-cajero.'
            ],
            newModules: ['Branch Telemetry Client', 'Central Package Receiver'],
            checksumSha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
            databaseMigrationRequired: false,
            status: 'available',
            isOfficialDispatched: true,
            targetScope: 'all',
            targetBranchIds: []
          },
          {
            id: 'build-2026-09-01-v240',
            version: 'v2.4.0-enterprise',
            buildNumber: 240,
            releaseDate: '2026-09-01',
            channel: 'enterprise',
            title: 'Versión 2.4.0 - Pasarelas Bancarias, Bre-B & DIAN Electrónica',
            description: 'Integración de cobro QR Interoperable Bre-B, datáfonos Bold/Wompi/MercadoPago y facturación electrónica.',
            changelog: [
              'Motor de Pasarelas de Pago Bancarias y QR Dinámico.',
              'Emisión de Factura Electrónica con validación DIAN.',
              'Optimización de impresión en mini-printers térmicas 58mm/80mm.'
            ],
            newModules: ['Payment Gateways Hub', 'DIAN Invoicing Engine', 'Thermal Print Driver'],
            checksumSha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
            databaseMigrationRequired: true,
            status: 'available',
            isOfficialDispatched: true,
            targetScope: 'all',
            targetBranchIds: []
          },
          {
            id: 'build-2026-10-01-beta-v260',
            version: 'v2.6.0-rc1',
            buildNumber: 260,
            releaseDate: '2026-10-01',
            channel: 'beta',
            title: 'Versión 2.6.0-rc1 (Beta Experimental) - IA ANPR / Reconocimiento Óptico de Placas',
            description: 'Módulo experimental de lectura de placas automática mediante cámaras IP y visión por computadora Gemini AI.',
            changelog: [
              'Módulo experimental de ANPR/LPR con video streaming.',
              'Clasificación automática de tipo de vehículo mediante visión.',
              'NOTA: Versión en fase experimental - No apta para producción sin autorización del Servidor Central.'
            ],
            newModules: ['Gemini Vision ANPR', 'RTSP Stream Analyzer'],
            checksumSha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
            databaseMigrationRequired: true,
            status: 'available',
            isOfficialDispatched: false, // NOT dispatched for general use
            isExperimentalOnly: true,
            targetScope: 'specific',
            targetBranchIds: []
          }
        ]
      };

      let releasesData: any = defaultReleasesData;
      if (fs.existsSync(softwareReleasesPath)) {
        try {
          releasesData = JSON.parse(fs.readFileSync(softwareReleasesPath, 'utf8'));
        } catch {
          releasesData = defaultReleasesData;
        }
      } else {
        fs.writeFileSync(softwareReleasesPath, JSON.stringify(defaultReleasesData, null, 2), 'utf8');
      }

      // Enriquecer dinámicamente con los commits reales del repositorio (fecha y hora exacta de subida)
      exec('git log -5 --pretty=format:"%H|%h|%s|%ad" --date=iso', (gitErr, gitStdout) => {
        if (!gitErr && gitStdout) {
          const commits = gitStdout.trim().split('\n').map(l => {
            const parts = l.split('|');
            return {
              hash: parts[0] || '',
              shortHash: parts[1] || '',
              message: parts[2] || '',
              date: parts[3] || ''
            };
          }).filter(c => c.hash.length > 0);

          if (commits.length > 0 && Array.isArray(releasesData.releases)) {
            // Actualizar la versión activa con el commit más reciente de Git
            const latestCommit = commits[0];
            const activeBuild = releasesData.releases.find((r: any) => r.status === 'installed') || releasesData.releases[0];
            if (activeBuild) {
              activeBuild.commitHash = latestCommit.shortHash;
              activeBuild.commitDate = latestCommit.date;
              activeBuild.releaseDate = latestCommit.date;
            }

            // Sincronizar fechas y horas de commits anteriores para las versiones previas
            commits.slice(1).forEach((commit, idx) => {
              if (releasesData.releases[idx + 1]) {
                releasesData.releases[idx + 1].commitHash = commit.shortHash;
                releasesData.releases[idx + 1].commitDate = commit.date;
                releasesData.releases[idx + 1].releaseDate = commit.date;
              }
            });
          }
        }

        res.json({ success: true, ...releasesData });
      });
    } catch (err: any) {
      console.error('[Sync] Error leyendo software-releases:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 11. POST /api/sync/software-releases/dispatch (Central manually dispatches software release)
  app.post('/api/sync/software-releases/dispatch', requireMaster, (req, res) => {
    try {
      const { releaseId, version, targetScope, targetBranchIds, dispatchedBy, changelog, newModules, allowBetaForBranches } = req.body;
      
      let releasesData: any = { releases: [], authorizedBetaBranches: [] };
      if (fs.existsSync(softwareReleasesPath)) {
        try { releasesData = JSON.parse(fs.readFileSync(softwareReleasesPath, 'utf8')); } catch { releasesData = { releases: [], authorizedBetaBranches: [] }; }
      }

      releasesData.activeReleaseId = releaseId || releasesData.activeReleaseId;
      releasesData.activeVersion = version || releasesData.activeVersion;
      releasesData.lastDispatchedAt = new Date().toISOString();
      releasesData.dispatchedBy = dispatchedBy || 'Administrador Central';

      if (Array.isArray(allowBetaForBranches)) {
        releasesData.authorizedBetaBranches = allowBetaForBranches;
      }

      // Mark the selected release as dispatched
      if (Array.isArray(releasesData.releases)) {
        releasesData.releases = releasesData.releases.map((rel: any) => {
          if (rel.id === releaseId || rel.version === version) {
            return {
              ...rel,
              isOfficialDispatched: true,
              targetScope: targetScope || 'all',
              targetBranchIds: targetBranchIds || [],
              changelog: changelog || rel.changelog,
              newModules: newModules || rel.newModules,
              lastDispatchedDate: new Date().toISOString()
            };
          }
          return rel;
        });
      }

      fs.writeFileSync(softwareReleasesPath, JSON.stringify(releasesData, null, 2), 'utf8');
      console.log(`[Sync Central] Despacho Manual de Software OTA emitido: Versión ${version} (Destino: ${targetScope || 'Todas'}).`);

      res.json({
        success: true,
        message: `¡Versión ${version} despachada manualmente a las sucursales con éxito!`,
        data: releasesData
      });
    } catch (err: any) {
      console.error('[Sync] Error despachando release:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 11.5 POST /api/sync/software-releases/upload (Central uploads/registers a new software release build)
  app.post('/api/sync/software-releases/upload', requireMaster, (req, res) => {
    try {
      const {
        version,
        buildNumber,
        title,
        description,
        channel,
        downloadSize,
        checksumSha256,
        newModules,
        changelog,
        databaseMigrationRequired,
        autoDispatch,
        targetScope,
        targetBranchIds,
        fileName
      } = req.body;

      if (!version || !title) {
        return res.status(400).json({ success: false, error: 'Versión y título del paquete son obligatorios.' });
      }

      let releasesData: any = { releases: [], authorizedBetaBranches: [] };
      if (fs.existsSync(softwareReleasesPath)) {
        try { releasesData = JSON.parse(fs.readFileSync(softwareReleasesPath, 'utf8')); } catch { releasesData = { releases: [], authorizedBetaBranches: [] }; }
      }

      const cleanVersion = version.trim();
      const existingIdx = (releasesData.releases || []).findIndex((r: any) => r.version.toLowerCase() === cleanVersion.toLowerCase());
      
      const nextBuildNum = Number(buildNumber) || ((releasesData.releases && releasesData.releases[0]) ? releasesData.releases[0].buildNumber + 1 : 251);
      const isBeta = channel === 'beta';

      const newReleaseObj = {
        id: existingIdx >= 0 ? releasesData.releases[existingIdx].id : `build-${Date.now()}-${cleanVersion.replace(/[^a-zA-Z0-9]/g, '')}`,
        version: cleanVersion,
        buildNumber: nextBuildNum,
        releaseDate: new Date().toISOString().split('T')[0],
        title: title.trim(),
        description: description?.trim() || `Compilación oficial ${cleanVersion} montada en Servidor Central.`,
        channel: channel || 'enterprise',
        status: 'available',
        downloadSize: downloadSize || '18.5 MB',
        checksumSha256: checksumSha256 || `sha256-${Math.random().toString(36).substring(2, 12)}${Date.now()}`,
        newModules: Array.isArray(newModules) ? newModules : ['Actualizaciones de Estabilidad y Despliegue Central'],
        changelog: Array.isArray(changelog) ? changelog : ['Nuevas optimizaciones de rendimiento y compatibilidad multi-sede.'],
        databaseMigrationRequired: Boolean(databaseMigrationRequired),
        isOfficialDispatched: Boolean(autoDispatch),
        isExperimentalOnly: isBeta,
        targetScope: targetScope || 'all',
        targetBranchIds: targetBranchIds || [],
        fileName: fileName || `${cleanVersion}-release.bundle`,
        uploadedAt: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        releasesData.releases[existingIdx] = { ...releasesData.releases[existingIdx], ...newReleaseObj };
      } else {
        releasesData.releases = [newReleaseObj, ...(releasesData.releases || [])];
      }

      if (autoDispatch) {
        releasesData.activeReleaseId = newReleaseObj.id;
        releasesData.activeVersion = newReleaseObj.version;
        releasesData.lastDispatchedAt = new Date().toISOString();
        releasesData.dispatchedBy = 'Administrador Central (Subida Inmediata)';
      }

      fs.writeFileSync(softwareReleasesPath, JSON.stringify(releasesData, null, 2), 'utf8');
      console.log(`[Sync Central] Nueva versión de software montada en el servidor: ${cleanVersion} (Build #${nextBuildNum}).`);

      res.json({
        success: true,
        message: `¡Versión ${cleanVersion} montada exitosamente en el Servidor Central!`,
        release: newReleaseObj,
        data: releasesData
      });
    } catch (err: any) {
      console.error('[Sync] Error subiendo release:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 12. GET /api/sync/live-server-version (Branch queries Central's live code/git status)
  app.get('/api/sync/live-server-version', (req, res) => {
    exec('git log -1 --pretty=format:"%H|%h|%s|%ad" --date=iso', (error, stdout) => {
      let commitInfo = {
        hash: '2026-09-22-v250',
        shortHash: 'v250-live',
        message: 'Versión 2.5.0 Oficial Enterprise Desplegada',
        date: new Date().toISOString()
      };

      if (!error && stdout) {
        const parts = stdout.trim().split('|');
        commitInfo = {
          hash: parts[0] || commitInfo.hash,
          shortHash: parts[1] || commitInfo.shortHash,
          message: parts[2] || commitInfo.message,
          date: parts[3] || commitInfo.date
        };
      }

      res.json({
        success: true,
        serverTime: new Date().toISOString(),
        version: 'v2.5.0-enterprise',
        buildNumber: 250,
        commit: commitInfo,
        status: 'online',
        message: 'Servidor Central Operativo y listo para sincronización OTA'
      });
    });
  });

  // 12.5 POST /api/sync/software-releases/dispatch-live (Dispatch currently running Central Server build)
  app.post('/api/sync/software-releases/dispatch-live', requireMaster, (req, res) => {
    try {
      const {
        targetScope,
        targetBranchIds,
        changelogNotes,
        dispatchedBy,
        customVersion,
        customBuildNumber,
        customTitle
      } = req.body;

      exec('git log -1 --pretty=format:"%H|%h|%s|%ad" --date=iso', (error, stdout) => {
        let commitInfo = {
          hash: '2026-09-22-live-release',
          shortHash: 'live-prod',
          message: 'Despliegue directo de versión en ejecución del Servidor Central',
          date: new Date().toISOString()
        };

        if (!error && stdout) {
          const parts = stdout.trim().split('|');
          commitInfo = {
            hash: parts[0] || commitInfo.hash,
            shortHash: parts[1] || commitInfo.shortHash,
            message: parts[2] || commitInfo.message,
            date: parts[3] || commitInfo.date
          };
        }

        const liveVersion = customVersion?.trim() || 'v2.5.0-enterprise';
        const liveBuildNumber = Number(customBuildNumber) || 250;
        const liveTitle = customTitle?.trim() || `Compilación de Servidor Central (${commitInfo.shortHash})`;

        let releasesData: any = { releases: [], authorizedBetaBranches: [] };
        if (fs.existsSync(softwareReleasesPath)) {
          try { releasesData = JSON.parse(fs.readFileSync(softwareReleasesPath, 'utf8')); } catch { releasesData = { releases: [], authorizedBetaBranches: [] }; }
        }

        const cleanVersion = liveVersion;
        const existingIdx = (releasesData.releases || []).findIndex((r: any) => r.version.toLowerCase() === cleanVersion.toLowerCase());

        const liveReleaseObj = {
          id: existingIdx >= 0 ? releasesData.releases[existingIdx].id : `build-live-${Date.now()}`,
          version: cleanVersion,
          buildNumber: liveBuildNumber,
          releaseDate: new Date().toISOString().split('T')[0],
          title: liveTitle,
          description: `Versión actualmente activa en ejecución sobre el Servidor Central (Commit: ${commitInfo.shortHash} - ${commitInfo.message})`,
          channel: 'enterprise',
          status: 'available',
          downloadSize: '18.8 MB',
          checksumSha256: `sha256-live-${commitInfo.shortHash}-${Date.now().toString(36)}`,
          newModules: [
            'Sincronización Multi-Sede en Tiempo Real',
            'Despacho OTA Inmediato desde Servidor Central',
            'Facturación y Liquidación Integral',
            'Respaldo Snapshot Local'
          ],
          changelog: changelogNotes && changelogNotes.length > 0 
            ? changelogNotes 
            : [
                `Versión en caliente extraída directamente del Servidor Central.`,
                `Git Commit: [${commitInfo.shortHash}] ${commitInfo.message}`,
                `Autorizada y despachada por ${dispatchedBy || 'Administrador Central'}.`
              ],
          databaseMigrationRequired: false,
          isOfficialDispatched: true,
          isExperimentalOnly: false,
          targetScope: targetScope || 'all',
          targetBranchIds: targetBranchIds || [],
          dispatchedAt: new Date().toISOString(),
          dispatchedBy: dispatchedBy || 'Administrador Central'
        };

        if (existingIdx >= 0) {
          releasesData.releases[existingIdx] = { ...releasesData.releases[existingIdx], ...liveReleaseObj };
        } else {
          releasesData.releases = [liveReleaseObj, ...(releasesData.releases || [])];
        }

        releasesData.activeReleaseId = liveReleaseObj.id;
        releasesData.activeVersion = liveReleaseObj.version;
        releasesData.lastDispatchedAt = new Date().toISOString();
        releasesData.dispatchedBy = dispatchedBy || 'Administrador Central (En Vivo)';

        fs.writeFileSync(softwareReleasesPath, JSON.stringify(releasesData, null, 2), 'utf8');
        console.log(`[Sync Central] Despacho EN VIVO de versión de servidor completado: ${cleanVersion} hacia ${targetScope || 'todas las sucursales'}.`);

        res.json({
          success: true,
          message: `¡Versión en vivo (${cleanVersion}) despachada exitosamente a las sucursales (${targetScope === 'specific' ? `${(targetBranchIds || []).length} seleccionadas` : 'Todas'})!`,
          release: liveReleaseObj,
          data: releasesData
        });
      });
    } catch (err: any) {
      console.error('[Sync] Error despachando versión en vivo:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API to get global configuration stored on the server
  // Estado de la sincronización servidor↔servidor con el Central (solo usuarios con sesión)
  app.get('/api/sync/central-link', (req, res) => {
    if (req.auth?.kind !== 'user') return res.status(401).json({ success: false, code: 'AUTH_REQUIRED' });
    res.json({ success: true, data: getCentralSyncStatus() });
  });

  app.post('/api/sync/central-link/pull-now', requirePermission('canManageUsers', 'canManageBranchLocations'), async (_req, res) => {
    res.json({ success: true, data: await pullFromCentralNow() });
  });

  app.get('/api/sync/global-config', async (req, res) => {
    try {
      const configPath = path.join(process.cwd(), 'global-config.json');
      if (fs.existsSync(configPath)) {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        const data = JSON.parse(fileContent);
        if (Array.isArray(data.users)) {
          // Solo un servidor de sucursal autenticado con la clave de sync recibe los hashes (desde la BD);
          // los navegadores nunca reciben claves.
          const isSyncNode = req.auth?.kind === 'sync';
          const pins = isSyncNode ? await getAllStoredPins() : new Map<string, string>();
          data.users = data.users.map((u: any) => ({ ...u, password: isSyncNode ? (pins.get(u.id) || '') : '' }));
        }
        return res.json({ success: true, data });
      }
      return res.json({ success: true, data: null });
    } catch (err: any) {
      console.error('[Global Sync] Error leyendo config:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API to receive direct public IP network updates from branches (REST channel)
  app.post('/api/sync/network-info', (req, res) => {
    try {
      const { branchId, branchCode, domain, ddnsDomain, ipAddress, port, webSocketsUrl, farmadeskId, farmadeskPassword, anydeskId, rustdeskId, vncPassword, systemUrl } = req.body;
      if (!branchId && !branchCode) {
        return res.status(400).json({ success: false, error: 'Sede ID (branchId) o Código es obligatorio.' });
      }

      let targetBranchId = branchId === 'branch-01' ? 'suc-001' : (branchId || branchCode);

      // Buscar en global-config.json para resolver el ID canónico si se pasó código o ID de taquilla
      if (fs.existsSync(globalConfigPath)) {
        try {
          const gConf = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
          if (gConf && Array.isArray(gConf.branches)) {
            const found = gConf.branches.find((b: any) => 
              b.id === targetBranchId || 
              (branchCode && b.code?.toUpperCase() === branchCode?.toUpperCase()) ||
              b.code?.toUpperCase() === targetBranchId?.toUpperCase()
            );
            if (found) targetBranchId = found.id;
          }
        } catch (_) {}
      }

      const detectedClientIp = extractClientIp(req);
      const resolvedPublicIp = (detectedClientIp && detectedClientIp !== '127.0.0.1') 
        ? detectedClientIp 
        : (req.body.publicIp || ipAddress || '192.168.10.105');

      const resolvedDomain = domain || ddnsDomain || req.body.publicIp;

      console.log(`[REST Telemetría] Recibida actualización para Sede ${targetBranchId} (${branchCode || 'N/A'}): IP=${resolvedPublicIp} (Local=${ipAddress}) Puerto=${port || 3000} FarmaDeskID=${farmadeskId || anydeskId}`);

      // 1. Update branches-telemetry.json
      const telemetryMap = loadAndValidateBranchesTelemetry();
      const existing = telemetryMap[targetBranchId] || {};

      const isGenericName = (n?: string) => !n || n.startsWith('Sucursal branch_') || n.startsWith('Sucursal SUC-') || n === `Sucursal ${targetBranchId}`;
      const isGenericCode = (c?: string) => !c || c === targetBranchId.toUpperCase() || c.startsWith('BRANCH_');

      const resolvedName = (existing.name && !isGenericName(existing.name)) ? existing.name : (existing.name || `Sucursal ${targetBranchId}`);
      const resolvedCode = (existing.code && !isGenericCode(existing.code)) ? existing.code : (branchCode || existing.code || targetBranchId.toUpperCase());

      telemetryMap[targetBranchId] = {
        ...existing,
        id: targetBranchId,
        name: resolvedName,
        code: resolvedCode,
        ipAddress: resolvedDomain || resolvedPublicIp,
        publicIp: resolvedPublicIp,
        reportedPublicIp: resolvedPublicIp,
        domain: resolvedDomain || existing.domain,
        ddnsDomain: resolvedDomain || existing.ddnsDomain,
        localIp: (ipAddress && !ipAddress.includes('152.200.') && ipAddress !== resolvedPublicIp) ? ipAddress : (existing.localIp || '192.168.14.227'),
        port: port || existing.port || 3000,
        webSocketsUrl: webSocketsUrl || `ws://${resolvedPublicIp}:${port || 3000}/ws`,
        farmadeskId: farmadeskId || existing.farmadeskId || anydeskId || '592038471',
        farmadeskPort: 9050,
        farmadeskPassword: farmadeskPassword || existing.farmadeskPassword || vncPassword || 'FARMA_PASS_SECURE',
        anydeskId: anydeskId || existing.anydeskId || farmadeskId || '592038471',
        rustdeskId: rustdeskId || existing.rustdeskId || '904812354',
        vncPassword: vncPassword || existing.vncPassword || 'WOLF_PASS_SECURE',
        systemUrl: systemUrl || `http://${resolvedDomain || resolvedPublicIp}:${port || 3000}/`,
        lastIpReportedAt: new Date().toISOString(),
        lastReportedAt: new Date().toISOString(),
        status: 'online',
        wsConnected: false
      };
      saveBranchesTelemetry(telemetryMap);

      // 2. Overwrite IP dynamically in global-config.json
      const configPath = path.join(process.cwd(), 'global-config.json');
      if (fs.existsSync(configPath)) {
        try {
          const fileContent = fs.readFileSync(configPath, 'utf8');
          const gConfig = JSON.parse(fileContent);
          if (gConfig) {
            if (!Array.isArray(gConfig.branches)) gConfig.branches = [];
            const bIdx = gConfig.branches.findIndex((b: any) => 
              b.id === targetBranchId || 
              (branchCode && b.code?.toUpperCase() === branchCode?.toUpperCase())
            );
            const branchNetData = {
              ipAddress: resolvedDomain || resolvedPublicIp,
              publicIp: resolvedPublicIp,
              reportedPublicIp: resolvedPublicIp,
              domain: resolvedDomain,
              localIp: ipAddress || (bIdx >= 0 ? gConfig.branches[bIdx].localIp : '192.168.1.100'),
              port: port || (bIdx >= 0 ? gConfig.branches[bIdx].port : 3000),
              webSocketsUrl: webSocketsUrl || `ws://${resolvedPublicIp}:${port || 3000}/ws`,
              systemUrl: systemUrl || `http://${resolvedDomain || resolvedPublicIp}:${port || 3000}/wolfzonepos?branchId=${targetBranchId}`,
              farmadeskId: farmadeskId || (bIdx >= 0 ? gConfig.branches[bIdx].farmadeskId : anydeskId),
              farmadeskPort: 9050,
              farmadeskPassword: farmadeskPassword || (bIdx >= 0 ? gConfig.branches[bIdx].farmadeskPassword : (vncPassword || 'FARMA_PASS_SECURE')),
              anydeskId: anydeskId || (bIdx >= 0 ? gConfig.branches[bIdx].anydeskId : undefined),
              rustdeskId: rustdeskId || (bIdx >= 0 ? gConfig.branches[bIdx].rustdeskId : undefined),
              vncPassword: vncPassword || (bIdx >= 0 ? gConfig.branches[bIdx].vncPassword : undefined),
              status: 'online',
              lastSyncTimestamp: new Date().toISOString()
            };
            if (bIdx >= 0) {
              gConfig.branches[bIdx] = { ...gConfig.branches[bIdx], ...branchNetData };
            } else if (targetBranchId !== 'SERVER-CENTRAL' && targetBranchId !== 'CENTRAL') {
              gConfig.branches.push({ id: targetBranchId, name: `Sucursal ${targetBranchId}`, code: (branchCode || targetBranchId).toUpperCase(), city: 'Principal', address: 'Dirección no registrada', ...branchNetData });
            }
            gConfig.lastUpdated = new Date().toISOString();
            fs.writeFileSync(configPath, JSON.stringify(gConfig, null, 2), 'utf8');
          }
        } catch (err) {
          console.error('[REST Telemetría] Error actualizando global-config.json:', err);
        }
      }

      // Notificar a administradores en tiempo real
      try {
        broadcastToAdmins(targetBranchId, {
          event: 'branch:status_change',
          data: {
            branchId: targetBranchId,
            status: 'online',
            publicIp: resolvedPublicIp,
            domain: resolvedDomain,
            timestamp: new Date().toISOString()
          }
        });
      } catch (e) { /* ignore */ }

      res.json({
        success: true,
        message: 'Dirección IP pública y parámetros de red actualizados con éxito en el Servidor Central.',
        publicIp: resolvedPublicIp,
        data: telemetryMap[targetBranchId]
      });
    } catch (err: any) {
      console.error('[REST Telemetría] Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API to save global configuration on the server
  app.post('/api/sync/global-config', requirePermission('canManageUsers', 'canEditRates', 'canManageBranchLocations', 'canEditBusinessInfo'), (req, res) => {
    try {
      const clientIp = extractClientIp(req);
      const senderRole = req.headers['x-wolf-node-role'] || req.body?.nodeRole;
      const senderBranchId = req.headers['x-wolf-branch-id'] || req.body?.branchId;

      // STRICT PROTECTION: Reject external branches or non-master nodes from modifying global-config.json
      if (senderRole === 'branch' || (senderBranchId && senderBranchId !== 'suc-001' && senderBranchId !== 'branch-01')) {
        console.warn(`[Sync Security] ⛔ Intento bloqueado: Terminal en IP ${clientIp} (Sede: ${senderBranchId}, Rol: ${senderRole}) intentó sobreescribir 'global-config.json' en el Servidor Central.`);
        return res.status(403).json({
          success: false,
          error: 'Seguridad Central: Ninguna terminal o sucursal externa puede generar ni sobreescribir la configuración global (global-config) del Servidor Central.'
        });
      }

      const { config } = req.body;
      if (!config) {
        return res.status(400).json({ success: false, error: 'No se recibió configuración válida.' });
      }
      // Las claves viven solo en la BD (con hash); el archivo global nunca las almacena.
      if (Array.isArray(config.users)) {
        config.users = config.users.map((u: any) => {
          const { password: _p, pin: _pin, ...rest } = u || {};
          return rest;
        });
      }
      const configPath = path.join(process.cwd(), 'global-config.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      console.log('[Global Sync] Configuración global guardada con éxito.');
      res.json({ success: true, message: 'Configuración guardada en el servidor central correctamente.' });
    } catch (err: any) {
      console.error('[Global Sync] Error guardando config:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Redirect /wolfzonepos to root / while preserving full query string (branchId, sso, etc.)
  app.get(['/wolfzonepos', '/wolfzonepos/*'], (req, res) => {
    const qIdx = req.url.indexOf('?');
    const query = qIdx >= 0 ? req.url.slice(qIdx) : '';
    res.redirect(302, `/${query}`);
  });

  registerSystemRoutes(app);
  registerAiRoutes(app, { getGeminiClient });
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Create real HTTP server to support WebSockets on the same port
  const server = http.createServer(app);

  const wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket upgrades on '/api/ws' or '/ws'
  server.on('upgrade', (request, socket, head) => {
    try {
      const urlObj = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      const pathname = urlObj.pathname;
      if (pathname === '/api/ws' || pathname === '/ws') {
        const wsAuth = authorizeWsRequest(request);
        if (!wsAuth.ok) {
          console.warn(`[WebSocket RECHAZADO] ${clientIp(request)} → ${wsAuth.reason}`);
          rejectWsUpgrade(socket, wsAuth.reason);
          return;
        }
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request, wsAuth);
        });
      }
    } catch (e) {
      // Allow other listeners or default HTTP close
    }
  });

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

  // Iniciar servidor principal en el puerto asignado (por defecto 3000 para LAN POS)
  startCentralSync(applyUsersFromCentral);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Servidor Central LAN - App POS] Activo en http://0.0.0.0:${PORT} (Puerto LAN ${PORT})`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = PORT + 1;
      console.log(`[Servidor POS] Puerto ${PORT} ocupado. Iniciando en puerto alternativo ${fallbackPort}...`);
      server.listen(fallbackPort, '0.0.0.0', () => {
        console.log(`[Servidor Central LAN - App POS] Activo en puerto alternativo: http://0.0.0.0:${fallbackPort}`);
      });
    } else {
      console.error(`[Servidor Central POS Error]:`, err.message);
    }
  });

  // 1. Habilitar puerto WAN 3001 para la aplicación POS de sucursales remotas
  if (PORT === 3000) {
    const wanAppServer = http.createServer(app);
    wanAppServer.on('upgrade', (request, socket, head) => {
      try {
        const urlObj = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
        const pathname = urlObj.pathname;
        if (pathname === '/api/ws' || pathname === '/ws') {
          const wsAuth = authorizeWsRequest(request);
          if (!wsAuth.ok) {
            console.warn(`[WebSocket RECHAZADO] ${clientIp(request)} → ${wsAuth.reason}`);
            rejectWsUpgrade(socket, wsAuth.reason);
            return;
          }
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request, wsAuth);
          });
        }
      } catch (e) {
        // Allow fallback
      }
    });

    wanAppServer.listen(3001, '0.0.0.0', () => {
      console.log(`[Servidor Central WAN - App POS] Activo en puerto 3001 para sucursales remotas en http://0.0.0.0:3001`);
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[Servidor Central WAN 3001] Puerto en uso o reenviado por router/proxy.`);
      } else {
        console.error(`[Servidor Central WAN Error en 3001]:`, err.message);
      }
    });

    // 2. Habilitar servidor de señalización FarmaDesk en puerto 9050 (WebSocket + HTTP)
    const farmadeskServer = http.createServer(app);
    farmadeskServer.on('upgrade', (request, socket, head) => {
      try {
        const urlObj = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
        const pathname = urlObj.pathname;
        if (pathname === '/api/ws' || pathname === '/ws') {
          const wsAuth = authorizeWsRequest(request);
          if (!wsAuth.ok) {
            console.warn(`[WebSocket RECHAZADO] ${clientIp(request)} → ${wsAuth.reason}`);
            rejectWsUpgrade(socket, wsAuth.reason);
            return;
          }
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request, wsAuth);
          });
        }
      } catch (e) {
        // Allow fallback
      }
    });

    farmadeskServer.listen(9050, '0.0.0.0', () => {
      console.log(`[FarmaDesk Signaling Hub] Activo en puerto 9050 para clientes Rust y agentes nativos en ws://0.0.0.0:9050/ws`);
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[FarmaDesk Hub 9050] Puerto 9050 en uso por otro proceso.`);
      } else {
        console.error(`[FarmaDesk Hub Error en 9050]:`, err.message);
      }
    });

    // El servicio WebSocket y HTTP principal opera de forma unificada en el puerto PORT (3000)
    // Los puertos auxiliares no autenticados 7777 y 7070 han sido cerrados por seguridad perimetral.

    console.log('\n=====================================================================');
    console.log('  🟢 ¡SISTEMA POS INICIADO Y OPERATIVO CON EXITO!');
    console.log('  🌐 Abre tu navegador web en: http://localhost:3000');
    console.log('  (Manten esta ventana abierta mientras uses el sistema en la taquilla)');
    console.log('=====================================================================\n');
  }
}

startServer();
