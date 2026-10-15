/**
 * ============================================================================
 * GESTOR DE TEMA UNIFICADO POS (WolfZone POS - Parking & Billing)
 * ============================================================================
 * Gestión de Tema Único con Selector Claro / Oscuro, Sincronización Multi-Pestaña,
 * Persistencia en Almacenamiento Local y Blindaje de Accesibilidad WCAG AAA.
 */

export type ThemeMode = 'light' | 'dark';
export type ThemeScope = 'active_window' | 'global_project';
export type ContrastLevel = 'low' | 'medium' | 'high';

export const THEME_STORAGE_KEY = 'wolfpos_theme_mode';
export const CONTRAST_STORAGE_KEY = 'wolfpos_contrast_level';
export const STYLE_STORAGE_KEY = 'wolfpos_ui_style';
export const TEMPLATE_STORAGE_KEY = 'wolfpos_active_ui_template';

export interface ThemeColors {
  bgApp: string;
  bgCard: string;
  bgSurface: string;
  bgInput: string;
  borderUi: string;
  borderFocus: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  brandAccent: string;
  brandAccentBg: string;
  brandAccentText: string;
  brandGold: string;
  chartText: string;
  chartGrid: string;
}

export const LIGHT_THEME: ThemeColors = {
  bgApp: '#F8FAFC',
  bgCard: '#FFFFFF',
  bgSurface: '#FFFFFF',
  bgInput: '#F1F5F9',
  borderUi: '#E2E8F0',
  borderFocus: '#D97706',
  textPrimary: '#020617',
  textSecondary: '#334155',
  textMuted: '#64748B',
  brandAccent: '#2563EB',
  brandAccentBg: 'rgba(37, 99, 235, 0.08)',
  brandAccentText: '#1D4ED8',
  brandGold: '#D97706',
  chartText: '#334155',
  chartGrid: 'rgba(0, 0, 0, 0.06)',
};

export const DARK_THEME: ThemeColors = {
  bgApp: '#0B0F19',
  bgCard: '#1E293B',
  bgSurface: '#1E293B',
  bgInput: '#0F172A',
  borderUi: '#334155',
  borderFocus: '#F59E0B',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  brandAccent: '#3B82F6',
  brandAccentBg: 'rgba(59, 130, 246, 0.16)',
  brandAccentText: '#60A5FA',
  brandGold: '#F59E0B',
  chartText: '#CBD5E1',
  chartGrid: 'rgba(255, 255, 255, 0.08)',
};

type ThemeListener = (mode: ThemeMode) => void;
type StyleListener = (style: string) => void;

const themeListeners = new Set<ThemeListener>();
const styleListeners = new Set<StyleListener>();

export const ThemeManager = {
  themeKey: THEME_STORAGE_KEY,
  scopeKey: 'wolfpos_theme_scope',
  contrastKey: CONTRAST_STORAGE_KEY,
  styleKey: STYLE_STORAGE_KEY,
  templateKey: TEMPLATE_STORAGE_KEY,

  /**
   * Obtiene el modo de tema activo actual ('dark' | 'light')
   */
  getTheme(): ThemeMode {
    if (typeof window === 'undefined') return 'dark';
    try {
      const session = sessionStorage.getItem(this.themeKey);
      if (session === 'light' || session === 'dark') return session as ThemeMode;
      const local = localStorage.getItem(this.themeKey);
      if (local === 'light' || local === 'dark') return local as ThemeMode;
    } catch {
      /* ignore */
    }
    return 'dark'; // Predeterminado industrial para estaciones POS
  },

  getIsDark(): boolean {
    return this.getTheme() === 'dark';
  },

  /**
   * Plantilla única unificada
   */
  getStyle(): string {
    return 'default';
  },

  /**
   * Suscribe un listener a cambios reactivos de tema (Dark / Light)
   */
  subscribeTheme(callback: ThemeListener): () => void {
    themeListeners.add(callback);
    return () => themeListeners.delete(callback);
  },

  /**
   * Suscribe un listener a cambios reactivos (compatibilidad)
   */
  subscribeStyle(callback: StyleListener): () => void {
    styleListeners.add(callback);
    return () => styleListeners.delete(callback);
  },

  /**
   * Aplica el tema inmediatamente a la raíz HTML y sincroniza según el alcance
   */
  applyTheme(mode?: ThemeMode | boolean, scope: ThemeScope = 'global_project') {
    if (typeof document === 'undefined') return;

    let themeMode: ThemeMode;
    if (typeof mode === 'boolean') {
      themeMode = mode ? 'dark' : 'light';
    } else if (mode === 'light' || mode === 'dark') {
      themeMode = mode;
    } else {
      themeMode = this.getTheme();
    }

    const root = document.documentElement;
    root.setAttribute('data-theme', themeMode);
    root.removeAttribute('data-theme-style');
    root.classList.remove('light', 'dark');
    root.classList.add(themeMode);

    if (document.body) {
      document.body.classList.remove('light', 'dark');
      document.body.classList.add(themeMode);
      document.body.removeAttribute('data-theme-style');
    }

    if (scope === 'global_project') {
      try {
        localStorage.setItem(this.themeKey, themeMode);
        localStorage.setItem(this.scopeKey, scope);
        localStorage.setItem('wolfpos_dark_mode', String(themeMode === 'dark'));
        window.dispatchEvent(new StorageEvent('storage', { key: this.themeKey, newValue: themeMode }));
      } catch {
        /* ignore */
      }
    } else {
      try {
        sessionStorage.setItem(this.themeKey, themeMode);
        sessionStorage.setItem(this.scopeKey, scope);
      } catch {
        /* ignore */
      }
    }

    themeListeners.forEach(listener => {
      try {
        listener(themeMode);
      } catch (err) {
        console.error('Error en themeListener:', err);
      }
    });
  },

  /**
   * Compatibilidad hacia atrás
   */
  applyStyle(_style: string) {
    this.applyTheme(this.getTheme(), 'active_window');
  },

  resetToDefault(): string {
    this.applyTheme('dark', 'global_project');
    return 'default';
  },

  toggle(scope: ThemeScope = 'global_project'): ThemeMode {
    const next = this.getTheme() === 'dark' ? 'light' : 'dark';
    this.applyTheme(next, scope);
    return next;
  },

  initTheme() {
    const saved = this.getTheme();
    this.applyTheme(saved, 'active_window');
  },

  getContrastLevel(): ContrastLevel {
    if (typeof window === 'undefined') return 'medium';
    try {
      const saved = localStorage.getItem(this.contrastKey) as ContrastLevel;
      if (saved === 'low' || saved === 'medium' || saved === 'high') return saved;
    } catch {
      /* ignore */
    }
    return 'medium';
  },

  applyContrastLevel(level: ContrastLevel) {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-contrast-level', level);
    try {
      localStorage.setItem(this.contrastKey, level);
    } catch {
      /* ignore */
    }
  }
};
