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

const glassKeyFor = (userId?: string) => `wz_patio_glass:${userId || 'anon'}`;

function readGlass(userId?: string): boolean {
  try { return localStorage.getItem(glassKeyFor(userId)) === '1'; } catch { return false; }
}

/** Efecto cristal de las vistas nuevas, por usuario en este equipo. Apagado por defecto. */
export function usePatioGlass(userId?: string) {
  const [glass, setGlassState] = useState<boolean>(() => readGlass(userId));
  useEffect(() => { setGlassState(readGlass(userId)); }, [userId]);
  const setGlass = useCallback((v: boolean) => {
    setGlassState(v);
    try { localStorage.setItem(glassKeyFor(userId), v ? '1' : '0'); } catch { /* almacenamiento no disponible */ }
  }, [userId]);
  return [glass, setGlass] as const;
}
