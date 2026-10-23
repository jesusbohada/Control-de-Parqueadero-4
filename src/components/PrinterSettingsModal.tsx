import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  X, 
  Save, 
  Plus, 
  Trash2, 
  Check, 
  Sliders, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Scissors,
  DollarSign,
  QrCode,
  ShieldCheck,
  RefreshCw,
  Edit2,
  Cpu,
  Zap
} from 'lucide-react';
import { PrinterConfig, ParkingBusinessInfo } from '../types';
import { DynamicBarcode } from './DynamicBarcode';
import { DynamicQrCode } from './DynamicQrCode';
import { fetchSystemPrinters, printInstantThermal, openCashDrawer, SystemPrinterInfo } from '../services/printerService';

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  printers: PrinterConfig[];
  onSave: (printer: PrinterConfig) => void;
  onDelete: (printerId: string) => void;
  businessInfo?: ParkingBusinessInfo;
  onUpdateBusinessInfo?: (info: Partial<ParkingBusinessInfo>) => void;
}

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({
  isOpen,
  onClose,
  printers,
  onSave,
  onDelete,
  businessInfo,
  onUpdateBusinessInfo
}) => {
  const [activeTab, setActiveTab] = useState<'devices' | 'automation' | 'test_lab'>('devices');
  const [editingPrinter, setEditingPrinter] = useState<PrinterConfig | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // System Printers Detection
  const [systemPrinters, setSystemPrinters] = useState<SystemPrinterInfo[]>([]);
  const [isScanningPrinters, setIsScanningPrinters] = useState<boolean>(false);

  // Test Lab state
  const [testPaperWidth, setTestPaperWidth] = useState<'80mm' | '58mm'>(() => businessInfo?.defaultPaperWidth || '80mm');
  const [testTicketType, setTestTicketType] = useState<'entry' | 'exit' | 'arqueo'>('entry');
  const [isTestPrinting, setIsTestPrinting] = useState<boolean>(false);
  const [isDirectSpoolPrinting, setIsDirectSpoolPrinting] = useState<boolean>(false);
  const [isTestingDrawer, setIsTestingDrawer] = useState<boolean>(false);

  // Local automation states
  const [localSilentBackgroundPrint, setLocalSilentBackgroundPrint] = useState<boolean>(() => businessInfo?.silentBackgroundPrint ?? true);
  const [localAutoPrintEntry, setLocalAutoPrintEntry] = useState<boolean>(() => businessInfo?.autoPrintOnEntry ?? true);
  const [localAutoPrintExit, setLocalAutoPrintExit] = useState<boolean>(() => businessInfo?.autoPrintOnExit ?? true);
  const [localAutoPrintShiftClose, setLocalAutoPrintShiftClose] = useState<boolean>(() => businessInfo?.autoPrintOnShiftClose ?? true);
  const [localAutoPrintDayClose, setLocalAutoPrintDayClose] = useState<boolean>(() => businessInfo?.autoPrintOnDayClose ?? true);
  const [localOpenDrawer, setLocalOpenDrawer] = useState<boolean>(() => businessInfo?.openCashDrawerOnCashPayment ?? true);
  const [localCutPaper, setLocalCutPaper] = useState<boolean>(() => businessInfo?.cutPaperOnPrint ?? true);
  const [localDefaultPaper, setLocalDefaultPaper] = useState<'80mm' | '58mm'>(() => businessInfo?.defaultPaperWidth || '80mm');
  const [localFooterText, setLocalFooterText] = useState<string>(() => businessInfo?.ticketFooter || 'Conserve este ticket. No nos hacemos responsables por objetos personales dejados en el vehículo no declarados al ingresar. Horario: 24 Horas.');

  const handleScanSystemPrinters = async () => {
    setIsScanningPrinters(true);
    try {
      const detected = await fetchSystemPrinters();
      setSystemPrinters(detected);
      if (detected.length > 0) {
        setSaveSuccessMsg(`¡Se detectaron ${detected.length} impresoras instaladas en Windows!`);
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      }
    } catch (e) {
      console.warn('Error al escanear impresoras del sistema:', e);
    } finally {
      setIsScanningPrinters(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleScanSystemPrinters();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSavePrinterForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrinter) return;

    if (!editingPrinter.name.trim()) {
      alert('Por favor introduce un nombre identificador para la impresora.');
      return;
    }

    onSave({
      ...editingPrinter,
      name: editingPrinter.name.trim(),
      printerName: editingPrinter.printerName.trim() || 'POS-80',
      port: editingPrinter.port || 'USB',
      paperSize: editingPrinter.paperSize || '80mm'
    });

    setEditingPrinter(null);
    setSaveSuccessMsg('Impresora guardada correctamente.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleSetDefault = (printer: PrinterConfig) => {
    printers.forEach(p => {
      onSave({
        ...p,
        isDefault: p.id === printer.id
      });
    });
    if (onUpdateBusinessInfo) {
      onUpdateBusinessInfo({ defaultPrinterName: printer.printerName || printer.name });
    }
    setSaveSuccessMsg(`'${printer.name}' establecida como impresora predeterminada.`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleBindSystemPrinter = (sp: SystemPrinterInfo) => {
    const existing = printers.find(p => p.printerName.toLowerCase() === sp.printerName.toLowerCase() || p.name.toLowerCase() === sp.name.toLowerCase());
    const printerToSave: PrinterConfig = {
      id: existing ? existing.id : `prn-sys-${Date.now()}`,
      name: sp.name,
      printerName: sp.printerName,
      port: sp.port || 'USB',
      paperSize: sp.paperSize || '80mm',
      isDefault: true,
      enabled: true,
      autoCut: true,
      openDrawer: true
    };

    onSave(printerToSave);
    if (onUpdateBusinessInfo) {
      onUpdateBusinessInfo({
        defaultPrinterName: sp.printerName,
        defaultPaperWidth: sp.paperSize || '80mm'
      });
    }
    setSaveSuccessMsg(`¡Impresora '${sp.name}' vinculada como principal del POS!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleSaveAutomationSettings = () => {
    if (onUpdateBusinessInfo) {
      onUpdateBusinessInfo({
        silentBackgroundPrint: localSilentBackgroundPrint,
        autoPrintOnEntry: localAutoPrintEntry,
        autoPrintOnExit: localAutoPrintExit,
        autoPrintOnShiftClose: localAutoPrintShiftClose,
        autoPrintOnDayClose: localAutoPrintDayClose,
        openCashDrawerOnCashPayment: localOpenDrawer,
        cutPaperOnPrint: localCutPaper,
        defaultPaperWidth: localDefaultPaper,
        ticketFooter: localFooterText
      });
    }
    setSaveSuccessMsg('Parámetros de impresión y automatización actualizados.');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleTriggerTestPrint = () => {
    setIsTestPrinting(true);
    setTimeout(() => {
      window.print();
      setIsTestPrinting(false);
    }, 150);
  };

  const handleTriggerInstantSpoolerTest = async () => {
    setIsDirectSpoolPrinting(true);
    const activePrinter = printers.find(p => p.isDefault) || printers[0];
    const printerName = activePrinter?.printerName || activePrinter?.name || 'POS-80';

    try {
      const dummyTicket = {
        id: 'tkt_test_sample',
        ticketNumber: 'PK-9999',
        plate: 'PRU-123',
        vehicleType: 'car',
        spotCode: 'A-01',
        entryTime: new Date(Date.now() - 3600000 * 2).toISOString(),
        exitTime: new Date().toISOString(),
        totalMinutes: 120,
        baseAmount: 8000,
        totalAmount: 8000,
        paymentMethod: 'cash' as const,
        cashReceived: 10000,
        changeGiven: 2000,
        operationalDayNumber: 1,
        shiftNumber: 1,
        status: 'paid' as const
      };

      const result = await printInstantThermal({
        type: testTicketType === 'arqueo' ? 'cash_shift' : testTicketType === 'exit' ? 'exit_receipt' : 'entry_ticket',
        ticket: dummyTicket,
        businessInfo: {
          ...businessInfo,
          defaultPaperWidth: testPaperWidth,
          cutPaperOnPrint: localCutPaper,
          openCashDrawerOnCashPayment: localOpenDrawer,
          ticketFooter: localFooterText
        },
        targetPrinterName: printerName,
        paperWidth: testPaperWidth,
        autoCut: localCutPaper,
        openDrawer: localOpenDrawer
      });

      if (result.success) {
        setSaveSuccessMsg(`¡Impresión directa de alta fidelidad enviada con éxito al spooler de '${result.printerName}'!`);
      } else {
        alert(`Error al imprimir en '${printerName}': ${result.error || 'La impresora no respondió'}`);
      }
    } catch (e: any) {
      alert(`Excepción al enviar orden de impresión: ${e?.message}`);
    } finally {
      setIsDirectSpoolPrinting(false);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  const handleTriggerOpenDrawerTest = async () => {
    setIsTestingDrawer(true);
    const activePrinter = printers.find(p => p.isDefault) || printers[0];
    const printerName = activePrinter?.printerName || activePrinter?.name || 'POS-80';

    try {
      const res = await openCashDrawer(printerName);
      if (res.success) {
        setSaveSuccessMsg(`¡Pulso de apertura enviado con éxito al cajón de '${res.printerName || printerName}'!`);
      } else {
        alert(`No se pudo abrir el cajón en '${printerName}': ${res.error || 'Verifique el cable RJ11 a la impresora'}`);
      }
    } catch (err: any) {
      alert(`Error al enviar orden de apertura de cajón: ${err?.message}`);
    } finally {
      setIsTestingDrawer(false);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>Impresión Térmica & Tickets POS</span>
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  80mm / 58mm
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Configuración de rollos térmicos, automatización de recibos, gaveta monedero y pruebas
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => { setActiveTab('devices'); setEditingPrinter(null); }}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'devices'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Dispositivos ({printers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('automation'); setEditingPrinter(null); }}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'automation'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Automatización & Formato</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('test_lab'); setEditingPrinter(null); }}
            className={`py-3 px-3.5 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'test_lab'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Banco de Pruebas Térmicas</span>
          </button>
        </div>

        {/* Feedback message */}
        {saveSuccessMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">

          {/* TAB 1: DISPOSITIVOS */}
          {activeTab === 'devices' && (
            <div className="space-y-4">
              
              {/* Formulario de Edición / Creación si editingPrinter !== null */}
              {editingPrinter ? (
                <form onSubmit={handleSavePrinterForm} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-amber-500/40 space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{editingPrinter.name ? `Editar: ${editingPrinter.name}` : 'Nueva Impresora Térmica'}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingPrinter(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        Nombre Identificador en POS:
                      </label>
                      <input
                        type="text"
                        required
                        value={editingPrinter.name}
                        onChange={(e) => setEditingPrinter({ ...editingPrinter, name: e.target.value })}
                        placeholder="Ej: Impresora Principal Taquilla"
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        Nombre del Dispositivo en el Sistema (Driver SO):
                      </label>
                      <input
                        type="text"
                        value={editingPrinter.printerName}
                        onChange={(e) => setEditingPrinter({ ...editingPrinter, printerName: e.target.value })}
                        placeholder="Ej: POS-80, XP-58, TM-T20"
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        Puerto / Tipo de Conexión:
                      </label>
                      <select
                        value={editingPrinter.port}
                        onChange={(e) => setEditingPrinter({ ...editingPrinter, port: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      >
                        <option value="USB">USB (Predeterminado / Plug & Play)</option>
                        <option value="Network">Red Ethernet / IP (192.168.x.x:9100)</option>
                        <option value="Bluetooth">Bluetooth Inalámbrico</option>
                        <option value="COM1">Puerto Serie COM1</option>
                        <option value="LPT1">Puerto Paralelo LPT1</option>
                        <option value="Spooler">Spooler Estándar de Windows</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        Ancho de Rollo Térmico:
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingPrinter({ ...editingPrinter, paperSize: '80mm' })}
                          className={`flex-1 py-2 px-3 rounded-lg font-bold border transition-all cursor-pointer ${
                            editingPrinter.paperSize === '80mm'
                              ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          80 mm (Estándar)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPrinter({ ...editingPrinter, paperSize: '58mm' })}
                          className={`flex-1 py-2 px-3 rounded-lg font-bold border transition-all cursor-pointer ${
                            editingPrinter.paperSize === '58mm'
                              ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          58 mm (Mini)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Opciones de hardware */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPrinter.isDefault}
                        onChange={(e) => setEditingPrinter({ ...editingPrinter, isDefault: e.target.checked })}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Impresora Predeterminada</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPrinter.autoCut ?? true}
                        onChange={(e) => setEditingPrinter({ ...editingPrinter, autoCut: e.target.checked })}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Auto-corte (GS V)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPrinter.openDrawer ?? true}
                        onChange={(e) => setEditingPrinter({ ...editingPrinter, openDrawer: e.target.checked })}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Abrir Gaveta (ESC p)</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingPrinter(null)}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar Impresora</span>
                    </button>
                  </div>
                </form>
              ) : null}

              {/* Sección de Detección Automática de Impresoras del Sistema Operativo */}
              <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                      Impresoras Físicas Detectadas en Windows ({systemPrinters.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleScanSystemPrinters}
                    disabled={isScanningPrinters}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                    title="Volver a escanear impresoras conectadas en Windows"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningPrinters ? 'animate-spin' : ''}`} />
                    <span>{isScanningPrinters ? 'Detectando...' : 'Re-escanear'}</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  El sistema detecta automáticamente impresoras térmicas (POS-80, SAT, EPSON, etc.) conectadas por USB o Red. Haz clic en <strong>Vincular</strong> para activarla como la impresora de tickets instantánea.
                </p>

                {systemPrinters.length === 0 ? (
                  <div className="text-[11px] text-slate-500 italic py-1">
                    {isScanningPrinters ? 'Escaneando dispositivos instalados en el sistema...' : 'No se detectaron impresoras adicionales. Asegúrate de tener el driver de tu impresora térmica instalado en Windows.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-48 overflow-y-auto pr-1">
                    {systemPrinters.map((sp) => {
                      const isCurrentDefault = businessInfo?.defaultPrinterName === sp.printerName || printers.some(p => p.isDefault && (p.printerName === sp.printerName || p.name === sp.name));

                      return (
                        <div
                          key={sp.id}
                          className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs transition-all ${
                            isCurrentDefault
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]" title={sp.name}>
                                {sp.name}
                              </span>
                              {sp.isThermal && (
                                <span className="text-[8px] font-bold px-1.5 py-0.2 bg-amber-500/20 text-amber-800 dark:text-amber-300 rounded font-mono">
                                  TÉRMICA
                                </span>
                              )}
                              {sp.isDefault && (
                                <span className="text-[8px] font-bold px-1.5 py-0.2 bg-blue-500/20 text-blue-800 dark:text-blue-300 rounded font-mono">
                                  WINDOWS DEF
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Puerto: {sp.port || 'USB'} · Rollo: {sp.paperSize}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleBindSystemPrinter(sp)}
                            className={`px-2 py-1 rounded text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                              isCurrentDefault
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/60'
                            }`}
                            title="Vincular como impresora principal de tickets del POS"
                          >
                            {isCurrentDefault ? '✓ Principal' : 'Vincular'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Lista de impresoras */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Impresoras Instaladas ({printers.length})
                  </span>
                  {!editingPrinter && (
                    <button
                      type="button"
                      onClick={() => setEditingPrinter({
                        id: `printer-${Date.now()}`,
                        name: `Impresora POS ${printers.length + 1}`,
                        printerName: 'POS-80-Series',
                        port: 'USB',
                        isDefault: printers.length === 0,
                        paperSize: '80mm',
                        enabled: true,
                        autoCut: true,
                        openDrawer: true
                      })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Impresora</span>
                    </button>
                  )}
                </div>

                {printers.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
                    <Printer className="w-10 h-10 text-slate-400 mx-auto opacity-60" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      No hay impresoras térmicas específicas registradas
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      El sistema utilizará la impresora predeterminada de Windows a través del diálogo estándar del navegador.
                    </p>
                  </div>
                ) : (
                  printers.map((printer) => (
                    <div
                      key={printer.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        printer.isDefault
                          ? 'bg-amber-500/5 border-amber-500/40 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          printer.isDefault
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                        }`}>
                          <Printer className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">{printer.name}</h4>
                            {printer.isDefault ? (
                              <span className="text-[9px] font-mono font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                PREDETERMINADA
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetDefault(printer)}
                                className="text-[9px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                              >
                                Hacer Predeterminada
                              </button>
                            )}
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {printer.paperSize || '80mm'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 font-mono">
                            Driver: {printer.printerName || 'Genérico'} · Puerto: {printer.port || 'USB'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setEditingPrinter(printer)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Editar parámetros de la impresora"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Eliminar la impresora '${printer.name}'?`)) {
                              onDelete(printer.id);
                            }
                          }}
                          className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar impresora"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AUTOMATIZACIÓN Y FORMATO */}
          {activeTab === 'automation' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Comportamiento de Impresión Operativa</span>
                </h3>

                <div className="space-y-3 text-xs">
                  {/* Silent direct spooler print */}
                  <label className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 cursor-pointer hover:border-amber-500 transition-colors shadow-xs">
                    <div className="space-y-0.5 max-w-[85%]">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="font-black text-slate-950 dark:text-white block text-sm">
                          Impresión Instantánea en Segundo Plano (Sin Diálogo del Navegador)
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 block">
                        Envía la orden directamente al spooler de Windows hacia la impresora física térmica en menos de 1 segundo. Cero clics, cero ventanas emergentes ni demoras.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={localSilentBackgroundPrint}
                      onChange={(e) => setLocalSilentBackgroundPrint(e.target.checked)}
                      className="w-5 h-5 accent-amber-500 rounded cursor-pointer shrink-0"
                    />
                  </label>

                  {/* Auto print on entry */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-amber-500/40 transition-colors">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Impresión Automática de Ticket al Ingreso
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Dispara inmediatamente la impresión del ticket apenas se registra una placa en taquilla
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={localAutoPrintEntry}
                      onChange={(e) => setLocalAutoPrintEntry(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </label>

                  {/* Auto print on exit */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-amber-500/40 transition-colors">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Impresión Automática de Comprobante / Factura al Salir
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Imprime inmediatamente la tirilla de cobro y salida tras completar el pago
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={localAutoPrintExit}
                      onChange={(e) => setLocalAutoPrintExit(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </label>

                  {/* Auto print on shift close */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-amber-500/40 transition-colors">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Impresión Automática de Comprobante al Cerrar Turno (Arqueo)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Imprime la tirilla con arqueo, efectivo contado, diferencia y firmas al finalizar el turno
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={localAutoPrintShiftClose}
                      onChange={(e) => setLocalAutoPrintShiftClose(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </label>

                  {/* Auto print on day close */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-amber-500/40 transition-colors">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Impresión Automática al Cierre Definitivo de Jornada (Reporte Z)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Imprime el comprobante consolidado de la jornada y efectivo a consignar al cerrar el día
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={localAutoPrintDayClose}
                      onChange={(e) => setLocalAutoPrintDayClose(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </label>

                  {/* Open cash drawer */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 hover:border-amber-500/40 transition-colors">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          Apertura Automática de Cajón Monedero
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Envía el pulso eléctrico (ESC p / RJ11) a la gaveta de dinero en cada cobro en efectivo
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={localOpenDrawer}
                        onChange={(e) => setLocalOpenDrawer(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </label>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Pulso físico multi-pin (Pin 2 / Pin 5 / DLE DC4)</span>
                      <button
                        type="button"
                        onClick={handleTriggerOpenDrawerTest}
                        disabled={isTestingDrawer}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                        title="Envía el pulso de apertura a la gaveta a través de la impresora para probar el solenoide"
                      >
                        <DollarSign className={`w-3.5 h-3.5 ${isTestingDrawer ? 'animate-bounce' : ''}`} />
                        <span>{isTestingDrawer ? 'Abriendo gaveta...' : 'Probar Apertura de Gaveta'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Auto cut paper */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-amber-500/40 transition-colors">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Corte Automático de Papel (Auto-Cutter)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Envía la secuencia de corte total/parcial de papel (GS V) al final de cada tirilla
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={localCutPaper}
                      onChange={(e) => setLocalCutPaper(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </label>

                  {/* Default paper width */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Ancho de Papel Predeterminado del Sistema:
                    </span>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="defaultPaper"
                          value="80mm"
                          checked={localDefaultPaper === '80mm'}
                          onChange={() => setLocalDefaultPaper('80mm')}
                          className="accent-amber-500"
                        />
                        <span className="text-xs font-semibold">80 mm (Estándar POS)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="defaultPaper"
                          value="58mm"
                          checked={localDefaultPaper === '58mm'}
                          onChange={() => setLocalDefaultPaper('58mm')}
                          className="accent-amber-500"
                        />
                        <span className="text-xs font-semibold">58 mm (Compacto / Mini)</span>
                      </label>
                    </div>
                  </div>

                  {/* Custom Ticket Footer */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Texto de Pie de Página en Tickets:
                    </span>
                    <textarea
                      rows={2}
                      value={localFooterText}
                      onChange={(e) => setLocalFooterText(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      placeholder="Mensaje de agradecimiento o póliza legal..."
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveAutomationSettings}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Preferencias de Impresión</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BANCO DE PRUEBAS TÉRMICAS (LIVE TEST LAB) */}
          {activeTab === 'test_lab' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Laboratorio de Calibración Térmica</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Lanza una tirilla física para validar márgenes, nitidez del código de barras y corte.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setTestPaperWidth('80mm')}
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        testPaperWidth === '80mm' ? 'bg-amber-500 text-slate-950' : 'text-slate-600 dark:text-slate-400 hover:text-white'
                      }`}
                    >
                      80mm
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestPaperWidth('58mm')}
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        testPaperWidth === '58mm' ? 'bg-amber-500 text-slate-950' : 'text-slate-600 dark:text-slate-400 hover:text-white'
                      }`}
                    >
                      58mm
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTriggerOpenDrawerTest}
                      disabled={isTestingDrawer}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      title="Envía únicamente el pulso eléctrico para abrir el cajón monedero conectado a la impresora"
                    >
                      <DollarSign className={`w-3.5 h-3.5 ${isTestingDrawer ? 'animate-bounce' : ''}`} />
                      <span>{isTestingDrawer ? 'Abriendo...' : 'Abrir Gaveta'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTriggerInstantSpoolerTest}
                      disabled={isDirectSpoolPrinting}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
                      title="Envía el ticket directamente a la impresora seleccionada en Windows sin abrir ventanas"
                    >
                      <Zap className={`w-4 h-4 ${isDirectSpoolPrinting ? 'animate-pulse' : ''}`} />
                      <span>{isDirectSpoolPrinting ? 'Imprimiendo en Spooler...' : 'Impresión Instantánea (Directa)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTriggerTestPrint}
                      disabled={isTestPrinting}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      title="Probar mediante cuadro de diálogo del navegador o modo Kiosco"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Navegador</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Selector de tipo de comprobante de prueba */}
              <div className="flex gap-2 text-xs font-bold">
                {[
                  { id: 'entry', label: '1. Ticket de Entrada' },
                  { id: 'exit', label: '2. Comprobante de Salida POS' },
                  { id: 'arqueo', label: '3. Comprobante de Arqueo de Caja' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTestTicketType(item.id as any)}
                    className={`flex-1 py-1.5 px-2 rounded-lg border transition-all cursor-pointer text-center ${
                      testTicketType === item.id
                        ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Vista previa en vivo del ticket térmico */}
              <div className="p-4 bg-neutral-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-center max-h-[50vh] overflow-y-auto">
                <div
                  id="printable-ticket"
                  data-paper-width={testPaperWidth}
                  className={`w-full bg-white ${
                    testPaperWidth === '58mm' ? 'max-w-[245px] text-[10px] p-3 paper-58mm' : 'max-w-[320px] text-xs p-4 paper-80mm'
                  } border border-dashed border-slate-300 shadow-xs font-mono text-slate-950 leading-relaxed rounded-md force-light transition-all`}
                >
                  {/* Encabezado */}
                  <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-0.5">
                    <h2 className="font-extrabold text-sm uppercase text-slate-950">
                      {businessInfo?.name || 'PARQUEADERO CENTRAL POS'}
                    </h2>
                    <p className="text-[10px] text-slate-700">NIT: {businessInfo?.nit || '901.458.723-1'}</p>
                    <p className="text-[10px] text-slate-700">{businessInfo?.address || 'Av. Principal #10-20'}</p>
                    <p className="text-[10px] text-slate-700">Tel: {businessInfo?.phone || '310 000 0000'}</p>

                    <div className="mt-2 inline-block bg-slate-100 border border-slate-300 text-slate-950 px-2.5 py-0.5 font-bold text-[10px] rounded uppercase">
                      {testTicketType === 'entry' ? '*** TICKET DE INGRESO (TEST) ***' :
                       testTicketType === 'exit' ? '*** COMPROBANTE DE SALIDA (TEST) ***' :
                       '**** ARQUEO DE CAJA (TEST) ****'}
                    </div>
                  </div>

                  {/* Contenido según tipo */}
                  {testTicketType === 'entry' && (
                    <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>N° TICKET:</span>
                        <span>PK-9999</span>
                      </div>
                      <div className="my-1.5 p-2 bg-amber-100/90 border-2 border-slate-900 rounded text-center">
                        <div className="text-[9px] uppercase font-bold text-slate-700">PLACA / VEHÍCULO</div>
                        <div className="text-xl font-black tracking-widest text-slate-950 font-sans">PRU-123</div>
                        <div className="text-[10px] font-bold text-slate-800">AUTOMÓVIL • PLAZA A-01</div>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>Entrada:</span>
                        <span className="font-bold">{new Date().toLocaleString('es-CO')}</span>
                      </div>
                    </div>
                  )}

                  {testTicketType === 'exit' && (
                    <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>FACTURA POS:</span>
                        <span>POS-008942</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>Placa:</span>
                        <span className="font-bold">PRU-123 (AUTOMÓVIL)</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>Tiempo de Estancia:</span>
                        <span className="font-bold">2 Horas 15 Min</span>
                      </div>
                      <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-300 text-slate-950">
                        <span>TOTAL PAGADO:</span>
                        <span>$8.000</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>Medio de Pago:</span>
                        <span className="font-bold">EFECTIVO</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span>Recibido: $10.000</span>
                        <span className="font-bold text-emerald-800">Cambio: $2.000</span>
                      </div>
                    </div>
                  )}

                  {testTicketType === 'arqueo' && (
                    <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
                      <div className="flex justify-between font-bold">
                        <span>TURNO No.:</span>
                        <span>#TURNO-1 (CAJERO 01)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Ventas Efectivo:</span>
                        <span className="font-bold">$245.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Tarjetas / Digital:</span>
                        <span className="font-bold">$135.000</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-300 pt-0.5 font-black">
                        <span>EFECTIVO EN GAVETA:</span>
                        <span>$295.000</span>
                      </div>
                      <div className="p-1 rounded bg-emerald-50 border border-emerald-300 text-center font-bold text-emerald-950">
                        ¡CUADRE EXACTO DE CAJA ($0)!
                      </div>
                    </div>
                  )}

                  {/* Código QR y Código de barras de prueba */}
                  <div className="py-2.5 text-center flex flex-col items-center justify-center space-y-2">
                    <div className="p-1 bg-white rounded border border-slate-300 inline-block">
                      <DynamicQrCode
                        value="https://wolfzonepos.com/verify/test"
                        size={testPaperWidth === '58mm' ? 70 : 85}
                        alt="QR Test"
                      />
                    </div>

                    <div className="w-full px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[9px] font-mono flex items-center justify-between text-slate-700">
                      <span className="font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-indigo-600 inline" />
                        <span>FIRMA ANTI-FRAUDE:</span>
                      </span>
                      <span className="font-black text-slate-950">WOLF-TEST-OK</span>
                    </div>

                    <div className="w-full flex flex-col items-center justify-center pt-0.5">
                      <div className="p-1 bg-white rounded border border-slate-200 inline-block">
                        <DynamicBarcode
                          value="PK-9999"
                          text="*PK-9999*"
                          width={testPaperWidth === '58mm' ? 1.3 : 1.6}
                          height={testPaperWidth === '58mm' ? 32 : 40}
                          fontSize={9}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pie de página */}
                  <div className="text-center pt-2 text-[9px] text-slate-700 leading-tight space-y-1">
                    <p>{localFooterText}</p>
                    <div className="pt-1 border-t border-dashed border-slate-400 font-bold text-[10px] text-slate-950 font-mono uppercase">
                      wolfzonepos • Tirilla de Prueba Calibrada
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs shrink-0">
          <div className="text-slate-500 font-mono">
            Formato activo: <strong className="text-slate-900 dark:text-white">{localDefaultPaper}</strong> · Rollos ESC/POS
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl font-bold transition-all cursor-pointer shadow-xs"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
