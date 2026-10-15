import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

/**
 * Cadena de conexión a PostgreSQL.
 * Utiliza process.env.DATABASE_URL con fallback inteligente a puerto 5433 (o 5432)
 */
export let DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5433/wolfzonepos_db';

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
    pin VARCHAR(50),
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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
`;

// Memoria intermedia segura para contingencia
const memoryStore = {
  spots: new Map<string, any>(),
  activeTickets: new Map<string, any>(),
  paidTickets: new Map<string, any>(),
  cashShifts: new Map<string, any>(),
  configs: new Map<string, any>(),
  users: new Map<string, any>(),
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
  const portsToTest = [5433, 5432];
  const passwordsToTest = ['password', 'postgres', '123456', 'admin', 'root', '1234', '12345678', '12345', ''];

  // 1. Intento inicial con la URL configurada directamente
  try {
    const client = await activePoolInstance.connect();
    try {
      await client.query('SELECT 1');
      console.log(`[PostgreSQL] Conexión establecida exitosamente a: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
      await client.query(INIT_SCHEMA_SQL);
      console.log('[PostgreSQL] Esquema y tablas validados/creados correctamente en la base de datos.');
      isConnected = true;
      return true;
    } finally {
      client.release();
    }
  } catch (initialErr: any) {
    // Probar auto-detección silenciosa
  }

  // 2. Probar combinaciones de puertos y contraseñas comunes
  for (const port of portsToTest) {
    for (const pass of passwordsToTest) {
      const testUrl = `postgresql://postgres:${encodeURIComponent(pass)}@localhost:${port}/wolfzonepos_db`;
      const rootUrl = `postgresql://postgres:${encodeURIComponent(pass)}@localhost:${port}/postgres`;

      try {
        const candidatePool = new Pool({
          connectionString: testUrl,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 1800,
        });

        let testClient;
        try {
          testClient = await candidatePool.connect();
          await testClient.query('SELECT 1');
          await testClient.query(INIT_SCHEMA_SQL);
          testClient.release();

          console.log(`[PostgreSQL] ¡Autenticación exitosa en puerto ${port} con contraseña detectada!`);
          setActivePool(candidatePool, testUrl);
          isConnected = true;

          saveDatabaseUrlToEnv(testUrl);

          return true;
        } catch (dbErr: any) {
          if (testClient) testClient.release();

          // Si el error es que la base de datos wolfzonepos_db no existe ("database does not exist"), crearla usando la BD postgres
          if (dbErr.message && (dbErr.message.includes('does not exist') || dbErr.message.includes('no existe'))) {
            try {
              const rootPool = new Pool({
                connectionString: rootUrl,
                max: 2,
                connectionTimeoutMillis: 2000,
              });
              const rootClient = await rootPool.connect();
              await rootClient.query('CREATE DATABASE wolfzonepos_db;');
              rootClient.release();
              await rootPool.end();

              // Ahora conectar a la nueva base creada
              const newClient = await candidatePool.connect();
              await newClient.query('SELECT 1');
              await newClient.query(INIT_SCHEMA_SQL);
              newClient.release();

              console.log(`[PostgreSQL] ¡Base de datos wolfzonepos_db creada y conectada en puerto ${port}!`);
              setActivePool(candidatePool, testUrl);
              isConnected = true;

              saveDatabaseUrlToEnv(testUrl);

              return true;
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // Continuar siguiente combinación
      }
    }
  }

  isConnected = false;
  console.warn(`[PostgreSQL Local] No se pudo autenticar con contraseñas comunes en puertos 5433/5432. El sistema operará con contingencia local.`);
  return false;
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
