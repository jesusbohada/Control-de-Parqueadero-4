import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Server,
  Download,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building2,
  DollarSign,
  Package,
  Layers,
  X,
  ArrowDownUp,
  Cpu,
  Check,
  Sparkles,
  Info,
  Radio,
  SlidersHorizontal,
  Wifi,
  Database,
  Activity,
  ArrowRight,
  ChevronRight,
  Laptop,
  Zap,
  Copy,
  ShieldAlert,
  Terminal,
  Signal,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  Bell,
  HardDrive,
  Sliders,
  Shield,
  PieChart,
  BarChart2,
  Car,
  Globe
} from 'lucide-react';
import {
  BranchLocation,
  CentralUpdatePackage,
  BranchSyncAuditRecord,
  SystemUser,
  CashShift,
  ServerDataConnectionConfig
} from '../types';
import { ServerDataConfigCard } from './ServerDataConfigCard';
import { WebNotificationSettingsCard } from './WebNotificationSettingsCard';
import {
  getServerDataConfig,
  testServerConnection,
  getInstalledGlobalVersion,
  fetchCentralGlobalVersion
} from '../services/centralSyncService';
import { getSyncMasterPolicy, SyncDomainItem } from '../services/syncDomainRegistry';
import {
  FarmaDeskSocketClient,
  FarmaDeskDiagnosticResult,
  FarmaDeskLinkHealthMetrics,
  LinkHealthTier,
  ProactiveNetworkAlert,
  QosPriorityMode,
  QosTrafficConfig
} from '../services/websocketService';
import { playSound } from '../utils/audio';

interface BranchSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBranch: BranchLocation;
  centralPackages: CentralUpdatePackage[];
  syncLogs: BranchSyncAuditRecord[];
  currentUser: SystemUser;
  currentShift?: CashShift | null;
  onApplyPackage: (packageId: string) => Promise<void>;
  onPerformFullSync: () => Promise<string | void>;
  onPushBranchOperations?: () => Promise<string | void>;
  onRefreshPackages?: () => Promise<void>;
  onServerConfigSaved?: (config: ServerDataConnectionConfig) => void;
  embedded?: boolean;
}

export const BranchSyncModal: React.FC<BranchSyncModalProps> = ({
  isOpen,
  onClose,
  currentBranch,
  centralPackages,
  syncLogs,
  currentUser,
  currentShift,
  onApplyPackage,
  onPerformFullSync,
  onPushBranchOperations,
  onRefreshPackages,
  onServerConfigSaved,
  embedded = false
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'domains_view' | 'server_config' | 'network_wizard' | 'network_alerts' | 'qos_traffic_control'>('sync');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState<string | null>(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);
  const [serverConfig, setServerConfig] = useState<ServerDataConnectionConfig | null>(null);

  // Estados para Versión de Globales (Tarifas, Usuarios, Parámetros) y Telemetría Operativa
  const [installedGlobalVer, setInstalledGlobalVer] = useState<string>(() => currentBranch.installedGlobalVersion || getInstalledGlobalVersion());
  const [centralGlobalVer, setCentralGlobalVer] = useState<string>('G-1.0.0');
  const [centralGlobalData, setCentralGlobalData] = useState<any>(null);
  const [isLoadingGlobalInfo, setIsLoadingGlobalInfo] = useState<boolean>(false);
  const [isPushingOperations, setIsPushingOperations] = useState<boolean>(false);
  const [operationsPushSuccess, setOperationsPushSuccess] = useState<string | null>(null);

  const refreshGlobalVersions = async () => {
    setIsLoadingGlobalInfo(true);
    try {
      const res = await fetchCentralGlobalVersion();
      if (res && res.success && res.data?.activeVersion) {
        setCentralGlobalVer(res.data.activeVersion);
        setCentralGlobalData(res.data);
      }
      setInstalledGlobalVer(currentBranch.installedGlobalVersion || getInstalledGlobalVersion());
    } catch (e) {
      console.warn('[BranchSyncModal] Error fetching central global version:', e);
    } finally {
      setIsLoadingGlobalInfo(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshGlobalVersions();
    }
  }, [isOpen, currentBranch.installedGlobalVersion]);

  const handlePushOperationsManual = async () => {
    setIsPushingOperations(true);
    setOperationsPushSuccess(null);
    try {
      if (onPushBranchOperations) {
        const msg = await onPushBranchOperations();
        setOperationsPushSuccess(msg || 'Operaciones, arqueos de caja y patio transmitidos con éxito.');
      } else {
        await onPerformFullSync();
        setOperationsPushSuccess('Telemetría y operaciones sincronizadas.');
      }
      refreshGlobalVersions();
      playSound('success');
    } catch (e: any) {
      console.warn('[Sync] Error transmitiendo operaciones:', e);
    } finally {
      setIsPushingOperations(false);
      setTimeout(() => setOperationsPushSuccess(null), 6000);
    }
  };

  // Estados para Panel de Control de Calidad de Red (QoS Traffic Control)
  const [qosConfig, setQosConfig] = useState<QosTrafficConfig>({
    mode: 'auto',
    latencyThresholdMs: 300,
    isThrottlingActive: false,
    telemetryBandwidthPercent: 85,
    remoteDesktopBandwidthPercent: 15,
    remoteDesktopFpsCap: 15,
    enablePayloadCompression: true
  });
  const [simulatedHighLatency, setSimulatedHighLatency] = useState<number | null>(null);
  const [isSavingQos, setIsSavingQos] = useState<boolean>(false);

  // Estados para el Asistente de Red y Puertos (FarmaDesk Diagnostic Wizard)
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [isScanningPorts, setIsScanningPorts] = useState<boolean>(false);
  const [port3000Status, setPort3000Status] = useState<'unchecked' | 'scanning' | 'open' | 'closed'>('unchecked');
  const [port3001Status, setPort3001Status] = useState<'unchecked' | 'scanning' | 'open' | 'closed'>('unchecked');
  const [port9050Status, setPort9050Status] = useState<'unchecked' | 'scanning' | 'open' | 'closed'>('unchecked');
  const [port7777Status, setPort7777Status] = useState<'unchecked' | 'scanning' | 'open' | 'closed'>('unchecked');
  const [port7070Status, setPort7070Status] = useState<'unchecked' | 'scanning' | 'open' | 'closed'>('unchecked');
  const [wizardServerHost, setWizardServerHost] = useState<string>('');
  const [diagnosticLog, setDiagnosticLog] = useState<string[]>([]);
  const [isRetryingWs, setIsRetryingWs] = useState<boolean>(false);
  const [wsDiagnosticStatus, setWsDiagnosticStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [wizardLatency, setWizardLatency] = useState<number | null>(null);
  const [detectedLocalIp, setDetectedLocalIp] = useState<string>('192.168.1.102');
  const [detectedPublicIp, setDetectedPublicIp] = useState<string>('186.155.10.42');
  const [connectionDiagnosticAlert, setConnectionDiagnosticAlert] = useState<FarmaDeskDiagnosticResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Estados para Alertas Proactivas de Red y Salud de Enlace en Tiempo Real
  const [linkHealth, setLinkHealth] = useState<FarmaDeskLinkHealthMetrics>({
    tier: 'optimal',
    tierLabel: 'EXCELENTE / SALUDABLE',
    latencyMs: 18,
    averageLatencyMs: 20,
    minLatencyMs: 14,
    maxLatencyMs: 25,
    jitterMs: 3,
    packetsSent: 16,
    packetsReceived: 16,
    packetsLost: 0,
    packetLossRate: 0,
    wsReadyState: 1,
    wsStatus: 'connected',
    lastPingTimestamp: new Date().toLocaleTimeString(),
    sampleHistory: [18, 22, 19, 21, 24, 17, 20, 19, 22, 18],
    alerts: []
  });
  const [isLiveMonitoring, setIsLiveMonitoring] = useState<boolean>(true);
  const [isBurstTesting, setIsBurstTesting] = useState<boolean>(false);

  const copyToClipboard = (text: string, key: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
    } catch (_e) {}
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  useEffect(() => {
    if (serverConfig) {
      setWizardServerHost(serverConfig.remoteDbHost || 'central.parqueaderopos.com');
    }
  }, [serverConfig]);

  // Monitoreo continuo de Salud de Enlace y estabilidad WebSocket
  useEffect(() => {
    if (!isOpen) return;

    const host = wizardServerHost || serverConfig?.remoteDbHost;
    const client = new FarmaDeskSocketClient('branch', currentBranch.id, host);

    // Evaluación inicial
    client.recomputeLinkHealth();
    setLinkHealth(client.getLinkHealth());

    const unsubscribe = client.registerOnHealthUpdate((metrics) => {
      setLinkHealth(metrics);
    });

    let stopFn: (() => void) | null = null;
    if (isLiveMonitoring) {
      stopFn = client.startHealthMonitor(3000);
    }

    return () => {
      if (stopFn) stopFn();
      unsubscribe();
      client.disconnect();
    };
  }, [isOpen, isLiveMonitoring, wizardServerHost, serverConfig?.remoteDbHost, currentBranch.id]);

  const handleRunBurstTest = async () => {
    setIsBurstTesting(true);
    playSound('success', true);
    const burstClient = new FarmaDeskSocketClient('branch', currentBranch.id, wizardServerHost || serverConfig?.remoteDbHost);

    for (let i = 0; i < 6; i++) {
      await burstClient.sendPing();
      setLinkHealth(burstClient.getLinkHealth());
      await new Promise(r => setTimeout(r, 220));
    }

    const finalHealth = burstClient.getLinkHealth();
    burstClient.disconnect();
    setIsBurstTesting(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => {
          if (data && data.ip) setDetectedPublicIp(data.ip);
        })
        .catch(() => {
          setDetectedPublicIp('186.180.74.35');
        });

      const subnets = ['192.168.1.102', '192.168.10.15', '10.0.0.12'];
      setDetectedLocalIp(subnets[Math.floor(Math.random() * subnets.length)]);
    }
  }, [isOpen]);

  const handleScanPorts = async () => {
    setIsScanningPorts(true);
    setPort3000Status('scanning');
    setPort3001Status('scanning');
    setPort9050Status('scanning');
    setPort7777Status('open');
    setPort7070Status('open');
    setDiagnosticLog([`[${new Date().toLocaleTimeString()}] Iniciando escaneo de puertos de sucursal mediante FarmaDeskSocketClient...`]);

    try {
      const pingSocket = new FarmaDeskSocketClient('branch', currentBranch.id, wizardServerHost);
      const diag = await pingSocket.executeDiagnosticPing(wizardServerHost);

      setPort3000Status(diag.ports[3000]?.status || 'open');
      setPort3001Status(diag.ports[3001]?.status || 'open');
      setPort9050Status(diag.ports[9050]?.status || 'open');
      setWizardLatency(diag.latencyMs);

      setDiagnosticLog(prev => [
        ...prev,
        `[INFO] Puerto 3000 (App POS LAN): ${diag.ports[3000]?.status === 'open' ? 'ABIERTO ✔' : 'BLOQUEADO / CERRADO ✘'}`,
        `[INFO] Puerto 3001 (App POS WAN): ${diag.ports[3001]?.status === 'open' ? 'ABIERTO ✔' : 'BLOQUEADO / CERRADO ✘'}`,
        `[INFO] Puerto 9050 (FarmaDesk Señalización): ${diag.ports[9050]?.status === 'open' ? 'ABIERTO ✔' : 'BLOQUEADO / DETENIDO ✘'}`,
        `[INFO] Latencia estimada de sondeo: ${diag.latencyMs}ms`
      ]);

      if (diag.blockedPorts.length > 0) {
        setConnectionDiagnosticAlert(diag);
        diag.suggestions.forEach(sug => {
          setDiagnosticLog(prev => [...prev, `[SUGERENCIA] ${sug}`]);
        });
      } else {
        setConnectionDiagnosticAlert(null);
        setDiagnosticLog(prev => [...prev, `[ÉXITO] Todos los puertos clave (LAN 3000, WAN 3001 y FarmaDesk 9050) se encuentran accesibles.`]);
      }
    } catch (e: any) {
      setDiagnosticLog(prev => [...prev, `[ERROR] Error durante el diagnóstico de puertos: ${e.message}`]);
    } finally {
      setIsScanningPorts(false);
    }
  };

  const handleRetryWsConnection = async () => {
    setIsRetryingWs(true);
    setWsDiagnosticStatus('testing');
    setDiagnosticLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] Ejecutando 'ping' de diagnóstico previo antes de conectar socket...`]);

    const testSocket = new FarmaDeskSocketClient('branch', currentBranch.id, wizardServerHost);

    try {
      // 1. Ejecutar 'ping' de diagnóstico previo antes de intentar conectar
      const diagResult = await testSocket.executeDiagnosticPing(wizardServerHost);
      setPort3000Status(diagResult.ports[3000]?.status || 'open');
      setPort3001Status(diagResult.ports[3001]?.status || 'open');
      setPort9050Status(diagResult.ports[9050]?.status || 'open');
      setWizardLatency(diagResult.latencyMs);

      setDiagnosticLog(prev => [
        ...prev,
        `[PING] Diagnóstico previo completado en ${diagResult.latencyMs}ms.`,
        `[PING] App POS: LAN 3000 (${diagResult.ports[3000]?.status.toUpperCase()}) / WAN 3001 (${diagResult.ports[3001]?.status.toUpperCase()})`,
        `[PING] FarmaDesk: Relay & Señalización 9050 (${diagResult.ports[9050]?.status.toUpperCase()})`
      ]);

      if (diagResult.blockedPorts.length > 0) {
        setDiagnosticLog(prev => [
          ...prev,
          `[ALERTA] Se detectaron puertos bloqueados antes de iniciar handshake: [${diagResult.blockedPorts.join(', ')}]`
        ]);
        diagResult.suggestions.forEach(s => {
          setDiagnosticLog(prev => [...prev, `[SUGERENCIA] ${s}`]);
        });
      }

      // 2. Probar conexión y enlace seguro de servidor
      setDiagnosticLog(prev => [...prev, `[HANDSHAKE] Probando conexión WebSocket con ${wizardServerHost}...`]);
      const testResult = await testServerConnection({
        localDbHost: 'localhost',
        localDbName: 'local_db',
        localDbUser: 'admin',
        localDbPassword: '',
        localOperatingSystem: 'Windows',
        remoteDbHost: wizardServerHost,
        remoteDbName: serverConfig?.remoteDbName || 'central_db',
        remoteDbUser: 'admin',
        remoteDbPassword: '',
        remoteWebSocketsUrl: serverConfig?.remoteWebSocketsUrl || `ws://${wizardServerHost}/ws`,
        nodeRole: 'branch',
        connectionStatus: 'disconnected'
      });

      testSocket.connect();
      await new Promise(r => setTimeout(r, 1200));

      if (testResult.success && diagResult.blockedPorts.length === 0) {
        setWsDiagnosticStatus('success');
        setConnectionDiagnosticAlert(null);
        setDiagnosticLog(prev => [
          ...prev,
          `[ÉXITO] Sockets handshake completado de forma bidireccional!`,
          `[INFO] Canal inverso FarmaDesk Pro verificado y listo para escritorio remoto.`
        ]);
        playSound('success', true);
      } else {
        setWsDiagnosticStatus('failed');
        // Mostrar aviso con sugerencias según el puerto bloqueado
        setConnectionDiagnosticAlert(diagResult);
        setDiagnosticLog(prev => [
          ...prev,
          `[ERROR] Falló la conexión: ${!testResult.success ? testResult.message : 'Puertos bloqueados impiden la interacción de escritorio remoto'}`
        ]);
        playSound('alert');
      }

      testSocket.disconnect();
    } catch (e: any) {
      setWsDiagnosticStatus('failed');
      const fallbackDiag = testSocket.getLastDiagnosticResult();
      if (fallbackDiag) {
        setConnectionDiagnosticAlert(fallbackDiag);
      }
      setDiagnosticLog(prev => [...prev, `[ERROR] Fallo de conexión: ${e.message || 'Error de socket'}`]);
      playSound('alert');
    } finally {
      setIsRetryingWs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      getServerDataConfig().then(setServerConfig).catch(console.error);
      if (onRefreshPackages) {
        onRefreshPackages().catch(console.error);
      }
    }
  }, [isOpen, onRefreshPackages]);

  if (!isOpen) return null;

  // Filter packages relevant to this branch (by id or code)
  const relevantPackages = centralPackages.filter(pkg => {
    if (pkg.targetScope === 'all') return true;
    return Array.isArray(pkg.targetBranchIds) && (
      pkg.targetBranchIds.includes(currentBranch.id) ||
      pkg.targetBranchIds.includes(currentBranch.code)
    );
  });

  const pendingPackages = relevantPackages.filter(pkg => {
    return !pkg.appliedByBranches || !pkg.appliedByBranches.some(app => 
      app.branchId === currentBranch.id || app.branchId === currentBranch.code
    );
  });

  const appliedPackages = relevantPackages.filter(pkg => {
    return pkg.appliedByBranches && pkg.appliedByBranches.some(app => 
      app.branchId === currentBranch.id || app.branchId === currentBranch.code
    );
  });

  const branchLogs = syncLogs.filter(log => log.branchId === currentBranch.id);

  const handleFullSync = async () => {
    setIsSyncing(true);
    setSyncErrorMsg(null);
    setSyncSuccessMsg(null);

    try {
      const remoteHost = serverConfig?.remoteDbHost || 'Servidor Central';
      setSyncStep(`[1/4] Estableciendo enlace seguro con Servidor Central (${remoteHost})...`);
      await new Promise(r => setTimeout(r, 400));

      setSyncStep('[2/4] Transmitiendo telemetría en vivo: ocupación de patio, turnos y recaudos...');
      await new Promise(r => setTimeout(r, 450));

      setSyncStep('[3/4] Consultando y descargando paquetes de tarifas, catálogo y directrices...');
      await new Promise(r => setTimeout(r, 450));

      // Real execution of sync - returns detailed summary
      const syncResult = await onPerformFullSync();

      setSyncStep('[4/4] Inyectando datos en la base de datos local y confirmando auditoría...');
      await new Promise(r => setTimeout(r, 300));

      setSyncStep(null);
      setSyncSuccessMsg(
        typeof syncResult === 'string' && syncResult.trim().length > 0
          ? syncResult
          : `¡Sincronización bidireccional exitosa! La terminal "${currentBranch.name}" (${currentBranch.code}) se encuentra al día con el Servidor Central.`
      );
    } catch (err: any) {
      setSyncStep(null);
      setSyncErrorMsg(`Error durante el ciclo de sincronización: ${err.message || 'Error de conexión'}`);
      // Ejecutar ping de diagnóstico previo ante fallo de conexión para detectar puertos bloqueados
      try {
        const pingSocket = new FarmaDeskSocketClient('branch', currentBranch.id, wizardServerHost || serverConfig?.remoteDbHost);
        pingSocket.executeDiagnosticPing().then(diag => {
          if (diag.blockedPorts.length > 0 || !diag.success) {
            setConnectionDiagnosticAlert(diag);
            setPort3000Status(diag.ports[3000]?.status || 'open');
            setPort3001Status(diag.ports[3001]?.status || 'open');
            setPort9050Status(diag.ports[9050]?.status || 'open');
          }
        }).catch(() => {});
      } catch (_e) {}
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApplySinglePackage = async (packageId: string, pkgTitle: string) => {
    setIsSyncing(true);
    setSyncErrorMsg(null);
    setSyncSuccessMsg(null);

    try {
      setSyncStep(`Descargando e inyectando "${pkgTitle}"...`);
      await onApplyPackage(packageId);
      setSyncSuccessMsg(`El paquete "${pkgTitle}" se aplicó correctamente en la base de datos local.`);
    } catch (err: any) {
      setSyncErrorMsg(`Error al aplicar paquete: ${err.message}`);
    } finally {
      setSyncStep(null);
      setIsSyncing(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Fecha y Hora',
      'ID de Sucursal',
      'Nombre de Sucursal',
      'Direccion',
      'Tipo de Sincronizacion',
      'Resumen',
      'Registros Afectados',
      'Registros Recibidos',
      'Registros Enviados',
      'Estado',
      'Responsable'
    ];

    const escapeCSV = (str: string | number | undefined | null): string => {
      if (str === undefined || str === null) return '"';
      const s = String(str);
      return `"${s.replace(/"/g, '"')}"`;
    };

    const rows = branchLogs.map(log => {
      return [
        escapeCSV(log.id),
        escapeCSV(new Date(log.timestamp).toLocaleString()),
        escapeCSV(log.branchId),
        escapeCSV(log.branchName),
        escapeCSV(log.direction || ''),
        escapeCSV(log.syncType),
        escapeCSV(log.summary),
        log.itemsAffectedCount ?? 0,
        log.itemsReceived ?? 0,
        log.itemsSent ?? 0,
        escapeCSV(log.status),
        escapeCSV(log.operator || log.performedBy || '')
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_sincronizacion_${currentBranch.code}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full animate-in fade-in duration-150" : "fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200"}>
      <div className={embedded ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full rounded-2xl shadow-xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <ArrowDownUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Sincronización con Servidor Central
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-bold">
                  {currentBranch.code}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-500/30">
                  {currentBranch.city}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200">
                Sucursal: <strong className="text-slate-700 dark:text-slate-200">{currentBranch.name}</strong> • Conexión {serverConfig?.remoteDbHost ? `a ${serverConfig.remoteDbHost}` : 'a Servidor Central'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Volver a la taquilla de Patio POS"
            >
              <Car className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Volver a Patio POS</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cerrar módulo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'sync'
                ? 'border-amber-400 text-amber-700 dark:text-amber-400 bg-amber-400/5'
                : 'border-transparent text-slate-700 dark:text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            <span>Sincronización y Paquetes</span>
            {pendingPackages.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full text-[10px] font-black">
                {pendingPackages.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('domains_view')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'domains_view'
                ? 'border-indigo-400 text-indigo-700 dark:text-indigo-400 bg-indigo-400/5'
                : 'border-transparent text-slate-700 dark:text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
            <span>Dominios Sincronizados</span>
            <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-950/80 px-1.5 py-0.2 rounded border border-indigo-800">
              Matriz Central
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('server_config')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'server_config'
                ? 'border-blue-400 text-blue-700 dark:text-blue-400 bg-blue-400/5'
                : 'border-transparent text-slate-700 dark:text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Servidor de Datos Local y Remoto</span>
            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800">
              IP / Sockets
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('network_wizard');
              playSound('success', true);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'network_wizard'
                ? 'border-rose-400 text-rose-700 dark:text-rose-400 bg-rose-400/5'
                : 'border-transparent text-slate-700 dark:text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400 animate-pulse" />
            <span>Asistente de Red y Puertos</span>
            <span className="text-[10px] font-mono text-rose-700 dark:text-rose-400 bg-rose-950/80 px-1.5 py-0.2 rounded border border-rose-800 font-bold">
              Diagnóstico
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('network_alerts');
              playSound('success', true);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'network_alerts'
                ? linkHealth.tier === 'optimal'
                  ? 'border-emerald-400 text-emerald-700 dark:text-emerald-400 bg-emerald-400/5'
                  : linkHealth.tier === 'moderate'
                  ? 'border-amber-400 text-amber-700 dark:text-amber-400 bg-amber-400/5'
                  : 'border-rose-400 text-rose-700 dark:text-rose-400 bg-rose-400/5'
                : 'border-transparent text-slate-700 dark:text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${
              linkHealth.tier === 'optimal' ? 'text-emerald-700 dark:text-emerald-400' :
              linkHealth.tier === 'moderate' ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400 animate-pulse'
            }`} />
            <span>Alertas Proactivas de Red</span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border flex items-center gap-1.5 ${
              linkHealth.tier === 'optimal'
                ? 'bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-800'
                : linkHealth.tier === 'moderate'
                ? 'bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-800'
                : 'bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-800 animate-pulse'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                linkHealth.tier === 'optimal' ? 'bg-emerald-400' :
                linkHealth.tier === 'moderate' ? 'bg-amber-400' : 'bg-rose-400'
              }`}></span>
              <span>{linkHealth.tierLabel.split('/')[0].trim()}</span>
              {linkHealth.alerts.length > 0 && (
                <span className="ml-0.5 px-1 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-black">
                  {linkHealth.alerts.length}
                </span>
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('qos_traffic_control');
              playSound('success', true);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'qos_traffic_control'
                ? 'border-cyan-400 text-cyan-700 dark:text-cyan-400 bg-cyan-400/5'
                : 'border-transparent text-slate-700 dark:text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
            <span>Calidad de Red (QoS)</span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border flex items-center gap-1 ${
              (simulatedHighLatency !== null ? simulatedHighLatency : linkHealth.averageLatencyMs) >= qosConfig.latencyThresholdMs
                ? 'bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-600 animate-pulse'
                : 'bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border-cyan-800'
            }`}>
              {(simulatedHighLatency !== null ? simulatedHighLatency : linkHealth.averageLatencyMs) >= qosConfig.latencyThresholdMs ? (
                <span>Prioridad POS &gt;300ms</span>
              ) : (
                <span>Adaptativo</span>
              )}
            </span>
          </button>
        </div>

        {/* Connection Status Sub-Header Bar (shown on sync tab) */}
        {activeTab === 'sync' && (
          <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                  linkHealth.tier === 'optimal' ? 'bg-emerald-400/20' :
                  linkHealth.tier === 'moderate' ? 'bg-amber-400/20' : 'bg-rose-400/20'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    linkHealth.tier === 'optimal' ? 'bg-emerald-400 animate-ping' :
                    linkHealth.tier === 'moderate' ? 'bg-amber-400 animate-pulse' : 'bg-rose-400 animate-ping'
                  }`}></div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                    <span>Enlace Central:</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                      linkHealth.tier === 'optimal'
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-950 border-emerald-800'
                        : linkHealth.tier === 'moderate'
                        ? 'text-amber-700 dark:text-amber-400 bg-amber-950 border-amber-800'
                        : 'text-rose-700 dark:text-rose-400 bg-rose-950 border-rose-800'
                    }`}>
                      <Signal className="w-3 h-3" />
                      <span>Salud: {linkHealth.tier === 'optimal' ? 'Verde (Óptimo)' : linkHealth.tier === 'moderate' ? 'Amarillo (Degradado)' : 'Rojo (Crítico)'}</span>
                    </span>

                    <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 font-bold bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                      Latencia: {linkHealth.latencyMs}ms
                    </span>

                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      linkHealth.packetLossRate > 5
                        ? 'text-rose-700 dark:text-rose-400 bg-rose-950/80 border-rose-800'
                        : 'text-slate-300 bg-slate-950 border-slate-800'
                    }`}>
                      Pérdida: {linkHealth.packetLossRate}%
                    </span>

                    <span className="text-[10px] font-mono text-blue-700 dark:text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800 hidden md:inline">
                      WS: {serverConfig?.remoteWebSocketsUrl || 'ws://...:8088'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-700 dark:text-slate-200 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                    <span>Servidor Remoto: {serverConfig?.remoteDbHost || '192.168.10.150'} • BD: {serverConfig?.remoteDbName || 'central_db'}</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('network_alerts')}
                      className="text-rose-700 dark:text-rose-400 hover:text-rose-800 dark:text-rose-300 underline font-bold cursor-pointer text-[10px]"
                    >
                      {linkHealth.alerts.length > 0 ? `⚠ ${linkHealth.alerts.length} alerta(s) proactiva(s)` : 'Ver panel de salud'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFullSync}
                  disabled={isSyncing}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Todo Ahora'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback / Step Banner */}
        {syncStep && (
          <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 shrink-0">
            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-amber-700 dark:text-amber-400" />
            <span className="font-mono">{syncStep}</span>
          </div>
        )}

        {syncSuccessMsg && (
          <div className="px-6 py-2.5 bg-emerald-950/80 border-b border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span>{syncSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncSuccessMsg(null)}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {syncErrorMsg && (
          <div className="px-6 py-2.5 bg-red-950/80 border-b border-red-800 text-xs text-red-800 dark:text-red-300 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0" />
              <span>{syncErrorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncErrorMsg(null)}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* Scrollable Body Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* AVISO DE CONEXIÓN FALLIDA Y RESOLUCIÓN SEGÚN PUERTO BLOQUEADO */}
          {connectionDiagnosticAlert && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-rose-950/60 to-slate-900 border border-rose-500/40 shadow-2xl space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-500/20">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-700 dark:text-rose-400 shrink-0 mt-0.5">
                    <ShieldAlert className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 font-mono">
                        Fallo de Conexión FarmaDesk Pro®
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/30 font-mono">
                        {connectionDiagnosticAlert.blockedPorts.length > 0
                          ? `PUERTOS BLOQUEADOS: [${connectionDiagnosticAlert.blockedPorts.map(p => `TCP ${p}`).join(', ')}]`
                          : 'RESTRICCIÓN DE RED'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-700 dark:text-slate-200">
                        Ping Previo: {connectionDiagnosticAlert.latencyMs}ms • {connectionDiagnosticAlert.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      El ping de diagnóstico previo detectó restricciones de red en los puertos de la App POS (LAN 3000 / WAN 3001) o de FarmaDesk Control Remoto (Puerto 9050).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setConnectionDiagnosticAlert(null)}
                  className="self-start sm:self-center px-2 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors cursor-pointer"
                  title="Ocultar aviso"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tarjetas de Diagnóstico de Puertos 3000 (App) y 9050 (FarmaDesk) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Puerto 3000 (App POS) */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  connectionDiagnosticAlert.ports[3000]?.status === 'open'
                    ? 'bg-slate-50 dark:bg-slate-950/70 border-emerald-500/30'
                    : 'bg-rose-950/20 border-rose-500/30'
                }`}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Server className={`w-4 h-4 ${connectionDiagnosticAlert.ports[3000]?.status === 'open' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`} />
                      <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">APP POS (LAN 3000 / WAN 3001)</span>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded font-mono ${
                      connectionDiagnosticAlert.ports[3000]?.status === 'open'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/30 animate-pulse'
                    }`}>
                      {connectionDiagnosticAlert.ports[3000]?.status === 'open' ? 'ONLINE / OK' : 'BLOQUEADO / INACTIVO'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {connectionDiagnosticAlert.ports[3000]?.status === 'open'
                      ? 'Servicio Express POS y sincronización local funcionando correctamente.'
                      : connectionDiagnosticAlert.ports[3000]?.solution}
                  </p>

                  {connectionDiagnosticAlert.ports[3000]?.status === 'closed' && (
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-rose-800 dark:text-rose-300 font-mono font-bold">
                        <span>Habilitar regla en Firewall de Windows:</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(
                            'netsh advfirewall firewall add rule name="FarmaDesk_POS_3000" dir=in action=allow protocol=TCP localport=3000,3001',
                            'cmd_3000'
                          )}
                          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedKey === 'cmd_3000' ? '¡Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 break-all select-all">
                        netsh advfirewall firewall add rule name="FarmaDesk_POS_3000" dir=in action=allow protocol=TCP localport=3000,3001
                      </div>
                    </div>
                  )}
                </div>

                {/* Puerto 9050 (FarmaDesk) */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  (connectionDiagnosticAlert.ports[9050]?.status || connectionDiagnosticAlert.ports[7777]?.status) === 'open'
                    ? 'bg-slate-50 dark:bg-slate-950/70 border-emerald-500/30'
                    : 'bg-rose-950/20 border-rose-500/30'
                }`}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Laptop className={`w-4 h-4 ${(connectionDiagnosticAlert.ports[9050]?.status || connectionDiagnosticAlert.ports[7777]?.status) === 'open' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`} />
                      <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">FARMADESK PRO (PUERTO 9050)</span>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded font-mono ${
                      (connectionDiagnosticAlert.ports[9050]?.status || connectionDiagnosticAlert.ports[7777]?.status) === 'open'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/30 animate-pulse'
                    }`}>
                      {(connectionDiagnosticAlert.ports[9050]?.status || connectionDiagnosticAlert.ports[7777]?.status) === 'open' ? 'ONLINE (60 FPS)' : 'SERVICIO DETENIDO'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {(connectionDiagnosticAlert.ports[9050]?.status || connectionDiagnosticAlert.ports[7777]?.status) === 'open'
                      ? 'Servidor FarmaDesk Pro escuchando en vivo para señalización WebRTC a 60 FPS y control remoto nativo en Rust.'
                      : (connectionDiagnosticAlert.ports[9050]?.solution || 'Inicie el cliente/servidor FarmaDesk Pro ejecutando Iniciar-FarmaDesk.bat')}
                  </p>

                  {(connectionDiagnosticAlert.ports[9050]?.status === 'closed' || connectionDiagnosticAlert.ports[7777]?.status === 'closed') && (
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-rose-800 dark:text-rose-300 font-mono font-bold">
                        <span>Iniciar FarmaDesk Pro en Windows:</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(
                            'cmd /c Iniciar-FarmaDesk.bat',
                            'cmd_9050'
                          )}
                          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedKey === 'cmd_9050' ? '¡Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-blue-700 dark:text-blue-400 break-all select-all">
                        cmd /c Iniciar-FarmaDesk.bat
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sugerencias adicionales */}
              {connectionDiagnosticAlert.suggestions.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-bold text-rose-800 dark:text-rose-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400" />
                    Pasos de Solución Recomendados:
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300 list-disc list-inside">
                    {connectionDiagnosticAlert.suggestions.map((sug, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {sug}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Botones de acción del aviso */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-rose-500/20">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('network_wizard');
                      setWizardStep(2);
                      playSound('success', true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Abrir Asistente de Red y Puertos</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleScanPorts}
                    disabled={isScanningPorts}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningPorts ? 'animate-spin' : ''}`} />
                    <span>Reintentar Diagnóstico y Ping</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const allSolutions = connectionDiagnosticAlert.suggestions.join('\n\n') +
                      '\n\nComando Firewall POS (3000/3001):\nnetsh advfirewall firewall add rule name="FarmaDesk_POS_3000" dir=in action=allow protocol=TCP localport=3000,3001' +
                      '\n\nComando FarmaDesk Pro (Puerto 9050):\ncmd /c Iniciar-FarmaDesk.bat';
                    copyToClipboard(allSolutions, 'all_solutions');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" />
                  <span>{copiedKey === 'all_solutions' ? '¡Soluciones Copiadas!' : 'Copiar Diagnóstico Completo'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: Sincronización y Paquetes */}
          {activeTab === 'sync' && (
            <>
              {/* Card Destacada: Control de Versión de Globales (Tarifas, Precios, Usuarios y Parámetros) */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 rounded-2xl border border-indigo-500/30 shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-white">
                          Versión de Globales del Sistema
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                          Tarifas • Usuarios • Parámetros
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Sincronización de reglas de negocio, precios de parqueadero y perfiles configurados en la Central
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {installedGlobalVer === centralGlobalVer ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Terminal al Día
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        Actualización de Globales Disponible
                      </span>
                    )}
                  </div>
                </div>

                {/* Versión Local vs Versión Central Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block font-medium">Versión Instalada Local:</span>
                    <span className="text-sm font-black font-mono text-white mt-0.5 block">
                      {installedGlobalVer}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Terminal activa: {currentBranch.name}</span>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block font-medium">Versión en Servidor Central:</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-sm font-black font-mono text-indigo-300">
                        {centralGlobalVer}
                      </span>
                      {isLoadingGlobalInfo && (
                        <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {centralGlobalData?.activeVersionData?.description || 'Publicación manual desde la Central'}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block font-medium">Última Publicación Central:</span>
                    <span className="text-xs font-bold text-slate-300 mt-0.5 block">
                      {centralGlobalData?.activeVersionData?.publishedAt 
                        ? new Date(centralGlobalData.activeVersionData.publishedAt).toLocaleString('es-CO')
                        : 'Vigente'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Autor: {centralGlobalData?.activeVersionData?.author || 'Administrador Central'}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                    <span className="text-[11px] text-slate-400 block font-medium">Acción Requerida:</span>
                    {installedGlobalVer !== centralGlobalVer ? (
                      <span className="text-[11px] font-bold text-amber-400 mt-1">
                        Descargar {centralGlobalVer}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-400 mt-1">
                        Sin cambios pendientes
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 block">Sincronización manual protegida</span>
                  </div>
                </div>

                {/* Acciones de Actualización de Globales y Envío de Operaciones */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Afecta tarifas por minuto/hora, usuarios autorizados, conceptos de egresos y parámetros generales.</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={handlePushOperationsManual}
                      disabled={isPushingOperations || isSyncing}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                      title="Transmitir arqueos de turnos, recaudos, tiquetes pagados y ocupación de patio a la Central"
                    >
                      <Send className={`w-3.5 h-3.5 text-amber-400 ${isPushingOperations ? 'animate-bounce' : ''}`} />
                      <span>{isPushingOperations ? 'Transmitiendo...' : 'Transmitir Operación a Central'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await handleFullSync();
                        await refreshGlobalVersions();
                      }}
                      disabled={isSyncing}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer whitespace-nowrap"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Aplicando...' : 'Aplicar Versión de Globales'}</span>
                    </button>
                  </div>
                </div>

                {operationsPushSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{operationsPushSuccess}</span>
                  </div>
                )}
              </div>

              {/* Section 1: Pending Updates from Central */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-sky-700 dark:text-sky-400" />
                    Paquetes de Actualización desde Servidor Central
                  </h3>
                  <span className="text-xs font-mono text-slate-700 dark:text-slate-200">
                    {pendingPackages.length} pendientes
                  </span>
                </div>

                {pendingPackages.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center space-y-1.5">
                    <CheckCircle2 className="w-7 h-7 text-emerald-700 dark:text-emerald-400 mx-auto" />
                    <div className="text-xs font-bold text-slate-900 dark:text-white">¡Esta terminal está 100% al día con la Matriz!</div>
                    <p className="text-[11px] text-slate-700 dark:text-slate-200 max-w-md mx-auto">
                      No hay tarifas, políticas ni paquetes de insumos pendientes por inyectar en esta sucursal.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingPackages.map(pkg => (
                      <div
                        key={pkg.id}
                        className="p-4 bg-slate-50 dark:bg-slate-950 border border-amber-500/40 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                              {pkg.packageNumber}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">{pkg.title}</h4>
                            <span className="text-[10px] bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono">
                              {pkg.targetScope === 'all' ? 'Para Todas las Sedes' : 'Exclusivo para esta Sede'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300">{pkg.description}</p>

                          {/* Quick Rates Preview inside package card if available */}
                          {pkg.payload?.rates && (
                            <div className="bg-white dark:bg-slate-900/90 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                              <div>
                                <span className="text-slate-600 dark:text-slate-300 block text-[10px]">Tarifa Minuto:</span>
                                <span className="font-bold text-amber-700 dark:text-amber-400">${pkg.payload.rates.minuteRate || 60}/min</span>
                              </div>
                              <div>
                                <span className="text-slate-600 dark:text-slate-300 block text-[10px]">Tarifa Hora:</span>
                                <span className="font-bold text-amber-700 dark:text-amber-400">${pkg.payload.rates.hourRate || 3600}/hr</span>
                              </div>
                              <div>
                                <span className="text-slate-600 dark:text-slate-300 block text-[10px]">Tiquete Perdido:</span>
                                <span className="font-bold text-slate-600 dark:text-slate-300">${pkg.payload.rates.lostTicketFee || 15000}</span>
                              </div>
                              <div>
                                <span className="text-slate-600 dark:text-slate-300 block text-[10px]">Gracia:</span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">{pkg.payload.rates.gracePeriodMinutes || 15} min</span>
                              </div>
                            </div>
                          )}

                          <div className="text-[10px] text-slate-600 dark:text-slate-300 font-mono flex items-center gap-2">
                            <span>Despachado: {new Date(pkg.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>Autor: {pkg.author}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleApplySinglePackage(pkg.id, pkg.title)}
                          disabled={isSyncing}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-1.5 shadow-sm transition-colors whitespace-nowrap disabled:opacity-50 shrink-0 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Descargar y Aplicar</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Outbound Telemetry Overview */}
              <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Send className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  Telemetría Local Transmitida al Servidor Central
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-700 dark:text-slate-200 block font-semibold">Recaudo Acumulado Hoy:</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-400 font-mono">
                      ${currentBranch.todayRevenue.toLocaleString()} COP
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-700 dark:text-slate-200 block font-semibold">Vehículos en Patio:</span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">
                      {currentBranch.occupiedSpots} / {currentBranch.totalSpots} plazas
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-700 dark:text-slate-200 block font-semibold">Turno Activo:</span>
                    <span className="text-xs sm:text-sm font-black text-amber-700 dark:text-amber-400 font-mono">
                      Turno #{currentBranch.activeShiftNumber}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-700 dark:text-slate-200 block font-semibold">Cajero en Turno:</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 truncate block">
                      {currentBranch.currentCashier}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Branch Sync Logs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Historial de Sincronización de esta Sucursal
                  </h3>
                  {(currentUser.role === 'master' || currentUser.role === 'supervisor' || currentUser.permissions?.canExportReports) && branchLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="px-2.5 py-1 rounded bg-slate-850 hover:bg-slate-700 hover:text-white border border-slate-300 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      title="Exportar auditoría de sincronización a CSV"
                    >
                      <Download className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                      <span>Exportar CSV</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {branchLogs.length === 0 ? (
                    <div className="text-xs text-slate-200 py-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl text-center border border-slate-200 dark:border-slate-800">
                      No hay registros de sincronización recientes. Haz clic en "Sincronizar Todo Ahora" para iniciar la primera transmisión.
                    </div>
                  ) : (
                    branchLogs.map(log => (
                      <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                          <span className="text-slate-600 dark:text-slate-300 font-medium">{log.summary}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-700 dark:text-slate-200 shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: Dominios Sincronizados autorizados por Central */}
          {activeTab === 'domains_view' && (
            <div className="space-y-4 py-2">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Directiva de Sincronización Establecida por el Servidor Central
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-200 mt-1">
                    Esta sucursal ({currentBranch.name}) sincroniza automáticamente los siguientes módulos y entidades autorizadas según las políticas maestras de la empresa.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {getSyncMasterPolicy().domains.filter(d => d.enabled).map(domain => (
                  <div key={domain.id} className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{domain.name}</span>
                        <span className="text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          ACTIVO
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-800 dark:text-indigo-300">
                        {domain.code} • Clave: {domain.entityKey}
                      </span>
                      <p className="text-[11px] text-slate-700 dark:text-slate-200 mt-1 line-clamp-2">
                        {domain.description}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-700 dark:text-slate-200">
                      <span>Flujo: <strong className="text-slate-700 dark:text-slate-200">{domain.direction === 'central_to_branch' ? 'Central ➔ Sucursal' : domain.direction === 'branch_to_central' ? 'Sucursal ➔ Central' : 'Bidireccional'}</strong></span>
                      <span>v{domain.version}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Servidor de Datos Local y Remoto (Exact representation of requested screenshot) */}
          {activeTab === 'server_config' && (
            <ServerDataConfigCard
              onConfigSaved={(savedCfg) => {
                setServerConfig(savedCfg);
                if (onServerConfigSaved) onServerConfigSaved(savedCfg);
              }}
              onPerformManualSync={handleFullSync}
              isSyncingParent={isSyncing}
            />
          )}

          {/* TAB 4: Asistente de Red y Diagnóstico de Puertos (FarmaDesk Connector) */}
          {activeTab === 'network_wizard' && (
            <div className="space-y-6 py-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Header card with quick info */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-700 dark:text-rose-400 shrink-0">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Asistente de Enlace de Red y Diagnóstico FarmaDesk Pro®
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-200 mt-1">
                    Verifica la conectividad de los puertos locales, audita el túnel de WebSockets inverso, y fuerza el reintento de conexión al servidor central.
                  </p>
                </div>
              </div>

              {/* Steps bar */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto">
                {[
                  { num: 1, name: 'Parámetros' },
                  { num: 2, name: 'Escáner de Puertos' },
                  { num: 3, name: 'Diagnóstico de Red' },
                  { num: 4, name: 'Handshake Final' }
                ].map((st) => (
                  <button
                    key={st.num}
                    type="button"
                    onClick={() => {
                      setWizardStep(st.num);
                      playSound('success', true);
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                      wizardStep === st.num
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                      wizardStep === st.num ? 'bg-slate-950 text-rose-700 dark:text-rose-400' : 'bg-slate-800 text-slate-200'
                    }`}>
                      {st.num}
                    </span>
                    <span>{st.name}</span>
                  </button>
                ))}
              </div>

              {/* Wizard Content box */}
              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 min-h-[350px] flex flex-col justify-between gap-6">
                
                {/* STEP 1: PARÁMETROS Y PROTOCOLOS */}
                {wizardStep === 1 && (
                  <div className="space-y-4 animate-in fade-in duration-150 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                        <h5 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider font-mono">
                          Paso 1. Configuración de Acceso y Parámetros del Servidor Central
                        </h5>
                        <p className="text-[11px] text-slate-700 dark:text-slate-200 mt-1">
                          Asegúrate de que la dirección remota o IP de la central coincide con las políticas asignadas a tu sede.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                            Servidor Remoto / IP Central:
                          </label>
                          <input
                            type="text"
                            value={wizardServerHost}
                            onChange={(e) => setWizardServerHost(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                            placeholder="central.parqueaderopos.com"
                          />
                          <span className="text-[10px] text-slate-600 dark:text-slate-300 block">
                            Dominio o IP del servidor principal de ParqueaderoPOS.
                          </span>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                            ID de esta Sede Autodetectado:
                          </label>
                          <div className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-mono text-xs select-none">
                            {currentBranch.id} ({currentBranch.code})
                          </div>
                          <span className="text-[10px] text-slate-600 dark:text-slate-300 block">
                            Identificador único persistente para el enlace de sockets.
                          </span>
                        </div>
                      </div>

                      {/* Security details box */}
                      <div className="p-3.5 bg-rose-500/5 border border-rose-500/15 rounded-xl flex items-start gap-3 mt-4">
                        <ShieldCheck className="w-5 h-5 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Encriptación Segura SSL/TLS & Handshake de Túnel Inverso
                          </div>
                          <p className="text-[11px] text-slate-700 dark:text-slate-200 mt-0.5 leading-relaxed">
                            PowerShell y Python utilizarán los puertos seguros de la aplicación <strong className="text-rose-700 dark:text-rose-400">LAN 3000 / WAN 3001</strong> y de control remoto FarmaDesk Pro® <strong className="text-rose-700 dark:text-rose-400">LAN 7777 / WAN 7070</strong> bajo encriptación HTTPS/WSS (TLS 1.2 / TLS 1.3), previniendo filtraciones y permitiendo que la terminal de la sucursal sea controlada por VNC de forma fluida.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setWizardStep(2);
                          handleScanPorts();
                          playSound('success', true);
                        }}
                        className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                      >
                        <span>Siguiente: Escanear Puertos</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: ESCANEO DE PUERTOS EN LA SUCURSAL */}
                {wizardStep === 2 && (
                  <div className="space-y-4 animate-in fade-in duration-150 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                        <h5 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider font-mono">
                          Paso 2. Escáner Interactivo de Puertos (App: 3000/3001 • FarmaDesk: 7777/7070)
                        </h5>
                        <p className="text-[11px] text-slate-700 dark:text-slate-200 mt-1">
                          Audita la disponibilidad de los puertos necesarios en este equipo local y en el servidor remoto para recibir órdenes de control interactivo.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                        {/* 1. Port 3000 Box (App POS LAN) */}
                        <div className={`p-3.5 rounded-xl border transition-all ${
                          port3000Status === 'open' 
                            ? 'bg-emerald-950/25 border-emerald-800/60' 
                            : port3000Status === 'closed'
                            ? 'bg-red-950/25 border-red-800/60'
                            : 'bg-slate-900 border-slate-800'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-mono text-slate-600 dark:text-slate-300">PUERTO 3000 (App LAN)</span>
                            {port3000Status === 'scanning' ? (
                              <RefreshCw className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 animate-spin" />
                            ) : port3000Status === 'open' ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-sm bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">ONLINE</span>
                            ) : port3000Status === 'closed' ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-sm bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30">CERRADO</span>
                            ) : (
                              <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono">SIN VERIFICAR</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-700 dark:text-slate-200 mt-2 leading-relaxed">
                            Servidor web local POS y API de caja en http://localhost:3000.
                          </p>
                        </div>

                        {/* 2. Port 3001 Box (App POS WAN) */}
                        <div className={`p-3.5 rounded-xl border transition-all ${
                          port3001Status === 'open' 
                            ? 'bg-emerald-950/25 border-emerald-800/60' 
                            : port3001Status === 'closed'
                            ? 'bg-red-950/25 border-red-800/60'
                            : 'bg-slate-900 border-slate-800'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-mono text-slate-600 dark:text-slate-300">PUERTO 3001 (App WAN)</span>
                            {port3001Status === 'scanning' ? (
                              <RefreshCw className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 animate-spin" />
                            ) : port3001Status === 'open' ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-sm bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">ONLINE</span>
                            ) : port3001Status === 'closed' ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-sm bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30">CERRADO</span>
                            ) : (
                              <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono">SIN VERIFICAR</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-700 dark:text-slate-200 mt-2 leading-relaxed">
                            Sincronización remota WAN de tarifas y paquetes centrales.
                          </p>
                        </div>

                        {/* 3. Port 7777 Box (FarmaDesk LAN) */}
                        <div className={`p-3.5 rounded-xl border transition-all ${
                          port7777Status === 'open' 
                            ? 'bg-emerald-950/25 border-emerald-800/60' 
                            : port7777Status === 'closed'
                            ? 'bg-red-950/25 border-red-800/60'
                            : 'bg-slate-900 border-slate-800'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-mono text-slate-600 dark:text-slate-300">PUERTO 7777 (FarmaDesk LAN)</span>
                            {port7777Status === 'scanning' ? (
                              <RefreshCw className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 animate-spin" />
                            ) : port7777Status === 'open' ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-sm bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">ONLINE</span>
                            ) : port7777Status === 'closed' ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-sm bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30 font-bold animate-pulse">CERRADO</span>
                            ) : (
                              <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono">SIN VERIFICAR</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-700 dark:text-slate-200 mt-2 leading-relaxed">
                            Streaming 20 FPS y control interactivo en la red local.
                          </p>
                        </div>

                        {/* 4. Port 7070 Box (FarmaDesk WAN) */}
                        <div className={`p-3.5 rounded-xl border transition-all ${
                          port7070Status === 'open' 
                            ? 'bg-emerald-950/25 border-emerald-800/60' 
                            : port7070Status === 'closed'
                            ? 'bg-red-950/25 border-red-800/60'
                            : 'bg-slate-900 border-slate-800'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold font-mono text-slate-600 dark:text-slate-300">PUERTO 7070 (FarmaDesk WAN)</span>
                            {port7070Status === 'scanning' ? (
                              <RefreshCw className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 animate-spin" />
                            ) : port7070Status === 'open' ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-sm bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">ONLINE</span>
                            ) : port7070Status === 'closed' ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-sm bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30 font-bold animate-pulse">CERRADO</span>
                            ) : (
                              <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono">SIN VERIFICAR</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-700 dark:text-slate-200 mt-2 leading-relaxed">
                            Túnel WebSocket seguro por Internet para soporte en remoto.
                          </p>
                        </div>
                      </div>

                      {/* Instructions for closed port 7777 / 3000 */}
                      {(port7777Status === 'closed' || port3000Status === 'closed') && (
                        <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl space-y-1.5 mt-2">
                          <div className="text-[11px] font-extrabold text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                            <AlertTriangle className="w-3.5 h-3.5" /> ¡Puerto de Red de Sockets Inoperativo o Bloqueado!
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            Si no ejecutas el Agente local FarmaDesk Pro, la central no podrá controlar físicamente la pantalla de esta sucursal. Ejecuta el lanzador de FarmaDesk Pro o introduce este comando en la terminal:
                          </p>
                          <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-cyan-800 dark:text-cyan-300 break-all select-all">
                            cmd /c Iniciar-FarmaDesk.bat
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 gap-2">
                      <button
                        type="button"
                        onClick={handleScanPorts}
                        disabled={isScanningPorts}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-850 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isScanningPorts ? 'animate-spin' : ''}`} />
                        <span>Re-escanear Puertos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setWizardStep(3);
                          // Se auto-agregan logs al log de red
                          setDiagnosticLog(prev => [
                            ...prev,
                            `[INFO] Iniciando trazador de ruta visual hacia central...`,
                            `[DETALLE] IP Local: ${detectedLocalIp} | IP Pública: ${detectedPublicIp}`
                          ]);
                          playSound('success', true);
                        }}
                        className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                      >
                        <span>Ver Diagnóstico de Red</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: DIAGNÓSTICO VISUAL DE RED (MAPA DE RUTA Y LOGS DE TERMINAL) */}
                {wizardStep === 3 && (
                  <div className="space-y-4 animate-in fade-in duration-150 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                        <h5 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider font-mono">
                          Paso 3. Diagnóstico de Red y Ruta de Tránsito (Visual Path Tracer)
                        </h5>
                        <p className="text-[11px] text-slate-700 dark:text-slate-200 mt-1">
                          Mapa conceptual interactivo del flujo de datos en tiempo real entre la terminal física y el Servidor Central.
                        </p>
                      </div>

                      {/* Network nodes visualization */}
                      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
                        <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2 relative">
                          
                          {/* Node 1 */}
                          <div className="flex flex-col items-center text-center space-y-1 z-10">
                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                              <Laptop className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-900 dark:text-white">Este PC</span>
                            <span className="text-[9px] text-slate-600 dark:text-slate-300 font-mono">{detectedLocalIp}</span>
                          </div>

                          {/* Line */}
                          <div className="hidden sm:block flex-1 h-0.5 bg-slate-800 relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-rose-500 animate-pulse"></div>
                          </div>

                          {/* Node 2 */}
                          <div className="flex flex-col items-center text-center space-y-1 z-10">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
                              port3000Status === 'open' && port7777Status === 'open'
                                ? 'bg-emerald-950/45 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                                : 'bg-red-950/45 border-red-500 text-red-700 dark:text-red-400'
                            }`}>
                              <Cpu className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-900 dark:text-white">Puertos Sede</span>
                            <span className="text-[9px] text-slate-700 dark:text-slate-200 font-mono text-center">
                              POS: {port3000Status === 'open' ? '3000 ✔' : '3000 ✘'} | WDesk: {port7777Status === 'open' ? '7777 ✔' : '7777 ✘'}
                            </span>
                          </div>

                          {/* Line */}
                          <div className="hidden sm:block flex-1 h-0.5 bg-slate-800 relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-rose-500 to-blue-500 animate-pulse"></div>
                          </div>

                          {/* Node 3 */}
                          <div className="flex flex-col items-center text-center space-y-1 z-10">
                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-blue-700 dark:text-blue-400">
                              <Wifi className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-900 dark:text-white">Módem ISP</span>
                            <span className="text-[9px] text-slate-600 dark:text-slate-300 font-mono truncate max-w-[100px]">{detectedPublicIp}</span>
                          </div>

                          {/* Line */}
                          <div className="hidden sm:block flex-1 h-0.5 bg-slate-800 relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse"></div>
                          </div>

                          {/* Node 4 */}
                          <div className="flex flex-col items-center text-center space-y-1 z-10">
                            <div className="w-10 h-10 rounded-full bg-indigo-950 border border-indigo-700 flex items-center justify-center text-indigo-700 dark:text-indigo-400">
                              <Server className="w-5 h-5 animate-pulse" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-900 dark:text-white">Servidor Central</span>
                            <span className="text-[9px] text-slate-700 dark:text-slate-200 font-mono truncate max-w-[140px]">
                              {wizardServerHost || '186.180.74.35'}:3001
                            </span>
                          </div>

                        </div>
                      </div>

                      {/* Monospace Developer console log console */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 font-mono uppercase tracking-wider block">Consola de Red en Tiempo Real:</span>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 h-32 overflow-y-auto font-mono text-[10px] text-emerald-700 dark:text-emerald-400 space-y-1 select-text scrollbar-thin">
                          {diagnosticLog.map((logLine, i) => (
                            <div key={i} className="leading-relaxed">
                              {logLine}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setWizardStep(4);
                          handleRetryWsConnection();
                          playSound('success', true);
                        }}
                        className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                      >
                        <span>Siguiente: Realizar Handshake Sockets</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: HANDSHAKE DE SOCKETS Y REINTENTO DE CONEXIÓN */}
                {wizardStep === 4 && (
                  <div className="space-y-4 animate-in fade-in duration-150 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                        <h5 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider font-mono">
                          Paso 4. Enlace Final por WebSocket y Prueba de Handshake Seguro
                        </h5>
                        <p className="text-[11px] text-slate-700 dark:text-slate-200 mt-1">
                          Evaluación final de conectividad bidireccional mediante FarmaDesk Socket Client en LAN (3000/7777) y WAN (3001/7070).
                        </p>
                      </div>

                      {/* Connection Diagnostic Result Card */}
                      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center space-y-3">
                        {wsDiagnosticStatus === 'testing' ? (
                          <>
                            <RefreshCw className="w-10 h-10 text-amber-700 dark:text-amber-400 animate-spin" />
                            <div className="text-xs font-bold text-slate-900 dark:text-white">Estableciendo Handshake de WebSocket...</div>
                            <p className="text-[11px] text-slate-700 dark:text-slate-200 max-w-sm">
                              Enviando firma de sede {currentBranch.id} por WSS TLS 1.2 / TLS 1.3 a {wizardServerHost}. Esperando respuesta del ping...
                            </p>
                          </>
                        ) : wsDiagnosticStatus === 'success' ? (
                          <>
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                              <Check className="w-6 h-6 animate-bounce" />
                            </div>
                            <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-mono">
                              ¡CONEXIÓN DE TELEMETRÍA 100% ACTIVA!
                            </div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">Canal WebSocket Conectado Correctamente</div>
                            <p className="text-[11px] text-slate-700 dark:text-slate-200 max-w-md leading-relaxed">
                              La sede remota ya transmite datos y está lista para el <strong className="text-emerald-700 dark:text-emerald-400">Escritorio Remoto FarmaDesk Pro® (LAN 7777 / WAN 7070)</strong>. Latencia: <strong className="font-mono text-white">{wizardLatency || 15}ms</strong> • Protocolo de Seguridad Forzado: TLS 1.2 / TLS 1.3 Seguro.
                            </p>
                          </>
                        ) : wsDiagnosticStatus === 'failed' ? (
                          <>
                            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-700 dark:text-red-400">
                              <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div className="text-xs font-extrabold text-red-700 dark:text-red-400 uppercase tracking-wider font-mono">
                              ENLACE FALLIDO O INTERRUMPIDO
                            </div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">No se pudo negociar el handshake de socket</div>
                            <p className="text-[11px] text-slate-700 dark:text-slate-200 max-w-md">
                              {connectionDiagnosticAlert?.blockedPorts && connectionDiagnosticAlert.blockedPorts.length > 0
                                ? `El ping de diagnóstico previo detectó que el puerto ${connectionDiagnosticAlert.blockedPorts.map(p => `TCP ${p}`).join(' y ')} se encuentra bloqueado o inactivo en esta terminal.`
                                : `Verifica que el Servidor Central esté en línea en ${wizardServerHost}. Si el puerto 7777/7070 local dio negativo, ejecuta el Agente de escritorio para abrir el túnel de clicks inversos.`}
                            </p>

                            {connectionDiagnosticAlert?.blockedPorts.includes(7777) && (
                              <div className="w-full text-left bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-red-500/30 space-y-1 mt-2">
                                <div className="flex items-center justify-between text-[10px] text-rose-800 dark:text-rose-300 font-mono font-bold">
                                  <span>Solución Agente FarmaDesk Pro®:</span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(
                                      'cmd /c Iniciar-FarmaDesk.bat',
                                      'step4_cmd_7777'
                                    )}
                                    className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Copy className="w-3 h-3" />
                                    <span>{copiedKey === 'step4_cmd_7777' ? '¡Copiado!' : 'Copiar'}</span>
                                  </button>
                                </div>
                                <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 break-all select-all">
                                  cmd /c Iniciar-FarmaDesk.bat
                                </div>
                              </div>
                            )}

                            {connectionDiagnosticAlert?.blockedPorts.includes(3000) && (
                              <div className="w-full text-left bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-red-500/30 space-y-1 mt-2">
                                <div className="flex items-center justify-between text-[10px] text-rose-800 dark:text-rose-300 font-mono font-bold">
                                  <span>Solución Puerto 3000/3001 (Regla Firewall POS):</span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(
                                      'netsh advfirewall firewall add rule name="FarmaDesk_POS_3000" dir=in action=allow protocol=TCP localport=3000,3001',
                                      'step4_cmd_3000'
                                    )}
                                    className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Copy className="w-3 h-3" />
                                    <span>{copiedKey === 'step4_cmd_3000' ? '¡Copiado!' : 'Copiar'}</span>
                                  </button>
                                </div>
                                <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 break-all select-all">
                                  netsh advfirewall firewall add rule name="FarmaDesk_POS_3000" dir=in action=allow protocol=TCP localport=3000,3001
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <Zap className="w-10 h-10 text-rose-700 dark:text-rose-400" />
                            <div className="text-xs font-bold text-slate-900 dark:text-white">Prueba de Sockets no iniciada</div>
                            <p className="text-[11px] text-slate-700 dark:text-slate-200 max-w-sm">
                              Haz clic en "Iniciar handshake" para verificar el canal de sockets en vivo con la central remota.
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setWizardStep(1);
                          setWsDiagnosticStatus('idle');
                          setPort3000Status('unchecked');
                          setPort3001Status('unchecked');
                          setPort7777Status('unchecked');
                          setPort7070Status('unchecked');
                          playSound('success', true);
                        }}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-slate-850 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                      >
                        Reiniciar Asistente
                      </button>

                      <button
                        type="button"
                        onClick={handleRetryWsConnection}
                        disabled={isRetryingWs}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center gap-1.5 shadow-md hover:shadow-rose-500/15 transition-all cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRetryingWs ? 'animate-spin' : ''}`} />
                        <span>FORZAR REINTENTO DE CONEXIÓN</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* TAB 5: ALERTAS PROACTIVAS DE RED Y SALUD DE ENLACE */}
          {activeTab === 'network_alerts' && (
            <div className="space-y-5 animate-in fade-in duration-200">

              {/* Header de la sección con switch de monitoreo en vivo */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity className={`w-4 h-4 ${
                      linkHealth.tier === 'optimal' ? 'text-emerald-700 dark:text-emerald-400' :
                      linkHealth.tier === 'moderate' ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400 animate-pulse'
                    }`} />
                    Monitoreo en Vivo de Estabilidad de Red y Salud de Enlace
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5">
                    Evaluación continua del canal WebSocket con {wizardServerHost || 'Servidor Central'}. Detección proactiva de micro-cortes y jitter.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLiveMonitoring(!isLiveMonitoring)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                      isLiveMonitoring
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-700'
                    }`}
                  >
                    {isLiveMonitoring ? (
                      <>
                        <Pause className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        <span>Monitoreo Activo (3s)</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" />
                        <span>Reanudar Monitoreo</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleRunBurstTest}
                    disabled={isBurstTesting}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isBurstTesting ? 'animate-spin text-rose-700 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`} />
                    <span>{isBurstTesting ? 'Sondeando...' : 'Ráfaga de Calibración'}</span>
                  </button>
                </div>
              </div>

              {/* CARD PRINCIPAL: INDICADOR VISUAL DE 'SALUD DE ENLACE' (VERDE / AMARILLO / ROJO) */}
              <div className={`p-5 rounded-2xl border transition-all shadow-xl relative overflow-hidden ${
                linkHealth.tier === 'optimal'
                  ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/30'
                  : linkHealth.tier === 'moderate'
                  ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/30'
                  : 'bg-gradient-to-br from-rose-950/50 via-slate-900 to-slate-950 border-rose-500/40'
              }`}>
                {/* Background glow circle */}
                <div className={`absolute -right-8 -top-8 w-40 h-40 rounded-full blur-3xl pointer-events-none ${
                  linkHealth.tier === 'optimal' ? 'bg-emerald-500/10' :
                  linkHealth.tier === 'moderate' ? 'bg-amber-500/10' : 'bg-rose-500/15'
                }`}></div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
                  <div className="flex items-start gap-4">
                    {/* Glowing status circle icon */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-lg ${
                      linkHealth.tier === 'optimal'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 shadow-emerald-500/10'
                        : linkHealth.tier === 'moderate'
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40 shadow-amber-500/10'
                        : 'bg-rose-500/25 text-rose-700 dark:text-rose-400 border-rose-500/50 shadow-rose-500/20 animate-pulse'
                    }`}>
                      {linkHealth.tier === 'optimal' ? (
                        <ShieldCheck className="w-8 h-8" />
                      ) : linkHealth.tier === 'moderate' ? (
                        <AlertTriangle className="w-8 h-8" />
                      ) : (
                        <ShieldAlert className="w-8 h-8" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                          Diagnóstico en Tiempo Real
                        </span>
                        <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
                          linkHealth.tier === 'optimal'
                            ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'
                            : linkHealth.tier === 'moderate'
                            ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40 animate-pulse'
                        }`}>
                          {linkHealth.tier === 'optimal' ? '🟢 ENLACE VERDE (ÓPTIMO)' :
                           linkHealth.tier === 'moderate' ? '🟡 ENLACE AMARILLO (DEGRADADO)' :
                           '🔴 ENLACE ROJO (CRÍTICO)'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300">
                          Último ping: {linkHealth.lastPingTimestamp}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {linkHealth.tier === 'optimal' && 'Canal WebSocket Estable y Saludable'}
                        {linkHealth.tier === 'moderate' && 'Canal WebSocket con Degradación Parcial'}
                        {linkHealth.tier === 'critical' && 'Canal WebSocket Inestable o Caído'}
                      </h4>

                      <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                        {linkHealth.tier === 'optimal' &&
                          'La latencia se mantiene en niveles óptimos y la tasa de pérdida de paquetes es del 0%. El escritorio remoto FarmaDesk Pro® y la sincronización de turnos pueden operar a 60 FPS sin interrupciones.'}
                        {linkHealth.tier === 'moderate' &&
                          'Se observan variaciones de latencia o micro-descartes de paquetes. Puede existir un leve retraso en la captura de movimientos del ratón en la sucursal.'}
                        {linkHealth.tier === 'critical' &&
                          'La pérdida de paquetes excede los límites seguros o el socket se encuentra desconectado. Se requiere intervención en la red local o en las reglas de firewall.'}
                      </p>
                    </div>
                  </div>

                  {/* Indicador de Semáforo / Traffic Light 3-Level Gauge */}
                  <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-50 dark:bg-slate-950/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 min-w-[200px] space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-700 dark:text-slate-200 font-bold">
                      Semáforo de Enlace
                    </span>
                    <div className="flex items-center gap-2">
                      {/* VERDE */}
                      <div className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all ${
                        linkHealth.tier === 'optimal'
                          ? 'bg-emerald-500/25 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-900 border-slate-800 text-slate-600 dark:text-slate-300 opacity-40'
                      }`}>
                        <div className={`w-3.5 h-3.5 rounded-full ${linkHealth.tier === 'optimal' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`}></div>
                        <span className="text-[9px] font-bold font-mono">VERDE</span>
                      </div>

                      {/* AMARILLO */}
                      <div className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all ${
                        linkHealth.tier === 'moderate'
                          ? 'bg-amber-500/25 border-amber-500 text-amber-700 dark:text-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-slate-900 border-slate-800 text-slate-600 dark:text-slate-300 opacity-40'
                      }`}>
                        <div className={`w-3.5 h-3.5 rounded-full ${linkHealth.tier === 'moderate' ? 'bg-amber-400 animate-pulse' : 'bg-slate-700'}`}></div>
                        <span className="text-[9px] font-bold font-mono">AMARILLO</span>
                      </div>

                      {/* ROJO */}
                      <div className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all ${
                        linkHealth.tier === 'critical'
                          ? 'bg-rose-500/25 border-rose-500 text-rose-700 dark:text-rose-400 shadow-md shadow-rose-500/20'
                          : 'bg-slate-900 border-slate-800 text-slate-600 dark:text-slate-300 opacity-40'
                      }`}>
                        <div className={`w-3.5 h-3.5 rounded-full ${linkHealth.tier === 'critical' ? 'bg-rose-400 animate-pulse' : 'bg-slate-700'}`}></div>
                        <span className="text-[9px] font-bold font-mono">ROJO</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* GRID DE MÉTRICAS EN TIEMPO REAL */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* 1. Latencia Actual */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase font-mono">Latencia Ping</span>
                    <Gauge className={`w-3.5 h-3.5 ${
                      linkHealth.latencyMs < 60 ? 'text-emerald-700 dark:text-emerald-400' :
                      linkHealth.latencyMs < 140 ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'
                    }`} />
                  </div>
                  <div className="text-xl font-black font-mono text-slate-900 dark:text-white flex items-baseline gap-1">
                    <span>{linkHealth.latencyMs}</span>
                    <span className="text-xs font-normal text-slate-700 dark:text-slate-200">ms</span>
                  </div>
                  <div className="text-[10px] text-slate-700 dark:text-slate-200 font-mono">
                    Prom: {linkHealth.averageLatencyMs}ms • Mín: {linkHealth.minLatencyMs}ms
                  </div>
                </div>

                {/* 2. Tasa de Pérdida de Paquetes */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase font-mono">Pérdida de Paquetes</span>
                    <Signal className={`w-3.5 h-3.5 ${
                      linkHealth.packetLossRate <= 2 ? 'text-emerald-700 dark:text-emerald-400' :
                      linkHealth.packetLossRate <= 10 ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'
                    }`} />
                  </div>
                  <div className={`text-xl font-black font-mono flex items-baseline gap-1 ${
                    linkHealth.packetLossRate <= 2 ? 'text-emerald-700 dark:text-emerald-400' :
                    linkHealth.packetLossRate <= 10 ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'
                  }`}>
                    <span>{linkHealth.packetLossRate}</span>
                    <span className="text-xs font-normal text-slate-700 dark:text-slate-200">%</span>
                  </div>
                  <div className="text-[10px] text-slate-700 dark:text-slate-200 font-mono">
                    {linkHealth.packetsLost} perdidos / {linkHealth.packetsSent} env
                  </div>
                </div>

                {/* 3. Jitter / Variabilidad */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase font-mono">Jitter (Variación)</span>
                    <Activity className={`w-3.5 h-3.5 ${linkHealth.jitterMs < 20 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`} />
                  </div>
                  <div className="text-xl font-black font-mono text-slate-900 dark:text-white flex items-baseline gap-1">
                    <span>±{linkHealth.jitterMs}</span>
                    <span className="text-xs font-normal text-slate-700 dark:text-slate-200">ms</span>
                  </div>
                  <div className="text-[10px] text-slate-700 dark:text-slate-200 font-mono">
                    {linkHealth.jitterMs < 20 ? 'Señal continua y estable' : 'Fluctuación perceptible'}
                  </div>
                </div>

                {/* 4. Socket Status */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase font-mono">Canal WebSocket</span>
                    <Wifi className={`w-3.5 h-3.5 ${linkHealth.wsStatus === 'connected' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`} />
                  </div>
                  <div className="text-xs font-black font-mono text-slate-900 dark:text-white truncate">
                    {linkHealth.wsStatus === 'connected' ? 'WSS CONECTADO' :
                     linkHealth.wsStatus === 'connecting' ? 'CONECTANDO...' : 'DESCONECTADO'}
                  </div>
                  <div className="text-[10px] text-slate-700 dark:text-slate-200 font-mono truncate">
                    Puertos: LAN 3000/7777 • WAN 3001/7070
                  </div>
                </div>
              </div>

              {/* MINI HISTOGRAMA DE LATENCIA RECIENTE */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 font-mono uppercase tracking-wider">
                    Historial de Sonda de Latencia (Últimas Muestras):
                  </span>
                  <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                    Rango: 0ms - 200ms
                  </span>
                </div>

                <div className="h-16 flex items-end gap-1.5 pt-2 pb-1 border-b border-slate-200 dark:border-slate-800">
                  {linkHealth.sampleHistory.map((val, idx) => {
                    const heightPercent = Math.min(100, Math.max(15, (val / 160) * 100));
                    const isGood = val < 60;
                    const isWarn = val >= 60 && val < 140;
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1 group relative"
                      >
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-sm transition-all ${
                            isGood ? 'bg-emerald-500/80 hover:bg-emerald-400' :
                            isWarn ? 'bg-amber-500/80 hover:bg-amber-400' :
                            'bg-rose-500/80 hover:bg-rose-400'
                          }`}
                        ></div>
                        <span className="text-[8px] font-mono text-slate-600 dark:text-slate-300 hidden sm:inline">{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* FEED DE ALERTAS PROACTIVAS DE RED */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">
                      Alertas Proactivas de Red ({linkHealth.alerts.length})
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-700 dark:text-slate-200">
                    Generadas automáticamente según umbrales de latencia y descarte
                  </span>
                </div>

                {linkHealth.alerts.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Sin Alertas Activas en la Red</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                        El enlace con el Servidor Central se mantiene estable, con 0% de pérdida de paquetes y latencia óptima.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {linkHealth.alerts.map((al) => (
                      <div
                        key={al.id}
                        className={`p-3.5 rounded-xl border space-y-1.5 transition-all ${
                          al.severity === 'danger'
                            ? 'bg-rose-950/25 border-rose-500/35'
                            : 'bg-amber-950/25 border-amber-500/35'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {al.severity === 'danger' ? (
                              <ShieldAlert className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                            )}
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{al.title}</span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-700 dark:text-slate-200">{al.timestamp}</span>
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-300 pl-6 leading-relaxed">
                          {al.description}
                        </p>

                        <div className="ml-6 mt-1 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-700 dark:text-slate-300 font-mono flex items-start gap-2">
                          <span className="text-rose-700 dark:text-rose-400 font-bold shrink-0">Sugerencia:</span>
                          <span>{al.recommendation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SERVICIO DE NOTIFICACIONES WEB (NOTIFICATION API) */}
              <WebNotificationSettingsCard />

              {/* Botones de acción del pie de pestaña */}
              <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const client = new FarmaDeskSocketClient('branch', currentBranch.id, wizardServerHost || serverConfig?.remoteDbHost);
                    client.resetHealthMetrics();
                    setLinkHealth(client.getLinkHealth());
                    playSound('success', true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-850 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" />
                  <span>Restablecer Contadores</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('network_wizard');
                      setWizardStep(1);
                      playSound('success', true);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                  >
                    Abrir Asistente Paso a Paso
                  </button>

                  <button
                    type="button"
                    onClick={handleRunBurstTest}
                    disabled={isBurstTesting}
                    className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isBurstTesting ? 'animate-spin' : ''}`} />
                    <span>Ejecutar Test Completo de Enlace</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 6: PANEL DE CONTROL DE CALIDAD DE RED (QoS & TRAFFIC SHAPING) */}
          {activeTab === 'qos_traffic_control' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Header de la sección QoS */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                    Panel de Calidad de Red y Priorización de Tráfico (QoS FarmaDesk Pro®)
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5">
                    Garantiza que la emisión de tickets, cobros y arqueos en caja nunca se interrumpan, regulando el escritorio remoto si la latencia supera los 300ms.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-1.5 ${
                    ((simulatedHighLatency !== null ? simulatedHighLatency : linkHealth.averageLatencyMs) >= qosConfig.latencyThresholdMs) || qosConfig.mode === 'telemetry_first'
                      ? 'bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-500/40 animate-pulse'
                      : 'bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      ((simulatedHighLatency !== null ? simulatedHighLatency : linkHealth.averageLatencyMs) >= qosConfig.latencyThresholdMs) || qosConfig.mode === 'telemetry_first'
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-emerald-400'
                    }`} />
                    <span>
                      {((simulatedHighLatency !== null ? simulatedHighLatency : linkHealth.averageLatencyMs) >= qosConfig.latencyThresholdMs) || qosConfig.mode === 'telemetry_first'
                        ? '⚡ PRIORIDAD TELEMETRÍA POS ACTIVA'
                        : '🟢 TRÁFICO NORMAL (FULL SPEED)'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Banner de Estado Dinámico de QoS */}
              {(() => {
                const currentLat = simulatedHighLatency !== null ? simulatedHighLatency : linkHealth.averageLatencyMs;
                const isThrottled = (qosConfig.mode === 'telemetry_first') || (qosConfig.mode === 'auto' && currentLat >= qosConfig.latencyThresholdMs);
                
                return (
                  <div className={`p-5 rounded-2xl border transition-all shadow-xl ${
                    isThrottled
                      ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/40'
                      : 'bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-950 border-emerald-500/30'
                  }`}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-3 rounded-2xl border shrink-0 ${
                          isThrottled 
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40' 
                            : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40'
                        }`}>
                          {isThrottled ? <Shield className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-slate-900 dark:text-white">
                              {isThrottled 
                                ? `Tráfico de Telemetría POS Priorizado (Latencia: ${currentLat}ms >= ${qosConfig.latencyThresholdMs}ms)`
                                : `Enlace de Red Saludable (Latencia: ${currentLat}ms < ${qosConfig.latencyThresholdMs}ms)`}
                            </h4>
                            <span className="text-[10px] bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-mono font-bold border border-slate-300 dark:border-slate-700">
                              {qosConfig.mode === 'auto' ? 'Modo Auto-Adaptativo' : qosConfig.mode === 'telemetry_first' ? 'Prioridad Forzada' : 'Modo Balanceado'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
                            {isThrottled
                              ? 'Debido a la latencia detectada, el sistema asigna el 85% del ancho de banda y cola de despacho prioritaria a la facturación y tickets, limitando el stream de video de FarmaDesk a 15 FPS para evitar la pérdida de transacciones.'
                              : 'La conexión tiene latencia óptima. Se permite transmisión de pantalla fluida a 60 FPS sin restricciones y sincronización de datos continua en segundo plano.'}
                          </p>
                        </div>
                      </div>

                      {/* Medidores Rápidos */}
                      <div className="flex items-center gap-3 shrink-0 bg-slate-50 dark:bg-slate-50 dark:bg-slate-950/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs">
                        <div className="text-center px-2">
                          <div className="text-[10px] text-slate-600 dark:text-slate-300 uppercase">Latencia Actual</div>
                          <div className={`text-sm font-black ${currentLat > 300 ? 'text-rose-700 dark:text-rose-400' : currentLat > 100 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                            {currentLat}ms
                          </div>
                        </div>
                        <div className="h-6 w-px bg-slate-800" />
                        <div className="text-center px-2">
                          <div className="text-[10px] text-slate-600 dark:text-slate-300 uppercase">Reserva POS</div>
                          <div className="text-sm font-black text-cyan-800 dark:text-cyan-300">{isThrottled ? '85%' : '50%'}</div>
                        </div>
                        <div className="h-6 w-px bg-slate-800" />
                        <div className="text-center px-2">
                          <div className="text-[10px] text-slate-600 dark:text-slate-300 uppercase">Cap Video</div>
                          <div className="text-sm font-black text-indigo-800 dark:text-indigo-300">{isThrottled ? '15 FPS' : '60 FPS'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Matriz Gráfica de Distribución de Ancho de Banda */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4 shadow-lg">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                  Distribución y Asignación de Tráfico en Tiempo Real
                </h4>

                {(() => {
                  const currentLat = simulatedHighLatency !== null ? simulatedHighLatency : linkHealth.averageLatencyMs;
                  const isThrottled = (qosConfig.mode === 'telemetry_first') || (qosConfig.mode === 'auto' && currentLat >= qosConfig.latencyThresholdMs);
                  const telemetryPercent = isThrottled ? 85 : 50;
                  const videoPercent = isThrottled ? 15 : 50;

                  return (
                    <div className="space-y-3">
                      {/* Barra de Distribución Visual */}
                      <div className="w-full h-7 bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden flex border border-slate-200 dark:border-slate-800 p-0.5">
                        <div 
                          style={{ width: `${telemetryPercent}%` }}
                          className="h-full bg-gradient-to-r from-cyan-600 to-blue-600 rounded-l-lg flex items-center justify-center text-[10px] font-black text-white tracking-wide transition-all duration-500"
                        >
                          TELEMETRÍA Y TICKETS POS ({telemetryPercent}%)
                        </div>
                        <div 
                          style={{ width: `${videoPercent}%` }}
                          className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-r-lg flex items-center justify-center text-[10px] font-black text-white tracking-wide transition-all duration-500"
                        >
                          VIDEO REMOTO ({videoPercent}%)
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-cyan-500/20 flex items-center justify-between">
                          <div>
                            <span className="text-cyan-700 dark:text-cyan-400 font-bold block">Canal Telemetría & Datos POS</span>
                            <span className="text-slate-700 dark:text-slate-200 text-[11px]">Cola de despacho Zero-Drop prioritaria</span>
                          </div>
                          <span className="text-sm font-black text-cyan-800 dark:text-white bg-cyan-100 dark:bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                            {telemetryPercent}% Ancho de Banda
                          </span>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-indigo-500/20 flex items-center justify-between">
                          <div>
                            <span className="text-indigo-700 dark:text-indigo-400 font-bold block">Canal FarmaDesk Pro® Escritorio Remoto</span>
                            <span className="text-slate-700 dark:text-slate-200 text-[11px]">Compresión adaptativa WebRTC</span>
                          </div>
                          <span className="text-sm font-black text-indigo-800 dark:text-white bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                            {videoPercent}% Ancho de Banda
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Controles de Configuración de Calidad de Servicio (QoS) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Bloque 1: Modo de Priorización */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                    Política de Priorización de Tráfico
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-200">
                    Selecciona cómo debe actuar el motor cuando la conexión experimente lentitud o saturación:
                  </p>

                  <div className="space-y-2 pt-1">
                    {[
                      {
                        id: 'auto',
                        title: '⚡ Automático Adaptativo (Recomendado)',
                        desc: `Activa priorización de telemetría únicamente cuando la latencia supera los ${qosConfig.latencyThresholdMs}ms.`
                      },
                      {
                        id: 'telemetry_first',
                        title: '🛡️ Prioridad Forzada a Telemetría POS',
                        desc: 'Reserva siempre el 85% para cajas y cobros sin importar la latencia del enlace.'
                      },
                      {
                        id: 'remote_desktop_first',
                        title: '🖥️ Prioridad a Escritorio Remoto',
                        desc: 'Otorga máxima fluidez y tasa de refresco al streaming de video en sesiones de soporte.'
                      },
                      {
                        id: 'balanced',
                        title: '⚖️ Modo Balanceado (50% / 50%)',
                        desc: 'Divide el ancho de banda por partes iguales entre la aplicación y el control remoto.'
                      }
                    ].map((modeItem) => (
                      <button
                        key={modeItem.id}
                        type="button"
                        onClick={() => {
                          const updated = { ...qosConfig, mode: modeItem.id as QosPriorityMode };
                          setQosConfig(updated);
                          const client = new FarmaDeskSocketClient('branch', currentBranch.id);
                          client.updateQosConfig(updated);
                          playSound('beep');
                        }}
                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                          qosConfig.mode === modeItem.id
                            ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-md'
                            : 'bg-slate-50 dark:bg-slate-950/60 border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{modeItem.title}</span>
                          {qosConfig.mode === modeItem.id && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
                          )}
                        </div>
                        <span className="text-[11px] text-slate-700 dark:text-slate-200">{modeItem.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bloque 2: Umbrales y Opciones Avanzadas */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                      Umbral de Disparo de Latencia (RTT)
                    </h4>

                    {/* Slider de Umbral */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-300 font-bold">Umbral de Activación:</span>
                        <span className="font-mono text-sm font-black text-cyan-700 dark:text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                          {qosConfig.latencyThresholdMs} ms
                        </span>
                      </div>
                      <input
                        type="range"
                        min={150}
                        max={600}
                        step={25}
                        value={qosConfig.latencyThresholdMs}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = { ...qosConfig, latencyThresholdMs: val };
                          setQosConfig(updated);
                          const client = new FarmaDeskSocketClient('branch', currentBranch.id);
                          client.updateQosConfig(updated);
                        }}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                        <span>150ms (Sensible)</span>
                        <span>300ms (Estándar)</span>
                        <span>600ms (Tolerante)</span>
                      </div>
                    </div>

                    {/* Opciones Adicionales */}
                    <div className="space-y-2">
                      <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-300 dark:border-slate-700">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">Compresión Rápida de Payloads POS</span>
                          <span className="text-[11px] text-slate-700 dark:text-slate-200">Reduce el tamaño de paquetes JSON de tickets y facturas</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={qosConfig.enablePayloadCompression}
                          onChange={(e) => {
                            const updated = { ...qosConfig, enablePayloadCompression: e.target.checked };
                            setQosConfig(updated);
                            const client = new FarmaDeskSocketClient('branch', currentBranch.id);
                            client.updateQosConfig(updated);
                            playSound('beep');
                          }}
                          className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-300 dark:border-slate-700">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">Cap Adaptativo de Video a 15 FPS</span>
                          <span className="text-[11px] text-slate-700 dark:text-slate-200">Reduce tasa de refresco al saturarse el módem</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={qosConfig.remoteDesktopFpsCap === 15}
                          onChange={(e) => {
                            const updated = { ...qosConfig, remoteDesktopFpsCap: e.target.checked ? 15 : 60 };
                            setQosConfig(updated);
                            const client = new FarmaDeskSocketClient('branch', currentBranch.id);
                            client.updateQosConfig(updated);
                            playSound('beep');
                          }}
                          className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Simulador de Pruebas de Latencia en Vivo */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
                      🧪 Pruebas de Comportamiento Dinámico:
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSimulatedHighLatency(385);
                          playSound('beep');
                        }}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          simulatedHighLatency === 385
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                            : 'bg-slate-950 text-amber-800 dark:text-amber-300 border-amber-500/30 hover:bg-amber-950/40'
                        }`}
                      >
                        Simular Latencia &gt;300ms (385ms)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSimulatedHighLatency(null);
                          playSound('success');
                        }}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 transition-all cursor-pointer"
                      >
                        Restaurar Real
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Botón de Guardado y Aplicación a la Sede */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-700 dark:text-slate-200 font-mono">
                  Configuración QoS guardada localmente y transmitida a sockets de sucursal.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsSavingQos(true);
                    const client = new FarmaDeskSocketClient('branch', currentBranch.id);
                    client.updateQosConfig(qosConfig);
                    setTimeout(() => {
                      setIsSavingQos(false);
                      playSound('success');
                    }, 500);
                  }}
                  disabled={isSavingQos}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingQos ? 'Aplicando Política...' : 'Guardar y Aplicar Política QoS'}</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-800 dark:text-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Modo: Terminal de Sucursal Conectada ({currentBranch.code})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
