/**
 * ============================================================================
 * TIPOS DE TEMA Y APARIENCIA POS (WolfZone POS)
 * ============================================================================
 * Tema Único de Facturación y Control de Parqueadero con Selector Claro / Oscuro.
 */

export type ThemeMode = 'light' | 'dark';
export type ContrastLevel = 'low' | 'medium' | 'high';

export interface ThemeChoiceOption {
  id: ThemeMode;
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  bgPreview: string;
  cardPreview: string;
  textPreview: string;
}

export const DUAL_THEME_OPTIONS: ThemeChoiceOption[] = [
  {
    id: 'light',
    name: 'Tema Claro (Light)',
    subtitle: 'Blanco Técnico Antirreflejo & Grafito de Alta Nitidez',
    description: 'Entorno visual limpio, luminoso y pulcro con tipografía oscura profunda (WCAG AAA). Ideal para taquillas con luz solar, cabinas exteriores y turnos diurnos.',
    badge: 'Recomendado Día',
    bgPreview: '#F8FAFC',
    cardPreview: '#FFFFFF',
    textPreview: '#020617',
  },
  {
    id: 'dark',
    name: 'Tema Oscuro (Dark)',
    subtitle: 'Carbón Profundo & Ámbar Táctico POS',
    description: 'Paleta industrial de alto contraste con tipografía blanca nítida y reducción total de fatiga visual. Ideal para garajes subterráneos, turnos nocturnos y pantallas táctiles.',
    badge: 'Recomendado Noche / POS',
    bgPreview: '#0B0F19',
    cardPreview: '#1E293B',
    textPreview: '#F8FAFC',
  }
];

export const SOBER_THEME_CHOICES = DUAL_THEME_OPTIONS;

export interface ContrastLevelOption {
  id: ContrastLevel;
  name: string;
  shortLabel: string;
  description: string;
  ratioTarget: string;
  badge: string;
}

export const CONTRAST_LEVEL_OPTIONS: ContrastLevelOption[] = [
  {
    id: 'low',
    name: 'Contraste Bajo (Suave)',
    shortLabel: 'Bajo',
    description: 'Tonos atenuados y sutiles para menor impacto visual.',
    ratioTarget: '≥ 3.0:1',
    badge: 'Suave'
  },
  {
    id: 'medium',
    name: 'Contraste Medio (Estándar WCAG AA)',
    shortLabel: 'Medio',
    description: 'Equilibrio cromático óptimo y cumplimiento de norma WCAG AA (4.5:1).',
    ratioTarget: '≥ 4.5:1 (AA)',
    badge: 'Estándar'
  },
  {
    id: 'high',
    name: 'Contraste Alto (Forzado WCAG AAA)',
    shortLabel: 'Alto',
    description: 'Paleta forzada de máxima definición, textos ultra sólidos y bordes nítidos.',
    ratioTarget: '≥ 7.0:1 (AAA)',
    badge: 'Máxima Nitidez'
  }
];

// Compatibilidad con referencias legacy
export type ThemeId = string;
export type EnvThemeId = string;
export type UiStyleId = 'default' | (string & {});
export const THEME_OPTIONS = DUAL_THEME_OPTIONS;
export const ENV_THEME_OPTIONS = DUAL_THEME_OPTIONS;
export const UI_STYLE_OPTIONS: any[] = [];
