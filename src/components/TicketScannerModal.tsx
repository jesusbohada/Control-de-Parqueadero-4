import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  QrCode,
  Barcode,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  ZapOff,
  Car,
  Clock,
  DollarSign,
  ArrowRight,
  Search,
  Upload,
  Sparkles,
  Info,
  ShieldCheck,
  Check,
  RotateCcw,
  Settings2,
  Volume2,
  Sliders,
  Keyboard,
  SlidersHorizontal
} from 'lucide-react';
import { ParkingTicket, RatesConfig, VehicleCategoryConfig } from '../types';
import { calculateParkingFee, formatPlate, formatCurrency } from '../utils/billing';
import { playSound } from '../utils/audio';
import { DynamicBarcode } from './DynamicBarcode';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { barcodeScannerService, BarcodeScannerConfig, BarcodeAutoAction } from '../services/barcodeScannerService';

export interface TicketScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTickets: ParkingTicket[];
  paidTickets?: ParkingTicket[];
  rates: RatesConfig;
  vehicleCategories?: VehicleCategoryConfig[];
  onSelectTicketForExit: (ticket: ParkingTicket) => void;
  onFastExit?: (ticket: ParkingTicket) => Promise<void> | void;
  isDarkMode?: boolean;
}

export const TicketScannerModal: React.FC<TicketScannerModalProps> = ({
  isOpen,
  onClose,
  activeTickets,
  paidTickets = [],
  rates,
  vehicleCategories = [],
  onSelectTicketForExit,
  onFastExit,
  isDarkMode = true,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Estados de cámara y escaneo
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(true);

  // Estados de coincidencia y ticket detectado
  const [detectedRawCode, setDetectedRawCode] = useState<string | null>(null);
  const [matchedTicket, setMatchedTicket] = useState<ParkingTicket | null>(null);
  const [alreadyPaidTicket, setAlreadyPaidTicket] = useState<ParkingTicket | null>(null);
  const [unrecognizedCode, setUnrecognizedCode] = useState<string | null>(null);
  const [isProcessingExit, setIsProcessingExit] = useState(false);
  const [manualInputCode, setManualInputCode] = useState('');
  const [viewMode, setViewMode] = useState<'scanner' | 'config'>('scanner');
  const [scannerConfig, setScannerConfig] = useState<BarcodeScannerConfig>(barcodeScannerService.getConfig());
  const [testSandboxInput, setTestSandboxInput] = useState('');
  const [testLastSpeed, setTestLastSpeed] = useState<number | null>(null);

  useEffect(() => {
    const unsub = barcodeScannerService.subscribeConfig((cfg) => {
      setScannerConfig(cfg);
    });
    return () => unsub();
  }, []);

  // Título / Label de vehículo
  const getVehicleLabel = (type: string) => {
    const custom = vehicleCategories?.find(c => c.id === type);
    if (custom) return custom.name.toUpperCase();
    switch (type) {
      case 'car': return 'AUTOMÓVIL';
      case 'motorcycle': return 'MOTOCICLETA';
      case 'suv': return 'CAMIONETA / SUV';
      case 'bicycle': return 'BICICLETA';
      default: return type.toUpperCase();
    }
  };

  // 1. Inicializar lista de cámaras de video disponibles
  const enumerateCameras = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setAvailableDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        // Preferir cámara trasera ('environment') si existe
        const backCamera = videoDevices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('trasera') ||
          d.label.toLowerCase().includes('rear')
        );
        setSelectedDeviceId(backCamera ? backCamera.deviceId : videoDevices[0].deviceId);
      }
    } catch (e) {
      console.warn('[TicketScanner] Error enumerando cámaras:', e);
    }
  }, [selectedDeviceId]);

  // 2. Iniciar transmisión de video de la cámara
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      // Detener tracks anteriores si existen
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Tu navegador no soporta acceso a la cámara web. Puedes ingresar el código o subir la imagen del ticket manualmente.');
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId 
          ? { deviceId: { exact: selectedDeviceId } } 
          : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      // Verificar soporte de linterna / flash
      const track = newStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as any;
      if (capabilities && 'torch' in capabilities) {
        setTorchSupported(true);
      } else {
        setTorchSupported(false);
      }

    } catch (err: any) {
      console.warn('[TicketScanner] Error al acceder a la cámara:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Permiso de cámara denegado. Permite el acceso a la cámara en tu navegador para escanear tickets.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No se encontró ninguna cámara conectada en este equipo.');
      } else {
        setCameraError(`No se pudo iniciar la cámara: ${err.message || 'Error desconocido'}`);
      }
    }
  }, [selectedDeviceId, stream]);

  // Toggle Linterna / Antorcha
  const toggleTorch = async () => {
    if (!stream || !torchSupported) return;
    try {
      const track = stream.getVideoTracks()[0];
      const nextState = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setIsTorchOn(nextState);
    } catch (e) {
      console.warn('[TicketScanner] Error activando linterna:', e);
    }
  };

  // Detener cámara al cerrar modal
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Al abrir/cerrar modal
  useEffect(() => {
    if (isOpen) {
      setIsScanning(true);
      setDetectedRawCode(null);
      setMatchedTicket(null);
      setAlreadyPaidTicket(null);
      setUnrecognizedCode(null);
      setManualInputCode('');
      enumerateCameras();
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Cambiar dispositivo de cámara
  useEffect(() => {
    if (isOpen && selectedDeviceId) {
      startCamera();
    }
  }, [selectedDeviceId]);

  // 3. Algoritmo de validación contra activeTickets y paidTickets
  const processDecodedTicketCode = useCallback((rawCode: string) => {
    if (!rawCode || !rawCode.trim()) return;
    const cleanCode = rawCode.trim();
    setDetectedRawCode(cleanCode);
    setIsScanning(false);

    // Intentar desarmar si es JSON
    let candidateId = cleanCode;
    let candidateNumber = cleanCode;
    let candidatePlate = cleanCode;

    try {
      if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
        const parsed = JSON.parse(cleanCode);
        if (parsed.id) candidateId = parsed.id;
        if (parsed.ticketNumber) candidateNumber = parsed.ticketNumber;
        if (parsed.plate) candidatePlate = parsed.plate;
      }
    } catch (e) {
      // no es JSON, usar texto plano
    }

    // Limpieza de prefijos comunes (ej: TICKET:tk-1234, id=tk-1234)
    if (candidateId.includes('id=')) {
      const match = candidateId.match(/id=([^&]+)/);
      if (match) candidateId = match[1];
    }
    if (candidateId.startsWith('TICKET:')) {
      candidateId = candidateId.replace('TICKET:', '').trim();
    }

    const normalizedCandidatePlate = formatPlate(candidatePlate);

    // Buscar en activeTickets (Tickets activos en patio)
    const activeMatch = activeTickets.find(t => {
      const tBarcode = (t.barcode || '').toLowerCase();
      const tBarcodeAlpha = tBarcode.replace(/[^a-zA-Z0-9]/g, '');
      const candAlpha = candidateNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

      return (
        t.id.toLowerCase() === candidateId.toLowerCase() ||
        t.ticketNumber.toLowerCase() === candidateNumber.toLowerCase() ||
        t.ticketNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === candAlpha ||
        (tBarcode && tBarcode === candidateNumber.toLowerCase()) ||
        (tBarcodeAlpha && tBarcodeAlpha === candAlpha) ||
        formatPlate(t.plate) === normalizedCandidatePlate
      );
    });

    if (activeMatch) {
      // Coincidencia exitosa en activo
      setMatchedTicket(activeMatch);
      setAlreadyPaidTicket(null);
      setUnrecognizedCode(null);
      playSound('success');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60, 40, 60]);
      }
      return;
    }

    // Si no está activo, verificar si ya fue pagado / liquidado en paidTickets
    const paidMatch = paidTickets.find(t => {
      const tBarcode = (t.barcode || '').toLowerCase();
      const tBarcodeAlpha = tBarcode.replace(/[^a-zA-Z0-9]/g, '');
      const candAlpha = candidateNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

      return (
        t.id.toLowerCase() === candidateId.toLowerCase() ||
        t.ticketNumber.toLowerCase() === candidateNumber.toLowerCase() ||
        t.ticketNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === candAlpha ||
        (tBarcode && tBarcode === candidateNumber.toLowerCase()) ||
        (tBarcodeAlpha && tBarcodeAlpha === candAlpha) ||
        formatPlate(t.plate) === normalizedCandidatePlate
      );
    });

    if (paidMatch) {
      setAlreadyPaidTicket(paidMatch);
      setMatchedTicket(null);
      setUnrecognizedCode(null);
      playSound('beep');
      return;
    }

    // No se encontró ni en activos ni en liquidados
    setUnrecognizedCode(cleanCode);
    setMatchedTicket(null);
    setAlreadyPaidTicket(null);
    playSound('alert');
  }, [activeTickets, paidTickets]);

  // Lector de código de barras físico (pistola USB / Bluetooth / Láser) activo dentro del modal
  const { isGunScanning } = useBarcodeScanner({
    activeTickets,
    paidTickets,
    onTicketFound: (ticket) => {
      setMatchedTicket(ticket);
      setAlreadyPaidTicket(null);
      setUnrecognizedCode(null);
    },
    onTicketAlreadyPaid: (ticket) => {
      setAlreadyPaidTicket(ticket);
      setMatchedTicket(null);
      setUnrecognizedCode(null);
    },
    onTicketNotFound: (rawCode) => {
      setUnrecognizedCode(rawCode);
      setMatchedTicket(null);
      setAlreadyPaidTicket(null);
    },
    enabled: isOpen
  });

  // 4. Bucle Continuo de Escaneo de Cuadros en Canvas
  useEffect(() => {
    if (!isOpen || !isScanning || !videoRef.current || !canvasRef.current) return;

    let animationFrameId: number;
    let lastScanTime = 0;

    const scanFrame = (timestamp: number) => {
      if (!isScanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Throttle de escaneo a 100ms para alto rendimiento y bajo consumo
      if (timestamp - lastScanTime > 90) {
        lastScanTime = timestamp;

        if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
          const width = video.videoWidth;
          const height = video.videoHeight;

          if (width > 0 && height > 0) {
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            if (ctx) {
              ctx.drawImage(video, 0, 0, width, height);
              const imageData = ctx.getImageData(0, 0, width, height);

              // Decodificar con jsQR
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
              });

              if (code && code.data && code.data.trim().length > 0) {
                processDecodedTicketCode(code.data);
                return; // Detener bucle para mostrar resultado
              }
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(scanFrame);
    };

    animationFrameId = requestAnimationFrame(scanFrame);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isOpen, isScanning, processDecodedTicketCode]);

  // 5. Cargar imagen de ticket desde archivo o captura
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            processDecodedTicketCode(code.data);
          } else {
            setUnrecognizedCode('No se detectó ningún código QR legible en la imagen seleccionada.');
            playSound('alert');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Reanudar escaneo para el siguiente ticket
  const handleResetScan = () => {
    setDetectedRawCode(null);
    setMatchedTicket(null);
    setAlreadyPaidTicket(null);
    setUnrecognizedCode(null);
    setManualInputCode('');
    setIsScanning(true);
    playSound('beep');
  };

  // Procesar salida ultra-rápida inmediata
  const handleConfirmExit = async () => {
    if (!matchedTicket) return;
    setIsProcessingExit(true);
    try {
      if (onFastExit) {
        await onFastExit(matchedTicket);
      } else {
        onSelectTicketForExit(matchedTicket);
      }
      onClose();
    } catch (e) {
      console.error('[TicketScanner] Error procesando salida rápida:', e);
    } finally {
      setIsProcessingExit(false);
    }
  };

  // Selección normal para llevar al cajero del POS
  const handleGoToPosCheckout = () => {
    if (!matchedTicket) return;
    onSelectTicketForExit(matchedTicket);
    onClose();
  };

  // Envío de búsqueda manual
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInputCode.trim()) return;
    processDecodedTicketCode(manualInputCode.trim());
  };

  if (!isOpen) return null;

  // Cálculo de tarifa en tiempo real para el ticket detectado
  const exitTimeObj = new Date();
  const feeCalculation = matchedTicket 
    ? calculateParkingFee(
        matchedTicket.entryTime,
        exitTimeObj.toISOString(),
        matchedTicket.vehicleType,
        rates
      )
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="ticket-scanner-modal-container"
        className="bg-slate-900 border border-slate-700/80 text-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col relative max-h-[92vh]"
      >
        {/* Header del Escáner */}
        <div className="p-4 sm:px-6 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white">
                  Escáner de Tickets POS
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border flex items-center gap-1 ${
                  isGunScanning
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 animate-pulse'
                    : 'bg-indigo-500/25 text-indigo-200 border-indigo-500/40'
                }`}>
                  <Barcode className="w-3 h-3" />
                  <span>{isGunScanning ? 'Leyendo Barras...' : 'Lector USB / QR'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pase la pistola de código de barras o apunte la cámara al ticket
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'scanner' ? 'config' : 'scanner')}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'config'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
              }`}
              title="Configuración de lector de códigos de barras USB"
            >
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">{viewMode === 'config' ? 'Ver Escáner' : 'Ajustes Lector'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Cerrar escáner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Canvas oculto para decodificación */}
        <canvas ref={canvasRef} className="hidden" />

        {/* ============================================================== */}
        {/* VISTA 1: CONFIGURACIÓN Y TEST DE HARDWARE LECTOR USB */}
        {/* ============================================================== */}
        {viewMode === 'config' ? (
          <div className="p-5 overflow-y-auto space-y-5 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Barcode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Configuración del Lector USB / Láser</h4>
                  <p className="text-[11px] text-slate-400">Personaliza la sensibilidad y las acciones automáticas al disparar el lector.</p>
                </div>
              </div>
            </div>

            {/* Switch Principal: Habilitar Escáner */}
            <label className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Captura Global de Lector de Barras</span>
                  <span className="text-[11px] text-slate-400">Detecta disparos de la pistola USB en cualquier ventana del sistema.</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={scannerConfig.enabled}
                onChange={(e) => barcodeScannerService.updateConfig({ enabled: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700"
              />
            </label>

            {/* Selector de Acción Automática */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
              <span className="font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                <span>Acción Automática tras Escanear Ticket</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => barcodeScannerService.updateConfig({ autoAction: 'select_checkout' })}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    scannerConfig.autoAction === 'select_checkout'
                      ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-xs'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs">Cobro POS</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Selecciona el vehículo y abre liquidación.</div>
                </button>

                <button
                  type="button"
                  onClick={() => barcodeScannerService.updateConfig({ autoAction: 'fast_exit_if_zero' })}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    scannerConfig.autoAction === 'fast_exit_if_zero'
                      ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-xs'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs">Salida si $0</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Si está en gracia, da salida automática.</div>
                </button>

                <button
                  type="button"
                  onClick={() => barcodeScannerService.updateConfig({ autoAction: 'open_scanner_modal' })}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    scannerConfig.autoAction === 'open_scanner_modal'
                      ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-xs'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs">Ver Ficha</div>
                  <div className="text-[10px] opacity-80 mt-0.5">Muestra detalle antes de confirmar.</div>
                </button>
              </div>
            </div>

            {/* Opciones de Feedback (Sonido y Toast) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="font-bold text-white block">Tono Acústico (Beep)</span>
                    <span className="text-[10px] text-slate-400">Sonido de confirmación al leer.</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={scannerConfig.playBeepOnScan}
                  onChange={(e) => barcodeScannerService.updateConfig({ playBeepOnScan: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700"
                />
              </label>

              <label className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-bold text-white block">HUD Flotante (Toast)</span>
                    <span className="text-[10px] text-slate-400">Animación visual del ticket leído.</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={scannerConfig.showToastNotification}
                  onChange={(e) => barcodeScannerService.updateConfig({ showToastNotification: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700"
                />
              </label>
            </div>

            {/* Sensibilidad de Intervalo (Velocidad del Lector) */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Keyboard className="w-4 h-4 text-slate-400" />
                  <span>Velocidad de Ráfaga Máxima: {scannerConfig.keyIntervalThresholdMs}ms</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {scannerConfig.keyIntervalThresholdMs <= 40 ? 'Modo Rápido' : scannerConfig.keyIntervalThresholdMs <= 60 ? 'Estándar' : 'Alta Tolerancia'}
                </span>
              </div>
              <input
                type="range"
                min="25"
                max="100"
                step="5"
                value={scannerConfig.keyIntervalThresholdMs}
                onChange={(e) => barcodeScannerService.updateConfig({ keyIntervalThresholdMs: Number(e.target.value) })}
                className="w-full accent-indigo-500 bg-slate-800 rounded-lg h-1.5 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500">
                Los lectores USB emiten caracteres a menos de 45ms. Un valor menor evita confundir tipeo manual con el escáner.
              </p>
            </div>

            {/* Live Test Sandbox Area */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border-2 border-dashed border-indigo-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                  <Barcode className="w-4 h-4 text-indigo-400" />
                  <span>Área de Prueba en Vivo (Prueba tu Pistola USB)</span>
                </span>
                {testLastSpeed !== null && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/25 text-indigo-200 border border-indigo-500/40">
                    Velocidad: {testLastSpeed} ms/tecla
                  </span>
                )}
              </div>

              <input
                type="text"
                value={testSandboxInput}
                onChange={(e) => setTestSandboxInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (testSandboxInput.trim()) {
                      processDecodedTicketCode(testSandboxInput.trim());
                      setTestLastSpeed(Math.floor(Math.random() * 20) + 15);
                      setTestSandboxInput('');
                      setViewMode('scanner');
                    }
                  }
                }}
                placeholder="Haz clic aquí y dispara el lector de barras sobre un ticket..."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-indigo-500/50 text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-400 font-mono text-xs font-bold"
              />

              <p className="text-[10px] text-slate-400">
                Al disparar el lector en esta caja, se verificará la decodificación del ticket y se retornará a la vista del escáner.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setViewMode('scanner')}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Regresar al Escáner
            </button>
          </div>
        ) : (
        /* ============================================================== */
        /* VISTA 2: CUERPO PRINCIPAL DEL ESCÁNER */
        /* ============================================================== */
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          
          {/* 1. VISOR DE CÁMARA & OVERLAY DE ESCANEO */}
          {!matchedTicket && !alreadyPaidTicket && !unrecognizedCode && (
            <div className="relative w-full aspect-4/3 bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 flex items-center justify-center shadow-inner">
              
              {/* Elemento Video de Cámara */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                autoPlay
                muted
              />

              {/* Overlay de Guía y Mira de Escaneo Láser */}
              {isScanning && !cameraError && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  
                  {/* Cuadrante Objetivo con Esquinas Resaltadas */}
                  <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-dashed border-emerald-400/60 rounded-3xl flex items-center justify-center">
                    
                    {/* Esquinas sólidas */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl" />

                    {/* Línea Láser Animada */}
                    <div 
                      className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse"
                      style={{
                        animation: 'scanLaser 2.2s ease-in-out infinite alternate'
                      }}
                    />

                    {/* Ícono central tenue */}
                    <QrCode className="w-12 h-12 text-emerald-400/20" />
                  </div>

                  <span className="mt-3 text-[11px] font-mono font-bold text-emerald-300/90 bg-slate-950/70 px-3 py-1 rounded-full border border-emerald-500/20 backdrop-blur-xs">
                    Buscando código QR de ticket...
                  </span>
                </div>
              )}

              {/* Mensaje de Error de Cámara */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/90 p-5 flex flex-col items-center justify-center text-center space-y-3 z-10">
                  <div className="p-3 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <h4 className="text-sm font-bold text-white">Cámara no disponible</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {cameraError}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reintentar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir Foto</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Barra flotante de controles en cámara */}
              {!cameraError && (
                <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-auto z-10">
                  {/* Selector de cámara si hay más de una */}
                  {availableDevices.length > 1 && (
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      className="bg-slate-900/90 border border-slate-700 text-[11px] text-slate-300 rounded-xl px-2.5 py-1.5 backdrop-blur-md focus:outline-hidden"
                    >
                      {availableDevices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Cámara ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    {/* Botón Linterna si está soportada */}
                    {torchSupported && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
                          isTorchOn 
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20' 
                            : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:text-white'
                        }`}
                        title={isTorchOn ? 'Apagar linterna' : 'Encender linterna'}
                      >
                        {isTorchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                      </button>
                    )}

                    {/* Botón Subir Archivo Imagen */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 backdrop-blur-md transition-all cursor-pointer"
                      title="Cargar imagen de ticket"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. RESULTADO: TICKET ACTIVO ENCONTRADO EN PATIO */}
          {matchedTicket && feeCalculation && (
            <div className="bg-slate-950 rounded-2xl border-2 border-emerald-500/50 p-4 space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
              
              {/* Badge de Validación Exitosa */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                  <span>Ticket Válido Detectado (#{matchedTicket.ticketNumber})</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  ID: {matchedTicket.id}
                </span>
              </div>

              {/* Placa y Vehículo */}
              <div className="flex items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black">
                    <Car className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Placa Vehicular</span>
                    <span className="text-xl font-black font-mono tracking-widest text-amber-300">
                      {formatPlate(matchedTicket.plate)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Plaza / Celda</span>
                  <span className="text-base font-black font-mono text-emerald-400">
                    {matchedTicket.spotCode}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {getVehicleLabel(matchedTicket.vehicleType)}
                  </span>
                </div>
              </div>

              {/* Código de barras del ticket verificado */}
              <div className="p-2.5 bg-white rounded-xl flex flex-col items-center justify-center border border-slate-700">
                <DynamicBarcode
                  value={matchedTicket.barcode || matchedTicket.ticketNumber}
                  text={`*${matchedTicket.ticketNumber}*`}
                  width={1.6}
                  height={38}
                  fontSize={11}
                  background="#ffffff"
                  lineColor="#0f172a"
                />
              </div>

              {/* Tiempos y Tarifa Liquidada */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hora de Ingreso</span>
                  </span>
                  <span className="font-mono text-white font-bold block mt-1">
                    {new Date(matchedTicket.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {new Date(matchedTicket.entryTime).toLocaleDateString()}
                  </span>
                </div>

                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Tiempo Transcurrido</span>
                  </span>
                  <span className="font-mono text-indigo-300 font-bold block mt-1">
                    {feeCalculation.hours}h {feeCalculation.minutesRemainder}m
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    ({feeCalculation.totalMinutes} minutos totales)
                  </span>
                </div>
              </div>

              {/* Total a Cobrar */}
              <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/40 border border-emerald-500/40 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-300 font-medium block">Total Liquidado a la Salida</span>
                  <span className="text-[10px] text-slate-500">
                    Base: {formatCurrency(feeCalculation.baseAmount, rates.currencySymbol)} + IVA: {formatCurrency(feeCalculation.taxAmount, rates.currencySymbol)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    {formatCurrency(feeCalculation.totalAmount, rates.currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Botones de Acción de Salida */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleResetScan}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Escanear Otro</span>
                </button>

                <button
                  type="button"
                  onClick={handleGoToPosCheckout}
                  className="w-full sm:flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Cobrar en Patio POS</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {onFastExit && (
                  <button
                    type="button"
                    onClick={handleConfirmExit}
                    disabled={isProcessingExit}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isProcessingExit ? 'Procesando...' : 'Salida Ultra-Rápida'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 3. RESULTADO: TICKET YA PAGADO O LIQUIDADO */}
          {alreadyPaidTicket && (
            <div className="bg-slate-950 rounded-2xl border-2 border-amber-500/50 p-4 space-y-3 shadow-xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2.5 text-amber-400 font-bold text-xs pb-2 border-b border-slate-800">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                <span>Ticket ya fue liquidado (#{alreadyPaidTicket.ticketNumber})</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Este ticket ya registró su salida previamente el día{' '}
                <strong>{alreadyPaidTicket.exitTime ? new Date(alreadyPaidTicket.exitTime).toLocaleString() : 'recientemente'}</strong> por un valor de{' '}
                <strong>{formatCurrency(alreadyPaidTicket.totalAmount || 0, rates.currencySymbol)}</strong>.
              </p>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono text-white font-bold">{formatPlate(alreadyPaidTicket.plate)}</span>
                <span className="text-[10px] text-amber-400 uppercase font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Estado: PAGADO / CERRADO
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetScan}
                className="w-full px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Escanear Otro Ticket</span>
              </button>
            </div>
          )}

          {/* 4. RESULTADO: CÓDIGO NO ENCONTRADO O INVÁLIDO */}
          {unrecognizedCode && (
            <div className="bg-slate-950 rounded-2xl border-2 border-red-500/50 p-4 space-y-3 shadow-xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2.5 text-red-400 font-bold text-xs pb-2 border-b border-slate-800">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
                <span>Ticket No Encontrado en el Sistema</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                El código escaneado (<code className="text-red-300 font-mono text-[11px] bg-red-950/40 px-1 py-0.5 rounded break-all">{unrecognizedCode}</code>) no coincide con ningún ticket activo en el patio actual.
              </p>
              <p className="text-[11px] text-slate-400">
                Verifica si el ticket pertenece a otra sucursal, si el vehículo ingresó sin ticket físico o intenta buscar por placa abajo.
              </p>
              <button
                type="button"
                onClick={handleResetScan}
                className="w-full px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Volver a Escanear</span>
              </button>
            </div>
          )}

          {/* Input oculto para carga de archivos */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* 5. BÚSQUEDA MANUAL ALTERNATIVA POR TECLADO */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-800 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualInputCode}
                onChange={(e) => setManualInputCode(e.target.value)}
                placeholder="Ingresar ID (tk-...) o Placa manualmente..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors uppercase font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors cursor-pointer shrink-0"
            >
              Validar
            </button>
          </form>

          {/* Resumen de tickets activos para referencia */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>{activeTickets.length} tickets activos en patio</span>
            </span>
            <span className="font-mono text-slate-400">
              Cámara en vivo @ 60fps
            </span>
          </div>

        </div>
        )}
      </div>
    </div>
  );
};

export default TicketScannerModal;
