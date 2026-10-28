import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Monitor, 
  DollarSign, 
  Car, 
  X, 
  Edit3, 
  Trash2, 
  Check, 
  Activity, 
  Wifi, 
  WifiOff, 
  Globe, 
  Key, 
  Sliders, 
  ShieldCheck,
  Phone,
  User,
  Radio,
  ExternalLink,
  Server,
  TrendingUp,
  BarChart3,
  Clock,
  ArrowRight
} from 'lucide-react';
import { 
  BranchLocation, 
  Warehouse, 
  PosPoint, 
  RemoteExecutionOrder, 
  SystemUser 
} from '../types';
import { formatCurrency } from '../utils/billing';
import { 
  generateFarmadeskId, 
  generateFarmadeskPassword 
} from '../utils/farmadeskCredentials';
import { 
  detectCurrentPublicIp, 
  fetchBranchesTelemetry, 
  pingSingleBranchFromCentral 
} from '../services/centralSyncService';
import { playSound } from '../utils/audio';

interface BranchesManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: BranchLocation[];
  warehouses?: Warehouse[];
  posPoints: PosPoint[];
  remoteOrders?: RemoteExecutionOrder[];
  onSaveBranch: (branch: BranchLocation) => void;
  onDeleteBranch: (branchId: string) => void;
  onSaveWarehouse?: (warehouse: Warehouse) => void;
  onDeleteWarehouse?: (warehouseId: string) => void;
  onSavePosPoint: (posPoint: PosPoint) => void;
  onDeletePosPoint: (posPointId: string) => void;
  onExecuteRemoteOrder?: (order: any) => void;
  onConnectRemoteBranch?: (branch: BranchLocation, connectionMode: 'system' | 'desktop') => void;
  currentUser?: SystemUser;
  embedded?: boolean;
  onOpenSync?: () => void;
  onOpenUpdater?: () => void;
  onOpenCentralHub?: (tab?: 'branches' | 'analytics' | 'global_version') => void;
  onRefreshBranches?: () => Promise<void>;
  pendingCentralUpdatesCount?: number;
  softwareUpdateAvailable?: boolean;
  onOpenWorkMode?: () => void;
}

export const BranchesManagementModal: React.FC<BranchesManagementModalProps> = ({
  isOpen,
  onClose,
  branches = [],
  posPoints = [],
  onSaveBranch,
  onDeleteBranch,
  onSavePosPoint,
  onDeletePosPoint,
  onConnectRemoteBranch,
  currentUser,
  embedded = false,
  onOpenCentralHub,
  onRefreshBranches,
  onOpenWorkMode,
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'branches' | 'consolidated'>('branches');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Estado para modal de crear / editar sede
  const [isBranchFormOpen, setIsBranchFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Partial<BranchLocation> | null>(null);

  // Estado para modal de crear / editar caja POS
  const [isPosFormOpen, setIsPosFormOpen] = useState(false);
  const [editingPosPoint, setEditingPosPoint] = useState<Partial<PosPoint> | null>(null);

  // Estado para edición rápida de red inline en la tarjeta
  const [editingNetworkBranchId, setEditingNetworkBranchId] = useState<string | null>(null);
  const [networkForm, setNetworkForm] = useState<{
    ipAddress: string;
    port: number;
    farmadeskId: string;
    farmadeskPassword: string;
  }>({
    ipAddress: '',
    port: 3000,
    farmadeskId: '',
    farmadeskPassword: ''
  });

  const [quickDetectingBranchId, setQuickDetectingBranchId] = useState<string | null>(null);
  const [networkSaveSuccessId, setNetworkSaveSuccessId] = useState<string | null>(null);
  const [inlineTestingIp, setInlineTestingIp] = useState(false);
  const [inlinePingMs, setInlinePingMs] = useState<number | null>(null);

  const safeBranches = useMemo(() => Array.isArray(branches) ? branches.filter(Boolean) : [], [branches]);
  const safePosPoints = useMemo(() => Array.isArray(posPoints) ? posPoints.filter(Boolean) : [], [posPoints]);

  // Ciudades únicas disponibles
  const cities = useMemo(() => {
    const set = new Set<string>();
    safeBranches.forEach(b => {
      if (b && typeof b.city === 'string' && b.city.trim()) {
        set.add(b.city.trim());
      }
    });
    return Array.from(set).sort();
  }, [safeBranches]);

  // Métricas globales
  const totalBranches = safeBranches.length;
  const onlineBranches = safeBranches.filter(b => b.status === 'online').length;
  const totalPosPoints = safePosPoints.length;
  const totalSpots = useMemo(() => safeBranches.reduce((acc, b) => acc + (b.totalSpots || 0), 0), [safeBranches]);
  const totalOccupiedSpots = useMemo(() => safeBranches.reduce((acc, b) => acc + (b.occupiedSpots || 0), 0), [safeBranches]);
  const totalRevenue = useMemo(() => safeBranches.reduce((acc, b) => acc + (b.todayRevenue || 0), 0), [safeBranches]);

  // Sedes filtradas
  const filteredBranches = useMemo(() => {
    return safeBranches.filter(branch => {
      if (!branch || typeof branch !== 'object') return false;
      const q = (searchTerm || '').toLowerCase().trim();
      const name = (branch.name || '').toLowerCase();
      const code = (branch.code || '').toLowerCase();
      const city = (branch.city || '').toLowerCase();
      const address = (branch.address || '').toLowerCase();
      const ip = branch.ipAddress || '';
      const pubIp = branch.publicIp || '';
      const domain = (branch.domain || '').toLowerCase();

      const matchesSearch = !q || 
        name.includes(q) ||
        code.includes(q) ||
        city.includes(q) ||
        address.includes(q) ||
        ip.includes(q) ||
        pubIp.includes(q) ||
        domain.includes(q);

      const matchesCity = selectedCityFilter === 'all' || ((branch.city || '').trim() === selectedCityFilter);
      const matchesStatus = statusFilter === 'all' || branch.status === statusFilter;

      return Boolean(matchesSearch && matchesCity && matchesStatus);
    });
  }, [safeBranches, searchTerm, selectedCityFilter, statusFilter]);

  // Manejo de conexión remota
  const handleConnect = (branch: BranchLocation, mode: 'system' | 'desktop') => {
    playSound('beep');
    if (mode === 'system') {
      const port = branch.port || 3000;
      const targetUrl = branch.systemUrl || `http://${branch.ipAddress || branch.publicIp || 'localhost'}:${port}/wolfzonepos?branchId=${branch.id}`;
      try {
        window.open(targetUrl, '_blank');
      } catch (err) {
        console.warn('Popup bloqueado:', err);
      }
    } else {
      if (onConnectRemoteBranch) {
        onConnectRemoteBranch(branch, 'desktop');
      }
    }
  };

  // Crear o Editar Sede
  const handleOpenNewBranch = () => {
    const nextNum = branches.length + 1;
    const branchCode = `SUC-00${nextNum}`;
    const freshId = generateFarmadeskId();
    const freshPass = generateFarmadeskPassword(branchCode);

    setEditingBranch({
      id: `branch_${Date.now()}`,
      code: branchCode,
      name: '',
      city: 'Bogotá D.C.',
      address: '',
      phone: '',
      managerName: '',
      status: 'online',
      ipAddress: '127.0.0.1',
      publicIp: '',
      port: 3000,
      totalSpots: 50,
      occupiedSpots: 0,
      todayRevenue: 0,
      todayVehicles: 0,
      currentAppVersion: 'v4.0.0',
      lastSyncTimestamp: new Date().toISOString(),
      farmadeskId: freshId,
      farmadeskPassword: freshPass
    });
    setIsBranchFormOpen(true);
    playSound('beep');
  };

  const handleEditBranch = (branch: BranchLocation) => {
    setEditingBranch({ ...branch });
    setIsBranchFormOpen(true);
    playSound('beep');
  };

  const handleSaveBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || !editingBranch.name?.trim() || !editingBranch.code?.trim()) return;

    const branchToSave: BranchLocation = {
      id: editingBranch.id || `branch_${Date.now()}`,
      code: editingBranch.code.trim().toUpperCase(),
      name: editingBranch.name.trim(),
      city: editingBranch.city?.trim() || 'Bogotá D.C.',
      address: editingBranch.address?.trim() || '',
      phone: editingBranch.phone?.trim() || '',
      managerName: editingBranch.managerName?.trim() || '',
      status: (editingBranch.status as any) || 'online',
      ipAddress: editingBranch.ipAddress?.trim() || '127.0.0.1',
      publicIp: editingBranch.publicIp?.trim() || editingBranch.ipAddress?.trim() || '',
      port: Number(editingBranch.port) || 3000,
      totalSpots: Number(editingBranch.totalSpots) || 50,
      occupiedSpots: Number(editingBranch.occupiedSpots) || 0,
      todayRevenue: Number(editingBranch.todayRevenue) || 0,
      todayVehicles: Number(editingBranch.todayVehicles) || 0,
      currentAppVersion: editingBranch.currentAppVersion || 'v4.0.0',
      lastSyncTimestamp: new Date().toISOString(),
      farmadeskId: editingBranch.farmadeskId || generateFarmadeskId(),
      farmadeskPassword: editingBranch.farmadeskPassword || generateFarmadeskPassword(editingBranch.code),
      systemUrl: `http://${editingBranch.ipAddress || '127.0.0.1'}:${editingBranch.port || 3000}/wolfzonepos?branchId=${editingBranch.id}`,
      isCurrentBranch: editingBranch.isCurrentBranch ?? false
    };

    onSaveBranch(branchToSave);
    setIsBranchFormOpen(false);
    setEditingBranch(null);
    playSound('success');
  };

  // Crear o Editar Punto POS
  const handleOpenNewPosPoint = (branchId: string) => {
    const branchPos = posPoints.filter(p => p.branchId === branchId);
    const code = `POS-0${branchPos.length + 1}`;
    setEditingPosPoint({
      id: `pos_${Date.now()}`,
      branchId,
      code,
      name: `Caja ${branchPos.length + 1}`,
      ipAddress: '192.168.1.101',
      warehouseId: '',
      status: 'online',
      cashierName: 'Cajero de Turno',
      currentAppVersion: 'v4.0.0',
      lastHeartbeat: new Date().toISOString(),
      assignedZone: 'Patio Principal',
      isMasterNode: branchPos.length === 0
    });
    setIsPosFormOpen(true);
    playSound('beep');
  };

  const handleEditPosPoint = (pos: PosPoint) => {
    setEditingPosPoint({ ...pos });
    setIsPosFormOpen(true);
    playSound('beep');
  };

  const handleSavePosPointSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPosPoint || !editingPosPoint.name?.trim() || !editingPosPoint.code?.trim()) return;

    const posToSave: PosPoint = {
      id: editingPosPoint.id || `pos_${Date.now()}`,
      branchId: editingPosPoint.branchId || branches[0]?.id || '',
      code: editingPosPoint.code.trim().toUpperCase(),
      name: editingPosPoint.name.trim(),
      ipAddress: editingPosPoint.ipAddress?.trim() || '192.168.1.101',
      warehouseId: '',
      status: (editingPosPoint.status as any) || 'online',
      cashierName: editingPosPoint.cashierName?.trim() || '',
      currentAppVersion: 'v4.0.0',
      lastHeartbeat: new Date().toISOString(),
      assignedZone: editingPosPoint.assignedZone?.trim() || 'Patio General',
      isMasterNode: editingPosPoint.isMasterNode ?? false
    };

    onSavePosPoint(posToSave);
    setIsPosFormOpen(false);
    setEditingPosPoint(null);
    playSound('success');
  };

  // Ajuste rápido de red inline en la tarjeta
  const handleStartEditingNetwork = (branch: BranchLocation) => {
    setEditingNetworkBranchId(branch.id);
    setNetworkForm({
      ipAddress: branch.ipAddress || branch.publicIp || '127.0.0.1',
      port: branch.port || 3000,
      farmadeskId: branch.farmadeskId || '',
      farmadeskPassword: branch.farmadeskPassword || ''
    });
    setInlinePingMs(null);
    playSound('beep');
  };

  const handleSaveNetworkInline = async (branch: BranchLocation) => {
    const updated: BranchLocation = {
      ...branch,
      ipAddress: networkForm.ipAddress.trim(),
      publicIp: networkForm.ipAddress.trim(),
      port: Number(networkForm.port) || 3000,
      farmadeskId: networkForm.farmadeskId.trim(),
      farmadeskPassword: networkForm.farmadeskPassword.trim(),
      systemUrl: `http://${networkForm.ipAddress.trim()}:${networkForm.port}/wolfzonepos?branchId=${branch.id}`,
      lastSyncTimestamp: new Date().toISOString()
    };

    onSaveBranch(updated);
    setNetworkSaveSuccessId(branch.id);
    playSound('success');
    setTimeout(() => {
      setNetworkSaveSuccessId(null);
      setEditingNetworkBranchId(null);
    }, 1200);
  };

  // Al abrir el módulo, consultar la última telemetría reportada por las sucursales a la Central
  useEffect(() => {
    if (onRefreshBranches) {
      onRefreshBranches();
    }
  }, []);

  const handleQuickAutoDetectIp = async (branch: BranchLocation) => {
    setQuickDetectingBranchId(branch.id);
    playSound('beep');
    try {
      // 1. Consultar si la Central ya tiene registrada la IP Pública reportada por esta sucursal
      const telemetryList = await fetchBranchesTelemetry();
      const reported = telemetryList.find(t => t.id === branch.id || (branch.code && t.code && t.code.toUpperCase() === branch.code.toUpperCase()));
      
      let ipToUse = reported?.reportedPublicIp || reported?.publicIp;
      let domainToUse = reported?.domain || reported?.ddnsDomain;

      // Si no hay reporte previo o es la terminal local, consultar la IP pública del entorno actual
      if ((!ipToUse || ipToUse === '127.0.0.1') && branch.isCurrentBranch) {
        const detected = await detectCurrentPublicIp();
        if (detected && detected !== '127.0.0.1') {
          ipToUse = detected;
        }
      }

      if (ipToUse && ipToUse !== '127.0.0.1') {
        const port = branch.port || 3000;
        const updated: BranchLocation = {
          ...branch,
          ipAddress: domainToUse || ipToUse,
          publicIp: ipToUse,
          reportedPublicIp: ipToUse,
          domain: domainToUse || branch.domain,
          systemUrl: `http://${domainToUse || ipToUse}:${port}/wolfzonepos?branchId=${branch.id}`,
          lastSyncTimestamp: new Date().toISOString()
        };
        onSaveBranch(updated);
        playSound('success');
        setNetworkSaveSuccessId(branch.id);
        setTimeout(() => setNetworkSaveSuccessId(null), 2000);
      } else {
        // Ejecutar sondeo directo de Ping
        const host = branch.domain || branch.ddnsDomain || branch.publicIp || branch.ipAddress || '127.0.0.1';
        const pingRes = await pingSingleBranchFromCentral(branch.id, host, branch.port || 3000);
        if (pingRes.online) {
          onSaveBranch({
            ...branch,
            status: 'online',
            latencyMs: pingRes.latencyMs,
            lastSyncTimestamp: new Date().toISOString()
          });
          playSound('success');
          setNetworkSaveSuccessId(branch.id);
          setTimeout(() => setNetworkSaveSuccessId(null), 2000);
        } else {
          playSound('alert');
        }
      }
    } catch (err) {
      console.warn('Error detectando IP pública o ejecutando ping:', err);
    } finally {
      setQuickDetectingBranchId(null);
    }
  };

  const handleInlineTestPing = async () => {
    if (!networkForm.ipAddress) return;
    setInlineTestingIp(true);
    setInlinePingMs(null);
    playSound('beep');
    try {
      const res = await pingSingleBranchFromCentral(
        editingNetworkBranchId || undefined,
        networkForm.ipAddress,
        networkForm.port || 3000
      );
      if (res.online) {
        setInlinePingMs(res.latencyMs);
        playSound('success');
      } else {
        setInlinePingMs(null);
        playSound('alert');
      }
    } catch (err) {
      console.warn('Error probando conexión:', err);
      setInlinePingMs(null);
    } finally {
      setInlineTestingIp(false);
    }
  };

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    playSound('beep');
    try {
      if (onRefreshBranches) {
        await onRefreshBranches();
      }
      playSound('success');
    } catch {
      // quiet fallback
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full animate-in fade-in duration-150" : "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"}>
      <div 
        id="branches-management-modal-dialog"
        className={embedded 
          ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full rounded-2xl shadow-xl overflow-hidden flex flex-col text-slate-900 dark:text-slate-100" 
          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-7xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] text-slate-900 dark:text-slate-100"}
      >
        {/* Encabezado Superior */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-md shadow-indigo-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Red de Sedes & Sucursales
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                  Control Central POS
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gestión de sedes físicas, terminales de caja POS, conectividad IP y capacidad de parqueo en tiempo real.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {onOpenCentralHub && (
              <button
                type="button"
                id="btn-open-central-hub"
                onClick={() => onOpenCentralHub('analytics')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-700 hover:from-sky-500 hover:to-indigo-500 text-white shadow-md shadow-indigo-600/25 active:scale-98 transition-all cursor-pointer border border-sky-300/30"
                title="Abrir Servidor Central / Hub Matriz para ver Consolidado Contable Nacional"
              >
                <Server className="w-4 h-4 text-sky-200" />
                <span>Servidor Central / Hub Matriz</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/20 text-white font-mono font-bold">
                  Consolidado
                </span>
              </button>
            )}

            <button
              type="button"
              id="btn-quick-new-branch"
              onClick={handleOpenNewBranch}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-98 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Sucursal</span>
            </button>

            {!embedded && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cerrar módulo"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Selector de Pestañas: Sedes & Red Física vs Consolidado Contable Nacional */}
        <div className="px-6 py-2.5 bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="tab-branches-physical"
              onClick={() => setActiveMainTab('branches')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                activeMainTab === 'branches'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Sedes & Red Física</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeMainTab === 'branches' ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {branches.length}
              </span>
            </button>

            <button
              type="button"
              id="tab-branches-consolidated"
              onClick={() => setActiveMainTab('consolidated')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                activeMainTab === 'consolidated'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-sky-400" />
              <span>Consolidado Contable</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeMainTab === 'consolidated' ? 'bg-white/25 text-white' : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
              }`}>
                Nacional
              </span>
            </button>

            {onRefreshBranches && (
              <button
                type="button"
                id="btn-refresh-branches-telemetry"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Sincronizar telemetría y consolidado en vivo con el Servidor Central"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-sky-600 dark:text-sky-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Sincronizando...' : 'Refrescar'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {onOpenWorkMode && (
              <button
                type="button"
                onClick={onOpenWorkMode}
                className="text-xs font-bold text-amber-700 hover:text-amber-600 dark:text-amber-300 flex items-center gap-1.5 cursor-pointer bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 transition-colors"
                title="Configurar el rol de este equipo (Servidor Central, Sucursal o Taquilla POS)"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                <span>Modo Servidor / Nodo</span>
              </button>
            )}

            {onOpenCentralHub && (
              <button
                type="button"
                onClick={() => onOpenCentralHub('analytics')}
                className="text-xs font-bold text-sky-600 hover:text-sky-500 dark:text-sky-400 flex items-center gap-1.5 hover:underline cursor-pointer bg-sky-50 dark:bg-sky-950/40 px-3 py-1.5 rounded-lg border border-sky-200 dark:border-sky-800"
              >
                <Server className="w-3.5 h-3.5" />
                <span>Abrir Servidor Central / Hub Matriz</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* KPIs de la Red de Parqueaderos */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Sedes Registradas</p>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{totalBranches}</p>
            </div>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Sedes En Línea</p>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {onlineBranches} <span className="text-xs text-slate-400 font-normal">/ {totalBranches}</span>
              </p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Wifi className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Cajas / Terminales POS</p>
              <p className="text-lg font-black text-sky-600 dark:text-sky-400 mt-0.5">{totalPosPoints}</p>
            </div>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Monitor className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Capacidad Red (Plazas)</p>
              <p className="text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5">
                {totalOccupiedSpots} <span className="text-xs text-slate-400 font-normal">/ {totalSpots}</span>
              </p>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Car className="w-5 h-5" />
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Recaudo Global Hoy</p>
              <p className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* VISTA 1: LISTADO DE SEDES Y RED FÍSICA */}
        {activeMainTab === 'branches' && (
          <>
            {/* Barra de Filtros y Búsqueda */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por sede, código, ciudad, dirección o IP..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro por Ciudad */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedCityFilter}
                onChange={(e) => setSelectedCityFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="all">Todas las Ciudades</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Estado */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="all">Todos los Estados</option>
                <option value="online">En Línea</option>
                <option value="offline">Desconectadas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Listado Principal de Sedes */}
        <div className="flex-1 p-5 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/40">
          {filteredBranches.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
              <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No se encontraron sedes</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                No hay sucursales que coincidan con la búsqueda o filtro seleccionado.
              </p>
              <button
                type="button"
                onClick={handleOpenNewBranch}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Sucursal</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredBranches.map(branch => {
                const branchPos = posPoints.filter(p => p.branchId === branch.id);
                const occupancyPercent = branch.totalSpots > 0 
                  ? Math.min(100, Math.round(((branch.occupiedSpots || 0) / branch.totalSpots) * 100))
                  : 0;

                return (
                  <div
                    key={branch.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-indigo-400/60 dark:hover:border-indigo-600/60 transition-all shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      {/* Cabecera de la Sede */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-xl border ${
                            branch.status === 'online'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          }`}>
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                {branch.code}
                              </span>
                              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                                {branch.name}
                              </h3>
                              {branch.isCurrentBranch && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                                  Terminal Local
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{branch.city} • {branch.address || 'Sin dirección registrada'}</span>
                            </p>
                          </div>
                        </div>

                        {/* Insignia de Estado */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            branch.status === 'online'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              branch.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                            }`} />
                            {branch.status === 'online' ? 'En Línea' : 'Desconectada'}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleQuickAutoDetectIp(branch)}
                            disabled={quickDetectingBranchId === branch.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold border border-slate-300 dark:border-slate-700 cursor-pointer transition-all disabled:opacity-50"
                            title="Haz clic para consultar la IP Pública WAN reportada por la sede o probar ping"
                          >
                            <Globe className={`w-3 h-3 text-cyan-600 dark:text-cyan-400 ${quickDetectingBranchId === branch.id ? 'animate-spin' : ''}`} />
                            <span>WAN: {branch.domain || branch.reportedPublicIp || branch.publicIp || branch.ipAddress || '127.0.0.1'}</span>
                            {branch.latencyMs !== undefined && (
                              <span className="text-emerald-500 font-bold ml-0.5">({branch.latencyMs}ms)</span>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Panel de Ajuste Rápido de Red Inline */}
                      {editingNetworkBranchId === branch.id ? (
                        <div className="bg-slate-50 dark:bg-slate-950 border-2 border-indigo-500/50 rounded-xl p-3 my-3 text-xs space-y-3 shadow-inner">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Configurar Conectividad de Red ({branch.code})</span>
                            </span>
                            <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                              Edición Rápida
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                IP / Host de la Sede:
                              </label>
                              <input
                                type="text"
                                value={networkForm.ipAddress}
                                onChange={(e) => setNetworkForm(prev => ({ ...prev, ipAddress: e.target.value }))}
                                placeholder="Ej: 192.168.1.100 ó ip.ddns.net"
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                Puerto POS:
                              </label>
                              <div className="flex gap-1.5">
                                <input
                                  type="number"
                                  value={networkForm.port}
                                  onChange={(e) => setNetworkForm(prev => ({ ...prev, port: Number(e.target.value) }))}
                                  className="w-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-center font-bold outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => setNetworkForm(prev => ({ ...prev, port: 3000 }))}
                                  className={`px-2 py-1 text-[10px] font-bold rounded-lg cursor-pointer ${networkForm.port === 3000 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}
                                >
                                  LAN 3000
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNetworkForm(prev => ({ ...prev, port: 3001 }))}
                                  className={`px-2 py-1 text-[10px] font-bold rounded-lg cursor-pointer ${networkForm.port === 3001 ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-800'}`}
                                >
                                  WAN 3001
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                ID Soporte Remoto:
                              </label>
                              <input
                                type="text"
                                value={networkForm.farmadeskId}
                                onChange={(e) => setNetworkForm(prev => ({ ...prev, farmadeskId: e.target.value }))}
                                placeholder="891 042 150"
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                Clave Soporte Remoto:
                              </label>
                              <input
                                type="text"
                                value={networkForm.farmadeskPassword}
                                onChange={(e) => setNetworkForm(prev => ({ ...prev, farmadeskPassword: e.target.value }))}
                                placeholder="Contraseña de enlace"
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleInlineTestPing}
                                disabled={inlineTestingIp}
                                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <RefreshCw className={`w-3 h-3 ${inlineTestingIp ? 'animate-spin' : ''}`} />
                                <span>{inlineTestingIp ? 'Probando...' : 'Probar Conexión'}</span>
                              </button>
                              {inlinePingMs !== null && (
                                <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                                  ✓ Responde ({inlinePingMs}ms)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingNetworkBranchId(null)}
                                className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveNetworkInline(branch)}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Guardar</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* Capacidad y Ocupación de Plazas */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800/80 my-3 text-xs">
                        <div className="flex items-center justify-between font-bold mb-1.5">
                          <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <Car className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span>Ocupación de Parqueadero:</span>
                          </span>
                          <span className="font-mono text-slate-900 dark:text-white">
                            {branch.occupiedSpots || 0} / {branch.totalSpots || 0} plazas ({occupancyPercent}%)
                          </span>
                        </div>
                        {/* Barra de progreso de ocupación */}
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              occupancyPercent > 90 
                                ? 'bg-rose-500' 
                                : occupancyPercent > 70 
                                ? 'bg-amber-500' 
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${occupancyPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Puntos de Venta (Terminales POS) */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Monitor className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                            <span>Cajas / Terminales ({branchPos.length})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenNewPosPoint(branch.id)}
                            className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Agregar Caja POS</span>
                          </button>
                        </div>

                        {branchPos.length === 0 ? (
                          <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center">
                            <p className="text-xs text-slate-500">No hay terminales POS registradas en esta sede.</p>
                            <button
                              type="button"
                              onClick={() => handleOpenNewPosPoint(branch.id)}
                              className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                            >
                              + Registrar primera caja
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {branchPos.map(pos => (
                              <div
                                key={pos.id}
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`w-2 h-2 rounded-full ${
                                    pos.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'
                                  }`} />
                                  <div className="truncate">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-900 dark:text-white truncate">{pos.name}</span>
                                      <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded">
                                        {pos.code}
                                      </span>
                                      {pos.isMasterNode && (
                                        <span className="text-[9px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 px-1.5 py-0.2 rounded">
                                          Servidor Local
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 truncate">
                                      IP: {pos.ipAddress} • {pos.assignedZone || 'Patio General'} • Cajero: {pos.cashierName || 'No asignado'}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleEditPosPoint(pos)}
                                    className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                    title="Editar caja"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`¿Eliminar la terminal ${pos.name}?`)) {
                                        onDeletePosPoint(pos.id);
                                        playSound('beep');
                                      }
                                    }}
                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                    title="Eliminar caja"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pie de la Tarjeta con Recaudo y Acciones Directas */}
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Recaudo Acumulado Hoy</p>
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatCurrency(branch.todayRevenue || 0)}
                          <span className="text-[11px] text-slate-400 font-normal ml-1">
                            ({branch.todayVehicles || 0} vehículos)
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Botón Acceso POS Web */}
                        <button
                          type="button"
                          onClick={() => handleConnect(branch, 'system')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-sm active:scale-98"
                          title="Abrir taquilla web del sistema POS de esta sede"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir POS Web</span>
                        </button>

                        {/* Botón Escritorio Remoto */}
                        {onConnectRemoteBranch && (
                          <button
                            type="button"
                            onClick={() => handleConnect(branch, 'desktop')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shadow-sm active:scale-98"
                            title="Conectar por escritorio remoto a la PC de esta sede"
                          >
                            <Monitor className="w-3.5 h-3.5" />
                            <span>Escritorio</span>
                          </button>
                        )}

                        {/* Botón Ajustar Red Inline */}
                        <button
                          type="button"
                          onClick={() => handleStartEditingNetwork(branch)}
                          className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Ajustar IP y conectividad de red"
                        >
                          <Sliders className="w-4 h-4" />
                        </button>

                        {/* Botón Editar Sede */}
                        <button
                          type="button"
                          onClick={() => handleEditBranch(branch)}
                          className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Editar información de la sede"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Botón Eliminar Sede */}
                        {!branch.isCurrentBranch && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`¿Está seguro de eliminar la sucursal "${branch.name}" (${branch.code})?`)) {
                                onDeleteBranch(branch.id);
                                playSound('beep');
                              }
                            }}
                            className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Eliminar sucursal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </>
    )}

    {/* VISTA 2: CONSOLIDADO CONTABLE NACIONAL */}
    {activeMainTab === 'consolidated' && (
      <div className="flex-1 p-5 overflow-y-auto space-y-6 bg-slate-50/50 dark:bg-slate-950/40">
        {/* Hero Banner Consolidado */}
        <div className="bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-mono text-sky-200 mb-2 border border-white/10">
                <BarChart3 className="w-3.5 h-3.5 text-sky-300" />
                <span>Consolidado Contable & Financiero Nacional</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Balance en Tiempo Real de Todas las Sucursales
              </h3>
              <p className="text-xs text-sky-200/80 max-w-2xl mt-1">
                Métricas acumuladas de la jornada operativa recibidas desde cada nodo de sede física. Datos sincronizados con el Servidor Central matriz.
              </p>
            </div>

            {onOpenCentralHub && (
              <button
                type="button"
                id="btn-goto-central-hub-analytics"
                onClick={() => onOpenCentralHub('analytics')}
                className="px-4 py-2.5 rounded-xl font-black text-xs bg-white text-indigo-950 hover:bg-sky-50 shadow-lg shadow-black/20 flex items-center gap-2 shrink-0 transition-transform active:scale-95 cursor-pointer"
              >
                <Server className="w-4 h-4 text-sky-600" />
                <span>Abrir Hub Matriz Completo</span>
                <ArrowRight className="w-4 h-4 text-sky-600" />
              </button>
            )}
          </div>

          {/* Métricas destacadas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
            <div>
              <span className="text-[11px] text-sky-200/70 block uppercase font-mono font-semibold">Recaudo Total Red</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono mt-0.5 block">
                {formatCurrency(totalRevenue)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-sky-200/70 block uppercase font-mono font-semibold">Vehículos Totales</span>
              <span className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5 block">
                {safeBranches.reduce((sum, b) => sum + (b.todayVehicles || 0), 0)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-sky-200/70 block uppercase font-mono font-semibold">Ocupación Nacional</span>
              <span className="text-xl sm:text-2xl font-black text-sky-300 font-mono mt-0.5 block">
                {totalSpots > 0 ? Math.round((totalOccupiedSpots / totalSpots) * 100) : 0}%
              </span>
            </div>
            <div>
              <span className="text-[11px] text-sky-200/70 block uppercase font-mono font-semibold">Sedes Conectadas</span>
              <span className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5 block">
                {onlineBranches} <span className="text-sm font-normal text-sky-300">/ {totalBranches}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tabla de Consolidado Financiero por Sucursal */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 bg-slate-50/50 dark:bg-slate-950/50">
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Cierres y Recaudos en Tiempo Real por Sucursal</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detalle financiero de ingresos y flujo vehicular de cada punto de venta
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
              {safeBranches.length} Sedes Monitoreadas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Sede / Código</th>
                  <th className="py-3 px-4">Ciudad</th>
                  <th className="py-3 px-4 text-center">Estado Red</th>
                  <th className="py-3 px-4 text-right">Ocupación Plazas</th>
                  <th className="py-3 px-4 text-right">Vehículos Hoy</th>
                  <th className="py-3 px-4 text-right">Recaudo Hoy</th>
                  <th className="py-3 px-4 text-right">% Cuota</th>
                  <th className="py-3 px-4 text-center">Cajero / Turno</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                {safeBranches.map(branch => {
                  const occPct = (branch.totalSpots || 0) > 0 ? Math.round(((branch.occupiedSpots || 0) / branch.totalSpots) * 100) : 0;
                  const sharePct = totalRevenue > 0 ? Math.round(((branch.todayRevenue || 0) / totalRevenue) * 100) : 0;

                  return (
                    <tr key={branch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white font-sans">{branch.name || branch.id}</div>
                        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">{branch.code || branch.id}</div>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600 dark:text-slate-400">{branch.city || 'Sin ciudad'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          branch.status === 'online'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${branch.status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {branch.status === 'online' ? 'EN LÍNEA' : 'OFFLINE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-bold">{branch.occupiedSpots || 0} / {branch.totalSpots || 0}</div>
                        <div className="w-20 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full ml-auto mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              occPct > 85 ? 'bg-rose-500' : occPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(occPct, 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        {branch.todayVehicles || 0}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(branch.todayRevenue || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-500 dark:text-slate-400">
                        {sharePct}%
                      </td>
                      <td className="py-3 px-4 text-center font-sans text-[11px]">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{branch.currentCashier || 'Administrador'}</span>
                        <div className="text-[10px] text-slate-400 font-mono">Turno #{branch.activeShiftNumber || 1}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {onConnectRemoteBranch && (
                          <button
                            type="button"
                            onClick={() => onConnectRemoteBranch(branch, 'desktop')}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                            title="Acceso remoto FarmaDesk"
                          >
                            FarmaDesk
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100/90 dark:bg-slate-800/90 font-mono font-bold text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                <tr>
                  <td className="py-3 px-4" colSpan={3}>TOTAL NACIONAL CONSOLIDADO</td>
                  <td className="py-3 px-4 text-right">{totalOccupiedSpots} / {totalSpots}</td>
                  <td className="py-3 px-4 text-right">{safeBranches.reduce((sum, b) => sum + (b.todayVehicles || 0), 0)}</td>
                  <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 text-sm font-black">
                    {formatCurrency(totalRevenue)}
                  </td>
                  <td className="py-3 px-4 text-right">100%</td>
                  <td className="py-3 px-4 text-center" colSpan={2}>-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Tarjeta de Acceso Completo al Servidor Central */}
        {onOpenCentralHub && (
          <div className="bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/30 border border-sky-200 dark:border-sky-800/60 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Consola Integral del Servidor Central / Hub Matriz
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Accede a las 8 consolas del servidor: Distribución de Tarifas Globales, Actualizaciones OTA de Software, Matriz de Dominios de Sincronización y Auditoría Telemetría.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenCentralHub('analytics')}
              className="px-5 py-2.5 rounded-xl font-black text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 flex items-center gap-2 shrink-0 transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Abrir Consolidado en Hub Matriz</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    )}

        {/* ============================================================== */}
        {/* MODAL SECUNDARIO: CREAR / EDITAR SUCURSAL                     */}
        {/* ============================================================== */}
        {isBranchFormOpen && editingBranch && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-600 text-white">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                      {branches.some(b => b.id === editingBranch.id) ? 'Editar Sucursal / Sede' : 'Registrar Nueva Sucursal'}
                    </h3>
                    <p className="text-xs text-slate-500">Defina la ubicación, capacidad de parqueo y parámetros de conexión.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBranchFormOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBranchSubmit} className="space-y-4 overflow-y-auto pr-1 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Código de Sede *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingBranch.code || ''}
                      onChange={(e) => setEditingBranch(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="SUC-001"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Nombre de la Sucursal *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingBranch.name || ''}
                      onChange={(e) => setEditingBranch(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej: Sede Unicentro Norte"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Ciudad *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingBranch.city || ''}
                      onChange={(e) => setEditingBranch(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Ej: Bogotá D.C."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Dirección Física
                    </label>
                    <input
                      type="text"
                      value={editingBranch.address || ''}
                      onChange={(e) => setEditingBranch(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Ej: Cra 15 # 124-30"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Capacidad Plazas *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editingBranch.totalSpots || 50}
                      onChange={(e) => setEditingBranch(prev => ({ ...prev, totalSpots: Number(e.target.value) }))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-bold outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Teléfono de Contacto
                    </label>
                    <input
                      type="text"
                      value={editingBranch.phone || ''}
                      onChange={(e) => setEditingBranch(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Ej: (601) 745-9000"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Administrador / Encargado
                    </label>
                    <input
                      type="text"
                      value={editingBranch.managerName || ''}
                      onChange={(e) => setEditingBranch(prev => ({ ...prev, managerName: e.target.value }))}
                      placeholder="Ej: Carlos Ramírez"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Conexión de Red & Remoto */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-indigo-500" />
                    <span>Conectividad de Red & Acceso Remoto</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        IP Pública / WAN / Dominio:
                      </label>
                      <input
                        type="text"
                        value={editingBranch.ipAddress || ''}
                        onChange={(e) => setEditingBranch(prev => ({ ...prev, ipAddress: e.target.value, publicIp: e.target.value }))}
                        placeholder="Ej: 190.158.12.44 ó sede.ddns.net"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                        Puerto Web POS:
                      </label>
                      <input
                        type="number"
                        value={editingBranch.port || 3000}
                        onChange={(e) => setEditingBranch(prev => ({ ...prev, port: Number(e.target.value) }))}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 flex items-center justify-between">
                        <span>ID Soporte Remoto:</span>
                        <button
                          type="button"
                          onClick={() => setEditingBranch(prev => ({ ...prev, farmadeskId: generateFarmadeskId() }))}
                          className="text-[10px] text-indigo-600 hover:underline"
                        >
                          Generar
                        </button>
                      </label>
                      <input
                        type="text"
                        value={editingBranch.farmadeskId || ''}
                        onChange={(e) => setEditingBranch(prev => ({ ...prev, farmadeskId: e.target.value }))}
                        placeholder="770 130 282"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1 flex items-center justify-between">
                        <span>Clave Soporte Remoto:</span>
                        <button
                          type="button"
                          onClick={() => setEditingBranch(prev => ({ ...prev, farmadeskPassword: generateFarmadeskPassword(editingBranch.code || 'pass') }))}
                          className="text-[10px] text-indigo-600 hover:underline"
                        >
                          Generar
                        </button>
                      </label>
                      <input
                        type="text"
                        value={editingBranch.farmadeskPassword || ''}
                        onChange={(e) => setEditingBranch(prev => ({ ...prev, farmadeskPassword: e.target.value }))}
                        placeholder="Clave de enlace seguro"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsBranchFormOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all cursor-pointer shadow-md"
                  >
                    Guardar Sede
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL SECUNDARIO: CREAR / EDITAR PUNTO POS (TERMINAL)         */}
        {/* ============================================================== */}
        {isPosFormOpen && editingPosPoint && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-600 text-white">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                      {posPoints.some(p => p.id === editingPosPoint.id) ? 'Editar Caja / Terminal POS' : 'Registrar Nueva Terminal POS'}
                    </h3>
                    <p className="text-xs text-slate-500">Configure los datos de la estación de cobro.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPosFormOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePosPointSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Sede a la que pertenece *
                  </label>
                  <select
                    value={editingPosPoint.branchId}
                    onChange={(e) => setEditingPosPoint(prev => ({ ...prev, branchId: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold outline-none cursor-pointer"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Código Terminal *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingPosPoint.code || ''}
                      onChange={(e) => setEditingPosPoint(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="POS-01"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono font-bold uppercase outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Nombre de la Caja *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingPosPoint.name || ''}
                      onChange={(e) => setEditingPosPoint(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej: Taquilla Principal"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-bold outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      IP Local de la Terminal *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingPosPoint.ipAddress || ''}
                      onChange={(e) => setEditingPosPoint(prev => ({ ...prev, ipAddress: e.target.value }))}
                      placeholder="192.168.1.101"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-mono outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Zona / Patio Asignado
                    </label>
                    <input
                      type="text"
                      value={editingPosPoint.assignedZone || ''}
                      onChange={(e) => setEditingPosPoint(prev => ({ ...prev, assignedZone: e.target.value }))}
                      placeholder="Ej: Patio Automóviles"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Cajero Predeterminado
                  </label>
                  <input
                    type="text"
                    value={editingPosPoint.cashierName || ''}
                    onChange={(e) => setEditingPosPoint(prev => ({ ...prev, cashierName: e.target.value }))}
                    placeholder="Ej: Juan Pérez"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-sky-500"
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPosPoint.isMasterNode ?? false}
                      onChange={(e) => setEditingPosPoint(prev => ({ ...prev, isMasterNode: e.target.checked }))}
                      className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                    />
                    <span className="font-bold text-slate-900 dark:text-white">
                      Esta terminal actúa como Servidor Maestro de la Sede
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsPosFormOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition-all cursor-pointer shadow-md"
                  >
                    Guardar Terminal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
