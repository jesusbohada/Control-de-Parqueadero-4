import {
  RatesConfig,
  VehicleCategoryConfig,
  ExpenseConcept,
  ExpenseCategory,
  SystemUser,
  BranchLocation,
  CentralUpdatePackage
} from '../types';

export type SyncDomainCategory = 
  | 'tariffs_and_pricing'    // Tarifas, Categorías vehiculares, Reglas de redondeo, Fracciones
  | 'inventory_and_sales'    // Productos de tienda, Stock, Bodegas, Listas de precios
  | 'financial_and_expenses' // Conceptos de gasto, Categorías de gasto, Métodos de pago, Cuentas Bre-B/QR
  | 'users_and_security'     // Usuarios, Roles, Plantillas de permisos, Políticas de seguridad
  | 'business_and_legal'     // Razón social, NIT, Resolución DIAN/Prefijos, Leyendas de ticket, Logo
  | 'agreements_and_discounts'// Convenios empresariales, Mensualidades/Abonados, Cupones, Descuentos
  | 'telemetry_and_auditing' // Telemetría de plazas en vivo, Auditoría de eventos, Cierres de turno/día
  | 'hardware_and_iot'       // Configuración de talanqueras, Cámaras LPR, Lectores RFID, Impresoras
  | 'software_and_system';   // Versiones OTA, Parches de software, Esquemas de base de datos

export type SyncDirection = 'bidirectional' | 'central_to_branch' | 'branch_to_central';
export type SyncConflictStrategy = 'central_master' | 'latest_timestamp' | 'merge_records';
export type SyncFrequency = 'realtime' | 'every_minute' | 'every_5_minutes' | 'on_shift_event' | 'manual_only';

export interface SyncDomainItem {
  id: string;
  code: string;
  name: string;
  category: SyncDomainCategory;
  description: string;
  version: string;
  iconName: string;
  
  // Configuración operativa
  enabled: boolean;
  direction: SyncDirection;
  conflictStrategy: SyncConflictStrategy;
  frequency: SyncFrequency;
  targetBranchesScope: 'all' | 'specific';
  targetBranchIds?: string[];
  
  // Clave de datos e integraciones
  entityKey: string;
  lastSyncTimestamp?: string;
  totalRecordsCount?: number;
  dataPayloadSizeKb?: number;
  isExtensiblePlugin?: boolean;
  authorModule?: string;
}

export interface SyncMasterPolicyConfig {
  id: string;
  policyName: string;
  updatedAt: string;
  updatedBy: string;
  autoDiscoverNewModules: boolean;
  domains: SyncDomainItem[];
  globalSyncIntervalSeconds: number;
  enableEncryption: boolean;
  compressionEnabled: boolean;
}

const LOCAL_STORAGE_KEY_SYNC_MATRIX = 'pk_sync_domain_master_matrix';

/**
 * Catálogo Base de Dominios Sincronizables del Sistema Parqueadero POS
 * Se expande automáticamente con nuevos desarrollos y plugins.
 */
export const DEFAULT_SYNC_DOMAINS: SyncDomainItem[] = [
  {
    id: 'domain_rates_pricing',
    code: 'TARIFAS_BASE',
    name: 'Tarifas por Minuto, Hora y Día',
    category: 'tariffs_and_pricing',
    description: 'Tarifas de cobro por vehículo, periodos de gracia, tiempo mínimo y multas por pérdida de ticket.',
    version: '2.4.0',
    iconName: 'DollarSign',
    enabled: true,
    direction: 'central_to_branch',
    conflictStrategy: 'central_master',
    frequency: 'realtime',
    targetBranchesScope: 'all',
    entityKey: 'rates',
    authorModule: 'Core Pricing Engine'
  },
  {
    id: 'domain_vehicle_categories',
    code: 'CAT_VEHICULOS',
    name: 'Categorías y Tipos de Vehículos',
    category: 'tariffs_and_pricing',
    description: 'Carros, Motos, Camionetas, Bicicletas, Camiones y tipos personalizados con sus respectivos iconos.',
    version: '2.1.0',
    iconName: 'Car',
    enabled: true,
    direction: 'central_to_branch',
    conflictStrategy: 'central_master',
    frequency: 'realtime',
    targetBranchesScope: 'all',
    entityKey: 'vehicleCategories',
    authorModule: 'Vehicle Management'
  },
  {
    id: 'domain_expense_concepts',
    code: 'GASTOS_CONCEPTOS',
    name: 'Conceptos y Categorías de Gastos de Caja',
    category: 'financial_and_expenses',
    description: 'Catálogo de egresos autorizados (suministros, aseo, mantenimiento, servicios públicos, nómina menor).',
    version: '1.8.0',
    iconName: 'Receipt',
    enabled: true,
    direction: 'central_to_branch',
    conflictStrategy: 'central_master',
    frequency: 'every_5_minutes',
    targetBranchesScope: 'all',
    entityKey: 'expenseConcepts',
    authorModule: 'Cash Flow Management'
  },
  {
    id: 'domain_users_and_roles',
    code: 'USUARIOS_ROLES',
    name: 'Usuarios, Cajeros y Plantillas de Permisos',
    category: 'users_and_security',
    description: 'Credenciales de acceso de cajeros, administradores y matriz de permisos por perfil.',
    version: '2.0.0',
    iconName: 'Users',
    enabled: true,
    direction: 'central_to_branch',
    conflictStrategy: 'central_master',
    frequency: 'realtime',
    targetBranchesScope: 'all',
    entityKey: 'users',
    authorModule: 'Security & Access Control'
  },
  {
    id: 'domain_products_store',
    code: 'PRODUCTOS_TIENDA',
    name: 'Productos de Tienda, Cafetería y Accesorios',
    category: 'inventory_and_sales',
    description: 'Catálogo de artículos en venta (bebidas, snacks, lubricantes, cascos), códigos de barras y precios.',
    version: '1.6.0',
    iconName: 'ShoppingBag',
    enabled: true,
    direction: 'central_to_branch',
    conflictStrategy: 'central_master',
    frequency: 'every_5_minutes',
    targetBranchesScope: 'all',
    entityKey: 'products',
    authorModule: 'POS Mini-Market'
  },
  {
    id: 'domain_warehouses_inventory',
    code: 'BODEGAS_STOCK',
    name: 'Bodegas, Patios y Existencias de Inventario',
    category: 'inventory_and_sales',
    description: 'Niveles de stock centralizado, transferencias entre sucursales y puntos de reorden.',
    version: '1.3.0',
    iconName: 'Boxes',
    enabled: true,
    direction: 'bidirectional',
    conflictStrategy: 'merge_records',
    frequency: 'every_5_minutes',
    targetBranchesScope: 'all',
    entityKey: 'warehouses',
    authorModule: 'Multi-Warehouse Engine'
  },
  {
    id: 'domain_agreements_monthly',
    code: 'CONVENIOS_ABONADOS',
    name: 'Convenios Empresariales y Mensualidades / Abonados',
    category: 'agreements_and_discounts',
    description: 'Contratos con empresas aliadas, placas de abonados mensuales, fechas de vencimiento y descuentos.',
    version: '2.2.0',
    iconName: 'Handshake',
    enabled: true,
    direction: 'bidirectional',
    conflictStrategy: 'merge_records',
    frequency: 'realtime',
    targetBranchesScope: 'all',
    entityKey: 'agreements',
    authorModule: 'Agreements & Subscriptions'
  },
  {
    id: 'domain_business_identity',
    code: 'INFO_EMPRESA',
    name: 'Identidad Comercial, NIT y Textos Fiscales DIAN',
    category: 'business_and_legal',
    description: 'Razón social, NIT, dirección, teléfonos, pie de ticket, numeración autorizada y logo corporativo.',
    version: '1.5.0',
    iconName: 'Building2',
    enabled: true,
    direction: 'central_to_branch',
    conflictStrategy: 'central_master',
    frequency: 'on_shift_event',
    targetBranchesScope: 'all',
    entityKey: 'businessInfo',
    authorModule: 'Fiscal & Billing Setup'
  },
  {
    id: 'domain_payment_gateways',
    code: 'PASARELAS_PAGO',
    name: 'Billeteras Digitales, Códigos QR y Llaves Bre-B',
    category: 'financial_and_expenses',
    description: 'Cuentas Nequi, Daviplata, QR Bancolombia, Redeban y llaves de interoperabilidad Bre-B autorizadas.',
    version: '2.0.0',
    iconName: 'CreditCard',
    enabled: true,
    direction: 'central_to_branch',
    conflictStrategy: 'central_master',
    frequency: 'realtime',
    targetBranchesScope: 'all',
    entityKey: 'paymentGateways',
    authorModule: 'Digital Payments Hub'
  },
  {
    id: 'domain_yard_telemetry',
    code: 'TELEMETRIA_PATIO',
    name: 'Ocupación de Patio en Vivo y Plazas Disponibles',
    category: 'telemetry_and_auditing',
    description: 'Monitoreo en tiempo real de vehículos estacionados, plazas libres y aforo por sucursal.',
    version: '2.5.0',
    iconName: 'Activity',
    enabled: true,
    direction: 'branch_to_central',
    conflictStrategy: 'latest_timestamp',
    frequency: 'realtime',
    targetBranchesScope: 'all',
    entityKey: 'yardTelemetry',
    authorModule: 'Real-Time IoT & Telemetry'
  },
  {
    id: 'domain_shift_closures',
    code: 'CIERRES_TURNOS',
    name: 'Cierres de Turno, Arqueos y Cierres Definitivos de Día',
    category: 'telemetry_and_auditing',
    description: 'Transmisión consolidada de ventas, dinero recaudado, descuadres y novedades operativas.',
    version: '2.3.0',
    iconName: 'FileSpreadsheet',
    enabled: true,
    direction: 'branch_to_central',
    conflictStrategy: 'latest_timestamp',
    frequency: 'on_shift_event',
    targetBranchesScope: 'all',
    entityKey: 'shiftClosures',
    authorModule: 'Financial Auditing'
  },
  {
    id: 'domain_audit_security_logs',
    code: 'LOGS_AUDITORIA',
    name: 'Registro de Auditoría de Seguridad y Eventos',
    category: 'users_and_security',
    description: 'Trazabilidad de modificaciones de tarifas, aperturas de cajón, anulaciones y cambios de sistema.',
    version: '1.7.0',
    iconName: 'ShieldAlert',
    enabled: true,
    direction: 'branch_to_central',
    conflictStrategy: 'merge_records',
    frequency: 'every_5_minutes',
    targetBranchesScope: 'all',
    entityKey: 'auditLogs',
    authorModule: 'System Security Logger'
  },
  {
    id: 'domain_hardware_lpr_iot',
    code: 'HARDWARE_IOT',
    name: 'Configuraciones de Talanqueras, LPR y Cámaras',
    category: 'hardware_and_iot',
    description: 'Parámetros de cámaras de reconocimiento de placas (LPR), lectores RFID y control de barreras.',
    version: '1.2.0',
    iconName: 'Cpu',
    enabled: true,
    direction: 'central_to_branch',
    conflictStrategy: 'central_master',
    frequency: 'manual_only',
    targetBranchesScope: 'all',
    entityKey: 'hardwareConfig',
    authorModule: 'LPR & Hardware Automation'
  },
  {
    id: 'domain_software_updates_ota',
    code: 'ACTUALIZACIONES_OTA',
    name: 'Despliegues de Software, Parches y Nuevas Versiones',
    category: 'software_and_system',
    description: 'Distribución automática de nuevas funciones, mejoras de código y parches de estabilidad a las sucursales.',
    version: '3.0.0',
    iconName: 'DownloadCloud',
    enabled: true,
    direction: 'central_to_branch',
    conflictStrategy: 'central_master',
    frequency: 'realtime',
    targetBranchesScope: 'all',
    entityKey: 'softwareBuilds',
    authorModule: 'OTA Software Updater'
  }
];

/**
 * Obtener la Política Maestra de Sincronización
 */
export function getSyncMasterPolicy(): SyncMasterPolicyConfig {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SYNC_MATRIX);
    if (saved) {
      const parsed: SyncMasterPolicyConfig = JSON.parse(saved);
      // Auto-descubrimiento y fusión con nuevos dominios que se hayan incorporado al código
      if (parsed && Array.isArray(parsed.domains)) {
        const existingIds = new Set(parsed.domains.map(d => d.id));
        const missingDefaults = DEFAULT_SYNC_DOMAINS.filter(d => !existingIds.has(d.id));
        
        if (missingDefaults.length > 0 && parsed.autoDiscoverNewModules !== false) {
          parsed.domains = [...parsed.domains, ...missingDefaults];
          saveSyncMasterPolicy(parsed);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[SyncPolicy] Error leyendo política maestra, usando predeterminada:', e);
  }

  const defaultPolicy: SyncMasterPolicyConfig = {
    id: 'policy_master_default',
    policyName: 'Directiva Maestra de Sincronización Multi-Sede',
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin_central',
    autoDiscoverNewModules: true,
    domains: DEFAULT_SYNC_DOMAINS,
    globalSyncIntervalSeconds: 60,
    enableEncryption: true,
    compressionEnabled: true
  };

  saveSyncMasterPolicy(defaultPolicy);
  return defaultPolicy;
}

/**
 * Guardar la Política Maestra de Sincronización
 */
export function saveSyncMasterPolicy(policy: SyncMasterPolicyConfig): void {
  try {
    policy.updatedAt = new Date().toISOString();
    localStorage.setItem(LOCAL_STORAGE_KEY_SYNC_MATRIX, JSON.stringify(policy));
    
    // Sincronizar con el backend si está disponible
    fetch('/api/sync/master-policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policy })
    }).catch(() => {
      // Offline fallback
    });
  } catch (e) {
    console.error('[SyncPolicy] Error guardando política maestra:', e);
  }
}

/**
 * Registrar dinámicamente un nuevo dominio de sincronización (para nuevos desarrollos / plugins)
 */
export function registerDynamicSyncDomain(newDomain: Omit<SyncDomainItem, 'version'> & { version?: string }): SyncDomainItem {
  const currentPolicy = getSyncMasterPolicy();
  const existingIdx = currentPolicy.domains.findIndex(d => d.id === newDomain.id || d.entityKey === newDomain.entityKey);

  const fullDomainItem: SyncDomainItem = {
    ...newDomain,
    version: newDomain.version || '1.0.0',
    isExtensiblePlugin: true
  };

  if (existingIdx >= 0) {
    currentPolicy.domains[existingIdx] = {
      ...currentPolicy.domains[existingIdx],
      ...fullDomainItem
    };
  } else {
    currentPolicy.domains.push(fullDomainItem);
  }

  saveSyncMasterPolicy(currentPolicy);
  return fullDomainItem;
}

/**
 * Generar un paquete de actualización central respetando únicamente los dominios activados en la política
 */
export function buildFilteredCentralPackage(
  title: string,
  description: string,
  targetScope: 'all' | 'specific',
  targetBranchIds: string[],
  activePolicy: SyncMasterPolicyConfig,
  currentGlobalState: {
    rates?: RatesConfig;
    vehicleCategories?: VehicleCategoryConfig[];
    expenseConcepts?: ExpenseConcept[];
    expenseCategories?: ExpenseCategory[];
    users?: SystemUser[];
    products?: any[];
    warehouses?: any[];
    agreements?: any[];
    businessInfo?: any;
    paymentGateways?: any;
    softwareBuilds?: any[];
    [key: string]: any;
  }
): CentralUpdatePackage {
  const enabledDomains = activePolicy.domains.filter(d => d.enabled && (d.direction === 'central_to_branch' || d.direction === 'bidirectional'));
  const enabledKeys = new Set(enabledDomains.map(d => d.entityKey));

  const payload: any = {};

  if (enabledKeys.has('rates') && currentGlobalState.rates) {
    payload.rates = currentGlobalState.rates;
  }
  if (enabledKeys.has('vehicleCategories') && currentGlobalState.vehicleCategories) {
    payload.vehicleCategories = currentGlobalState.vehicleCategories;
  }
  if (enabledKeys.has('expenseConcepts') && currentGlobalState.expenseConcepts) {
    payload.expenseConcepts = currentGlobalState.expenseConcepts;
  }
  if (enabledKeys.has('expenseCategories') && currentGlobalState.expenseCategories) {
    payload.expenseCategories = currentGlobalState.expenseCategories;
  }
  if (enabledKeys.has('users') && currentGlobalState.users) {
    payload.users = currentGlobalState.users;
  }
  if (enabledKeys.has('products') && currentGlobalState.products) {
    payload.products = currentGlobalState.products;
  }
  if (enabledKeys.has('warehouses') && currentGlobalState.warehouses) {
    payload.warehouses = currentGlobalState.warehouses;
  }
  if (enabledKeys.has('agreements') && currentGlobalState.agreements) {
    payload.agreements = currentGlobalState.agreements;
  }
  if (enabledKeys.has('businessInfo') && currentGlobalState.businessInfo) {
    payload.businessInfo = currentGlobalState.businessInfo;
  }
  if (enabledKeys.has('paymentGateways') && currentGlobalState.paymentGateways) {
    payload.paymentGateways = currentGlobalState.paymentGateways;
  }
  if (enabledKeys.has('softwareBuilds') && currentGlobalState.softwareBuilds) {
    payload.softwareBuilds = currentGlobalState.softwareBuilds;
  }

  // Include any extra custom/plugin keys
  for (const domain of enabledDomains) {
    if (domain.isExtensiblePlugin && currentGlobalState[domain.entityKey] !== undefined) {
      payload[domain.entityKey] = currentGlobalState[domain.entityKey];
    }
  }

  return {
    id: `PKG-${Date.now()}`,
    packageNumber: `PKG-${Date.now().toString().slice(-6)}`,
    title,
    description: description || `Directiva con ${enabledDomains.length} dominios sincronizados`,
    createdAt: new Date().toISOString(),
    author: activePolicy.updatedBy || 'admin_central',
    targetScope,
    targetBranchIds: targetScope === 'specific' ? targetBranchIds : [],
    appliedByBranches: [],
    payload
  };
}
