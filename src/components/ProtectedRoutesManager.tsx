import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  RotateCcw, 
  ExternalLink, 
  Lock, 
  KeyRound, 
  Check, 
  AlertCircle,
  FolderLock,
  Layers,
  Sparkles,
  ArrowRight,
  Code,
  History,
  Shield,
  Search,
  Filter
} from 'lucide-react';
import { 
  ProtectedRouteConfig, 
  DEFAULT_PROTECTED_ROUTES, 
  saveDynamicRoutes,
  getStoredDynamicRoutes,
  saveAuthorizedRoute,
  logRouteAuditEvent,
  ActiveWorkspaceView,
  WorkspaceCategory
} from '../types/routes';
import { playSound } from '../utils/audio';
import { RouteAuditHistory } from './RouteAuditHistory';

export interface ProtectedRoutesManagerProps {
  routes?: ProtectedRouteConfig[];
  onUpdateRoutes?: (newRoutes: ProtectedRouteConfig[]) => void;
  onNavigateToRoute?: (route: ProtectedRouteConfig) => void;
  isDarkMode?: boolean;
}

const AVAILABLE_VIEWS: { id: ActiveWorkspaceView; label: string; category: WorkspaceCategory }[] = [
  { id: 'operations', label: 'Patio POS (Operaciones)', category: 'operations' },
  { id: 'map', label: 'Mapa de Plazas', category: 'operations' },
  { id: 'spots', label: 'Gestión de Plazas Físicas', category: 'operations' },
  { id: 'anpr_camera', label: 'Cámaras LPR & Reconocimiento', category: 'operations' },
  { id: 'cash', label: 'Turno & Caja', category: 'finance' },
  { id: 'expense_concepts', label: 'Conceptos de Gasto', category: 'finance' },
  { id: 'reports', label: 'Reportes en Vivo & BI', category: 'reports' },
  { id: 'branches', label: 'Sedes & Puntos', category: 'central' },
  { id: 'central_hub', label: 'Matriz Central', category: 'central' },
  { id: 'branch_sync', label: 'Sincronización en Red', category: 'central' },
  { id: 'vnc_remote', label: 'Acceso Remoto VNC', category: 'central' },
  { id: 'rates', label: 'Tarifas & Parámetros POS', category: 'config' },
  { id: 'vehicle_categories', label: 'Categorías Vehiculares', category: 'config' },
  { id: 'users', label: 'Usuarios, Roles & Permisos', category: 'config' },
  { id: 'database', label: 'Base de Datos & Terminal', category: 'config' },
  { id: 'software_updater', label: 'Actualizaciones OTA', category: 'updates' },
  { id: 'work_mode', label: 'Modo de Red (Offline/Online)', category: 'updates' },
];

const AVAILABLE_CATEGORIES: { id: WorkspaceCategory; label: string }[] = [
  { id: 'operations', label: 'Operaciones' },
  { id: 'finance', label: 'Finanzas & Caja' },
  { id: 'reports', label: 'Informes & BI' },
  { id: 'central', label: 'Red & Servidor' },
  { id: 'updates', label: 'Actualizaciones' },
  { id: 'config', label: 'Configuración' },
];

const AVAILABLE_ROLES = [
  { id: 'cajero', label: 'Cajero / Taquilla' },
  { id: 'supervisor', label: 'Supervisor' },
  { id: 'admin', label: 'Administrador' },
  { id: 'master', label: 'Master / Super Admin' },
];

export const ProtectedRoutesManager: React.FC<ProtectedRoutesManagerProps> = ({
  routes,
  onUpdateRoutes,
  onNavigateToRoute,
  isDarkMode = true,
}) => {
  const [internalRoutes, setInternalRoutes] = useState<ProtectedRouteConfig[]>(() => {
    return routes && routes.length > 0 ? routes : getStoredDynamicRoutes();
  });

  React.useEffect(() => {
    if (routes && routes.length > 0) {
      setInternalRoutes(routes);
    }
  }, [routes]);

  const activeRoutes = routes || internalRoutes;

  const updateRoutesList = (updated: ProtectedRouteConfig[]) => {
    setInternalRoutes(updated);
    saveDynamicRoutes(updated);
    if (onUpdateRoutes) {
      onUpdateRoutes(updated);
    }
  };

  const [activeTab, setActiveTab] = useState<'routes' | 'audit_history'>('routes');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProtectedRouteConfig>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Filtered dataset for UI UX Pro Max fast table exploration
  const displayedRoutes = useMemo(() => {
    return activeRoutes.filter(route => {
      if (roleFilter !== 'all' && route.requiredRole !== roleFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          route.path.toLowerCase().includes(query) ||
          route.name.toLowerCase().includes(query) ||
          (route.description && route.description.toLowerCase().includes(query)) ||
          (route.badge && route.badge.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [activeRoutes, roleFilter, searchQuery]);

  // New route draft
  const [newRoute, setNewRoute] = useState<ProtectedRouteConfig>({
    path: '/nueva-area',
    name: 'Nueva Área Administrativa',
    description: 'Acceso protegido a módulo específico del sistema',
    requiredRole: 'admin',
    badge: 'Área Privada',
    badgeColor: 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border-indigo-500/30',
    iconName: 'FolderLock',
    defaultView: 'reports',
    defaultCategory: 'reports',
    isDefault: false,
  });

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const normalizePath = (path: string): string => {
    let clean = path.trim().toLowerCase();
    if (!clean.startsWith('/')) {
      clean = '/' + clean;
    }
    return clean.replace(/\s+/g, '-');
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...activeRoutes[index] });
    setIsAddingNew(false);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditForm({});
  };

  const handleSaveEdit = (index: number) => {
    if (!editForm.path || !editForm.name) {
      showFeedback('La ruta y el nombre no pueden estar vacíos', 'error');
      return;
    }

    const normalizedPath = normalizePath(editForm.path);
    
    // Check duplicates with other indexes
    const duplicate = activeRoutes.some((r, i) => i !== index && r.path.toLowerCase() === normalizedPath);
    if (duplicate) {
      showFeedback(`Ya existe otra ruta configurada con el path "${normalizedPath}"`, 'error');
      return;
    }

    const updatedRoutes = [...activeRoutes];
    updatedRoutes[index] = {
      ...updatedRoutes[index],
      ...editForm,
      path: normalizedPath,
      name: editForm.name.trim(),
      description: editForm.description?.trim() || '',
      badge: editForm.badge?.trim() || 'Área',
    };

    updateRoutesList(updatedRoutes);

    // Audit log
    logRouteAuditEvent({
      eventType: 'ROUTE_UPDATED',
      eventLabel: 'Ruta Protegida Modificada',
      path: normalizedPath,
      routeName: editForm.name.trim(),
      userName: 'Administrador General',
      userRole: 'admin',
      details: `Modificación de parámetros, nombre y rol de acceso para la ruta ${normalizedPath}.`,
      severity: 'warning'
    });

    setEditingIndex(null);
    setEditForm({});
    playSound('success');
    showFeedback(`Ruta "${normalizedPath}" actualizada y persistida con éxito.`);
  };

  const handleDeleteRoute = (index: number) => {
    const target = activeRoutes[index];
    if (target.path === '/wolfzonepos' || target.isDefault) {
      showFeedback('No se puede eliminar la ruta raíz predeterminada (/wolfzonepos)', 'error');
      return;
    }

    if (confirm(`¿Estás seguro de eliminar la ruta protegida "${target.path}" (${target.name})?`)) {
      const updatedRoutes = activeRoutes.filter((_, i) => i !== index);
      updateRoutesList(updatedRoutes);

      // Audit log
      logRouteAuditEvent({
        eventType: 'ROUTE_DELETED',
        eventLabel: 'Ruta Protegida Eliminada',
        path: target.path,
        routeName: target.name,
        userName: 'Administrador General',
        userRole: 'admin',
        details: `Eliminación permanente de la ruta protegida ${target.path} (${target.name}).`,
        severity: 'warning'
      });

      playSound('beep');
      showFeedback(`Ruta "${target.path}" eliminada de la configuración.`);
    }
  };

  const handleAddNewRoute = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPath = normalizePath(newRoute.path);

    if (activeRoutes.some(r => r.path.toLowerCase() === normalizedPath)) {
      showFeedback(`La ruta "${normalizedPath}" ya se encuentra registrada`, 'error');
      return;
    }

    const routeToAdd: ProtectedRouteConfig = {
      ...newRoute,
      path: normalizedPath,
      name: newRoute.name.trim(),
      description: newRoute.description.trim(),
      badge: newRoute.badge.trim(),
    };

    const updatedRoutes = [...activeRoutes, routeToAdd];
    updateRoutesList(updatedRoutes);

    // Audit log
    logRouteAuditEvent({
      eventType: 'ROUTE_CREATED',
      eventLabel: 'Nueva Ruta Registrada',
      path: normalizedPath,
      routeName: routeToAdd.name,
      userName: 'Administrador General',
      userRole: 'admin',
      details: `Registro de nueva área protegida en ${normalizedPath} con rol requerido "${routeToAdd.requiredRole}".`,
      severity: 'success'
    });

    setIsAddingNew(false);
    setNewRoute({
      path: '/nueva-area',
      name: 'Nueva Área Administrativa',
      description: 'Acceso protegido a módulo específico del sistema',
      requiredRole: 'admin',
      badge: 'Área Privada',
      badgeColor: 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border-indigo-500/30',
      iconName: 'FolderLock',
      defaultView: 'reports',
      defaultCategory: 'reports',
      isDefault: false,
    });
    playSound('success');
    showFeedback(`Nueva ruta "${normalizedPath}" registrada y guardada en localStorage.`);
  };

  const handleResetToDefaults = () => {
    if (confirm('¿Restablecer la lista de rutas protegidas a los valores de fábrica predeterminados?')) {
      updateRoutesList(DEFAULT_PROTECTED_ROUTES);

      // Audit log
      logRouteAuditEvent({
        eventType: 'ROUTES_RESET',
        eventLabel: 'Rutas Restablecidas a Fábrica',
        path: '*',
        routeName: 'Todas las Rutas',
        userName: 'Administrador General',
        userRole: 'admin',
        details: 'Restablecimiento global de la lista de rutas protegidas a la configuración de fábrica predeterminada.',
        severity: 'warning'
      });

      playSound('beep');
      showFeedback('Rutas protegidas restablecidas a la configuración original de fábrica.');
    }
  };

  const handleTestRoute = (route: ProtectedRouteConfig) => {
    saveAuthorizedRoute(route.path);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', route.path);
    }
    
    // Audit log
    logRouteAuditEvent({
      eventType: 'ACCESS_GRANTED',
      eventLabel: 'Navegación Autorizada',
      path: route.path,
      routeName: route.name,
      userName: 'Administrador General',
      userRole: 'admin',
      details: `Acceso y navegación directa concedida a ${route.path} (${route.name}).`,
      severity: 'info'
    });

    if (onNavigateToRoute) {
      onNavigateToRoute(route);
    }
    showFeedback(`Acceso autorizado para "${route.path}". Redirigiendo...`);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-7 shadow-xs space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-mono">
              Seguridad & Enrutamiento Dinámico
            </span>
            <span className="text-[11px] text-slate-700 dark:text-slate-200 font-medium">
              Persistencia en LocalStorage
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span>Control de Rutas Protegidas & Trazabilidad de Auditoría</span>
          </h2>
          <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5">
            Configura las URL privadas de acceso directo y consulta el registro cronológico inalterable de accesos y modificaciones.
          </p>
        </div>

        {/* Top Tab Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('routes')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'routes'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Rutas Protegidas ({activeRoutes.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audit_history')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'audit_history'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historial de Auditoría</span>
            </button>
          </div>

          {activeTab === 'routes' && (
            <>
              <button
                type="button"
                onClick={() => setIsAddingNew(!isAddingNew)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isAddingNew ? 'Cerrar Formulario' : 'Nueva Ruta'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetToDefaults}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Restablecer las rutas de fábrica predeterminadas"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Fábrica</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Executive Security KPI Cards (UI UX Pro Max Pattern) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 shadow-2xs">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Total Rutas</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-mono font-black text-slate-950 dark:text-white mt-1">
            {activeRoutes.length}
          </div>
          <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">Enrutamiento activo</span>
        </div>

        <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 shadow-2xs">
          <div className="flex items-center justify-between text-rose-800 dark:text-rose-300">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Acceso Crítico</span>
            <Lock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-mono font-black text-rose-900 dark:text-rose-200 mt-1">
            {activeRoutes.filter(r => r.requiredRole === 'master' || r.requiredRole === 'admin').length}
          </div>
          <span className="text-[10px] text-rose-700 dark:text-rose-300 font-medium">Master & Admin</span>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Acceso Operativo</span>
            <Check className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-mono font-black text-emerald-900 dark:text-emerald-200 mt-1">
            {activeRoutes.filter(r => r.requiredRole === 'cajero' || r.requiredRole === 'supervisor').length}
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">Cajero & Supervisor</span>
        </div>

        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Trazabilidad</span>
            <History className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-mono font-black text-amber-900 dark:text-amber-200 mt-1">
            100%
          </div>
          <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">Cifrado & Persistente</span>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'audit_history' ? (
        <RouteAuditHistory isDarkMode={isDarkMode} />
      ) : (
        <>
          {/* Feedback Toast Banner */}
          {feedbackMsg && (
            <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-300'
            }`}>
              {feedbackMsg.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Quick Search & Role Filter Bar (UI UX Pro Max Pattern) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por URL, área o descripción..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-950 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Role Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 shrink-0">Filtrar Rol:</span>
              {['all', 'master', 'admin', 'supervisor', 'cajero'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRoleFilter(role)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer border ${
                    roleFilter === role
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  {role === 'all' ? 'Todos' : role}
                </button>
              ))}
            </div>
          </div>

      {/* 2. New Route Creation Form (Collapsible) */}
      {isAddingNew && (
        <form onSubmit={handleAddNewRoute} className="p-4 md:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-amber-500/30 dark:border-amber-500/40 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Registrar Nueva Ruta Administrativa</span>
            </h3>
            <span className="text-[11px] text-slate-700 dark:text-slate-200 font-mono">
              Se guardará automáticamente en localStorage
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Path */}
            <div>
              <label className="block font-bold text-slate-950 dark:text-slate-200 mb-1">
                Ruta URL (Path) *
              </label>
              <input
                type="text"
                value={newRoute.path}
                onChange={(e) => setNewRoute({ ...newRoute, path: e.target.value })}
                placeholder="/mi-modulo"
                required
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-slate-950 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block font-bold text-slate-950 dark:text-slate-200 mb-1">
                Nombre del Área *
              </label>
              <input
                type="text"
                value={newRoute.name}
                onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })}
                placeholder="Panel Financiero"
                required
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-sans text-slate-950 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Default View */}
            <div>
              <label className="block font-bold text-slate-950 dark:text-slate-200 mb-1">
                Vista Predeterminada *
              </label>
              <select
                value={newRoute.defaultView}
                onChange={(e) => {
                  const viewId = e.target.value as ActiveWorkspaceView;
                  const found = AVAILABLE_VIEWS.find(v => v.id === viewId);
                  setNewRoute({ 
                    ...newRoute, 
                    defaultView: viewId,
                    defaultCategory: found ? found.category : newRoute.defaultCategory
                  });
                }}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white font-sans focus:outline-none focus:border-amber-500"
              >
                {AVAILABLE_VIEWS.map(v => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* Required Role */}
            <div>
              <label className="block font-bold text-slate-950 dark:text-slate-200 mb-1">
                Rol Sugerido *
              </label>
              <select
                value={newRoute.requiredRole}
                onChange={(e) => setNewRoute({ ...newRoute, requiredRole: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white font-sans focus:outline-none focus:border-amber-500"
              >
                {AVAILABLE_ROLES.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Badge */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-950 dark:text-slate-200 mb-1">
                Etiqueta / Badge Visible
              </label>
              <input
                type="text"
                value={newRoute.badge}
                onChange={(e) => setNewRoute({ ...newRoute, badge: e.target.value })}
                placeholder="Admin / Auditoría"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-sans text-slate-950 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-950 dark:text-slate-200 mb-1">
                Descripción del Módulo
              </label>
              <input
                type="text"
                value={newRoute.description}
                onChange={(e) => setNewRoute({ ...newRoute, description: e.target.value })}
                placeholder="Propósito operativo del área"
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-sans text-slate-950 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar Ruta en LocalStorage</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. Interactive Routes Configuration Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-50 dark:bg-slate-950/70">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-950 dark:text-slate-200 uppercase font-mono tracking-wider text-[10px]">
              <th className="py-3 px-4 font-black">Ruta URL</th>
              <th className="py-3 px-4 font-black">Área & Descripción</th>
              <th className="py-3 px-4 font-black">Vista Asignada</th>
              <th className="py-3 px-4 font-black">Categoría</th>
              <th className="py-3 px-4 font-black">Rol Requerido</th>
              <th className="py-3 px-4 font-black">Badge</th>
              <th className="py-3 px-4 font-black text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {displayedRoutes.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 px-4 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-slate-700 dark:text-slate-300">
                    <AlertCircle className="w-8 h-8 text-amber-500/80" />
                    <span className="text-sm font-bold text-slate-950 dark:text-slate-100">
                      No se encontraron rutas protegidas
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm">
                      No hay coincidencias con la búsqueda "{searchQuery}" o el rol seleccionado ({roleFilter}).
                    </p>
                    {(searchQuery || roleFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setRoleFilter('all');
                        }}
                        className="mt-2 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        Limpiar Filtros
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              displayedRoutes.map((route) => {
                const idx = activeRoutes.findIndex(r => r.path === route.path);
                const isEditing = editingIndex === idx;

                if (isEditing) {
                  return (
                    <tr key={`edit-${idx}`} className="bg-amber-50/50 dark:bg-amber-950/20">
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={editForm.path || ''}
                          onChange={(e) => setEditForm({ ...editForm, path: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-950 dark:text-white"
                        />
                      </td>
                      <td className="py-3 px-3 space-y-1">
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="Nombre"
                          className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-950 dark:text-white"
                        />
                        <input
                          type="text"
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Descripción"
                          className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[11px] text-slate-800 dark:text-slate-200"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={editForm.defaultView || 'operations'}
                          onChange={(e) => {
                            const vId = e.target.value as ActiveWorkspaceView;
                            const found = AVAILABLE_VIEWS.find(v => v.id === vId);
                            setEditForm({ 
                              ...editForm, 
                              defaultView: vId,
                              defaultCategory: found ? found.category : editForm.defaultCategory
                            });
                          }}
                          className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-950 dark:text-white"
                        >
                          {AVAILABLE_VIEWS.map(v => (
                            <option key={v.id} value={v.id}>{v.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={editForm.defaultCategory || 'operations'}
                          onChange={(e) => setEditForm({ ...editForm, defaultCategory: e.target.value as WorkspaceCategory })}
                          className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-950 dark:text-white"
                        >
                          {AVAILABLE_CATEGORIES.map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={editForm.requiredRole || 'cajero'}
                          onChange={(e) => setEditForm({ ...editForm, requiredRole: e.target.value as any })}
                          className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-950 dark:text-white"
                        >
                          {AVAILABLE_ROLES.map(r => (
                            <option key={r.id} value={r.id}>{r.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={editForm.badge || ''}
                          onChange={(e) => setEditForm({ ...editForm, badge: e.target.value })}
                          className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-950 dark:text-white"
                        />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(idx)}
                            className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all cursor-pointer"
                            title="Guardar cambios"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr 
                    key={route.path} 
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Path */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-950 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <code className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-amber-300 border border-slate-200 dark:border-slate-700">
                          {route.path}
                        </code>
                        {route.isDefault && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                            Root
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Name & Description */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-slate-950 dark:text-white text-xs">
                        {route.name}
                      </div>
                      <div className="text-[11px] text-slate-700 dark:text-slate-200 line-clamp-1">
                        {route.description}
                      </div>
                    </td>

                    {/* Default View */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 font-mono text-[11px]">
                        {route.defaultView || 'operations'}
                      </span>
                    </td>

                    {/* Default Category */}
                    <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200 capitalize font-medium">
                      {route.defaultCategory || 'operations'}
                    </td>

                    {/* Role (High-Contrast WCAG AAA Tags) */}
                    <td className="py-3.5 px-4">
                      {route.requiredRole === 'master' ? (
                        <span className="capitalize px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 border border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200 font-extrabold text-[10px]">
                          Master
                        </span>
                      ) : route.requiredRole === 'admin' ? (
                        <span className="capitalize px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 font-extrabold text-[10px]">
                          Admin
                        </span>
                      ) : route.requiredRole === 'supervisor' ? (
                        <span className="capitalize px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 font-extrabold text-[10px]">
                          Supervisor
                        </span>
                      ) : (
                        <span className="capitalize px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 font-extrabold text-[10px]">
                          Cajero / Taquilla
                        </span>
                      )}
                    </td>

                    {/* Badge */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                        route.badgeColor || 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                      }`}>
                        {route.badge}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTestRoute(route)}
                          className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 transition-all cursor-pointer"
                          title="Probar y abrir esta ruta"
                          aria-label={`Probar ruta ${route.path}`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEdit(idx)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
                          title="Editar configuración"
                          aria-label={`Editar ruta ${route.path}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {!route.isDefault && route.path !== '/wolfzonepos' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRoute(idx)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                            title="Eliminar ruta protegida"
                            aria-label={`Eliminar ruta ${route.path}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Persistence Info Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-700 dark:text-slate-200">
        <span className="flex items-center gap-1.5 font-medium">
          <Code className="w-3.5 h-3.5 text-emerald-500" />
          <span>Total de rutas protegidas configuradas: <strong>{activeRoutes.length}</strong></span>
        </span>
        <span className="font-mono text-slate-700 dark:text-slate-200">
          Claves en localStorage: <code className="text-amber-700 dark:text-amber-400 font-bold">wolfzone_dynamic_protected_routes</code> · <code className="text-indigo-700 dark:text-indigo-400 font-bold">wolfzone_route_audit_history</code>
        </span>
      </div>
        </>
      )}
    </div>
  );
};

export default ProtectedRoutesManager;
