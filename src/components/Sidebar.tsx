import React from 'react';
import { 
  Car, 
  LayoutGrid, 
  Layers, 
  Camera, 
  DollarSign, 
  FileText, 
  BarChart3, 
  Building2, 
  Server, 
  RefreshCw, 
  Monitor, 
  Sliders, 
  Tag, 
  Users, 
  UserCheck,
  Database, 
  Sparkles, 
  Radio, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Sun,
  Moon,
  ShieldCheck,
  Crown,
  Briefcase,
  User as UserIcon,
  CircleDot,
  Eye,
  ExternalLink,
  Printer
} from 'lucide-react';
import { 
  ParkingBusinessInfo, 
  BranchLocation, 
  SystemNodeConfig, 
  SystemUser 
} from '../types';
import { WorkspaceCategory, ActiveWorkspaceView } from '../types/routes';
import { ContrastLevel } from '../utils/themeManager';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  businessInfo: ParkingBusinessInfo;
  currentBranch?: BranchLocation;
  systemNodeConfig?: SystemNodeConfig;
  activeRemoteSession?: {
    branchId: string;
    branchName: string;
    city: string;
    ipAddress: string;
    mode: 'system' | 'desktop';
  } | null;
  activeCategory: WorkspaceCategory;
  setActiveCategory: (cat: WorkspaceCategory) => void;
  activeView: ActiveWorkspaceView;
  setActiveView: (view: ActiveWorkspaceView, cat?: WorkspaceCategory) => void;
  currentUser: SystemUser;
  onLogout: () => void;
  activeTicketsCount: number;
  pendingCentralUpdatesCount?: number;
  softwareUpdateAvailable?: boolean;
  onToggleTheme?: () => void;
  isDarkMode?: boolean;
  contrastLevel?: ContrastLevel;
  onSelectContrastLevel?: (level: ContrastLevel) => void;
}

interface NavItem {
  id: ActiveWorkspaceView;
  category: WorkspaceCategory;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
  requiredPermission?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  businessInfo,
  currentBranch,
  activeCategory,
  activeView,
  setActiveView,
  currentUser,
  onLogout,
  activeTicketsCount,
  pendingCentralUpdatesCount = 0,
  softwareUpdateAvailable = false,
  onToggleTheme,
  isDarkMode,
  contrastLevel = 'medium',
  onSelectContrastLevel
}) => {
  const navSections: { title: string; items: NavItem[] }[] = [
    {
      title: 'Operaciones',
      items: [
        {
          id: 'operations',
          category: 'operations',
          label: 'Patio POS',
          shortLabel: 'POS',
          icon: Car,
          badge: activeTicketsCount > 0 ? activeTicketsCount : undefined,
          badgeColor: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-mono font-bold',
          requiredPermission: currentUser.permissions.canRegisterEntry || currentUser.permissions.canRegisterExit,
        },
        {
          id: 'map',
          category: 'operations',
          label: 'Mapa de Plazas',
          shortLabel: 'Mapa',
          icon: LayoutGrid,
        },
        {
          id: 'subscribers',
          category: 'operations',
          label: 'Abonados / Mensualidades',
          shortLabel: 'Abonados',
          icon: UserCheck,
        },
      ],
    },
    {
      title: 'Caja & Finanzas',
      items: [
        {
          id: 'cash',
          category: 'finance',
          label: 'Turno & Caja',
          shortLabel: 'Caja',
          icon: DollarSign,
          requiredPermission: currentUser.permissions.canManageCashShift,
        },
        {
          id: 'expense_concepts',
          category: 'finance',
          label: 'Conceptos Gasto',
          shortLabel: 'Gastos',
          icon: FileText,
          requiredPermission: currentUser.permissions.canManageExpenseConcepts,
        },
        {
          id: 'reports',
          category: 'reports',
          label: 'Reportes & Ventas',
          shortLabel: 'Reportes',
          icon: BarChart3,
          requiredPermission: currentUser.permissions.canViewReports,
        },
      ],
    },
    {
      title: 'Configuración & Negocio',
      items: [
        {
          id: 'rates',
          category: 'config',
          label: 'Tarifas & Cobro',
          shortLabel: 'Tarifas',
          icon: Sliders,
          requiredPermission: currentUser.permissions.canEditRates,
        },
        {
          id: 'vehicle_categories',
          category: 'config',
          label: 'Categorías Vehículo',
          shortLabel: 'Vehículos',
          icon: Tag,
        },
        {
          id: 'spots',
          category: 'config',
          label: 'Capacidad de Plazas',
          shortLabel: 'Plazas',
          icon: Layers,
          requiredPermission: currentUser.permissions.canManageSpots || currentUser.permissions.canEditRates,
        },
        {
          id: 'users',
          category: 'config',
          label: 'Usuarios & Cajeros',
          shortLabel: 'Usuarios',
          icon: Users,
          requiredPermission: currentUser.permissions.canManageUsers,
        },
        {
          id: 'printer_config',
          category: 'config',
          label: 'Impresoras & Tickets',
          shortLabel: 'Impresión',
          icon: Printer,
          requiredPermission: currentUser.permissions.canEditBusinessInfo ?? (currentUser.role === 'master' || currentUser.role === 'supervisor'),
        },
      ],
    },
    {
      title: 'Red & Mantenimiento',
      items: [
        {
          id: 'branches',
          category: 'central',
          label: 'Red de Sedes & FarmaDesk',
          shortLabel: 'Sedes',
          icon: Building2,
        },
        {
          id: 'branch_sync',
          category: 'central',
          label: 'Sincronización & Parámetros',
          shortLabel: 'Sincro',
          icon: RefreshCw,
          badge: pendingCentralUpdatesCount > 0 ? pendingCentralUpdatesCount : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono font-bold',
          requiredPermission: currentUser.permissions.canSyncWithCentralServer ?? (currentUser.role === 'master' || currentUser.role === 'supervisor'),
        },
        {
          id: 'software_updater',
          category: 'updates',
          label: 'Actualización del Sistema',
          shortLabel: 'Versión',
          icon: Sparkles,
          badge: softwareUpdateAvailable ? 'Nueva' : undefined,
          badgeColor: 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 font-mono font-bold animate-pulse',
          requiredPermission: currentUser.permissions.canPerformAppUpdates ?? (currentUser.role === 'master' || currentUser.role === 'supervisor'),
        },
        {
          id: 'database',
          category: 'config',
          label: 'Base de Datos & Backup',
          shortLabel: 'Datos',
          icon: Database,
          requiredPermission: currentUser.permissions.canManageDatabase,
        },
      ],
    },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'master':
        return { label: 'Maestro', icon: Crown, color: 'text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/40' };
      case 'supervisor':
        return { label: 'Supervisor', icon: ShieldCheck, color: 'text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-500/40' };
      case 'cashier':
      default:
        return { label: 'Cajero', icon: Briefcase, color: 'text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40' };
    }
  };

  const roleMeta = getRoleBadge(currentUser.role);
  const RoleIcon = roleMeta.icon;

  const [openInNewTab, setOpenInNewTab] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pk_open_modules_new_tab') === 'true';
    }
    return false;
  });

  const toggleOpenInNewTab = () => {
    setOpenInNewTab(prev => {
      const next = !prev;
      localStorage.setItem('pk_open_modules_new_tab', String(next));
      return next;
    });
  };

  const handleItemNavigation = (e: React.MouseEvent, item: NavItem) => {
    if (item.id === 'operations' || (!openInNewTab && !e.ctrlKey && !e.metaKey)) {
      setActiveView(item.id, item.category);
    } else {
      // Ensure user session and route authorization are flushed to localStorage before new tab boots
      if (currentUser) {
        try {
          localStorage.setItem('pk_current_user', JSON.stringify(currentUser));
          localStorage.setItem('wolfzone_authorized_path', 'true');
          localStorage.setItem('pk_authorized_path', 'true');
        } catch {
          // ignore
        }
      }
      const basePath = typeof window !== 'undefined' && window.location.pathname.startsWith('/') ? window.location.pathname : '/';
      window.open(`${basePath}?view=${item.id}`, '_blank');
    }
  };

  return (
    <aside 
      className={`uupm-sidebar relative z-30 shrink-0 flex flex-col h-screen sticky top-0 transition-all duration-300 select-none overflow-hidden ${
        isCollapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* 1. Header / Brand Area */}
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 shadow-md shadow-indigo-600/20 text-white flex items-center justify-center font-black text-sm shrink-0">
            <Car className="w-5 h-5 text-white" />
          </div>

          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-xs font-black tracking-tight uppercase truncate text-slate-950 dark:text-white">
                {businessInfo.name || 'PARKING POS'}
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400 font-semibold truncate mt-0.5">
                <CircleDot className="w-2 h-2 text-emerald-500 shrink-0 animate-pulse" />
                <span className="truncate">{currentBranch ? currentBranch.name : 'Estación Local'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Collapse button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          title={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          aria-label={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* 2. Navigation Area */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
        {navSections.map((section, sIdx) => {
          const visibleItems = section.items.filter(item => item.requiredPermission !== false);
          if (visibleItems.length === 0) return null;

          return (
            <div key={`section-${sIdx}`} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-700 dark:text-slate-300">
                  {section.title}
                </div>
              ) : (
                <div className="my-1.5 border-t border-slate-200/60 dark:border-slate-800/60 mx-2" />
              )}

              {visibleItems.map((item) => {
                const isActive = activeView === item.id;
                const IconComponent = item.icon;

                return (
                  <div key={item.id} className="relative group">
                    <button
                      type="button"
                      onClick={(e) => handleItemNavigation(e, item)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                        isCollapsed ? 'justify-center' : 'justify-between'
                      } ${
                        isActive
                          ? 'uupm-nav-item-active'
                          : 'uupm-nav-item-inactive'
                      }`}
                      title={isCollapsed ? `${item.label} (Clic para abrir)` : openInNewTab && item.id !== 'operations' ? `${item.label} (Se abrirá en nueva pestaña)` : undefined}
                      aria-label={item.label}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <IconComponent className={`w-4 h-4 shrink-0 transition-transform ${
                          isActive ? 'scale-110' : 'group-hover:scale-105'
                        }`} />
                        
                        {!isCollapsed && (
                          <span className="truncate whitespace-nowrap text-left">
                            {item.label}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isCollapsed && item.badge !== undefined && (
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            isActive 
                              ? 'bg-black/25 text-white shadow-xs'
                              : (item.badgeColor || 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200')
                          }`}>
                            {item.badge}
                          </span>
                        )}

                        {/* Botón directo de apertura en nueva pestaña sin solapar el POS */}
                        {!isCollapsed && item.id !== 'operations' && (
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`?view=${item.id}`, '_blank', 'noopener,noreferrer');
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-300 dark:hover:bg-slate-700/80 rounded-md transition-opacity text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            title={`Abrir ${item.label} en nueva pestaña del navegador`}
                            aria-label={`Abrir ${item.label} en nueva pestaña`}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      {isCollapsed && item.badge !== undefined && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* 3. Footer / User & Control Area */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2 shrink-0 bg-slate-50/50 dark:bg-slate-900/40">
        {/* Toggle para apertura en nueva pestaña sin solapar POS */}
        {!isCollapsed && (
          <div className="px-2.5 py-1.5 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-1.5 font-medium truncate">
              <ExternalLink className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate font-semibold">Abrir en nueva pestaña</span>
            </div>
            <button
              type="button"
              onClick={toggleOpenInNewTab}
              className={`px-2 py-0.5 rounded-md font-mono font-black text-[9px] transition-all cursor-pointer ${
                openInNewTab
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
              }`}
              title={openInNewTab ? 'Desactivar apertura automática en nueva pestaña' : 'Activar para que al hacer clic los módulos se abran en nueva pestaña sin solapar el POS'}
            >
              {openInNewTab ? 'ACTIVO' : 'OFF'}
            </button>
          </div>
        )}

        {/* User Card */}
        <div className={`flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-2xs ${
          isCollapsed ? 'justify-center' : 'justify-between'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${roleMeta.color}`}>
              <RoleIcon className="w-4 h-4" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-xs font-bold truncate text-slate-950 dark:text-white">
                  {currentUser.name}
                </div>
                <div className="text-[10px] font-mono uppercase font-bold text-slate-600 dark:text-slate-400 leading-none mt-0.5">
                  {roleMeta.label}
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
