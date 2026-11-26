/**
 * SSO Central → Sucursal.
 *
 * El token lo firma el servidor Central (POST /api/auth/sso-token) con la clave compartida
 * SYNC_SHARED_KEY; la sucursal lo valida en su propio servidor (POST /api/auth/sso-exchange)
 * y emite una sesión local. Es de un solo uso y vence a los 2 minutos.
 * Si SYNC_SHARED_KEY no está configurada, el SSO queda deshabilitado y la sucursal pide login.
 */

/** Solicita al servidor local un token SSO firmado para el usuario en sesión. */
export async function requestSsoToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/sso-token', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.token) return data.token as string;
    if (data.error) console.warn('[SSO]', data.error);
  } catch (err) {
    console.warn('[SSO] No se pudo obtener el token SSO:', err);
  }
  return null;
}

/**
 * Abre una pestaña hacia la sucursal con SSO. La pestaña se abre de inmediato (evita el
 * bloqueo de ventanas emergentes) y se redirige cuando llega el token.
 * `buildUrl` recibe el sufijo de consulta (`sso=...`) o cadena vacía si el SSO no está disponible.
 */
export async function openWithSso(buildUrl: (ssoQuery: string) => string): Promise<void> {
  const win = window.open('about:blank', '_blank');
  const token = await requestSsoToken();
  const target = buildUrl(token ? `sso=${encodeURIComponent(token)}` : '');
  if (win) {
    win.location.href = target;
  } else {
    window.open(target, '_blank');
  }
}

/** Canjea en el servidor local el token SSO recibido por URL. */
export async function exchangeSsoToken(token: string): Promise<{ user: any; token: string } | null> {
  try {
    const res = await fetch('/api/auth/sso-exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.token && data.user) return { user: data.user, token: data.token };
    console.warn('[SSO]', data.error || 'Token SSO rechazado');
  } catch (err) {
    console.warn('[SSO] Error canjeando token:', err);
  }
  return null;
}
