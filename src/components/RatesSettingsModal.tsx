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
  Trash2,
  Globe,
  Server,
  Cpu,
  Key,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Radio,
  Eye,
  EyeOff,
  HelpCircle,
  Send,
  Sparkles,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { RatesConfig, ParkingBusinessInfo, VehicleType, PaymentGatewayConfig, SystemUser, VehicleCategoryConfig, ExpenseConcept, ExpenseCategory, SystemNodeConfig, PrinterConfig } from '../types';
import { DEFAULT_RATES, DEFAULT_BUSINESS_INFO } from '../data/initialData';
import { PaymentMethodsSettings } from './PaymentMethodsSettings';
import { generateDianCUFE } from '../utils/dianService';
import { DynamicQrCode } from './DynamicQrCode';
import { calculateParkingFeeForMinutes, formatCurrency, getVehicleRate } from '../utils/billing';

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
  onOpenVehicleCategories?: () => void;
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
  onOpenVehicleCategories,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'rates' | 'payments' | 'electronic_invoice' | 'business' | 'printers'>(initialTab as any);
  const [localRates, setLocalRates] = useState<RatesConfig>(rates);
  const [localBusinessInfo, setLocalBusinessInfo] = useState<ParkingBusinessInfo>(businessInfo);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [dianTestResult, setDianTestResult] = useState<{ cufe: string; qrUrl: string; invoiceNum: string } | null>(null);
  const [isTestingDian, setIsTestingDian] = useState(false);

  const handleTestDian = async () => {
    setIsTestingDian(true);
    try {
      const now = new Date();
      const pfx = (localBusinessInfo.dianPrefix || 'FE').trim();
      const prefix = pfx.endsWith('-') ? pfx : `${pfx}-`;
      const num = localBusinessInfo.dianCurrentNumber || 1042;
      const invoiceNum = `${prefix}${num}`;
      const cufe = await generateDianCUFE({
        invoiceNumber: invoiceNum,
        issueDate: now.toISOString().split('T')[0],
        issueTime: now.toTimeString().split(' ')[0],
        subtotal: 10000,
        taxAmount: 1900,
        totalAmount: 11900,
        nitEmitter: localBusinessInfo.nit || '9014587231',
        docCustomer: '222222222222',
        technicalKey: localBusinessInfo.dianTechnicalKey,
        environment: localBusinessInfo.dianEnvironment,
      });
      const qrUrl = `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cufe}`;
      setDianTestResult({ cufe, qrUrl, invoiceNum });
    } catch (e) {
      console.error('Error probando DIAN:', e);
    } finally {
      setIsTestingDian(false);
    }
  };

  const [dianConnectionTestResult, setDianConnectionTestResult] = useState<{
    success: boolean;
    status: string;
    message: string;
    dianSoapReachable?: boolean;
    hasCertificate?: boolean;
    provider?: string;
  } | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isUploadingCert, setIsUploadingCert] = useState(false);
  const [certUploadSuccess, setCertUploadSuccess] = useState<string | null>(null);

  const handleTestDianConnection = async () => {
    setIsTestingConnection(true);
    setDianConnectionTestResult(null);
    try {
      const res = await fetch('/api/dian/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: localBusinessInfo.dianEmissionMode || 'simulator',
          provider: localBusinessInfo.dianProvider || 'factus',
          apiKey: localBusinessInfo.dianProviderApiKey,
          apiUrl: localBusinessInfo.dianProviderApiUrl,
          environment: localBusinessInfo.dianEnvironment || 'prod'
        })
      });
      const data = await res.json();
      setDianConnectionTestResult(data);
    } catch (e: any) {
      setDianConnectionTestResult({
        success: false,
        status: 'ERROR',
        message: 'No se pudo comunicar con el backend local: ' + e.message
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleCertificateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCert(true);
    setCertUploadSuccess(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch('/api/dian/certificate/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileBase64: base64
          })
        });
        const data = await res.json();
        if (data.success) {
          setLocalBusinessInfo(prev => ({
            ...prev,
            dianCertUploaded: true,
            dianCertFileName: file.name
          }));
          setCertUploadSuccess(`Certificado '${file.name}' cargado e instalado en el servidor.`);
        }
      } catch (err: any) {
        console.error('Error subiendo certificado:', err);
      } finally {
        setIsUploadingCert(false);
      }
    };
    reader.readAsDataURL(file);
  };

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
    { label: 'WolfZone Ticket (Optimizado)', url: '/assets/wolfzone_ticket_logo.png' },
    { label: 'Farmanorte (Oficial)', url: '/assets/wolfzone_ticket_logo.png' },
    { label: 'Logo Compacto', url: '/logo_compacto.png' },
  ];

  // Quick simulation calculation using full business billing rules
  const simulatedCalc = useMemo(() => {
    return calculateParkingFeeForMinutes(calcMinutes, calcVehicle, localRates, vehicleCategories);
  }, [calcMinutes, calcVehicle, localRates, vehicleCategories]);

  return (
    <div className="space-y-6">
      {/* Top Main Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
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
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 font-black" />
          <span>Configuración guardada exitosamente.</span>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          aria-selected={activeTab === 'rates'}
          onClick={() => setActiveTab('rates')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'rates'
              ? 'active-tab-indicator bg-amber-500 text-slate-950 shadow-sm'
              : 'inactive-tab-indicator text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/70'
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
              : 'inactive-tab-indicator text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/70'
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
              : 'inactive-tab-indicator text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/70'
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
              : 'inactive-tab-indicator text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/70'
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
              : 'inactive-tab-indicator text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/70'
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
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
              {onOpenVehicleCategories && (
                <button
                  type="button"
                  onClick={onOpenVehicleCategories}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 dark:bg-amber-400 dark:hover:bg-amber-300 transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-950" />
                  <span>Gestionar Tipos de Vehículos (+)</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleResetRates}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors self-start sm:self-auto cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Valores por Defecto</span>
              </button>
            </div>
          </div>

          {/* Reglas Globales de Facturación, Redondeo e Impuestos */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Reglas Generales de Liquidación, Redondeo e Impuestos
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Determine cómo se redondea el tiempo facturable y el régimen de impuestos aplicable al estacionamiento.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Método de Redondeo */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>Método de Redondeo de Tiempo:</span>
                </label>
                <select
                  value={localRates.roundingMethod || 'fraction_15'}
                  onChange={(e) => setLocalRates(prev => ({ ...prev, roundingMethod: e.target.value as any }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                >
                  <option value="fraction_15">Fracción de 15 minutos (Cobro por cuartos de hora)</option>
                  <option value="fraction_30">Fracción de 30 minutos (Cobro por medias horas)</option>
                  <option value="next_hour">Hora completa adelantada (Hora o fracción de hora)</option>
                  <option value="exact">Cobro exacto por minuto transcurrido</option>
                </select>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  {localRates.roundingMethod === 'exact'
                    ? 'Tarifa exacta por minuto; no redondea a bloques de tiempo.'
                    : localRates.roundingMethod === 'next_hour'
                    ? 'Si supera el tiempo de gracia, se factura la hora completa de inmediato.'
                    : localRates.roundingMethod === 'fraction_30'
                    ? 'Se redondea al múltiplo superior de 30 minutos.'
                    : 'Estándar comercial: redondea al múltiplo superior de 15 minutos.'}
                </span>
              </div>

              {/* Impuesto IVA */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Impuesto a las Ventas (IVA %):</span>
                  <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                    {localRates.taxPercentage > 0 ? `${localRates.taxPercentage}% IVA` : 'Exento / 0%'}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={localRates.taxPercentage || 0}
                      onChange={(e) => setLocalRates(prev => ({ ...prev, taxPercentage: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocalRates(prev => ({ ...prev, taxPercentage: 0 }))}
                    className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                      (localRates.taxPercentage || 0) === 0
                        ? 'bg-amber-500 text-slate-950 border-amber-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                    }`}
                    title="No responsable de IVA / Régimen Simple (0%)"
                  >
                    0%
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocalRates(prev => ({ ...prev, taxPercentage: 19 }))}
                    className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                      (localRates.taxPercentage || 0) === 19
                        ? 'bg-amber-500 text-slate-950 border-amber-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                    }`}
                    title="Responsable de IVA (19% Tarifa General Colombia)"
                  >
                    19%
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  {(localRates.taxPercentage || 0) > 0
                    ? 'Se discriminará el IVA en el ticket y en la factura electrónica.'
                    : 'Tarifas netas sin discriminación de IVA (No Responsable).'}
                </span>
              </div>

              {/* Multa general por pérdida de ticket y Moneda */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Multa General Ticket Extraviado:</span>
                  <span className="text-[10px] font-mono text-slate-400">{localRates.currencySymbol || '$'}</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 relative">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={localRates.lostTicketFee || 15000}
                      onChange={(e) => setLocalRates(prev => ({ ...prev, lostTicketFee: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      maxLength={5}
                      value={localRates.currencySymbol || '$'}
                      onChange={(e) => setLocalRates(prev => ({ ...prev, currencySymbol: e.target.value || '$' }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-amber-500 rounded-xl px-2 py-2 text-xs font-mono font-bold text-center text-slate-900 dark:text-slate-100 outline-none"
                      title="Símbolo de moneda (ej: $, COP)"
                    />
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  Valor base aplicado cuando el conductor extravía el ticket y no hay tarifa específica.
                </span>
              </div>
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
                <div key={type} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        {icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{title}</h4>
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-semibold">Tarifa Aplicable</span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                          Tarifa por Hora ({localRates.currencySymbol})
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-slate-500 dark:text-slate-400 font-bold">{localRates.currencySymbol}</span>
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
                            className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800 rounded-xl pl-7 pr-3 py-2 font-mono text-sm font-bold text-slate-900 dark:text-slate-100 outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                          Tarifa Día Completo / 24h ({localRates.currencySymbol})
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-slate-500 dark:text-slate-400 font-bold">{localRates.currencySymbol}</span>
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={currentRate.dayRate}
                            onChange={(e) => handleRateChange(type, 'dayRate', parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800 rounded-xl pl-7 pr-3 py-2 font-mono text-sm font-bold text-slate-900 dark:text-slate-100 outline-none transition-colors"
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
                            className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none"
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
                            className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none"
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
                          className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                    <span>Equivalente/minuto:</span>
                    <strong className="font-mono text-slate-900 dark:text-slate-100">${currentRate.minuteRate}/min</strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Simulation Calculator */}
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl p-5 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Calculator className="w-5 h-5 text-amber-500" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Simulador en Vivo de Liquidación con Nuevas Tarifas</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Tipo de Vehículo a Evaluar</label>
                <select
                  value={calcVehicle}
                  onChange={(e) => setCalcVehicle(e.target.value as VehicleType)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-semibold outline-none cursor-pointer"
                >
                  {categoriesToDisplay.map((cat: any) => (
                    <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Tiempo de Permanencia (Minutos)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={calcMinutes}
                    onChange={(e) => setCalcMinutes(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-mono font-bold outline-none"
                  />
                  <span className="text-slate-600 dark:text-slate-300 text-xs shrink-0 font-mono">
                    ({Math.floor(calcMinutes / 60)}h {calcMinutes % 60}m)
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col justify-center space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 uppercase font-bold">Liquidación Estimada:</span>
                  <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(simulatedCalc.totalAmount, localRates.currencySymbol)}
                  </span>
                </div>
                {localRates.taxPercentage > 0 && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-0.5 border-t border-slate-200 dark:border-slate-700">
                    <span>Base: {formatCurrency(simulatedCalc.baseAmount, localRates.currencySymbol)}</span>
                    <span>IVA ({localRates.taxPercentage}%): {formatCurrency(simulatedCalc.taxAmount, localRates.currencySymbol)}</span>
                  </div>
                )}
                <div className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                  {simulatedCalc.isWithinGracePeriod ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ {simulatedCalc.appliedRateDescription}</span>
                  ) : (
                    <span>
                      {simulatedCalc.billableMinutes} min facturables ({simulatedCalc.formattedDuration}) • {simulatedCalc.appliedRateDescription}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: ELECTRONIC INVOICING (DIAN) ================= */}
      {activeTab === 'electronic_invoice' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-amber-500" />
                  <span>Configuración de Facturación Electrónica de Venta (DIAN)</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Habilite la emisión de Factura Electrónica con resolución DIAN, prefijo, rangos y generación de CUFE.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={localBusinessInfo.electronicInvoicingEnabled ?? true}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, electronicInvoicingEnabled: e.target.checked }))}
                  className="w-4 h-4 text-amber-500 rounded"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Módulo FE Habilitado</span>
              </label>
            </div>

            {/* ======================================================== */}
            {/* SELECTOR DE MODALIDAD DE EMISIÓN FISCAL (3 OPCIONES)    */}
            {/* ======================================================== */}
            <div>
              <label className="block font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                Modalidad de Emisión Fiscal:
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Opción 1: Simulador Local */}
                <div
                  onClick={() => setLocalBusinessInfo(prev => ({ ...prev, dianEmissionMode: 'simulator' }))}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    (localBusinessInfo.dianEmissionMode || 'simulator') === 'simulator'
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs ring-2 ring-amber-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
                      <Cpu className="w-4 h-4" />
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      (localBusinessInfo.dianEmissionMode || 'simulator') === 'simulator'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {(localBusinessInfo.dianEmissionMode || 'simulator') === 'simulator' ? 'ACTIVO' : 'SELECCIONAR'}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    1. Simulador Local / Sandbox
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Cálculo matemático SHA-384 y QR oficial en modo demostración. Ideal para pruebas y capacitación sin gastar folios ni certificado.
                  </p>
                </div>

                {/* Opción 2: Proveedor Tecnológico (API REST) */}
                <div
                  onClick={() => setLocalBusinessInfo(prev => ({ ...prev, dianEmissionMode: 'provider_api' }))}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    localBusinessInfo.dianEmissionMode === 'provider_api'
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="p-1.5 bg-indigo-500/10 text-indigo-600 rounded-lg">
                      <Globe className="w-4 h-4" />
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      localBusinessInfo.dianEmissionMode === 'provider_api'
                        ? 'bg-indigo-600 text-white font-black'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {localBusinessInfo.dianEmissionMode === 'provider_api' ? 'ACTIVO' : 'SELECCIONAR'}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    2. Proveedor Tecnológico (API)
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Conexión vía API REST con Factus, Dataico, The Factory HKA u otros. Emisión inmediata sin comprar certificado digital propio.
                  </p>
                </div>

                {/* Opción 3: Software Propio Directo */}
                <div
                  onClick={() => setLocalBusinessInfo(prev => ({ ...prev, dianEmissionMode: 'direct_soap' }))}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    localBusinessInfo.dianEmissionMode === 'direct_soap'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg">
                      <Server className="w-4 h-4" />
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      localBusinessInfo.dianEmissionMode === 'direct_soap'
                        ? 'bg-emerald-600 text-white font-black'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {localBusinessInfo.dianEmissionMode === 'direct_soap' ? 'ACTIVO' : 'SELECCIONAR'}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    3. Software Propio (Directo DIAN)
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Emisión UBL 2.1 directa ante la DIAN con Certificado Digital (.p12). Sin intermediarios ni costo recurrente por folio.
                  </p>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* PANEL CONDICIONAL SEGÚN LA MODALIDAD SELECCIONADA       */}
            {/* ======================================================== */}
            {localBusinessInfo.dianEmissionMode === 'provider_api' && (
              <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    <span>Parámetros de Integración con Proveedor Tecnológico (API REST)</span>
                  </span>
                  <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded font-mono font-bold">
                    REST / JSON UBL 2.1
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Proveedor Autorizado
                    </label>
                    <select
                      value={localBusinessInfo.dianProvider || 'factus'}
                      onChange={(e) => {
                        const prov = e.target.value as any;
                        const defaultUrl = prov === 'dataico' 
                          ? 'https://api.dataico.com/dataico_api/v2' 
                          : prov === 'the_factory' 
                          ? 'https://emision21.thefactoryhka.com.co/ws/v1' 
                          : 'https://api.factus.com.co/v1';
                        setLocalBusinessInfo(prev => ({ 
                          ...prev, 
                          dianProvider: prov,
                          dianProviderApiUrl: defaultUrl 
                        }));
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none"
                    >
                      <option value="factus">Factus (Colombia) - Recomendado POS</option>
                      <option value="dataico">Dataico API</option>
                      <option value="the_factory">The Factory HKA</option>
                      <option value="generic">API REST Genérica</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      URL Endpoint del Proveedor
                    </label>
                    <input
                      type="text"
                      value={localBusinessInfo.dianProviderApiUrl || 'https://api.factus.com.co/v1'}
                      onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianProviderApiUrl: e.target.value }))}
                      placeholder="https://api.factus.com.co/v1"
                      className="w-full bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      API Token / Clave Secreta
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={localBusinessInfo.dianProviderApiKey || ''}
                        onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianProviderApiKey: e.target.value }))}
                        placeholder="Pegue aquí el API Token entregado por su proveedor"
                        className="w-full bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-xl px-3 py-2 pr-10 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Client ID / ID Empresa (Opcional)
                    </label>
                    <input
                      type="text"
                      value={localBusinessInfo.dianProviderClientId || ''}
                      onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianProviderClientId: e.target.value }))}
                      placeholder="Ej: cli_98234"
                      className="w-full bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {localBusinessInfo.dianEmissionMode === 'direct_soap' && (
              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-emerald-600" />
                    <span>Emisión Directa ante la DIAN (Software Propio con Certificado Digital)</span>
                  </span>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                    SOAP / XMLDSig UBL 2.1
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* Subir Certificado .p12 */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Certificado Digital de Firma (.p12 / .pfx)
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs cursor-pointer flex items-center gap-2 shadow-xs transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingCert ? 'Cargando certificado...' : 'Seleccionar Certificado (.p12)'}</span>
                        <input
                          type="file"
                          accept=".p12,.pfx"
                          onChange={handleCertificateUpload}
                          className="hidden"
                          disabled={isUploadingCert}
                        />
                      </label>
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                        {localBusinessInfo.dianCertFileName ? (
                          <span className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {localBusinessInfo.dianCertFileName}
                          </span>
                        ) : (
                          'Ningún certificado cargado'
                        )}
                      </span>
                    </div>
                    {certUploadSuccess && (
                      <div className="mt-1.5 text-[11px] text-emerald-700 font-medium">
                        ✓ {certUploadSuccess}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Contraseña del Certificado .p12
                    </label>
                    <input
                      type="password"
                      value={localBusinessInfo.dianCertPassword || ''}
                      onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianCertPassword: e.target.value }))}
                      placeholder="Contraseña del archivo .p12"
                      className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Software ID (Portal DIAN)
                    </label>
                    <input
                      type="text"
                      value={localBusinessInfo.dianSoftwareId || 'soft-wz-84920'}
                      onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianSoftwareId: e.target.value }))}
                      placeholder="ID expedido por la DIAN"
                      className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      PIN del Software
                    </label>
                    <input
                      type="password"
                      value={localBusinessInfo.dianSoftwarePin || '12345'}
                      onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianSoftwarePin: e.target.value }))}
                      placeholder="PIN DIAN de 5 dígitos"
                      className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      TestSetId (Set de Pruebas DIAN)
                    </label>
                    <input
                      type="text"
                      value={localBusinessInfo.dianTestSetId || ''}
                      onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianTestSetId: e.target.value }))}
                      placeholder="Código del set de pruebas"
                      className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {(!localBusinessInfo.dianEmissionMode || localBusinessInfo.dianEmissionMode === 'simulator') && (
              <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-bold block">Modo Simulador Autónomo Activo:</span>
                  El sistema genera el CUFE criptográfico exacto (SHA-384) y el código QR de consulta tributaria para demostración y capacitación de cajeros sin necesidad de consumir folios comerciales ni conexión activa con el portal DIAN.
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* PARÁMETROS FISCALES COMUNES (RESOLUCIÓN & RANGOS)       */}
            {/* ======================================================== */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Parámetros de la Resolución DIAN:
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Prefijo de Factura (ej. FE, SETP)</label>
                <input
                  type="text"
                  value={localBusinessInfo.dianPrefix || 'FE-'}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianPrefix: e.target.value }))}
                  placeholder="FE-"
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Número de Resolución DIAN</label>
                <input
                  type="text"
                  value={localBusinessInfo.dianResolutionNumber || '18764002918234'}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianResolutionNumber: e.target.value }))}
                  placeholder="18764002918234"
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Fecha de Vigencia Resolución</label>
                <input
                  type="date"
                  value={localBusinessInfo.dianResolutionDate || '2026-01-15'}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianResolutionDate: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Rango Autorizado Desde</label>
                <input
                  type="number"
                  value={localBusinessInfo.dianFromNumber || 1}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianFromNumber: parseInt(e.target.value) || 1 }))}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Rango Autorizado Hasta</label>
                <input
                  type="number"
                  value={localBusinessInfo.dianToNumber || 50000}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianToNumber: parseInt(e.target.value) || 50000 }))}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Consecutivo Actual</label>
                <input
                  type="number"
                  value={localBusinessInfo.dianCurrentNumber || 1042}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianCurrentNumber: parseInt(e.target.value) || 1 }))}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Ambiente de Operación</label>
                <select
                  value={localBusinessInfo.dianEnvironment || 'prod'}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianEnvironment: e.target.value as any }))}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none"
                >
                  <option value="prod" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Producción (Válido Fiscalmente)</option>
                  <option value="hab" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Habilitación / Pruebas DIAN</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">ID Software Facturación</label>
                <input
                  type="text"
                  value={localBusinessInfo.dianSoftwareId || 'soft-wz-84920'}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianSoftwareId: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">PIN / Clave Técnica</label>
                <input
                  type="password"
                  value={localBusinessInfo.dianTechnicalKey || '••••••••••••••••'}
                  onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, dianTechnicalKey: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
            </div>

            {/* Interactive DIAN Diagnostic & Testing Suite */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Diagnóstico de Conectividad & Simulación Fiscal</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Compruebe la comunicación con el proveedor/servidores DIAN y verifique el cálculo criptográfico del CUFE.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestDianConnection}
                    disabled={isTestingConnection}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Radio className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
                    <span>{isTestingConnection ? 'Comprobando red...' : 'Probar Conexión'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTestDian}
                    disabled={isTestingDian}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>{isTestingDian ? 'Calculando...' : 'Generar CUFE Demo'}</span>
                  </button>
                </div>
              </div>

              {/* Resultado de Prueba de Conexión */}
              {dianConnectionTestResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
                  dianConnectionTestResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                }`}>
                  {dianConnectionTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className="font-bold block">
                      {dianConnectionTestResult.success ? 'Conectividad Verificada' : 'Diagnóstico de Conexión'}:
                    </span>
                    <span className="text-[11px] leading-tight">
                      {dianConnectionTestResult.message}
                    </span>
                  </div>
                </div>
              )}

              {dianTestResult && (
                <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Cálculo Criptográfico Exitoso • Factura {dianTestResult.invoiceNum}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded">
                      SHA-384 VÁLIDO
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="bg-white p-2 rounded-xl shadow-xs border border-emerald-200 shrink-0">
                      <DynamicQrCode value={dianTestResult.qrUrl} size={110} />
                    </div>
                    <div className="space-y-1.5 text-xs min-w-0 flex-1">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
                          CUFE Generado (Código Único):
                        </span>
                        <div className="font-mono text-[10px] text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800/60 break-all select-all font-semibold">
                          {dianTestResult.cufe}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block">
                          URL de Consulta DIAN:
                        </span>
                        <a
                          href={dianTestResult.qrUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline truncate block"
                        >
                          {dianTestResult.qrUrl}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl text-xs text-blue-950 dark:text-blue-200 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-blue-900 dark:text-blue-200">Funcionamiento en la Liquidación de Salida:</span>
                <span className="text-[11px] text-blue-800 dark:text-blue-300">
                  Al momento de cobrar un vehículo, el cajero puede activar el interruptor "Generar Factura Electrónica", digitar los datos del cliente (Cédula/NIT, Razón Social, Email) y el sistema generará automáticamente el CUFE oficial, QR fiscal e información para el envío al cliente.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: PAYMENT GATEWAY & METHODS ================= */}
      {activeTab === 'payments' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <PaymentMethodsSettings
            config={paymentGatewayConfig}
            onSaveConfig={onSavePaymentGatewayConfig}
          />
        </div>
      )}

      {/* ================= TAB 4: BUSINESS INFO, LOGO & WOLFZONEPOS BRANDING ================= */}
      {activeTab === 'business' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-5">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-500" />
                <span>Logotipo Personalizado de la Aplicación POS</span>
              </h3>
            </div>

            {/* Logo Config Area */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-center">
                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 shadow-sm flex items-center justify-center overflow-hidden mb-3">
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
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
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
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                    {localBusinessInfo.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLocalBusinessInfo(prev => ({ ...prev, logoUrl: '' }))}
                        className="px-3 py-1.5 rounded-xl text-[11px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors font-semibold cursor-pointer"
                      >
                        Quitar Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Business Data */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
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
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">NIT / Identificación Fiscal</label>
                  <input
                    type="text"
                    value={localBusinessInfo.nit}
                    onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, nit: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Dirección del Parqueadero</label>
                  <input
                    type="text"
                    value={localBusinessInfo.address}
                    onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={localBusinessInfo.phone}
                    onChange={(e) => setLocalBusinessInfo(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none"
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
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-1">
                    Todos los comprobantes y tickets incluirán automáticamente al final la firma del software: <strong>wolfzonepos</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Hardware POS Preferences */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-3">
                Preferencias de Hardware POS
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <label className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
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

                <label className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
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
                <p className="font-semibold text-slate-700 dark:text-slate-300">No hay impresoras térmicas configuradas</p>
                <p className="text-[11px] mt-1 text-slate-500 dark:text-slate-400">El sistema imprimirá a través del diálogo nativo del navegador (Ctrl+P).</p>
              </div>
            ) : (
              printers.map((printer) => (
                <div
                  key={printer.id}
                  className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                        <span className="text-[9px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-full">
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
