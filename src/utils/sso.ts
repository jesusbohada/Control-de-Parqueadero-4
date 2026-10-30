import { SystemUser } from '../types';

export interface SsoPayload {
  user: {
    id: string;
    username: string;
    name: string;
    role: SystemUser['role'];
    assignedProfiles?: string[];
    permissions?: SystemUser['permissions'];
    uiVisibility?: SystemUser['uiVisibility'];
    isActive?: boolean;
    createdAt?: string;
  };
  fromCentral: boolean;
  timestamp: number;
}

/**
 * Codifica de manera ultra robusta y segura para URLs el token de sesión SSO.
 * Utiliza Base64 URL-safe (reemplaza '+' por '-' y '/' por '_', sin padding '=')
 * para garantizar compatibilidad universal sin alteraciones por navegadores o proxies.
 */
export function encodeSsoToken(user: SystemUser): string {
  try {
    const payload: SsoPayload = {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        assignedProfiles: user.assignedProfiles || [user.role],
        permissions: user.permissions,
        uiVisibility: user.uiVisibility,
        isActive: user.isActive,
        createdAt: user.createdAt
      },
      fromCentral: true,
      timestamp: Date.now()
    };

    const jsonStr = JSON.stringify(payload);
    // Codificación UTF-8 segura compatible con tildes y caracteres especiales
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return base64;
  } catch (err) {
    console.error('[SSO Encode Error]', err);
    // Fallback: URI component codificado directo
    return encodeURIComponent(JSON.stringify({ user, fromCentral: true, timestamp: Date.now() }));
  }
}

/**
 * Decodifica de forma segura el token SSO soportando:
 * 1. URL-Safe Base64 (- y _)
 * 2. Standard Base64 (+ y / con o sin padding)
 * 3. Base64 con espacios convertidos desde '+'
 * 4. Fallback de JSON codificado en URI
 */
export function decodeSsoToken(rawToken: string | null | undefined): SystemUser | null {
  if (!rawToken || typeof rawToken !== 'string') return null;

  const trimmed = rawToken.trim();
  if (!trimmed) return null;

  // 1. Intento principal: Base64 (URL-Safe o estándar)
  try {
    let clean = trimmed.replace(/-/g, '+').replace(/_/g, '/').replace(/ /g, '+');
    while (clean.length % 4 !== 0) {
      clean += '=';
    }
    const jsonStr = decodeURIComponent(escape(atob(clean)));
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.user && typeof parsed.user === 'object') {
      return parsed.user as SystemUser;
    }
    if (parsed && parsed.username && parsed.role) {
      return parsed as SystemUser;
    }
  } catch (e) {
    // Si falla atob, continuar con fallback
  }

  // 2. Intento secundario: JSON directo URI-encoded
  try {
    const decodedUri = decodeURIComponent(trimmed);
    const parsed = JSON.parse(decodedUri);
    if (parsed && parsed.user && typeof parsed.user === 'object') {
      return parsed.user as SystemUser;
    }
    if (parsed && parsed.username && parsed.role) {
      return parsed as SystemUser;
    }
  } catch (e) {
    // ignorar
  }

  return null;
}
