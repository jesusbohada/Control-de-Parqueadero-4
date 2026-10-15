export type WorkspaceCategory = 'operations' | 'finance' | 'reports' | 'central' | 'updates' | 'config';

export type ActiveWorkspaceView = 
  | 'operations'
  | 'map'
  | 'spots'
  | 'anpr_camera'
  | 'cash'
  | 'expense_concepts'
  | 'reports'
  | 'branches'
  | 'central_hub'
  | 'central_dashboard'
  | 'branch_sync'
  | 'vnc_remote'
  | 'software_updater'
  | 'work_mode'
  | 'rates'
  | 'vehicle_categories'
  | 'users'
  | 'printer_config'
  | 'database'
  | 'agent_skills';

export interface ProtectedRouteConfig {
  /** Ruta URL relativa (ej: '/wolfzonepos', '/admin', '/auditoria') */
  path: string;
  /** Nombre visible del área administrativa */
  name: string;
  /** Descripción del propósito y operaciones que contiene */
  description: string;
  /** Rol mínimo o sugerido para esta área */
  requiredRole?: 'master' | 'admin' | 'supervisor' | 'cajero';
  /** Etiqueta destacada (badge) */
  badge: string;
  /** Color distintivo de la etiqueta */
  badgeColor?: string;
  /** Icono descriptivo */
  iconName?: 'Terminal' | 'ShieldAlert' | 'BarChart3' | 'Sliders' | 'Building2' | 'Radio' | 'Car' | 'FolderLock';
  /** Vista predeterminada al ingresar */
  defaultView?: ActiveWorkspaceView;
  /** Categoría predeterminada al ingresar */
  defaultCategory?: WorkspaceCategory;
  /** Si es la ruta predeterminada de fábrica */
  isDefault?: boolean;
}

export const DEFAULT_PROTECTED_ROUTES: ProtectedRouteConfig[] = [
  {
    path: '/pos',
    name: 'Terminal POS Principal (Control de Parqueadero)',
    description: 'Consola operativa directa de parqueadero, control de patio, entradas/salidas y cobro de tickets.',
    requiredRole: 'cajero',
    badge: 'POS Operativo',
    badgeColor: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30',
    iconName: 'Terminal',
    defaultView: 'operations',
    defaultCategory: 'operations',
    isDefault: true,
  },
  {
    path: '/wolfzonepos',
    name: 'Terminal POS (Acceso Legacy)',
    description: 'Consola operativa directa de parqueadero (compatibilidad de enlace anterior).',
    requiredRole: 'cajero',
    badge: 'POS Operativo',
    badgeColor: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30',
    iconName: 'Terminal',
    defaultView: 'operations',
    defaultCategory: 'operations',
    isDefault: false,
  },
  {
    path: '/admin',
    name: 'Área Administrativa Central',
    description: 'Gestión integral de tarifas, usuarios y permisos, celdas de estacionamiento y parámetros del sistema.',
    requiredRole: 'admin',
    badge: 'Administración',
    badgeColor: 'bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-500/30',
    iconName: 'Sliders',
    defaultView: 'rates',
    defaultCategory: 'config',
  },
  {
    path: '/auditoria',
    name: 'Control de Auditoría y Fiscal DIAN',
    description: 'Reportes ejecutivos en tiempo real, arqueos de caja, libro contable PUC y auditoría de turnos cerrados.',
    requiredRole: 'supervisor',
    badge: 'Auditoría Fiscal',
    badgeColor: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
    iconName: 'BarChart3',
    defaultView: 'reports',
    defaultCategory: 'reports',
  },
  {
    path: '/farmadesk',
    name: 'FarmaDesk Pro & Soporte Remoto',
    description: 'Control telemático de sedes, asistencia de escritorio remoto en Rust a 60 FPS, telemetría y sincronización central.',
    requiredRole: 'admin',
    badge: 'FarmaDesk Pro',
    badgeColor: 'bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-500/30',
    iconName: 'Radio',
    defaultView: 'vnc_remote',
    defaultCategory: 'central',
  },
  {
    path: '/terminal-spots',
    name: 'Gestión de Puntos POS & Infraestructura',
    description: 'Configuración de celdas físicas, cámaras de reconocimiento LPR y asignación de taquillas.',
    requiredRole: 'supervisor',
    badge: 'Infraestructura',
    badgeColor: 'bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-500/30',
    iconName: 'Car',
    defaultView: 'spots',
    defaultCategory: 'operations',
  }
];

export const getStoredAuthorizedRoutes = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem('wolfzone_authorized_routes') || localStorage.getItem('wolfzone_authorized_routes');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const saveAuthorizedRoute = (path: string) => {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredAuthorizedRoutes();
    const normalized = path.toLowerCase().trim();
    if (!current.includes(normalized)) {
      current.push(normalized);
      sessionStorage.setItem('wolfzone_authorized_routes', JSON.stringify(current));
      localStorage.setItem('wolfzone_authorized_routes', JSON.stringify(current));
    }
    sessionStorage.setItem('wolfzone_authorized_path', 'true');
    localStorage.setItem('wolfzone_authorized_path', 'true');
    sessionStorage.setItem('wolfzone_authorized_current_route', normalized);
  } catch (e) {
    console.error('Error saving authorized route:', e);
  }
};

export const clearAuthorizedRoutesSession = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('wolfzone_authorized_path');
  sessionStorage.removeItem('wolfzone_authorized_current_route');
  sessionStorage.removeItem('wolfzone_authorized_routes');
  localStorage.removeItem('wolfzone_authorized_path');
  localStorage.removeItem('wolfzone_authorized_routes');
};

export const getStoredDynamicRoutes = (): ProtectedRouteConfig[] => {
  if (typeof window === 'undefined') return DEFAULT_PROTECTED_ROUTES;
  try {
    const raw = localStorage.getItem('wolfzone_dynamic_protected_routes');
    if (!raw) return DEFAULT_PROTECTED_ROUTES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.error('Error loading dynamic protected routes from localStorage:', e);
  }
  return DEFAULT_PROTECTED_ROUTES;
};

export const saveDynamicRoutes = (routes: ProtectedRouteConfig[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('wolfzone_dynamic_protected_routes', JSON.stringify(routes));
  } catch (e) {
    console.error('Error saving dynamic protected routes to localStorage:', e);
  }
};

// ============================================================================
// SISTEMA DE AUDITORÍA Y TRAZABILIDAD DE RUTAS PROTEGIDAS (RouteAuditRecord)
// ============================================================================

export type RouteAuditEventType = 
  | 'ACCESS_GRANTED' 
  | 'ACCESS_DENIED' 
  | 'ROUTE_CREATED' 
  | 'ROUTE_UPDATED' 
  | 'ROUTE_DELETED' 
  | 'ROUTES_RESET';

export interface RouteAuditRecord {
  id: string;
  timestamp: string; // ISO 8601
  eventType: RouteAuditEventType;
  eventLabel: string;
  path: string;
  routeName: string;
  userId?: string;
  userName: string;
  userRole: string;
  ipAddress?: string;
  details: string;
  severity: 'info' | 'warning' | 'security' | 'success';
}

export const ROUTE_AUDIT_STORAGE_KEY = 'wolfzone_route_audit_history';

export const INITIAL_ROUTE_AUDIT_HISTORY: RouteAuditRecord[] = [
  {
    id: 'audit-001',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    eventType: 'ACCESS_GRANTED',
    eventLabel: 'Acceso Autorizado',
    path: '/wolfzonepos',
    routeName: 'Terminal POS Principal (WolfZone)',
    userName: 'Cajero Principal',
    userRole: 'cajero',
    ipAddress: '192.168.1.105',
    details: 'Apertura de terminal y validación de credencial operativa en punto POS.',
    severity: 'success'
  },
  {
    id: 'audit-002',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    eventType: 'ACCESS_GRANTED',
    eventLabel: 'Acceso Administrativo',
    path: '/admin',
    routeName: 'Área Administrativa Central',
    userName: 'Administrador General',
    userRole: 'admin',
    ipAddress: '192.168.1.100',
    details: 'Ingreso a panel de configuración de tarifas y celdas vehiculares.',
    severity: 'info'
  },
  {
    id: 'audit-003',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    eventType: 'ROUTE_UPDATED',
    eventLabel: 'Ruta Modificada',
    path: '/auditoria',
    routeName: 'Control de Auditoría y Fiscal DIAN',
    userName: 'Supervisor Operativo',
    userRole: 'supervisor',
    ipAddress: '192.168.1.102',
    details: 'Actualización del rol mínimo requerido a nivel supervisor para auditoría DIAN.',
    severity: 'warning'
  },
  {
    id: 'audit-004',
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
    eventType: 'ACCESS_GRANTED',
    eventLabel: 'Acceso a Telemática',
    path: '/farmadesk',
    routeName: 'FarmaDesk Pro & Soporte Remoto Sede',
    userName: 'Administrador General',
    userRole: 'admin',
    ipAddress: '192.168.1.100',
    details: 'Sesión telemática iniciada para diagnóstico de sincronización en red.',
    severity: 'info'
  }
];

export const getStoredRouteAuditHistory = (): RouteAuditRecord[] => {
  if (typeof window === 'undefined') return INITIAL_ROUTE_AUDIT_HISTORY;
  try {
    const raw = localStorage.getItem(ROUTE_AUDIT_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ROUTE_AUDIT_STORAGE_KEY, JSON.stringify(INITIAL_ROUTE_AUDIT_HISTORY));
      return INITIAL_ROUTE_AUDIT_HISTORY;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.error('Error loading route audit history from localStorage:', e);
  }
  return INITIAL_ROUTE_AUDIT_HISTORY;
};

export const logRouteAuditEvent = (event: Omit<RouteAuditRecord, 'id' | 'timestamp'>): RouteAuditRecord => {
  const newRecord: RouteAuditRecord = {
    ...event,
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      const history = getStoredRouteAuditHistory();
      // Keep most recent 500 records
      const updated = [newRecord, ...history].slice(0, 500);
      localStorage.setItem(ROUTE_AUDIT_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error persisting route audit event:', e);
    }
  }

  return newRecord;
};

export const clearRouteAuditHistory = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ROUTE_AUDIT_STORAGE_KEY);
  } catch (e) {
    console.error('Error clearing route audit history:', e);
  }
};


