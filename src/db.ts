import 'dotenv/config'; // el .env debe estar cargado antes de crear el pool (antes se ignoraba DATABASE_URL del .env)
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

const DEFAULT_DATABASE_URL = 'postgresql://postgres:password@localhost:5433/wolfzonepos_db';
const DEFAULT_DATABASE_NAME = 'wolfzonepos_db';

/** true si el operador configuró DATABASE_URL (variable de entorno o .env). */
export const DATABASE_URL_CONFIGURED = Boolean(process.env.DATABASE_URL?.trim());

/**
 * Cadena de conexión a PostgreSQL: process.env.DATABASE_URL o, en una instalación sin
 * configurar, el valor por defecto (puerto 5433, base wolfzonepos_db).
 */
export let DATABASE_URL = process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;

/** Nombre de la base de datos de una URL de conexión (por defecto wolfzonepos_db). */
export function databaseNameOf(url: string): string {
  try {
    const name = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
    return name || DEFAULT_DATABASE_NAME;
  } catch {
    return DEFAULT_DATABASE_NAME;
  }
}

function isLocalHost(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';
  } catch {
    return false;
  }
}

export interface DiscoveryCandidate { port: number; testUrl: string; rootUrl: string; }

/**
 * Combinaciones de puerto/contraseña que se prueban si la URL configurada no conecta.
 * Regla de seguridad: SIEMPRE la misma base de datos que la configurada (nunca otra), y solo
 * en este equipo. Si la base configurada está en otro equipo, no se prueba nada más.
 */
export function discoveryCandidates(configuredUrl: string, configured: boolean): DiscoveryCandidate[] {
  if (configured && !isLocalHost(configuredUrl)) return [];
  const dbName = databaseNameOf(configuredUrl);
  let configuredPort = 5433;
  try { configuredPort = Number(new URL(configuredUrl).port) || 5432; } catch { /* valor por defecto */ }
  const ports = Array.from(new Set([configuredPort, 5433, 5432]));
  const passwords = ['password', 'postgres', '123456', 'admin', 'root', '1234', '12345678', '12345', ''];
  const out: DiscoveryCandidate[] = [];
  for (const port of ports) {
    for (const pass of passwords) {
      const auth = `postgres:${encodeURIComponent(pass)}@localhost:${port}`;
      out.push({ port, testUrl: `postgresql://${auth}/${encodeURIComponent(dbName)}`, rootUrl: `postgresql://${auth}/postgres` });
    }
  }
  return out;
}

let activePoolInstance = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

activePoolInstance.on('error', (err: Error) => {
  console.error('[PostgreSQL Pool Error]: Error inesperado en el cliente inactivo:', err.message);
});

export function setActivePool(newPool: pg.Pool, newUrl?: string) {
  if (newUrl) DATABASE_URL = newUrl;
  activePoolInstance = newPool;
  activePoolInstance.on('error', (err: Error) => {
    console.error('[PostgreSQL Pool Error]: Error inesperado en el cliente inactivo:', err.message);
  });
}

/**
 * Proxy transparente de Pool para que todas las llamadas (query, connect, totalCount, etc.)
 * se dirijan en tiempo real a la instancia activa autenticada.
 */
export const pool: pg.Pool = new Proxy({} as pg.Pool, {
  get(target, prop, receiver) {
    const val = (activePoolInstance as any)[prop];
    if (typeof val === 'function') {
      return val.bind(activePoolInstance);
    }
    return val;
  }
});

let isConnected = false;

export function isPostgresReady(): boolean {
  return isConnected;
}

/**
 * Script DDL de inicialización con las sentencias CREATE TABLE
 */
export const INIT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS spots (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    rate_per_hour NUMERIC(12, 2) DEFAULT 0,
    current_ticket_id VARCHAR(100),
    details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_spots_status ON spots(status);
CREATE INDEX IF NOT EXISTS idx_spots_type ON spots(type);

CREATE TABLE IF NOT EXISTS active_tickets (
    id VARCHAR(100) PRIMARY KEY,
    ticket_number VARCHAR(100) NOT NULL UNIQUE,
    plate VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    spot_code VARCHAR(50),
    entry_time TIMESTAMPTZ NOT NULL,
    terminal_id VARCHAR(100),
    operator VARCHAR(100),
    details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_active_tickets_plate ON active_tickets(plate);
CREATE INDEX IF NOT EXISTS idx_active_tickets_spot ON active_tickets(spot_code);

CREATE TABLE IF NOT EXISTS paid_tickets (
    id VARCHAR(100) PRIMARY KEY,
    ticket_number VARCHAR(100) NOT NULL,
    plate VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    spot_code VARCHAR(50),
    entry_time TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) NOT NULL,
    terminal_id VARCHAR(100),
    operator VARCHAR(100),
    details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_paid_tickets_plate ON paid_tickets(plate);
CREATE INDEX IF NOT EXISTS idx_paid_tickets_paid_at ON paid_tickets(paid_at);
CREATE INDEX IF NOT EXISTS idx_paid_tickets_method ON paid_tickets(payment_method);

CREATE TABLE IF NOT EXISTS cash_shifts (
    id VARCHAR(100) PRIMARY KEY,
    terminal_id VARCHAR(100) NOT NULL,
    operator VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    initial_cash NUMERIC(12, 2) DEFAULT 0,
    final_cash NUMERIC(12, 2) DEFAULT 0,
    total_collected NUMERIC(12, 2) DEFAULT 0,
    details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_cash_shifts_status ON cash_shifts(status);
CREATE INDEX IF NOT EXISTS idx_cash_shifts_terminal ON cash_shifts(terminal_id);

CREATE TABLE IF NOT EXISTS configs (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL,
    name VARCHAR(150),
    pin TEXT, -- hash scrypt (scrypt$salt$hash)
    permissions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    terminal_id VARCHAR(100),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    operator VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

CREATE TABLE IF NOT EXISTS subscribers (
    id VARCHAR(100) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    document_id VARCHAR(50) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(100),
    plate VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    monthly_rate NUMERIC(15,2) DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    assigned_spot_code VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    last_payment_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(50) DEFAULT 'cash',
    details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_subscribers_plate ON subscribers(plate);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);
`;

// Memoria intermedia segura para contingencia
const memoryStore = {
  spots: new Map<string, any>(),
  activeTickets: new Map<string, any>(),
  paidTickets: new Map<string, any>(),
  cashShifts: new Map<string, any>(),
  configs: new Map<string, any>(),
  users: new Map<string, any>(),
  subscribers: new Map<string, any>(),
  auditLogs: [] as any[]
};

export const memoryStoreRef = memoryStore;

function saveDatabaseUrlToEnv(url: string) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
    }
    
    if (/^DATABASE_URL=/m.test(content)) {
      content = content.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${url}`);
    } else {
      content = content.trimEnd() + (content.length > 0 ? '\n' : '') + `DATABASE_URL=${url}\n`;
    }

    if (!/^PORT=/m.test(content)) {
      content = `PORT=3000\n` + content;
    }
    if (!/^DISABLE_HMR=/m.test(content)) {
      content = content.trimEnd() + '\nDISABLE_HMR=true\n';
    }

    fs.writeFileSync(envPath, content, 'utf8');
    console.log('[PostgreSQL] Archivo .env actualizado preservando variables existentes (como GEMINI_API_KEY).');
  } catch (err: any) {
    console.warn('[PostgreSQL] No se pudo guardar en .env:', err.message);
  }
}

/**
 * Inicializa la base de datos PostgreSQL, verifica la conexión y crea las tablas si no existen.
 * Incluye sondeo inteligente de contraseñas habituales, puertos (5433 / 5432) y auto-creación de DB.
 */
export async function initDatabase(): Promise<boolean> {
  const safeUrl = (u: string) => u.replace(/:[^:@/]+@/, ':****@');
  const dbName = databaseNameOf(DATABASE_URL);

  // 1. La URL configurada, con reintentos por si PostgreSQL todavía está arrancando (inicio de Windows).
  const attempts = DATABASE_URL_CONFIGURED ? 5 : 1;
  for (let i = 1; i <= attempts; i++) {
    try {
      const client = await activePoolInstance.connect();
      try {
        await client.query('SELECT 1');
        console.log(`[PostgreSQL] Conexión establecida exitosamente a: ${safeUrl(DATABASE_URL)}`);
        await client.query(INIT_SCHEMA_SQL);
        console.log('[PostgreSQL] Esquema y tablas validados/creados correctamente en la base de datos.');
        isConnected = true;
        return true;
      } finally {
        client.release();
      }
    } catch (err: any) {
      // Solo se reintenta si PostgreSQL no responde (p. ej. aún arrancando); no si la base
      // no existe o la contraseña es incorrecta.
      const definitive = /does not exist|no existe|password|contrase|autentica|authentication/i.test(String(err.message));
      if (i < attempts && !definitive) {
        console.warn(`[PostgreSQL] Intento ${i}/${attempts} fallido (${err.message}). Reintentando...`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      if (DATABASE_URL_CONFIGURED) {
        console.warn(`[PostgreSQL] No conecta la base configurada ${safeUrl(DATABASE_URL)}: ${err.message}`);
      }
      break;
    }
  }

  // 2. Probar otros puertos/contraseñas locales, SIEMPRE con la misma base de datos.
  const candidates = discoveryCandidates(DATABASE_URL, DATABASE_URL_CONFIGURED);
  if (candidates.length === 0) {
    console.error(`[PostgreSQL] La base configurada está en otro equipo y no respondió. No se intentará otra base. El sistema operará con contingencia local.`);
  }
  for (const { port, testUrl, rootUrl } of candidates) {
    if (testUrl === DATABASE_URL) continue;
    const candidatePool = new Pool({ connectionString: testUrl, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 1800 });
    let testClient: pg.PoolClient | undefined;
    try {
      testClient = await candidatePool.connect();
      await testClient.query('SELECT 1');
      await testClient.query(INIT_SCHEMA_SQL);
      testClient.release();
      return adoptPool(candidatePool, testUrl, `en puerto ${port} (base ${dbName})`, true);
    } catch (dbErr: any) {
      if (testClient) testClient.release();
      // La base configurada no existe todavía (instalación nueva): crearla con ese mismo nombre.
      if (dbErr.message && (dbErr.message.includes('does not exist') || dbErr.message.includes('no existe'))) {
        try {
          const rootPool = new Pool({ connectionString: rootUrl, max: 2, connectionTimeoutMillis: 2000 });
          const rootClient = await rootPool.connect();
          await rootClient.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
          rootClient.release();
          await rootPool.end();
          const newClient = await candidatePool.connect();
          await newClient.query('SELECT 1');
          await newClient.query(INIT_SCHEMA_SQL);
          newClient.release();
          return adoptPool(candidatePool, testUrl, `: base ${dbName} creada en puerto ${port}`, false);
        } catch {
          // siguiente combinación
        }
      }
      await candidatePool.end().catch(() => {});
    }
  }

  isConnected = false;
  console.warn(`[PostgreSQL Local] No se pudo conectar a la base ${dbName}. El sistema operará con contingencia local.`);
  return false;
}

function adoptPool(candidatePool: pg.Pool, testUrl: string, detail: string, usedAlternative: boolean): boolean {
  console.log(`[PostgreSQL] Conectado ${detail}.`);
  setActivePool(candidatePool, testUrl);
  isConnected = true;
  if (DATABASE_URL_CONFIGURED) {
    if (!usedAlternative) return true;
    // No se reescribe un .env que el operador configuró: solo se avisa.
    console.warn('[PostgreSQL] La DATABASE_URL configurada no funcionó tal cual; se usó otro puerto o contraseña para la MISMA base. Corrija DATABASE_URL en el .env.');
  } else {
    saveDatabaseUrlToEnv(testUrl);
  }
  return true;
}

/**
 * Ejecutor genérico de consultas SQL con manejo de reconexión
 */
export async function dbQuery<T = any>(text: string, params: any[] = []): Promise<pg.QueryResult<T>> {
  if (isConnected) {
    return activePoolInstance.query<T>(text, params);
  }
  try {
    const res = await activePoolInstance.query<T>(text, params);
    isConnected = true;
    return res;
  } catch (err) {
    isConnected = false;
    throw err;
  }
}

export default pool;
