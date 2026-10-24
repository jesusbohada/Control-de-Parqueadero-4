import React, { useState, useRef, useEffect } from 'react';
import { 
  Car, 
  DollarSign, 
  BarChart3, 
  Users, 
  Map, 
  Camera, 
  Server, 
  Plus, 
  X, 
  Printer, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  Pin, 
  Layers, 
  Sparkles, 
  ChevronDown, 
  RotateCcw, 
  FileText,
  CreditCard,
  Building2,
  HardDrive
} from 'lucide-react';
import { ActiveWorkspaceView, WorkspaceCategory } from '../types/routes';

export interface WorkspaceTabItem {
  id: string;
  title: string;
  view: ActiveWorkspaceView;
  category: WorkspaceCategory;
  statusBadge?: string;
  statusVariant?: 'success' | 'warning' | 'info' | 'neutral' | 'danger';
  hasUnsavedChanges?: boolean;
  isPinned?: boolean;
  ticketPlate?: string;
  createdAt: number;
}

interface WorkspaceTabBarProps {
  tabs: WorkspaceTabItem[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: (view: ActiveWorkspaceView, category?: WorkspaceCategory, customTitle?: string) => void;
  isPrinting?: boolean;
  lastPrintedInfo?: {
    ticketNumber?: string;
    plate?: string;
    timestamp: Date;
    success: boolean;
    printerName?: string;
  } | null;
  onReprintLast?: () => void;
  hasLastTicketToReprint?: boolean;
}

export const WorkspaceTabBar: React.FC<WorkspaceTabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  isPrinting = false,
  lastPrintedInfo = null,
  onReprintLast,
  hasLastTicketToReprint = false,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [tabToConfirmClose, setTabToConfirmClose] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut listener: Alt+1..9 to switch tabs, Alt+T for new tab, Alt+W to close active
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Alt+1..9
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= tabs.length) {
          e.preventDefault();
          onSelectTab(tabs[num - 1].id);
          return;
        }
        if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          onNewTab('operations', 'operations', `Patio POS #${tabs.length + 1}`);
          return;
        }
        if (e.key.toLowerCase() === 'w') {
          e.preventDefault();
          const activeTab = tabs.find(t => t.id === activeTabId);
          if (activeTab && !activeTab.isPinned) {
            handleCloseClick(activeTab.id, activeTab.hasUnsavedChanges);
          }
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, onSelectTab, onNewTab]);

  const handleCloseClick = (tabId: string, hasUnsavedChanges?: boolean) => {
    if (hasUnsavedChanges) {
      setTabToConfirmClose(tabId);
    } else {
      onCloseTab(tabId);
    }
  };

  const getTabIcon = (view: ActiveWorkspaceView) => {
    const iconClass = "w-3.5 h-3.5 shrink-0";
    switch (view) {
      case 'operations':
        return <Car className={iconClass} />;
      case 'map':
      case 'spots':
        return <Map className={iconClass} />;
      case 'cash':
      case 'cash_history':
        return <DollarSign className={iconClass} />;
      case 'reports':
        return <BarChart3 className={iconClass} />;
      case 'subscribers':
        return <Users className={iconClass} />;
      case 'anpr_camera':
        return <Camera className={iconClass} />;
      case 'central_hub':
      case 'branches':
      case 'branch_sync':
        return <Server className={iconClass} />;
      case 'agreements':
        return <Building2 className={iconClass} />;
      default:
        return <Layers className={iconClass} />;
    }
  };

  const getBadgeStyle = (variant?: 'success' | 'warning' | 'info' | 'neutral' | 'danger') => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25';
      case 'warning':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25 animate-pulse';
      case 'danger':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/25';
      case 'info':
        return 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/25';
      default:
        return 'bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="pk-workspace-tabbar w-full bg-[var(--bg-surface-1)] border-b-2 border-slate-200 dark:border-slate-800 px-2 sm:px-4 py-1.5 flex items-center justify-between gap-2 overflow-x-auto select-none backdrop-blur-md sticky top-0 z-20 shadow-xs">
      {/* Tabs Container */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 max-w-[calc(100vw-280px)]">
        {tabs.map((tab, idx) => {
          const isActive = tab.id === activeTabId;
          const shortcutNum = idx + 1 <= 9 ? idx + 1 : null;

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`pk-tab-item group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all shrink-0 ${
                isActive
                  ? 'pk-tab-active bg-[var(--bg-surface-2)] text-amber-900 dark:text-amber-300 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                  : 'pk-tab-inactive bg-slate-100/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
              }`}
              title={`${tab.title} ${shortcutNum ? `(Alt+${shortcutNum})` : ''}`}
            >
              {/* Active Tab Accent Bar */}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-amber-500 rounded-full" />
              )}

              {/* Hardware LED Station Dot */}
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                isActive
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse'
                  : tab.hasUnsavedChanges
                  ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]'
                  : 'bg-slate-400 dark:bg-slate-600 opacity-60'
              }`} />

              {/* Icon & Title */}
              <div className="flex items-center gap-1.5">
                <span className={`${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  {getTabIcon(tab.view)}
                </span>
                <span className="truncate max-w-[130px] sm:max-w-[160px] font-bold">
                  {tab.title}
                </span>
              </div>

              {/* Status Badge */}
              {tab.statusBadge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold border uppercase tracking-wider ${getBadgeStyle(tab.statusVariant)}`}>
                  {tab.statusBadge}
                </span>
              )}

              {/* Unsaved Changes Indicator Dot */}
              {tab.hasUnsavedChanges && (
                <span 
                  className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-500/30 animate-pulse" 
                  title="Esta pestaña contiene datos o un proceso sin finalizar" 
                />
              )}

              {/* Shortcut hint */}
              {shortcutNum && (
                <span className="hidden md:inline-block text-[9px] font-mono px-1 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                  Alt+{shortcutNum}
                </span>
              )}

              {/* Pin or Close Button */}
              {tab.isPinned ? (
                <Pin className="w-3 h-3 text-slate-400 dark:text-slate-600 opacity-50 ml-0.5" />
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseClick(tab.id, tab.hasUnsavedChanges);
                  }}
                  className="w-4 h-4 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors ml-0.5 cursor-pointer"
                  title="Cerrar pestaña (Alt+W)"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Quick "+" Add Tab Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="pk-add-tab-btn flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/40 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-400 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Abrir nueva pestaña independiente (Alt+T)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nueva Estación</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {/* Dropdown Menu for New Tab */}
          {isDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 text-xs">
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Abrir en Nueva Pestaña
              </div>

              <button
                type="button"
                onClick={() => {
                  onNewTab('operations', 'operations', `Patio POS #${tabs.length + 1}`);
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-800 dark:text-slate-200 font-semibold"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Car className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold">Patio POS (Entrada y Salida)</div>
                  <div className="text-[10px] text-slate-400">Terminal operativa de parqueadero</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNewTab('subscribers', 'operations', 'Mensualidades y Abonados');
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-800 dark:text-slate-200 font-semibold"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold">Abonados / Mensualidades</div>
                  <div className="text-[10px] text-slate-400">Suscripciones y cobro mensual</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNewTab('cash', 'finance', 'Arqueo de Turno y Caja');
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-800 dark:text-slate-200 font-semibold"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold">Arqueo y Movimientos de Caja</div>
                  <div className="text-[10px] text-slate-400">Control de bóveda y cierre de turno</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNewTab('reports', 'reports', 'Reportes y Cierre Z');
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-800 dark:text-slate-200 font-semibold"
              >
                <div className="w-6 h-6 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                  <BarChart3 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold">Reportes en Tiempo Real</div>
                  <div className="text-[10px] text-slate-400">Estadísticas, ocupación y ventas</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNewTab('map', 'operations', 'Mapa de Plazas');
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-800 dark:text-slate-200 font-semibold"
              >
                <div className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                  <Map className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold">Mapa de Plazas / Celdas</div>
                  <div className="text-[10px] text-slate-400">Visualización espacial de cupos</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNewTab('anpr_camera', 'operations', 'Cámaras ANPR LPR');
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-800 dark:text-slate-200 font-semibold"
              >
                <div className="w-6 h-6 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                  <Camera className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold">Cámaras IP / ANPR LPR</div>
                  <div className="text-[10px] text-slate-400">Reconocimiento automático de placas</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Action Tools: Print Status & Quick Reprint */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Real-time Thermal Print Feedback Badge */}
        {isPrinting ? (
          <div className="pk-print-status-active flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold animate-pulse">
            <Printer className="w-3.5 h-3.5 animate-bounce" />
            <span className="hidden sm:inline">Enviando a impresora...</span>
          </div>
        ) : lastPrintedInfo ? (
          <div className="pk-print-status-success hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="truncate max-w-[120px]">
              {lastPrintedInfo.plate ? `Recibo ${lastPrintedInfo.plate}` : 'Recibo impreso'}
            </span>
          </div>
        ) : null}

        {/* Quick Reprint Button (Ctrl+P / F8) */}
        {hasLastTicketToReprint && onReprintLast && (
          <button
            type="button"
            onClick={onReprintLast}
            className="pk-reprint-btn flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Reimprimir el último recibo o ticket generado por atasco de papel (F8)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden lg:inline">Reimprimir Último</span>
            <span className="hidden sm:inline lg:hidden">Reimprimir</span>
          </button>
        )}
      </div>

      {/* Confirmation Modal when Closing Tab with Unsaved Changes */}
      {tabToConfirmClose && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-3">
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 font-bold">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h4 className="text-sm">¿Cerrar pestaña en proceso?</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Esta pestaña contiene una operación a medio llenar o datos sin guardar. Si la cierras, los cambios temporales de esta pestaña se descartarán.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTabToConfirmClose(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Continuar trabajando
              </button>
              <button
                type="button"
                onClick={() => {
                  onCloseTab(tabToConfirmClose);
                  setTabToConfirmClose(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer shadow-sm"
              >
                Cerrar Pestaña
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
