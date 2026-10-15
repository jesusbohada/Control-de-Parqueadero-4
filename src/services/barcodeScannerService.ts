/**
 * Barcode Scanner Service
 * Gestiona la configuración, persistencia y eventos globales para lectores de código de barras USB / Bluetooth (Keyboard Wedge)
 * Soporta configuración avanzada de prefijos y sufijos de hardware, filtros de delimitadores y diagnósticos.
 */

export type BarcodeAutoAction = 'select_checkout' | 'fast_exit_if_zero' | 'open_scanner_modal';

export interface BarcodeScannerConfig {
  enabled: boolean;
  keyIntervalThresholdMs: number; // Intervalo máximo en ms entre pulsaciones para detectar lector de barras (por defecto 45ms)
  minBarcodeLength: number;       // Longitud mínima esperada (por defecto 3 caracteres)
  autoAction: BarcodeAutoAction;  // Acción automática tras escaneo
  playBeepOnScan: boolean;        // Emitir tono acústico al escanear
  showToastNotification: boolean; // Mostrar HUD flotante / Toast visual en pantalla
  autoFocusCheckout: boolean;     // Enfocar panel de cobro automáticamente

  // Configuración de Prefijo y Sufijo de Hardware (USB Keyboard Wedge)
  prefixType: 'none' | 'stx' | 'tilde' | 'dollar' | 'asterisk' | 'hash' | 'pk' | 'custom';
  customPrefix: string;
  requirePrefix: boolean;         // Si es true, ignora lecturas que no comiencen con el prefijo configurado
  
  suffixType: 'enter' | 'tab' | 'enter_tab' | 'etx' | 'none' | 'custom';
  customSuffix: string;
  requireSuffix: boolean;         // Si es true, espera el sufijo para dar por terminada la ráfaga
  
  stripPrefixAndSuffix: boolean;  // Eliminar automáticamente el prefijo y sufijo del código extraído
}

export interface BarcodeScanErrorDetails {
  errorType: 'not_found' | 'already_paid' | 'incomplete_read' | 'prefix_mismatch' | 'invalid_format';
  scannedText: string;
  detectedLength: number;
  detectedSpeedMs?: number;
  expectedPrefix?: string;
  expectedSuffix?: string;
  diagnosticHint: string;
  actionSuggestion: string;
}

export interface BarcodeScanEventData {
  rawCode: string;
  ticketNumber?: string;
  plate?: string;
  status: 'active_found' | 'already_paid' | 'not_found' | 'fast_exit_executed' | 'read_error';
  message: string;
  totalAmount?: number;
  currencySymbol?: string;
  spotCode?: string;
  vehicleType?: string;
  timestamp: string;
  errorDetails?: BarcodeScanErrorDetails;
}

const STORAGE_KEY = 'pk_barcode_scanner_config';

export const DEFAULT_BARCODE_CONFIG: BarcodeScannerConfig = {
  enabled: true,
  keyIntervalThresholdMs: 45,
  minBarcodeLength: 3,
  autoAction: 'select_checkout',
  playBeepOnScan: true,
  showToastNotification: true,
  autoFocusCheckout: true,
  prefixType: 'none',
  customPrefix: '',
  requirePrefix: false,
  suffixType: 'enter',
  customSuffix: '',
  requireSuffix: true,
  stripPrefixAndSuffix: true
};

type ConfigListener = (config: BarcodeScannerConfig) => void;
type ScanEventListener = (event: BarcodeScanEventData) => void;

class BarcodeScannerService {
  private config: BarcodeScannerConfig;
  private configListeners: Set<ConfigListener> = new Set();
  private scanListeners: Set<ScanEventListener> = new Set();

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): BarcodeScannerConfig {
    if (typeof window === 'undefined') return DEFAULT_BARCODE_CONFIG;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_BARCODE_CONFIG, ...JSON.parse(saved) } : DEFAULT_BARCODE_CONFIG;
    } catch {
      return DEFAULT_BARCODE_CONFIG;
    }
  }

  private saveConfig(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // Ignorar errores en localStorage
    }
  }

  public getConfig(): BarcodeScannerConfig {
    return { ...this.config };
  }

  public updateConfig(patch: Partial<BarcodeScannerConfig>): void {
    this.config = { ...this.config, ...patch };
    this.saveConfig();
    this.configListeners.forEach(listener => listener(this.getConfig()));
  }

  public resetToDefaults(): void {
    this.config = { ...DEFAULT_BARCODE_CONFIG };
    this.saveConfig();
    this.configListeners.forEach(listener => listener(this.getConfig()));
  }

  public subscribeConfig(listener: ConfigListener): () => void {
    this.configListeners.add(listener);
    listener(this.getConfig());
    return () => {
      this.configListeners.delete(listener);
    };
  }

  public subscribeScanEvents(listener: ScanEventListener): () => void {
    this.scanListeners.add(listener);
    return () => {
      this.scanListeners.delete(listener);
    };
  }

  public emitScanEvent(event: BarcodeScanEventData): void {
    this.scanListeners.forEach(listener => listener(event));
  }

  /**
   * Obtiene la cadena exacta de prefijo configurada
   */
  public getEffectivePrefix(): string {
    switch (this.config.prefixType) {
      case 'stx': return '\x02';
      case 'tilde': return '~';
      case 'dollar': return '$';
      case 'asterisk': return '*';
      case 'hash': return '#';
      case 'pk': return 'PK';
      case 'custom': return this.config.customPrefix || '';
      case 'none':
      default:
        return '';
    }
  }

  /**
   * Obtiene la cadena exacta de sufijo configurada
   */
  public getEffectiveSuffix(): string {
    switch (this.config.suffixType) {
      case 'enter': return '\r';
      case 'tab': return '\t';
      case 'enter_tab': return '\r\t';
      case 'etx': return '\x03';
      case 'custom': return this.config.customSuffix || '';
      case 'none':
      default:
        return '';
    }
  }

  /**
   * Limpia y extrae el contenido del código según las reglas de prefijo y sufijo
   */
  public parseScannedString(rawInput: string): {
    extractedCode: string;
    hasValidPrefix: boolean;
    hasValidSuffix: boolean;
    raw: string;
  } {
    let text = rawInput;
    const prefix = this.getEffectivePrefix();
    const suffix = this.getEffectiveSuffix();

    let hasValidPrefix = true;
    let hasValidSuffix = true;

    if (prefix) {
      if (text.startsWith(prefix)) {
        if (this.config.stripPrefixAndSuffix) {
          text = text.substring(prefix.length);
        }
      } else if (this.config.requirePrefix) {
        hasValidPrefix = false;
      }
    }

    if (suffix) {
      if (text.endsWith(suffix)) {
        if (this.config.stripPrefixAndSuffix) {
          text = text.substring(0, text.length - suffix.length);
        }
      } else if (this.config.requireSuffix && this.config.suffixType !== 'none') {
        hasValidSuffix = false;
      }
    }

    // Limpieza general de delimitadores residuales comunes (*PK-0421*, etc.)
    if (this.config.stripPrefixAndSuffix) {
      text = text.replace(/^[*%$#~]+|[*%$#~\r\n\t]+$/g, '').trim();
    }

    return {
      extractedCode: text,
      hasValidPrefix,
      hasValidSuffix,
      raw: rawInput
    };
  }
}

export const barcodeScannerService = new BarcodeScannerService();
