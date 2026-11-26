import { useCallback, useEffect, useState } from 'react';

export type PatioUiVersion = 'clasica' | 'nueva';

const keyFor = (userId?: string) => `wz_patio_ui:${userId || 'anon'}`;

function read(userId?: string): PatioUiVersion {
  try {
    return localStorage.getItem(keyFor(userId)) === 'nueva' ? 'nueva' : 'clasica';
  } catch {
    return 'clasica';
  }
}

/**
 * Versión de la pantalla Patio POS elegida por cada usuario en este equipo.
 * Por defecto la clásica: la nueva es opcional y se puede volver con un clic.
 */
export function usePatioUiVersion(userId?: string) {
  const [version, setVersionState] = useState<PatioUiVersion>(() => read(userId));
  useEffect(() => { setVersionState(read(userId)); }, [userId]);
  const setVersion = useCallback((v: PatioUiVersion) => {
    setVersionState(v);
    try { localStorage.setItem(keyFor(userId), v); } catch { /* almacenamiento no disponible */ }
  }, [userId]);
  return [version, setVersion] as const;
}
