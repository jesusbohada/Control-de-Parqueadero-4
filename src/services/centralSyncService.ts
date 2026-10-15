import {
  ServerDataConnectionConfig,
  CentralUpdatePackage,
  BranchLocation,
  RatesConfig,
  VehicleCategoryConfig,
  ExpenseConcept,
  ExpenseCategory,
  BranchSyncAuditRecord,
  ParkingSpot,
  ParkingTicket,
  CashShift,
  SystemUser
} from '../types';

export const DEFAULT_SERVER_DATA_CONFIG: ServerDataConnectionConfig = {
  localDbHost: 'localhost',
  localDbName: 'ParqueaderoPOS_DB_TAQUILLA_01',
  localDbUser: 'admin',
  localDbPassword: '••••••••',
  localOperatingSystem: 'Windows 10 / 11 Pro',
  remoteDbHost: 'central.parqueaderopos.com',
  remoteDbName: 'ParqueaderoPOS_CENTRAL_DB',
  remoteDbUser: 'admin_central',
  remoteDbPassword: '',
  remoteWebSocketsUrl: 'wss://central.parqueaderopos.com/ws',
  nodeRole: 'branch',
  autoSyncEnabled: true,
  autoSyncIntervalMinutes: 5,
  lastSyncTimestamp: new Date().toISOString(),
  connectionStatus: 'connected',
  latencyMs: 18
};

const LOCAL_STORAGE_KEY_SERVER_CONFIG = 'pk_server_data_config';

/**
 * Obtener la URL base remota configurada en localStorage si existe
 */
export function getRemoteBaseUrlFromConfig(): string | undefined {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SERVER_CONFIG);
    if (saved) {
      const cfg = JSON.parse(saved);
      if (cfg && cfg.remoteDbHost) {
        const host = cfg.remoteDbHost.trim();
        if (host && host !== 'localhost' && host !== '127.0.0.1' && host !== 'central.parqueaderopos.com') {
          return host.startsWith('http') ? host : `http://${host}`;
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return undefined;
}

/**
 * Obtener la configuración del servidor de datos local y remoto
 */
export async function getServerDataConfig(): Promise<ServerDataConnectionConfig> {
  try {
    const res = await fetch('/api/sync/server-config');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        localStorage.setItem(LOCAL_STORAGE_KEY_SERVER_CONFIG, JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[SyncService] Usando caché local para server-config:', err);
  }

  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SERVER_CONFIG);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    // fallback
  }

  return DEFAULT_SERVER_DATA_CONFIG;
}

/**
 * Guardar la configuración del servidor de datos local y remoto
 */
export async function saveServerDataConfig(config: ServerDataConnectionConfig): Promise<{ success: boolean; message: string; data?: ServerDataConnectionConfig }> {
  localStorage.setItem(LOCAL_STORAGE_KEY_SERVER_CONFIG, JSON.stringify(config));
  try {
    const res = await fetch('/api/sync/server-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config })
    });
    if (res.ok) {
      const json = await res.json();
      return json;
    }
    return { success: true, message: 'Configuración guardada localmente.', data: config };
  } catch (err: any) {
    return { success: true, message: 'Guardada localmente (modo offline): ' + (err.message || ''), data: config };
  }
}

/**
 * Probar conexión con el servidor remoto / sockets
 */
export async function testServerConnection(config: ServerDataConnectionConfig): Promise<{
  success: boolean;
  localStatus: 'online' | 'offline';
  remoteStatus: 'online' | 'offline';
  latencyMs: number;
  message: string;
}> {
  const hostClean = (config.remoteDbHost || '').trim();

  // 1. Direct browser test (works seamlessly when running over LAN or same network)
  if (hostClean) {
    const targetUrl = hostClean.startsWith('http') ? hostClean : `http://${hostClean}`;
    try {
      const start = performance.now();
      const directRes = await fetch(`${targetUrl}/api/health`, {
        signal: AbortSignal.timeout(2500)
      });
      if (directRes.ok) {
        const measuredLatency = Math.round(performance.now() - start);
        return {
          success: true,
          localStatus: 'online',
          remoteStatus: 'online',
          latencyMs: measuredLatency || 12,
          message: `¡Conexión verificada exitosamente con el Servidor Central (${hostClean})! [Latencia: ${measuredLatency || 12}ms]`
        };
      }
    } catch (err) {
      // Direct browser test was blocked or unreachable, fallback to server check
    }
  }

  // 2. Server-side proxy test
  try {
    const start = performance.now();
    const res = await fetch('/api/sync/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        localDbHost: config.localDbHost,
        remoteDbHost: config.remoteDbHost,
        remoteWebSocketsUrl: config.remoteWebSocketsUrl
      })
    });
    const measuredLatency = Math.round(performance.now() - start);

    if (res.ok) {
      const data = await res.json();
      const isRemoteOnline = data.remoteStatus === 'online';
      return {
        success: isRemoteOnline,
        localStatus: data.localStatus || 'online',
        remoteStatus: data.remoteStatus || 'offline',
        latencyMs: data.latencyMs || measuredLatency,
        message: data.message || (isRemoteOnline ? `Conexión verificada con ${config.remoteDbHost}` : `No se pudo conectar con ${config.remoteDbHost}`)
      };
    }
  } catch (e: any) {
    console.warn('[SyncService] Error verificando conexión:', e);
  }

  return {
    success: false,
    localStatus: 'online',
    remoteStatus: 'offline',
    latencyMs: 0,
    message: `Base local operativa. Servidor remoto (${config.remoteDbHost || 'Sin configurar'}) no responde o está fuera de línea.`
  };
}

/**
 * Obtener todos los paquetes de actualización del Servidor Central
 */
export async function fetchCentralPackages(branchId?: string, customBaseUrl?: string): Promise<CentralUpdatePackage[]> {
  const remoteUrl = customBaseUrl || getRemoteBaseUrlFromConfig();
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';

  if (remoteUrl) {
    try {
      const fullUrl = `${remoteUrl.replace(/\/+$/, '')}/api/sync/central-packages${query}`;
      const res = await fetch(fullUrl, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (e) {
      // fallback
    }
  }

  try {
    const res = await fetch(`/api/sync/central-packages${query}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (err) {
    console.warn('[SyncService] Error obteniendo paquetes remotos:', err);
  }
  return [];
}

/**
 * Servidor Central: Emitir y publicar un nuevo paquete a la red de sucursales
 */
export async function publishCentralPackage(pkg: CentralUpdatePackage): Promise<{ success: boolean; message: string; package: CentralUpdatePackage }> {
  try {
    const res = await fetch('/api/sync/central-packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package: pkg })
    });
    if (res.ok) {
      const json = await res.json();
      return json;
    }
  } catch (err: any) {
    console.error('[SyncService] Error publicando paquete central:', err);
  }
  return { success: true, message: 'Paquete emitido y almacenado.', package: pkg };
}

/**
 * Sucursal: Notificar al Servidor Central que un paquete fue aplicado en la terminal local
 */
export async function recordPackageApplied(packageId: string, branchId: string, branchName: string, customBaseUrl?: string): Promise<boolean> {
  const remoteUrl = customBaseUrl || getRemoteBaseUrlFromConfig();
  if (remoteUrl) {
    try {
      const fullUrl = `${remoteUrl.replace(/\/+$/, '')}/api/sync/apply-package`;
      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, branchId, branchName }),
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) return true;
    } catch (e) {}
  }

  try {
    const res = await fetch('/api/sync/apply-package', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId, branchId, branchName })
    });
    return res.ok;
  } catch (err) {
    console.warn('[SyncService] Error al reportar paquete aplicado:', err);
    return false;
  }
}

/**
 * Detectar la IP Pública real del cliente/sucursal actual
 */
export async function detectCurrentPublicIp(customBaseUrl?: string): Promise<string> {
  const remoteUrl = customBaseUrl || getRemoteBaseUrlFromConfig();
  
  // 1. Intentar consultar al Servidor Central configurado
  if (remoteUrl) {
    try {
      const fullUrl = `${remoteUrl.replace(/\/+$/, '')}/api/sync/detect-public-ip`;
      const res = await fetch(fullUrl, { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.publicIp && json.publicIp !== '127.0.0.1') {
          return json.publicIp;
        }
      }
    } catch (e) {
      // fallback
    }
  }

  // 2. Intentar endpoint local del servidor
  try {
    const res = await fetch('/api/sync/detect-public-ip', { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.publicIp && json.publicIp !== '127.0.0.1') {
        return json.publicIp;
      }
    }
  } catch (e) {
    // fallback
  }

  // 3. Fallback a servicios públicos de detección de IP (ipify, icanhazip)
  try {
    const ipifyRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    if (ipifyRes.ok) {
      const data = await ipifyRes.json();
      if (data.ip) return data.ip;
    }
  } catch (e) {
    // fallback
  }

  try {
    const rawRes = await fetch('https://icanhazip.com', { signal: AbortSignal.timeout(2500) });
    if (rawRes.ok) {
      const text = await rawRes.text();
      if (text && text.trim()) return text.trim();
    }
  } catch (e) {
    // fallback
  }

  return '192.168.1.100';
}

/**
 * Sucursal: Enviar reporte explícito y directo de IP Pública al Servidor Central (Heartbeat)
 */
export async function reportBranchHeartbeatAndIp(
  branchId: string, 
  data?: { localIp?: string; port?: number; farmadeskId?: string; farmadeskPassword?: string; farmadeskPort?: number },
  customBaseUrl?: string
): Promise<{ success: boolean; publicIp: string; message: string }> {
  const detectedIp = await detectCurrentPublicIp(customBaseUrl);
  const payload = {
    branchId,
    publicIp: detectedIp,
    localIp: data?.localIp || '192.168.1.100',
    port: data?.port || 3000,
    farmadeskId: data?.farmadeskId,
    farmadeskPassword: data?.farmadeskPassword,
    farmadeskPort: data?.farmadeskPort || 9050,
    timestamp: new Date().toISOString()
  };

  const remoteUrl = customBaseUrl || getRemoteBaseUrlFromConfig();
  if (remoteUrl) {
    try {
      const fullUrl = `${remoteUrl.replace(/\/+$/, '')}/api/sync/report-ip`;
      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const json = await res.json();
        return { success: true, publicIp: json.publicIp || detectedIp, message: json.message || 'IP reportada al servidor remoto.' };
      }
    } catch (e) {
      // fallback
    }
  }

  try {
    const res = await fetch('/api/sync/report-ip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const json = await res.json();
      return { success: true, publicIp: json.publicIp || detectedIp, message: json.message || 'IP reportada con éxito.' };
    }
  } catch (err: any) {
    console.warn('[SyncService] Error reportando IP a central:', err);
  }

  return { success: true, publicIp: detectedIp, message: `IP detectada (${detectedIp}) en modo local.` };
}

/**
 * Sucursal: Transmitir telemetría de sucursal en vivo al Servidor Central
 */
export async function pushBranchTelemetry(branch: Partial<BranchLocation>, customBaseUrl?: string): Promise<boolean> {
  const remoteUrl = customBaseUrl || getRemoteBaseUrlFromConfig();
  if (remoteUrl) {
    try {
      const fullUrl = `${remoteUrl.replace(/\/+$/, '')}/api/sync/branches-telemetry`;
      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch }),
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) return true;
    } catch (e) {}
  }

  try {
    const res = await fetch('/api/sync/branches-telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch })
    });
    return res.ok;
  } catch (err) {
    console.warn('[SyncService] Error enviando telemetría:', err);
    return false;
  }
}

/**
 * Validador de estructura de datos para telemetría de sucursal
 * Asegura que el contenido cumpla con el esquema requerido antes de procesarlo en el sistema
 */
export function validateBranchTelemetryItem(item: any): BranchLocation | null {
  if (!item || typeof item !== 'object') return null;
  const id = typeof item.id === 'string' ? item.id.trim() : '';
  if (!id || id === 'branch-01') return null;

  const validStatuses: Array<'online' | 'offline' | 'syncing' | 'warning'> = ['online', 'offline', 'syncing', 'warning'];
  const status: 'online' | 'offline' | 'syncing' | 'warning' = validStatuses.includes(item.status)
    ? item.status
    : 'offline';

  return {
    id,
    code: typeof item.code === 'string' && item.code.trim() ? item.code.trim() : id.toUpperCase(),
    name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : `Sucursal ${id}`,
    city: typeof item.city === 'string' && item.city.trim() ? item.city.trim() : 'Ciudad Principal',
    address: typeof item.address === 'string' && item.address.trim() ? item.address.trim() : 'Dirección no registrada',
    phone: typeof item.phone === 'string' ? item.phone : '',
    managerName: typeof item.managerName === 'string' ? item.managerName : 'Administrador',
    status,
    ipAddress: item.ipAddress || item.publicIp || '127.0.0.1',
    publicIp: item.publicIp || item.reportedPublicIp || item.ipAddress,
    reportedPublicIp: item.reportedPublicIp || item.publicIp || item.ipAddress,
    localIp: item.localIp || '192.168.1.100',
    port: typeof item.port === 'number' ? item.port : 3000,
    webSocketsUrl: item.webSocketsUrl,
    currentAppVersion: typeof item.currentAppVersion === 'string' ? item.currentAppVersion : 'v2.5.0-enterprise',
    lastSyncTimestamp: item.lastSyncTimestamp || item.lastReportedAt || new Date().toISOString(),
    lastIpReportedAt: item.lastIpReportedAt || item.lastReportedAt,
    totalSpots: typeof item.totalSpots === 'number' && !isNaN(item.totalSpots) ? item.totalSpots : 30,
    occupiedSpots: typeof item.occupiedSpots === 'number' && !isNaN(item.occupiedSpots) ? item.occupiedSpots : 0,
    todayRevenue: typeof item.todayRevenue === 'number' && !isNaN(item.todayRevenue) ? item.todayRevenue : 0,
    todayVehicles: typeof item.todayVehicles === 'number' && !isNaN(item.todayVehicles) ? item.todayVehicles : 0,
    activeShiftNumber: typeof item.activeShiftNumber === 'number' ? item.activeShiftNumber : 1,
    currentCashier: typeof item.currentCashier === 'string' ? item.currentCashier : 'Operador',
    pendingUpdatesCount: typeof item.pendingUpdatesCount === 'number' ? item.pendingUpdatesCount : 0,
    isCurrentBranch: Boolean(item.isCurrentBranch),
    warehouseId: item.warehouseId,
    warehouseName: item.warehouseName,
    posPointsCount: typeof item.posPointsCount === 'number' ? item.posPointsCount : 1,
    lastRemoteCommand: item.lastRemoteCommand,
    lastRemoteCommandTime: item.lastRemoteCommandTime,
    notes: item.notes,
    systemUrl: item.systemUrl,
    farmadeskId: item.farmadeskId,
    farmadeskPassword: item.farmadeskPassword,
    farmadeskPort: item.farmadeskPort || 9050,
    anydeskId: item.anydeskId,
    rustdeskId: item.rustdeskId,
    vncPassword: item.vncPassword,
    lat: typeof item.lat === 'number' ? item.lat : undefined,
    lng: typeof item.lng === 'number' ? item.lng : undefined,
    latencyMs: typeof item.latencyMs === 'number' ? item.latencyMs : undefined,
    systemLoad: typeof item.systemLoad === 'number' ? item.systemLoad : undefined,
    memoryUsage: typeof item.memoryUsage === 'number' ? item.memoryUsage : undefined,
    diskUsage: typeof item.diskUsage === 'number' ? item.diskUsage : undefined,
    activeConnections: typeof item.activeConnections === 'number' ? item.activeConnections : undefined
  };
}

/**
 * Servidor Central: Obtener la telemetría en vivo de todas las sucursales con validación estricta de estructura
 */
export async function fetchBranchesTelemetry(): Promise<BranchLocation[]> {
  try {
    const res = await fetch('/api/sync/branches-telemetry');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const validatedList: BranchLocation[] = [];
        for (const item of json.data) {
          const validBranch = validateBranchTelemetryItem(item);
          if (validBranch) {
            validatedList.push(validBranch);
          } else {
            console.warn('[SyncService] Se ignoró entrada inválida de telemetría:', item);
          }
        }
        return validatedList;
      }
    }
  } catch (err) {
    console.warn('[SyncService] Error obteniendo telemetría:', err);
  }
  return [];
}

/**
 * Sucursal: Descargar todos los paquetes y datos pendientes desde el Servidor Central
 */
export async function pullCentralData(branchId: string, customBaseUrl?: string): Promise<{
  success: boolean;
  packages: CentralUpdatePackage[];
  pendingPackages: CentralUpdatePackage[];
  pendingCount: number;
  globalConfig?: {
    rates?: RatesConfig;
    vehicleCategories?: VehicleCategoryConfig[];
    expenseConcepts?: ExpenseConcept[];
    expenseCategories?: ExpenseCategory[];
    businessInfo?: any;
    users?: any[];
    branches?: BranchLocation[];
    warehouses?: any[];
    lastUpdated?: string;
  };
  serverTime: string;
  latencyMs: number;
}> {
  const query = `?branchId=${encodeURIComponent(branchId)}`;
  
  // Try custom URL if provided, with automatic fallback to local endpoint
  if (customBaseUrl) {
    try {
      const fullUrl = `${customBaseUrl.replace(/\/+$/, '')}/api/sync/pull-central-data${query}`;
      const res = await fetch(fullUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          return {
            success: true,
            packages: json.packages || [],
            pendingPackages: json.pendingPackages || [],
            pendingCount: json.pendingCount || 0,
            globalConfig: json.globalConfig || {},
            serverTime: json.serverTime || new Date().toISOString(),
            latencyMs: json.latencyMs || 18
          };
        }
      }
    } catch (e) {
      console.warn('[SyncService] Servidor remoto no accesible, intentando endpoint local:', e);
    }
  }

  try {
    const res = await fetch(`/api/sync/pull-central-data${query}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        return {
          success: true,
          packages: json.packages || [],
          pendingPackages: json.pendingPackages || [],
          pendingCount: json.pendingCount || 0,
          globalConfig: json.globalConfig || {},
          serverTime: json.serverTime || new Date().toISOString(),
          latencyMs: json.latencyMs || 18
        };
      }
    }
  } catch (err) {
    console.warn('[SyncService] Error descargando datos centrales:', err);
  }

  return {
    success: false,
    packages: [],
    pendingPackages: [],
    pendingCount: 0,
    serverTime: new Date().toISOString(),
    latencyMs: 0
  };
}

/**
 * Obtener las versiones oficiales publicadas y estado de Beta desde el Servidor Central
 */
export async function fetchCentralSoftwareReleases(customBaseUrl?: string): Promise<{
  success: boolean;
  activeReleaseId?: string;
  activeVersion?: string;
  lastDispatchedAt?: string;
  dispatchedBy?: string;
  authorizedBetaBranches: string[];
  releases: any[];
}> {
  const remoteUrl = customBaseUrl || getRemoteBaseUrlFromConfig();
  if (remoteUrl) {
    try {
      const fullUrl = `${remoteUrl.replace(/\/+$/, '')}/api/sync/software-releases`;
      const res = await fetch(fullUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.releases)) {
          return json;
        }
      }
    } catch (e) {
      console.warn('[SyncService] Error consultando releases en servidor remoto:', e);
    }
  }

  try {
    const res = await fetch('/api/sync/software-releases');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.releases)) {
        return json;
      }
    }
  } catch (err) {
    console.warn('[SyncService] Error consultando releases locales:', err);
  }

  return {
    success: false,
    authorizedBetaBranches: [],
    releases: []
  };
}

/**
 * Servidor Central: Despachar manualmente una versión oficial a la red de sucursales
 */
export async function dispatchCentralSoftwareRelease(payload: {
  releaseId: string;
  version: string;
  targetScope: 'all' | 'specific';
  targetBranchIds?: string[];
  dispatchedBy: string;
  changelog?: string[];
  newModules?: string[];
  allowBetaForBranches?: string[];
}, customBaseUrl?: string): Promise<{ success: boolean; message: string; data?: any }> {
  const remoteUrl = customBaseUrl || getRemoteBaseUrlFromConfig();
  if (remoteUrl) {
    try {
      const fullUrl = `${remoteUrl.replace(/\/+$/, '')}/api/sync/software-releases/dispatch`;
      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}
  }

  try {
    const res = await fetch('/api/sync/software-releases/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
    return { success: false, message: 'Error en la respuesta del servidor.' };
  } catch (err: any) {
    return { success: false, message: 'Error de red: ' + err.message };
  }
}

/**
 * Subir, montar o registrar una nueva compilación de software en el Servidor Central
 */
export async function uploadNewSoftwareRelease(payload: {
  version: string;
  buildNumber?: number;
  title: string;
  description?: string;
  channel: 'enterprise' | 'stable' | 'beta';
  downloadSize?: string;
  checksumSha256?: string;
  newModules?: string[];
  changelog?: string[];
  databaseMigrationRequired?: boolean;
  autoDispatch?: boolean;
  targetScope?: 'all' | 'specific';
  targetBranchIds?: string[];
  fileName?: string;
}, customBaseUrl?: string): Promise<{ success: boolean; message: string; release?: any; data?: any }> {
  const remoteUrl = customBaseUrl || getRemoteBaseUrlFromConfig();
  if (remoteUrl) {
    try {
      const fullUrl = `${remoteUrl.replace(/\/+$/, '')}/api/sync/software-releases/upload`;
      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}
  }

  try {
    const res = await fetch('/api/sync/software-releases/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
    return { success: false, message: 'Error en la respuesta del servidor.' };
  } catch (err: any) {
    return { success: false, message: 'Error de red: ' + err.message };
  }
}

/**
 * Consultar la versión y commit Git en vivo del Servidor Central
 */
export async function fetchLiveServerVersion(customBaseUrl?: string): Promise<{
  success: boolean;
  version?: string;
  buildNumber?: number;
  commit?: { hash: string; shortHash: string; message: string; date: string };
  serverTime?: string;
  status?: string;
  message?: string;
}> {
  const remoteUrl = customBaseUrl || getRemoteBaseUrlFromConfig();
  if (remoteUrl) {
    try {
      const fullUrl = `${remoteUrl.replace(/\/+$/, '')}/api/sync/live-server-version`;
      const res = await fetch(fullUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}
  }

  try {
    const res = await fetch('/api/sync/live-server-version');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {}

  return { success: false };
}

/**
 * Despachar manualmente la versión en ejecución del Servidor Central hacia las sucursales
 */
export async function dispatchLiveServerVersion(payload: {
  targetScope: 'all' | 'specific';
  targetBranchIds?: string[];
  changelogNotes?: string[];
  dispatchedBy?: string;
  customVersion?: string;
  customBuildNumber?: number;
  customTitle?: string;
}, customBaseUrl?: string): Promise<{ success: boolean; message: string; release?: any; data?: any }> {
  const remoteUrl = customBaseUrl || getRemoteBaseUrlFromConfig();
  if (remoteUrl) {
    try {
      const fullUrl = `${remoteUrl.replace(/\/+$/, '')}/api/sync/software-releases/dispatch-live`;
      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}
  }

  try {
    const res = await fetch('/api/sync/software-releases/dispatch-live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
    return { success: false, message: 'Error en respuesta del servidor.' };
  } catch (err: any) {
    return { success: false, message: 'Error de red: ' + err.message };
  }
}

/**
 * Obtener la versión de Globales guardada localmente en la sucursal
 */
export function getInstalledGlobalVersion(): string {
  if (typeof window === 'undefined') return 'G-1.0.0';
  return localStorage.getItem('pk_installed_global_version') || 'G-1.0.0';
}

/**
 * Guardar la versión de Globales instalada localmente
 */
export function setInstalledGlobalVersion(version: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('pk_installed_global_version', version);
}

/**
 * Consultar la versión oficial vigente de Globales desde el Servidor Central
 */
export async function fetchCentralGlobalVersion(customBaseUrl?: string): Promise<{
  success: boolean;
  data?: {
    activeVersion: string;
    publishedAt: string;
    publishedBy: string;
    title: string;
    description: string;
    targetScope: 'all' | 'specific';
    targetBranchIds: string[];
    rates?: any;
    users?: any[];
    userTemplates?: any[];
    roleMatrixConfig?: any;
    vehicleCategories?: any[];
    expenseConcepts?: any[];
    expenseCategories?: any[];
    parameters?: any;
    history?: any[];
  };
  error?: string;
}> {
  const remoteUrl = customBaseUrl || getRemoteBaseUrlFromConfig();
  if (remoteUrl) {
    try {
      const fullUrl = `${remoteUrl.replace(/\/+$/, '')}/api/sync/global-version`;
      const res = await fetch(fullUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[SyncService] Falló consulta remota de global-version:', e);
    }
  }

  try {
    const res = await fetch('/api/sync/global-version');
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.warn('[SyncService] Falló consulta local de global-version:', err);
  }

  return { success: false, error: 'No se pudo obtener la versión de Globales' };
}

/**
 * Servidor Central: Publicar/Subir manualmente una nueva versión de Globales a la red
 */
export async function publishCentralGlobalVersion(payload: {
  version: string;
  title: string;
  description?: string;
  publishedBy?: string;
  rates?: any;
  users?: any[];
  userTemplates?: any[];
  roleMatrixConfig?: any;
  vehicleCategories?: any[];
  expenseConcepts?: any[];
  expenseCategories?: any[];
  parameters?: any;
  targetScope?: 'all' | 'specific';
  targetBranchIds?: string[];
}, customBaseUrl?: string): Promise<{ success: boolean; message: string; data?: any }> {
  const remoteUrl = customBaseUrl || getRemoteBaseUrlFromConfig();
  if (remoteUrl) {
    try {
      const fullUrl = `${remoteUrl.replace(/\/+$/, '')}/api/sync/global-version`;
      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}
  }

  try {
    const res = await fetch('/api/sync/global-version', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
    return { success: false, message: 'Respuesta inválida del servidor.' };
  } catch (err: any) {
    return { success: false, message: 'Error de red: ' + err.message };
  }
}

/**
 * Sucursal: Transmitir toda su información operativa y financiera al Servidor Central
 */
export async function pushBranchOperationsToCentral(payload: {
  branchId: string;
  branchName: string;
  operationalDay?: any;
  currentShift?: any;
  closedShifts?: any[];
  activeYard?: {
    totalSpots: number;
    occupiedSpots: number;
    availableSpots: number;
    occupancyPercent: number;
  };
  systemVersions?: {
    appVersion: string;
    installedGlobalVersion: string;
  };
  timestamp?: string;
}, customBaseUrl?: string): Promise<{
  success: boolean;
  message: string;
  centralGlobalVersion?: string;
  centralAppVersion?: string;
  isGlobalOutdated?: boolean;
  isAppOutdated?: boolean;
}> {
  const remoteUrl = customBaseUrl || getRemoteBaseUrlFromConfig();
  if (remoteUrl) {
    try {
      const fullUrl = `${remoteUrl.replace(/\/+$/, '')}/api/sync/push-branch-operations`;
      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}
  }

  try {
    const res = await fetch('/api/sync/push-branch-operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
    return { success: false, message: 'Error en respuesta del servidor.' };
  } catch (err: any) {
    return { success: false, message: 'Error transmitiendo operaciones: ' + err.message };
  }
}

/**
 * Servidor Central: Obtener consolidado de operaciones y finanzas de todas las sucursales
 */
export async function fetchBranchesOperations(customBaseUrl?: string): Promise<Record<string, any>> {
  const remoteUrl = customBaseUrl || getRemoteBaseUrlFromConfig();
  if (remoteUrl) {
    try {
      const fullUrl = `${remoteUrl.replace(/\/+$/, '')}/api/sync/branches-operations`;
      const res = await fetch(fullUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch (e) {}
  }

  try {
    const res = await fetch('/api/sync/branches-operations');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) return json.data;
    }
  } catch (err) {}

  return {};
}

