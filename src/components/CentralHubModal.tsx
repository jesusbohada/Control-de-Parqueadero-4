import React, { useState, useEffect } from 'react';
import {
  Server,
  Building2,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Car,
  TrendingUp,
  Download,
  Plus,
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers,
  FileSpreadsheet,
  Cpu,
  Package,
  X,
  Search,
  Check,
  BarChart3,
  MapPin,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
  Database,
  Radio,
  Lock,
  Terminal,
  RotateCcw,
  GitBranch,
  Sliders,
  CheckCheck,
  Boxes,
  Upload,
  FileUp,
  Zap,
  Globe
} from 'lucide-react';
import {
  BranchLocation,
  CentralUpdatePackage,
  BranchSyncAuditRecord,
  SystemUser,
  RatesConfig,
  ExpenseConcept,
  ExpenseCategory,
  VehicleCategoryConfig,
  SoftwareReleaseBuild,
  ParkingBusinessInfo
} from '../types';
import { ServerDataConfigCard } from './ServerDataConfigCard';
import { SyncDomainManager } from './SyncDomainManager';
import {
  getSyncMasterPolicy,
  buildFilteredCentralPackage,
  SyncMasterPolicyConfig
} from '../services/syncDomainRegistry';
import {
  fetchCentralSoftwareReleases,
  dispatchCentralSoftwareRelease,
  uploadNewSoftwareRelease,
  dispatchLiveServerVersion,
  fetchLiveServerVersion,
  fetchCentralGlobalVersion,
  publishCentralGlobalVersion,
  fetchBranchesOperations
} from '../services/centralSyncService';
import { parseAndIncrementVersion } from '../utils/versionUtils';
import { formatDateTimeNice } from './SoftwareUpdaterModal';
import { CentralDashboard } from './CentralDashboard';

interface CentralHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SystemUser;
  branches: BranchLocation[];
  centralPackages: CentralUpdatePackage[];
  syncLogs: BranchSyncAuditRecord[];
  currentRates?: RatesConfig;
  expenseConcepts?: ExpenseConcept[];
  expenseCategories?: ExpenseCategory[];
  vehicleCategories?: VehicleCategoryConfig[];
  users?: SystemUser[];
  businessInfo?: ParkingBusinessInfo;
  onSaveRates?: (rates: RatesConfig) => void;
  onSaveBusinessInfo?: (info: ParkingBusinessInfo) => void;
  onPublishPackage: (pkg: any) => Promise<void>;
  onForceSyncBranch?: (branchId: string) => Promise<void>;
  onForceSyncAllBranches?: () => Promise<void>;
  onSwitchBranch?: (branchId: string) => void;
  onSaveNewBranch: (branch: any) => Promise<void>;
  embedded?: boolean;
  initialTab?: 'branches' | 'telemetry_dashboard' | 'global_version' | 'ota_releases' | 'sync_domains' | 'analytics' | 'network_logs' | 'server_config';
  onOpenWorkModeConfig?: () => void;
}

export const CentralHubModal: React.FC<CentralHubModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  branches,
  centralPackages,
  syncLogs,
  currentRates,
  expenseConcepts = [],
  expenseCategories = [],
  vehicleCategories = [],
  users = [],
  businessInfo,
  onSaveRates,
  onSaveBusinessInfo,
  onPublishPackage,
  onForceSyncBranch,
  onForceSyncAllBranches,
  onSwitchBranch,
  onSaveNewBranch,
  embedded = false,
  initialTab = 'branches',
  onOpenWorkModeConfig
}) => {
  const [activeTab, setActiveTab] = useState<'branches' | 'telemetry_dashboard' | 'global_version' | 'ota_releases' | 'sync_domains' | 'analytics' | 'network_logs' | 'server_config'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all');
  const [selectedBranchForDetail, setSelectedBranchForDetail] = useState<BranchLocation | null>(null);

  // Estados para Publicación Manual de Versión de Globales
  const [activeGlobalVer, setActiveGlobalVer] = useState<string>('G-1.0.0');
  const [activeGlobalPublishedAt, setActiveGlobalPublishedAt] = useState<string>('');
  const [globalHistory, setGlobalHistory] = useState<any[]>([]);
  const [isPublishingGlobal, setIsPublishingGlobal] = useState<boolean>(false);
  const [globalPublishSuccess, setGlobalPublishSuccess] = useState<string | null>(null);

  // Formulario para Nueva Versión de Globales
  const [newGlobalVersionCode, setNewGlobalVersionCode] = useState<string>('G-1.0.1');
  const [newGlobalDescription, setNewGlobalDescription] = useState<string>('Actualización de Tarifas generales, Cajeros autorizados y Parámetros comerciales');
  const [newGlobalTargetScope, setNewGlobalTargetScope] = useState<'all' | 'specific'>('all');
  const [newGlobalSelectedBranchIds, setNewGlobalSelectedBranchIds] = useState<string[]>([]);
  
  // Tarifas configurables para la nueva versión de Globales
  const [editCarMinuteRate, setEditCarMinuteRate] = useState<number>(currentRates?.car?.minuteRate || currentRates?.minuteRate || 70);
  const [editCarHourRate, setEditCarHourRate] = useState<number>(currentRates?.car?.hourRate || currentRates?.hourRate || 4200);
  const [editCarDayRate, setEditCarDayRate] = useState<number>(currentRates?.car?.dayRate || currentRates?.dayRate || 25000);
  const [editMotoMinuteRate, setEditMotoMinuteRate] = useState<number>(currentRates?.motorcycle?.minuteRate || 35);
  const [editMotoHourRate, setEditMotoHourRate] = useState<number>(currentRates?.motorcycle?.hourRate || 2100);
  const [editMotoDayRate, setEditMotoDayRate] = useState<number>(currentRates?.motorcycle?.dayRate || 14000);
  const [editGracePeriod, setEditGracePeriod] = useState<number>(currentRates?.gracePeriodMinutes || 15);
  const [editLostTicketFee, setEditLostTicketFee] = useState<number>(currentRates?.lostTicketFee || 15000);

  // Parámetros comerciales editables
  const [editBusinessName, setEditBusinessName] = useState<string>(businessInfo?.name || 'WolfZone Parking System');
  const [editBusinessNit, setEditBusinessNit] = useState<string>(businessInfo?.nit || '901.849.204-1');
  const [editBusinessPhone, setEditBusinessPhone] = useState<string>(businessInfo?.phone || '+57 (601) 745-8890');
  const [editBusinessAddress, setEditBusinessAddress] = useState<string>(businessInfo?.address || 'Av. Principal #45-12, Bogotá');

  const loadCentralGlobalStatus = async () => {
    try {
      const res = await fetchCentralGlobalVersion();
      if (res && res.success && res.data?.activeVersion) {
        setActiveGlobalVer(res.data.activeVersion);
        if (res.data.publishedAt) {
          setActiveGlobalPublishedAt(res.data.publishedAt);
        }
        setGlobalHistory(res.data.history || []);
        const incResult = parseAndIncrementVersion(res.data.activeVersion.replace('G-', 'v'));
        setNewGlobalVersionCode(incResult.nextPatchVersion.replace('v', 'G-').replace('-enterprise', ''));
      }
    } catch (e) {
      console.warn('[CentralHubModal] Error cargando versión de globales:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCentralGlobalStatus();
    }
  }, [isOpen]);

  const handlePublishNewGlobalVersion = async () => {
    if (!newGlobalVersionCode.trim()) return;
    setIsPublishingGlobal(true);
    setGlobalPublishSuccess(null);

    try {
      const updatedRates: RatesConfig = {
        ...(currentRates || {} as RatesConfig),
        minuteRate: editCarMinuteRate,
        hourRate: editCarHourRate,
        dayRate: editCarDayRate,
        gracePeriodMinutes: editGracePeriod,
        lostTicketFee: editLostTicketFee,
        car: {
          minuteRate: editCarMinuteRate,
          hourRate: editCarHourRate,
          dayRate: editCarDayRate,
          gracePeriodMinutes: editGracePeriod,
          minimumChargeMinutes: currentRates?.car?.minimumChargeMinutes || editGracePeriod,
          lostTicketFee: editLostTicketFee,
        },
        motorcycle: {
          minuteRate: editMotoMinuteRate,
          hourRate: editMotoHourRate,
          dayRate: editMotoDayRate,
          gracePeriodMinutes: editGracePeriod,
          minimumChargeMinutes: currentRates?.motorcycle?.minimumChargeMinutes || editGracePeriod,
          lostTicketFee: editLostTicketFee,
        }
      };

      const updatedBusinessInfo: Partial<ParkingBusinessInfo> = {
        name: editBusinessName,
        nit: editBusinessNit,
        phone: editBusinessPhone,
        address: editBusinessAddress
      };

      const payload = {
        version: newGlobalVersionCode.trim(),
        title: `Actualización de Globales ${newGlobalVersionCode.trim()}`,
        description: newGlobalDescription.trim(),
        publishedBy: currentUser.name,
        targetScope: newGlobalTargetScope,
        targetBranchIds: newGlobalTargetScope === 'specific' ? newGlobalSelectedBranchIds : undefined,
        rates: updatedRates,
        users: users || [],
        expenseConcepts: expenseConcepts || [],
        parameters: updatedBusinessInfo
      };

      const result = await publishCentralGlobalVersion(payload);
      if (result.success) {
        const publishedDateIso = result.data?.publishedAt || new Date().toISOString();
        setActiveGlobalVer(newGlobalVersionCode.trim());
        setActiveGlobalPublishedAt(publishedDateIso);
        setGlobalPublishSuccess(`✅ ¡Versión de Globales ${newGlobalVersionCode} publicada exitosamente el ${formatDateTimeNice(publishedDateIso)}! Las sucursales ya pueden descargar y aplicar los nuevos precios y parámetros.`);
        if (onSaveRates) onSaveRates(updatedRates);
        if (onSaveBusinessInfo && businessInfo) {
          onSaveBusinessInfo({ ...businessInfo, ...updatedBusinessInfo });
        }
        await loadCentralGlobalStatus();
      }
    } catch (e: any) {
      console.error('[CentralHubModal] Error publicando Globales:', e);
    } finally {
      setIsPublishingGlobal(false);
    }
  };

  // State for OTA Software Release Dispatcher (Manual Control)
  const [otaReleases, setOtaReleases] = useState<SoftwareReleaseBuild[]>([]);
  const [selectedOtaReleaseId, setSelectedOtaReleaseId] = useState<string>('rel-enterprise-250');
  const [otaScope, setOtaScope] = useState<'all' | 'specific'>('all');
  const [otaSelectedBranchIds, setOtaSelectedBranchIds] = useState<string[]>([]);
  const [otaAuthorizedBetaBranches, setOtaAuthorizedBetaBranches] = useState<string[]>([]);
  const [otaChangelogNotes, setOtaChangelogNotes] = useState<string>('Compilación oficial y parches validados desde el Servidor Central.');
  const [isDispatchingOta, setIsDispatchingOta] = useState(false);
  const [serverGitInfo, setServerGitInfo] = useState<{
    version?: string;
    buildNumber?: number;
    commit?: { hash: string; shortHash: string; message: string; date: string };
    serverTime?: string;
  } | null>(null);

  // State for Upload / Register New Software Release Build
  const [isUploadReleaseModalOpen, setIsUploadReleaseModalOpen] = useState(false);
  const [newRelVersion, setNewRelVersion] = useState('v2.5.1-enterprise');
  const [newRelBuildNumber, setNewRelBuildNumber] = useState<number>(251);
  const [newRelTitle, setNewRelTitle] = useState('Parche de Seguridad & Facturación DIAN');
  const [newRelDescription, setNewRelDescription] = useState('Nueva compilación con soporte de facturación electrónica DIAN y optimización de base de datos.');
  const [newRelChannel, setNewRelChannel] = useState<'enterprise' | 'stable' | 'beta'>('enterprise');
  const [newRelDownloadSize, setNewRelDownloadSize] = useState('19.4 MB');
  const [newRelModulesInput, setNewRelModulesInput] = useState('Facturación DIAN v2, Control de Cierres Remotos, Optimización Cache');
  const [newRelChangelogInput, setNewRelChangelogInput] = useState('Resolución DIAN 000165 integrada\nOptimización de sincronización offline con SQLite\nMejoras en el tiempo de impresión de tickets POS');
  const [newRelDbMigration, setNewRelDbMigration] = useState(false);
  const [newRelAutoDispatch, setNewRelAutoDispatch] = useState(true);
  const [newRelFileName, setNewRelFileName] = useState<string>('');
  const [isUploadingRelease, setIsUploadingRelease] = useState(false);

  const handleUploadRelease = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newRelVersion.trim() || !newRelTitle.trim()) {
      alert('Por favor especifica al menos la versión y el título del paquete.');
      return;
    }

    setIsUploadingRelease(true);
    setActionFeedback(`Montando versión ${newRelVersion} en el Servidor Central...`);

    const modules = newRelModulesInput
      .split(',')
      .map(m => m.trim())
      .filter(Boolean);

    const changelog = newRelChangelogInput
      .split('\n')
      .map(c => c.trim())
      .filter(Boolean);

    const res = await uploadNewSoftwareRelease({
      version: newRelVersion.trim(),
      buildNumber: Number(newRelBuildNumber) || 251,
      title: newRelTitle.trim(),
      description: newRelDescription.trim(),
      channel: newRelChannel,
      downloadSize: newRelDownloadSize.trim() || '18.5 MB',
      newModules: modules.length > 0 ? modules : ['Actualizaciones de Estabilidad y Despliegue Central'],
      changelog: changelog.length > 0 ? changelog : ['Nuevas optimizaciones de rendimiento y compatibilidad multi-sede.'],
      databaseMigrationRequired: newRelDbMigration,
      autoDispatch: newRelAutoDispatch,
      targetScope: otaScope,
      targetBranchIds: otaScope === 'specific' ? otaSelectedBranchIds : branches.map(b => b.id),
      fileName: newRelFileName || `${newRelVersion.trim()}-release.bundle`
    });

    setIsUploadingRelease(false);
    if (res.success) {
      setActionFeedback(`¡Versión ${newRelVersion} montada con éxito en el Servidor Central!`);
      setIsUploadReleaseModalOpen(false);
      await loadCentralOtaReleases();
    } else {
      setActionFeedback(`Error al montar versión: ${res.message}`);
    }
  };

  // State for Live Server Version Instant Dispatch with Auto-Consecutive Naming
  const [liveScope, setLiveScope] = useState<'all' | 'specific'>('all');
  const [liveSelectedBranchIds, setLiveSelectedBranchIds] = useState<string[]>([]);
  const [liveUpdateType, setLiveUpdateType] = useState<'patch' | 'minor' | 'custom'>('patch');
  const [liveCustomTagInput, setLiveCustomTagInput] = useState('');
  const [liveNotes, setLiveNotes] = useState('');
  const [isDispatchingLive, setIsDispatchingLive] = useState(false);

  // Auto-Consecutive Version Calculations
  const currentBaseVersion = serverGitInfo?.version || (otaReleases[0]?.version) || 'v2.5.0-enterprise';
  const currentBaseBuild = serverGitInfo?.buildNumber || (otaReleases[0]?.buildNumber) || 250;
  const versionCalc = parseAndIncrementVersion(currentBaseVersion, currentBaseBuild);

  const targetDispatchVersionTag = liveUpdateType === 'patch'
    ? versionCalc.nextPatchVersion
    : liveUpdateType === 'minor'
    ? versionCalc.nextMinorVersion
    : (liveCustomTagInput.trim() || versionCalc.nextPatchVersion);

  const targetDispatchBuildNumber = liveUpdateType === 'patch'
    ? versionCalc.nextPatchBuildNumber
    : liveUpdateType === 'minor'
    ? versionCalc.nextMinorBuildNumber
    : (versionCalc.nextPatchBuildNumber);

  const handleDispatchLiveServerNow = async () => {
    if (liveScope === 'specific' && liveSelectedBranchIds.length === 0) {
      alert('Por favor selecciona al menos una sucursal destino para el despacho.');
      return;
    }

    setIsDispatchingLive(true);
    setActionFeedback(`Capturando compilación en vivo y despachando versión ${targetDispatchVersionTag} a la red...`);

    const defaultNotes = [
      `Despacho de versión ${targetDispatchVersionTag} (${liveUpdateType === 'minor' ? 'Nuevos Módulos / Archivos' : 'Parche / Cambios en Archivos Existentes'}).`,
      `Commit Git: [${serverGitInfo?.commit?.shortHash || 'master'}] ${serverGitInfo?.commit?.message || 'Versión de producción'}`,
      `Autorizado y despachado por ${currentUser.name} (${currentUser.role}).`
    ];

    const userNotes = liveNotes.trim()
      ? liveNotes.split('\n').map(n => n.trim()).filter(Boolean)
      : [];

    const finalChangelog = [...userNotes, ...defaultNotes];

    const titlePrefix = liveUpdateType === 'minor'
      ? '🚀 Nuevos Módulos & Archivos en Proyecto'
      : liveUpdateType === 'patch'
      ? '⚙️ Parche de Estabilidad & Modificación de Archivos'
      : '📦 Compilación Especial Despachada';

    const res = await dispatchLiveServerVersion({
      targetScope: liveScope,
      targetBranchIds: liveScope === 'specific' ? liveSelectedBranchIds : branches.map(b => b.id),
      changelogNotes: finalChangelog,
      dispatchedBy: `${currentUser.name} (${currentUser.role})`,
      customVersion: targetDispatchVersionTag,
      customBuildNumber: targetDispatchBuildNumber,
      customTitle: `${titlePrefix} (${targetDispatchVersionTag})`
    });

    setIsDispatchingLive(false);
    if (res.success) {
      setActionFeedback(`¡Versión ${targetDispatchVersionTag} despachada con éxito a ${liveScope === 'all' ? 'todas las sucursales' : `${liveSelectedBranchIds.length} sucursales seleccionadas`}!`);
      setLiveNotes('');
      await loadCentralOtaReleases();
    } else {
      setActionFeedback(`Error al despachar versión en vivo: ${res.message}`);
    }
  };

  const loadCentralOtaReleases = async () => {
    try {
      const [relRes, gitRes] = await Promise.all([
        fetchCentralSoftwareReleases(),
        fetchLiveServerVersion()
      ]);
      if (relRes.success && Array.isArray(relRes.releases)) {
        setOtaReleases(relRes.releases);
        setOtaAuthorizedBetaBranches(relRes.authorizedBetaBranches || []);
        if (relRes.activeReleaseId) {
          setSelectedOtaReleaseId(relRes.activeReleaseId);
        }
      }
      if (gitRes && gitRes.success) {
        setServerGitInfo(gitRes);
      }
    } catch (e) {
      console.warn('[CentralHub] Error cargando software releases:', e);
    }
  };

  React.useEffect(() => {
    loadCentralOtaReleases();
  }, []);

  const handleDispatchOta = async (releaseIdToDispatch?: string) => {
    const targetRelId = releaseIdToDispatch || selectedOtaReleaseId;
    const targetRel = otaReleases.find(r => r.id === targetRelId) || otaReleases[0];
    if (!targetRel) return;

    setIsDispatchingOta(true);
    setActionFeedback(`Despachando versión ${targetRel.version} a la red...`);

    const res = await dispatchCentralSoftwareRelease({
      releaseId: targetRel.id,
      version: targetRel.version,
      targetScope: otaScope,
      targetBranchIds: otaScope === 'specific' ? otaSelectedBranchIds : branches.map(b => b.id),
      dispatchedBy: currentUser.name || 'Administrador Central',
      changelog: otaChangelogNotes ? [otaChangelogNotes, ...targetRel.changelog] : targetRel.changelog,
      newModules: targetRel.newModules,
      allowBetaForBranches: otaAuthorizedBetaBranches
    });

    setIsDispatchingOta(false);
    if (res.success) {
      setActionFeedback(`¡Versión ${targetRel.version} despachada con éxito! Las sucursales ya pueden descargarla desde el módulo OTA.`);
      await loadCentralOtaReleases();
    } else {
      setActionFeedback(`Aviso al despachar: ${res.message}`);
    }
  };
  
  // State for Create New Branch Modal
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [newBranchCode, setNewBranchCode] = useState(`SUC-00${branches.length + 1}`);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCity, setNewBranchCity] = useState('Bogotá D.C.');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [newBranchManager, setNewBranchManager] = useState('');
  const [newBranchIp, setNewBranchIp] = useState('192.168.10.100');
  const [newBranchSpots, setNewBranchSpots] = useState(40);
  const [newBranchNotes, setNewBranchNotes] = useState('');

  // Status feedback
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Financial and Telemetry Aggregations
  const totalBranchesCount = branches.length;
  const onlineBranchesCount = branches.filter(b => b.status === 'online').length;
  const warningBranchesCount = branches.filter(b => b.status === 'warning').length;
  const offlineBranchesCount = branches.filter(b => b.status === 'offline').length;
  const totalGlobalRevenue = branches.reduce((acc, b) => acc + (b.todayRevenue || 0), 0);
  const totalGlobalVehicles = branches.reduce((acc, b) => acc + (b.todayVehicles || 0), 0);
  const totalGlobalSpots = branches.reduce((acc, b) => acc + (b.totalSpots || 0), 0);
  const totalOccupiedSpots = branches.reduce((acc, b) => acc + (b.occupiedSpots || 0), 0);
  const globalOccupancyRate = totalGlobalSpots > 0 ? Math.round((totalOccupiedSpots / totalGlobalSpots) * 100) : 0;

  // Filter branches
  const filteredBranches = branches.filter(branch => {
    const matchesSearch = 
      branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branch.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branch.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branch.managerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCityFilter === 'all' || branch.city === selectedCityFilter;
    return matchesSearch && matchesCity;
  });

  const uniqueCities = Array.from(new Set(branches.map(b => b.city)));

  const handleBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim() || !newBranchCode.trim()) {
      setActionFeedback('⚠️ Código y nombre de sucursal son obligatorios.');
      return;
    }

    setIsProcessing(true);
    try {
      await onSaveNewBranch({
        code: newBranchCode.trim().toUpperCase(),
        name: newBranchName.trim(),
        city: newBranchCity,
        address: newBranchAddress.trim() || 'Dirección de la sucursal',
        phone: newBranchPhone.trim() || '(601) 000-0000',
        managerName: newBranchManager.trim() || 'Administrador de Sede',
        status: 'online',
        ipAddress: newBranchIp.trim(),
        currentAppVersion: 'v2.5.0-enterprise',
        totalSpots: Number(newBranchSpots) || 30,
        notes: newBranchNotes.trim()
      });

      setIsCreatingBranch(false);
      setActionFeedback(`✅ Sucursal "${newBranchName}" registrada y vinculada a la red central.`);
    } catch (err: any) {
      setActionFeedback(`❌ Error al crear sucursal: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleForceGlobalSync = async () => {
    setIsProcessing(true);
    try {
      await onForceSyncAllBranches();
      setActionFeedback('✅ Sincronización global completada. Se recibieron las métricas de todas las sedes activas.');
    } catch (err: any) {
      setActionFeedback(`❌ Error al sincronizar red: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBranchSyncSingle = async (branchId: string, branchName: string) => {
    setIsProcessing(true);
    try {
      await onForceSyncBranch(branchId);
      setActionFeedback(`✅ Sincronización completada con "${branchName}". Datos actualizados.`);
    } catch (err: any) {
      setActionFeedback(`❌ Error al sincronizar con sede: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportFinancialConsolidationCsv = () => {
    const headers = ['Codigo Sede', 'Nombre Sede', 'Ciudad', 'Estado Red', 'Plazas Ocupadas', 'Total Plazas', 'Ocupacion %', 'Vehiculos Hoy', 'Recaudo Hoy (COP)', 'Turno Activo', 'Cajero en Turno', 'Ultima Sync'];
    const rows = branches.map(b => {
      const occPct = b.totalSpots > 0 ? Math.round((b.occupiedSpots / b.totalSpots) * 100) : 0;
      return [
        `"${b.code}"`,
        `"${b.name}"`,
        `"${b.city}"`,
        `"${b.status}"`,
        b.occupiedSpots,
        b.totalSpots,
        `"${occPct}%"`,
        b.todayVehicles,
        b.todayRevenue,
        b.activeShiftNumber,
        `"${b.currentCashier}"`,
        `"${new Date(b.lastSyncTimestamp).toLocaleString()}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CONSOLIDADO_NACIONAL_SUCURSALES_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSyncLogsToCSV = () => {
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

    const rows = syncLogs.map(log => {
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
    link.setAttribute('download', `auditoria_sincronizacion_consolidadas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full animate-in fade-in duration-150" : "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-hidden animate-in fade-in duration-200"}>
      <div className={embedded ? "bg-white border border-slate-200 w-full rounded-2xl shadow-xl flex flex-col overflow-hidden text-slate-900" : "bg-white border border-slate-200 w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900"}>
        
        {/* Header Consola Servidor Central */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700 shadow-inner">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-950 tracking-tight">
                  Servidor Central & Red Multi-Sucursal
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-900 border border-amber-500/30 font-bold">
                  <Activity className="w-3 h-3 animate-pulse" />
                  Hub Matriz Nacional
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Consola de control unificado: monitoreo de sedes, consolidación contable y despacho remoto de precios y parámetros.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleForceGlobalSync}
              disabled={isProcessing}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
              title="Solicitar actualización de estado a todas las sucursales conectadas"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${isProcessing ? 'animate-spin' : ''}`} />
              Sincronizar Red
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global KPI Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-slate-600 text-[11px] font-medium">
              <span>Sedes en Red</span>
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-slate-950 font-mono">{totalBranchesCount}</span>
              <span className="text-[10px] text-emerald-700 font-mono font-bold">({onlineBranchesCount} online)</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-slate-600 text-[11px] font-medium">
              <span>Recaudo Global Hoy</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="mt-1">
              <span className="text-base sm:text-lg font-bold text-emerald-700 font-mono">
                ${totalGlobalRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-slate-600 text-[11px] font-medium">
              <span>Vehículos Atendidos</span>
              <Car className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="mt-1">
              <span className="text-lg font-bold text-slate-950 font-mono">{totalGlobalVehicles}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-slate-600 text-[11px] font-medium">
              <span>Ocupación Global</span>
              <Activity className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-slate-950 font-mono">{globalOccupancyRate}%</span>
              <span className="text-[10px] text-slate-600 font-mono font-bold">({totalOccupiedSpots}/{totalGlobalSpots})</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-slate-600 text-[11px] font-medium">
              <span>Paquetes Activos</span>
              <Package className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <div className="mt-1">
              <span className="text-lg font-bold text-sky-700 font-mono">{centralPackages.length}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-slate-600 text-[11px] font-medium">
              <span>Estado Conexión</span>
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs font-bold text-emerald-800 font-mono">Enlace Matriz OK</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-100 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
            <button
              type="button"
              id="central-tab-branches"
              aria-selected={activeTab === 'branches'}
              onClick={() => setActiveTab('branches')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer border ${
                activeTab === 'branches'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md font-black'
                  : 'bg-white text-slate-700 border-slate-200 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${activeTab === 'branches' ? 'text-white' : 'text-blue-700'}`} />
              <span>Gestión de Sucursales ({branches.length})</span>
              {activeTab === 'branches' && (
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping shrink-0" />
              )}
            </button>

            <button
              type="button"
              id="central-tab-telemetry"
              aria-selected={activeTab === 'telemetry_dashboard'}
              onClick={() => setActiveTab('telemetry_dashboard')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer border ${
                activeTab === 'telemetry_dashboard'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md font-black'
                  : 'bg-white text-slate-700 border-slate-200 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${activeTab === 'telemetry_dashboard' ? 'text-white' : 'text-indigo-600'}`} />
              <span>Mapa & Telemetría en Vivo</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </button>

            <button
              type="button"
              id="central-tab-global-version"
              aria-selected={activeTab === 'global_version'}
              onClick={() => {
                setActiveTab('global_version');
                loadCentralGlobalStatus();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer border ${
                activeTab === 'global_version'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 border-amber-500 shadow-md font-black'
                  : 'bg-white text-slate-700 border-slate-200 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <Globe className={`w-3.5 h-3.5 ${activeTab === 'global_version' ? 'text-slate-950' : 'text-amber-700'}`} />
              <span>Versión de Globales (Tarifas/Usuarios)</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'global_version' ? 'bg-slate-950 text-amber-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {activeGlobalVer}
              </span>
            </button>

            <button
              type="button"
              id="central-tab-ota-releases"
              aria-selected={activeTab === 'ota_releases'}
              onClick={() => {
                setActiveTab('ota_releases');
                loadCentralOtaReleases();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer border ${
                activeTab === 'ota_releases'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md font-black'
                  : 'bg-white text-slate-700 border-slate-200 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'ota_releases' ? 'text-white' : 'text-blue-700'}`} />
              <span>Versión del Sistema / Software (OTA)</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'ota_releases' ? 'bg-white text-blue-900' : 'bg-blue-100 text-blue-900 border border-blue-300'
              }`}>
                MANUAL
              </span>
            </button>

            <button
              type="button"
              id="central-tab-sync-domains"
              aria-selected={activeTab === 'sync_domains'}
              onClick={() => setActiveTab('sync_domains')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer border ${
                activeTab === 'sync_domains'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md font-black'
                  : 'bg-white text-slate-700 border-slate-200 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <Layers className={`w-3.5 h-3.5 ${activeTab === 'sync_domains' ? 'text-white' : 'text-purple-700'}`} />
              <span>Matriz de Sincronización</span>
            </button>

            <button
              type="button"
              id="central-tab-analytics"
              aria-selected={activeTab === 'analytics'}
              onClick={() => setActiveTab('analytics')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer border ${
                activeTab === 'analytics'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-md font-black'
                  : 'bg-white text-slate-700 border-slate-200 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className={`w-3.5 h-3.5 ${activeTab === 'analytics' ? 'text-white' : 'text-sky-700'}`} />
              <span>Consolidado Contable</span>
            </button>

            <button
              type="button"
              id="central-tab-network-logs"
              aria-selected={activeTab === 'network_logs'}
              onClick={() => setActiveTab('network_logs')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer border ${
                activeTab === 'network_logs'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md font-black'
                  : 'bg-white text-slate-700 border-slate-200 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 ${activeTab === 'network_logs' ? 'text-white' : 'text-emerald-700'}`} />
              <span>Telemetría y Logs</span>
            </button>

            <button
              type="button"
              id="central-tab-server-config"
              aria-selected={activeTab === 'server_config'}
              onClick={() => setActiveTab('server_config')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer border ${
                activeTab === 'server_config'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md font-black'
                  : 'bg-white text-slate-700 border-slate-200 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <Database className={`w-3.5 h-3.5 ${activeTab === 'server_config' ? 'text-white' : 'text-purple-700'}`} />
              <span>Servidor Local y Remoto</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'branches' && (
              <button
                type="button"
                onClick={() => setIsCreatingBranch(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-sm transition-colors whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Nueva Sucursal
              </button>
            )}
          </div>
        </div>

        {/* Action / Notification Feedback Banner */}
        {actionFeedback && (
          <div className="px-6 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 font-medium flex items-center justify-between">
            <span>{actionFeedback}</span>
            <button
              type="button"
              onClick={() => setActionFeedback(null)}
              className="text-amber-800 hover:text-slate-950 text-xs font-bold cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* ========================================================================= */}
          {/* TAB: MAPA & TELEMETRÍA EN VIVO (CENTRAL DASHBOARD) */}
          {/* ========================================================================= */}
          {activeTab === 'telemetry_dashboard' && (
            <div className="space-y-4">
              <CentralDashboard
                branches={branches}
                onSelectBranch={(branch) => {
                  setSelectedBranchForDetail(branch);
                }}
                isDarkMode={false}
                embedded={true}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: SUCURSALES Y MONITOREO DE RED */}
          {/* ========================================================================= */}
          {activeTab === 'branches' && (
            <div className="space-y-4">
              
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por sede, ciudad, código o director..."
                    className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                  <span className="text-xs text-slate-700 font-bold whitespace-nowrap">Ciudad:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCityFilter('all')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                      selectedCityFilter === 'all'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Todas ({branches.length})
                  </button>
                  {uniqueCities.map(city => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setSelectedCityFilter(city)}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                        selectedCityFilter === city
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                          : 'bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {city} ({branches.filter(b => b.city === city).length})
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of Branch Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBranches.map(branch => {
                  const occPct = branch.totalSpots > 0 ? Math.round((branch.occupiedSpots / branch.totalSpots) * 100) : 0;
                  const isCurrent = branch.isCurrentBranch;

                  return (
                    <div
                      key={branch.id}
                      className={`bg-white rounded-xl border p-4 flex flex-col justify-between transition-all hover:border-slate-300 hover:shadow-md ${
                        isCurrent 
                          ? 'border-amber-500 bg-amber-50/20 shadow-sm ring-1 ring-amber-500/30' 
                          : 'border-slate-200 shadow-2xs'
                      }`}
                    >
                      <div>
                        {/* Top Bar of Card */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-amber-800">
                                {branch.code}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                                  Sede Actual
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-bold text-slate-950 mt-1.5 line-clamp-1">{branch.name}</h3>
                            <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="line-clamp-1">{branch.city} • {branch.address}</span>
                            </div>
                          </div>

                          {/* Live Status Badge */}
                          <div className="shrink-0">
                            {branch.status === 'online' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                                Online
                              </span>
                            )}
                            {branch.status === 'warning' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-bold">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Alerta
                              </span>
                            )}
                            {branch.status === 'offline' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-300 font-bold">
                                <X className="w-3 h-3 text-rose-600" />
                                Offline
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Occupancy and Revenue Metrics */}
                        <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2.5">
                          <div>
                            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                              <span className="font-medium">Ocupación de Patio:</span>
                              <span className="font-mono font-bold text-slate-950">
                                {branch.occupiedSpots} / {branch.totalSpots} plazas ({occPct}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  occPct > 85 ? 'bg-red-500' : occPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(occPct, 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <div>
                              <span className="text-[10px] text-slate-500 block font-medium">Recaudo Hoy:</span>
                              <span className="font-mono font-bold text-emerald-700 text-sm">
                                ${branch.todayRevenue.toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block font-medium">Vehículos Hoy:</span>
                              <span className="font-mono font-bold text-slate-950 text-sm">
                                {branch.todayVehicles} veh.
                              </span>
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-600 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Cajero en Turno:</span>
                              <span className="text-slate-950 font-bold font-mono truncate max-w-[140px]">{branch.currentCashier}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Versión Globales:</span>
                              <span className={`font-mono font-bold text-[10px] px-1.5 py-0.2 rounded ${
                                !branch.installedGlobalVersion || branch.installedGlobalVersion === activeGlobalVer
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
                                {branch.installedGlobalVersion || 'G-1.0.0'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Versión Sistema (OTA):</span>
                              <span className="text-slate-800 font-mono font-bold">{branch.installedSoftwareVersion || branch.currentAppVersion || 'v2.6.0-enterprise'}</span>
                            </div>
                            {branch.financialShiftSummary?.consecutiveArqueo && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Último Arqueo:</span>
                                <span className="text-indigo-700 font-mono font-bold">{branch.financialShiftSummary.consecutiveArqueo}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Última Sincronización:</span>
                              <span className="text-amber-800 font-mono font-bold">
                                {new Date(branch.lastSyncTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          {branch.pendingUpdatesCount > 0 && (
                            <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-1.5 font-medium">
                              <Package className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span>{branch.pendingUpdatesCount} paquete(s) pendiente(s) por descargar.</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleBranchSyncSingle(branch.id, branch.name)}
                          disabled={isProcessing}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Forzar actualización de datos con esta sede"
                        >
                          <RefreshCw className="w-3 h-3 text-amber-700" />
                          Ping Sync
                        </button>

                        {!isCurrent ? (
                          <button
                            type="button"
                            onClick={() => onSwitchBranch(branch.id)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                          >
                            <span>Conmutar a esta Sede</span>
                            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-amber-800 flex items-center gap-1 font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                            Terminal Activa
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2.2: PUBLICACIÓN MANUAL DE VERSIÓN DE GLOBALES (TARIFAS, USUARIOS, PARÁMETROS) */}
          {/* ========================================================================= */}
          {activeTab === 'global_version' && (
            <div className="space-y-6">
              {/* Header Info & Central Status */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Gestor y Publicador Manual de Versiones de Globales
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-bold">
                          Versión Activa Central: {activeGlobalVer}
                        </span>
                        {activeGlobalPublishedAt && (
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            Publicada el: <strong>{formatDateTimeNice(activeGlobalPublishedAt)}</strong>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        Define cambios de precios, nuevos usuarios/cajeros y parámetros del sistema para despacharlos a las sucursales.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={loadCentralGlobalStatus}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                      <span>Refrescar Estado</span>
                    </button>
                  </div>
                </div>

                {globalPublishSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{globalPublishSuccess}</span>
                  </div>
                )}
              </div>

              {/* Formulario de Creación y Publicación de Nueva Versión */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-amber-500" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Publicar Nueva Versión de Globales a Sucursales
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    Publicación Manual con Control de Versiones
                  </span>
                </div>

                {/* Identificación de la Versión */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Código de Versión (Ej: G-1.0.1):
                    </label>
                    <input
                      type="text"
                      value={newGlobalVersionCode}
                      onChange={(e) => setNewGlobalVersionCode(e.target.value)}
                      placeholder="G-1.0.1"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Descripción del Paquete de Cambios:
                    </label>
                    <input
                      type="text"
                      value={newGlobalDescription}
                      onChange={(e) => setNewGlobalDescription(e.target.value)}
                      placeholder="Motivo del incremento o cambios en parámetros..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Alcance de Sucursales Destino */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Alcance de la Actualización:
                  </label>
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200 font-medium">
                      <input
                        type="radio"
                        name="globalScope"
                        checked={newGlobalTargetScope === 'all'}
                        onChange={() => setNewGlobalTargetScope('all')}
                        className="text-amber-500 focus:ring-amber-500"
                      />
                      <span>Todas las Sedes / Sucursales ({branches.length})</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200 font-medium">
                      <input
                        type="radio"
                        name="globalScope"
                        checked={newGlobalTargetScope === 'specific'}
                        onChange={() => setNewGlobalTargetScope('specific')}
                        className="text-amber-500 focus:ring-amber-500"
                      />
                      <span>Sucursal Específica</span>
                    </label>
                  </div>

                  {newGlobalTargetScope === 'specific' && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 pt-2">
                      {branches.map(b => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setNewGlobalSelectedBranchIds(prev => 
                              prev.includes(b.id) ? prev.filter(id => id !== b.id) : [...prev, b.id]
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer ${
                            newGlobalSelectedBranchIds.includes(b.id)
                              ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {b.code} - {b.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sub-Sección 1: Editor de Tarifas y Precios */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                    1. Tarifas y Precios de Parqueadero (COP)
                  </h5>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 font-medium block">Carro - Minuto:</span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          value={editCarMinuteRate}
                          onChange={(e) => setEditCarMinuteRate(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 font-medium block">Carro - Hora:</span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          value={editCarHourRate}
                          onChange={(e) => setEditCarHourRate(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 font-medium block">Moto - Minuto:</span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          value={editMotoMinuteRate}
                          onChange={(e) => setEditMotoMinuteRate(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 font-medium block">Moto - Hora:</span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          value={editMotoHourRate}
                          onChange={(e) => setEditMotoHourRate(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 font-medium block">Carro - Día / 24h:</span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          value={editCarDayRate}
                          onChange={(e) => setEditCarDayRate(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 font-medium block">Moto - Día / 24h:</span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          value={editMotoDayRate}
                          onChange={(e) => setEditMotoDayRate(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 font-medium block">Tiempo Gracia:</span>
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="number"
                          value={editGracePeriod}
                          onChange={(e) => setEditGracePeriod(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white"
                        />
                        <span className="text-slate-400 text-[10px]">min</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-500 font-medium block">Tiquete Perdido:</span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          value={editLostTicketFee}
                          onChange={(e) => setEditLostTicketFee(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-Sección 2: Parámetros Comerciales y Fiscales */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Sliders className="w-3.5 h-3.5 text-blue-500" />
                    2. Parámetros del Sistema y Datos Comerciales
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Nombre Comercial:</label>
                      <input
                        type="text"
                        value={editBusinessName}
                        onChange={(e) => setEditBusinessName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">NIT / Identificación:</label>
                      <input
                        type="text"
                        value={editBusinessNit}
                        onChange={(e) => setEditBusinessNit(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Teléfono Principal:</label>
                      <input
                        type="text"
                        value={editBusinessPhone}
                        onChange={(e) => setEditBusinessPhone(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Dirección Matriz:</label>
                      <input
                        type="text"
                        value={editBusinessAddress}
                        onChange={(e) => setEditBusinessAddress(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-Sección 3: Usuarios y Perfiles Incluidos */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      3. Usuarios y Cajeros Empaquetados ({users.length})
                    </h5>
                    <span className="text-[11px] text-slate-500">Se sincronizan automáticamente con las terminales</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {users.map(u => (
                      <span key={u.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {u.name} ({u.role})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Botón de Publicación Manual */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Al despachar, se emitirá una señal WebSocket en vivo a todas las sedes conectadas y se registrará en la nube central.
                  </p>
                  <button
                    type="button"
                    onClick={handlePublishNewGlobalVersion}
                    disabled={isPublishingGlobal}
                    className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    <Send className={`w-3.5 h-3.5 ${isPublishingGlobal ? 'animate-bounce' : ''}`} />
                    <span>{isPublishingGlobal ? 'Publicando...' : `Publicar Versión ${newGlobalVersionCode}`}</span>
                  </button>
                </div>
              </div>

              {/* Estado de las Sucursales frente a Globales */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    Estado de Versión de Globales en Cada Sucursal
                  </h4>
                  <span className="text-xs text-slate-500">
                    Versión Oficial Vigente: <strong className="font-mono text-amber-500">{activeGlobalVer}</strong>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-mono text-[11px]">
                        <th className="py-2 px-3">Sede</th>
                        <th className="py-2 px-3">Ciudad</th>
                        <th className="py-2 px-3">Versión Globales & Aplicación</th>
                        <th className="py-2 px-3">Versión Sistema</th>
                        <th className="py-2 px-3">Estado</th>
                        <th className="py-2 px-3">Último Cierre / Arqueo</th>
                        <th className="py-2 px-3">Recaudo Hoy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {branches.map(b => {
                        const isUpToDate = !b.installedGlobalVersion || b.installedGlobalVersion === activeGlobalVer;
                        return (
                          <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                              {b.name} <span className="text-slate-400 font-mono text-[10px]">({b.code})</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{b.city}</td>
                            <td className="py-2.5 px-3 font-mono">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">{b.installedGlobalVersion || 'G-1.0.0'}</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                {b.installedGlobalAt ? `Aplicada: ${formatDateTimeNice(b.installedGlobalAt)}` : 'Versión base inicial'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">
                              {b.installedSoftwareVersion || b.currentAppVersion || 'v2.6.0-enterprise'}
                            </td>
                            <td className="py-2.5 px-3">
                              {isUpToDate ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  Al Día
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                                  Desactualizada
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {b.financialShiftSummary?.consecutiveArqueo ? (
                                <span>{b.financialShiftSummary.consecutiveArqueo} (Turno #{b.financialShiftSummary.shiftNumber})</span>
                              ) : (
                                <span>Turno #{b.activeShiftNumber}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              ${(b.todayRevenue || 0).toLocaleString()} COP
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Historial de Versiones Publicadas */}
              {globalHistory.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    Historial de Versiones de Globales Publicadas
                  </h4>
                  <div className="space-y-2">
                    {globalHistory.map((h, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-amber-500">{h.version}</span>
                            <span className="font-bold text-slate-900 dark:text-white">{h.description}</span>
                            {h.version === activeGlobalVer && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                                VIGENTE
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 block">
                            Publicado por: {h.author} • Alcance: {h.targetScope === 'all' ? 'Todas las sedes' : 'Sedes seleccionadas'}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 shrink-0">
                          {new Date(h.publishedAt).toLocaleString('es-CO')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2.5: DESPACHO MANUAL DE ACTUALIZACIONES OTA DE SOFTWARE */}
          {/* ========================================================================= */}
          {activeTab === 'ota_releases' && (
            <div className="space-y-6">
              
              {/* Header Info & Git Live Status Banner */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Centro de Despacho Manual de Actualizaciones (OTA)
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                          CONTROL CENTRAL
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200">
                        Autoriza y distribuye manualmente qué versiones y parches de código se envían a cada sucursal.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsUploadReleaseModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-md transition-all cursor-pointer font-sans"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Montar / Subir Nueva Versión</span>
                    </button>

                    <button
                      type="button"
                      onClick={loadCentralOtaReleases}
                      disabled={isDispatchingOta}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-amber-700 dark:text-amber-400 ${isDispatchingOta ? 'animate-spin' : ''}`} />
                      <span>Sincronizar Catálogo</span>
                    </button>
                  </div>
                </div>

                {/* Git and Server Status Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-900 text-xs">
                  <div className="bg-white dark:bg-slate-900/70 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-200 font-mono text-[11px]">Git Commit Servidor:</span>
                    <span className="text-amber-700 dark:text-amber-400 font-mono font-bold">
                      {serverGitInfo?.commit?.shortHash || 'v2.5.0-master'}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900/70 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-200 font-mono text-[11px]">Versión Compilada:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">
                      {serverGitInfo?.version || 'v2.5.0-enterprise'}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900/70 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-200 font-mono text-[11px]">Modo de Despliegue:</span>
                    <span className="text-sky-800 dark:text-sky-300 font-mono font-bold">
                      Manual Estricto
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 1: Despacho Directo de la Versión en Vivo del Servidor */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/50 rounded-xl p-5 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Despachar Versión en Vivo del Servidor Central</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-bold">
                          ACTIVA EN CALIENTE
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-700 dark:text-slate-200">
                        Envía a las sucursales exactamente la versión que está ejecutándose ahora mismo en este Servidor Central.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-lg">
                      {serverGitInfo?.version || 'v2.5.0-enterprise'}
                    </span>
                    <span className="text-slate-200 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                      Git: {serverGitInfo?.commit?.shortHash || 'master'}
                    </span>
                  </div>
                </div>

                {/* Auto Incremental Version Naming Selector */}
                <div className="bg-white dark:bg-slate-900/90 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                      <Zap className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      <span>Tipo de Cambio & Numeración Consecutiva de Versión</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-0.5 rounded-lg">
                      Siguiente Etiqueta: {targetDispatchVersionTag}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Choice 1: Patch */}
                    <button
                      type="button"
                      onClick={() => setLiveUpdateType('patch')}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        liveUpdateType === 'patch'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-amber-900">⚙️ Parche (Archivos Existentes)</span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                          {versionCalc.nextPatchVersion}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 leading-tight">
                        Aumenta el último número (ej. v2.5.0 → v2.5.1 → v2.5.2) cuando hay cambios o parches en archivos ya existentes.
                      </p>
                    </button>

                    {/* Choice 2: Minor */}
                    <button
                      type="button"
                      onClick={() => setLiveUpdateType('minor')}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        liveUpdateType === 'minor'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-emerald-900">🚀 Nuevo Módulo / Archivos</span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {versionCalc.nextMinorVersion}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 leading-tight">
                        Aumenta la versión menor (ej. v2.5.0 → v2.6.0 → v2.7.0) cuando se agregan nuevos archivos o módulos al proyecto.
                      </p>
                    </button>

                    {/* Choice 3: Custom */}
                    <button
                      type="button"
                      onClick={() => setLiveUpdateType('custom')}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        liveUpdateType === 'custom'
                          ? 'bg-sky-500/15 border-sky-500 text-sky-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-sky-900">✏️ Nombre Personalizado</span>
                        <span className="text-[10px] font-mono text-sky-700 font-bold">Manual</span>
                      </div>
                      <p className="text-[10px] text-slate-600 leading-tight">
                        Ingresa una etiqueta de versión personalizada manualmente si lo prefieres.
                      </p>
                    </button>
                  </div>

                  {/* Input for custom tag if selected */}
                  {liveUpdateType === 'custom' && (
                    <div className="space-y-1 pt-1">
                      <label className="text-[11px] font-bold text-sky-800 dark:text-sky-300 block">
                        Escribe la Etiqueta de la Versión:
                      </label>
                      <input
                        type="text"
                        value={liveCustomTagInput}
                        onChange={(e) => setLiveCustomTagInput(e.target.value)}
                        placeholder="ej. v2.5.5-enterprise"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-sky-500/50 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-sky-400"
                      />
                    </div>
                  )}

                  {/* Changelog Notes Input */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
                      <span>Log de Cambios (Changelog) enviado a las Sucursales:</span>
                      <span className="text-[10px] text-slate-700 dark:text-slate-200 font-normal">
                        * Un cambio por línea (las sucursales verán este log al recibir la versión)
                      </span>
                    </label>
                    <textarea
                      rows={3}
                      value={liveNotes}
                      onChange={(e) => setLiveNotes(e.target.value)}
                      placeholder="• Fix: Ajuste en la configuración de Vite para evitar bucles&#10;• Feat: Módulo ANPR con alertas sonoras y umbral de score&#10;• Parche de estabilidad en archivos existentes"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-500 font-mono focus:outline-hidden focus:border-amber-500 leading-relaxed"
                    />
                  </div>
                </div>

                {/* Scope Selection for Live Dispatch */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      ¿A qué sucursales deseas enviar la versión en vivo?
                    </span>
                    <div className="inline-flex rounded-lg bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setLiveScope('all')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          liveScope === 'all'
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Todas las sedes ({branches.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLiveScope('specific')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          liveScope === 'specific'
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Sucursales Específicas</span>
                      </button>
                    </div>
                  </div>

                  {/* Branch Checkboxes for Live Dispatch if Specific */}
                  {liveScope === 'specific' && (
                    <div className="bg-white dark:bg-slate-900/90 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          Selecciona las sedes que recibirán la versión en vivo:
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setLiveSelectedBranchIds(branches.map(b => b.id))}
                            className="text-[10px] text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer font-bold"
                          >
                            Seleccionar Todas
                          </button>
                          <span className="text-slate-600 dark:text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => setLiveSelectedBranchIds([])}
                            className="text-[10px] text-slate-700 dark:text-slate-200 hover:underline cursor-pointer"
                          >
                            Limpiar
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {branches.map(branch => {
                          const isChecked = liveSelectedBranchIds.includes(branch.id);
                          return (
                            <label
                              key={branch.id}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                isChecked
                                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-900 font-bold'
                                  : 'bg-white border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setLiveSelectedBranchIds(prev => [...prev, branch.id]);
                                  } else {
                                    setLiveSelectedBranchIds(prev => prev.filter(id => id !== branch.id));
                                  }
                                }}
                                className="rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-emerald-500 focus:ring-emerald-500"
                              />
                              <span className="font-mono font-semibold">{branch.name.split('-')[0]}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Live Dispatch Action Button */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800/80">
                    <div className="text-[11px] text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      <span>Las sucursales seleccionadas verán esta versión lista para descargar con Checksum oficial.</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleDispatchLiveServerNow}
                      disabled={isDispatchingLive || (liveScope === 'specific' && liveSelectedBranchIds.length === 0)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 cursor-pointer font-sans"
                    >
                      {isDispatchingLive ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Despachando a la Red...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 text-slate-950 fill-current" />
                          <span>⚡ Despachar Versión ({targetDispatchVersionTag}) a la Red Ahora</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Despachar del Catálogo Histórico */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-md">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
                  <Send className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Despachar Versión Específica del Catálogo / Histórico</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select Version */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                      1. Seleccionar Versión a Despachar *
                    </label>
                    <select
                      value={selectedOtaReleaseId}
                      onChange={(e) => setSelectedOtaReleaseId(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono"
                    >
                      {otaReleases.map(rel => (
                        <option key={rel.id} value={rel.id}>
                          {rel.version} — {rel.title} ({rel.channel.toUpperCase()})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-700 dark:text-slate-200 mt-1">
                      Elige el paquete compilado que las sucursales podrán descargar.
                    </p>
                  </div>

                  {/* Scope Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                      2. Alcance de Distribución *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOtaScope('all')}
                        className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                          otaScope === 'all'
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-950'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        Todas ({branches.length} sedes)
                      </button>

                      <button
                        type="button"
                        onClick={() => setOtaScope('specific')}
                        className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                          otaScope === 'specific'
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-950'
                        }`}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Sedes Específicas (Piloto)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Specific Branch selector if scope is specific */}
                {otaScope === 'specific' && (
                  <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                      Selecciona las sucursales autorizadas para recibir esta versión:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {branches.map(branch => {
                        const isChecked = otaSelectedBranchIds.includes(branch.id);
                        return (
                          <label
                            key={branch.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-amber-500/10 border-amber-500/50 text-amber-900 font-bold'
                                : 'bg-white border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setOtaSelectedBranchIds(prev => [...prev, branch.id]);
                                } else {
                                  setOtaSelectedBranchIds(prev => prev.filter(id => id !== branch.id));
                                }
                              }}
                              className="rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500"
                            />
                            <span className="font-mono font-semibold">{branch.name.split('-')[0]}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Beta / Experimental Channel Protection Configuration */}
                <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                      <span className="font-bold text-purple-200">
                        Protección de Versiones Beta / Experimentales (IA ANPR)
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/50 text-purple-800 dark:text-purple-300 border border-purple-700 font-bold">
                      SOLO INFORMATIVA POR DEFECTO
                    </span>
                  </div>
                  <p className="text-purple-800 dark:text-purple-300/80 text-[11px] leading-relaxed">
                    Las sucursales verán las versiones Beta únicamente como informativas y <strong className="text-slate-900 dark:text-white">tendrán deshabilitado el botón de descarga</strong> a menos que selecciones aquí sedes de prueba.
                  </p>
                  
                  <div className="pt-2 flex items-center gap-2">
                    <span className="text-[11px] text-purple-800 dark:text-purple-300 font-semibold">Sedes autorizadas para Beta:</span>
                    <span className="text-[11px] font-mono text-purple-200 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                      {otaAuthorizedBetaBranches.length === 0 ? 'Ninguna (Bloqueada al 100%)' : `${otaAuthorizedBetaBranches.length} sedes autorizadas`}
                    </span>
                  </div>
                </div>

                {/* Changelog Notes */}
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    3. Notas del Despacho y Registro de Cambios
                  </label>
                  <textarea
                    rows={2}
                    value={otaChangelogNotes}
                    onChange={(e) => setOtaChangelogNotes(e.target.value)}
                    placeholder="Describe los parches o nuevos módulos incluidos en este despacho..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                {/* Dispatch Button */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => handleDispatchOta()}
                    disabled={isDispatchingOta}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 shadow-lg transition-all disabled:opacity-50 cursor-pointer font-mono"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isDispatchingOta ? 'Despachando a la Red...' : '🚀 Despachar y Publicar Versión a Sucursales Ahora'}</span>
                  </button>
                </div>
              </div>

              {/* Releases Catalog List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    Catálogo de Versiones en el Servidor Central
                  </h4>
                  <span className="text-xs text-slate-700 dark:text-slate-200 font-mono">
                    {otaReleases.length} versiones registradas
                  </span>
                </div>

                <div className="space-y-3">
                  {otaReleases.map(rel => {
                    const isDispatched = rel.isOfficialDispatched;
                    const isBeta = rel.channel === 'beta' || rel.isExperimentalOnly;

                    return (
                      <div
                        key={rel.id}
                        className={`bg-white border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-2xs ${
                          isDispatched
                            ? 'border-emerald-500 bg-emerald-50/10'
                            : isBeta
                            ? 'border-purple-400 bg-purple-50/20'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              isDispatched
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                : isBeta
                                ? 'bg-purple-50 text-purple-800 border border-purple-300'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}>
                              {isDispatched ? 'DESPACHADA / AUTORIZADA' : isBeta ? 'BETA (PROTEGIDA)' : 'NO DESPACHADA'}
                            </span>
                            <span className="text-xs font-mono font-bold text-amber-800">{rel.version}</span>
                            <span className="text-xs font-bold text-slate-950">{rel.title}</span>
                          </div>

                          <p className="text-xs text-slate-600">{rel.description}</p>
                          
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                            <span>Tamaño: {rel.downloadSize}</span>
                            <span>•</span>
                            <span>Módulos: {(rel.newModules || []).join(', ')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOtaReleaseId(rel.id);
                              handleDispatchOta(rel.id);
                            }}
                            disabled={isDispatchingOta}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5 text-amber-700" />
                            <span>{isDispatched ? 'Actualizar Despacho' : 'Autorizar y Despachar'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: CONSOLIDADO CONTABLE Y ANALÍTICA GLOBAL */}
          {/* ========================================================================= */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              
              {/* Financial Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <div>
                    <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-emerald-700" />
                      Consolidado Financiero en Tiempo Real por Sucursal
                    </h3>
                    <p className="text-xs text-slate-600">
                      Métricas acumuladas de la jornada operativa recibidas desde cada terminal.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={exportFinancialConsolidationCsv}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    Descargar Tabla
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-800 uppercase font-mono text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Código / Sede</th>
                        <th className="py-3 px-4">Ciudad</th>
                        <th className="py-3 px-4 text-center">Estado</th>
                        <th className="py-3 px-4 text-right">Ocupación</th>
                        <th className="py-3 px-4 text-right">Vehículos</th>
                        <th className="py-3 px-4 text-right">Recaudo Hoy</th>
                        <th className="py-3 px-4 text-right">% Cuota</th>
                        <th className="py-3 px-4 text-right">Turno / Cajero</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {branches.map(branch => {
                        const occPct = branch.totalSpots > 0 ? Math.round((branch.occupiedSpots / branch.totalSpots) * 100) : 0;
                        const sharePct = totalGlobalRevenue > 0 ? Math.round((branch.todayRevenue / totalGlobalRevenue) * 100) : 0;

                        return (
                          <tr key={branch.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-950 font-sans">{branch.name}</div>
                              <div className="text-[10px] text-amber-800 font-mono font-bold">{branch.code}</div>
                            </td>
                            <td className="py-3 px-4 font-sans text-slate-700">{branch.city}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                branch.status === 'online' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' :
                                branch.status === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-300' :
                                'bg-rose-50 text-rose-800 border border-rose-300'
                              }`}>
                                {branch.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-slate-900 font-bold">
                              {branch.occupiedSpots}/{branch.totalSpots} ({occPct}%)
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900">
                              {branch.todayVehicles}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-700">
                              ${branch.todayRevenue.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-700">
                              {sharePct}%
                            </td>
                            <td className="py-3 px-4 text-right text-[11px] font-sans text-slate-700">
                              <div className="font-bold">T#{branch.activeShiftNumber}</div>
                              <div className="text-[10px] truncate max-w-[120px] text-slate-500">{branch.currentCashier}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                      <tr>
                        <td className="py-3 px-4 text-slate-950 font-sans" colSpan={3}>
                          TOTAL CONSOLIDADO NACIONAL ({branches.length} SEDES)
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-900">
                          {totalOccupiedSpots}/{totalGlobalSpots} ({globalOccupancyRate}%)
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-900">
                          {totalGlobalVehicles} veh.
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700 text-sm">
                          ${totalGlobalRevenue.toLocaleString()} COP
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">100%</td>
                        <td className="py-3 px-4"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Revenue Distribution Visual Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-xs">
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider font-mono">
                  Distribución Porcentual del Recaudo por Sede
                </h4>
                <div className="w-full bg-white dark:bg-slate-900 h-6 rounded-lg overflow-hidden flex border border-slate-200 dark:border-slate-800">
                  {branches.map((b, idx) => {
                    const share = totalGlobalRevenue > 0 ? (b.todayRevenue / totalGlobalRevenue) * 100 : 0;
                    if (share <= 0) return null;
                    const colors = ['bg-amber-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500'];
                    const color = colors[idx % colors.length];

                    return (
                      <div
                        key={b.id}
                        className={`${color} h-full flex items-center justify-center text-[10px] font-bold text-slate-950 truncate px-1`}
                        style={{ width: `${share}%` }}
                        title={`${b.name}: $${b.todayRevenue.toLocaleString()} (${Math.round(share)}%)`}
                      >
                        {share > 10 ? `${b.code} (${Math.round(share)}%)` : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: TELEMETRÍA Y LOGS DE RED */}
          {/* ========================================================================= */}
          {activeTab === 'network_logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    Bitácora de Sincronización y Eventos de Red
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-200">
                    Registro de eventos de transmisión entre el Servidor Central y las terminales de sucursal.
                  </p>
                </div>
                {(currentUser.role === 'master' || currentUser.role === 'supervisor' || currentUser.permissions?.canExportReports) && syncLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportSyncLogsToCSV}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    title="Exportar todos los registros de sincronización a CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                    <span>Exportar CSV</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {syncLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        log.direction === 'inbound_from_central'
                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                      }`}>
                        {log.direction === 'inbound_from_central' ? <Download className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">{log.branchName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                            {log.syncType}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mt-0.5">{log.summary}</p>
                        <div className="text-[10px] text-slate-700 dark:text-slate-200 font-mono mt-1">
                          Operador: <span className="text-slate-600 dark:text-slate-300">{log.operator}</span> • {log.itemsAffectedCount} registros procesados
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-mono text-slate-700 dark:text-slate-200 block">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                        <Check className="w-3 h-3" />
                        Completado OK
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: MATRIZ MODULAR DE DOMINIOS Y DESARROLLOS SINCRONIZABLES */}
          {/* ========================================================================= */}
          {activeTab === 'sync_domains' && (
            <div className="py-2">
              <SyncDomainManager
                branches={branches}
                currentUser={currentUser}
                onPublishMasterDirective={async (policy) => {
                  // Genera y despacha el paquete centralizado con los dominios activos
                  const masterPkg = buildFilteredCentralPackage(
                    'Directiva Maestra de Sincronización',
                    `Directiva con ${policy.domains.filter(d => d.enabled).length} dominios sincronizables activos.`,
                    'all',
                    [],
                    policy,
                    {
                      rates: currentRates,
                      vehicleCategories,
                      expenseConcepts,
                      expenseCategories,
                      users: [],
                      products: [],
                      warehouses: [],
                      agreements: [],
                      businessInfo: {
                        establishmentName: 'Central POS Master',
                        updatedAt: new Date().toISOString()
                      }
                    }
                  );
                  await onPublishPackage(masterPkg);
                }}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: SERVIDOR DE DATOS LOCAL Y REMOTO */}
          {/* ========================================================================= */}
          {activeTab === 'server_config' && (
            <div className="py-2 space-y-4">
              <ServerDataConfigCard />

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-500" />
                    Modo de Trabajo & Rol de Servidor de este Nodo
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                    Configure si esta máquina física opera como Servidor Central Matriz, Servidor Intermedio de Sucursal, o Taquilla POS Satélite.
                  </p>
                </div>
                {onOpenWorkModeConfig && (
                  <button
                    type="button"
                    onClick={onOpenWorkModeConfig}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
                  >
                    Abrir Modo de Trabajo & Nodo
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-800 dark:text-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Servidor Central Operativo • Conexión Cifrada SSL/TLS</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            Cerrar Consola
          </button>
        </div>

      </div>

      {/* SUBMODAL: CREAR NUEVA SUCURSAL */}
      {isCreatingBranch && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleBranchSubmit} className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Registrar Nueva Sucursal en Red</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingBranch(false)}
                className="p-1 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Código Único Sede *</label>
                <input
                  type="text"
                  required
                  value={newBranchCode}
                  onChange={(e) => setNewBranchCode(e.target.value)}
                  placeholder="SUC-006"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Ciudad *</label>
                <input
                  type="text"
                  required
                  value={newBranchCity}
                  onChange={(e) => setNewBranchCity(e.target.value)}
                  placeholder="Ej. Medellín, Cali, Bogotá..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Nombre Comercial de la Sede *</label>
              <input
                type="text"
                required
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="Ej. Sede Gran Estación / Sede Santa Fe"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Dirección Física</label>
              <input
                type="text"
                value={newBranchAddress}
                onChange={(e) => setNewBranchAddress(e.target.value)}
                placeholder="Calle 26 # 62-47"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Director / Administrador</label>
                <input
                  type="text"
                  value={newBranchManager}
                  onChange={(e) => setNewBranchManager(e.target.value)}
                  placeholder="Nombre del responsable"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Total Plazas Disponibles</label>
                <input
                  type="number"
                  min="1"
                  value={newBranchSpots}
                  onChange={(e) => setNewBranchSpots(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Teléfono</label>
                <input
                  type="text"
                  value={newBranchPhone}
                  onChange={(e) => setNewBranchPhone(e.target.value)}
                  placeholder="(601) 789-0000"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">IP / Host Local</label>
                <input
                  type="text"
                  value={newBranchIp}
                  onChange={(e) => setNewBranchIp(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreatingBranch(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Registrar Sede
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MONTAR / SUBIR NUEVA VERSIÓN DE SOFTWARE EN SERVIDOR CENTRAL */}
      {/* ========================================================================= */}
      {isUploadReleaseModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-50 dark:bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-amber-500/50 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Montar Nueva Versión en el Servidor Central</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                      OTA REPOSITORY
                    </span>
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-200">
                    Registra o sube el paquete compilado para que quede disponible para despacho a las sucursales.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsUploadReleaseModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUploadRelease} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
              
              {/* File Upload Zone (Drag and Drop / Select) */}
              <div className="p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-50 dark:bg-slate-950/60 text-center transition-all">
                <input
                  type="file"
                  id="release-file-input"
                  className="hidden"
                  accept=".zip,.tar.gz,.bundle,.json,.js"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setNewRelFileName(file.name);
                      const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
                      setNewRelDownloadSize(`${sizeInMb} MB`);
                    }
                  }}
                />
                <label
                  htmlFor="release-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-amber-700 dark:text-amber-400">
                    <FileUp className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white hover:text-amber-700 dark:text-amber-400 underline">
                      Selecciona o arrastra el archivo de la compilación (.zip, .bundle, .tar.gz)
                    </span>
                    <p className="text-[11px] text-slate-700 dark:text-slate-200 mt-0.5">
                      {newRelFileName ? `Archivo cargado: ${newRelFileName}` : 'Opcional: puedes adjuntar el paquete binario o registrar el manifiesto oficial'}
                    </p>
                  </div>
                  {newRelFileName && (
                    <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-800 font-mono text-[10px] font-bold">
                      ✓ {newRelFileName} ({newRelDownloadSize})
                    </span>
                  )}
                </label>
              </div>

              {/* Version String, Build # and Channel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-300 font-bold block mb-1">
                    Versión del Software *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRelVersion}
                    onChange={(e) => setNewRelVersion(e.target.value)}
                    placeholder="v2.5.1-enterprise"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono text-xs focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-300 font-bold block mb-1">
                    Build Number (#)
                  </label>
                  <input
                    type="number"
                    value={newRelBuildNumber}
                    onChange={(e) => setNewRelBuildNumber(Number(e.target.value))}
                    placeholder="251"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-300 font-bold block mb-1">
                    Canal de Distribución
                  </label>
                  <select
                    value={newRelChannel}
                    onChange={(e) => setNewRelChannel(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-xs"
                  >
                    <option value="enterprise">Enterprise (Recomendado)</option>
                    <option value="stable">Stable (Estándar)</option>
                    <option value="beta">Beta / Experimental (Protegido)</option>
                  </select>
                </div>
              </div>

              {/* Title & Size */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-slate-600 dark:text-slate-300 font-bold block mb-1">
                    Título de la Versión / Parche *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRelTitle}
                    onChange={(e) => setNewRelTitle(e.target.value)}
                    placeholder="Ej. Parche de Seguridad & Facturación DIAN"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-300 font-bold block mb-1">
                    Tamaño Estimado
                  </label>
                  <input
                    type="text"
                    value={newRelDownloadSize}
                    onChange={(e) => setNewRelDownloadSize(e.target.value)}
                    placeholder="19.4 MB"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono text-xs"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-slate-600 dark:text-slate-300 font-bold block mb-1">
                  Descripción General
                </label>
                <input
                  type="text"
                  value={newRelDescription}
                  onChange={(e) => setNewRelDescription(e.target.value)}
                  placeholder="Resumen del contenido de este paquete"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-xs"
                />
              </div>

              {/* Modules Included */}
              <div>
                <label className="text-slate-600 dark:text-slate-300 font-bold block mb-1">
                  Módulos Nuevos Incluidos (separados por coma)
                </label>
                <input
                  type="text"
                  value={newRelModulesInput}
                  onChange={(e) => setNewRelModulesInput(e.target.value)}
                  placeholder="Facturación DIAN v2, Control de Cierres Remotos, Optimización Cache"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-xs font-mono"
                />
              </div>

              {/* Changelog */}
              <div>
                <label className="text-slate-600 dark:text-slate-300 font-bold block mb-1">
                  Notas de la Versión (Changelog - una línea por ítem)
                </label>
                <textarea
                  rows={3}
                  value={newRelChangelogInput}
                  onChange={(e) => setNewRelChangelogInput(e.target.value)}
                  placeholder="Resolución DIAN 000165 integrada&#10;Optimización de sincronización offline con SQLite&#10;Mejoras en el tiempo de impresión de tickets POS"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono text-xs leading-relaxed"
                />
              </div>

              {/* Checkboxes */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={newRelDbMigration}
                    onChange={(e) => setNewRelDbMigration(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 w-4 h-4 bg-white dark:bg-slate-900"
                  />
                  <span>Requiere verificación / migración de esquema en la base de datos local</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={newRelAutoDispatch}
                    onChange={(e) => setNewRelAutoDispatch(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 w-4 h-4 bg-white dark:bg-slate-900"
                  />
                  <span className="font-bold text-amber-800 dark:text-amber-300">
                    Despachar y Autorizar Inmediatamente a las Sucursales al Montar
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadReleaseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isUploadingRelease}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {isUploadingRelease ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Montando en Servidor...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Montar y Registrar en Servidor Central</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
