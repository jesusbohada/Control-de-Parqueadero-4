import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  X, 
  Save, 
  Plus, 
  Trash2, 
  Sliders, 
  Sparkles, 
  CheckCircle2, 
  DollarSign,
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
        operationalDayDate: new Date().toLocaleDateString('es-CO'),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="wz-surface rounded-[22px] bg-white dark:bg-slate-900 border border-slate-900/[0.06] dark:border-white/[0.07] shadow-[0_1px_2px_rgba(15,23,42,.05),0_24px_48px_-28px_rgba(15,23,42,.35)] dark:shadow-[0_24px_48px_-28px_rgba(0,0,0,.8)] w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-white dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <span>Impresión Térmica & Tickets POS</span>
                <span className="text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full">
                  80mm / 58mm
                </span>
              </h2>
              <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-0.5">
                Configuración de rollos térmicos, automatización de recibos, gaveta monedero y pruebas
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mx-5 mt-4 flex w-fit max-w-[calc(100%-2.5rem)] items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 text-sm font-semibold shrink-0 dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => { setActiveTab('devices'); setEditingPrinter(null); }}
            className={`min-h-[44px] px-3.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'devices'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Dispositivos ({printers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('automation'); setEditingPrinter(null); }}
            className={`min-h-[44px] px-3.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'automation'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Automatización & Formato</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('test_lab'); setEditingPrinter(null); }}
            className={`min-h-[44px] px-3.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'test_lab'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Banco de Pruebas Térmicas</span>
          </button>
        </div>

        {/* Feedback message */}
        {saveSuccessMsg && (
          <div className="mx-5 mt-4 px-3.5 py-3 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-200 text-sm font-semibold flex items-center gap-2 animate-in fade-in duration-150">
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
                <form onSubmit={handleSavePrinterForm} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-blue-600/30 dark:border-blue-400/30 space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800 pb-3">
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{editingPrinter.name ? `Editar: ${editingPrinter.name}` : 'Nueva Impresora Térmica'}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingPrinter(null)}
                      className="min-h-[44px] px-3 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                        Nombre Identificador en POS:
                      </label>
                      <input
                        type="text"
                        required
                        value={editingPrinter.name}
                        onChange={(e) => setEditingPrinter({ ...editingPrinter, name: e.target.value })}
                        placeholder="Ej: Impresora Principal Taquilla"
                        className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                        Nombre del Dispositivo en el Sistema (Driver SO):
                      </label>
                      <input
                        type="text"
                        value={editingPrinter.printerName}
                        onChange={(e) => setEditingPrinter({ ...editingPrinter, printerName: e.target.value })}
                        placeholder="Ej: POS-80, XP-58, TM-T20"
                        className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                        Puerto / Tipo de Conexión:
                      </label>
                      <select
                        value={editingPrinter.port}
                        onChange={(e) => setEditingPrinter({ ...editingPrinter, port: e.target.value })}
                        className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 cursor-pointer"
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
                      <label className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                        Ancho de Rollo Térmico:
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingPrinter({ ...editingPrinter, paperSize: '80mm' })}
                          className={`flex-1 min-h-[52px] rounded-2xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 cursor-pointer ${
                            editingPrinter.paperSize === '80mm'
                              ? 'border-2 border-blue-700 bg-gradient-to-b from-blue-50 to-blue-100 text-blue-900 shadow-[0_8px_16px_-10px_rgba(29,78,216,.7)] dark:border-blue-400 dark:from-blue-500/20 dark:to-blue-500/10 dark:text-blue-100'
                              : 'wz-tile border border-slate-200 bg-white text-slate-700 hover:-translate-y-px dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          80 mm (Estándar)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPrinter({ ...editingPrinter, paperSize: '58mm' })}
                          className={`flex-1 min-h-[52px] rounded-2xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 cursor-pointer ${
                            editingPrinter.paperSize === '58mm'
                              ? 'border-2 border-blue-700 bg-gradient-to-b from-blue-50 to-blue-100 text-blue-900 shadow-[0_8px_16px_-10px_rgba(29,78,216,.7)] dark:border-blue-400 dark:from-blue-500/20 dark:to-blue-500/10 dark:text-blue-100'
                              : 'wz-tile border border-slate-200 bg-white text-slate-700 hover:-translate-y-px dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          58 mm (Mini)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Opciones de hardware */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t border-slate-200/70 dark:border-slate-800 text-sm">
                    <label className="flex items-center gap-2 min-h-[44px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPrinter.isDefault}
                        onChange={(e) => setEditingPrinter({ ...editingPrinter, isDefault: e.target.checked })}
                        className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Impresora Predeterminada</span>
                    </label>

                    <label className="flex items-center gap-2 min-h-[44px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPrinter.autoCut ?? true}
                        onChange={(e) => setEditingPrinter({ ...editingPrinter, autoCut: e.target.checked })}
                        className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Auto-corte (GS V)</span>
                    </label>

                    <label className="flex items-center gap-2 min-h-[44px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPrinter.openDrawer ?? true}
                        onChange={(e) => setEditingPrinter({ ...editingPrinter, openDrawer: e.target.checked })}
                        className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Abrir Gaveta (ESC p)</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingPrinter(null)}
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 text-sm font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 transition cursor-pointer disabled:opacity-50 dark:from-blue-500 dark:to-blue-600"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar Impresora</span>
                    </button>
                  </div>
                </form>
              ) : null}

              {/* Sección de Detección Automática de Impresoras del Sistema Operativo */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      Impresoras Físicas Detectadas en Windows ({systemPrinters.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleScanSystemPrinters}
                    disabled={isScanningPrinters}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                    title="Volver a escanear impresoras conectadas en Windows"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningPrinters ? 'animate-spin' : ''}`} />
                    <span>{isScanningPrinters ? 'Detectando...' : 'Re-escanear'}</span>
                  </button>
                </div>

                <p className="text-[13px] text-slate-600 dark:text-slate-400">
                  El sistema detecta automáticamente impresoras térmicas (POS-80, SAT, EPSON, etc.) conectadas por USB o Red. Haz clic en <strong>Vincular</strong> para activarla como la impresora de tickets instantánea.
                </p>

                {systemPrinters.length === 0 ? (
                  <div className="text-[13px] text-slate-600 dark:text-slate-400 italic py-1">
                    {isScanningPrinters ? 'Escaneando dispositivos instalados en el sistema...' : 'No se detectaron impresoras adicionales. Asegúrate de tener el driver de tu impresora térmica instalado en Windows.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-48 overflow-y-auto pr-1">
                    {systemPrinters.map((sp) => {
                      const isCurrentDefault = businessInfo?.defaultPrinterName === sp.printerName || printers.some(p => p.isDefault && (p.printerName === sp.printerName || p.name === sp.name));

                      return (
                        <div
                          key={sp.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-sm transition-all ${
                            isCurrentDefault
                              ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]" title={sp.name}>
                                {sp.name}
                              </span>
                              {sp.isThermal && (
                                <span className="text-xs font-semibold px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-200 rounded-md">
                                  TÉRMICA
                                </span>
                              )}
                              {sp.isDefault && (
                                <span className="text-xs font-semibold px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-900 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-200 rounded-md">
                                  WINDOWS DEF
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                              Puerto: {sp.port || 'USB'} · Rollo: {sp.paperSize}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleBindSystemPrinter(sp)}
                            className={`min-h-[44px] px-3 rounded-xl text-sm font-semibold shrink-0 transition-all cursor-pointer ${
                              isCurrentDefault
                                ? 'bg-emerald-600 text-white'
                                : 'wz-tile border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
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
                  <span className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
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
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-700 px-4 text-sm font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 transition cursor-pointer disabled:opacity-50 dark:from-blue-500 dark:to-blue-600"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Impresora</span>
                    </button>
                  )}
                </div>

                {printers.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                    <Printer className="w-10 h-10 text-slate-400 mx-auto opacity-60" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      No hay impresoras térmicas específicas registradas
                    </p>
                    <p className="text-[13px] text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                      El sistema utilizará la impresora predeterminada de Windows a través del diálogo estándar del navegador.
                    </p>
                  </div>
                ) : (
                  printers.map((printer) => (
                    <div
                      key={printer.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        printer.isDefault
                          ? 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30'
                          : 'wz-surface bg-white border-slate-900/[0.06] dark:bg-slate-900 dark:border-white/[0.07]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          printer.isDefault
                            ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}>
                          <Printer className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{printer.name}</h4>
                            {printer.isDefault ? (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/30">
                                PREDETERMINADA
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetDefault(printer)}
                                className="inline-flex min-h-[44px] items-center text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline cursor-pointer"
                              >
                                Hacer Predeterminada
                              </button>
                            )}
                            <span className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {printer.paperSize || '80mm'}
                            </span>
                          </div>
                          <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-0.5">
                            Driver: {printer.printerName || 'Genérico'} · Puerto: {printer.port || 'USB'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setEditingPrinter(printer)}
                          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
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
                          className="inline-flex h-11 w-11 items-center justify-center text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
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
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Comportamiento de Impresión Operativa</span>
                </h3>

                <div className="space-y-3 text-sm">
                  {/* Silent direct spooler print */}
                  <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30 cursor-pointer hover:border-blue-400 transition-colors">
                    <div className="space-y-0.5 max-w-[85%]">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-700 dark:text-blue-300 shrink-0" />
                        <span className="font-bold text-slate-950 dark:text-white block text-sm">
                          Impresión Instantánea en Segundo Plano (Sin Diálogo del Navegador)
                        </span>
                      </div>
                      <span className="text-[13px] text-slate-600 dark:text-slate-400 block">
                        Envía la orden directamente al spooler de Windows hacia la impresora física térmica en menos de 1 segundo. Cero clics, cero ventanas emergentes ni demoras.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={localSilentBackgroundPrint}
                      onChange={(e) => setLocalSilentBackgroundPrint(e.target.checked)}
                      className="w-5 h-5 accent-blue-600 rounded cursor-pointer shrink-0"
                    />
                  </label>

                  {/* Auto print on entry */}
                  <label className="flex items-center justify-between gap-3 min-h-[52px] p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-blue-400/60 transition-colors">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        Impresión Automática de Ticket al Ingreso
                      </span>
                      <span className="text-[13px] text-slate-600 dark:text-slate-400">
                        Dispara inmediatamente la impresión del ticket apenas se registra una placa en taquilla
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={localAutoPrintEntry}
                      onChange={(e) => setLocalAutoPrintEntry(e.target.checked)}
                      className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                    />
                  </label>

                  {/* Auto print on exit */}
                  <label className="flex items-center justify-between gap-3 min-h-[52px] p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-blue-400/60 transition-colors">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        Impresión Automática de Comprobante / Factura al Salir
                      </span>
                      <span className="text-[13px] text-slate-600 dark:text-slate-400">
                        Imprime inmediatamente la tirilla de cobro y salida tras completar el pago
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={localAutoPrintExit}
                      onChange={(e) => setLocalAutoPrintExit(e.target.checked)}
                      className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                    />
                  </label>

                  {/* Auto print on shift close */}
                  <label className="flex items-center justify-between gap-3 min-h-[52px] p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-blue-400/60 transition-colors">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        Impresión Automática de Comprobante al Cerrar Turno (Arqueo)
                      </span>
                      <span className="text-[13px] text-slate-600 dark:text-slate-400">
                        Imprime la tirilla con arqueo, efectivo contado, diferencia y firmas al finalizar el turno
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={localAutoPrintShiftClose}
                      onChange={(e) => setLocalAutoPrintShiftClose(e.target.checked)}
                      className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                    />
                  </label>

                  {/* Auto print on day close */}
                  <label className="flex items-center justify-between gap-3 min-h-[52px] p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-blue-400/60 transition-colors">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        Impresión Automática al Cierre Definitivo de Jornada (Reporte Z)
                      </span>
                      <span className="text-[13px] text-slate-600 dark:text-slate-400">
                        Imprime el comprobante consolidado de la jornada y efectivo a consignar al cerrar el día
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={localAutoPrintDayClose}
                      onChange={(e) => setLocalAutoPrintDayClose(e.target.checked)}
                      className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                    />
                  </label>

                  {/* Open cash drawer */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 hover:border-blue-400/60 transition-colors">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          Apertura Automática de Cajón Monedero
                        </span>
                        <span className="text-[13px] text-slate-600 dark:text-slate-400">
                          Envía el pulso eléctrico (ESC p / RJ11) a la gaveta de dinero en cada cobro en efectivo
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={localOpenDrawer}
                        onChange={(e) => setLocalOpenDrawer(e.target.checked)}
                        className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                      />
                    </label>
                    <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[13px] text-slate-600 dark:text-slate-400">Pulso físico multi-pin (Pin 2 / Pin 5 / DLE DC4)</span>
                      <button
                        type="button"
                        onClick={handleTriggerOpenDrawerTest}
                        disabled={isTestingDrawer}
                        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                        title="Envía el pulso de apertura a la gaveta a través de la impresora para probar el solenoide"
                      >
                        <DollarSign className={`w-3.5 h-3.5 ${isTestingDrawer ? 'animate-bounce' : ''}`} />
                        <span>{isTestingDrawer ? 'Abriendo gaveta...' : 'Probar Apertura de Gaveta'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Auto cut paper */}
                  <label className="flex items-center justify-between gap-3 min-h-[52px] p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-blue-400/60 transition-colors">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        Corte Automático de Papel (Auto-Cutter)
                      </span>
                      <span className="text-[13px] text-slate-600 dark:text-slate-400">
                        Envía la secuencia de corte total/parcial de papel (GS V) al final de cada tirilla
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={localCutPaper}
                      onChange={(e) => setLocalCutPaper(e.target.checked)}
                      className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                    />
                  </label>

                  {/* Default paper width */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="font-semibold text-slate-900 dark:text-white block">
                      Ancho de Papel Predeterminado del Sistema:
                    </span>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
                        <input
                          type="radio"
                          name="defaultPaper"
                          value="80mm"
                          checked={localDefaultPaper === '80mm'}
                          onChange={() => setLocalDefaultPaper('80mm')}
                          className="accent-blue-600 w-5 h-5"
                        />
                        <span className="text-sm font-semibold">80 mm (Estándar POS)</span>
                      </label>
                      <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
                        <input
                          type="radio"
                          name="defaultPaper"
                          value="58mm"
                          checked={localDefaultPaper === '58mm'}
                          onChange={() => setLocalDefaultPaper('58mm')}
                          className="accent-blue-600 w-5 h-5"
                        />
                        <span className="text-sm font-semibold">58 mm (Compacto / Mini)</span>
                      </label>
                    </div>
                  </div>

                  {/* Custom Ticket Footer */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <span className="font-semibold text-slate-900 dark:text-white block">
                      Texto de Pie de Página en Tickets:
                    </span>
                    <textarea
                      rows={2}
                      value={localFooterText}
                      onChange={(e) => setLocalFooterText(e.target.value)}
                      className="w-full min-h-[48px] py-2.5 rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="Mensaje de agradecimiento o póliza legal..."
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveAutomationSettings}
                    className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-700 px-5 text-sm font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 transition cursor-pointer disabled:opacity-50 dark:from-blue-500 dark:to-blue-600"
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
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Laboratorio de Calibración Térmica</span>
                  </h3>
                  <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Lanza una tirilla física para validar márgenes, nitidez del código de barras y corte.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900 text-sm font-semibold">
                    <button
                      type="button"
                      onClick={() => setTestPaperWidth('80mm')}
                      className={`min-h-[44px] px-3 rounded-lg tabular-nums transition-all cursor-pointer ${
                        testPaperWidth === '80mm' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      80mm
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestPaperWidth('58mm')}
                      className={`min-h-[44px] px-3 rounded-lg tabular-nums transition-all cursor-pointer ${
                        testPaperWidth === '58mm' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      58mm
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTriggerOpenDrawerTest}
                      disabled={isTestingDrawer}
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 text-white text-sm font-semibold hover:-translate-y-px transition-all cursor-pointer disabled:opacity-50"
                      title="Envía únicamente el pulso eléctrico para abrir el cajón monedero conectado a la impresora"
                    >
                      <DollarSign className={`w-3.5 h-3.5 ${isTestingDrawer ? 'animate-bounce' : ''}`} />
                      <span>{isTestingDrawer ? 'Abriendo...' : 'Abrir Gaveta'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTriggerInstantSpoolerTest}
                      disabled={isDirectSpoolPrinting}
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-700 px-4 text-sm font-bold text-white shadow-[0_14px_28px_-14px_rgba(29,78,216,.9)] hover:-translate-y-0.5 transition cursor-pointer disabled:opacity-50 dark:from-blue-500 dark:to-blue-600"
                      title="Envía el ticket directamente a la impresora seleccionada en Windows sin abrir ventanas"
                    >
                      <Zap className={`w-4 h-4 ${isDirectSpoolPrinting ? 'animate-pulse' : ''}`} />
                      <span>{isDirectSpoolPrinting ? 'Imprimiendo en Spooler...' : 'Impresión Instantánea (Directa)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTriggerTestPrint}
                      disabled={isTestPrinting}
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                      title="Probar mediante cuadro de diálogo del navegador o modo Kiosco"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Navegador</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Selector de tipo de comprobante de prueba */}
              <div className="flex flex-wrap gap-2 text-sm font-semibold">
                {[
                  { id: 'entry', label: '1. Ticket de Entrada' },
                  { id: 'exit', label: '2. Comprobante de Salida POS' },
                  { id: 'arqueo', label: '3. Comprobante de Arqueo de Caja' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTestTicketType(item.id as any)}
                    className={`flex-1 min-h-[52px] py-2 px-2 rounded-2xl transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 cursor-pointer text-center ${
                      testTicketType === item.id
                        ? 'border-2 border-blue-700 bg-gradient-to-b from-blue-50 to-blue-100 text-blue-900 shadow-[0_8px_16px_-10px_rgba(29,78,216,.7)] dark:border-blue-400 dark:from-blue-500/20 dark:to-blue-500/10 dark:text-blue-100'
                        : 'wz-tile border border-slate-200 bg-white text-slate-700 hover:-translate-y-px dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Vista previa en vivo del ticket térmico */}
              <div className="p-4 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-center max-h-[50vh] overflow-y-auto">
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
        <div className="px-5 py-4 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap gap-3 justify-between items-center text-[13px] shrink-0">
          <div className="text-slate-600 dark:text-slate-400">
            Formato activo: <strong className="text-slate-900 dark:text-white">{localDefaultPaper}</strong> · Rollos ESC/POS
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
