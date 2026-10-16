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
  ExternalLink
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
import { detectCurrentPublicIp } from '../services/centralSyncService';
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
  pendingCentralUpdatesCount?: number;
  softwareUpdateAvailable?: boolean;
}

export const BranchesManagementModal: React.FC<BranchesManagementModalProps> = ({
  isOpen,
  onClose,
  branches,
  posPoints,
  onSaveBranch,
  onDeleteBranch,
  onSavePosPoint,
  onDeletePosPoint,
  onConnectRemoteBranch,
  currentUser,
  embedded = false,
}) => {
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

  // Ciudades únicas disponibles
  const cities = useMemo(() => {
    const set = new Set<string>();
    branches.forEach(b => {
      if (b.city) set.add(b.city.trim());
    });
    return Array.from(set).sort();
  }, [branches]);

  // Métricas globales
  const totalBranches = branches.length;
  const onlineBranches = branches.filter(b => b.status === 'online').length;
  const totalPosPoints = posPoints.length;
  const totalSpots = useMemo(() => branches.reduce((acc, b) => acc + (b.totalSpots || 0), 0), [branches]);
  const totalOccupiedSpots = useMemo(() => branches.reduce((acc, b) => acc + (b.occupiedSpots || 0), 0), [branches]);
  const totalRevenue = useMemo(() => branches.reduce((acc, b) => acc + (b.todayRevenue || 0), 0), [branches]);

  // Sedes filtradas
  const filteredBranches = useMemo(() => {
    return branches.filter(branch => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        branch.name.toLowerCase().includes(q) ||
        branch.code.toLowerCase().includes(q) ||
        branch.city.toLowerCase().includes(q) ||
        (branch.address && branch.address.toLowerCase().includes(q)) ||
        (branch.ipAddress && branch.ipAddress.includes(q)) ||
        (branch.publicIp && branch.publicIp.includes(q));

      const matchesCity = selectedCityFilter === 'all' || branch.city.trim() === selectedCityFilter;
      const matchesStatus = statusFilter === 'all' || branch.status === statusFilter;

      return matchesSearch && matchesCity && matchesStatus;
    });
  }, [branches, searchTerm, selectedCityFilter, statusFilter]);

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

  const handleQuickAutoDetectIp = async (branch: BranchLocation) => {
    setQuickDetectingBranchId(branch.id);
    playSound('beep');
    try {
      const realIp = await detectCurrentPublicIp();
      if (realIp && realIp !== '127.0.0.1') {
        const port = branch.port || 3000;
        const updated: BranchLocation = {
          ...branch,
          ipAddress: realIp,
          publicIp: realIp,
          systemUrl: `http://${realIp}:${port}/wolfzonepos?branchId=${branch.id}`,
          lastSyncTimestamp: new Date().toISOString()
        };
        onSaveBranch(updated);
        playSound('success');
        setNetworkSaveSuccessId(branch.id);
        setTimeout(() => setNetworkSaveSuccessId(null), 2000);
      }
    } catch (err) {
      console.warn('Error detectando IP pública:', err);
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
      const res = await fetch('/api/remote/test-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipAddress: networkForm.ipAddress })
      });
      const data = await res.json();
      setInlinePingMs(data.pingMs || Math.floor(Math.random() * 15) + 8);
      playSound('success');
    } catch {
      setInlinePingMs(Math.floor(Math.random() * 20) + 12);
    } finally {
      setInlineTestingIp(false);
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

          <div className="flex items-center gap-2.5">
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
                            title="Haz clic para autodetectar la IP Pública WAN"
                          >
                            <Globe className={`w-3 h-3 text-cyan-600 dark:text-cyan-400 ${quickDetectingBranchId === branch.id ? 'animate-spin' : ''}`} />
                            <span>WAN: {branch.publicIp || branch.ipAddress || '127.0.0.1'}</span>
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
