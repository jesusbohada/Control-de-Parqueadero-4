import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import http from 'http';
import { SystemUser } from './src/types.ts';
import {
  apiAuthMiddleware,
  configureAuthz,
  hashPassword,
  isPasswordHash,
  preparePasswordForStorage,
  exposePasswordFor,
  getSyncKey,
  AttemptLimiter,
  limitFailedAttempts,
  clientIp,
  registerWeakPasswords,
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
import { registerSyncRoutes } from './server/routes/sync.ts';
import { createWsHub } from './server/ws.ts';
import { startCentralSync, type CentralUser } from './server/centralSync.ts';
import pool, { initDatabase, isPostgresReady, memoryStoreRef, DATABASE_URL } from './src/db.ts';
import { 
  INITIAL_USERS,
  normalizeUserPermissions,
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
      // Igual que el login: los permisos ausentes toman el valor por defecto del rol.
      return { role: row.role, isActive: row.is_active !== false, permissions: normalizeUserPermissions(row.permissions || {}, row.role) as any };
    }
    const u = memoryStoreRef.users.get(id);
    return u ? { role: u.role, isActive: u.isActive !== false, permissions: normalizeUserPermissions(u.permissions || {}, u.role) as any } : null;
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
  const { extractClientIp, loadAndValidateBranchesTelemetry, saveBranchesTelemetry } = registerSyncRoutes(app, { PORT, broadcastToAdmins: (branchId: string, payload: any) => wsHub.broadcastToAdmins(branchId, payload), getAllStoredPins });
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

  const wsHub = createWsHub({ extractClientIp, loadAndValidateBranchesTelemetry, saveBranchesTelemetry });
  server.on('upgrade', wsHub.handleUpgrade);

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
    wanAppServer.on('upgrade', wsHub.handleUpgrade);

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
    farmadeskServer.on('upgrade', wsHub.handleUpgrade);

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
