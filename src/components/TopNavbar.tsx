import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  DollarSign, 
  Volume2, 
  VolumeX, 
  Radio, 
  BookOpen, 
  RefreshCw, 
  Lock, 
  Sun, 
  Moon, 
  Menu,
  ChevronRight,
  MapPin,
  Calendar,
  Home,
  ShieldCheck,
  Eye,
  Sliders,
  Sparkles,
  Car,
  HardDrive,
  Check,
  Laptop,
  Printer
} from 'lucide-react';
import { 
  ParkingBusinessInfo, 
  ParkingSpot, 
  ParkingTicket, 
  CashShift, 
  TerminalConfig, 
  SystemUser, 
  OperationalDay, 
  BranchLocation, 
  SystemNodeConfig 
} from '../types';
import { formatCurrency } from '../utils/billing';
import { WorkspaceCategory, ActiveWorkspaceView } from '../types/routes';
import { ContrastLevel, ThemeManager, ThemeMode, ThemeScope } from '../utils/themeManager';

export interface DiskSpaceInfo {
  freeMB: number;
  totalMB: number;
  freeGB: number;
  totalGB: number;
  isCritical: boolean;
  isWarning: boolean;
}

interface TopNavbarProps {
  businessInfo: ParkingBusinessInfo;
  activeCategory: WorkspaceCategory;
  activeView: ActiveWorkspaceView;
  setActiveView: (view: ActiveWorkspaceView, cat?: WorkspaceCategory) => void;
  spots: ParkingSpot[];
  activeTickets: ParkingTicket[];
  todayPaidTickets: ParkingTicket[];
  currentShift: CashShift;
  operationalDay?: OperationalDay;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  terminalConfig: TerminalConfig;
  onLockTerminal?: () => void;
  currentUser: SystemUser;
  onLogout: () => void;
  currentBranch?: BranchLocation;
  systemNodeConfig?: SystemNodeConfig;
  onManualSync?: () => Promise<void>;
  isSyncingGlobal?: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  contrastLevel?: ContrastLevel;
  onSelectContrastLevel?: (level: ContrastLevel) => void;
  onOpenSyncModal?: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  diskSpaceInfo?: DiskSpaceInfo | null;
  pendingCentralUpdatesCount?: number;
  softwareUpdateAvailable?: boolean;
  onOpenPrinterModal?: () => void;
}

export const ThemeToggleDropdown: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => ThemeManager.getTheme());

  useEffect(() => {
    if (isDarkMode !== undefined) {
      setTheme(isDarkMode ? 'dark' : 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const unsub = ThemeManager.subscribeTheme((mode) => {
      setTheme(mode);
    });
    return unsub;
  }, []);

  const handleQuickToggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    ThemeManager.applyTheme(next, 'global_project');
    setTheme(next);
  };

  const handleSelect = (mode: ThemeMode, scope: ThemeScope) => {
    ThemeManager.applyTheme(mode, scope);
    setTheme(mode);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Botón principal de cambio inmediato con 1 clic */}
      <button
        type="button"
        onClick={handleQuickToggle}
        className="p-1.5 sm:px-2.5 rounded-l-xl border border-r-0 border-[var(--border-subtle)] bg-[var(--bg-surface-2)] text-[var(--text-primary)] hover:border-[var(--primary)] hover:bg-[var(--bg-surface-hover)] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs group"
        title={theme === 'dark' ? 'Cambiar a Modo Claro (Luz Solar)' : 'Cambiar a Modo Oscuro (Cabina POS)'}
        aria-label="Alternar Tema Claro / Oscuro"
      >
        {theme === 'dark' ? (
          <Moon className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
        ) : (
          <Sun className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
        )}
        <span className="text-[11px] font-bold hidden md:inline">
          {theme === 'dark' ? 'Oscuro' : 'Claro'}
        </span>
      </button>

      {/* Selector de ámbito (Ventana activa vs Todo el sistema) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 px-1.5 rounded-r-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--primary)] hover:bg-[var(--bg-surface-hover)] transition-all cursor-pointer flex items-center shadow-2xs"
        title="Opciones de visualización (Global / Solo esta pestaña)"
        aria-label="Opciones de tema"
      >
        <span className="text-[9px] font-bold">▾</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-strong)] shadow-2xl p-2 z-50 text-xs animate-in fade-in">
            <div className="px-2 py-1.5 text-[10px] font-mono uppercase font-bold text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
              Tema POS (Claro / Oscuro)
            </div>

            <div className="py-1 space-y-1">
              <button
                type="button"
                onClick={() => handleSelect('dark', 'global_project')}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-left font-bold cursor-pointer transition-colors ${
                  theme === 'dark' ? 'bg-[var(--primary)] text-[var(--primary-contrast)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-amber-400" />
                  <span>Modo Oscuro (Global)</span>
                </div>
                {theme === 'dark' && <Check className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => handleSelect('light', 'global_project')}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-left font-bold cursor-pointer transition-colors ${
                  theme === 'light' ? 'bg-[var(--primary)] text-[var(--primary-contrast)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Modo Claro (Global)</span>
                </div>
                {theme === 'light' && <Check className="w-4 h-4" />}
              </button>
            </div>

            <div className="pt-1.5 mt-1 border-t border-[var(--border-subtle)]">
              <div className="px-2 py-1 text-[9px] font-mono text-[var(--text-muted)]">
                Solo esta ventana:
              </div>
              <button
                type="button"
                onClick={() => handleSelect(theme === 'dark' ? 'light' : 'dark', 'active_window')}
                className="w-full flex items-center gap-2 p-2 rounded-xl text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Invertir solo en esta pestaña</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeCategory,
  activeView,
  setActiveView,
  spots,
  todayPaidTickets,
  currentShift,
  operationalDay,
  soundEnabled,
  setSoundEnabled,
  onLockTerminal,
  currentUser,
  currentBranch,
  onManualSync,
  isSyncingGlobal = false,
  isDarkMode,
  onToggleTheme,
  contrastLevel = 'medium',
  onSelectContrastLevel,
  onOpenSyncModal,
  isSidebarCollapsed,
  onToggleSidebar,
  diskSpaceInfo,
  pendingCentralUpdatesCount = 0,
  softwareUpdateAvailable = false,
  onOpenPrinterModal
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalSpots = spots.length;
  const occupiedSpots = spots.filter(s => s.status === 'occupied').length;
  const availableSpots = spots.filter(s => s.status === 'available').length;
  const occupancyRate = totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 100) : 0;
  const totalCollectedToday = todayPaidTickets.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

  // Métricas y porcentajes de almacenamiento de disco (usado vs libre)
  const diskTotalMB = diskSpaceInfo?.totalMB || (diskSpaceInfo?.totalGB ? Math.round(diskSpaceInfo.totalGB * 1024) : 20480);
  const diskFreeMB = diskSpaceInfo?.freeMB ?? (diskSpaceInfo?.freeGB ? Math.round(diskSpaceInfo.freeGB * 1024) : 5120);
  const diskUsedMB = Math.max(0, diskTotalMB - diskFreeMB);
  const diskUsedPercent = diskTotalMB > 0 ? Math.min(100, Math.max(0, Math.round((diskUsedMB / diskTotalMB) * 100))) : 0;
  const isDiskCritical = Boolean(diskSpaceInfo?.isCritical || (diskSpaceInfo && diskFreeMB < 500));
  const isDiskWarning = Boolean(diskSpaceInfo?.isWarning || (diskSpaceInfo && diskFreeMB < 1024));

  const formattedTime = currentTime.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const getCategoryLabel = (cat: WorkspaceCategory): string => {
    switch (cat) {
      case 'operations': return 'Operaciones';
      case 'finance': return 'Finanzas';
      case 'reports': return 'Informes';
      case 'central': return 'Red';
      case 'updates': return 'Actualizaciones';
      case 'config': return 'Configuración';
      default: return cat;
    }
  };

  const getViewLabel = (view: ActiveWorkspaceView): string => {
    switch (view) {
      case 'operations': return 'Patio POS';
      case 'map': return 'Mapa de Plazas';
      case 'spots': return 'Gestión Plazas';
      case 'anpr_camera': return 'Cámaras LPR';
      case 'cash': return 'Turno & Caja';
      case 'expense_concepts': return 'Conceptos Gasto';
      case 'reports': return 'Reportes';
      case 'branches': return 'Sedes';
      case 'central_hub': return 'Matriz Central';
      case 'central_dashboard': return 'Telemetría';
      case 'branch_sync': return 'Sincronización';
      case 'vnc_remote': return 'Acceso Remoto';
      case 'rates': return 'Tarifas';
      case 'vehicle_categories': return 'Categorías';
      case 'users': return 'Usuarios';
      case 'database': return 'Base de Datos';
      case 'software_updater': return 'Actualizaciones';
      case 'work_mode': return 'Modo de Red';
      default: return view;
    }
  };

  const handleSwitchView = (view: ActiveWorkspaceView) => {
    setActiveView(view, view === 'operations' ? 'operations' : activeCategory);
  };

  const operationalDateStr = operationalDay?.formattedDate || currentTime.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const shiftNum = currentShift?.shiftNumber || 1;

  return (
    <header className="sticky top-2 sm:top-3 z-30 mx-2 sm:mx-6 mb-3 sm:mb-4 select-none">
      <div className="uupm-floating-navbar rounded-2xl px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3 transition-all">
        
        {/* Zone 1: Brand & Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Alternar barra lateral"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Quick Home action */}
          <button
            type="button"
            onClick={() => handleSwitchView('operations')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeView === 'operations'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-xs hardware-btn-amber ring-2 ring-amber-400/40'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
            title="Ir a Taquilla Patio POS"
          >
            <Car className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-display uppercase tracking-wider text-[11px]">Patio POS</span>
          </button>

          {/* Unboxed Breadcrumb Trail */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium truncate">
            <span className="hidden lg:inline">{getCategoryLabel(activeCategory)}</span>
            <span className="hidden lg:inline opacity-60">·</span>
            <span className="font-bold font-display text-slate-900 dark:text-white truncate uppercase tracking-tight">
              {getViewLabel(activeView)}
            </span>
          </div>

          {/* Sede & Turno context */}
          <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-800 text-[11px] font-mono-tech text-slate-700 dark:text-slate-300">
            {currentBranch && (
              <span className="flex items-center gap-1 font-semibold truncate max-w-[130px]">
                <MapPin className="w-3 h-3 text-cyan-500 shrink-0" />
                <span className="truncate">{currentBranch.name}</span>
              </span>
            )}
            <span className="text-slate-400 dark:text-slate-600">·</span>
            <button
              type="button"
              onClick={() => setActiveView('cash', 'finance')}
              className="flex items-center gap-1 font-semibold hover:text-amber-500 transition-colors cursor-pointer"
              title="Ver turno en caja"
            >
              <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
              <span>{operationalDateStr}</span>
              <span className="font-mono-tech font-bold text-amber-700 dark:text-amber-300">(T{shiftNum})</span>
            </button>
          </div>
        </div>

        {/* Zone 2: Live Operational Metrics Strip (Aero-Kiosk Telemetry) */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Plazas Libres / Ocupadas */}
          {currentUser.permissions.uiVisibility?.showOccupancyWidget !== false && (
            <button
              type="button"
              onClick={() => setActiveView('map', 'operations')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 hover:border-amber-500/40 transition-all cursor-pointer text-xs"
              title="Ver radar de bahías"
            >
              <span className="text-[10px] uppercase font-mono-tech font-bold text-cyan-600 dark:text-cyan-400">Bahías</span>
              <span className="font-extrabold font-mono-tech tabular-nums text-slate-950 dark:text-white">
                {occupiedSpots}/{totalSpots}
              </span>
              <span className={`text-[10px] font-mono-tech font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1.5 ${
                occupancyRate > 85
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 led-beacon-occupied'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 led-beacon-free'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${occupancyRate > 85 ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`} />
                {availableSpots} libres
              </span>
            </button>
          )}

          {/* Recaudo del Turno */}
          {currentUser.permissions.uiVisibility?.showTopRevenueMetrics !== false && (
            <button
              type="button"
              onClick={() => setActiveView('cash', 'finance')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 hover:border-amber-500/40 transition-all cursor-pointer text-xs"
              title="Ver arqueo de caja"
            >
              <DollarSign className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] uppercase font-mono-tech font-bold text-amber-600 dark:text-amber-400">Recaudo</span>
              <span className="font-mono-tech font-black tabular-nums text-amber-600 dark:text-amber-400">
                {formatCurrency(totalCollectedToday)}
              </span>
            </button>
          )}
        </div>

        {/* Zone 3: Quick Action Command Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Widget Visual de Almacenamiento y Gráfica de Barra de Progreso (Espacio Usado vs Libre) */}
          {diskSpaceInfo && (
            <div
              className={`flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition-all select-none ${
                isDiskCritical
                  ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400 border-rose-500/50 shadow-xs shadow-rose-900/30 animate-pulse'
                  : isDiskWarning
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title={`Almacenamiento: ${diskUsedPercent}% usado (${(diskUsedMB / 1024).toFixed(1)} GB usados de ${(diskTotalMB / 1024).toFixed(1)} GB totales). Espacio libre: ${diskSpaceInfo.freeGB >= 1 ? `${diskSpaceInfo.freeGB} GB` : `${diskSpaceInfo.freeMB} MB`}`}
            >
              <div className="flex items-center gap-1.5 shrink-0">
                <HardDrive className={`w-3.5 h-3.5 shrink-0 ${isDiskCritical ? 'text-rose-500 animate-bounce' : isDiskWarning ? 'text-amber-500' : 'text-emerald-500'}`} />
                <span className="hidden xl:inline text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                  Disco
                </span>
              </div>

              {/* Pequeña gráfica de barra de progreso del almacenamiento */}
              <div className="flex flex-col gap-0.5 min-w-[54px] sm:min-w-[76px]">
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700/80 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${diskUsedPercent}%` }}
                    className={`h-full transition-all duration-500 rounded-full ${
                      isDiskCritical
                        ? 'bg-rose-500'
                        : isDiskWarning
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between text-[9px] font-mono leading-none tracking-tight">
                  <span className={isDiskCritical ? 'text-rose-500 dark:text-rose-400 font-extrabold' : isDiskWarning ? 'text-amber-600 dark:text-amber-400 font-extrabold' : 'text-slate-600 dark:text-slate-400'}>
                    {diskUsedPercent}%
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold hidden sm:inline">
                    {diskSpaceInfo.freeGB >= 1 ? `${diskSpaceInfo.freeGB}GB` : `${diskSpaceInfo.freeMB}MB`} lib
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Clock (Digital Cockpit Telemetry) */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono-tech tabular-nums font-black text-slate-800 dark:text-cyan-400 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-cyan-500" />
            <span className="tracking-wider">{formattedTime}</span>
          </div>

          {/* Active alerts icon */}
          {onOpenSyncModal && (
            <button
              type="button"
              onClick={onOpenSyncModal}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 transition-all cursor-pointer relative"
              title="Alertas & Sincronización de Red"
              aria-label="Alertas de Red"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-500" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            </button>
          )}

          {/* Acceso Directo a Configuración de Impresora y Papel Térmico */}
          {onOpenPrinterModal && (
            <button
              type="button"
              onClick={onOpenPrinterModal}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 transition-all cursor-pointer relative"
              title="Configuración de Impresora Térmica (80mm/58mm)"
              aria-label="Configuración de Impresora"
            >
              <Printer className="w-3.5 h-3.5 text-amber-500" />
            </button>
          )}

          {/* Acceso Directo a Paquetes de Sincronización si hay cambios pendientes */}
          {pendingCentralUpdatesCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveView('branch_sync', 'central')}
              className="p-1.5 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-800 dark:text-amber-300 transition-all cursor-pointer text-xs flex items-center gap-1.5 animate-pulse"
              title={`${pendingCentralUpdatesCount} paquete(s) de cambios y parámetros listos para aplicar en esta sucursal`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-mono text-[11px] font-extrabold">{pendingCentralUpdatesCount} cambios</span>
            </button>
          )}

          {/* Acceso Directo a Actualización de Software si hay versión nueva */}
          {softwareUpdateAvailable && (
            <button
              type="button"
              onClick={() => setActiveView('software_updater', 'updates')}
              className="p-1.5 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/30 animate-pulse font-bold"
              title="Nueva versión de software disponible. Clic para actualizar."
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden xl:inline text-[11px]">Actualizar Sistema</span>
            </button>
          )}

          {/* Theme Mode & Scope Dropdown (Ventana Activa vs. Todo el Proyecto) */}
          <ThemeToggleDropdown isDarkMode={isDarkMode} />

          {/* Contrast Selector */}
          {onSelectContrastLevel && (
            <button
              type="button"
              onClick={() => {
                const levels: ContrastLevel[] = ['low', 'medium', 'high'];
                const nextIdx = (levels.indexOf(contrastLevel) + 1) % levels.length;
                onSelectContrastLevel(levels[nextIdx]);
              }}
              className="p-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex items-center gap-1"
              title={`Contraste: ${contrastLevel.toUpperCase()}`}
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[10px] font-mono font-bold uppercase">
                {contrastLevel === 'high' ? 'AAA' : contrastLevel === 'medium' ? 'AA' : 'A'}
              </span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 sm:p-2 rounded-xl border transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                : 'bg-rose-100 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}
            title={soundEnabled ? 'Sonido activado' : 'Sonido silenciado'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Lock Terminal */}
          {onLockTerminal && (
            <button
              type="button"
              onClick={onLockTerminal}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-300 transition-all cursor-pointer"
              title="Bloquear Terminal"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
