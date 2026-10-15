import React, { useState, useMemo } from 'react';
import { 
  Settings, 
  Car, 
  Bike, 
  Truck, 
  Building2, 
  Save, 
  RotateCcw, 
  Check, 
  Clock, 
  ShieldAlert,
  Percent,
  Coins,
  CreditCard,
  FileCheck,
  Image as ImageIcon,
  Upload,
  Calculator,
  Info,
  Layers,
  Receipt,
  Plus,
  Bus,
  Zap,
  Compass,
  Grid,
  Printer,
  X,
  Trash2
} from 'lucide-react';
import { RatesConfig, ParkingBusinessInfo, VehicleType, PaymentGatewayConfig, SystemUser, VehicleCategoryConfig, ExpenseConcept, ExpenseCategory, SystemNodeConfig, PrinterConfig } from '../types';
import { DEFAULT_RATES, DEFAULT_BUSINESS_INFO } from '../data/initialData';
import { PaymentMethodsSettings } from './PaymentMethodsSettings';

interface RatesSettingsModalProps {
  rates: RatesConfig;
  businessInfo: ParkingBusinessInfo;
  paymentGatewayConfig?: PaymentGatewayConfig;
  onSaveRates: (newRates: RatesConfig) => void;
  onSaveBusinessInfo: (newInfo: ParkingBusinessInfo) => void;
  onSavePaymentGatewayConfig?: (newConfig: PaymentGatewayConfig) => void;
  soundEnabled?: boolean;
  setSoundEnabled?: (enabled: boolean) => void;
  initialTab?: 'rates' | 'payments' | 'electronic_invoice' | 'business' | 'printers';
  currentUser?: SystemUser;
  vehicleCategories?: VehicleCategoryConfig[];
  printers?: PrinterConfig[];
  onSavePrinter?: (printer: PrinterConfig) => void;
  onDeletePrinter?: (printerId: string) => void;
  onClose?: () => void;
}

export const RatesSettingsModal: React.FC<RatesSettingsModalProps> = ({
  rates,
  businessInfo,
  paymentGatewayConfig,
  onSaveRates,
  onSaveBusinessInfo,
  onSavePaymentGatewayConfig,
  soundEnabled = true,
  setSoundEnabled,
  initialTab = 'rates',
  currentUser,
  vehicleCategories = [],
  printers = [],
  onSavePrinter,
  onDeletePrinter,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'rates' | 'payments' | 'electronic_invoice' | 'business' | 'printers'>(initialTab as any);
  const [localRates, setLocalRates] = useState<RatesConfig>(rates);
  const [localBusinessInfo, setLocalBusinessInfo] = useState<ParkingBusinessInfo>(businessInfo);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Quick Calculator Simulation
  const [calcVehicle, setCalcVehicle] = useState<VehicleType>('car');
  const [calcMinutes, setCalcMinutes] = useState<number>(135); // 2h 15m

  const categoriesToDisplay = useMemo(() => {
    if (vehicleCategories && vehicleCategories.length > 0) {
      const active = vehicleCategories.filter(c => c.isActive !== false && c.enabled !== false);
      if (active.length > 0) return active;
    }
    return [
      { id: 'car', name: 'Automóviles', icon: 'Car' },
      { id: 'motorcycle', name: 'Motocicletas', icon: 'Bike' },
      { id: 'suv', name: 'Camionetas / SUV', icon: 'Truck' },
      { id: 'bicycle', name: 'Bicicletas', icon: 'Bike' },
    ];
  }, [vehicleCategories]);

  const handleRateChange = (vehicle: string, field: string, value: number) => {
    setLocalRates((prev) => {
      const existing = prev[vehicle] || {
        hourRate: 4000,
        minuteRate: 70,
        dayRate: 25000,
        gracePeriodMinutes: 15,
        minimumChargeMinutes: 15,
        lostTicketFee: 15000,
      };
      return {
        ...prev,
        [vehicle]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveRates(localRates);
    onSaveBusinessInfo(localBusinessInfo);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetRates = () => {
    if (confirm('¿Restablecer todas las tarifas de vehículos a los valores predeterminados?')) {
      setLocalRates(DEFAULT_RATES);
    }
  };

  const handleResetBusinessInfo = () => {
    if (confirm('¿Restablecer los datos del negocio y facturación a los valores predeterminados?')) {
      setLocalBusinessInfo(DEFAULT_BUSINESS_INFO);
    }
  };

  // Logo preset icons/images
  const logoPresets = [
    { label: 'WolfZone POS', url: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=120&auto=format&fit=crop&q=60' },
    { label: 'Park Blue', url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=120&auto=format&fit=crop&q=60' },
    { label: 'Smart Parking', url: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=120&auto=format&fit=crop&q=60' },
  ];

  // Quick simulation calculation
  const simulatedCost = (() => {
    const rate = localRates[calcVehicle] || {
      hourRate: 4000,
      minuteRate: 70,
      dayRate: 25000,
      gracePeriodMinutes: 15,
      minimumChargeMinutes: 15,
      lostTicketFee: 15000,
    };
    if (calcMinutes <= rate.gracePeriodMinutes) return 0;
    const billable = Math.max(calcMinutes, rate.minimumChargeMinutes);
    const hours = Math.ceil(billable / 60);
    return hours * rate.hourRate;
  })();

  return (
    <div className="space-y-6">
      {/* Top Main Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-amber-500" />
            <span>Configuración del Sistema & Tarifas</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            Administre tarifas por categoría de vehículo, facturación electrónica DIAN, medios de pago y datos del parqueadero.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => handleSaveAll()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-98 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 text-slate-950 font-black" />
            <span className="text-slate-950 font-black">Guardar Todo</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              title="Volver a Patio POS"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar</span>
            </button>
          )}
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0 font-black" />
          <span>¡Todos los cambios de tarifas, negocio y facturación se guardaron correctamente en la base de datos!</span>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[var(--border-color)] overflow-x-auto pb-1">
        <button
          type="button"
          aria-selected={activeTab === 'rates'}
          onClick={() => setActiveTab('rates')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'rates'
              ? 'active-tab-indicator bg-amber-500 text-slate-950 shadow-sm'
              : 'inactive-tab-indicator text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-[var(--bg-subcard)]'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Tarifas por Categoría</span>
        </button>

        <button
          type="button"
          aria-selected={activeTab === 'electronic_invoice'}
          onClick={() => setActiveTab('electronic_invoice')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'electronic_invoice'
              ? 'active-tab-indicator bg-amber-500 text-slate-950 shadow-sm'
              : 'inactive-tab-indicator text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-[var(--bg-subcard)]'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Facturación Electrónica (DIAN)</span>
        </button>

        <button
          type="button"
          aria-selected={activeTab === 'payments'}
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'payments'
              ? 'active-tab-indicator bg-amber-500 text-slate-950 shadow-sm'
              : 'inactive-tab-indicator text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-[var(--bg-subcard)]'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Medios de Pago & Pasarela</span>
        </button>

        <button
          type="button"
          aria-selected={activeTab === 'business'}
          onClick={() => setActiveTab('business')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'business'
              ? 'active-tab-indicator bg-amber-500 text-slate-950 shadow-sm'
              : 'inactive-tab-indicator text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-[var(--bg-subcard)]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Logo, Establecimiento & Ticket</span>
        </button>

        <button
          type="button"
          aria-selected={activeTab === 'printers'}
          onClick={() => setActiveTab('printers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'printers'
              ? 'active-tab-indicator bg-amber-500 text-slate-950 shadow-sm'
              : 'inactive-tab-indicator text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-[var(--bg-subcard)]'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Impresoras</span>
        </button>
      </div>

      {/* ================= TAB 1: VEHICLE RATES ================= */}
      {activeTab === 'rates' && (
        <div className="space-y-6">
          {/* Top Rates Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>Estructura Tarifaria por Categoría de Vehículo</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Defina los cobros por hora, minuto, día completo, tiempos de gracia y multa por ticket extraviado.
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleResetRates}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 transition-colors self-start sm:self-auto cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Valores por Defecto</span>
              </button>
            </div>
          </div>

          {/* Rates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categoriesToDisplay.map((cat: any) => {
              const type = cat.id;
              const currentRate = localRates[type] || {
                hourRate: cat.defaultHourlyRate || cat.rate?.hourRate || 4000,
                minuteRate: cat.defaultMinuteRate || cat.rate?.minuteRate || 70,
                dayRate: cat.defaultDailyRate || cat.rate?.dayRate || 25000,
                gracePeriodMinutes: cat.gracePeriodMinutes || cat.rate?.gracePeriodMinutes || 15,
                minimumChargeMinutes: cat.rate?.minimumChargeMinutes || 15,
                lostTicketFee: cat.rate?.lostTicketFee || 15000,
              };
              const title = cat.name;
              
              const iconKey = cat.icon || type;
              const icon = 
                iconKey === 'Bike' || iconKey === 'motorcycle' || iconKey === 'bicycle' ? <Bike className="w-5 h-5 text-amber-600" /> :
                iconKey === 'Truck' || iconKey === 'truck' || iconKey === 'suv' ? <Truck className="w-5 h-5 text-emerald-600" /> :
                iconKey === 'Bus' ? <Bus className="w-5 h-5 text-indigo-600" /> :
                iconKey === 'Zap' ? <Zap className="w-5 h-5 text-yellow-500" /> :
                iconKey === 'Compass' ? <Compass className="w-5 h-5 text-purple-600" /> :
                <Car className="w-5 h-5 text-blue-600" />;

              return (
                <div key={type} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        {icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{title}</h4>
                        <span className="text-[10px] text-slate-600 dark:text-slate-300 uppercase font-semibold">Tarifa Aplicable</span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                          Tarifa por Hora ({localRates.currencySymbol})
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-slate-700 dark:text-slate-200 font-bold">{localRates.currencySymbol}</span>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={currentRate.hourRate}
                            onChange={(e) => {
                              const hr = parseInt(e.target.value) || 0;
                              handleRateChange(type, 'hourRate', hr);
                              handleRateChange(type, 'minuteRate', Math.round(hr / 60));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl pl-7 pr-3 py-2 font-mono text-sm font-bold text-slate-900 dark:text-slate-100 outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                          Tarifa Día Completo / 24h ({localRates.currencySymbol})
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-slate-700 dark:text-slate-200 font-bold">{localRates.currencySymbol}</span>
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={currentRate.dayRate}
                            onChange={(e) => handleRateChange(type, 'dayRate', parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl pl-7 pr-3 py-2 font-mono text-sm font-bold text-slate-900 dark:text-slate-100 outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Gracia (min)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="60"
                            value={currentRate.gracePeriodMinutes}
                            onChange={(e) => handleRateChange(type, 'gracePeriodMinutes', parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                            Mínimo (min)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="120"
                            value={currentRate.minimumChargeMinutes}
                            onChange={(e) => handleRateChange(type, 'minimumChargeMinutes', parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Multa Ticket Perdido ({localRates.currencySymbol})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={currentRate.lostTicketFee || 15000}
                          onChange={(e) => handleRateChange(type, 'lostTicketFee', parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                    <span>Equivalente/minuto:</span>
                    <strong className="font-mono text-slate-800 dark:text-slate-200">${currentRate.minuteRate}/min</strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Simulation Calculator */}
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Calculator className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              <h4 className="font-bold text-sm">Simulador en Vivo de Liquidación con Nuevas Tarifas</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1">Tipo de Vehículo a Evaluar</label>
                <select
                  value={calcVehicle}
                  onChange={(e) => setCalcVehicle(e.target.value as VehicleType)}
                  className="w-full bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-white font-semibold outline-none cursor-pointer"
                >
                  {categoriesToDisplay.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1">Tiempo de Permanencia (Minutos)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={calcMinutes}
                    onChange={(e) => setCalcMinutes(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold outline-none"
                  />
                  <span className="text-slate-700 dark:text-slate-200 text-xs shrink-0 font-mono">
                    ({Math.floor(calcMinutes / 60)}h {calcMinutes % 60}m)
                  </span>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[11px] text-slate-700 dark:text-slate-200 uppercase font-bold">Cobro Calculado al Cliente</span>
                <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  {localRates.currencySymbol}{simulatedCost.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-700 dark:text-slate-200">
                  {calcMinutes <= (localRates[calcVehicle]?.gracePeriodMinutes ?? 15) ? 'Dentro de período de gracia (Gratis)' : 'Tarifado según política'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: ELECTRONIC INVOICING (DIAN) ================= */}
      {activeTab === 'electronic_invoice' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-amber-500" />
                  <span>Configuración de Facturación Electrónica de Venta (DIAN)</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Habilite la emisión de Factura Electrónica con resolución DIAN, prefijo, rangos y generación de CUFE.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={localBusinessInfo.electronicInvoicingEnabled ?? true}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, electronicInvoicingEnabled: e.target.checked }))}
                  className="w-4 h-4 text-amber-500 rounded"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Módulo FE Habilitado</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Prefijo de Factura (ej. FE, SETP)</label>
                <input
                  type="text"
                  value={localBusinessInfo.dianPrefix || 'FE-'}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianPrefix: e.target.value }))}
                  placeholder="FE-"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Número de Resolución DIAN</label>
                <input
                  type="text"
                  value={localBusinessInfo.dianResolutionNumber || '18764002918234'}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianResolutionNumber: e.target.value }))}
                  placeholder="18764002918234"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Fecha de Vigencia Resolución</label>
                <input
                  type="date"
                  value={localBusinessInfo.dianResolutionDate || '2026-01-15'}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianResolutionDate: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Rango Autorizado Desde</label>
                <input
                  type="number"
                  value={localBusinessInfo.dianFromNumber || 1}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianFromNumber: parseInt(e.target.value) || 1 }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Rango Autorizado Hasta</label>
                <input
                  type="number"
                  value={localBusinessInfo.dianToNumber || 50000}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianToNumber: parseInt(e.target.value) || 50000 }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Consecutivo Actual</label>
                <input
                  type="number"
                  value={localBusinessInfo.dianCurrentNumber || 1042}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianCurrentNumber: parseInt(e.target.value) || 1 }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-700 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Ambiente de Operación</label>
                <select
                  value={localBusinessInfo.dianEnvironment || 'prod'}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianEnvironment: e.target.value as any }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none"
                >
                  <option value="prod">Producción (Válido Fiscalmente)</option>
                  <option value="hab">Habilitación / Pruebas DIAN</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">ID Software Facturación</label>
                <input
                  type="text"
                  value={localBusinessInfo.dianSoftwareId || 'soft-wz-84920'}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianSoftwareId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">PIN / Clave Técnica</label>
                <input
                  type="password"
                  value={localBusinessInfo.dianTechnicalKey || '••••••••••••••••'}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianTechnicalKey: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Funcionamiento en la Liquidación de Salida:</span>
                <span className="text-[11px] text-blue-800">
                  Al momento de cobrar un vehículo, el cajero puede activar el interruptor "Generar Factura Electrónica", digitar los datos del cliente (Cédula/NIT, Razón Social, Email) y el sistema generará automáticamente el CUFE oficial, QR fiscal e información para el envío al cliente.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: PAYMENT GATEWAY & METHODS ================= */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <PaymentMethodsSettings
            config={paymentGatewayConfig}
            onSaveConfig={onSavePaymentGatewayConfig}
          />
        </div>
      )}

      {/* ================= TAB 4: BUSINESS INFO, LOGO & WOLFZONEPOS BRANDING ================= */}
      {activeTab === 'business' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-500" />
                <span>Logotipo Personalizado de la Aplicación POS</span>
              </h3>
            </div>

            {/* Logo Config Area */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <div className="w-20 h-20 rounded-2xl bg-white border border-slate-300 shadow-sm flex items-center justify-center overflow-hidden mb-3">
                  {localBusinessInfo.logoUrl ? (
                    <img
                      src={localBusinessInfo.logoUrl}
                      alt="Logo del Parqueadero"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Car className="w-10 h-10 text-amber-500" />
                  )}
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Vista Previa del Logo</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-300">Aparecerá en encabezado de app y tickets impresos</span>
              </div>

              <div className="md:col-span-2 space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">URL de la Imagen del Logo</label>
                  <input
                    type="url"
                    value={localBusinessInfo.logoUrl || ''}
                    onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, logoUrl: e.target.value }))}
                    placeholder="https://ejemplo.com/logo-parqueadero.png"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">O elija un diseño prediseñado:</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {logoPresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setLocalBusinessInfo(prev => ({ ...prev, logoUrl: preset.url }))}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                    {localBusinessInfo.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLocalBusinessInfo(prev => ({ ...prev, logoUrl: '' }))}
                        className="px-3 py-1.5 rounded-xl text-[11px] text-red-600 hover:bg-red-50 transition-colors font-semibold"
                      >
                        Quitar Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Business Data */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-3">
                Datos del Establecimiento para el Ticket / Factura
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Nombre Comercial del Parqueadero</label>
                  <input
                    type="text"
                    value={localBusinessInfo.name}
                    onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">NIT / Identificación Fiscal</label>
                  <input
                    type="text"
                    value={localBusinessInfo.nit}
                    onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, nit: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Dirección del Parqueadero</label>
                  <input
                    type="text"
                    value={localBusinessInfo.address}
                    onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={localBusinessInfo.phone}
                    onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Leyenda / Condiciones al Pie del Ticket
                  </label>
                  <textarea
                    rows={2}
                    value={localBusinessInfo.ticketFooter}
                    onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, ticketFooter: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-1">
                    Todos los comprobantes y tickets incluirán automáticamente al final la firma del software: <strong>wolfzonepos</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Hardware POS Preferences */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-3">
                Preferencias de Hardware POS
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localBusinessInfo.autoPrintOnEntry}
                    onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, autoPrintOnEntry: e.target.checked }))}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Impresión automática de ticket al ingresar</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px]">Abre el diálogo de impresión al confirmar cada entrada</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Alertas sonoras de terminal POS</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px]">Emite beeps y timbres en escaneo, cobro y alertas</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: PRINTERS ================= */}
      {activeTab === 'printers' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-500" />
                <span>Impresoras Térmicas ESC/POS</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Configuración de impresoras locales, puertos USB/Red y rollos térmicos de 80mm o 58mm
              </p>
            </div>

            {onSavePrinter && (
              <button
                type="button"
                onClick={() => {
                  onSavePrinter({
                    id: `printer-${Date.now()}`,
                    name: `Impresora Térmica ${printers.length + 1}`,
                    printerName: 'POS-80-Series',
                    port: 'USB',
                    isDefault: printers.length === 0,
                    paperSize: '80mm',
                    enabled: true,
                  });
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Impresora</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {printers.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
                <Printer className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-60" />
                <p className="font-semibold">No hay impresoras térmicas configuradas</p>
                <p className="text-[11px] mt-1 text-slate-400">El sistema imprimirá a través del diálogo nativo del navegador (Ctrl+P).</p>
              </div>
            ) : (
              printers.map((printer) => (
                <div
                  key={printer.id}
                  className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 font-bold border border-amber-500/20">
                      <Printer className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{printer.name}</h4>
                        {printer.isDefault && (
                          <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            Predeterminada
                          </span>
                        )}
                        <span className="text-[9px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                          {printer.paperSize}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 font-mono">
                        {printer.printerName || 'Genérica'} · Puerto: {printer.port}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {onDeletePrinter && (
                      <button
                        type="button"
                        onClick={() => onDeletePrinter(printer.id)}
                        className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar impresora"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
