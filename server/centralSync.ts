/**
 * Sincronización servidor ↔ servidor (Sucursal → Central).
 *
 * El servidor de la sucursal consulta periódicamente al Central con la clave compartida
 * (SYNC_SHARED_KEY) y aplica localmente los usuarios (con sus claves en hash). Así la
 * propagación de usuarios no depende de que un navegador con permisos esté abierto.
 *
 * Configuración (.env de la sucursal):
 *   CENTRAL_SERVER_URL=http://<ip-o-dominio-del-central>:3001
 *   SYNC_SHARED_KEY=<la misma clave del Central>
 *   CENTRAL_SYNC_INTERVAL_MIN=5   (opcional)
 */
import { getSyncKey } from './auth.ts';

export interface CentralUser {
  id: string;
  username: string;
  name?: string;
  role?: string;
  password?: string;
  isActive?: boolean;
  permissions?: Record<string, any>;
  assignedProfiles?: string[];
  createdAt?: string;
}

export interface CentralSyncStatus {
  enabled: boolean;
  centralUrl: string | null;
  reason?: string;
  running: boolean;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastUsersApplied: number;
}

export type ApplyUsersFn = (users: CentralUser[]) => Promise<number>;

const status: CentralSyncStatus = {
  enabled: false,
  centralUrl: null,
  running: false,
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  lastUsersApplied: 0,
};

let applyUsers: ApplyUsersFn | null = null;
let timer: NodeJS.Timeout | null = null;

/** URL base del Central normalizada (sin barra final) o null si no es válida. */
export function getCentralUrl(): string | null {
  const raw = process.env.CENTRAL_SERVER_URL?.trim();
  if (!raw) return null;
  // Con esquema explícito solo se aceptan http/https
  if (raw.includes('://') && !/^https?:\/\//i.test(raw)) return null;
  try {
    const u = new URL(raw.startsWith('http') ? raw : `http://${raw}`);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.origin;
  } catch {
    return null;
  }
}

export function getCentralSyncStatus(): CentralSyncStatus {
  return { ...status };
}

/** Valida que los usuarios recibidos tengan la forma mínima esperada. */
export function sanitizeCentralUsers(input: unknown): CentralUser[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((u: any) => u && typeof u === 'object' && typeof u.id === 'string' && u.id && typeof u.username === 'string' && u.username.trim())
    .map((u: any) => ({
      id: u.id,
      username: String(u.username).trim().toLowerCase(),
      name: typeof u.name === 'string' ? u.name : u.username,
      role: typeof u.role === 'string' ? u.role : 'cashier',
      password: typeof u.password === 'string' ? u.password : '',
      isActive: u.isActive !== false,
      permissions: u.permissions && typeof u.permissions === 'object' ? u.permissions : {},
      assignedProfiles: Array.isArray(u.assignedProfiles) ? u.assignedProfiles : undefined,
      createdAt: typeof u.createdAt === 'string' ? u.createdAt : undefined,
    }));
}

/** Ejecuta una sincronización inmediata. Nunca lanza: el resultado queda en el estado. */
export async function pullFromCentralNow(): Promise<CentralSyncStatus> {
  const centralUrl = getCentralUrl();
  const key = getSyncKey();
  status.centralUrl = centralUrl;
  if (!centralUrl || !key || !applyUsers) {
    status.enabled = false;
    status.reason = !centralUrl
      ? 'CENTRAL_SERVER_URL no configurada (este nodo no es sucursal o falta la dirección del Central).'
      : !key
      ? 'SYNC_SHARED_KEY no configurada.'
      : 'Servicio no inicializado.';
    return getCentralSyncStatus();
  }
  if (status.running) return getCentralSyncStatus();

  status.enabled = true;
  status.reason = undefined;
  status.running = true;
  status.lastRunAt = new Date().toISOString();
  try {
    const res = await fetch(`${centralUrl}/api/sync/global-config`, {
      headers: { 'X-Sync-Key': key, 'X-Wolf-Node-Role': 'branch' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`El Central respondió HTTP ${res.status}`);
    const body: any = await res.json();
    const users = sanitizeCentralUsers(body?.data?.users);
    status.lastUsersApplied = users.length > 0 ? await applyUsers(users) : 0;
    status.lastSuccessAt = new Date().toISOString();
    status.lastError = null;
  } catch (e: any) {
    status.lastError = e?.name === 'TimeoutError' ? 'Tiempo de espera agotado al contactar al Central.' : String(e?.message || e);
    console.warn(`[Sync Central] ${status.lastError}`);
  } finally {
    status.running = false;
  }
  return getCentralSyncStatus();
}

/** Inicia la sincronización periódica si el nodo está configurado como sucursal. */
export function startCentralSync(apply: ApplyUsersFn) {
  applyUsers = apply;
  const centralUrl = getCentralUrl();
  if (!centralUrl || !getSyncKey()) {
    status.enabled = false;
    status.centralUrl = centralUrl;
    status.reason = !centralUrl ? 'CENTRAL_SERVER_URL no configurada.' : 'SYNC_SHARED_KEY no configurada.';
    return;
  }
  const minutes = Math.min(60, Math.max(1, Number(process.env.CENTRAL_SYNC_INTERVAL_MIN) || 5));
  console.log(`[Sync Central] Sincronización servidor↔servidor activa con ${centralUrl} cada ${minutes} min.`);
  if (timer) clearInterval(timer);
  timer = setInterval(() => { void pullFromCentralNow(); }, minutes * 60_000);
  timer.unref?.();
  setTimeout(() => { void pullFromCentralNow(); }, 5_000).unref?.();
}
