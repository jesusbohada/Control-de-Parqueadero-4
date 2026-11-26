/**
 * Sesión autenticada del cliente.
 *
 * - Guarda el token de sesión emitido por el servidor (/api/auth/login o /api/auth/sso-exchange).
 * - Instala un interceptor global de `fetch` que:
 *     · añade `Authorization: Bearer <token>` a las peticiones /api del mismo origen;
 *     · añade `X-Sync-Key` a las peticiones /api de otros servidores (Central ↔ Sucursal);
 *     · ante un 401 con `X-Auth-Required` del propio servidor, cierra la sesión local
 *       y emite el evento `wz:auth-expired`.
 * El token nunca se envía a otros orígenes.
 */

const TOKEN_KEY = 'wz_auth_token';
const SYNC_KEY_KEY = 'wz_sync_key';
export const AUTH_EXPIRED_EVENT = 'wz:auth-expired';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null | undefined) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* almacenamiento no disponible */
  }
}

function getSyncKey(): string | null {
  try {
    return sessionStorage.getItem(SYNC_KEY_KEY);
  } catch {
    return null;
  }
}

function setSyncKey(key: string | null) {
  try {
    if (key) sessionStorage.setItem(SYNC_KEY_KEY, key);
    else sessionStorage.removeItem(SYNC_KEY_KEY);
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Borra toda credencial local (token, clave de sync y usuario en sesión). */
export function clearAuthSession() {
  setAuthToken(null);
  setSyncKey(null);
  try {
    localStorage.removeItem('pk_current_user');
    sessionStorage.removeItem('pk_current_user');
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Obtiene la clave de sincronización del servidor local (si está configurada). */
export async function refreshSyncKey(): Promise<void> {
  if (!getAuthToken()) return;
  try {
    const res = await fetch('/api/auth/sync-key');
    if (!res.ok) return;
    const data = await res.json();
    setSyncKey(typeof data.syncKey === 'string' && data.syncKey ? data.syncKey : null);
  } catch {
    /* sin conexión: se reintentará en el próximo inicio */
  }
}

/** Cierra la sesión en el servidor (revoca el token) y limpia el estado local. */
export async function serverLogout(): Promise<void> {
  try {
    if (getAuthToken()) await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    /* ignorar */
  } finally {
    clearAuthSession();
  }
}

/** Para descargas por navegación directa (no pueden enviar encabezados). Solo rutas GET del mismo origen. */
export function withAccessToken(url: string): string {
  const token = getAuthToken();
  if (!token) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}access_token=${encodeURIComponent(token)}`;
}

/**
 * Credenciales para el handshake WebSocket (los navegadores no permiten encabezados):
 * token de sesión hacia el propio servidor; clave de sync hacia otros servidores.
 */
export function appendWsCredentials(wsUrl: string): string {
  try {
    const url = new URL(wsUrl);
    const sameHost = url.host === window.location.host;
    if (sameHost) {
      const token = getAuthToken();
      if (token) url.searchParams.set('auth', token);
    } else {
      const syncKey = getSyncKey();
      if (syncKey) url.searchParams.set('syncKey', syncKey);
    }
    return url.toString();
  } catch {
    return wsUrl;
  }
}

function resolveUrl(input: RequestInfo | URL): URL | null {
  try {
    if (typeof input === 'string') return new URL(input, window.location.href);
    if (input instanceof URL) return input;
    return new URL(input.url, window.location.href);
  } catch {
    return null;
  }
}

let installed = false;

export function installAuthFetchInterceptor() {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  installed = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = resolveUrl(input);
    if (!url || !url.pathname.startsWith('/api/')) {
      return originalFetch(input, init);
    }

    const sameOrigin = url.origin === window.location.origin;
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    const token = sameOrigin ? getAuthToken() : null;

    if (sameOrigin) {
      if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    } else {
      const syncKey = getSyncKey();
      if (syncKey && !headers.has('X-Sync-Key')) headers.set('X-Sync-Key', syncKey);
    }

    const response = await originalFetch(input, { ...init, headers });

    if (sameOrigin && token && response.status === 401 && response.headers.get('X-Auth-Required') === '1') {
      clearAuthSession();
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    return response;
  };
}
