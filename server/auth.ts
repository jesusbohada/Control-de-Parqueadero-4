/**
 * Módulo de seguridad del servidor (Fase 1 de endurecimiento).
 *
 * - Hash de contraseñas/PIN con scrypt (formato `scrypt$<salt>$<hash>`), con migración
 *   transparente desde valores legados en texto plano.
 * - Sesiones firmadas con HMAC-SHA256 (token Bearer), con expiración y revocación en logout.
 * - Clave compartida de sincronización entre sedes (`SYNC_SHARED_KEY`) para rutas /api/sync/*.
 * - Tokens SSO Central → Sucursal firmados con la clave de sincronización.
 * - Middleware de autenticación para /api y guardas de rol/permiso.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Request, Response, NextFunction } from 'express';
import type { IncomingMessage } from 'http';

// ============================================================================
// Contraseñas
// ============================================================================

const SCRYPT_PREFIX = 'scrypt$';
const SCRYPT_KEYLEN = 32;

export function isPasswordHash(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(SCRYPT_PREFIX);
}

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(plain, salt, SCRYPT_KEYLEN);
  return `${SCRYPT_PREFIX}${salt.toString('base64')}$${hash.toString('base64')}`;
}

/** Verifica una clave contra el valor almacenado (hash scrypt o texto plano legado). */
export function verifyPassword(stored: string | null | undefined, input: string): { ok: boolean; needsRehash: boolean } {
  const cleanInput = String(input ?? '');
  if (!stored || !cleanInput) return { ok: false, needsRehash: false };

  if (isPasswordHash(stored)) {
    const parts = stored.slice(SCRYPT_PREFIX.length).split('$');
    if (parts.length !== 2) return { ok: false, needsRehash: false };
    const salt = Buffer.from(parts[0], 'base64');
    const expected = Buffer.from(parts[1], 'base64');
    const actual = crypto.scryptSync(cleanInput, salt, expected.length || SCRYPT_KEYLEN);
    return { ok: actual.length === expected.length && crypto.timingSafeEqual(actual, expected), needsRehash: false };
  }

  // Valor legado en texto plano: comparar en tiempo constante y pedir re-hash.
  const ok = safeEqual(stored, cleanInput);
  return { ok, needsRehash: ok };
}

/**
 * Decide qué guardar en la columna `pin`:
 * - vacío/ausente  → conserva el valor existente (el cliente ya no recibe claves).
 * - hash scrypt    → se guarda tal cual (propagación Central → Sucursal).
 * - texto plano    → se guarda hasheado.
 */
export function preparePasswordForStorage(incoming: unknown, existingStored?: string | null): string {
  const value = typeof incoming === 'string' ? incoming.trim() : '';
  if (!value) return existingStored || '';
  if (isPasswordHash(value)) return value;
  return hashPassword(value);
}

/** Valor de `password` que se expone al cliente según quién pregunta. */
export function exposePasswordFor(stored: string | null | undefined, viewer?: AuthPrincipal | null): string {
  // Solo el rol maestro recibe el hash (necesario para empaquetar usuarios hacia sucursales).
  // Nunca se devuelve texto plano.
  if (viewer && viewer.role === 'master' && isPasswordHash(stored)) return stored as string;
  return '';
}

// ============================================================================
// Utilidades
// ============================================================================

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) {
    crypto.timingSafeEqual(ab, ab); // tiempo similar aunque difiera la longitud
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');
const fromB64url = (s: string) => Buffer.from(s, 'base64url').toString('utf8');

function hmac(secret: Buffer | string, data: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

// ============================================================================
// Secreto de sesión
// ============================================================================

let sessionSecret: Buffer | null = null;

function getSessionSecret(): Buffer {
  if (sessionSecret) return sessionSecret;
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 32) {
    sessionSecret = Buffer.from(fromEnv);
    return sessionSecret;
  }
  const secretPath = path.join(process.cwd(), 'data', '.session_secret');
  try {
    if (fs.existsSync(secretPath)) {
      const stored = fs.readFileSync(secretPath, 'utf8').trim();
      if (stored.length >= 32) {
        sessionSecret = Buffer.from(stored);
        return sessionSecret;
      }
    }
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    const generated = crypto.randomBytes(48).toString('base64url');
    fs.writeFileSync(secretPath, generated, { encoding: 'utf8', mode: 0o600 });
    sessionSecret = Buffer.from(generated);
    console.log('[Auth] Secreto de sesión generado en data/.session_secret');
  } catch (e: any) {
    console.warn('[Auth] No se pudo persistir el secreto de sesión; se usará uno temporal:', e.message);
    sessionSecret = crypto.randomBytes(48);
  }
  return sessionSecret;
}

// ============================================================================
// Sesiones
// ============================================================================

export interface AuthPrincipal {
  kind: 'user' | 'sync';
  uid: string;
  username: string;
  name: string;
  role: string;
  jti?: string;
  exp?: number;
  mustChangePassword?: boolean;
}

interface SessionClaims {
  uid: string;
  usr: string;
  nam: string;
  rol: string;
  iat: number;
  exp: number;
  jti: string;
  /** Debe cambiar la clave antes de usar el sistema */
  mcp?: boolean;
}

const SESSION_TTL_MS = 16 * 60 * 60 * 1000; // 16 h: cubre un turno largo
const revokedSessions = new Map<string, number>(); // jti → exp

export function issueSessionToken(
  user: { id: string; username: string; name?: string; role: string },
  opts: { mustChangePassword?: boolean } = {}
): { token: string; expiresAt: string } {
  const now = Date.now();
  const claims: SessionClaims = {
    uid: user.id,
    usr: user.username,
    nam: user.name || user.username,
    rol: user.role,
    iat: now,
    exp: now + SESSION_TTL_MS,
    jti: crypto.randomBytes(12).toString('base64url'),
    ...(opts.mustChangePassword ? { mcp: true } : {}),
  };
  const body = b64url(JSON.stringify(claims));
  return { token: `wzs1.${body}.${hmac(getSessionSecret(), body)}`, expiresAt: new Date(claims.exp).toISOString() };
}

export function verifySessionToken(token: string | undefined | null): AuthPrincipal | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'wzs1') return null;
  const [, body, sig] = parts;
  if (!safeEqual(sig, hmac(getSessionSecret(), body))) return null;
  try {
    const c = JSON.parse(fromB64url(body)) as SessionClaims;
    if (!c.exp || Date.now() > c.exp) return null;
    if (revokedSessions.has(c.jti)) return null;
    return { kind: 'user', uid: c.uid, username: c.usr, name: c.nam, role: c.rol, jti: c.jti, exp: c.exp, mustChangePassword: c.mcp === true };
  } catch {
    return null;
  }
}

export function revokeSession(principal: AuthPrincipal | null | undefined) {
  if (!principal?.jti || !principal.exp) return;
  revokedSessions.set(principal.jti, principal.exp);
  const now = Date.now();
  for (const [jti, exp] of revokedSessions) if (exp < now) revokedSessions.delete(jti);
}

// ============================================================================
// Clave de sincronización entre sedes
// ============================================================================

let warnedNoSyncKey = false;
let warnedShortSyncKey = false;

export function getSyncKey(): string | null {
  const key = process.env.SYNC_SHARED_KEY?.trim();
  if (key && key.length >= 16) return key;
  if (key && !warnedShortSyncKey) {
    warnedShortSyncKey = true;
    console.warn('[Auth] SYNC_SHARED_KEY es demasiado corta (mínimo 16 caracteres); se ignora.');
  }
  return null;
}

function warnNoSyncKeyOnce() {
  if (warnedNoSyncKey) return;
  warnedNoSyncKey = true;
  console.warn(
    '⚠️  [Auth] SYNC_SHARED_KEY no está configurada: las rutas /api/sync/* quedan en MODO COMPATIBLE (sin autenticación).\n' +
    '    Configure la misma clave (≥16 caracteres) en el archivo .env del Central y de cada sucursal.'
  );
}

// ============================================================================
// SSO Central → Sucursal
// ============================================================================

const SSO_MAX_AGE_MS = 2 * 60 * 1000;
const usedSsoTokens = new Map<string, number>();

export interface SsoUser { id: string; username: string; name: string; role: string; permissions?: Record<string, any> }

export function signSsoToken(user: SsoUser): string | null {
  const key = getSyncKey();
  if (!key) return null;
  const payload = { u: user, iat: Date.now(), jti: crypto.randomBytes(12).toString('base64url') };
  const body = b64url(JSON.stringify(payload));
  return `wzsso1.${body}.${hmac(key, `sso:${body}`)}`;
}

export function verifySsoToken(token: string): SsoUser | null {
  const key = getSyncKey();
  if (!key || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'wzsso1') return null;
  const [, body, sig] = parts;
  if (!safeEqual(sig, hmac(key, `sso:${body}`))) return null;
  try {
    const p = JSON.parse(fromB64url(body));
    const now = Date.now();
    if (!p.iat || now - p.iat > SSO_MAX_AGE_MS || p.iat - now > 30_000) return null;
    if (!p.jti || usedSsoTokens.has(p.jti)) return null; // un solo uso
    usedSsoTokens.set(p.jti, p.iat + SSO_MAX_AGE_MS);
    for (const [jti, exp] of usedSsoTokens) if (exp < now) usedSsoTokens.delete(jti);
    const u = p.u || {};
    if (!u.id || !u.username || !u.role) return null;
    return {
      id: String(u.id),
      username: String(u.username),
      name: String(u.name || u.username),
      role: String(u.role),
      permissions: u.permissions && typeof u.permissions === 'object' ? u.permissions : undefined,
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Middleware
// ============================================================================

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthPrincipal;
    }
  }
}

/** Rutas accesibles sin sesión. */
const PUBLIC_ROUTES: Array<{ method: string; path: string; prefix?: boolean }> = [
  { method: 'GET', path: '/api/health' },
  { method: 'POST', path: '/api/auth/login' },
  { method: 'POST', path: '/api/auth/sso-exchange' },
  // Agente FarmaDesk: el .ps1 se descarga con `iex` y se valida con agentKey dentro de la ruta.
  // Los .bat/.py exigen sesión (contienen la llave del agente).
  { method: 'GET', path: '/api/farmadesk/script/agent.ps1' },
  { method: 'GET', path: '/api/farmadesk/download/', prefix: true },
  { method: 'POST', path: '/api/farmadesk/access-code/verify' },
  { method: 'POST', path: '/api/farmadesk/pin/verify' },
];

const PASSWORD_CHANGE_ALLOWED = new Set(['/api/auth/change-password', '/api/auth/logout', '/api/auth/me']);

function isPublicRoute(method: string, p: string): boolean {
  return PUBLIC_ROUTES.some(r => r.method === method && (r.prefix ? p.startsWith(r.path) : p === r.path));
}

function extractBearer(req: Request): string | null {
  const header = req.header('authorization') || '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  // Descargas por navegación directa (no pueden enviar encabezados): solo GET.
  if (req.method === 'GET' && typeof req.query.access_token === 'string') return req.query.access_token;
  return null;
}

function unauthorized(res: Response, message = 'Sesión requerida o expirada. Inicie sesión nuevamente.') {
  res.setHeader('X-Auth-Required', '1');
  return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: message });
}

export function apiAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const p = req.path;
  if (!p.startsWith('/api/') || req.method === 'OPTIONS') return next();

  const principal = verifySessionToken(extractBearer(req));
  if (isPublicRoute(req.method, p)) {
    if (principal) req.auth = principal;
    return next();
  }

  if (principal) {
    req.auth = principal;
    if (principal.mustChangePassword && !PASSWORD_CHANGE_ALLOWED.has(p)) {
      return res.status(403).json({
        success: false,
        code: 'PASSWORD_CHANGE_REQUIRED',
        error: 'Debe cambiar su contraseña antes de continuar.'
      });
    }
    return next();
  }

  if (p.startsWith('/api/sync/')) {
    const key = getSyncKey();
    if (!key) {
      warnNoSyncKeyOnce();
      return next(); // modo compatible: comportamiento anterior
    }
    const provided = req.header('x-sync-key');
    if (provided && safeEqual(provided, key)) {
      req.auth = { kind: 'sync', uid: 'sync-node', username: 'sync-node', name: 'Nodo de sincronización', role: 'sync' };
      return next();
    }
  }

  return unauthorized(res);
}

type UserLoader = (id: string) => Promise<{ role: string; isActive?: boolean; permissions?: Record<string, any> } | null>;
let loadUserForAuthz: UserLoader | null = null;

export function configureAuthz(loader: UserLoader) {
  loadUserForAuthz = loader;
}

/**
 * Exige una sesión de usuario (no nodo de sync) con rol maestro o con alguno de los permisos indicados.
 * El rol maestro siempre pasa. Los permisos se leen de la BD en cada petición (no del token).
 */
export function requirePermission(...permissions: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth || auth.kind !== 'user') return unauthorized(res);
    if (auth.role === 'master') return next();
    try {
      const user = loadUserForAuthz ? await loadUserForAuthz(auth.uid) : null;
      if (user && user.isActive !== false) {
        if (user.role === 'master') return next();
        if (permissions.some(perm => Boolean(user.permissions?.[perm]))) return next();
      }
    } catch (e: any) {
      console.warn('[Auth] Error verificando permisos:', e.message);
    }
    return res.status(403).json({ success: false, code: 'FORBIDDEN', error: 'No tiene permisos para realizar esta acción.' });
  };
}

/** Solo rol maestro. */
export const requireMaster = requirePermission();

// ============================================================================
// Política de contraseñas
// ============================================================================

const WEAK_PASSWORDS = new Set([
  'admin', 'admin123', 'administrador', 'super', 'super123', 'supervisor', 'caja', 'caja123', 'cajero', 'cajero123',
  '1234', '12345', '123456', '1234567', '12345678', '0000', '000000', '1111', '111111', '1974',
  'password', 'contraseña', 'clave', 'qwerty', 'wolfzone', 'parqueadero',
]);

export function registerWeakPasswords(values: Array<string | undefined | null>) {
  for (const v of values) if (v) WEAK_PASSWORDS.add(String(v).trim().toLowerCase());
}

/** ¿La clave con la que se ingresó es una clave por defecto/trivial que debe cambiarse? */
export function isDefaultOrTrivialPassword(password: string, username: string): boolean {
  const p = String(password || '').trim().toLowerCase();
  return !p || WEAK_PASSWORDS.has(p) || p === String(username || '').trim().toLowerCase();
}

/** Valida una clave nueva. Devuelve el motivo del rechazo o null si es aceptable. */
export function validateNewPassword(password: string, username: string): string | null {
  const p = String(password || '').trim();
  if (p.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
  if (isDefaultOrTrivialPassword(p, username)) return 'La contraseña es demasiado común o igual al usuario. Elija otra.';
  return null;
}

// ============================================================================
// Límite de intentos fallidos (anti fuerza bruta)
// ============================================================================

export class AttemptLimiter {
  private entries = new Map<string, { failures: number; first: number; lockedUntil: number }>();
  constructor(private maxFailures: number, private windowMs: number, private lockMs: number) {}

  check(key: string): { allowed: boolean; retryAfterSec: number } {
    const now = Date.now();
    const e = this.entries.get(key);
    if (!e) return { allowed: true, retryAfterSec: 0 };
    if (e.lockedUntil > now) return { allowed: false, retryAfterSec: Math.ceil((e.lockedUntil - now) / 1000) };
    if (now - e.first > this.windowMs) this.entries.delete(key);
    return { allowed: true, retryAfterSec: 0 };
  }

  fail(key: string) {
    const now = Date.now();
    let e = this.entries.get(key);
    if (!e || now - e.first > this.windowMs) e = { failures: 0, first: now, lockedUntil: 0 };
    e.failures++;
    if (e.failures >= this.maxFailures) {
      e.lockedUntil = now + this.lockMs;
      e.failures = 0;
      e.first = now;
    }
    this.entries.set(key, e);
    if (this.entries.size > 10_000) this.prune();
  }

  succeed(key: string) {
    this.entries.delete(key);
  }

  private prune() {
    const now = Date.now();
    for (const [k, e] of this.entries) if (e.lockedUntil < now && now - e.first > this.windowMs) this.entries.delete(k);
  }
}

/** IP del socket (no se confía en X-Forwarded-For, que el cliente puede falsificar). */
export function clientIp(req: Request | IncomingMessage): string {
  return (req.socket?.remoteAddress || 'unknown').replace(/^::ffff:/, '');
}

/**
 * Middleware: bloquea (429) tras demasiadas respuestas 401/403 para las claves dadas
 * y registra el resultado de cada intento al terminar la respuesta.
 */
export function limitFailedAttempts(limiter: AttemptLimiter, keysFor: (req: Request) => string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const keys = keysFor(req).filter(Boolean);
    for (const key of keys) {
      const c = limiter.check(key);
      if (!c.allowed) {
        res.setHeader('Retry-After', String(c.retryAfterSec));
        const minutes = Math.max(1, Math.ceil(c.retryAfterSec / 60));
        return res.status(429).json({
          success: false,
          code: 'TOO_MANY_ATTEMPTS',
          error: `Demasiados intentos fallidos. Intente de nuevo en ${minutes} minuto(s).`
        });
      }
    }
    res.on('finish', () => {
      if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 404) keys.forEach(k => limiter.fail(k));
      else if (res.statusCode >= 200 && res.statusCode < 300) keys.forEach(k => limiter.succeed(k));
    });
    next();
  };
}

// ============================================================================
// Agente FarmaDesk y WebSocket
// ============================================================================

/** Llave del agente de control remoto de una sede (derivada del secreto del servidor). */
export function agentKeyFor(branchId: string): string {
  return hmac(getSessionSecret(), `farmadesk-agent:${branchId}`).slice(0, 32);
}

export function verifyAgentKey(branchId: string, key: unknown): boolean {
  return typeof key === 'string' && key.length > 0 && safeEqual(key, agentKeyFor(branchId));
}

export interface WsAuthResult {
  ok: boolean;
  /** Puede enviar comandos de control (mouse/teclado/acciones) a sedes y agentes */
  trusted: boolean;
  principal: 'user' | 'sync' | 'agent' | 'compat';
  reason?: string;
}

/**
 * Autoriza una conexión WebSocket (/ws, /api/ws). Los navegadores no pueden enviar encabezados
 * en el handshake, por eso las credenciales llegan en la URL:
 *  - `auth`     → token de sesión del propio servidor
 *  - `syncKey`  → clave compartida entre sedes
 *  - `agentKey` → llave del agente FarmaDesk de la sede (solo para type=farmadesk-agent)
 */
export function authorizeWsRequest(request: IncomingMessage): WsAuthResult {
  let url: URL;
  try {
    url = new URL(request.url || '', 'http://localhost');
  } catch {
    return { ok: false, trusted: false, principal: 'compat', reason: 'URL inválida' };
  }
  const type = url.searchParams.get('type') || 'branch';
  const branchId = url.searchParams.get('branchId') || 'suc-001';

  if (type === 'farmadesk-agent') {
    return verifyAgentKey(branchId, url.searchParams.get('agentKey'))
      ? { ok: true, trusted: false, principal: 'agent' }
      : { ok: false, trusted: false, principal: 'agent', reason: 'agentKey inválida' };
  }

  const user = verifySessionToken(url.searchParams.get('auth'));
  if (user && !user.mustChangePassword) return { ok: true, trusted: true, principal: 'user' };

  const key = getSyncKey();
  const providedKey = url.searchParams.get('syncKey');
  if (key && providedKey && safeEqual(providedKey, key)) return { ok: true, trusted: true, principal: 'sync' };

  // Modo compatible: sin clave de sync configurada, una sede puede conectarse pero sin poder
  // enviar comandos de control. Los paneles de administración siempre requieren credencial.
  if (!key && type === 'branch') {
    warnNoSyncKeyOnce();
    return { ok: true, trusted: false, principal: 'compat' };
  }
  return { ok: false, trusted: false, principal: 'compat', reason: 'credenciales ausentes o inválidas' };
}

/** Rechaza un upgrade WebSocket no autorizado. */
export function rejectWsUpgrade(socket: { write: (s: string) => void; destroy: () => void }, reason?: string) {
  try {
    socket.write(`HTTP/1.1 401 Unauthorized\r\nX-Reason: ${String(reason || 'unauthorized').replace(/[^\x20-\x7e]/g, '')}\r\nConnection: close\r\n\r\n`);
  } finally {
    socket.destroy();
  }
}
