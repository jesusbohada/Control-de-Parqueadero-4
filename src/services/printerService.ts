import { PrinterConfig, ParkingBusinessInfo, RatesConfig, ParkingTicket, CashShift, OperationalDay } from '../types';
import { formatReceiptText, FormatReceiptOptions } from '../utils/receiptFormatter';

export interface SystemPrinterInfo {
  id: string;
  name: string;
  printerName: string;
  port: string;
  driverName: string;
  isDefault: boolean;
  isThermal: boolean;
  paperSize: '80mm' | '58mm';
  enabled: boolean;
}

export interface DirectPrintResult {
  success: boolean;
  silent: boolean;
  printerName: string;
  message?: string;
  error?: string;
}

/**
 * Consulta las impresoras físicas instaladas en el sistema operativo mediante la API local.
 */
export async function fetchSystemPrinters(): Promise<SystemPrinterInfo[]> {
  try {
    const res = await fetch('/api/system/printers', {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status}`);
    }
    const data = await res.json();
    if (data.success && Array.isArray(data.printers)) {
      return data.printers;
    }
    return [];
  } catch (err) {
    console.warn('[PrinterService] No se pudo consultar la API de impresoras del sistema:', err);
    return [];
  }
}

/**
 * Realiza la impresión instantánea directa en segundo plano hacia la impresora física seleccionada
 * (sin abrir la ventana emergente del navegador).
 */
export async function printInstantThermal(options: {
  type: 'entry_ticket' | 'exit_receipt' | 'cash_shift' | 'day_closure' | 'test';
  ticket?: ParkingTicket | null;
  shift?: CashShift | null;
  day?: OperationalDay | null;
  businessInfo: ParkingBusinessInfo;
  rates?: RatesConfig;
  targetPrinterName?: string;
  paperWidth?: '80mm' | '58mm';
  imageBase64?: string;
  autoCut?: boolean;
  openDrawer?: boolean;
}): Promise<DirectPrintResult> {
  const {
    type,
    ticket,
    shift,
    day,
    businessInfo,
    rates,
    targetPrinterName,
    paperWidth = businessInfo.defaultPaperWidth || '80mm',
    imageBase64,
    autoCut = businessInfo.cutPaperOnPrint ?? true,
    openDrawer = businessInfo.openCashDrawerOnCashPayment ?? false,
  } = options;

  const printerName = targetPrinterName || businessInfo.defaultPrinterName || 'POS-80';

  // Generar texto térmico formateado como respaldo
  const rawText = formatReceiptText({
    type,
    ticket,
    shift,
    day,
    businessInfo,
    rates,
    paperWidth,
    autoCut,
    openDrawer,
  });

  try {
    const response = await fetch('/api/print/instant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printerName,
        type,
        ticket,
        shift,
        day,
        businessInfo,
        rates,
        rawText,
        imageBase64,
        paperWidth,
        autoCut,
        openDrawer,
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log(`[PrinterService] Impresión instantánea completada con éxito en '${result.printer || printerName}'`);
      return {
        success: true,
        silent: true,
        printerName: result.printer || printerName,
        message: `Impreso automáticamente en ${result.printer || printerName}`,
      };
    } else {
      console.warn(`[PrinterService] Fallo en spooler de impresora '${printerName}':`, result.error);
      return {
        success: false,
        silent: false,
        printerName,
        error: result.error || 'Error al enviar trabajo al spooler',
      };
    }
  } catch (err: any) {
    console.warn('[PrinterService] Excepción de conexión al enviar trabajo de impresión:', err);
    return {
      success: false,
      silent: false,
      printerName,
      error: err?.message || 'Error de red con el servicio de impresión',
    };
  }
}

/**
 * Envía un pulso de bajo nivel (ESC/POS multi-pin) para abrir la gaveta/cajón monedero
 */
export async function openCashDrawer(printerName?: string): Promise<{ success: boolean; printerName?: string; message?: string; error?: string }> {
  try {
    const response = await fetch('/api/print/open-drawer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printerName: printerName || 'POS-80' }),
    });

    const result = await response.json();
    if (result.success) {
      console.log(`[PrinterService] Gaveta abierta exitosamente en '${result.printer}'`);
      return {
        success: true,
        printerName: result.printer,
        message: result.message || 'Cajón monedero abierto exitosamente'
      };
    } else {
      console.warn(`[PrinterService] Error al abrir gaveta en '${printerName}':`, result.error);
      return {
        success: false,
        printerName,
        error: result.error || 'No se pudo abrir el cajón monedero'
      };
    }
  } catch (err: any) {
    console.error('[PrinterService] Excepción de conexión al abrir gaveta:', err);
    return {
      success: false,
      printerName,
      error: err?.message || 'Error de comunicación con el servicio de impresión'
    };
  }
}
