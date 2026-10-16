import React, { useState, useMemo } from 'react';
import {
  Layers,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sliders,
  Shield,
  ShieldCheck,
  DollarSign,
  Car,
  Receipt,
  Users,
  ShoppingBag,
  Boxes,
  Handshake,
  Building2,
  CreditCard,
  Activity,
  FileSpreadsheet,
  ShieldAlert,
  Cpu,
  DownloadCloud,
  Search,
  Filter,
  Plus,
  Save,
  Send,
  Info,
  Sparkles,
  Radio,
  Globe,
  ArrowUpDown,
  ArrowRight,
  ArrowLeft,
  Clock,
  Database,
  Lock,
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  Settings2,
  FileText
} from 'lucide-react';
import {
  SyncDomainItem,
  SyncMasterPolicyConfig,
  SyncDomainCategory,
  SyncDirection,
  SyncConflictStrategy,
  SyncFrequency,
  getSyncMasterPolicy,
  saveSyncMasterPolicy,
  registerDynamicSyncDomain,
  DEFAULT_SYNC_DOMAINS
} from '../services/syncDomainRegistry';
import { BranchLocation } from '../types';

interface SyncDomainManagerProps {
  branches: BranchLocation[];
  onPublishMasterDirective?: (policy: SyncMasterPolicyConfig) => Promise<void>;
  currentUser?: any;
}

const CATEGORY_METADATA: Record<SyncDomainCategory, { label: string; color: string; bg: string; icon: any }> = {
  tariffs_and_pricing: {
    label: 'Tarifas y Precios',
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    icon: DollarSign
  },
  inventory_and_sales: {
    label: 'Inventario y Tienda POS',
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    icon: ShoppingBag
  },
  financial_and_expenses: {
    label: 'Finanzas, Gastos y Pagos',
    color: 'text-sky-700 dark:text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/30',
    icon: CreditCard
  },
  users_and_security: {
    label: 'Usuarios y Seguridad',
    color: 'text-purple-700 dark:text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30',
    icon: Users
  },
  business_and_legal: {
    label: 'Empresa y DIAN',
    color: 'text-indigo-700 dark:text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/30',
    icon: Building2
  },
  agreements_and_discounts: {
    label: 'Convenios y Abonados',
    color: 'text-teal-700 dark:text-teal-400',
    bg: 'bg-teal-500/10 border-teal-500/30',
    icon: Handshake
  },
  telemetry_and_auditing: {
    label: 'Telemetría y Cierres',
    color: 'text-rose-700 dark:text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/30',
    icon: Activity
  },
  hardware_and_iot: {
    label: 'Hardware y LPR IoT',
    color: 'text-orange-700 dark:text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/30',
    icon: Cpu
  },
  software_and_system: {
    label: 'Actualizaciones OTA',
    color: 'text-cyan-700 dark:text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/30',
    icon: DownloadCloud
  }
};

export const SyncDomainManager: React.FC<SyncDomainManagerProps> = ({
  branches,
  onPublishMasterDirective,
  currentUser
}) => {
  const [policy, setPolicy] = useState<SyncMasterPolicyConfig>(() => getSyncMasterPolicy());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | SyncDirection>('all');
  const [editingDomain, setEditingDomain] = useState<SyncDomainItem | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // New Custom Domain Modal / Form
  const [isAddingCustomDomain, setIsAddingCustomDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [newDomainCode, setNewDomainCode] = useState('');
  const [newDomainCategory, setNewDomainCategory] = useState<SyncDomainCategory>('inventory_and_sales');
  const [newDomainEntityKey, setNewDomainEntityKey] = useState('');
  const [newDomainDescription, setNewDomainDescription] = useState('');
  const [newDomainDirection, setNewDomainDirection] = useState<SyncDirection>('central_to_branch');

  // Stats Calculations
  const stats = useMemo(() => {
    const total = policy.domains.length;
    const enabled = policy.domains.filter(d => d.enabled).length;
    const centralToBranch = policy.domains.filter(d => d.enabled && d.direction === 'central_to_branch').length;
    const branchToCentral = policy.domains.filter(d => d.enabled && d.direction === 'branch_to_central').length;
    const bidirectional = policy.domains.filter(d => d.enabled && d.direction === 'bidirectional').length;
    return { total, enabled, centralToBranch, branchToCentral, bidirectional };
  }, [policy]);

  // Filtered domains list
  const filteredDomains = useMemo(() => {
    return policy.domains.filter(d => {
      if (selectedCategory !== 'all' && d.category !== selectedCategory) return false;
      if (statusFilter === 'enabled' && !d.enabled) return false;
      if (statusFilter === 'disabled' && d.enabled) return false;
      if (directionFilter !== 'all' && d.direction !== directionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.code.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.entityKey.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [policy, selectedCategory, statusFilter, directionFilter, searchQuery]);

  // Handle Domain Toggle
  const handleToggleDomain = (domainId: string) => {
    const updatedDomains = policy.domains.map(d => {
      if (d.id === domainId) {
        return { ...d, enabled: !d.enabled };
      }
      return d;
    });
    const updatedPolicy = { ...policy, domains: updatedDomains };
    setPolicy(updatedPolicy);
    saveSyncMasterPolicy(updatedPolicy);
  };

  // Toggle All in current view
  const handleToggleAllVisible = (enable: boolean) => {
    const visibleIds = new Set(filteredDomains.map(d => d.id));
    const updatedDomains = policy.domains.map(d => {
      if (visibleIds.has(d.id)) {
        return { ...d, enabled: enable };
      }
      return d;
    });
    const updatedPolicy = { ...policy, domains: updatedDomains };
    setPolicy(updatedPolicy);
    saveSyncMasterPolicy(updatedPolicy);
    setFeedbackMessage({
      type: 'info',
      text: `${enable ? 'Activados' : 'Desactivados'} ${visibleIds.size} dominios en la vista actual.`
    });
  };

  // Save specific domain edit
  const handleSaveDomainEdit = (updatedDomain: SyncDomainItem) => {
    const updatedDomains = policy.domains.map(d => d.id === updatedDomain.id ? updatedDomain : d);
    const updatedPolicy = { ...policy, domains: updatedDomains };
    setPolicy(updatedPolicy);
    saveSyncMasterPolicy(updatedPolicy);
    setEditingDomain(null);
    setFeedbackMessage({
      type: 'success',
      text: `Dominio "${updatedDomain.name}" actualizado correctamente.`
    });
  };

  // Reset to Defaults
  const handleResetToDefaults = () => {
    const resetPolicy: SyncMasterPolicyConfig = {
      ...policy,
      domains: DEFAULT_SYNC_DOMAINS,
      updatedAt: new Date().toISOString()
    };
    setPolicy(resetPolicy);
    saveSyncMasterPolicy(resetPolicy);
    setFeedbackMessage({
      type: 'info',
      text: 'Catálogo de dominios de sincronización restaurado a los valores predeterminados.'
    });
  };

  // Publish / Dispatch Master Directive to all Branches
  const handlePublishDirective = async () => {
    setIsPublishing(true);
    setFeedbackMessage(null);
    try {
      saveSyncMasterPolicy(policy);
      if (onPublishMasterDirective) {
        await onPublishMasterDirective(policy);
      }
      setFeedbackMessage({
        type: 'success',
        text: `¡Directiva Maestra publicada! Se han establecido ${stats.enabled} dominios sincronizables para toda la red de sucursales.`
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: `Error al publicar directiva: ${err.message || 'Fallo de red'}`
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Add Custom / Dynamic Domain
  const handleAddCustomDomainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName.trim() || !newDomainEntityKey.trim()) return;

    const code = newDomainCode.trim() || newDomainName.toUpperCase().replace(/\s+/g, '_').slice(0, 14);
    const customItem = registerDynamicSyncDomain({
      id: `custom_${Date.now()}`,
      code,
      name: newDomainName.trim(),
      category: newDomainCategory,
      description: newDomainDescription.trim() || `Dominio modular personalizado (${newDomainEntityKey})`,
      iconName: 'Sparkles',
      enabled: true,
      direction: newDomainDirection,
      conflictStrategy: 'central_master',
      frequency: 'realtime',
      targetBranchesScope: 'all',
      entityKey: newDomainEntityKey.trim(),
      authorModule: currentUser?.name || 'Administrador Central'
    });

    setPolicy(getSyncMasterPolicy());
    setIsAddingCustomDomain(false);
    setNewDomainName('');
    setNewDomainCode('');
    setNewDomainEntityKey('');
    setNewDomainDescription('');
    setFeedbackMessage({
      type: 'success',
      text: `Nuevo dominio modular "${customItem.name}" registrado en la matriz de sincronización.`
    });
  };

  // Helper to render icon
  const getDomainIcon = (iconName: string, category: SyncDomainCategory) => {
    switch (iconName) {
      case 'DollarSign': return <DollarSign className="w-4 h-4 text-amber-700 dark:text-amber-400" />;
      case 'Car': return <Car className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />;
      case 'Receipt': return <Receipt className="w-4 h-4 text-sky-700 dark:text-sky-400" />;
      case 'Users': return <Users className="w-4 h-4 text-purple-700 dark:text-purple-400" />;
      case 'ShoppingBag': return <ShoppingBag className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />;
      case 'Boxes': return <Boxes className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />;
      case 'Handshake': return <Handshake className="w-4 h-4 text-teal-700 dark:text-teal-400" />;
      case 'Building2': return <Building2 className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />;
      case 'CreditCard': return <CreditCard className="w-4 h-4 text-sky-700 dark:text-sky-400" />;
      case 'Activity': return <Activity className="w-4 h-4 text-rose-700 dark:text-rose-400" />;
      case 'FileSpreadsheet': return <FileSpreadsheet className="w-4 h-4 text-rose-700 dark:text-rose-400" />;
      case 'ShieldAlert': return <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400" />;
      case 'Cpu': return <Cpu className="w-4 h-4 text-orange-700 dark:text-orange-400" />;
      case 'DownloadCloud': return <DownloadCloud className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />;
      default: return <Sparkles className="w-4 h-4 text-blue-700 dark:text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner / Headline */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Matriz de Control y Dominios de Sincronización
              </h2>
              <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-500/40 px-2.5 py-0.5 rounded-full">
                AUTO-ADAPTABLE
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-200 mt-1 max-w-2xl leading-relaxed">
              Define qué entidades, módulos y tablas maestras se distribuyen a las sucursales y qué telemetría se recibe en la Central. Nuevos desarrollos y plugins futuros se catalogan automáticamente.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsAddingCustomDomain(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-700 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
            <span>Agregar Módulo / Plugin</span>
          </button>

          <button
            type="button"
            onClick={handlePublishDirective}
            disabled={isPublishing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Send className={`w-4 h-4 ${isPublishing ? 'animate-spin' : ''}`} />
            <span>{isPublishing ? 'Emitiendo Directiva...' : 'Emitir Directiva a Sucursales'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
          feedbackMessage.type === 'success'
            ? 'bg-emerald-950/70 border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : feedbackMessage.type === 'error'
            ? 'bg-rose-950/70 border-rose-800 text-rose-800 dark:text-rose-300'
            : 'bg-indigo-950/70 border-indigo-800 text-indigo-800 dark:text-indigo-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
            ) : feedbackMessage.type === 'error' ? (
              <ShieldAlert className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-indigo-700 dark:text-indigo-400 shrink-0" />
            )}
            <span className="font-semibold">{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-700 dark:text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-sm cursor-pointer ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Dominios Activos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-900 dark:text-slate-100">{stats.enabled}</span>
            <span className="text-xs text-slate-600 dark:text-slate-300">de {stats.total} registrados</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Central ➔ Sucursal</span>
            <ArrowRight className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black text-indigo-800 dark:text-indigo-300">{stats.centralToBranch}</span>
            <span className="text-xs text-slate-600 dark:text-slate-300">descendentes</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Sucursal ➔ Central</span>
            <ArrowLeft className="w-4 h-4 text-rose-700 dark:text-rose-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black text-rose-800 dark:text-rose-300">{stats.branchToCentral}</span>
            <span className="text-xs text-slate-600 dark:text-slate-300">telemetría</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Bidireccionales</span>
            <ArrowUpDown className="w-4 h-4 text-teal-700 dark:text-teal-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black text-teal-800 dark:text-teal-300">{stats.bidirectional}</span>
            <span className="text-xs text-slate-600 dark:text-slate-300">híbridos</span>
          </div>
        </div>
      </div>

      {/* Auto-Discovery & Global Policy Bar */}
      <div className="bg-slate-950/70 border border-slate-800/80 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-700 dark:text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-700 dark:text-slate-200">Auto-descubrimiento de nuevos desarrollos</span>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold">ACTIVO</span>
            </div>
            <p className="text-slate-700 dark:text-slate-200 text-[11px]">
              Cualquier nuevo módulo de software (nuevas pasarelas, tipos de cobro o reportes) se incorpora automáticamente a esta matriz.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer text-xs"
          >
            Restaurar Catálogo Base
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-700 dark:text-slate-200" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, código o clave de entidad..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Quick status toggles */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Todos ({policy.domains.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('enabled')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${statusFilter === 'enabled' ? 'bg-emerald-600 text-white' : 'text-slate-700 dark:text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Activos ({stats.enabled})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('disabled')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${statusFilter === 'disabled' ? 'bg-rose-600 text-white' : 'text-slate-700 dark:text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Inactivos ({stats.total - stats.enabled})
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleToggleAllVisible(true)}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/30 transition-colors cursor-pointer text-xs"
            >
              Activar Visibles
            </button>
            <button
              type="button"
              onClick={() => handleToggleAllVisible(false)}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-800 dark:text-rose-300 font-bold border border-rose-500/30 transition-colors cursor-pointer text-xs"
            >
              Desactivar Visibles
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:text-slate-950 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Todas las Categorías
          </button>
          {Object.entries(CATEGORY_METADATA).map(([catKey, meta]) => {
            const count = policy.domains.filter(d => d.category === catKey).length;
            const isSelected = selectedCategory === catKey;
            const CatIcon = meta.icon;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setSelectedCategory(catKey)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <CatIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : meta.color}`} />
                <span>{meta.label}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Sync Domains */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredDomains.map((domain) => {
          const categoryMeta = CATEGORY_METADATA[domain.category] || CATEGORY_METADATA.tariffs_and_pricing;

          return (
            <div
              key={domain.id}
              className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                domain.enabled
                  ? 'bg-slate-900/90 border-slate-300 dark:border-slate-700 shadow-md hover:border-slate-650'
                  : 'bg-slate-950/60 border-slate-200 dark:border-slate-800 opacity-65 hover:opacity-100'
              }`}
            >
              <div>
                {/* Header: Category Badge + Toggle */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryMeta.bg} ${categoryMeta.color}`}>
                      {categoryMeta.label}
                    </span>
                    {domain.isExtensiblePlugin && (
                      <span className="text-[9px] font-mono font-bold bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded-md">
                        PLUGIN
                      </span>
                    )}
                  </div>

                  {/* Switch Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleDomain(domain.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      domain.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        domain.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Body Info */}
                <div className="mt-3 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0">
                    {getDomainIcon(domain.iconName, domain.category)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {domain.name}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-700 dark:text-slate-200">
                      Clave: <code className="text-indigo-800 dark:text-indigo-300 font-bold">{domain.entityKey}</code> • v{domain.version}
                    </span>
                    <p className="text-[11px] text-slate-700 dark:text-slate-200 mt-1 line-clamp-2 leading-relaxed">
                      {domain.description}
                    </p>
                  </div>
                </div>

                {/* Operational Properties Pills */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-200">Dirección:</span>
                    <span className={`font-bold flex items-center gap-1 ${
                      domain.direction === 'central_to_branch'
                        ? 'text-indigo-700 dark:text-indigo-400'
                        : domain.direction === 'branch_to_central'
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-teal-700 dark:text-teal-400'
                    }`}>
                      {domain.direction === 'central_to_branch' ? 'Central ➔ Sede' : domain.direction === 'branch_to_central' ? 'Sede ➔ Central' : 'Bidireccional'}
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-200">Frecuencia:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {domain.frequency === 'realtime' ? 'Tiempo Real' : domain.frequency === 'every_5_minutes' ? 'Cada 5 min' : domain.frequency === 'on_shift_event' ? 'Por Turno' : 'Manual'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="mt-3.5 pt-2 flex items-center justify-between text-xs">
                <span className={`text-[10px] font-bold flex items-center gap-1 ${domain.enabled ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
                  {domain.enabled ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Sincronización Habilitada
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3" />
                      Omitir en Sincronización
                    </>
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => setEditingDomain(domain)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-700 transition-colors font-bold text-[11px] cursor-pointer flex items-center gap-1"
                >
                  <Settings2 className="w-3 h-3" />
                  <span>Configurar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDomains.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-3">
          <Layers className="w-10 h-10 text-slate-600 dark:text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">No se encontraron dominios con los filtros actuales</h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            Prueba ajustando la búsqueda o el filtro de categoría para visualizar los módulos de sincronización.
          </p>
        </div>
      )}

      {/* Edit Domain Config Modal */}
      {editingDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-300 dark:border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  Configurar Dominio: {editingDomain.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingDomain(null)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Nombre del Dominio</label>
                <input
                  type="text"
                  value={editingDomain.name}
                  onChange={(e) => setEditingDomain({ ...editingDomain, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Dirección del Flujo</label>
                  <select
                    value={editingDomain.direction}
                    onChange={(e) => setEditingDomain({ ...editingDomain, direction: e.target.value as SyncDirection })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="central_to_branch">Central ➔ Sucursal (Descendente)</option>
                    <option value="branch_to_central">Sucursal ➔ Central (Telemetría)</option>
                    <option value="bidirectional">Bidireccional (Ambas direcciones)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Frecuencia de Envío</label>
                  <select
                    value={editingDomain.frequency}
                    onChange={(e) => setEditingDomain({ ...editingDomain, frequency: e.target.value as SyncFrequency })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="realtime">En Tiempo Real (WebSockets)</option>
                    <option value="every_5_minutes">Periódico (Cada 5 minutos)</option>
                    <option value="on_shift_event">Por Evento (Cierres de Turno)</option>
                    <option value="manual_only">Manual bajo demanda</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Resolución de Conflictos</label>
                  <select
                    value={editingDomain.conflictStrategy}
                    onChange={(e) => setEditingDomain({ ...editingDomain, conflictStrategy: e.target.value as SyncConflictStrategy })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="central_master">Central Prevalece (Autoridad Matriz)</option>
                    <option value="latest_timestamp">Fecha Más Reciente</option>
                    <option value="merge_records">Combinar Registros (Merge)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Alcance de Sucursales</label>
                  <select
                    value={editingDomain.targetBranchesScope}
                    onChange={(e) => setEditingDomain({ ...editingDomain, targetBranchesScope: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="all">Todas las Sedes / Patios</option>
                    <option value="specific">Sedes Seleccionadas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Descripción y Propósito</label>
                <textarea
                  rows={2}
                  value={editingDomain.description}
                  onChange={(e) => setEditingDomain({ ...editingDomain, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingDomain(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-colors cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSaveDomainEdit(editingDomain)}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black transition-colors cursor-pointer text-xs shadow-md"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom / Dynamic Domain Modal */}
      {isAddingCustomDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-300 dark:border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <form onSubmit={handleAddCustomDomainSubmit}>
              <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    Registrar Nuevo Módulo / Plugin Sincronizable
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingCustomDomain(false)}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-lg font-bold cursor-pointer"
                >
                  ×
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Nombre del Módulo / Desarrollo</label>
                  <input
                    type="text"
                    required
                    value={newDomainName}
                    onChange={(e) => setNewDomainName(e.target.value)}
                    placeholder="Ej. Fidelización y Puntos de Clientes, Convenio Flotas..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Clave de Entidad (JSON Key)</label>
                    <input
                      type="text"
                      required
                      value={newDomainEntityKey}
                      onChange={(e) => setNewDomainEntityKey(e.target.value)}
                      placeholder="ej. loyaltyPoints, fleetContracts"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Categoría</label>
                    <select
                      value={newDomainCategory}
                      onChange={(e) => setNewDomainCategory(e.target.value as SyncDomainCategory)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      {Object.entries(CATEGORY_METADATA).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Dirección del Flujo</label>
                  <select
                    value={newDomainDirection}
                    onChange={(e) => setNewDomainDirection(e.target.value as SyncDirection)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="central_to_branch">Central ➔ Sucursal (Descendente)</option>
                    <option value="branch_to_central">Sucursal ➔ Central (Telemetría / Cierres)</option>
                    <option value="bidirectional">Bidireccional</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Descripción del Módulo</label>
                  <textarea
                    rows={2}
                    value={newDomainDescription}
                    onChange={(e) => setNewDomainDescription(e.target.value)}
                    placeholder="Describe qué información transporta y cómo beneficia la operación de la red..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddingCustomDomain(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-colors cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black transition-colors cursor-pointer text-xs shadow-md"
                >
                  Registrar en la Matriz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
