import { useEffect, useRef, useState, useCallback } from 'react';
import { ParkingTicket, RatesConfig } from '../types';
import { formatPlate, calculateParkingFee } from '../utils/billing';
import { playSound } from '../utils/audio';
import { barcodeScannerService, BarcodeScannerConfig, BarcodeScanErrorDetails } from '../services/barcodeScannerService';

export interface UseBarcodeScannerOptions {
  activeTickets: ParkingTicket[];
  paidTickets?: ParkingTicket[];
  rates?: RatesConfig;
  onTicketFound: (ticket: ParkingTicket, autoAction?: string) => void;
  onTicketAlreadyPaid?: (ticket: ParkingTicket) => void;
  onTicketNotFound?: (rawCode: string, errorDetails?: BarcodeScanErrorDetails) => void;
  onFastExitDirect?: (ticket: ParkingTicket) => void;
  enabled?: boolean;
  maxKeyIntervalMs?: number;
  minBarcodeLength?: number;
}

export function useBarcodeScanner({
  activeTickets,
  paidTickets = [],
  rates,
  onTicketFound,
  onTicketAlreadyPaid,
  onTicketNotFound,
  onFastExitDirect,
  enabled = true,
  maxKeyIntervalMs,
  minBarcodeLength
}: UseBarcodeScannerOptions) {
  const [config, setConfig] = useState<BarcodeScannerConfig>(barcodeScannerService.getConfig());
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [lastScannedTime, setLastScannedTime] = useState<Date | null>(null);
  const [isGunScanning, setIsGunScanning] = useState(false);
  const [lastAverageSpeedMs, setLastAverageSpeedMs] = useState<number | null>(null);

  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const keyIntervalsRef = useRef<number[]>([]);

  // Sincronizar con la configuración centralizada de la terminal
  useEffect(() => {
    const unsub = barcodeScannerService.subscribeConfig((newConfig) => {
      setConfig(newConfig);
    });
    return () => unsub();
  }, []);

  const activeMaxInterval = maxKeyIntervalMs ?? config.keyIntervalThresholdMs;
  const activeMinLength = minBarcodeLength ?? config.minBarcodeLength;

  const findTicketByCode = useCallback((rawCode: string): {
    active: ParkingTicket | null;
    paid: ParkingTicket | null;
    cleanQuery: string;
  } => {
    const { extractedCode } = barcodeScannerService.parseScannedString(rawCode);
    const clean = extractedCode.trim();
    if (!clean) return { active: null, paid: null, cleanQuery: '' };

    const cleanLower = clean.toLowerCase();
    const cleanAlphanumeric = clean.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const cleanPlate = formatPlate(clean);
    const cleanUnpadded = clean.replace(/^0+/, '').toLowerCase();
    const cleanNum = parseInt(clean, 10);
    // Extracción de solo dígitos numéricos (para comparar ej: 0430 o 430 con PK-0430)
    const cleanDigits = clean.replace(/\D/g, '').replace(/^0+/, '');

    const matchesTicket = (t: ParkingTicket) => {
      const tBarcode = (t.barcode || '').toLowerCase();
      const tBarcodeAlpha = tBarcode.replace(/[^a-zA-Z0-9]/g, '');
      const tBarcodeUnpadded = tBarcode.replace(/^0+/, '');
      const tBarcodeDigits = tBarcode.replace(/\D/g, '').replace(/^0+/, '');

      const tNumber = (t.ticketNumber || '').toLowerCase();
      const tNumberAlpha = tNumber.replace(/[^a-zA-Z0-9]/g, '');
      const tNumberUnpadded = tNumber.replace(/^0+/, '');
      const tNumberDigits = tNumber.replace(/\D/g, '').replace(/^0+/, '');

      const tId = (t.id || '').toLowerCase();
      const tPlate = formatPlate(t.plate);
      const tNumVal = parseInt(t.ticketNumber || '', 10);

      return (
        (tBarcode && tBarcode === cleanLower) ||
        (tBarcodeAlpha && tBarcodeAlpha === cleanAlphanumeric) ||
        (tNumber && tNumber === cleanLower) ||
        (tNumberAlpha && tNumberAlpha === cleanAlphanumeric) ||
        (tId && tId === cleanLower) ||
        (tPlate && tPlate === cleanPlate) ||
        (cleanUnpadded && (cleanUnpadded === tNumberUnpadded || cleanUnpadded === tBarcodeUnpadded)) ||
        (!isNaN(cleanNum) && !isNaN(tNumVal) && cleanNum === tNumVal) ||
        (Boolean(cleanDigits) && Boolean(tNumberDigits) && cleanDigits === tNumberDigits) ||
        (Boolean(cleanDigits) && Boolean(tBarcodeDigits) && cleanDigits === tBarcodeDigits)
      );
    };

    // 1. Buscar en tickets activos en el patio
    const active = activeTickets.find(matchesTicket) || null;
    if (active) {
      return { active, paid: null, cleanQuery: clean };
    }

    // 2. Buscar en tickets ya liquidados / cerrados
    const paid = paidTickets.find(matchesTicket) || null;
    return { active: null, paid, cleanQuery: clean };
  }, [activeTickets, paidTickets]);

  const processScannedBarcode = useCallback((rawInput: string, measuredSpeedMs?: number) => {
    const parseResult = barcodeScannerService.parseScannedString(rawInput);
    const cleanCode = parseResult.extractedCode;
    const speed = measuredSpeedMs ?? lastAverageSpeedMs ?? 30;

    // Validación de Prefijo Obligatorio
    if (!parseResult.hasValidPrefix && config.requirePrefix) {
      const expectedPfx = barcodeScannerService.getEffectivePrefix();
      if (config.playBeepOnScan) playSound('alert');

      const errorDetails: BarcodeScanErrorDetails = {
        errorType: 'prefix_mismatch',
        scannedText: rawInput,
        detectedLength: rawInput.length,
        detectedSpeedMs: speed,
        expectedPrefix: expectedPfx,
        diagnosticHint: `El lector no envió el prefijo obligatorio configurado ("${expectedPfx}").`,
        actionSuggestion: 'Verifique la programación de prefijos de su pistola USB en la configuración de la terminal.'
      };

      barcodeScannerService.emitScanEvent({
        rawCode: rawInput,
        status: 'read_error',
        message: `Prefijo incorrecto. Se esperaba "${expectedPfx}".`,
        timestamp: new Date().toLocaleTimeString(),
        errorDetails
      });

      if (onTicketNotFound) onTicketNotFound(rawInput, errorDetails);
      return;
    }

    // Validación de longitud mínima
    if (cleanCode.length < activeMinLength) {
      if (config.playBeepOnScan) playSound('alert');

      const errorDetails: BarcodeScanErrorDetails = {
        errorType: 'incomplete_read',
        scannedText: rawInput,
        detectedLength: cleanCode.length,
        detectedSpeedMs: speed,
        diagnosticHint: `Lectura demasiado corta (${cleanCode.length} car.). El mínimo configurado es ${activeMinLength}.`,
        actionSuggestion: 'Alinee el haz láser centrado en el código de barras y vuelva a disparar.'
      };

      barcodeScannerService.emitScanEvent({
        rawCode: rawInput,
        status: 'read_error',
        message: `Lectura incompleta (${cleanCode.length} car.). Vuelva a escanear.`,
        timestamp: new Date().toLocaleTimeString(),
        errorDetails
      });

      if (onTicketNotFound) onTicketNotFound(rawInput, errorDetails);
      return;
    }

    setLastScannedCode(cleanCode);
    setLastScannedTime(new Date());

    const { active, paid } = findTicketByCode(rawInput);

    if (active) {
      let calculatedFee: number | undefined = undefined;
      if (rates) {
        try {
          const fee = calculateParkingFee(
            active.entryTime,
            new Date().toISOString(),
            active.vehicleType,
            rates
          );
          calculatedFee = fee.totalAmount;
        } catch {
          // Fallback silencioso
        }
      }

      const isZeroFee = calculatedFee !== undefined && calculatedFee === 0;

      if (config.playBeepOnScan) {
        playSound('success');
      }

      if (config.autoAction === 'fast_exit_if_zero' && isZeroFee && onFastExitDirect) {
        barcodeScannerService.emitScanEvent({
          rawCode: cleanCode,
          ticketNumber: active.ticketNumber,
          plate: active.plate,
          status: 'fast_exit_executed',
          message: `Salida ultra-rápida procesada automáticamente (Tarifa $0 en tiempo de gracia).`,
          totalAmount: 0,
          currencySymbol: rates?.currencySymbol || '$',
          spotCode: active.spotCode,
          vehicleType: active.vehicleType,
          timestamp: new Date().toLocaleTimeString()
        });

        onFastExitDirect(active);
      } else {
        barcodeScannerService.emitScanEvent({
          rawCode: cleanCode,
          ticketNumber: active.ticketNumber,
          plate: active.plate,
          status: 'active_found',
          message: `Ticket encontrado. Listo para liquidación y cobro de salida.`,
          totalAmount: calculatedFee,
          currencySymbol: rates?.currencySymbol || '$',
          spotCode: active.spotCode,
          vehicleType: active.vehicleType,
          timestamp: new Date().toLocaleTimeString()
        });

        onTicketFound(active, config.autoAction);
      }
    } else if (paid) {
      if (config.playBeepOnScan) {
        playSound('beep');
      }

      const errorDetails: BarcodeScanErrorDetails = {
        errorType: 'already_paid',
        scannedText: cleanCode,
        detectedLength: cleanCode.length,
        detectedSpeedMs: speed,
        diagnosticHint: `El ticket #${paid.ticketNumber} registró salida el ${paid.exitTime ? new Date(paid.exitTime).toLocaleString() : 'recientemente'}.`,
        actionSuggestion: 'Si el cliente desea reingresar, genere un nuevo ticket de entrada.'
      };

      barcodeScannerService.emitScanEvent({
        rawCode: cleanCode,
        ticketNumber: paid.ticketNumber,
        plate: paid.plate,
        status: 'already_paid',
        message: `El ticket #${paid.ticketNumber} (${paid.plate}) ya fue liquidado y pagado previamente.`,
        totalAmount: paid.totalAmount,
        currencySymbol: rates?.currencySymbol || '$',
        spotCode: paid.spotCode,
        vehicleType: paid.vehicleType,
        timestamp: new Date().toLocaleTimeString(),
        errorDetails
      });

      if (onTicketAlreadyPaid) {
        onTicketAlreadyPaid(paid);
      } else if (onTicketNotFound) {
        onTicketNotFound(cleanCode, errorDetails);
      }
    } else {
      // TICKET NO ENCONTRADO EN PATIO ACTIVO (Error de lectura o ticket inexistente)
      if (config.playBeepOnScan) {
        playSound('alert');
      }

      const isLikelyPlate = /^[A-Z]{3}[0-9]{2,3}[A-Z]?$/i.test(cleanCode);
      const isLikelyTicket = /^PK|^TK/i.test(cleanCode);

      const diagnosticHint = isLikelyTicket
        ? `El ticket "${cleanCode}" no está registrado en el patio actual o fue cancelado.`
        : isLikelyPlate
        ? `No hay ningún vehículo activo estacionado con la placa "${cleanCode}".`
        : `El código leído "${cleanCode}" no coincide con el formato de ticket ni placa de este parqueadero.`;

      const actionSuggestion = isLikelyPlate || isLikelyTicket
        ? 'Verifique si el vehículo ingresó sin ticket físico o busque manualmente por celda.'
        : 'Verifique si el código de barras está manchado, borroso o corresponde a otra sucursal.';

      const errorDetails: BarcodeScanErrorDetails = {
        errorType: 'not_found',
        scannedText: cleanCode,
        detectedLength: cleanCode.length,
        detectedSpeedMs: speed,
        diagnosticHint,
        actionSuggestion
      };

      barcodeScannerService.emitScanEvent({
        rawCode: cleanCode,
        status: 'not_found',
        message: `No se encontró ningún ticket activo con el código "${cleanCode}".`,
        timestamp: new Date().toLocaleTimeString(),
        errorDetails
      });

      if (onTicketNotFound) {
        onTicketNotFound(cleanCode, errorDetails);
      }
    }
  }, [
    activeMinLength,
    findTicketByCode,
    rates,
    config,
    lastAverageSpeedMs,
    onFastExitDirect,
    onTicketFound,
    onTicketAlreadyPaid,
    onTicketNotFound
  ]);

  useEffect(() => {
    if (!enabled || !config.enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar modificadores puros
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
        return;
      }

      const now = Date.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      const configuredSuffix = barcodeScannerService.getEffectiveSuffix();
      const isEnterTerminator = e.key === 'Enter';
      const isTabTerminator = e.key === 'Tab' && (config.suffixType === 'tab' || config.suffixType === 'enter_tab');
      const isCustomSuffixTerminator = configuredSuffix && bufferRef.current.endsWith(configuredSuffix);

      // Si el usuario presiona Enter, Tab (si aplica) o se detecta el sufijo configurado
      if (isEnterTerminator || isTabTerminator || isCustomSuffixTerminator) {
        const buffered = bufferRef.current.trim();
        bufferRef.current = '';

        if (buffered.length >= activeMinLength) {
          const avgInterval = keyIntervalsRef.current.length > 0
            ? keyIntervalsRef.current.reduce((a, b) => a + b, 0) / keyIntervalsRef.current.length
            : 999;
          
          const roundedSpeed = Math.round(avgInterval);
          setLastAverageSpeedMs(roundedSpeed);

          const isBarcodeGun = avgInterval <= activeMaxInterval * 2.5;
          const isTicketFormat = /^[*%$#~]?(PK-|TK-|PK[0-9]|[A-Z]{3}[0-9]{2,3})/i.test(buffered);

          if (isBarcodeGun || isTicketFormat || buffered.length >= activeMinLength) {
            e.preventDefault();
            e.stopPropagation();
            processScannedBarcode(buffered, roundedSpeed);
          }
        }
        keyIntervalsRef.current = [];
        setIsGunScanning(false);
        return;
      }

      // Si el intervalo entre teclas es muy grande (> 450ms), reiniciar el buffer (tipeo manual lento)
      if (interval > 450) {
        bufferRef.current = '';
        keyIntervalsRef.current = [];
        setIsGunScanning(false);
      } else {
        keyIntervalsRef.current.push(interval);
        if (keyIntervalsRef.current.length >= 3) {
          setIsGunScanning(true);
        }
      }

      // Acumular caracteres imprimibles
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, config.enabled, config.suffixType, activeMaxInterval, activeMinLength, processScannedBarcode]);

  return {
    lastScannedCode,
    lastScannedTime,
    isGunScanning,
    lastAverageSpeedMs,
    config,
    processScannedBarcode,
    findTicketByCode
  };
}
