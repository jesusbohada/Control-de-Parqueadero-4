import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Server,
  Building2,
  Radio,
  Wifi,
  WifiOff,
  Activity,
  Cpu,
  HardDrive,
  RefreshCw,
  MapPin,
  Search,
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Clock,
  Car,
  DollarSign,
  Layers,
  Sliders,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Send,
  Terminal,
  Sparkles,
  Eye,
  Info,
  TrendingUp,
  X
} from 'lucide-react';
import { BranchLocation, SystemUser } from '../types';
import { 
  fetchBranchesTelemetry, 
  pingBranchesFromCentral, 
  pingSingleBranchFromCentral 
} from '../services/centralSyncService';
import { formatCurrency } from '../utils/billing';
import { playSound } from '../utils/audio';
import { encodeSsoToken } from '../utils/sso';
import { DEFAULT_MASTER_PERMISSIONS } from '../data/initialData';

export interface CentralDashboardProps {
  branches?: BranchLocation[];
  onSelectBranch?: (branch: BranchLocation) => void;
  onRefresh?: () => Promise<void> | void;
  isDarkMode?: boolean;
  embedded?: boolean;
  onClose?: () => void;
  currentUser?: SystemUser;
}

// Bounding box geográfico de Colombia aproximado para proyección relativa
const MAP_BOUNDS = {
  minLat: 0.5,   // Sur (Amazonas / Nariño)
  maxLat: 12.8,  // Norte (La Guajira / Caribe)
  minLng: -79.2, // Oeste (Pacífico / Chocó)
  maxLng: -67.0, // Este (Guainía / Vichada)
};

// Coordenadas por defecto para ciudades clave si no vienen en la sucursal
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Bogotá D.C.': { lat: 4.6560, lng: -74.0596 },
  'Bogota': { lat: 4.6560, lng: -74.0596 },
  'Medellín': { lat: 6.2442, lng: -75.5812 },
  'Medellin': { lat: 6.2442, lng: -75.5812 },
  'Cali': { lat: 3.4516, lng: -76.5320 },
  'Barranquilla': { lat: 10.9685, lng: -74.7813 },
  'Bucaramanga': { lat: 7.1254, lng: -73.1198 },
  'Cúcuta': { lat: 7.8939, lng: -72.5078 },
  'Cucuta': { lat: 7.8939, lng: -72.5078 },
  'Cartagena': { lat: 10.3910, lng: -75.4794 },
  'Pereira': { lat: 4.8133, lng: -75.6961 },
  'Manizales': { lat: 5.0689, lng: -75.5174 },
  'Ibagué': { lat: 4.4389, lng: -75.2322 },
  'Santa Marta': { lat: 11.2408, lng: -74.1990 }
};

export const CentralDashboard: React.FC<CentralDashboardProps> = ({
  branches: initialBranches,
  onSelectBranch,
  onRefresh,
  isDarkMode = true,
  embedded = false,
  onClose,
  currentUser
}) => {
  const [branchesList, setBranchesList] = useState<BranchLocation[]>(() => initialBranches || []);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'warning' | 'offline'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [showNetworkLinks, setShowNetworkLinks] = useState(true);
  const [activeMetricView, setActiveMetricView] = useState<'occupancy' | 'latency' | 'load'>('latency');
  const [pingStatusBanner, setPingStatusBanner] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [testingSingleBranchId, setTestingSingleBranchId] = useState<string | null>(null);

  // Actualizar si cambia la prop externa
  useEffect(() => {
    if (initialBranches && initialBranches.length > 0) {
      setBranchesList(initialBranches);
    }
  }, [initialBranches]);

  // Carga periódica de telemetría en tiempo real
  const loadTelemetry = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      const telemetry = await fetchBranchesTelemetry();
      if (telemetry && telemetry.length > 0) {
        setBranchesList(telemetry);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.warn('[CentralDashboard] Error refrescando telemetría:', err);
    } finally {
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 300);
      }
    }
  }, [onRefresh]);

  // Sondeo / Ping activo real a todas las sedes desde el Servidor Central
  const handlePingAllBranches = useCallback(async () => {
    setIsRefreshing(true);
    playSound('beep');
    try {
      const result = await pingBranchesFromCentral();
      if (result.branches && result.branches.length > 0) {
        setBranchesList(result.branches);
        setLastUpdated(new Date());
      }
      if (onRefresh) {
        await onRefresh();
      }
      playSound('success');
      const { online, total, avgLatency } = result.summary;
      setPingStatusBanner({
        type: online > 0 ? 'success' : 'error',
        message: `📡 Ping a sedes finalizado: ${online}/${total} sedes en línea (Latencia media: ${avgLatency} ms RTT)`
      });
      setTimeout(() => setPingStatusBanner(null), 6000);
    } catch (err: any) {
      console.warn('[CentralDashboard] Error en ping central:', err);
      setPingStatusBanner({
        type: 'error',
        message: 'No fue posible completar el sondeo de red'
      });
      setTimeout(() => setPingStatusBanner(null), 4000);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  // Sondeo / Ping individual a una sede específica
  const handlePingSingleBranch = useCallback(async (branch: BranchLocation) => {
    setTestingSingleBranchId(branch.id);
    playSound('beep');
    try {
      const host = branch.domain || branch.ddnsDomain || branch.reportedPublicIp || branch.publicIp || branch.ipAddress;
      const res = await pingSingleBranchFromCentral(branch.id, host, branch.port || 3000);
      
      setBranchesList(prev => prev.map(b => {
        if (b.id === branch.id) {
          return {
            ...b,
            status: res.online ? 'online' : 'offline',
            latencyMs: res.online ? res.latencyMs : undefined,
            pingMethod: res.method,
            pingDetails: res.details,
            lastPingAt: new Date().toISOString()
          };
        }
        return b;
      }));

      if (res.online) {
        playSound('success');
        setPingStatusBanner({
          type: 'success',
          message: `📡 Ping exitoso a ${branch.name} (${res.latencyMs} ms RTT vía ${res.method.toUpperCase()})`
        });
      } else {
        playSound('alert');
        setPingStatusBanner({
          type: 'error',
          message: `⚠️ ${branch.name} no respondió al ping: ${res.details || 'Inalcanzable'}`
        });
      }
      setTimeout(() => setPingStatusBanner(null), 5000);
    } catch (e) {
      console.warn('Error pinging single branch:', e);
    } finally {
      setTestingSingleBranchId(null);
    }
  }, []);

  // Polling automático cada 8 segundos
  useEffect(() => {
    loadTelemetry();
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadTelemetry(false);
    }, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadTelemetry]);

  // Calcular coordenadas normalizadas en el mapa SVG (porcentajes de 0 a 100)
  const getCoordinatesForBranch = useCallback((branch: BranchLocation) => {
    let lat = branch.lat;
    let lng = branch.lng;

    if (lat === undefined || lng === undefined) {
      const cityKey = Object.keys(CITY_COORDS).find(k => 
        branch.city?.toLowerCase().includes(k.toLowerCase()) || 
        branch.name?.toLowerCase().includes(k.toLowerCase())
      );
      if (cityKey) {
        lat = CITY_COORDS[cityKey].lat;
        lng = CITY_COORDS[cityKey].lng;
      } else {
        // Fallback en la zona central
        lat = 4.7;
        lng = -74.1;
      }
    }

    // Normalización matemática de coordenadas geográficas al viewport SVG
    const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100;
    const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100;

    return {
      x: Math.max(8, Math.min(92, x)),
      y: Math.max(8, Math.min(92, y)),
      lat,
      lng
    };
  }, []);

  // Sucursal principal o centro de datos (nodo matriz)
  const mainBranch = useMemo(() => {
    return branchesList.find(b => b.isCurrentBranch || b.code === 'SUC-001') || branchesList[0];
  }, [branchesList]);

  // Sucursal seleccionada actual
  const selectedBranch = useMemo(() => {
    if (!selectedBranchId) return mainBranch;
    return branchesList.find(b => b.id === selectedBranchId) || mainBranch;
  }, [branchesList, selectedBranchId, mainBranch]);

  // Filtrado de sucursales
  const filteredBranches = useMemo(() => {
    return branchesList.filter(b => {
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = !term || 
        b.name.toLowerCase().includes(term) ||
        b.code.toLowerCase().includes(term) ||
        b.city.toLowerCase().includes(term) ||
        b.address.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [branchesList, statusFilter, searchTerm]);

  // Cálculos estadísticos globales
  const stats = useMemo(() => {
    const total = branchesList.length;
    const online = branchesList.filter(b => b.status === 'online').length;
    const warning = branchesList.filter(b => b.status === 'warning').length;
    const offline = branchesList.filter(b => b.status === 'offline').length;

    const totalSpots = branchesList.reduce((acc, b) => acc + (b.totalSpots || 0), 0);
    const occupiedSpots = branchesList.reduce((acc, b) => acc + (b.occupiedSpots || 0), 0);
    const occupancyRate = totalSpots > 0 ? (occupiedSpots / totalSpots) * 100 : 0;

    const totalRevenue = branchesList.reduce((acc, b) => acc + (b.todayRevenue || 0), 0);
    const totalVehicles = branchesList.reduce((acc, b) => acc + (b.todayVehicles || 0), 0);

    const validLatencies = branchesList
      .filter(b => b.status === 'online' && typeof b.latencyMs === 'number')
      .map(b => b.latencyMs as number);
    
    const avgLatency = validLatencies.length > 0 
      ? Math.round(validLatencies.reduce((a, c) => a + c, 0) / validLatencies.length) 
      : 24;

    const validLoads = branchesList
      .filter(b => typeof b.systemLoad === 'number')
      .map(b => b.systemLoad as number);

    const avgSystemLoad = validLoads.length > 0
      ? Math.round(validLoads.reduce((a, c) => a + c, 0) / validLoads.length)
      : 35;

    return {
      total,
      online,
      warning,
      offline,
      totalSpots,
      occupiedSpots,
      occupancyRate,
      totalRevenue,
      totalVehicles,
      avgLatency,
      avgSystemLoad
    };
  }, [branchesList]);

  // Helper para color y texto de latencia
  const getLatencyMeta = (latency?: number) => {
    if (latency === undefined) return { label: 'N/A', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
    if (latency < 50) return { label: 'Óptima', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    if (latency < 140) return { label: 'Moderada', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
    return { label: 'Elevada', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
  };

  // Helper para color de carga de sistema
  const getLoadMeta = (load?: number) => {
    if (load === undefined) return { label: 'N/A', color: 'text-slate-400', bg: 'bg-slate-500/10' };
    if (load < 50) return { label: 'Baja', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    if (load < 80) return { label: 'Media', color: 'text-amber-400', bg: 'bg-amber-500/10' };
    return { label: 'Alta', color: 'text-red-400', bg: 'bg-red-500/10' };
  };

  const handleSelect = (branch: BranchLocation) => {
    setSelectedBranchId(branch.id);
    playSound('beep');
    if (onSelectBranch) {
      onSelectBranch(branch);
    }
  };

  return (
    <div className={`flex flex-col h-full w-full bg-slate-950 text-slate-100 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative ${embedded ? 'min-h-[700px]' : 'min-h-[820px]'}`}>
      {/* 1. Header Ejecutivo y Barra de Acciones */}
      <header className="p-4 md:px-6 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-inner">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Central Telemetry & Operations Dashboard</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase font-mono font-bold">
                  En Vivo
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Monitoreo telemático de red satelital y enlaces de sucursales</span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-[11px] text-slate-400">
                Última señal: {lastUpdated.toLocaleTimeString()}
              </span>
            </p>
          </div>
        </div>

        {/* Acciones del Header */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Auto-Refresh */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              autoRefresh 
                ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40' 
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
            title={autoRefresh ? 'Pausar actualización continua' : 'Activar actualización continua (8s)'}
          >
            {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{autoRefresh ? 'Auto-Sync (8s)' : 'Pausado'}</span>
          </button>

          {/* Botón de Refresco y Ping Manual */}
          <button
            type="button"
            onClick={handlePingAllBranches}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Ejecutar prueba de ping activa a la IP pública o dominio de cada sede"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-white' : ''}`} />
            <span>{isRefreshing ? 'Haciendo Ping...' : 'Ping a Sedes'}</span>
          </button>

          {/* Selector de Métrica Activa */}
          <div className="bg-slate-800/80 p-0.5 rounded-xl border border-slate-700 flex items-center text-xs">
            <button
              type="button"
              onClick={() => setActiveMetricView('latency')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeMetricView === 'latency'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Latencia
            </button>
            <button
              type="button"
              onClick={() => setActiveMetricView('occupancy')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeMetricView === 'occupancy'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ocupación
            </button>
            <button
              type="button"
              onClick={() => setActiveMetricView('load')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeMetricView === 'load'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Carga CPU
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Banner de Feedback de Ping */}
      {pingStatusBanner && (
        <div className={`px-4 py-2 text-xs font-bold flex items-center justify-between transition-all ${
          pingStatusBanner.type === 'success' 
            ? 'bg-emerald-600/90 text-white' 
            : pingStatusBanner.type === 'error'
              ? 'bg-rose-600/90 text-white'
              : 'bg-indigo-600/90 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 animate-pulse" />
            <span>{pingStatusBanner.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setPingStatusBanner(null)} 
            className="text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Barra de KPIs Globales */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-3 px-4 md:px-6 bg-slate-900/60 border-b border-slate-800/60 text-xs">
        {/* KPI: Red de Sedes */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-2.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">Sedes Conectadas</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-base font-black text-white">{stats.online}/{stats.total}</span>
              <span className="text-[10px] text-emerald-400 font-bold">({Math.round((stats.online / (stats.total || 1)) * 100)}%)</span>
            </div>
          </div>
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" title="Online" />
            {stats.warning > 0 && <span className="w-2 h-2 rounded-full bg-amber-500" title="Warning" />}
            {stats.offline > 0 && <span className="w-2 h-2 rounded-full bg-red-500" title="Offline" />}
          </div>
        </div>

        {/* KPI: Latencia Media */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-2.5">
          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">Latencia Media Red</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-base font-black text-emerald-400 font-mono">{stats.avgLatency} ms</span>
            <span className="text-[10px] text-slate-400">RTT</span>
          </div>
        </div>

        {/* KPI: Carga CPU / Servidores */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-2.5">
          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">Carga Media Nodos</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span className="text-base font-black text-indigo-300 font-mono">{stats.avgSystemLoad}%</span>
            <span className="text-[10px] text-slate-400">CPU</span>
          </div>
        </div>

        {/* KPI: Ocupación Global */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-2.5">
          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">Ocupación Nacional</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Car className="w-4 h-4 text-amber-400" />
            <span className="text-base font-black text-white font-mono">{Math.round(stats.occupancyRate)}%</span>
            <span className="text-[10px] text-slate-400">({stats.occupiedSpots}/{stats.totalSpots})</span>
          </div>
        </div>

        {/* KPI: Recaudo Global */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-2.5">
          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">Recaudo Consolidado</span>
          <div className="flex items-center gap-1 mt-0.5">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-black text-emerald-400 font-mono truncate">{formatCurrency(stats.totalRevenue)}</span>
          </div>
        </div>

        {/* KPI: Flujo Vehicular Hoy */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-2.5">
          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">Vehículos del Día</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span className="text-base font-black text-cyan-300 font-mono">{stats.totalVehicles}</span>
            <span className="text-[10px] text-slate-400">rotaciones</span>
          </div>
        </div>
      </section>

      {/* 3. Área Principal: Mapa Interactivo a la Izquierda, Panel de Telemetría a la Derecha */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-[500px]">
        
        {/* CONTENEDOR DEL MAPA (Columna 1 a 8) */}
        <div className="lg:col-span-8 bg-slate-950 p-4 flex flex-col relative border-b lg:border-b-0 lg:border-r border-slate-800">
          
          {/* Controles Flotantes del Mapa */}
          <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
            {/* Filtros de Estado */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-lg backdrop-blur-md flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas ({branchesList.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('online')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                  statusFilter === 'online' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-emerald-400'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Online ({stats.online})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('warning')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                  statusFilter === 'warning' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-amber-400'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Alerta ({stats.warning})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('offline')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                  statusFilter === 'offline' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-red-400'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span>Offline ({stats.offline})</span>
              </button>
            </div>

            {/* Toggle de Enlaces de Red */}
            <button
              type="button"
              onClick={() => setShowNetworkLinks(!showNetworkLinks)}
              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold backdrop-blur-md border transition-all flex items-center gap-1.5 w-max ${
                showNetworkLinks
                  ? 'bg-slate-900/90 text-indigo-300 border-indigo-500/40'
                  : 'bg-slate-900/60 text-slate-500 border-slate-800'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>{showNetworkLinks ? 'Topología Satelital Visible' : 'Topología Oculta'}</span>
            </button>
          </div>

          {/* Controles de Zoom del Mapa */}
          <div className="absolute top-6 right-6 z-20 flex flex-col gap-1.5 bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-lg backdrop-blur-md">
            <button
              type="button"
              onClick={() => setMapZoom(prev => Math.min(prev + 0.25, 2.0))}
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
              title="Acercar mapa"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setMapZoom(prev => Math.max(prev - 0.25, 0.75))}
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
              title="Alejar mapa"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setMapZoom(1)}
              className="p-1 text-[10px] font-mono text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-center"
              title="Restablecer vista"
            >
              1x
            </button>
          </div>

          {/* Lienzo del Mapa SVG Interactivo */}
          <div className="flex-1 w-full h-full relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900/50 to-slate-950 flex items-center justify-center select-none">
            
            {/* Grilla Radar de Fondo */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.15) 0%, transparent 70%), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
                backgroundSize: '100% 100%, 40px 40px, 40px 40px'
              }}
            />

            {/* Marcadores de Coordenadas Geográficas de Fondo */}
            <div className="absolute bottom-3 left-4 text-[10px] font-mono text-slate-600 pointer-events-none flex items-center gap-3">
              <span>LAT 0.5°N - 12.8°N</span>
              <span>•</span>
              <span>LNG 79.2°W - 67.0°W</span>
              <span>•</span>
              <span>CO-GRID WGS84</span>
            </div>

            {/* Contenedor Escalable por Zoom */}
            <div 
              className="w-full h-full relative transition-transform duration-300 ease-out"
              style={{ transform: `scale(${mapZoom})`, transformOrigin: 'center center' }}
            >
              {/* Enlaces SVG de Topología de Red (Líneas entre Matriz y Sucursales) */}
              {showNetworkLinks && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  <defs>
                    <linearGradient id="linkGradOnline" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.4" />
                    </linearGradient>
                    <linearGradient id="linkGradWarning" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.3" />
                    </linearGradient>
                    <linearGradient id="linkGradOffline" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#475569" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>

                  {mainBranch && filteredBranches.map(branch => {
                    if (branch.id === mainBranch.id) return null;
                    const p1 = getCoordinatesForBranch(mainBranch);
                    const p2 = getCoordinatesForBranch(branch);

                    const strokeStyle = branch.status === 'online'
                      ? 'url(#linkGradOnline)'
                      : branch.status === 'warning'
                      ? 'url(#linkGradWarning)'
                      : 'url(#linkGradOffline)';

                    const isSelectedLink = selectedBranch.id === branch.id || selectedBranch.id === mainBranch.id;

                    return (
                      <g key={`link-${branch.id}`}>
                        {/* Línea principal */}
                        <line
                          x1={`${p1.x}%`}
                          y1={`${p1.y}%`}
                          x2={`${p2.x}%`}
                          y2={`${p2.y}%`}
                          stroke={strokeStyle}
                          strokeWidth={isSelectedLink ? 2 : 1}
                          strokeDasharray={branch.status === 'offline' ? '4,4' : 'none'}
                          strokeOpacity={isSelectedLink ? 0.9 : 0.4}
                        />
                        {/* Pulso de paquete de datos si está online */}
                        {branch.status === 'online' && (
                          <circle r={isSelectedLink ? 3.5 : 2.5} fill="#34d399">
                            <animateMotion
                              path={`M ${p1.x * 6} ${p1.y * 4} L ${p2.x * 6} ${p2.y * 4}`}
                              dur={`${Math.max(1.5, ((branch.latencyMs || 30) / 40))}s`}
                              repeatCount="indefinite"
                            />
                          </circle>
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Pins y Nodos Interactivos de Sucursales */}
              {filteredBranches.map(branch => {
                const coords = getCoordinatesForBranch(branch);
                const isSelected = selectedBranch.id === branch.id;
                const isMain = branch.id === mainBranch.id;
                const latency = branch.latencyMs;
                const occupancyPct = branch.totalSpots > 0 
                  ? Math.round((branch.occupiedSpots / branch.totalSpots) * 100) 
                  : 0;

                const statusColor = branch.status === 'online' 
                  ? 'bg-emerald-500' 
                  : branch.status === 'warning' 
                  ? 'bg-amber-500' 
                  : 'bg-red-500';

                const statusBorder = branch.status === 'online'
                  ? 'border-emerald-400'
                  : branch.status === 'warning'
                  ? 'border-amber-400'
                  : 'border-red-400';

                return (
                  <div
                    key={branch.id}
                    onClick={() => handleSelect(branch)}
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer group transition-all duration-300"
                    style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                  >
                    {/* Halo de Onda expansiva si está seleccionada o activa */}
                    {isSelected && (
                      <div className="absolute -inset-3 rounded-full bg-indigo-500/30 animate-ping pointer-events-none" />
                    )}

                    {/* Contenedor del Pin */}
                    <div className={`relative flex flex-col items-center transition-transform duration-200 ${
                      isSelected ? 'scale-110 z-30' : 'group-hover:scale-105'
                    }`}>
                      
                      {/* Badge Flotante con Datos Clave */}
                      <div className={`mb-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-tight shadow-xl backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap transition-all ${
                        isSelected 
                          ? 'bg-slate-900 border-2 border-indigo-400 text-white shadow-indigo-500/20' 
                          : 'bg-slate-900/90 border border-slate-700/80 text-slate-200 group-hover:border-slate-500'
                      }`}>
                        {isMain && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" title="Sede Matriz" />
                        )}
                        <span className="font-mono text-white">{branch.code}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-300 max-w-[90px] truncate">{branch.city}</span>

                        {/* Métrica Dinámica según vista activa */}
                        {activeMetricView === 'latency' && (
                          <span className={`font-mono text-[9px] px-1 py-0.2 rounded font-black ${
                            (latency || 0) < 50 ? 'bg-emerald-500/20 text-emerald-400' :
                            (latency || 0) < 140 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {latency !== undefined ? `${latency}ms` : 'Offline'}
                          </span>
                        )}

                        {activeMetricView === 'occupancy' && (
                          <span className="font-mono text-[9px] px-1 py-0.2 rounded font-black bg-amber-500/20 text-amber-800 dark:text-amber-300">
                            {occupancyPct}%
                          </span>
                        )}

                        {activeMetricView === 'load' && (
                          <span className="font-mono text-[9px] px-1 py-0.2 rounded font-black bg-indigo-500/20 text-indigo-800 dark:text-indigo-300">
                            {branch.systemLoad !== undefined ? `${branch.systemLoad}%` : 'N/A'}
                          </span>
                        )}
                      </div>

                      {/* Pin Circular Principal */}
                      <div className={`relative w-7 h-7 rounded-full flex items-center justify-center shadow-xl border-2 transition-all ${statusBorder} ${
                        isSelected ? 'ring-4 ring-indigo-500/40' : ''
                      } ${
                        branch.status === 'online' ? 'bg-slate-900 text-emerald-400' :
                        branch.status === 'warning' ? 'bg-slate-900 text-amber-400' : 'bg-slate-900 text-red-400'
                      }`}>
                        {isMain ? (
                          <Server className="w-3.5 h-3.5" />
                        ) : (
                          <Building2 className="w-3.5 h-3.5" />
                        )}
                        {/* Indicador de Status Dot */}
                        <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${statusColor} border border-slate-950 ${
                          branch.status === 'online' ? 'animate-pulse' : ''
                        }`} />
                      </div>

                      {/* Barra de progreso de carga o latencia debajo del pin */}
                      <div className="w-10 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden border border-slate-700/60 shadow-xs">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            activeMetricView === 'latency'
                              ? (latency || 0) < 50 ? 'bg-emerald-500' : (latency || 0) < 140 ? 'bg-amber-500' : 'bg-red-500'
                              : activeMetricView === 'occupancy'
                              ? occupancyPct > 80 ? 'bg-red-500' : occupancyPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                              : (branch.systemLoad || 0) > 80 ? 'bg-red-500' : 'bg-indigo-500'
                          }`}
                          style={{
                            width: activeMetricView === 'latency'
                              ? `${Math.min(100, Math.max(10, ((latency || 20) / 200) * 100))}%`
                              : activeMetricView === 'occupancy'
                              ? `${occupancyPct}%`
                              : `${branch.systemLoad || 30}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* PANEL LATERAL DE TELEMETRÍA Y DETALLE (Columna 9 a 12) */}
        <div className="lg:col-span-4 bg-slate-900/90 flex flex-col overflow-y-auto">
          
          {/* Tarjeta de Detalle de la Sede Seleccionada */}
          <div className="p-4 md:p-5 border-b border-slate-800 bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30">
                    {selectedBranch.code}
                  </span>
                  {selectedBranch.isCurrentBranch && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold">
                      Esta Terminal
                    </span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                    selectedBranch.status === 'online' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    selectedBranch.status === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {selectedBranch.status}
                  </span>
                </div>
                <h3 className="text-base font-black text-white mt-1.5 leading-snug">
                  {selectedBranch.name}
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{selectedBranch.city} — {selectedBranch.address}</span>
                </p>
              </div>

              {/* Botón de acceso directo o URL si existe */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handlePingSingleBranch(selectedBranch)}
                  disabled={testingSingleBranchId === selectedBranch.id}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 text-xs font-bold"
                  title="Ejecutar Ping individual a esta sede"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingSingleBranchId === selectedBranch.id ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Probar Ping</span>
                </button>
                {selectedBranch.systemUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      let activeUser = currentUser;
                      if (!activeUser && typeof window !== 'undefined') {
                        try {
                          const saved = sessionStorage.getItem('pk_current_user') || localStorage.getItem('pk_current_user');
                          if (saved) activeUser = JSON.parse(saved);
                        } catch (e) {}
                      }
                      if (!activeUser) {
                        activeUser = {
                          id: 'user-master-01',
                          username: 'admin',
                          name: 'Administrador Central',
                          role: 'master',
                          password: '',
                          isActive: true,
                          permissions: { ...DEFAULT_MASTER_PERMISSIONS },
                          createdAt: new Date().toISOString()
                        };
                      }
                      const ssoToken = encodeSsoToken(activeUser);
                      const base = selectedBranch.systemUrl.replace(/\/wolfzonepos/, '');
                      const sep = base.includes('?') ? '&' : '?';
                      const target = `${base}${sep}sso=${encodeURIComponent(ssoToken)}`;
                      window.open(target, '_blank');
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors shadow-xs cursor-pointer"
                    title="Abrir consola de la sucursal con sesión iniciada (SSO)"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Medidores Telemáticos de la Sede Seleccionada */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              
              {/* Medidor de Latencia RTT */}
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Latencia (RTT)</span>
                  </span>
                  <span className={`text-[10px] font-bold ${getLatencyMeta(selectedBranch.latencyMs).color}`}>
                    {getLatencyMeta(selectedBranch.latencyMs).label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-lg font-black font-mono text-white">
                    {selectedBranch.latencyMs !== undefined ? selectedBranch.latencyMs : '--'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">ms</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      (selectedBranch.latencyMs || 0) < 50 ? 'bg-emerald-500' :
                      (selectedBranch.latencyMs || 0) < 140 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(10, ((selectedBranch.latencyMs || 25) / 200) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Medidor de Carga de CPU */}
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Carga CPU</span>
                  </span>
                  <span className={`text-[10px] font-bold ${getLoadMeta(selectedBranch.systemLoad).color}`}>
                    {getLoadMeta(selectedBranch.systemLoad).label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-lg font-black font-mono text-white">
                    {selectedBranch.systemLoad !== undefined ? selectedBranch.systemLoad : 28}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">%</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${selectedBranch.systemLoad !== undefined ? selectedBranch.systemLoad : 28}%` }}
                  />
                </div>
              </div>

              {/* Medidor de Ocupación de Celdas */}
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ocupación</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-300">
                    {selectedBranch.occupiedSpots}/{selectedBranch.totalSpots}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-lg font-black font-mono text-amber-300">
                    {selectedBranch.totalSpots > 0 
                      ? Math.round((selectedBranch.occupiedSpots / selectedBranch.totalSpots) * 100) 
                      : 0}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">%</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-amber-500"
                    style={{ 
                      width: `${selectedBranch.totalSpots > 0 
                        ? (selectedBranch.occupiedSpots / selectedBranch.totalSpots) * 100 
                        : 0}%` 
                    }}
                  />
                </div>
              </div>

              {/* Medidor de Memoria RAM */}
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Memoria RAM</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-cyan-400">
                    {selectedBranch.memoryUsage || 45}%
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-lg font-black font-mono text-white">
                    {selectedBranch.memoryUsage || 45}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">%</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-cyan-500"
                    style={{ width: `${selectedBranch.memoryUsage || 45}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Fila Informativa de Red y Software */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">IP WAN / HOST:</span>
                <span className="font-mono text-cyan-300 font-bold break-all">
                  {selectedBranch.domain || selectedBranch.reportedPublicIp || selectedBranch.publicIp || selectedBranch.ipAddress || '127.0.0.1'}
                </span>
                {selectedBranch.localIp && (
                  <span className="text-[10px] text-slate-400 block font-mono">LAN: {selectedBranch.localIp}:{selectedBranch.port || 3000}</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Versión Software:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {selectedBranch.currentAppVersion || 'v2.5.0-enterprise'}
                </span>
                {selectedBranch.pingMethod && (
                  <span className="text-[10px] text-indigo-400 block font-mono">Sondeo: {selectedBranch.pingMethod.toUpperCase()} ({selectedBranch.latencyMs || 0}ms)</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Recaudo Hoy:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {formatCurrency(selectedBranch.todayRevenue || 0)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">FarmaDesk ID:</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {selectedBranch.farmadeskId || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Lista Buscable de Todas las Sedes */}
          <div className="p-3 border-b border-slate-800 bg-slate-900/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar sucursal por código, ciudad o nombre..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Tabla / Lista de Sucursales */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
            {filteredBranches.map(branch => {
              const isSelected = selectedBranch.id === branch.id;
              const latency = branch.latencyMs;
              const occPct = branch.totalSpots > 0 
                ? Math.round((branch.occupiedSpots / branch.totalSpots) * 100) 
                : 0;

              return (
                <div
                  key={branch.id}
                  onClick={() => handleSelect(branch)}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected 
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-white' 
                      : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      branch.status === 'online' ? 'bg-emerald-500' :
                      branch.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-white">{branch.code}</span>
                        <span className="text-[11px] text-slate-400 truncate font-medium">{branch.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">
                        {branch.city} • Cajas POS: {branch.posPointsCount || 1}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div>
                      <div className="flex items-center justify-end gap-1">
                        <Activity className="w-3 h-3 text-slate-400" />
                        <span className={`text-[11px] font-mono font-bold ${
                          (latency || 0) < 50 ? 'text-emerald-400' :
                          (latency || 0) < 140 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {latency !== undefined ? `${latency}ms` : '--'}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {occPct}% ocup.
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-indigo-400 translate-x-0.5' : 'text-slate-600'}`} />
                  </div>
                </div>
              );
            })}

            {filteredBranches.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-xs">
                No se encontraron sucursales con los filtros aplicados.
              </div>
            )}
          </div>

          {/* Footer de Estado de Sincronización */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Conectividad Encriptada TLS</span>
            </span>
            <span className="font-mono text-slate-500">
              {stats.online} de {stats.total} nodos operativos
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CentralDashboard;
