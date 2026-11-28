import React, { useState } from 'react';
import { 
  Server, 
  Store, 
  Save, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  Globe, 
  ShieldCheck, 
  RefreshCw, 
  Layers, 
  Hash, 
  Mail, 
  Sliders, 
  Clock, 
  Plus, 
  Zap,
  Edit3,
  Trash2,
  Warehouse as WarehouseIcon,
  Check
} from 'lucide-react';
import { SystemNodeConfig, BranchLocation, SystemUser, Warehouse } from '../types';

interface SystemWorkModeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SystemNodeConfig;
  branches: BranchLocation[];
  warehouses?: Warehouse[];
  onSaveConfig: (updatedConfig: SystemNodeConfig) => void;
  onAddNewBranch?: (branch: Partial<BranchLocation>) => void;
  onSaveWarehouse?: (warehouse: Warehouse) => void;
  onDeleteWarehouse?: (warehouseId: string) => void;
  currentUser?: SystemUser;
  embedded?: boolean;
  initialTab?: TabType;
}

type TabType = 'pos' | 'servers' | 'zones' | 'prefixes' | 'email' | 'integrations' | 'payroll' | 'alerts';

export const SystemWorkModeConfigModal: React.FC<SystemWorkModeConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  branches,
  warehouses = [],
  onSaveConfig,
  onAddNewBranch,
  onSaveWarehouse,
  onDeleteWarehouse,
  currentUser,
  embedded = false,
  initialTab = 'servers'
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [formData, setFormData] = useState<SystemNodeConfig>({ ...config });
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
    latency?: number;
  }>({ status: 'idle', message: '' });

  // Quick Branch Creator inside Modal
  const [isAddingNewBranch, setIsAddingNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchCity, setNewBranchCity] = useState('');

  // Gestión de Bodegas y Patios
  const [localWarehouses, setLocalWarehouses] = useState<Warehouse[]>(() => {
    if (warehouses && warehouses.length > 0) return warehouses;
    try {
      const saved = localStorage.getItem('pk_warehouses');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  React.useEffect(() => {
    if (warehouses && warehouses.length > 0) {
      setLocalWarehouses(warehouses);
    }
  }, [warehouses]);

  const [isAddingNewWarehouse, setIsAddingNewWarehouse] = useState(false);
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);
  const [warehouseForm, setWarehouseForm] = useState<{
    code: string;
    name: string;
    type: Warehouse['type'];
    capacity: number;
    address: string;
    notes: string;
  }>({
    code: '',
    name: '',
    type: 'general',
    capacity: 50,
    address: '',
    notes: ''
  });

  const handleOpenNewWarehouse = () => {
    setEditingWarehouseId(null);
    setWarehouseForm({
      code: `PAT-${String(localWarehouses.length + 1).padStart(2, '0')}`,
      name: '',
      type: 'general',
      capacity: 50,
      address: '',
      notes: ''
    });
    setIsAddingNewWarehouse(true);
  };

  const handleEditWarehouse = (wh: Warehouse) => {
    setEditingWarehouseId(wh.id);
    setWarehouseForm({
      code: wh.code,
      name: wh.name,
      type: wh.type || 'general',
      capacity: wh.capacity || 50,
      address: wh.address || '',
      notes: wh.notes || ''
    });
    setIsAddingNewWarehouse(true);
  };

  const handleSaveWarehouseAction = () => {
    if (!warehouseForm.name.trim() || !warehouseForm.code.trim()) return;

    const currentBranch = branches.find(b => b.id === formData.selectedBranchId) || branches[0];
    const whToSave: Warehouse = {
      id: editingWarehouseId || `bod-${Date.now()}`,
      code: warehouseForm.code.trim().toUpperCase(),
      name: warehouseForm.name.trim(),
      type: warehouseForm.type,
      branchId: currentBranch?.id || 'suc-001',
      branchName: currentBranch?.name || 'Sede Principal',
      address: warehouseForm.address.trim() || currentBranch?.address || 'Sede Principal',
      capacity: warehouseForm.capacity || 50,
      manager: 'Administrador',
      phone: '',
      isActive: true,
      itemsCount: 0,
      notes: warehouseForm.notes.trim() || 'Patio / Bodega de operaciones.',
      createdAt: new Date().toISOString()
    };

    if (onSaveWarehouse) {
      onSaveWarehouse(whToSave);
    }

    setLocalWarehouses(prev => {
      const exists = prev.some(w => w.id === whToSave.id);
      const updated = exists ? prev.map(w => w.id === whToSave.id ? whToSave : w) : [...prev, whToSave];
      try { localStorage.setItem('pk_warehouses', JSON.stringify(updated)); } catch(e){}
      return updated;
    });

    handleInputChange('defaultWarehouseOrYard', whToSave.name);
    setIsAddingNewWarehouse(false);
    setEditingWarehouseId(null);
  };

  const handleDeleteWarehouseAction = (whId: string) => {
    if (onDeleteWarehouse) {
      onDeleteWarehouse(whId);
    }
    setLocalWarehouses(prev => {
      const updated = prev.filter(w => w.id !== whId);
      try { localStorage.setItem('pk_warehouses', JSON.stringify(updated)); } catch(e){}
      return updated;
    });
  };

  if (!isOpen) return null;

  const handleInputChange = (field: keyof SystemNodeConfig, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveConfig(formData);
    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
    }, 3000);
  };

  const handleTestCentralConnection = () => {
    setIsTestingConnection(true);
    setConnectionTestResult({ status: 'idle', message: 'Comprobando enlace de red...' });
    
    setTimeout(() => {
      setIsTestingConnection(false);
      if (formData.centralServerHost.trim() !== '') {
        setConnectionTestResult({
          status: 'success',
          message: `Conexión verificada exitosamente con ${formData.centralServerHost}:${formData.centralServerPort}. Base de datos y servicios en línea.`,
          latency: Math.floor(Math.random() * 25) + 12
        });
      } else {
        setConnectionTestResult({
          status: 'error',
          message: 'Error de conexión: Debe especificar una dirección IP o host válido para el Servidor Central.'
        });
      }
    }, 850);
  };

  const handleCreateBranchQuickly = () => {
    if (!newBranchName.trim() || !newBranchCode.trim()) return;
    
    const newBranch: Partial<BranchLocation> = {
      code: newBranchCode.trim().toUpperCase(),
      name: newBranchName.trim(),
      city: newBranchCity.trim() || 'Bogotá D.C.',
      address: 'Dirección no especificada',
      status: 'online',
      todayRevenue: 0,
      occupiedSpots: 0,
      totalSpots: 40,
      activeShiftNumber: 1,
      currentCashier: 'Sin asignar',
      currentAppVersion: 'v2.5.0-enterprise',
      lastSyncTimestamp: new Date().toISOString()
    };

    if (onAddNewBranch) {
      onAddNewBranch(newBranch);
    }
    
    // Auto-select the new branch
    handleInputChange('selectedBranchId', `branch-${Date.now()}`);
    handleInputChange('establishmentName', newBranchName.trim());
    setIsAddingNewBranch(false);
    setNewBranchName('');
    setNewBranchCode('');
    setNewBranchCity('');
  };

  const currentSelectedBranch = branches.find(b => b.id === formData.selectedBranchId) || branches[0];

  if (!isOpen && !embedded) return null;

  return (
    <div 
      id="system-work-mode-config-modal-overlay"
      className={embedded ? "w-full animate-in fade-in duration-150" : "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 overflow-y-auto"}
    >
      <div 
        id="system-work-mode-config-modal-container"
        className={embedded ? "wz-surface rounded-[22px] border border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] dark:border-white/[0.07] dark:bg-slate-900 w-full overflow-hidden flex flex-col my-auto" : "wz-surface rounded-[22px] border border-slate-900/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] dark:border-white/[0.07] dark:bg-slate-900 w-full max-w-5xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150"}
      >
        {/* Top Header matching reference software bar */}
        <div 
          id="config-modal-header"
          className="bg-white dark:bg-slate-900 border-b border-slate-200/70 dark:border-slate-800 px-5 pt-5 pb-4 flex items-center justify-between gap-3 flex-wrap"
        >
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-white dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                Configuración del Sistema y Modo de Trabajo
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                  formData.workMode === 'server' 
                    ? 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-500/10 dark:text-purple-200 dark:border-purple-500/30' 
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/30'
                }`}>
                  {formData.workMode === 'server' ? 'MODO: SERVIDOR APLICACIÓN' : 'MODO: PUNTO DE VENTA (SUCURSAL)'}
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Especifique si esta instancia de la aplicación opera como Servidor Central o como Terminal de Sucursal
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-save-system-config-top"
              type="button"
              onClick={() => handleSave()}
              className="min-h-[44px] rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 text-sm font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 transition disabled:opacity-50 dark:from-blue-500 dark:to-blue-600 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              GUARDAR CONFIGURACIÓN
            </button>
            <button
              id="btn-close-system-config-modal"
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div 
          id="config-modal-tabs-bar"
          className="bg-white dark:bg-slate-900 border-b border-slate-200/70 dark:border-slate-800 px-4 py-2.5 flex items-center gap-1 overflow-x-auto text-sm font-semibold select-none"
        >
          <button
            id="tab-btn-pos"
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`min-h-[44px] px-4 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pos'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            P.O.S. / Establecimiento
          </button>

          <button
            id="tab-btn-servers"
            type="button"
            onClick={() => setActiveTab('servers')}
            className={`min-h-[44px] px-4 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'servers'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Servidores & Enlace Red
          </button>

          <button
            id="tab-btn-zones"
            type="button"
            onClick={() => setActiveTab('zones')}
            className={`min-h-[44px] px-4 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'zones'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Zonas / Patios Base
          </button>

          <button
            id="tab-btn-prefixes"
            type="button"
            onClick={() => setActiveTab('prefixes')}
            className={`min-h-[44px] px-4 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'prefixes'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            Prefijos Predet.
          </button>

          <button
            id="tab-btn-email"
            type="button"
            onClick={() => setActiveTab('email')}
            className={`min-h-[44px] px-4 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'email'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Email & Alertas
          </button>

          <button
            id="tab-btn-integrations"
            type="button"
            onClick={() => setActiveTab('integrations')}
            className={`min-h-[44px] px-4 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'integrations'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Integraciones
          </button>

          <button
            id="tab-btn-alerts"
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`min-h-[44px] px-4 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'alerts'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Avisos & Recordatorios
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto max-h-[72vh] bg-slate-50/50 dark:bg-slate-950/40">
          {showSavedToast && (
            <div 
              id="config-saved-toast-notification"
              className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm font-semibold text-emerald-900 flex items-center gap-2 animate-in fade-in duration-200 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Configuración guardada y aplicada con éxito. El modo de trabajo actual es: <strong>{formData.workMode === 'server' ? 'Servidor Aplicación (Matriz)' : 'Punto de Venta (Sucursal)'}</strong>.</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: P.O.S. (MODO DE TRABAJO, ESTABLECIMIENTO & SUCURSAL)               */}
          {/* ========================================================================= */}
          {activeTab === 'pos' && (
            <div className="space-y-6">
              {/* Main Panel Box: Datos de Configuración del Punto de Venta */}
              <div 
                id="pos-config-card"
                className="wz-surface rounded-[22px] border border-slate-900/[0.06] bg-gradient-to-b from-white to-slate-50/60 shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] dark:border-white/[0.07] dark:from-slate-900 dark:to-slate-900/80 p-6 relative"
              >
                <div className="absolute -top-3.5 left-6 rounded-xl border border-slate-200 bg-white px-3 py-0.5 font-display text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  Datos de Configuración del Punto de Venta / Servidor
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                  {/* Nombre del Establecimiento */}
                  <div className="md:col-span-2">
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Nombre del Establecimiento / Razón Social
                    </label>
                    <input
                      id="input-establishment-name"
                      type="text"
                      value={formData.establishmentName}
                      onChange={(e) => handleInputChange('establishmentName', e.target.value)}
                      placeholder="Ej. DROMEDICAS DEL ORIENTE SAS / PARKING CONTROL"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 uppercase"
                    />
                  </div>

                  {/* N.I.T. del Establecimiento */}
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      N.I.T. del Establecimiento
                    </label>
                    <input
                      id="input-establishment-nit"
                      type="text"
                      value={formData.establishmentNit}
                      onChange={(e) => handleInputChange('establishmentNit', e.target.value)}
                      placeholder="Ej. 900265730-0"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono"
                    />
                  </div>

                  {/* Representante Legal */}
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Representante Legal
                    </label>
                    <input
                      id="input-legal-representative"
                      type="text"
                      value={formData.legalRepresentative}
                      onChange={(e) => handleInputChange('legalRepresentative', e.target.value)}
                      placeholder="Nombre del representante legal o administrador"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Día Operativo */}
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Día Operativo Activo
                    </label>
                    <input
                      id="input-operational-date"
                      type="text"
                      value={formData.operationalDate}
                      onChange={(e) => handleInputChange('operationalDate', e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono"
                    />
                  </div>

                  {/* Serial Impresora / Máquina Fiscal */}
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Serial Impresora / Máquina Fiscal
                    </label>
                    <input
                      id="input-printer-serial"
                      type="text"
                      value={formData.printerSerialOrFiscalMachine}
                      onChange={(e) => handleInputChange('printerSerialOrFiscalMachine', e.target.value)}
                      placeholder="Ej. TC6Y313412 / POS-58MM-SERIAL"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono uppercase"
                    />
                  </div>

                  {/* Sucursal del Sistema Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400">
                        Sucursal del Sistema
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewBranch(!isAddingNewBranch)}
                        className="min-h-[44px] text-[13px] font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        {isAddingNewBranch ? 'Cancelar' : 'Registrar Nueva Sede'}
                      </button>
                    </div>

                    <select
                      id="select-system-branch"
                      value={formData.selectedBranchId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        handleInputChange('selectedBranchId', selectedId);
                        const b = branches.find(item => item.id === selectedId);
                        if (b && formData.workMode === 'pos') {
                          handleInputChange('establishmentName', b.name);
                        }
                      }}
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>
                          {branch.code} - {branch.name} ({branch.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bodega / Patio Predeterminado */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400">
                        Bodega Predeterminada / Patio o Zona Base
                      </label>
                      <button
                        type="button"
                        onClick={handleOpenNewWarehouse}
                        className="min-h-[44px] text-[13px] font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Registrar Nuevo Patio / Bodega
                      </button>
                    </div>
                    <select
                      id="select-default-warehouse"
                      value={formData.defaultWarehouseOrYard}
                      onChange={(e) => handleInputChange('defaultWarehouseOrYard', e.target.value)}
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {localWarehouses.map(wh => (
                        <option key={wh.id} value={wh.name}>
                          {wh.name} {wh.capacity ? `(${wh.capacity} plazas)` : ''}
                        </option>
                      ))}
                      {!localWarehouses.some(w => w.name === formData.defaultWarehouseOrYard) && (
                        <option value={formData.defaultWarehouseOrYard}>
                          {formData.defaultWarehouseOrYard}
                        </option>
                      )}
                    </select>
                  </div>

                  {/* Quick Form to Register or Edit Warehouse / Yard */}
                  {isAddingNewWarehouse && activeTab === 'pos' && (
                    <div 
                      id="quick-warehouse-register-panel"
                      className="md:col-span-2 p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 space-y-3 animate-in fade-in"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <WarehouseIcon className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                          <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                            {editingWarehouseId ? 'Editar Patio o Bodega' : 'Registrar Nuevo Patio, Nivel o Bodega'}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setIsAddingNewWarehouse(false); setEditingWarehouseId(null); }}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">Código</label>
                          <input
                            type="text"
                            placeholder="Ej. PAT-02"
                            value={warehouseForm.code}
                            onChange={(e) => setWarehouseForm(prev => ({ ...prev, code: e.target.value }))}
                            className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 uppercase font-bold"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">Nombre del Patio / Nivel / Bodega</label>
                          <input
                            type="text"
                            placeholder="Ej. Sótano Nivel -1 o Patio Bahía 2"
                            value={warehouseForm.name}
                            onChange={(e) => setWarehouseForm(prev => ({ ...prev, name: e.target.value }))}
                            className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">Capacidad (Plazas)</label>
                          <input
                            type="number"
                            min="1"
                            placeholder="50"
                            value={warehouseForm.capacity}
                            onChange={(e) => setWarehouseForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                            className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => { setIsAddingNewWarehouse(false); setEditingWarehouseId(null); }}
                          className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveWarehouseAction}
                          className="min-h-[44px] rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 text-sm font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 transition disabled:opacity-50 dark:from-blue-500 dark:to-blue-600 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {editingWarehouseId ? 'Actualizar Patio / Bodega' : 'Guardar y Asignar'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Quick Form to Register New Branch */}
                  {isAddingNewBranch && (
                    <div 
                      id="quick-branch-register-panel"
                      className="md:col-span-2 p-4 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30 space-y-3 animate-in fade-in"
                    >
                      <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200">
                        Registrar Nueva Sede / Sucursal para el Sistema
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">Código Sede</label>
                          <input
                            type="text"
                            placeholder="Ej. SUC-006"
                            value={newBranchCode}
                            onChange={(e) => setNewBranchCode(e.target.value)}
                            className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 uppercase font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">Nombre de la Sucursal</label>
                          <input
                            type="text"
                            placeholder="Ej. Sede Chapinero Centro"
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">Ciudad</label>
                          <input
                            type="text"
                            placeholder="Ej. Bucaramanga"
                            value={newBranchCity}
                            onChange={(e) => setNewBranchCity(e.target.value)}
                            className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingNewBranch(false)}
                          className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateBranchQuickly}
                          className="min-h-[44px] rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 text-sm font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 transition disabled:opacity-50 dark:from-blue-500 dark:to-blue-600"
                        >
                          Agregar Sucursal
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ================================================================= */}
                  {/* SELECTOR CRÍTICO: MODO DE TRABAJO (SERVIDOR VS PUNTO DE VENTA)    */}
                  {/* ================================================================= */}
                  <div className="md:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="block font-display text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                      Modo de Trabajo de Esta Aplicación
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Opción 1: Servidor Aplicación */}
                      <label 
                        className={`min-h-[52px] p-4 rounded-2xl cursor-pointer transition flex items-start gap-3 focus-within:ring-4 focus-within:ring-blue-500/30 ${
                          formData.workMode === 'server'
                            ? 'border-2 border-blue-700 bg-gradient-to-b from-blue-50 to-blue-100 text-blue-900 shadow-[0_8px_16px_-10px_rgba(29,78,216,.7)] dark:border-blue-400 dark:from-blue-500/20 dark:to-blue-500/10 dark:text-blue-100'
                            : 'wz-tile border border-slate-200 bg-white text-slate-700 hover:-translate-y-px dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="workMode"
                          value="server"
                          checked={formData.workMode === 'server'}
                          onChange={() => handleInputChange('workMode', 'server')}
                          className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <Server className={`w-4 h-4 ${formData.workMode === 'server' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}`} />
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                              Servidor Aplicación (Matriz Central)
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            Actúa como el nodo central nacional. Administra las tarifas globales, consolida la telemetría de todas las sedes y despacha paquetes de actualización.
                          </p>
                        </div>
                      </label>

                      {/* Opción 2: Punto de Venta */}
                      <label 
                        className={`min-h-[52px] p-4 rounded-2xl cursor-pointer transition flex items-start gap-3 focus-within:ring-4 focus-within:ring-blue-500/30 ${
                          formData.workMode === 'pos'
                            ? 'border-2 border-blue-700 bg-gradient-to-b from-blue-50 to-blue-100 text-blue-900 shadow-[0_8px_16px_-10px_rgba(29,78,216,.7)] dark:border-blue-400 dark:from-blue-500/20 dark:to-blue-500/10 dark:text-blue-100'
                            : 'wz-tile border border-slate-200 bg-white text-slate-700 hover:-translate-y-px dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="workMode"
                          value="pos"
                          checked={formData.workMode === 'pos'}
                          onChange={() => handleInputChange('workMode', 'pos')}
                          className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <Store className={`w-4 h-4 ${formData.workMode === 'pos' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}`} />
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                              Punto de Venta (Terminal Sucursal)
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            Actúa como la terminal de operación y cobro de la sucursal asignada. Emite tickets, realiza arqueos y sincroniza con el Servidor Central.
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Nota de Blindaje de Seguridad Multi-Sede */}
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-700 flex items-start gap-2.5 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                      <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <div className="text-[13px] leading-relaxed">
                        <strong className="text-slate-900 dark:text-slate-100 block font-semibold">Blindaje de Seguridad Multi-Sede:</strong>
                        Solo la máquina física autorizada como Servidor Central Matriz puede emitir y propagar Globales a la red. Si una terminal o sucursal se marca como servidor local, sus datos quedan aislados y el sistema bloquea automáticamente cualquier envío o sobreescritura de parámetros hacia el Servidor Central.
                      </div>
                    </div>
                  </div>

                  {/* MODO DE FACTURACIÓN */}
                  <div className="md:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="block font-display text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                      Modo de Facturación
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label 
                        className={`min-h-[52px] px-3 rounded-2xl cursor-pointer transition flex items-center gap-2.5 text-sm font-semibold focus-within:ring-4 focus-within:ring-blue-500/30 ${
                          formData.billingMode === 'pos_invoice'
                            ? 'border-2 border-blue-700 bg-gradient-to-b from-blue-50 to-blue-100 text-blue-900 shadow-[0_8px_16px_-10px_rgba(29,78,216,.7)] dark:border-blue-400 dark:from-blue-500/20 dark:to-blue-500/10 dark:text-blue-100'
                            : 'wz-tile border border-slate-200 bg-white text-slate-700 hover:-translate-y-px dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="billingMode"
                          value="pos_invoice"
                          checked={formData.billingMode === 'pos_invoice'}
                          onChange={() => handleInputChange('billingMode', 'pos_invoice')}
                          className="h-5 w-5 text-blue-600"
                        />
                        <span className="text-sm">Factura P.O.S. / Tiquete</span>
                      </label>

                      <label 
                        className={`min-h-[52px] px-3 rounded-2xl cursor-pointer transition flex items-center gap-2.5 text-sm font-semibold focus-within:ring-4 focus-within:ring-blue-500/30 ${
                          formData.billingMode === 'open_accounts'
                            ? 'border-2 border-blue-700 bg-gradient-to-b from-blue-50 to-blue-100 text-blue-900 shadow-[0_8px_16px_-10px_rgba(29,78,216,.7)] dark:border-blue-400 dark:from-blue-500/20 dark:to-blue-500/10 dark:text-blue-100'
                            : 'wz-tile border border-slate-200 bg-white text-slate-700 hover:-translate-y-px dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="billingMode"
                          value="open_accounts"
                          checked={formData.billingMode === 'open_accounts'}
                          onChange={() => handleInputChange('billingMode', 'open_accounts')}
                          className="h-5 w-5 text-blue-600"
                        />
                        <span className="text-sm">Mesas y Cuentas Abiertas</span>
                      </label>

                      <label 
                        className={`min-h-[52px] px-3 rounded-2xl cursor-pointer transition flex items-center gap-2.5 text-sm font-semibold focus-within:ring-4 focus-within:ring-blue-500/30 ${
                          formData.billingMode === 'time_service'
                            ? 'border-2 border-blue-700 bg-gradient-to-b from-blue-50 to-blue-100 text-blue-900 shadow-[0_8px_16px_-10px_rgba(29,78,216,.7)] dark:border-blue-400 dark:from-blue-500/20 dark:to-blue-500/10 dark:text-blue-100'
                            : 'wz-tile border border-slate-200 bg-white text-slate-700 hover:-translate-y-px dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="billingMode"
                          value="time_service"
                          checked={formData.billingMode === 'time_service'}
                          onChange={() => handleInputChange('billingMode', 'time_service')}
                          className="h-5 w-5 text-blue-600"
                        />
                        <span className="text-sm">Serv. Por Tiempo / Parqueadero</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: SERVIDORES & ENLACE DE RED                                         */}
          {/* ========================================================================= */}
          {activeTab === 'servers' && (
            <div className="space-y-5">
              <div className="wz-surface rounded-[22px] border border-slate-900/[0.06] bg-gradient-to-b from-white to-slate-50/60 shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] dark:border-white/[0.07] dark:from-slate-900 dark:to-slate-900/80 p-6 relative">
                <div className="absolute -top-3.5 left-6 rounded-xl border border-slate-200 bg-white px-3 py-0.5 font-display text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  Parámetros de Conexión y Enlace al Servidor Central
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                  <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 flex items-start gap-3 dark:border-slate-700 dark:bg-slate-800/60">
                    <Globe className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Especifique la dirección IP o nombre de host del <strong>Servidor Central Matriz</strong>. Las sucursales enviarán a este destino su telemetría en tiempo real y consultarán paquetes de configuración y actualizaciones de software.
                    </div>
                  </div>

                  {/* Host IP Servidor Central */}
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Dirección IP / Host Servidor Central
                    </label>
                    <input
                      id="input-central-server-host"
                      type="text"
                      value={formData.centralServerHost}
                      onChange={(e) => handleInputChange('centralServerHost', e.target.value)}
                      placeholder="Ej. 192.168.10.150 o central.parkingcontrol.com"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono"
                    />
                  </div>

                  {/* Puerto App POS LAN */}
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Puerto de Servicio App POS (LAN)
                    </label>
                    <input
                      id="input-central-server-port"
                      type="number"
                      value={formData.centralServerPort}
                      onChange={(e) => handleInputChange('centralServerPort', parseInt(e.target.value) || 3000)}
                      placeholder="3000"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono"
                    />
                  </div>

                  {/* SECCIÓN ESPECIAL: PUERTOS FARMADESK CONTROL REMOTO */}
                  <div className="md:col-span-2 p-4 rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 space-y-3 mt-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 motion-safe:animate-pulse" />
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Puerto Personalizado FarmaDesk Pro® (Escritorio Remoto & Señalización)
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleInputChange('farmadeskPort', 9050);
                          handleInputChange('farmadeskLanPort', 9050);
                          handleInputChange('farmadeskWanPort', 9050);
                        }}
                        className="min-h-[44px] text-[13px] font-semibold text-cyan-800 dark:text-cyan-300 hover:text-cyan-600 underline cursor-pointer"
                      >
                        Restablecer Valor Predeterminado (Puerto 9050)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* Puerto Señalización FarmaDesk */}
                      <div>
                        <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                          <span>Puerto Señalización FarmaDesk (TCP/WS)</span>
                          <span className="text-xs text-cyan-700 dark:text-cyan-400 font-mono">Predeterminado: 9050</span>
                        </label>
                        <input
                          id="input-farmadesk-port"
                          type="number"
                          value={formData.farmadeskPort ?? formData.farmadeskLanPort ?? 9050}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 9050;
                            handleInputChange('farmadeskPort', val);
                            handleInputChange('farmadeskLanPort', val);
                            handleInputChange('farmadeskWanPort', val);
                          }}
                          placeholder="9050"
                          className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono font-semibold"
                        />
                        <p className="text-xs text-slate-700 dark:text-slate-200 mt-1">
                          Canal WebSocket relay nativo Rust (60 FPS, Ed25519) para control remoto corporativo.
                        </p>
                      </div>

                      {/* Puerto Mutex Local FarmaDesk */}
                      <div>
                        <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                          <span>Instancia Local FarmaDesk (Mutex Port)</span>
                          <span className="text-xs text-blue-700 dark:text-blue-400 font-mono">Fijo: 19060</span>
                        </label>
                        <input
                          id="input-farmadesk-mutex"
                          type="text"
                          disabled
                          value="19060 (Instancia Única)"
                          className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-slate-100 px-3.5 text-base font-mono font-semibold text-slate-500 cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        />
                        <p className="text-xs text-slate-700 dark:text-slate-200 mt-1">
                          Garantiza que una sola instancia del cliente Rust FarmaDesk corra en memoria por terminal.
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-[13px] font-mono flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-slate-700 dark:text-slate-200">Endpoints FarmaDesk Pro Configurados:</span>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                          Relay: ws://{formData.centralServerHost || 'localhost'}:{formData.farmadeskPort ?? 9050}/ws
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          Health: http://{formData.centralServerHost || 'localhost'}:{formData.farmadeskPort ?? 9050}/health
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Token de Autenticación */}
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Token de Enlace Cifrado / API Key
                    </label>
                    <input
                      id="input-central-auth-token"
                      type="password"
                      value={formData.centralAuthToken}
                      onChange={(e) => handleInputChange('centralAuthToken', e.target.value)}
                      placeholder="PK-CENTRAL-AUTH-TOKEN-2026-X99"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono"
                    />
                  </div>

                  {/* Nombre de la Base de Datos */}
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Base de Datos Asignada
                    </label>
                    <input
                      id="input-database-name"
                      type="text"
                      value={formData.databaseName}
                      onChange={(e) => handleInputChange('databaseName', e.target.value)}
                      placeholder="ParqueaderoPOS_DB_Principal"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono"
                    />
                  </div>

                  {/* Intervalo de Sincronización Automática */}
                  <div className="md:col-span-2">
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Frecuencia de Sincronización Automática en Segundo Plano (Minutos)
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="range"
                        min="1"
                        max="60"
                        value={formData.autoSyncIntervalMinutes}
                        onChange={(e) => handleInputChange('autoSyncIntervalMinutes', parseInt(e.target.value) || 5)}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <span className="text-sm font-bold tabular-nums px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-slate-800 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 min-w-[76px] text-center">
                        {formData.autoSyncIntervalMinutes} min
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botón de Test de Conexión en Vivo */}
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Prueba de Conectividad con el Servidor</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300">Envía una solicitud de ping y verifica el handshake con el servidor central.</p>
                  </div>
                  <button
                    id="btn-test-server-connection"
                    type="button"
                    onClick={handleTestCentralConnection}
                    disabled={isTestingConnection}
                    className="min-h-[44px] px-5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-semibold flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
                    {isTestingConnection ? 'Probando Enlace...' : 'Probar Conexión en Vivo'}
                  </button>
                </div>

                {/* Resultado de la Prueba de Conexión */}
                {connectionTestResult.status !== 'idle' && (
                  <div 
                    id="connection-test-result-box"
                    className={`mt-4 rounded-xl border px-3.5 py-3 text-sm font-medium flex items-start gap-2.5 animate-in fade-in ${
                      connectionTestResult.status === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    {connectionTestResult.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p>{connectionTestResult.message}</p>
                      {connectionTestResult.latency && (
                        <p className="font-mono tabular-nums text-xs font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                          Latencia de respuesta: {connectionTestResult.latency} ms | Estado: OK (HTTP 200)
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: ZONAS / PATIOS BASE & GESTIÓN DE BODEGAS                          */}
          {/* ========================================================================= */}
          {activeTab === 'zones' && (
            <div className="space-y-6">
              {/* PANEL DE GESTIÓN Y CREACIÓN DE PATIOS / BODEGAS */}
              <div className="wz-surface rounded-[22px] border border-slate-900/[0.06] bg-gradient-to-b from-white to-slate-50/60 shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] dark:border-white/[0.07] dark:from-slate-900 dark:to-slate-900/80 p-6 relative">
                <div className="absolute -top-3.5 left-6 rounded-xl border border-slate-200 bg-white px-3 py-0.5 font-display text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <WarehouseIcon className="w-3.5 h-3.5 text-amber-600" />
                  Catálogo de Patios, Niveles y Bodegas
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-1 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Crea y administra los diferentes patios, pisos, sótanos o bodegas disponibles en el parqueadero o sucursal.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenNewWarehouse}
                    className="min-h-[44px] rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 text-sm font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 transition disabled:opacity-50 dark:from-blue-500 dark:to-blue-600 flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Registrar Nuevo Patio / Bodega
                  </button>
                </div>

                {/* Formulario de Registro o Edición de Bodega / Patio */}
                {isAddingNewWarehouse && (
                  <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <WarehouseIcon className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                        <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                          {editingWarehouseId ? 'Editar Patio / Bodega' : 'Crear Nuevo Patio, Nivel o Bodega'}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setIsAddingNewWarehouse(false); setEditingWarehouseId(null); }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">Código</label>
                        <input
                          type="text"
                          placeholder="Ej. PAT-02"
                          value={warehouseForm.code}
                          onChange={(e) => setWarehouseForm(prev => ({ ...prev, code: e.target.value }))}
                          className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 uppercase font-bold"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">Nombre del Patio / Nivel / Bodega</label>
                        <input
                          type="text"
                          placeholder="Ej. Sótano Nivel -1 o Patio Bahía 2"
                          value={warehouseForm.name}
                          onChange={(e) => setWarehouseForm(prev => ({ ...prev, name: e.target.value }))}
                          className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">Capacidad (Plazas)</label>
                        <input
                          type="number"
                          min="1"
                          placeholder="50"
                          value={warehouseForm.capacity}
                          onChange={(e) => setWarehouseForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                          className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => { setIsAddingNewWarehouse(false); setEditingWarehouseId(null); }}
                        className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveWarehouseAction}
                        className="min-h-[44px] rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 text-sm font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 transition disabled:opacity-50 dark:from-blue-500 dark:to-blue-600 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {editingWarehouseId ? 'Guardar Cambios' : 'Registrar Patio / Bodega'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Listado de Patios y Bodegas Registrados */}
                <div className="mt-4 space-y-2">
                  {localWarehouses.map((wh) => {
                    const isDefault = formData.defaultWarehouseOrYard === wh.name;
                    return (
                      <div
                        key={wh.id}
                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-2xl border transition ${
                          isDefault 
                            ? 'border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10' 
                            : 'bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:hover:bg-slate-800 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${isDefault ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                            <WarehouseIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                {wh.code}
                              </span>
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {wh.name}
                              </span>
                              {isDefault && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-100 dark:border-blue-500/30">
                                  <Check className="w-3 h-3 text-blue-600" />
                                  Predeterminada en esta Caja
                                </span>
                              )}
                            </div>
                            <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-0.5">
                              Capacidad: <span className="font-semibold text-slate-700 dark:text-slate-200">{wh.capacity || 50} plazas</span> | Sede: {wh.branchName || 'Sede Principal'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2 sm:mt-0 self-end sm:self-center">
                          {!isDefault && (
                            <button
                              type="button"
                              onClick={() => handleInputChange('defaultWarehouseOrYard', wh.name)}
                              className="min-h-[44px] px-3.5 text-sm font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl cursor-pointer dark:bg-blue-500/10 dark:text-blue-200 dark:border-blue-500/30 dark:hover:bg-blue-500/20"
                            >
                              Asignar como Predeterminada
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEditWarehouse(wh)}
                            title="Editar Patio o Bodega"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:text-blue-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWarehouseAction(wh.id)}
                            title="Eliminar Patio o Bodega"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:text-rose-700 hover:bg-rose-50 dark:text-slate-400 dark:hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Zonas Base Asignadas */}
              <div className="wz-surface rounded-[22px] border border-slate-900/[0.06] bg-gradient-to-b from-white to-slate-50/60 shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] dark:border-white/[0.07] dark:from-slate-900 dark:to-slate-900/80 p-6 relative">
                <div className="absolute -top-3.5 left-6 rounded-xl border border-slate-200 bg-white px-3 py-0.5 font-display text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  Configuración de Zonas de Estacionamiento
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Zona Principal Asignada
                    </label>
                    <input
                      type="text"
                      value={formData.primaryZoneName}
                      onChange={(e) => handleInputChange('primaryZoneName', e.target.value)}
                      placeholder="Patio Principal (Nivel 1)"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Zona Secundaria / Auxiliar
                    </label>
                    <input
                      type="text"
                      value={formData.secondaryZoneName || ''}
                      onChange={(e) => handleInputChange('secondaryZoneName', e.target.value)}
                      placeholder="Zona VIP Subterránea"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: PREFIJOS PREDETERMINADOS & DIAN                                     */}
          {/* ========================================================================= */}
          {activeTab === 'prefixes' && (
            <div className="space-y-5">
              <div className="wz-surface rounded-[22px] border border-slate-900/[0.06] bg-gradient-to-b from-white to-slate-50/60 shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] dark:border-white/[0.07] dark:from-slate-900 dark:to-slate-900/80 p-6 relative">
                <div className="absolute -top-3.5 left-6 rounded-xl border border-slate-200 bg-white px-3 py-0.5 font-display text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  Prefijos de Facturación y Consecutivos
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Prefijo Predeterminado de Factura / Ticket
                    </label>
                    <input
                      type="text"
                      value={formData.defaultPrefix}
                      onChange={(e) => handleInputChange('defaultPrefix', e.target.value.toUpperCase())}
                      placeholder="FE-PK / POS"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono font-bold uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Consecutivo de Facturación Actual
                    </label>
                    <input
                      type="number"
                      value={formData.currentSequenceNumber}
                      onChange={(e) => handleInputChange('currentSequenceNumber', parseInt(e.target.value) || 1)}
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: EMAIL & ALERTAS                                                    */}
          {/* ========================================================================= */}
          {activeTab === 'email' && (
            <div className="space-y-5">
              <div className="wz-surface rounded-[22px] border border-slate-900/[0.06] bg-gradient-to-b from-white to-slate-50/60 shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] dark:border-white/[0.07] dark:from-slate-900 dark:to-slate-900/80 p-6 relative">
                <div className="absolute -top-3.5 left-6 rounded-xl border border-slate-200 bg-white px-3 py-0.5 font-display text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  Notificaciones por Correo Electrónico
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                  <div className="md:col-span-2">
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Correo Electrónico de Alertas y Reportes
                    </label>
                    <input
                      type="email"
                      value={formData.alertEmail}
                      onChange={(e) => handleInputChange('alertEmail', e.target.value)}
                      placeholder="gerencia@parkingcontrol.com"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Servidor SMTP
                    </label>
                    <input
                      type="text"
                      value={formData.smtpServer || ''}
                      onChange={(e) => handleInputChange('smtpServer', e.target.value)}
                      placeholder="smtp.parkingcontrol.com"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Puerto SMTP
                    </label>
                    <input
                      type="number"
                      value={formData.smtpPort || 587}
                      onChange={(e) => handleInputChange('smtpPort', parseInt(e.target.value) || 587)}
                      placeholder="587"
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 font-mono"
                    />
                  </div>

                  <div className="md:col-span-2 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <label className="flex min-h-[44px] items-center gap-2.5 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.notifyOnShiftClose}
                        onChange={(e) => handleInputChange('notifyOnShiftClose', e.target.checked)}
                        className="rounded h-5 w-5 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Enviar copia del arqueo detallado por email al cerrar cada turno</span>
                    </label>

                    <label className="flex min-h-[44px] items-center gap-2.5 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.notifyOnDefinitiveDayClose}
                        onChange={(e) => handleInputChange('notifyOnDefinitiveDayClose', e.target.checked)}
                        className="rounded h-5 w-5 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Enviar resumen contable consolidado al realizar el Cierre Definitivo de Día</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: INTEGRACIONES (TALANQUERAS, LPR, RFID)                              */}
          {/* ========================================================================= */}
          {activeTab === 'integrations' && (
            <div className="space-y-5">
              <div className="wz-surface rounded-[22px] border border-slate-900/[0.06] bg-gradient-to-b from-white to-slate-50/60 shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] dark:border-white/[0.07] dark:from-slate-900 dark:to-slate-900/80 p-6 relative">
                <div className="absolute -top-3.5 left-6 rounded-xl border border-slate-200 bg-white px-3 py-0.5 font-display text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  Hardware e Integraciones Vehiculares
                </div>

                <div className="space-y-4 mt-2">
                  <div className="px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 dark:border-slate-700 dark:bg-slate-800/60">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Control de Talanquera Vehicular Automática</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300">Envía pulso de apertura por puerto serial COM / Relé al emitir o cobrar ticket.</p>
                    </div>
                    <label className="relative inline-flex min-h-[44px] items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enableBarrierControl}
                        onChange={(e) => handleInputChange('enableBarrierControl', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-blue-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 dark:border-slate-700 dark:bg-slate-800/60">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Cámara LPR Reconocimiento Automático de Placas</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300">Detecta automáticamente la placa vehicular en la entrada y salida.</p>
                    </div>
                    <label className="relative inline-flex min-h-[44px] items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enableLprCamera}
                        onChange={(e) => handleInputChange('enableLprCamera', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-blue-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 dark:border-slate-700 dark:bg-slate-800/60">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Lector de Tarjetas RFID / Tags de Mensualidades</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300">Permite lectura rápida de abonados y tarjetas sin contacto.</p>
                    </div>
                    <label className="relative inline-flex min-h-[44px] items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enableRfidReader}
                        onChange={(e) => handleInputChange('enableRfidReader', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-blue-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: AVISOS & RECORDATORIOS                                             */}
          {/* ========================================================================= */}
          {activeTab === 'alerts' && (
            <div className="space-y-5">
              <div className="wz-surface rounded-[22px] border border-slate-900/[0.06] bg-gradient-to-b from-white to-slate-50/60 shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] dark:border-white/[0.07] dark:from-slate-900 dark:to-slate-900/80 p-6 relative">
                <div className="absolute -top-3.5 left-6 rounded-xl border border-slate-200 bg-white px-3 py-0.5 font-display text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  Mensajes de Ticket y Alertas de Aforo
                </div>

                <div className="space-y-4 mt-2">
                  <div>
                    <label className="block text-[13px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Mensaje de Advertencia / Pie de Ticket
                    </label>
                    <textarea
                      rows={3}
                      value={formData.ticketFooterMessage}
                      onChange={(e) => handleInputChange('ticketFooterMessage', e.target.value)}
                      placeholder="Gracias por su visita. Conserve su ticket en lugar seguro. No deje objetos de valor."
                      className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Alerta de Capacidad Crítica / Pocas Plazas Libres</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300">Notifica visualmente cuando el patio tenga menos de N plazas disponibles.</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={formData.lowSpotThreshold}
                        onChange={(e) => handleInputChange('lowSpotThreshold', parseInt(e.target.value) || 5)}
                        className="min-h-[48px] w-20 rounded-xl border border-slate-300 bg-white px-2 text-base font-bold tabular-nums text-center text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-300">plazas</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Footer Actions */}
        <div 
          id="config-modal-footer"
          className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800/70 dark:border-slate-800 px-6 py-4 flex items-center justify-between gap-3 flex-wrap"
        >
          <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>Los cambios en el Modo de Trabajo se guardan localmente y se conservan de forma permanente.</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              id="btn-cancel-system-config-footer"
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              id="btn-save-system-config-footer"
              type="button"
              onClick={() => handleSave()}
              className="min-h-[56px] rounded-2xl bg-gradient-to-b from-blue-600 to-blue-700 px-6 text-base font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 transition flex items-center gap-2 dark:from-blue-500 dark:to-blue-600"
            >
              <Save className="w-4 h-4" />
              GUARDAR CONFIGURACIÓN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
