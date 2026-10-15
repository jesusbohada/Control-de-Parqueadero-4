import React, { useState } from 'react';
import { 
  Server, 
  Store, 
  Save, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Radio, 
  Cpu, 
  Globe, 
  Printer, 
  ShieldCheck, 
  RefreshCw, 
  Layers, 
  Hash, 
  Mail, 
  Sliders, 
  Clock, 
  Plus, 
  FileText, 
  Zap,
  HardDrive,
  Users
} from 'lucide-react';
import { SystemNodeConfig, SystemWorkMode, BillingSystemMode, BranchLocation, SystemUser } from '../types';

interface SystemWorkModeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SystemNodeConfig;
  branches: BranchLocation[];
  onSaveConfig: (updatedConfig: SystemNodeConfig) => void;
  onAddNewBranch?: (branch: Partial<BranchLocation>) => void;
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
  onSaveConfig,
  onAddNewBranch,
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
      className={embedded ? "w-full animate-in fade-in duration-150" : "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto"}
    >
      <div 
        id="system-work-mode-config-modal-container"
        className={embedded ? "bg-white rounded-xl shadow-xl border border-slate-300 w-full overflow-hidden flex flex-col my-auto" : "bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150"}
      >
        {/* Top Header matching reference software bar */}
        <div 
          id="config-modal-header"
          className="bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 border-b border-slate-300 px-6 py-3 flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                Configuración del Sistema y Modo de Trabajo
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  formData.workMode === 'server' 
                    ? 'bg-purple-100 text-purple-800 border-purple-300' 
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
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
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              GUARDAR CONFIGURACIÓN
            </button>
            <button
              id="btn-close-system-config-modal"
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div 
          id="config-modal-tabs-bar"
          className="bg-slate-100 border-b border-slate-300 px-4 flex items-center space-x-1 overflow-x-auto text-xs font-semibold select-none"
        >
          <button
            id="tab-btn-pos"
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'pos'
                ? 'border-blue-600 text-blue-700 bg-white font-bold shadow-sm'
                : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            P.O.S. / Establecimiento
          </button>

          <button
            id="tab-btn-servers"
            type="button"
            onClick={() => setActiveTab('servers')}
            className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'servers'
                ? 'border-blue-600 text-blue-700 bg-white font-bold shadow-sm'
                : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Servidores & Enlace Red
          </button>

          <button
            id="tab-btn-zones"
            type="button"
            onClick={() => setActiveTab('zones')}
            className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'zones'
                ? 'border-blue-600 text-blue-700 bg-white font-bold shadow-sm'
                : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Zonas / Patios Base
          </button>

          <button
            id="tab-btn-prefixes"
            type="button"
            onClick={() => setActiveTab('prefixes')}
            className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'prefixes'
                ? 'border-blue-600 text-blue-700 bg-white font-bold shadow-sm'
                : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            Prefijos Predet.
          </button>

          <button
            id="tab-btn-email"
            type="button"
            onClick={() => setActiveTab('email')}
            className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'email'
                ? 'border-blue-600 text-blue-700 bg-white font-bold shadow-sm'
                : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Email & Alertas
          </button>

          <button
            id="tab-btn-integrations"
            type="button"
            onClick={() => setActiveTab('integrations')}
            className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'integrations'
                ? 'border-blue-600 text-blue-700 bg-white font-bold shadow-sm'
                : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Integraciones
          </button>

          <button
            id="tab-btn-alerts"
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'alerts'
                ? 'border-blue-600 text-blue-700 bg-white font-bold shadow-sm'
                : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Avisos & Recordatorios
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto max-h-[72vh] bg-slate-50/50">
          {showSavedToast && (
            <div 
              id="config-saved-toast-notification"
              className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-semibold flex items-center gap-2 shadow-sm animate-in fade-in duration-200"
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
                className="bg-white rounded-xl border border-slate-300 shadow-sm p-6 relative"
              >
                <div className="absolute -top-3 left-6 bg-white px-2 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider border border-slate-200 rounded">
                  Datos de Configuración del Punto de Venta / Servidor
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                  {/* Nombre del Establecimiento */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Nombre del Establecimiento / Razón Social
                    </label>
                    <input
                      id="input-establishment-name"
                      type="text"
                      value={formData.establishmentName}
                      onChange={(e) => handleInputChange('establishmentName', e.target.value)}
                      placeholder="Ej. DROMEDICAS DEL ORIENTE SAS / PARKING CONTROL"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-200 uppercase"
                    />
                  </div>

                  {/* N.I.T. del Establecimiento */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      N.I.T. del Establecimiento
                    </label>
                    <input
                      id="input-establishment-nit"
                      type="text"
                      value={formData.establishmentNit}
                      onChange={(e) => handleInputChange('establishmentNit', e.target.value)}
                      placeholder="Ej. 900265730-0"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Representante Legal */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Representante Legal
                    </label>
                    <input
                      id="input-legal-representative"
                      type="text"
                      value={formData.legalRepresentative}
                      onChange={(e) => handleInputChange('legalRepresentative', e.target.value)}
                      placeholder="Nombre del representante legal o administrador"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Día Operativo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Día Operativo Activo
                    </label>
                    <input
                      id="input-operational-date"
                      type="text"
                      value={formData.operationalDate}
                      onChange={(e) => handleInputChange('operationalDate', e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Serial Impresora / Máquina Fiscal */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Serial Impresora / Máquina Fiscal
                    </label>
                    <input
                      id="input-printer-serial"
                      type="text"
                      value={formData.printerSerialOrFiscalMachine}
                      onChange={(e) => handleInputChange('printerSerialOrFiscalMachine', e.target.value)}
                      placeholder="Ej. TC6Y313412 / POS-58MM-SERIAL"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 dark:text-slate-200 uppercase"
                    />
                  </div>

                  {/* Sucursal del Sistema Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                        Sucursal del Sistema
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewBranch(!isAddingNewBranch)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
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
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-200 bg-white"
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
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Bodega Predeterminada / Patio o Zona Base
                    </label>
                    <select
                      id="select-default-warehouse"
                      value={formData.defaultWarehouseOrYard}
                      onChange={(e) => handleInputChange('defaultWarehouseOrYard', e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-200 bg-white"
                    >
                      <option value="PATIO PRINCIPAL">PATIO PRINCIPAL (NIVEL 1)</option>
                      <option value="ZONA VIP SUBTERRÁNEA">ZONA VIP SUBTERRÁNEA (NIVEL -1)</option>
                      <option value="DEPÓSITO CÚCUTA">DEPÓSITO CÚCUTA</option>
                      <option value="BOD. FARMANORTE 03">BOD. FARMANORTE 03</option>
                      <option value="PATIO BAHÍA EXTERIOR">PATIO BAHÍA EXTERIOR</option>
                    </select>
                  </div>

                  {/* Quick Form to Register New Branch */}
                  {isAddingNewBranch && (
                    <div 
                      id="quick-branch-register-panel"
                      className="md:col-span-2 p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-3 animate-in fade-in"
                    >
                      <h4 className="text-xs font-bold text-blue-900 uppercase">
                        Registrar Nueva Sede / Sucursal para el Sistema
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Código Sede</label>
                          <input
                            type="text"
                            placeholder="Ej. SUC-006"
                            value={newBranchCode}
                            onChange={(e) => setNewBranchCode(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded uppercase font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Nombre de la Sucursal</label>
                          <input
                            type="text"
                            placeholder="Ej. Sede Chapinero Centro"
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Ciudad</label>
                          <input
                            type="text"
                            placeholder="Ej. Bucaramanga"
                            value={newBranchCity}
                            onChange={(e) => setNewBranchCity(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingNewBranch(false)}
                          className="px-3 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-800"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateBranchQuickly}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-sm"
                        >
                          Agregar Sucursal
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ================================================================= */}
                  {/* SELECTOR CRÍTICO: MODO DE TRABAJO (SERVIDOR VS PUNTO DE VENTA)    */}
                  {/* ================================================================= */}
                  <div className="md:col-span-2 pt-2 border-t border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-2">
                      Modo de Trabajo de Esta Aplicación
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Opción 1: Servidor Aplicación */}
                      <label 
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                          formData.workMode === 'server'
                            ? 'border-purple-600 bg-purple-50/70 shadow-sm ring-1 ring-purple-400'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="workMode"
                          value="server"
                          checked={formData.workMode === 'server'}
                          onChange={() => handleInputChange('workMode', 'server')}
                          className="mt-1 w-4 h-4 text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <Server className={`w-4 h-4 ${formData.workMode === 'server' ? 'text-purple-700' : 'text-slate-600 dark:text-slate-300'}`} />
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
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                          formData.workMode === 'pos'
                            ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-400'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="workMode"
                          value="pos"
                          checked={formData.workMode === 'pos'}
                          onChange={() => handleInputChange('workMode', 'pos')}
                          className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <Store className={`w-4 h-4 ${formData.workMode === 'pos' ? 'text-blue-700' : 'text-slate-600 dark:text-slate-300'}`} />
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
                  </div>

                  {/* MODO DE FACTURACIÓN */}
                  <div className="md:col-span-2 pt-2 border-t border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-2">
                      Modo de Facturación
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label 
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-2.5 ${
                          formData.billingMode === 'pos_invoice'
                            ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                            : 'border-slate-200 bg-white text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="billingMode"
                          value="pos_invoice"
                          checked={formData.billingMode === 'pos_invoice'}
                          onChange={() => handleInputChange('billingMode', 'pos_invoice')}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-xs">Factura P.O.S. / Tiquete</span>
                      </label>

                      <label 
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-2.5 ${
                          formData.billingMode === 'open_accounts'
                            ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                            : 'border-slate-200 bg-white text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="billingMode"
                          value="open_accounts"
                          checked={formData.billingMode === 'open_accounts'}
                          onChange={() => handleInputChange('billingMode', 'open_accounts')}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-xs">Mesas y Cuentas Abiertas</span>
                      </label>

                      <label 
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-2.5 ${
                          formData.billingMode === 'time_service'
                            ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                            : 'border-slate-200 bg-white text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="billingMode"
                          value="time_service"
                          checked={formData.billingMode === 'time_service'}
                          onChange={() => handleInputChange('billingMode', 'time_service')}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-xs">Serv. Por Tiempo / Parqueadero</span>
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
              <div className="bg-white rounded-xl border border-slate-300 shadow-sm p-6 relative">
                <div className="absolute -top-3 left-6 bg-white px-2 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider border border-slate-200 rounded">
                  Parámetros de Conexión y Enlace al Servidor Central
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                  <div className="md:col-span-2 p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-3">
                    <Globe className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Especifique la dirección IP o nombre de host del <strong>Servidor Central Matriz</strong>. Las sucursales enviarán a este destino su telemetría en tiempo real y consultarán paquetes de configuración y actualizaciones de software.
                    </div>
                  </div>

                  {/* Host IP Servidor Central */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Dirección IP / Host Servidor Central
                    </label>
                    <input
                      id="input-central-server-host"
                      type="text"
                      value={formData.centralServerHost}
                      onChange={(e) => handleInputChange('centralServerHost', e.target.value)}
                      placeholder="Ej. 192.168.10.150 o central.parkingcontrol.com"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Puerto App POS LAN */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Puerto de Servicio App POS (LAN)
                    </label>
                    <input
                      id="input-central-server-port"
                      type="number"
                      value={formData.centralServerPort}
                      onChange={(e) => handleInputChange('centralServerPort', parseInt(e.target.value) || 3000)}
                      placeholder="3000"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* SECCIÓN ESPECIAL: PUERTOS FARMADESK CONTROL REMOTO */}
                  <div className="md:col-span-2 p-4 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 space-y-3 mt-2 shadow-inner">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 animate-pulse" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
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
                        className="text-[11px] text-cyan-800 dark:text-cyan-300 hover:text-cyan-500 underline font-mono cursor-pointer"
                      >
                        Restablecer Valor Predeterminado (Puerto 9050)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* Puerto Señalización FarmaDesk */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                          <span>Puerto Señalización FarmaDesk (TCP/WS)</span>
                          <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">Predeterminado: 9050</span>
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
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-cyan-500 font-mono text-cyan-800 dark:text-cyan-300 font-bold"
                        />
                        <p className="text-[10px] text-slate-700 dark:text-slate-200 mt-1">
                          Canal WebSocket relay nativo Rust (60 FPS, Ed25519) para control remoto corporativo.
                        </p>
                      </div>

                      {/* Puerto Mutex Local FarmaDesk */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                          <span>Instancia Local FarmaDesk (Mutex Port)</span>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">Fijo: 19060</span>
                        </label>
                        <input
                          id="input-farmadesk-mutex"
                          type="text"
                          disabled
                          value="19060 (Instancia Única)"
                          className="w-full px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-500 dark:text-slate-400 font-bold cursor-not-allowed"
                        />
                        <p className="text-[10px] text-slate-700 dark:text-slate-200 mt-1">
                          Garantiza que una sola instancia del cliente Rust FarmaDesk corra en memoria por terminal.
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-mono flex items-center justify-between gap-2 flex-wrap">
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
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Token de Enlace Cifrado / API Key
                    </label>
                    <input
                      id="input-central-auth-token"
                      type="password"
                      value={formData.centralAuthToken}
                      onChange={(e) => handleInputChange('centralAuthToken', e.target.value)}
                      placeholder="PK-CENTRAL-AUTH-TOKEN-2026-X99"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Nombre de la Base de Datos */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Base de Datos Asignada
                    </label>
                    <input
                      id="input-database-name"
                      type="text"
                      value={formData.databaseName}
                      onChange={(e) => handleInputChange('databaseName', e.target.value)}
                      placeholder="ParqueaderoPOS_DB_Principal"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Intervalo de Sincronización Automática */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Frecuencia de Sincronización Automática en Segundo Plano (Minutos)
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="range"
                        min="1"
                        max="60"
                        value={formData.autoSyncIntervalMinutes}
                        onChange={(e) => handleInputChange('autoSyncIntervalMinutes', parseInt(e.target.value) || 5)}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <span className="text-xs font-bold font-mono px-3 py-1 bg-slate-100 border border-slate-300 rounded text-slate-800 dark:text-slate-200 min-w-[70px] text-center">
                        {formData.autoSyncIntervalMinutes} min
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botón de Test de Conexión en Vivo */}
                <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Prueba de Conectividad con el Servidor</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">Envía una solicitud de ping y verifica el handshake con el servidor central.</p>
                  </div>
                  <button
                    id="btn-test-server-connection"
                    type="button"
                    onClick={handleTestCentralConnection}
                    disabled={isTestingConnection}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
                    {isTestingConnection ? 'Probando Enlace...' : 'Probar Conexión en Vivo'}
                  </button>
                </div>

                {/* Resultado de la Prueba de Conexión */}
                {connectionTestResult.status !== 'idle' && (
                  <div 
                    id="connection-test-result-box"
                    className={`mt-4 p-3.5 rounded-lg border text-xs font-medium flex items-start gap-2.5 animate-in fade-in ${
                      connectionTestResult.status === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
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
                        <p className="font-mono text-[11px] font-bold text-emerald-700 mt-1">
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
          {/* TAB 3: ZONAS / PATIOS BASE                                                */}
          {/* ========================================================================= */}
          {activeTab === 'zones' && (
            <div className="space-y-5">
              <div className="bg-white rounded-xl border border-slate-300 shadow-sm p-6 relative">
                <div className="absolute -top-3 left-6 bg-white px-2 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider border border-slate-200 rounded">
                  Configuración de Zonas y Patios de Estacionamiento
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Zona Principal Asignada
                    </label>
                    <input
                      type="text"
                      value={formData.primaryZoneName}
                      onChange={(e) => handleInputChange('primaryZoneName', e.target.value)}
                      placeholder="Patio Principal (Nivel 1)"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Zona Secundaria / Auxiliar
                    </label>
                    <input
                      type="text"
                      value={formData.secondaryZoneName || ''}
                      onChange={(e) => handleInputChange('secondaryZoneName', e.target.value)}
                      placeholder="Zona VIP Subterránea"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg text-slate-800 dark:text-slate-200"
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
              <div className="bg-white rounded-xl border border-slate-300 shadow-sm p-6 relative">
                <div className="absolute -top-3 left-6 bg-white px-2 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider border border-slate-200 rounded">
                  Prefijos de Facturación y Consecutivos
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Prefijo Predeterminado de Factura / Ticket
                    </label>
                    <input
                      type="text"
                      value={formData.defaultPrefix}
                      onChange={(e) => handleInputChange('defaultPrefix', e.target.value.toUpperCase())}
                      placeholder="FE-PK / POS"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-mono font-bold text-slate-800 dark:text-slate-200 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Consecutivo de Facturación Actual
                    </label>
                    <input
                      type="number"
                      value={formData.currentSequenceNumber}
                      onChange={(e) => handleInputChange('currentSequenceNumber', parseInt(e.target.value) || 1)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-mono font-bold text-slate-800 dark:text-slate-200"
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
              <div className="bg-white rounded-xl border border-slate-300 shadow-sm p-6 relative">
                <div className="absolute -top-3 left-6 bg-white px-2 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider border border-slate-200 rounded">
                  Notificaciones por Correo Electrónico
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Correo Electrónico de Alertas y Reportes
                    </label>
                    <input
                      type="email"
                      value={formData.alertEmail}
                      onChange={(e) => handleInputChange('alertEmail', e.target.value)}
                      placeholder="gerencia@parkingcontrol.com"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Servidor SMTP
                    </label>
                    <input
                      type="text"
                      value={formData.smtpServer || ''}
                      onChange={(e) => handleInputChange('smtpServer', e.target.value)}
                      placeholder="smtp.parkingcontrol.com"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Puerto SMTP
                    </label>
                    <input
                      type="number"
                      value={formData.smtpPort || 587}
                      onChange={(e) => handleInputChange('smtpPort', parseInt(e.target.value) || 587)}
                      placeholder="587"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg text-slate-800 dark:text-slate-200 font-mono"
                    />
                  </div>

                  <div className="md:col-span-2 pt-3 border-t border-slate-200 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.notifyOnShiftClose}
                        onChange={(e) => handleInputChange('notifyOnShiftClose', e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span>Enviar copia del arqueo detallado por email al cerrar cada turno</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.notifyOnDefinitiveDayClose}
                        onChange={(e) => handleInputChange('notifyOnDefinitiveDayClose', e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
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
              <div className="bg-white rounded-xl border border-slate-300 shadow-sm p-6 relative">
                <div className="absolute -top-3 left-6 bg-white px-2 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider border border-slate-200 rounded">
                  Hardware e Integraciones Vehiculares
                </div>

                <div className="space-y-4 mt-2">
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Control de Talanquera Vehicular Automática</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">Envía pulso de apertura por puerto serial COM / Relé al emitir o cobrar ticket.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enableBarrierControl}
                        onChange={(e) => handleInputChange('enableBarrierControl', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Cámara LPR Reconocimiento Automático de Placas</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">Detecta automáticamente la placa vehicular en la entrada y salida.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enableLprCamera}
                        onChange={(e) => handleInputChange('enableLprCamera', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Lector de Tarjetas RFID / Tags de Mensualidades</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">Permite lectura rápida de abonados y tarjetas sin contacto.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enableRfidReader}
                        onChange={(e) => handleInputChange('enableRfidReader', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
              <div className="bg-white rounded-xl border border-slate-300 shadow-sm p-6 relative">
                <div className="absolute -top-3 left-6 bg-white px-2 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider border border-slate-200 rounded">
                  Mensajes de Ticket y Alertas de Aforo
                </div>

                <div className="space-y-4 mt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Mensaje de Advertencia / Pie de Ticket
                    </label>
                    <textarea
                      rows={3}
                      value={formData.ticketFooterMessage}
                      onChange={(e) => handleInputChange('ticketFooterMessage', e.target.value)}
                      placeholder="Gracias por su visita. Conserve su ticket en lugar seguro. No deje objetos de valor."
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Alerta de Capacidad Crítica / Pocas Plazas Libres</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">Notifica visualmente cuando el patio tenga menos de N plazas disponibles.</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={formData.lowSpotThreshold}
                        onChange={(e) => handleInputChange('lowSpotThreshold', parseInt(e.target.value) || 5)}
                        className="w-16 px-2 py-1 text-xs font-bold font-mono border border-slate-300 rounded text-center"
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
          className="bg-slate-100 border-t border-slate-300 px-6 py-3.5 flex items-center justify-between"
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
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              id="btn-save-system-config-footer"
              type="button"
              onClick={() => handleSave()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
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
