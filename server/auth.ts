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
}

interface SessionClaims {
  uid: string;
  usr: string;
  nam: string;
  rol: string;
  iat: number;
  exp: number;
  jti: string;
}

const SESSION_TTL_MS = 16 * 60 * 60 * 1000; // 16 h: cubre un turno largo
const revokedSessions = new Map<string, number>(); // jti → exp

export function issueSessionToken(user: { id: string; username: string; name?: string; role: string }): { token: string; expiresAt: string } {
  const now = Date.now();
  const claims: SessionClaims = {
    uid: user.id,
    usr: user.username,
    nam: user.name || user.username,
    rol: user.role,
    iat: now,
    exp: now + SESSION_TTL_MS,
    jti: crypto.randomBytes(12).toString('base64url'),
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
    return { kind: 'user', uid: c.uid, username: c.usr, name: c.nam, role: c.rol, jti: c.jti, exp: c.exp };
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
  // Instaladores/agentes FarmaDesk: se descargan con `iex`/navegador sin sesión.
  { method: 'GET', path: '/api/farmadesk/script/', prefix: true },
  { method: 'GET', path: '/api/farmadesk/download/', prefix: true },
  { method: 'POST', path: '/api/farmadesk/access-code/verify' },
  { method: 'POST', path: '/api/farmadesk/pin/verify' },
];

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
  if (isPublicRoute(req.method, p)) return next();

  const principal = verifySessionToken(extractBearer(req));
  if (principal) {
    req.auth = principal;
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
