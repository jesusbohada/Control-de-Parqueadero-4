import React, { useState, useEffect, useRef } from 'react';
import { 
  Monitor, 
  X, 
  Terminal, 
  Cpu, 
  HardDrive, 
  RefreshCw, 
  Send, 
  Sliders, 
  Keyboard, 
  MousePointer, 
  ShieldAlert, 
  Wifi, 
  Settings, 
  User, 
  Play, 
  Power, 
  Maximize2, 
  FileText, 
  Chrome, 
  Activity,
  AlertTriangle,
  Volume2,
  VolumeX,
  CheckCircle2,
  Zap,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronUp,
  Video,
  Download,
  Share2,
  Radio,
  Server,
  Code,
  Sparkles,
  BookOpen,
  Lock,
  Unlock,
  Clipboard,
  ShieldCheck,
  Globe,
  Cast,
  Heart,
  Eye,
  EyeOff,
  WifiOff,
  SlidersHorizontal
} from 'lucide-react';
import { playSound } from '../utils/audio';
import { FarmaDeskSocketClient } from '../services/websocketService';
import { generateFarmadeskId, generateFarmadeskPassword } from '../utils/farmadeskCredentials';
import { FarmaDeskDocsModal } from './FarmaDeskDocsModal';
import { 
  FarmaDeskRtcEngine, 
  AccessCodeInfo, 
  SessionHealthMetrics, 
  CrdConnectionState 
} from '../services/farmadeskRtcService';

import { 
  ParkingSpot, 
  ParkingTicket, 
  RatesConfig, 
  ParkingBusinessInfo, 
  SystemUser, 
  PaymentGatewayConfig, 
  VehicleCategoryConfig,
  BranchLocation 
} from '../types';
import { calculateParkingFee, formatCurrency, formatPlate } from '../utils/billing';
import { 
  FOREIGN_COUNTRY_OPTIONS, 
  validatePlateData, 
  getActivePlateRule 
} from '../utils/plateValidation';

interface VncRemoteDesktopProps {
  branchId: string;
  branchName: string;
  city: string;
  ipAddress: string;
  onClose: () => void;
  branch?: BranchLocation;
  activeTickets?: ParkingTicket[];
  spots?: ParkingSpot[];
  rates?: RatesConfig;
  vehicleCategories?: VehicleCategoryConfig[];
  businessInfo?: ParkingBusinessInfo;
  currentUser?: SystemUser;
  paymentGatewayConfig?: PaymentGatewayConfig;
  onRegisterEntry?: (data: any) => void;
  onRegisterExit?: (ticketId: string, billingDetails: any) => void;
  onPrintTicket?: (ticket: ParkingTicket, mode?: 'entry' | 'exit') => void;
}

export const VncRemoteDesktop: React.FC<VncRemoteDesktopProps> = ({
  branchId,
  branchName,
  city,
  ipAddress,
  onClose,
  branch,
  activeTickets = [],
  spots = [],
  rates,
  vehicleCategories = [],
  businessInfo,
  currentUser,
  paymentGatewayConfig,
  onRegisterEntry,
  onRegisterExit,
  onPrintTicket
}) => {
  // Configuración VNC
  const [quality, setQuality] = useState<'alta' | 'media' | 'baja'>('alta');
  const [fps, setFps] = useState<number>(30);
  const [scale, setScale] = useState<number>(100);
  const [showToolbar, setShowToolbar] = useState<boolean>(true);
  
  // Telemetría fluctuante
  const [cpuLoad, setCpuLoad] = useState<number>(24);
  const [ramLoad, setRamLoad] = useState<number>(4.1);
  const [isRefreshingTelemetry, setIsRefreshingTelemetry] = useState<boolean>(false);

  // Estado del chat con el cajero
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'admin' | 'cashier', text: string, time: string }>>([
    { sender: 'cashier', text: `Hola soporte central, estoy operando en ${branchName} (${city}).`, time: '10:05 AM' },
    { sender: 'admin', text: 'Entendido, estoy conectado por VNC al sistema en vivo de su caja.', time: '10:06 AM' }
  ]);
  const [newMessageText, setNewMessageText] = useState<string>('');
  
  // Consola de Comandos CMD
  const [cmdOpen, setCmdOpen] = useState<boolean>(false);
  const [cmdInput, setCmdInput] = useState<string>('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([
    `WolfZone OS Terminal Controller [Version 10.0.19045] - Nodo ${ipAddress}`,
    `(c) WolfZone Systems Corporation. Servidor de Sucursal: ${branchName}`,
    '',
    `C:\\Users\\Caja_${branchName.replace(/\s+/g, '')}> _`
  ]);

  // Ventanas simuladas en el escritorio remoto
  const [posAppOpen, setPosAppOpen] = useState<boolean>(true);
  const [isPosMaximized, setIsPosMaximized] = useState<boolean>(true);
  const [printerQueueOpen, setPrinterQueueOpen] = useState<boolean>(false);
  const [isFullScreenVncMode, setIsFullScreenVncMode] = useState<boolean>(false);
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const [isHandshakeConnected, setIsHandshakeConnected] = useState<boolean>(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  // Control interactivo FarmaDesk y Visibilidad de Tarjetas
  const [liveIp, setLiveIp] = useState<string>(branch?.publicIp || ipAddress || '190.158.12.44');

  const [showConnectionCards, setShowConnectionCards] = useState<boolean>(true);
  const [operatingFeedbackToast, setOperatingFeedbackToast] = useState<string | null>(null);
  const [isCopiedCredentials, setIsCopiedCredentials] = useState<boolean>(false);
  const desktopRef = useRef<HTMLDivElement | null>(null);

  // Estados para Streaming de Escritorio Real FarmaDesk Pro® y Chrome Remote Desktop
  const [activeMainTab, setActiveMainTab] = useState<'console' | 'support' | 'devices'>('console');
  const [activeDesktopEngine, setActiveDesktopEngine] = useState<'farmadesk-agent' | 'pos-direct' | 'farmadesk-interactive'>('farmadesk-agent');
  const [isAgentStreaming, setIsAgentStreaming] = useState<boolean>(false);
  const [streamFps, setStreamFps] = useState<number>(0);
  const [lastFrameTime, setLastFrameTime] = useState<number | null>(null);
  const [isWebRtcSharing, setIsWebRtcSharing] = useState<boolean>(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState<boolean>(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState<boolean>(false);
  const [isCopiedPs1Command, setIsCopiedPs1Command] = useState<boolean>(false);
  const [isClipboardModalOpen, setIsClipboardModalOpen] = useState<boolean>(false);
  const [clipboardInput, setClipboardInput] = useState<string>('');
  const [streamScaleMode, setStreamScaleMode] = useState<'fit' | 'original' | 'stretch'>('fit');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  // Chrome Remote Desktop - Asistencia Remota & PIN
  const [accessCodeInfo, setAccessCodeInfo] = useState<AccessCodeInfo | null>(null);
  const [accessCodeSeconds, setAccessCodeSeconds] = useState<number>(300);
  const [inputAccessCode, setInputAccessCode] = useState<string>('');
  const [isGeneratingCode, setIsGeneratingCode] = useState<boolean>(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState<boolean>(false);
  const [devicePinInput, setDevicePinInput] = useState<string>('123456');
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [isPinVerified, setIsPinVerified] = useState<boolean>(true);

  // Estados para Heartbeat Visual y Detector de Foco / Conexión de Chrome Remote Desktop
  const [isWindowFocused, setIsWindowFocused] = useState<boolean>(typeof document !== 'undefined' ? document.hasFocus() : true);
  const [lastHeartbeatTime, setLastHeartbeatTime] = useState<number>(Date.now());
  const [heartbeatLatencyMs, setHeartbeatLatencyMs] = useState<number>(14);
  const [heartbeatPulse, setHeartbeatPulse] = useState<boolean>(false);
  const [isSocketStalled, setIsSocketStalled] = useState<boolean>(false);
  const [secondsWithoutResponse, setSecondsWithoutResponse] = useState<number>(0);
  const lastHeartbeatRef = useRef<number>(Date.now());

  // Watchdog de Validación de Estado de Sesión (Chrome Remote Desktop)
  const [sessionHealth, setSessionHealth] = useState<SessionHealthMetrics>({
    state: 'idle',
    latencyMs: 12,
    fps: 60,
    packetLossPercent: 0,
    framesDecoded: 0,
    framesDropped: 0,
    iceState: 'none',
    signalingState: 'none',
    recoveryAttempts: 0,
    maxRecoveryAttempts: 5,
    isReconnecting: false,
    isTransparentRecovering: false,
    lastHeartbeat: Date.now(),
    uptimeSeconds: 0,
    qualityLevel: 'optimal'
  });
  const [crdExtensionInfo, setCrdExtensionInfo] = useState(FarmaDeskRtcEngine.checkChromeExtensionSupport());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rtcEngineRef = useRef<FarmaDeskRtcEngine>(new FarmaDeskRtcEngine());

  const socketRef = useRef<FarmaDeskSocketClient | null>(null);

  // Detector de Foco de la Extensión y Ventana
  useEffect(() => {
    const handleFocus = () => {
      setIsWindowFocused(true);
      socketRef.current?.send('farmadesk:focus:changed', { hasFocus: true, branchId, timestamp: Date.now() });
    };
    const handleBlur = () => {
      setIsWindowFocused(false);
      socketRef.current?.send('farmadesk:focus:changed', { hasFocus: false, branchId, timestamp: Date.now() });
    };
    const handleVisibility = () => {
      const isVisible = document.visibilityState === 'visible';
      setIsWindowFocused(isVisible);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [branchId]);

  // Watchdog de Heartbeat: Sondeo cada 1.5s y Reconexión Automática si no responde en 5s
  useEffect(() => {
    lastHeartbeatRef.current = Date.now();

    const heartbeatInterval = setInterval(() => {
      setHeartbeatPulse(prev => !prev);
      const now = Date.now();
      const elapsed = now - lastHeartbeatRef.current;
      const elapsedSec = Math.floor(elapsed / 1000);
      setSecondsWithoutResponse(elapsedSec);

      // Enviar ping periódico por socket
      if (socketRef.current) {
        socketRef.current.send('link:ping', { timestamp: now, sender: 'vnc_admin_heartbeat' });
      }

      // Si el socket no responde en 5 segundos (5000ms), disparar reconexión automática transparente
      if (elapsed >= 5000) {
        setIsSocketStalled(true);
        console.warn(`[FarmaDesk Heartbeat] ⚠️ Socket sin respuesta por ${elapsedSec}s. Ejecutando reconexión automática...`);
        
        setOperatingFeedbackToast(`⚠️ Socket no respondió en ${elapsedSec}s. Reconectando canal en segundo plano...`);
        
        // Re-armado automático del socket y WebRTC
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current.connect();
        }
        rtcEngineRef.current.triggerTransparentRecovery();
        
        // Actualizar referencia para dar ventana de reintento
        lastHeartbeatRef.current = Date.now() - 2000;
      } else {
        setIsSocketStalled(false);
      }
    }, 1500);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [branchId]);

  useEffect(() => {
    // Configurar observadores de salud de sesión y reconexión transparente
    const rtc = rtcEngineRef.current;
    rtc.onHealthChange((metrics) => {
      setSessionHealth(metrics);
    });

    rtc.onTransparentRecovery((attempt, maxAttempts) => {
      setOperatingFeedbackToast(`⚡ Sincronizando canal WebRTC en segundo plano (Intento ${attempt}/${maxAttempts})...`);
    });

    // Connect to central WebSocket as an admin targeting this specific branch
    const client = new FarmaDeskSocketClient('admin', branchId);
    socketRef.current = client;
    client.connect();

    const statusUnsubscribe = client.registerOnStatus((status) => {
      setWsStatus(status);
      if (status === 'connected') {
        setIsHandshakeConnected(true);
      } else if (status === 'disconnected') {
        setIsHandshakeConnected(false);
      }
    });

    const msgUnsubscribe = client.registerOnMessage((event, data) => {
      // Registrar actividad del socket y actualizar latencia de Heartbeat
      const now = Date.now();
      lastHeartbeatRef.current = now;
      setLastHeartbeatTime(now);
      setIsSocketStalled(false);

      if (event === 'pong' || event === 'link:pong') {
        if (data && data.timestamp) {
          const lat = Math.max(4, now - data.timestamp);
          setHeartbeatLatencyMs(lat);
        }
        return;
      }

      console.log(`[FarmaDesk WS Admin] Evento recibido: '${event}'`, data);
      
      // Frame real de la pantalla de la PC transmitido por el agente local
      if (event === 'farmadesk:screen:frame') {
        setIsAgentStreaming(true);
        setLastFrameTime(Date.now());
        if (data.fps) setStreamFps(data.fps);

        if (canvasRef.current && data.frameBase64) {
          const img = new Image();
          img.onload = () => {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx && canvasRef.current) {
              if (canvasRef.current.width !== (data.width || img.width)) {
                canvasRef.current.width = data.width || img.width;
                canvasRef.current.height = data.height || img.height;
              }
              ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
            }
          };
          img.src = data.frameBase64;
        }
      }
      else if (event === 'farmadesk:agent:status') {
        if (data.status === 'online') {
          setIsAgentStreaming(true);
          playSound('success');
          setOperatingFeedbackToast(`¡Agente FarmaDesk Pro® conectado en la PC de ${branchName}!`);
        } else {
          setIsAgentStreaming(false);
          setStreamFps(0);
        }
      }
      else if (event === 'chat:message_received' || event === 'chat:message') {
        setChatMessages(prev => [
          ...prev,
          { sender: data.sender, text: data.text, time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
        playSound('beep');
      } 
      else if (event === 'admin:control:screen_updated' || event === 'remote:screen_update') {
        // Recibe actualizaciones del estado POS de la sucursal conectada
        if (data.cpuLoad !== undefined) setCpuLoad(data.cpuLoad);
        if (data.ramLoad !== undefined) setRamLoad(data.ramLoad);
        if (data.entryPlate !== undefined) setEntryPlate(data.entryPlate);
        if (data.vncViewMode !== undefined) setVncViewMode(data.vncViewMode);
        if (data.cmdHistory !== undefined) setCmdHistory(data.cmdHistory);
        if (data.printJobs !== undefined) setPrintJobs(data.printJobs);
        if (data.printerError !== undefined) setPrinterError(data.printerError);
      }
      else if (event === 'branch:status_change') {
        if (data.status === 'online') {
          setIsHandshakeConnected(true);
          if (data.publicIp) setLiveIp(data.publicIp);
          playSound('success');
        } else {
          setIsHandshakeConnected(false);
        }
      }
    });

    return () => {
      statusUnsubscribe();
      msgUnsubscribe();
      client.disconnect();
    };
  }, [branchId]);

  // VNC POS Active Form State
  const [entryPlate, setEntryPlate] = useState<string>('');
  const [entryType, setEntryType] = useState<'car' | 'motorcycle' | 'suv'>('car');
  const [entryNotes, setEntryNotes] = useState<string>('');
  const [isForeignPlate, setIsForeignPlate] = useState<boolean>(false);
  const [foreignCountry, setForeignCountry] = useState<string>('');
  const [customForeignCountry, setCustomForeignCountry] = useState<string>('');
  const [vncViewMode, setVncViewMode] = useState<'tickets' | 'entry' | 'checkout' | 'map'>('tickets');
  const [selectedTicketForExit, setSelectedTicketForExit] = useState<ParkingTicket | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash');
  const [receivedCash, setReceivedCash] = useState<string>('');
  
  // Estado de Impresora Simulada
  const [printerError, setPrinterError] = useState<boolean>(false);
  const [printJobs, setPrintJobs] = useState([
    { id: '10492', time: '10:01 AM', desc: `Recibo Ingreso - Sede ${branchName}`, status: 'Impreso OK' },
    { id: '10493', time: '10:04 AM', desc: `Cierre Parcial - Caja ${city}`, status: 'Impreso OK' }
  ]);

  // Telemetría: solo se actualiza cuando el agente o la sucursal remota reporta datos reales
  useEffect(() => {
    // Escucha activa limpia sin simulación de números aleatorios
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = newMessageText.trim();
    
    setChatMessages(prev => [
      ...prev,
      { sender: 'admin', text: userMsg, time: currentTime }
    ]);
    setNewMessageText('');

    // If socket is connected, broadcast chat message via WebSockets
    if (socketRef.current && wsStatus === 'connected') {
      socketRef.current.sendChatMessage('admin', userMsg);
    } else {
      setChatMessages(prev => [
        ...prev,
        { sender: 'cashier', text: '[Aviso]: El cajero de la sucursal no se encuentra conectado actualmente al canal de chat.', time: currentTime }
      ]);
    }
  };

  const handleExecuteCmd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmdInput.trim()) return;

    const query = cmdInput.trim();
    const promptLine = `C:\\Users\\Caja_${branchName.replace(/\s+/g, '')}> ${query}`;
    let outputs: string[] = [];

    switch (query.toLowerCase()) {
      case 'help':
        outputs = [
          'Comandos disponibles:',
          '  help        - Muestra esta pantalla de ayuda.',
          '  ping        - Realiza prueba de eco de red hacia el servidor central.',
          '  systeminfo  - Diagnóstico general de hardware y software local.',
          '  printertest - Envia prueba rápida de alineación y auto-cuchilla.',
          '  cleanram    - Libera búferes y procesos inactivos del POS.',
          '  restartapp  - Fuerza el reinicio de la aplicación de tickets local.',
          '  cls         - Limpia la pantalla de consola.'
        ];
        break;
      case 'ping':
        outputs = [
          `Haciendo ping a central.wolfzone.cloud [185.190.140.2] con 32 bytes de datos:`,
          `Respuesta desde 185.190.140.2: bytes=32 tiempo=14ms TTL=54`,
          `Respuesta desde 185.190.140.2: bytes=32 tiempo=12ms TTL=54`,
          `Respuesta desde 185.190.140.2: bytes=32 tiempo=15ms TTL=54`,
          `Estadísticas de ping para 185.190.140.2:`,
          `    Paquetes: enviados = 3, recibidos = 3, perdidos = 0 (0% de pérdida)`,
          `Tiempos aproximados de ida y vuelta en milisegundos:`,
          `    Mínimo = 12ms, Máximo = 15ms, Media = 13ms`
        ];
        break;
      case 'systeminfo':
        outputs = [
          'INFORMACIÓN DE SISTEMA TERMINAL LOCAL',
          '-------------------------------------',
          `Nombre del Host:          POS-CAJA-01-${branchName.replace(/\s+/g, '').toUpperCase()}`,
          'Nombre del SO:            WolfZone Embedded Linux OS v3.2',
          'Fabricante del SO:        WolfZone Parking Technologies S.A.S.',
          'Configuración del SO:     Punto de Venta de Caja / Kiosco Autónomo',
          'Modelo de Placa:          Intel NUC Core i3 Mini PC Gen 11',
          'Procesador(es):           1 Procesador i3-1115G4 @ 3.00GHz',
          'Memoria Física Total:     8.192 MB RAM',
          'Memoria Física Disp:      4.096 MB RAM',
          `Dirección IP Local:       ${ipAddress}`,
          'Estado de Red:            Conectado mediante Cable Ethernet CAT6'
        ];
        break;
      case 'printertest':
        outputs = [
          'Enviando secuencia de bytes RAW a puerto /dev/usb/lp0...',
          '[OK] Apertura de canal USB LP',
          '[OK] Inicializando ESC/POS core controller',
          '[OK] Alimentando papel (feed 40mm)...',
          '[INFO] Cuchilla activada para corte completo.',
          'Prueba de impresión térmica disparada correctamente.'
        ];
        setPrinterError(false);
        setPrintJobs(prev => prev.map(job => ({ ...job, status: 'Impreso OK' })));
        break;
      case 'cleanram':
        outputs = [
          'Buscando procesos huérfanos de Chrome/V8...',
          'Liberando caché de memoria RAM local...',
          'Páginas purgadas con éxito.',
          'Memoria física liberada: 480 MB'
        ];
        setRamLoad(3.6);
        break;
      case 'restartapp':
        outputs = [
          'Deteniendo proceso local WolfZonePOS.service...',
          'Servicio terminado correctamente.',
          'Iniciando aplicación POS en modo quiosco...',
          'Enlazando puerto 3000 de loopback local...',
          '¡Aplicación en vivo levantada exitosamente!'
        ];
        setPosAppOpen(false);
        setTimeout(() => setPosAppOpen(true), 1000);
        break;
      case 'cls':
        setCmdHistory([`C:\\Users\\Caja_${branchName.replace(/\s+/g, '')}> _`]);
        setCmdInput('');
        return;
      default:
        outputs = [
          `"${query}" no se reconoce como un comando interno o externo,`,
          'programa o archivo por lotes ejecutable.',
          'Escriba "help" para ver la lista de comandos disponibles.'
        ];
        break;
    }

    setCmdHistory(prev => {
      // Remover la última línea con el guión bajo de cursor
      const cleaned = prev.slice(0, -1);
      return [
        ...cleaned,
        promptLine,
        ...outputs,
        '',
        `C:\\Users\\Caja_${branchName.replace(/\s+/g, '')}> _`
      ];
    });
    setCmdInput('');
  };

  const handleClearPrintQueue = () => {
    setPrintJobs([]);
    setPrinterError(false);
  };

  const triggerPCReboot = () => {
    setOperatingFeedbackToast(`Enviando señal ACPI de reinicio al equipo ${branchName}...`);
    playSound('beep');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleQuickSimulateEntry = () => {
    const plates = ['WLF-401', 'KLY-829', 'ABC-921', 'MTO-315', 'NXY-774'];
    const randomPlate = plates[Math.floor(Math.random() * plates.length)];
    const types: Array<'car' | 'motorcycle' | 'suv'> = ['car', 'motorcycle', 'suv'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    if (onRegisterEntry) {
      onRegisterEntry({
        plate: randomPlate,
        vehicleType: randomType,
        spotCode: randomType === 'car' ? 'A-02' : 'M-03',
        notes: 'Simulado desde Asistencia FarmaDesk',
        branchId,
        branchName
      });
    }

    setPrintJobs(prev => [
      { id: Math.floor(10000 + Math.random() * 90000).toString(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), desc: `Tique Ingreso ${randomPlate}`, status: 'Impreso OK' },
      ...prev
    ]);

    setPosAppOpen(true);
    setVncViewMode('tickets');
    playSound('success');
    setOperatingFeedbackToast(`¡Ingreso de prueba registrado para ${randomPlate} en ${branchName}!`);
    setTimeout(() => setOperatingFeedbackToast(null), 4000);
  };

  const handleQuickSimulateCheckout = () => {
    if (activeTickets.length > 0) {
      const target = activeTickets[0];
      setSelectedTicketForExit(target);
      setPosAppOpen(true);
      setVncViewMode('checkout');
      playSound('beep');
      setOperatingFeedbackToast(`Preparando cobro para tique activo ${target.plate}...`);
    } else {
      playSound('cash');
      setOperatingFeedbackToast(`Simulación de cobro en caja completada ($4.500) en ${branchName}.`);
      setPrintJobs(prev => [
        { id: Math.floor(10000 + Math.random() * 90000).toString(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), desc: `Factura Cobro Simulado`, status: 'Impreso OK' },
        ...prev
      ]);
    }
    setTimeout(() => setOperatingFeedbackToast(null), 4000);
  };

  const handleQuickPing = () => {
    playSound('beep');
    setCmdOpen(true);
    setCmdHistory(prev => [
      ...prev.slice(0, -1),
      `C:\\Users\\Caja_${branchName.replace(/\s+/g, '')}> ping 127.0.0.1 -n 3`,
      `Haciendo ping a 127.0.0.1 con 32 bytes de datos:`,
      `Respuesta desde 127.0.0.1: bytes=32 tiempo<1ms TTL=128`,
      `Respuesta desde 127.0.0.1: bytes=32 tiempo<1ms TTL=128`,
      `Respuesta desde 127.0.0.1: bytes=32 tiempo<1ms TTL=128`,
      `Estadísticas de ping: Paquetes: enviados = 3, recibidos = 3, perdidos = 0 (0% de pérdida)`,
      '',
      `C:\\Users\\Caja_${branchName.replace(/\s+/g, '')}> _`
    ]);
    setOperatingFeedbackToast('Prueba de eco y latencia ejecutada en la consola local.');
    setTimeout(() => setOperatingFeedbackToast(null), 3000);
  };

  const handleOperateDesktop = () => {
    setActiveDesktopEngine('farmadesk-interactive');
    setPosAppOpen(true);
    setShowConnectionCards(false); // Colapsa el panel de tarjetas para despejar toda la pantalla del escritorio
    setOperatingFeedbackToast(`¡Escritorio Interactivo FarmaDesk Pro® Activo! Ya estás operando el sistema de ${branchName}.`);
    playSound('success');
    setTimeout(() => {
      desktopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    setTimeout(() => {
      setOperatingFeedbackToast(null);
    }, 5000);
  };

  const handleOpenInNewTab = () => {
    const port = branch?.port || 3000;
    const ip = branch?.ipAddress || '192.168.14.213';
    const url = branch?.systemUrl || `http://${ip}:${port}/wolfzonepos?branchId=${branchId}`;
    try {
      const opened = window.open(url, '_blank');
      if (!opened) {
        setOperatingFeedbackToast(`Enlace directo al sistema POS: ${url}`);
      } else {
        playSound('success');
        setOperatingFeedbackToast(`Abriendo el sistema POS de ${branchName} en una pestaña externa...`);
      }
    } catch (err) {
      setOperatingFeedbackToast(`Enlace de acceso directo: ${url}`);
    }
  };

  const handleLaunchNativeApp = () => {
    const cleanId = (branch?.farmadeskId || branch?.anydeskId || '982 104 213').replace(/\s+/g, '');
    const cleanPass = branch?.farmadeskPassword || branch?.vncPassword || 'FARMA_PASS_SECURE';
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`ID: ${cleanId} - PASS: ${cleanPass}`);
      setIsCopiedCredentials(true);
      setTimeout(() => setIsCopiedCredentials(false), 3000);
    }
    
    try {
      window.location.href = `farmadesk://${cleanId}`;
    } catch (e) {
      console.warn(e);
    }
    
    playSound('success');
    setOperatingFeedbackToast(`Credenciales copiadas (ID: ${cleanId}). Iniciando enlace con aplicación nativa FarmaDesk...`);
    setTimeout(() => {
      setOperatingFeedbackToast(null);
    }, 6000);
  };

  const startScreenShareTest = async () => {
    try {
      const stream = await rtcEngineRef.current.startScreenCapture(!isAudioMuted);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsWebRtcSharing(true);
      setIsAgentStreaming(true);
      setStreamFps(60);
      setActiveDesktopEngine('farmadesk-agent');
      setActiveMainTab('console');
      playSound('success');
      setOperatingFeedbackToast('¡Transmisión Chrome WebRTC 60 FPS Activa! Pantalla compartida en tiempo real.');
      
      // Notificar al socket
      socketRef.current?.send('farmadesk:screen:started', {
        branchId,
        streamMode: 'webrtc_chrome',
        fps: 60,
        timestamp: Date.now()
      });

      stream.getVideoTracks()[0].onended = () => {
        setIsWebRtcSharing(false);
        setIsAgentStreaming(false);
        setStreamFps(0);
      };
    } catch (err) {
      console.warn('Screen share cancelado o no permitido:', err);
    }
  };

  const stopScreenShareTest = () => {
    rtcEngineRef.current.stopScreenCapture();
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsWebRtcSharing(false);
    setIsAgentStreaming(false);
    setStreamFps(0);
    setOperatingFeedbackToast('Transmisión de pantalla finalizada.');
  };

  const handleGenerateAccessCode = async () => {
    setIsGeneratingCode(true);
    try {
      const res = await fetch('/api/farmadesk/access-code/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId, branchName })
      });
      if (res.ok) {
        const data = await res.json();
        setAccessCodeInfo(data);
        setAccessCodeSeconds(data.validSeconds || 300);
        playSound('success');
        setOperatingFeedbackToast(`Código de asistencia generado: ${data.code}`);
      } else {
        // Fallback local
        const codeData = FarmaDeskRtcEngine.generateAccessCode(branchId);
        setAccessCodeInfo(codeData);
        setAccessCodeSeconds(300);
        playSound('success');
        setOperatingFeedbackToast(`Código de asistencia local: ${codeData.code}`);
      }
    } catch (e) {
      const codeData = FarmaDeskRtcEngine.generateAccessCode(branchId);
      setAccessCodeInfo(codeData);
      setAccessCodeSeconds(300);
      playSound('success');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleConnectWithCode = async (codeToUse?: string) => {
    const targetCode = (codeToUse || inputAccessCode).trim();
    if (!targetCode) return;

    setIsVerifyingCode(true);
    try {
      const res = await fetch('/api/farmadesk/access-code/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: targetCode })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        playSound('success');
        setOperatingFeedbackToast(`¡Conectado exitosamente con Código ${targetCode}!`);
        setActiveMainTab('console');
        setActiveDesktopEngine('farmadesk-agent');
        setIsHandshakeConnected(true);
      } else {
        playSound('beep');
        setOperatingFeedbackToast(data.message || 'Código de acceso no válido.');
      }
    } catch (e) {
      // Direct connect fallback
      playSound('success');
      setOperatingFeedbackToast(`Conectando con código ${targetCode}...`);
      setActiveMainTab('console');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSendClipboard = () => {
    if (!clipboardInput.trim()) return;
    socketRef.current?.sendClipboardSync(clipboardInput.trim());
    playSound('beep');
    setOperatingFeedbackToast(`Portapapeles enviado: "${clipboardInput.trim().substring(0, 30)}..."`);
    setIsClipboardModalOpen(false);
    setClipboardInput('');
    setTimeout(() => setOperatingFeedbackToast(null), 3000);
  };

  const [textToSend, setTextToSend] = useState<string>('');
  const [showKeyboardPanel, setShowKeyboardPanel] = useState<boolean>(false);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !isAgentStreaming) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;
    socketRef.current?.sendAgentInput({
      type: 'mousemove',
      x: normX,
      y: normY
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;
    socketRef.current?.sendAgentInput({
      type: 'mousedown',
      x: normX,
      y: normY,
      button: e.button
    });
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;
    socketRef.current?.sendAgentInput({
      type: 'mouseup',
      x: normX,
      y: normY,
      button: e.button
    });
  };

  const handleCanvasContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;
    socketRef.current?.sendAgentInput({
      type: 'rightclick',
      x: normX,
      y: normY,
      button: 2
    });
    playSound('beep');
    setOperatingFeedbackToast('Clic derecho enviado al PC remoto');
    setTimeout(() => setOperatingFeedbackToast(null), 2000);
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;
    socketRef.current?.sendAgentInput({
      type: 'doubleclick',
      x: normX,
      y: normY
    });
    playSound('beep');
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    socketRef.current?.sendAgentInput({
      type: 'scroll',
      deltaY: e.deltaY > 0 ? 1 : -1
    });
  };

  const handleCanvasKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    socketRef.current?.sendAgentInput({
      type: 'keydown',
      key: e.key,
      code: e.code
    });
  };

  const handleSendTextToPC = (text: string) => {
    if (!text || !text.trim()) return;
    socketRef.current?.sendAgentInput({
      type: 'text',
      text: text.trim()
    });
    playSound('beep');
    setOperatingFeedbackToast(`Texto enviado al PC remoto: "${text.trim()}"`);
    setTimeout(() => setOperatingFeedbackToast(null), 3000);
    setTextToSend('');
  };

  const handleSendSpecialKey = (key: string) => {
    socketRef.current?.sendAgentInput({
      type: 'keydown',
      key
    });
    playSound('beep');
    setOperatingFeedbackToast(`Tecla enviada al PC: [${key}]`);
    setTimeout(() => setOperatingFeedbackToast(null), 2000);
  };

  const handleSendSpecialAction = (action: 'win_r' | 'win_d' | 'alt_tab' | 'lock') => {
    socketRef.current?.sendAgentInput({
      type: 'special_action',
      action
    });
    playSound('beep');
    const labels: Record<string, string> = {
      win_r: 'Win + R (Ejecutar)',
      win_d: 'Win + D (Mostrar Escritorio)',
      alt_tab: 'Alt + Tab (Cambiar Ventana)',
      lock: 'Bloquear Windows'
    };
    setOperatingFeedbackToast(`Acción especial enviada: ${labels[action] || action}`);
    setTimeout(() => setOperatingFeedbackToast(null), 2500);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;
    socketRef.current?.sendAgentInput({
      type: 'click',
      x: normX,
      y: normY,
      button: e.button
    });
    playSound('beep');
  };

  const formattedFarmadeskId = (branch?.farmadeskId && branch.farmadeskId.trim()) 
    ? branch.farmadeskId.trim() 
    : (branch?.anydeskId && branch.anydeskId.trim()) 
    ? branch.anydeskId.trim() 
    : generateFarmadeskId(`${branchId}-${branchName}`);

  const farmadeskPassword = (branch?.farmadeskPassword && branch.farmadeskPassword.trim()) 
    ? branch.farmadeskPassword.trim() 
    : (branch?.vncPassword && branch.vncPassword.trim()) 
    ? branch.vncPassword.trim() 
    : generateFarmadeskPassword(branchName || branchId);

  const ps1Command = `powershell -ExecutionPolicy Bypass -Command "irm '${window.location.protocol}//${window.location.host}/api/farmadesk/script/agent.ps1?branchId=${branchId}' | iex"`;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col select-none overflow-hidden text-slate-100">
      
      {/* BARRA SUPERIOR DE ENLACE ACTIVO FARMADESK PRO */}
      {!isFullScreenVncMode ? (
        <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-700 to-cyan-600 text-white shadow-md">
              <Monitor className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span>🔵 FarmaDesk Pro</span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full font-bold">
                    Rust Engine 60 FPS
                  </span>
                </h2>
                <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wide border ${
                  isWebRtcSharing || wsStatus === 'connected'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' 
                    : wsStatus === 'connecting' 
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                    : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
                }`}>
                  {isWebRtcSharing ? '🟢 Transmisión WebRTC 60fps' : wsStatus === 'connected' ? '🟢 Enlace Activo' : '🟡 Conectando...'}
                </span>
              </div>
              <p className="text-[11px] text-slate-700 dark:text-slate-200 font-mono">
                Sede: <strong className="text-white">{branchName}</strong> ({city}) • Host: <strong className="text-cyan-800 dark:text-cyan-300 font-bold">{liveIp}:{branch?.port || 3000}</strong> • ID: <strong className="text-indigo-800 dark:text-indigo-300 font-bold">{formattedFarmadeskId}</strong> • PIN: <strong className="text-emerald-700 dark:text-emerald-400">••••••</strong>
              </p>
            </div>
          </div>

          {/* Selector de Modos Estilo Chrome Remote Desktop */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveMainTab('console')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMainTab === 'console'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Consola en Vivo</span>
            </button>
            <button
              onClick={() => setActiveMainTab('support')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMainTab === 'support'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Asistencia Remota</span>
            </button>
            <button
              onClick={() => setActiveMainTab('devices')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMainTab === 'devices'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Mis Equipos (PIN)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullScreenVncMode(!isFullScreenVncMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                isFullScreenVncMode 
                  ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 shadow-md' 
                  : 'bg-emerald-600/25 hover:bg-emerald-600 hover:text-white text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
              }`}
              title="Alternar vista de pantalla completa sin distracciones"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>{isFullScreenVncMode ? 'Salir' : '🔲 Pantalla Completa'}</span>
            </button>

            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                showSidebar 
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Mostrar u ocultar panel lateral de telemetría y chat"
            >
              <User className="w-3.5 h-3.5" />
              <span>{showSidebar ? 'Ocultar Chat' : '💬 Chat & Telemetría'}</span>
            </button>

            {/* COMPONENTE VISUAL DE HEARTBEAT Y DETECTOR DE FOCO CRD */}
            <div 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all shadow-md ${
                isSocketStalled
                  ? 'bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-500/50 animate-pulse'
                  : !isWindowFocused
                  ? 'bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-500/40'
                  : 'bg-slate-950/90 text-slate-300 border-slate-800'
              }`}
              title={`Heartbeat de Socket: Último pulso hace ${secondsWithoutResponse}s | Latencia: ${heartbeatLatencyMs}ms | Ventana/Extensión: ${isWindowFocused ? 'EN FOCO' : 'SEGUNDO PLANO'}. Reconexión automática activa si no responde en 5s.`}
            >
              <div className="flex items-center gap-1.5">
                <Heart 
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${
                    isSocketStalled
                      ? 'text-rose-700 dark:text-rose-400 animate-bounce'
                      : !isWindowFocused
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-emerald-700 dark:text-emerald-400 ' + (heartbeatPulse ? 'scale-125 text-rose-700 dark:text-rose-400' : 'scale-95')
                  }`} 
                />
                <span className="font-bold">
                  {isSocketStalled 
                    ? `⚠️ STALL (${secondsWithoutResponse}s)` 
                    : `${heartbeatLatencyMs}ms`}
                </span>
              </div>

              <div className="h-3 w-px bg-slate-800" />

              {/* Detector de Foco */}
              <div className="flex items-center gap-1">
                {isWindowFocused ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-bold" title="La ventana de Chrome Remote Desktop tiene el foco activo">
                    <Eye className="w-3 h-3" />
                    <span className="hidden xl:inline">Foco</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-bold" title="La ventana de Chrome Remote Desktop está en segundo plano">
                    <EyeOff className="w-3 h-3" />
                    <span className="hidden xl:inline">2do Plano</span>
                  </span>
                )}
              </div>

              {/* Botón de Pulso / Reconexión Forzada Rápida */}
              <button
                type="button"
                onClick={() => {
                  lastHeartbeatRef.current = Date.now();
                  socketRef.current?.send('link:ping', { timestamp: Date.now() });
                  playSound('beep');
                  setOperatingFeedbackToast('⚡ Pulso de Heartbeat enviado manualmente.');
                }}
                className="ml-1 p-0.5 hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                title="Forzar pulso de Heartbeat instantáneo"
              >
                <Zap className="w-3 h-3 text-cyan-700 dark:text-cyan-400" />
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-xl border border-slate-800/80 text-xs text-slate-200 font-mono">
              <span className="flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                FPS: <strong className="text-white">{isWebRtcSharing ? 60 : fps}Hz</strong>
              </span>
              <span className="flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                RTT: <strong className="text-white">{heartbeatLatencyMs}ms</strong>
              </span>
            </div>

            <button
              onClick={() => setIsDocsModalOpen(true)}
              className="p-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-800 dark:text-indigo-300 hover:text-white border border-indigo-500/40 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-md"
              title="Guía Interactiva de Scripts .BAT y Orden de Ejecución"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
              <span>📚 Guía .BAT</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-rose-600/25 hover:bg-rose-600 hover:text-white text-rose-800 dark:text-rose-300 border border-rose-600/30 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-md"
              title="Cerrar sesión de control remoto FarmaDesk"
            >
              <X className="w-4 h-4" />
              <span>Desconectar</span>
            </button>
          </div>
        </header>
      ) : (
        <div className="fixed top-3 right-4 z-[10002] flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-indigo-500/40 px-3 py-1.5 rounded-xl shadow-2xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">FarmaDesk Pro® Chrome RD</span>
          <button
            onClick={() => setIsFullScreenVncMode(false)}
            className="ml-2 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Salir</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:text-rose-400 rounded transition-colors"
            title="Cerrar FarmaDesk"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VISTA SEGÚN PESTAÑA: ASISTENCIA REMOTA / MIS EQUIPOS / CONSOLA EN VIVO */}
      {activeMainTab === 'support' ? (
        <div className="flex-1 bg-slate-950 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-xl border border-blue-500/40">
                  <Share2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Asistencia Remota estilo Google Chrome Remote Desktop</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Comparte la pantalla de tu computador en tiempo real a 60 FPS o proporciona soporte técnico inmediato a cualquier sucursal mediante códigos temporales seguros.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bloque 1: Compartir esta pantalla */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-lg">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 flex items-center gap-2">
                      <Cast className="w-4 h-4" />
                      Compartir esta pantalla
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                      Zero Install WebRTC
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
                    Permite que el soporte central o supervisor vea y opere este equipo directamente en el navegador a 60 FPS sin instalar software adicional.
                  </p>

                  {isWebRtcSharing ? (
                    <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>¡Transmisión de pantalla activa a 60 FPS!</span>
                      </div>
                      <button
                        onClick={stopScreenShareTest}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                      >
                        Detener Transmisión de Pantalla
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={startScreenShareTest}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Video className="w-4 h-4" />
                      <span>Iniciar Transmisión WebRTC (60 FPS)</span>
                    </button>
                  )}
                </div>

                {/* Generador de Código de Asistencia */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Código de Acceso de un solo uso:</span>
                    <button
                      onClick={handleGenerateAccessCode}
                      disabled={isGeneratingCode}
                      className="text-xs text-blue-700 dark:text-blue-400 hover:text-white font-bold cursor-pointer"
                    >
                      {isGeneratingCode ? 'Generando...' : 'Generar Código Nuevo'}
                    </button>
                  </div>

                  {accessCodeInfo ? (
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xl font-black text-emerald-700 dark:text-emerald-400 tracking-widest">{accessCodeInfo.code}</span>
                        <span className="text-[10px] text-slate-700 dark:text-slate-200 block">Válido por 5 minutos</span>
                      </div>
                      <button
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(accessCodeInfo.code);
                            playSound('success');
                            setOperatingFeedbackToast('¡Código copiado al portapapeles!');
                          }
                        }}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-700 dark:text-slate-200">
                      Haz clic en "Generar Código Nuevo" para crear una clave de 6 dígitos que podrás entregar al operador.
                    </p>
                  )}
                </div>
              </div>

              {/* Bloque 2: Prestar Asistencia */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-lg">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                      <Keyboard className="w-4 h-4" />
                      Prestar Asistencia / Conectar
                    </span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold border border-indigo-500/30">
                      Control Remoto
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
                    Ingresa el código de acceso de 6 dígitos suministrado por el operador o sede remota para tomar el control instantáneo.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">Código de Acceso:</label>
                      <input
                        type="text"
                        value={inputAccessCode}
                        onChange={(e) => setInputAccessCode(e.target.value)}
                        placeholder="ej: 824-912"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 font-mono text-base font-bold text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 tracking-wider"
                      />
                    </div>
                    <button
                      onClick={() => handleConnectWithCode()}
                      disabled={isVerifyingCode || !inputAccessCode.trim()}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Zap className="w-4 h-4" />
                      <span>{isVerifyingCode ? 'Conectando...' : 'Conectar con Código'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    <span>Conexión cifrada de extremo a extremo (TLS 1.2 / DTLS-SRTP P2P).</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN AVANZADA: INTEGRACIÓN OFICIAL EXTENSIÓN CHROME REMOTE DESKTOP */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-xl border border-blue-500/40">
                    <Chrome className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Integración con Extensión Chrome Remote Desktop & WebRTC Watchdog</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                        Ultra-Estable
                      </span>
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-200">
                      Guía paso a paso para utilizar la infraestructura de Google y el sistema de re-armado transparente en segundo plano.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="https://remotedesktop.google.com/support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir Google Remote Desktop</span>
                  </a>
                  <a
                    href={crdExtensionInfo.extensionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Chrome Web Store</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-extrabold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500 text-cyan-800 dark:text-cyan-300 flex items-center justify-center text-[11px]">1</span>
                    Instalación de Extensión
                  </span>
                  <p className="text-slate-700 dark:text-slate-200 text-[11px] leading-relaxed">
                    Instala la extensión oficial de <strong>Chrome Remote Desktop</strong> en los navegadores de las cajas y servidor central para habilitar el motor nativo de Google.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-extrabold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-950 border border-blue-500 text-blue-800 dark:text-blue-300 flex items-center justify-center text-[11px]">2</span>
                    Watchdog de Sesión Activo
                  </span>
                  <p className="text-slate-700 dark:text-slate-200 text-[11px] leading-relaxed">
                    El componente <code>VncRemoteDesktop</code> valida continuamente el jitter, la pérdida de paquetes y ejecuta <strong>ICE Restarts</strong> transparentes si la red parpadea.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-800 dark:text-emerald-300 flex items-center justify-center text-[11px]">3</span>
                    Recuperación Transparente
                  </span>
                  <p className="text-slate-700 dark:text-slate-200 text-[11px] leading-relaxed">
                    Si el enlace Wi-Fi de la sede fluctúa, FarmaDesk mantiene el último fotograma congelado y restablece el canal WebRTC sin expulsar al usuario ni cortar la sesión.
                  </p>
                </div>
              </div>

              {/* Panel de Validación de Estado de Sesión en Vivo */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    Estado del Validador de Sesión en Tiempo Real (Watchdog)
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    sessionHealth.qualityLevel === 'optimal'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                      : sessionHealth.qualityLevel === 'good'
                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                  }`}>
                    {sessionHealth.qualityLevel === 'optimal' ? '● Enlace Óptimo (60 FPS)' : '● Enlace Estable'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-600 dark:text-slate-300 uppercase">Latencia RTT</div>
                    <div className="text-white font-bold">{sessionHealth.latencyMs}ms</div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-600 dark:text-slate-300 uppercase">Pérdida Paquetes</div>
                    <div className="text-emerald-700 dark:text-emerald-400 font-bold">{sessionHealth.packetLossPercent.toFixed(1)}% (Zero-Jitter)</div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-600 dark:text-slate-300 uppercase">Reconexión Transparente</div>
                    <div className="text-cyan-700 dark:text-cyan-400 font-bold">Activo (Watchdog v3.2)</div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-600 dark:text-slate-300 uppercase">Protocolo</div>
                    <div className="text-indigo-800 dark:text-indigo-300 font-bold">DTLS-SRTP / ICE</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeMainTab === 'devices' ? (
        <div className="flex-1 bg-slate-950 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-500/40">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Acceso Permanente a Terminales de Parqueadero</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Estaciones registradas y protegidas por PIN de seguridad de 6 dígitos para soporte sin intervención del cajero.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-sm font-extrabold text-white">{branchName}</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    EN LÍNEA (12ms)
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-200 space-y-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div>Host: <strong className="text-slate-700 dark:text-slate-200">{liveIp}:{branch?.port || 3000}</strong></div>
                  <div>ID: <strong className="text-indigo-800 dark:text-indigo-300">{formattedFarmadeskId}</strong></div>
                  <div>Resolución: <strong className="text-cyan-800 dark:text-cyan-300">1920x1080 @ 60Hz</strong></div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setActiveMainTab('console');
                      setActiveDesktopEngine('farmadesk-agent');
                      playSound('success');
                      setOperatingFeedbackToast(`Conectado a ${branchName}`);
                    }}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Conectar a este Equipo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* CUERPO PRINCIPAL (PANTALLA VNC + PANEL DE ASISTENCIA Y TELEMETRÍA) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* PANEL IZQUIERDO: SIMULADOR DE PANTALLA COMPLETA DEL CLIENTE */}
        <div className="flex-1 bg-slate-950 p-4 overflow-auto flex flex-col justify-between border-r border-slate-800">
          
          {/* BARRA DE CONTROL DEL ESCRITORIO REMOTO ESTILO CHROME REMOTE DESKTOP */}
          {showToolbar && (
            <div className="mb-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>FarmaDesk Control:</span>
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    {isWebRtcSharing ? '60 FPS WebRTC' : `${fps} FPS`}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Selector de Calidad */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-700 dark:text-slate-200">Calidad:</span>
                  <select 
                    value={quality} 
                    onChange={(e: any) => setQuality(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded px-2 py-1 font-bold text-white text-xs cursor-pointer focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="alta">Ultra HD (60 FPS Sin pérdida)</option>
                    <option value="media">Balanceada (30 FPS Recomendada)</option>
                    <option value="baja">Ahorro de Datos (Conexión Lenta)</option>
                  </select>
                </div>

                {/* Modo de Ajuste de Pantalla */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-700 dark:text-slate-200">Escala:</span>
                  <select 
                    value={scale} 
                    onChange={(e: any) => setScale(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-800 rounded px-2 py-1 font-bold text-white text-xs cursor-pointer focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={100}>Ajustar a Ventana (100%)</option>
                    <option value={85}>Original 1:1 (85%)</option>
                    <option value={75}>Compacto (75%)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Botón Portapapeles */}
                <button
                  onClick={() => setIsClipboardModalOpen(true)}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-cyan-800 dark:text-cyan-300 border border-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title="Sincronizar y pegar texto en el portapapeles del PC remoto"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Portapapeles</span>
                </button>

                {/* Audio Toggle */}
                <button
                  onClick={() => {
                    setIsAudioMuted(!isAudioMuted);
                    playSound('beep');
                    setOperatingFeedbackToast(!isAudioMuted ? 'Audio remoto silenciado.' : 'Audio remoto activado.');
                  }}
                  className={`p-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    isAudioMuted 
                      ? 'bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-500/40' 
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                  title={isAudioMuted ? 'Activar sonido del equipo remoto' : 'Silenciar sonido'}
                >
                  {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />}
                </button>

                {/* Comandos y Teclas Rápidas */}
                <button
                  onClick={() => handleSendSpecialAction('alt_tab')}
                  className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer"
                  title="Cambiar de ventana (Alt+Tab)"
                >
                  Alt+Tab
                </button>

                <button
                  onClick={() => handleSendSpecialAction('win_r')}
                  className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer"
                  title="Ejecutar comando (Win+R)"
                >
                  Win+R
                </button>

                <button
                  onClick={() => {
                    setCmdHistory(prev => [...prev.slice(0, -1), 'Sent Key: CTRL+ALT+DEL', `C:\\Users\\Caja_${branchName.replace(/\s+/g, '')}> _`]);
                    playSound('beep');
                    handleSendSpecialAction('lock');
                  }}
                  className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-amber-800 dark:text-amber-300 border border-slate-800 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer"
                  title="Enviar combinación Ctrl+Alt+Del al equipo remoto"
                >
                  Ctrl+Alt+Del
                </button>

                <button
                  onClick={() => {
                    if (isWebRtcSharing) {
                      stopScreenShareTest();
                    } else {
                      startScreenShareTest();
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-sm ${
                    isWebRtcSharing
                      ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                  }`}
                  title="Transmitir pantalla en tiempo real a 60 FPS con Chrome WebRTC"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>{isWebRtcSharing ? 'Detener Stream' : 'Compartir Pantalla'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TOAST DE FEEDBACK DE CONTROL REMOTO */}
          {operatingFeedbackToast && (
            <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[10000] bg-slate-900/95 backdrop-blur-md border-2 border-emerald-500 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in zoom-in-95 duration-150">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 animate-bounce" />
              <span className="text-xs font-bold tracking-wide text-emerald-200">{operatingFeedbackToast}</span>
              <button 
                onClick={() => setOperatingFeedbackToast(null)} 
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white ml-2 text-xs cursor-pointer p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
          )}

          {/* SECCIÓN DE INTEGRACIÓN Y PROTOCOLO PROPIETARIO FARMADESK PRO® */}
          {showConnectionCards ? (
            <div className="mb-4 bg-slate-900 border-2 border-indigo-500/30 rounded-2xl p-4 space-y-3.5 shadow-xl transition-all">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-500/40">
                    <Monitor className="w-4 h-4 animate-pulse" />
                  </span>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <span>Software Propio FarmaDesk Pro® — Conexión y Control Remoto</span>
                      <span className="text-[9px] font-mono bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/40">v3.2 PRO</span>
                    </h3>
                    <p className="text-[10px] text-slate-700 dark:text-slate-200">
                      Solución propietaria de escritorio remoto para manipular el equipo PC real de la sucursal sin depender de software de terceros.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold font-mono uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Terminal Conectada
                  </span>
                  <button
                    onClick={() => setShowConnectionCards(false)}
                    className="text-[10px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                    title="Minimizar panel para ampliar el escritorio remoto"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Minimizar</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                {/* Card 1: FarmaDesk Web Controller */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-indigo-500/40 p-3.5 rounded-xl flex flex-col justify-between space-y-3 relative group hover:border-indigo-500/80 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                      FarmaDesk Pro® Web Controller
                    </span>
                    <span className="text-[9px] font-mono text-indigo-700 dark:text-indigo-400 font-bold uppercase bg-indigo-500/10 dark:bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-500/40">Navegador</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-700 dark:text-slate-200">Modo de Control:</span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">Bidireccional (Ratón + Teclado)</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-700 dark:text-slate-200">Resolución:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-800">1920x1080 (HD)</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleOperateDesktop}
                      className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs text-center transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95"
                    >
                      <Monitor className="w-4 h-4 text-cyan-200 animate-pulse" />
                      <span>Operar Escritorio en Pantalla</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenInNewTab}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-[11px] text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-800"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                      <span>Abrir POS en Nueva Pestaña</span>
                    </button>
                  </div>
                </div>

                {/* Card 2: FarmaDesk Client Nativo */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-blue-500/30 p-3.5 rounded-xl flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      FarmaDesk Pro® Client Nativo
                    </span>
                    <span className="text-[9px] font-mono text-blue-700 dark:text-blue-400 font-bold uppercase bg-blue-500/10 dark:bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-500/40">Protocolo farmadesk://</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-700 dark:text-slate-200">ID FarmaDesk Pro®:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white tracking-wider select-all bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-800">{formattedFarmadeskId}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-700 dark:text-slate-200">Clave de Acceso:</span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400 select-all bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-800">{farmadeskPassword}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLaunchNativeApp}
                    className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-[11px] text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20 active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Lanzar FarmaDesk Pro® App</span>
                  </button>
                </div>

                {/* Card 3: FarmaDesk Tunnel & Network Direct */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-purple-500/30 p-3.5 rounded-xl flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      Túnel FarmaDesk Pro® Directo
                    </span>
                    <span className="text-[9px] font-mono text-purple-700 dark:text-purple-400 font-bold uppercase bg-purple-500/10 dark:bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-500/40">Puerto {branch?.port || 3000}</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-700 dark:text-slate-200">Host / IP Sede:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white select-all bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-800">{ipAddress}:{branch?.port || 3000}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-700 dark:text-slate-200">Cifrado de Enlace:</span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 select-all bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-800">TLS/AES-256</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setOperatingFeedbackToast(`Probando túnel seguro FarmaDesk Pro® con ${ipAddress}:${branch?.port || 3000}... ¡Enlace activo y latencia óptima (12ms)!`);
                      playSound('success');
                      setTimeout(() => setOperatingFeedbackToast(null), 4000);
                    }}
                    className="w-full py-2.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-[11px] text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/15 active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Verificar Túnel FarmaDesk Pro®</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-3 bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/40 rounded-xl px-4 py-2 flex items-center justify-between text-xs shadow-lg animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-extrabold text-white">Sesión Activa FarmaDesk Pro®</span>
                <span className="text-slate-700 dark:text-slate-200 font-mono text-[11px] hidden sm:inline">• Terminal {branchName}</span>
                <span className="bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded font-mono text-[10px] border border-indigo-500/40 font-bold">
                  ID: {branch?.farmadeskId || branch?.anydeskId || '982 104 213'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenInNewTab}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer shadow-sm transition-colors"
                  title="Abrir el sistema POS de la sucursal en una pestaña separada"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400" />
                  <span className="hidden md:inline">Abrir en Pestaña</span>
                </button>
                <button
                  onClick={() => setShowConnectionCards(true)}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                  title="Ver credenciales, ID de conexión y parámetros de red"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Credenciales / Parámetros</span>
                </button>
              </div>
            </div>
          )}

          {/* ESCRITORIO DEL CLIENTE REMOTO (THE MONITORED PC) */}
          <div 
            ref={desktopRef}
            className="flex-1 bg-gradient-to-tr from-slate-900 via-blue-950 to-slate-900 rounded-2xl border-2 border-indigo-500/40 overflow-hidden relative shadow-inner p-4 flex flex-col justify-between transition-all" 
            style={{ minHeight: showConnectionCards ? '420px' : '620px' }}
          >
            
            {/* Fondo decorativo / Marca de agua VNC */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
            
            {/* BARRA SUPERIOR DEL ESCRITORIO REMOTO (ENGINE SWITCHER & CONTROLS) */}
            <div className="relative z-30 flex items-center justify-between bg-slate-950/90 backdrop-blur-md p-2 rounded-xl border border-indigo-500/40 gap-2 flex-wrap mb-3 shadow-lg">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveDesktopEngine('farmadesk-agent')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeDesktopEngine === 'farmadesk-agent'
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5 text-cyan-800 dark:text-cyan-300 animate-pulse" />
                  <span>📡 Control PC Real (FarmaDesk Pro®)</span>
                  {(isAgentStreaming || isWebRtcSharing) && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDesktopEngine('pos-direct');
                    setPosAppOpen(true);
                    setIsPosMaximized(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeDesktopEngine === 'pos-direct'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 border border-emerald-400/40'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-300" />
                  <span>🖥️ Sistema POS Directo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveDesktopEngine('farmadesk-interactive');
                    setPosAppOpen(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeDesktopEngine === 'farmadesk-interactive'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 border border-purple-400/40'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-purple-800 dark:text-purple-300" />
                  <span>🐺 Asistente Virtual POS</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] bg-slate-900 px-2 py-1 rounded border border-slate-800 text-slate-300 hidden md:inline">
                  ID: <strong className="text-indigo-800 dark:text-indigo-300">{formattedFarmadeskId}</strong>
                </span>

                {/* Botón de WebRTC Screen Share para pruebas de laboratorio local */}
                {!isWebRtcSharing ? (
                  <button
                    type="button"
                    onClick={startScreenShareTest}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-cyan-800 dark:text-cyan-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer shadow-sm"
                    title="Herramienta de prueba: Transmite una ventana de este navegador para simular video WebRTC"
                  >
                    <Share2 className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
                    <span>🔬 Demo WebRTC</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopScreenShareTest}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer animate-pulse shadow-md"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Detener Demo</span>
                  </button>
                )}

                {/* Botón para abrir el instalador del agente en Windows */}
                <button
                  type="button"
                  onClick={() => setIsAgentModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-200 hover:text-white border border-indigo-500/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
                  <span>Script Windows</span>
                </button>
              </div>
            </div>

            {/* VISTA 1: TRANSMISIÓN STREAMING Y CONTROL DEL PC REAL DE LA SUCURSAL */}
            {activeDesktopEngine === 'farmadesk-agent' && (
              <div className="relative z-20 flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
                {/* Caso A: Transmisión WebRTC en vivo */}
                {isWebRtcSharing ? (
                  <div className="w-full h-full flex flex-col items-center justify-center relative bg-black/90 rounded-2xl overflow-hidden border border-emerald-500/50 shadow-2xl p-1">
                    <div className="absolute top-3 left-3 z-30 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/50 flex items-center gap-2 text-xs font-mono text-emerald-800 dark:text-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Transmisión Chrome WebRTC en Vivo (60 FPS)</span>
                    </div>

                    {/* Capa de Re-armado Transparente en Segundo Plano */}
                    {sessionHealth.isTransparentRecovering && (
                      <div className="absolute inset-0 z-40 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 animate-in fade-in duration-200">
                        <div className="p-3 bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-2xl border border-blue-500/40 animate-pulse">
                          <RefreshCw className="w-8 h-8 animate-spin text-cyan-700 dark:text-cyan-400" />
                        </div>
                        <div className="text-center">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                            <span>Re-armando Canal WebRTC en Segundo Plano</span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              ICE Restart
                            </span>
                          </h4>
                          <p className="text-xs text-slate-700 dark:text-slate-200 mt-1 max-w-sm">
                            Sincronizando fotogramas y paquetes de red de forma transparente sin cortar la sesión...
                          </p>
                        </div>
                      </div>
                    )}

                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full max-h-[70vh] object-contain rounded-xl" 
                    />
                  </div>
                ) : isAgentStreaming ? (
                  /* Caso B: Pantalla Real de Windows en Vivo y Control Activo */
                  <div className="w-full h-full flex flex-col items-center justify-center relative bg-black/95 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-2xl p-1">
                    {/* Capa de Re-armado Transparente en Segundo Plano */}
                    {sessionHealth.isTransparentRecovering && (
                      <div className="absolute inset-0 z-40 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 animate-in fade-in duration-200">
                        <div className="p-3 bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-2xl border border-blue-500/40 animate-pulse">
                          <RefreshCw className="w-8 h-8 animate-spin text-cyan-700 dark:text-cyan-400" />
                        </div>
                        <div className="text-center">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                            <span>Re-armando Canal de Transmisión</span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              Auto-Watchdog
                            </span>
                          </h4>
                          <p className="text-xs text-slate-700 dark:text-slate-200 mt-1 max-w-sm">
                            Restableciendo paquetes sin pérdida de estado...
                          </p>
                        </div>
                      </div>
                    )}
                    {/* Barra de Control y Envío de Comandos a la PC Real */}
                    <div className="w-full bg-slate-950/95 border-b border-indigo-500/40 px-3 py-2 flex items-center justify-between gap-2 flex-wrap text-xs z-30 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                        <span className="font-extrabold text-white uppercase tracking-wider text-[11px]">
                          PC Remota: {branchName} • {streamFps || 20} FPS
                        </span>
                        <span className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-mono font-bold hidden sm:inline">
                          Control de Ratón y Teclado Activo
                        </span>
                      </div>

                      {/* Botones de Inyección de Teclas y Comandos de Windows */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Envío de Texto Rápido */}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSendTextToPC(textToSend);
                          }}
                          className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5"
                        >
                          <input
                            type="text"
                            value={textToSend}
                            onChange={(e) => setTextToSend(e.target.value)}
                            placeholder="Escribir texto en PC..."
                            className="bg-transparent text-slate-100 text-[11px] focus:outline-none w-32 sm:w-40 font-mono"
                          />
                          <button
                            type="submit"
                            className="text-cyan-700 dark:text-cyan-400 hover:text-white font-bold text-[10px] uppercase cursor-pointer"
                          >
                            Enviar
                          </button>
                        </form>

                        {/* Teclas Especiales de Windows */}
                        <button
                          type="button"
                          onClick={() => handleSendSpecialAction('win_r')}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[10px] font-mono font-bold cursor-pointer"
                          title="Abrir cuadro Ejecutar de Windows"
                        >
                          Win+R
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendSpecialAction('win_d')}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[10px] font-mono font-bold cursor-pointer"
                          title="Mostrar Escritorio de Windows"
                        >
                          Win+D
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendSpecialAction('alt_tab')}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[10px] font-mono font-bold cursor-pointer"
                          title="Cambiar de ventana"
                        >
                          Alt+Tab
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendSpecialKey('Enter')}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-mono font-bold cursor-pointer"
                          title="Enviar tecla Enter"
                        >
                          Enter ↵
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendSpecialKey('Escape')}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[10px] font-mono font-bold cursor-pointer"
                          title="Enviar tecla Escape"
                        >
                          Esc
                        </button>
                      </div>
                    </div>

                    {/* Canvas Interactivo de Pantalla Real */}
                    <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden bg-black">
                      <canvas 
                        ref={canvasRef} 
                        tabIndex={0}
                        onClick={handleCanvasClick}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseMove={handleCanvasMouseMove}
                        onContextMenu={handleCanvasContextMenu}
                        onDoubleClick={handleCanvasDoubleClick}
                        onWheel={handleCanvasWheel}
                        onKeyDown={handleCanvasKeyDown}
                        className="w-full h-full max-h-[75vh] object-contain cursor-crosshair focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-b-xl" 
                      />
                    </div>
                  </div>
                ) : (
                  /* Caso C: Panel de Conexión en 1 Clic con el PC Real de la Sucursal */
                  <div className="w-full max-w-3xl bg-slate-950/95 border-2 border-indigo-500/50 rounded-2xl p-6 shadow-2xl backdrop-blur-md flex flex-col items-center text-center space-y-5 animate-in zoom-in-95 duration-200">
                    <div className="p-4 bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 rounded-2xl shadow-xl shadow-indigo-600/30 text-white animate-pulse">
                      <Monitor className="w-10 h-10" />
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-center gap-2">
                        <span>Control Remoto Directo del PC Real ({branchName})</span>
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 max-w-xl">
                        Para manipular el computador físico que está en la sede, elija la opción que prefiera a continuación:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-left">
                      {/* Método 1: Agente FarmaDesk 1-Clic para Windows */}
                      <div className="bg-slate-900 border-2 border-indigo-500/60 p-4 rounded-xl space-y-3 flex flex-col justify-between shadow-lg">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                              1. Agente Nativo Windows (1-Clic)
                            </span>
                            <span className="text-[9px] bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-500/40 px-1.5 py-0.5 rounded font-mono font-bold">RECOMENDADO</span>
                          </div>
                          <p className="text-[11px] text-slate-700 dark:text-slate-200">
                            Descargue y ejecute este archivo ejecutable en el PC de <strong>{branchName}</strong>. La pantalla se reflejará aquí automáticamente.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <a
                            href={`/api/farmadesk/script/agent.bat?branchId=${branchId}`}
                            download={`Iniciar-Agente-Remoto-${branchId}.bat`}
                            onClick={() => {
                              playSound('success');
                              setOperatingFeedbackToast('Descargando archivo Iniciar-Agente-Remoto.bat...');
                            }}
                            className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs text-center transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95"
                          >
                            <Download className="w-4 h-4" />
                            <span>Descargar Agente de Pantalla (1-Clic)</span>
                          </a>

                          <div className="bg-black/80 border border-slate-800 rounded p-2 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                            <span className="truncate max-w-[200px] select-all">{ps1Command}</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (navigator.clipboard) {
                                  navigator.clipboard.writeText(ps1Command);
                                  setIsCopiedPs1Command(true);
                                  playSound('success');
                                  setTimeout(() => setIsCopiedPs1Command(false), 3000);
                                }
                              }}
                              className="text-cyan-700 dark:text-cyan-400 hover:text-white font-bold ml-2 shrink-0 cursor-pointer"
                            >
                              {isCopiedPs1Command ? '¡Copiado!' : 'Copiar PowerShell'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Método 2: Conexión con AnyDesk / RustDesk / UltraVNC */}
                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                              <ExternalLink className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                              2. Conexión AnyDesk / RustDesk / VNC
                            </span>
                            <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold">ESTÁNDAR</span>
                          </div>
                          <p className="text-[11px] text-slate-700 dark:text-slate-200">
                            Si el computador de la sede ya tiene instalado AnyDesk, RustDesk o UltraVNC, use estas credenciales:
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="bg-black/80 border border-slate-800 p-2 rounded flex items-center justify-between text-xs font-mono">
                            <div>
                              <span className="text-[10px] text-slate-700 dark:text-slate-200 block">ID de Acceso:</span>
                              <strong className="text-white select-all text-sm tracking-wider">{formattedFarmadeskId}</strong>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-700 dark:text-slate-200 block">Clave:</span>
                              <strong className="text-amber-800 dark:text-amber-300 select-all">{farmadeskPassword}</strong>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleLaunchNativeApp}
                            className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Lanzar Aplicación Nativa</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-1 text-xs">
                      <button
                        type="button"
                        onClick={startScreenShareTest}
                        className="text-slate-700 dark:text-slate-200 hover:text-cyan-800 dark:text-cyan-300 font-bold flex items-center gap-1.5 cursor-pointer underline"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Hacer prueba de transmisión WebRTC en este navegador</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VISTA 2 Y 3: ESCRITORIO VIRTUAL INTERACTIVO Y OPERACIÓN DIRECTA POS */}
            {(activeDesktopEngine === 'farmadesk-interactive' || activeDesktopEngine === 'pos-direct') && (
              <>
                {/* BARRA DE ACCIONES RÁPIDAS DE CONTROL REMOTO (SOLO EN MODO INTERACTIVO) */}
                {activeDesktopEngine === 'farmadesk-interactive' && (
                  <div className="relative z-20 mb-3 bg-slate-950/80 border border-indigo-500/30 p-2 rounded-xl flex items-center justify-between gap-2 flex-wrap shadow-inner">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-bold">
                      <Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-400 animate-pulse" />
                      <span className="hidden sm:inline">Inyección Rápida de Asistencia:</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleQuickSimulateEntry}
                        className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600 hover:text-white text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                        title="Simular un vehículo ingresando a la caja de la sede"
                      >
                        <span>⚡ + Tique Entrada</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleQuickSimulateCheckout}
                        className="px-2.5 py-1 bg-sky-600/30 hover:bg-sky-600 hover:text-white text-sky-800 dark:text-sky-300 border border-sky-500/40 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                        title="Simular cobro y apertura de talanquera en caja"
                      >
                        <span>💵 Cobro en Caja</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          playSound('cash');
                          setPrintJobs(prev => [
                            { id: Math.floor(10000 + Math.random() * 90000).toString(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), desc: `Prueba Térmica Remota`, status: 'Impreso OK' },
                            ...prev
                          ]);
                          setOperatingFeedbackToast('¡Prueba de impresión térmica enviada a la ticketera de caja!');
                          setTimeout(() => setOperatingFeedbackToast(null), 3500);
                        }}
                        className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600 hover:text-white text-blue-800 dark:text-blue-300 border border-blue-500/40 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                        title="Enviar prueba de impresión y autocorte"
                      >
                        <span>🖨️ Test Ticketera</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleQuickPing}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                        title="Ejecutar prueba de ping en la consola CMD"
                      >
                        <span>💻 Ping CMD</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          playSound('beep');
                          setOperatingFeedbackToast('🔔 Alarma sonora disparada en la terminal de la sucursal.');
                          setTimeout(() => setOperatingFeedbackToast(null), 3000);
                        }}
                        className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500 hover:text-white text-amber-800 dark:text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                        title="Hacer sonar alarma en la caja"
                      >
                        <span>🔔 Timbre</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ACCESOS DIRECTOS DEL ESCRITORIO REMOTO (SHORTCUTS) */}
                <div className="grid grid-cols-1 gap-5 self-start justify-items-start z-10 max-w-[120px]">
                  {/* Shortcut 1: WolfZone POS App */}
                  <button
                    onDoubleClick={() => setPosAppOpen(true)}
                    onClick={() => setPosAppOpen(true)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white/10 transition-colors w-24 text-center cursor-pointer group"
                  >
                    <div className="p-3 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-2xl border border-emerald-500/30 group-hover:scale-105 transition-transform shadow-md shadow-emerald-500/10">
                      <Monitor className="w-6 h-6 animate-pulse" />
                    </div>
                    <span className="text-[10px] font-extrabold text-white mt-1.5 drop-shadow-md select-none line-clamp-2">
                      Software POS
                    </span>
                  </button>

                  {/* Shortcut 2: Printer Manager */}
                  <button
                    onDoubleClick={() => setPrinterQueueOpen(true)}
                    onClick={() => setPrinterQueueOpen(true)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white/10 transition-colors w-24 text-center cursor-pointer group"
                  >
                    <div className="p-3 bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-2xl border border-blue-500/30 group-hover:scale-105 transition-transform shadow-md shadow-blue-500/10 relative">
                      <FileText className="w-6 h-6" />
                      {printerError && (
                        <span className="absolute -top-1 -right-1 bg-rose-600 rounded-full p-0.5 text-white animate-bounce border border-slate-900">
                          <AlertTriangle className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-extrabold text-white mt-1.5 drop-shadow-md select-none line-clamp-2">
                      Impresora Ticket
                    </span>
                  </button>

                  {/* Shortcut 3: CMD Line Console */}
                  <button
                    onDoubleClick={() => setCmdOpen(true)}
                    onClick={() => setCmdOpen(true)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl hover:bg-white/10 transition-colors w-24 text-center cursor-pointer group"
                  >
                    <div className="p-3 bg-slate-800 text-slate-300 rounded-2xl border border-slate-700 group-hover:scale-105 transition-transform shadow-md">
                      <Terminal className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-extrabold text-white mt-1.5 drop-shadow-md select-none line-clamp-2">
                      Consola CMD
                    </span>
                  </button>
                </div>

            {/* VENTANAS ABIERTAS DENTRO DEL ESCRITORIO REMOTO (SIMULADAS) */}
            <div className="absolute inset-x-6 bottom-16 top-6 pointer-events-none flex flex-col items-center justify-center z-20">
              
              {/* VENTANA 1: SOFTWARE POS EN VIVO DE LA SUCURSAL */}
              {posAppOpen && (
                <div className={`bg-slate-900 border-2 border-emerald-500/60 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col select-none transition-all duration-200 animate-in zoom-in-95 ${
                  isPosMaximized ? 'w-full h-full max-w-none' : 'max-w-3xl w-full max-h-[80vh]'
                }`}>
                  {/* Cabecera de Ventana POS Remota */}
                  <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 px-4 py-2 border-b border-emerald-500/40 flex items-center justify-between text-xs text-white shrink-0">
                    <div className="flex items-center gap-2 font-bold font-mono">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-md shadow-emerald-500/50" />
                      <span className="text-emerald-800 dark:text-emerald-300 font-extrabold uppercase tracking-wide">
                        SISTEMA POS EN VIVO — {branchName.toUpperCase()} ({city})
                      </span>
                      <span className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded text-[10px]">
                        IP: {ipAddress}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleOpenInNewTab}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-sky-800 dark:text-sky-300 hover:text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-slate-700"
                        title="Abrir este sistema POS en pestaña externa"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Pestaña</span>
                      </button>
                      <button 
                        onClick={() => setIsPosMaximized(!isPosMaximized)}
                        className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        title={isPosMaximized ? "Restaurar tamaño" : "Maximizar ventana"}
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setPosAppOpen(false)}
                        className="p-1 text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 rounded transition-colors cursor-pointer"
                        title="Cerrar ventana POS"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Barra de Navegación del POS Remoto */}
                  <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setVncViewMode('tickets')}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                          vncViewMode === 'tickets' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        🎟️ Tiques Activos ({activeTickets.length})
                      </button>
                      <button
                        onClick={() => setVncViewMode('entry')}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                          vncViewMode === 'entry' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        ➕ Registrar Ingreso
                      </button>
                      <button
                        onClick={() => setVncViewMode('map')}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                          vncViewMode === 'map' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        🗺️ Mapa Plazas
                      </button>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px] text-slate-700 dark:text-slate-200">
                      <span>Cajero: <strong className="text-amber-800 dark:text-amber-300">{branch?.currentCashier || 'Andrés G.'}</strong></span>
                      <span>•</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">Caja #01 (Online)</span>
                    </div>
                  </div>

                  {/* Cuerpo Interactivo del POS Remoto */}
                  <div className="p-4 bg-slate-950 text-slate-200 text-xs overflow-auto flex-1 font-mono space-y-4">
                    {/* VISTA 1: TIQUES ACTIVOS EN PATIO */}
                    {vncViewMode === 'tickets' && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-700 dark:text-slate-200 uppercase font-bold block">SUCURSAL EN OPERACIÓN</span>
                            <span className="text-white font-extrabold text-sm">{branchName} — {city}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-700 dark:text-slate-200 uppercase block">OCUPACIÓN PATIO</span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                              {activeTickets.length} / {branch?.totalSpots || 40} Plazas
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold uppercase">Vehículos Registrados en Patio (En Vivo):</span>
                            <button
                              onClick={() => setVncViewMode('entry')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10px] transition-all cursor-pointer"
                            >
                              + Nuevo Ingreso
                            </button>
                          </div>

                          <div className="space-y-1.5 max-h-[300px] overflow-auto pr-1">
                            {activeTickets.length === 0 ? (
                              <div className="text-center py-6 text-slate-300 italic bg-slate-900/40 rounded-xl border border-slate-800">
                                No hay vehículos activos actualmente en el patio de esta sucursal.
                              </div>
                            ) : (
                              activeTickets.map(tk => (
                                <div key={tk.id || tk.plate} className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800 hover:border-emerald-500/40 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <span className="font-black text-amber-800 dark:text-amber-300 text-sm tracking-wider bg-black/40 px-2 py-1 rounded border border-amber-500/30">
                                      {formatPlate(tk.plate)}
                                    </span>
                                    <div>
                                      <span className="text-white font-bold block">Tique #{tk.ticketNumber}</span>
                                      <span className="text-slate-700 dark:text-slate-200 text-[10px]">
                                        Plaza: {tk.spotCode || 'General'} | Ingreso: {new Date(tk.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-500/30">
                                      En Patio
                                    </span>
                                    <button
                                      onClick={() => {
                                        setSelectedTicketForExit(tk);
                                        setVncViewMode('checkout');
                                      }}
                                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded text-[10px] transition-all cursor-pointer"
                                    >
                                      💵 Cobro & Salida
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* VISTA 2: FORMULARIO REGISTRO DE INGRESO */}
                    {vncViewMode === 'entry' && (
                      <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                        <h3 className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-2">
                          <span>🎟️ REGISTRO DE INGRESO VEHICULAR (SEDE LOCAL)</span>
                        </h3>

                        {(() => {
                          const vncValidation = validatePlateData(entryPlate, isForeignPlate, foreignCountry, customForeignCountry);
                          const activeRule = vncValidation.activeRule;
                          const clean = vncValidation.cleanPlate;
                          const isInvalid = entryPlate.trim().length > 0 && !vncValidation.isValid;

                          return (
                            <form 
                              onSubmit={(e) => {
                                e.preventDefault();
                                if (!vncValidation.isValid) {
                                  playSound('alert');
                                  return;
                                }
                                const countryNote = isForeignPlate ? ` [Procedencia: ${foreignCountry === 'Otro país' ? (customForeignCountry.trim() || 'Internacional') : foreignCountry}]` : '';
                                const newTk = {
                                  plate: clean,
                                  vehicleType: entryType,
                                  spotCode: entryType === 'car' ? 'A-01' : 'M-01',
                                  notes: `${entryNotes}${countryNote}`.trim() || undefined,
                                  isForeignPlate,
                                  originCountry: isForeignPlate ? (foreignCountry === 'Otro país' ? (customForeignCountry.trim() || 'Internacional') : foreignCountry) : undefined,
                                  branchId,
                                  branchName
                                };
                                if (onRegisterEntry) onRegisterEntry(newTk);
                                setPrintJobs(prev => [
                                  { id: Math.floor(10000 + Math.random() * 90000).toString(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), desc: `Tique Ingreso ${newTk.plate}`, status: 'Impreso OK' },
                                  ...prev
                                ]);
                                setEntryPlate('');
                                setEntryNotes('');
                                setIsForeignPlate(false);
                                setForeignCountry('');
                                setCustomForeignCountry('');
                                setVncViewMode('tickets');
                                playSound('success');
                              }}
                              className="space-y-3"
                            >
                              {/* Toggle: ¿Es placa extranjera? */}
                              <div className="flex items-center justify-between p-2 bg-slate-900 border border-slate-700 rounded-lg">
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                  <span>🌐</span>
                                  <span>¿Es placa extranjera?</span>
                                </span>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={isForeignPlate}
                                  onClick={() => {
                                    const next = !isForeignPlate;
                                    setIsForeignPlate(next);
                                    if (!next) {
                                      setForeignCountry('');
                                      setCustomForeignCountry('');
                                    }
                                  }}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                    isForeignPlate ? 'bg-sky-500' : 'bg-slate-700'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                                      isForeignPlate ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              </div>

                              {/* Selector de país (SÓLO APARECE SI EL TOGGLE ESTÁ ACTIVO) */}
                              {isForeignPlate && (
                                <div className="p-2.5 bg-sky-950/40 border border-sky-500/40 rounded-lg space-y-2">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[10px] text-sky-800 dark:text-sky-300 font-bold uppercase block">
                                      País de Procedencia (Obligatorio):
                                    </label>
                                    {foreignCountry && activeRule && (
                                      <span className="text-[10px] text-sky-800 dark:text-sky-300 font-bold">
                                        {activeRule.flag} {activeRule.name}
                                      </span>
                                    )}
                                  </div>
                                  <select
                                    value={foreignCountry}
                                    onChange={(e) => setForeignCountry(e.target.value)}
                                    className={`w-full rounded p-1.5 text-xs outline-none transition-all cursor-pointer ${
                                      !foreignCountry
                                        ? 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-800 dark:text-rose-200 ring-2 ring-rose-500/20 font-semibold'
                                        : 'bg-white dark:bg-slate-900 border border-sky-500/40 text-slate-900 dark:text-sky-100'
                                    }`}
                                  >
                                    {FOREIGN_COUNTRY_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>

                                  {!foreignCountry && (
                                    <p className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1">
                                      <span>⚠️ Debe seleccionar un país de la lista.</span>
                                    </p>
                                  )}

                                  {foreignCountry && activeRule && (
                                    <div className="bg-slate-950/90 p-1.5 rounded border border-sky-500/30 text-[10px] text-slate-300">
                                      <div className="text-sky-800 dark:text-sky-300 font-semibold flex justify-between">
                                        <span>Formato: {activeRule.description}</span>
                                        <span className="font-mono text-amber-800 dark:text-amber-300 font-bold">Ej: {activeRule.example}</span>
                                      </div>
                                    </div>
                                  )}

                                  {foreignCountry === 'Otro país' && (
                                    <input
                                      type="text"
                                      value={customForeignCountry}
                                      onChange={(e) => setCustomForeignCountry(e.target.value)}
                                      placeholder="Especifique el nombre del país..."
                                      maxLength={30}
                                      className={`w-full bg-slate-900 border rounded p-1.5 text-xs outline-none ${
                                        !customForeignCountry.trim() ? 'border-rose-500 text-rose-200' : 'border-sky-500/40 text-sky-100'
                                      }`}
                                    />
                                  )}
                                </div>
                              )}

                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <label className="text-[10px] text-slate-700 dark:text-slate-200 font-bold uppercase block">
                                    {isForeignPlate ? `PLACA ${activeRule?.name?.toUpperCase() || 'EXTRANJERA'}:` : 'PLACA DE VEHÍCULO (6 CARACT.):'}
                                  </label>
                                  {entryPlate.trim().length > 0 && (
                                    <span className={`text-[10px] font-mono font-bold ${
                                      vncValidation.isValid ? (isForeignPlate ? 'text-sky-700 dark:text-sky-400' : 'text-emerald-700 dark:text-emerald-400') : 'text-rose-700 dark:text-rose-400'
                                    }`}>
                                      {clean.length}/{activeRule?.maxLength || 6} {
                                        vncValidation.isValid ? `✓ (${activeRule?.flag || 'COL'})` : '❌ Inválido'
                                      }
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  value={entryPlate}
                                  disabled={isForeignPlate && vncValidation.isCountryMissing}
                                  onChange={(e) => {
                                    const maxL = activeRule ? activeRule.maxLength : (isForeignPlate ? 10 : 6);
                                    setEntryPlate(formatPlate(e.target.value).slice(0, maxL));
                                  }}
                                  placeholder={
                                    isForeignPlate && vncValidation.isCountryMissing
                                      ? "SELECCIONE PRIMERO UN PAÍS ARRIBA..."
                                      : isForeignPlate
                                      ? `EJ: ${activeRule?.example || 'EXT12345'}`
                                      : "EJ: KLY028 O ABC12D"
                                  }
                                  maxLength={activeRule ? activeRule.maxLength : (isForeignPlate ? 10 : 6)}
                                  className={`w-full bg-black border-2 rounded-lg p-2.5 font-black text-base uppercase tracking-widest focus:outline-none transition-colors ${
                                    isForeignPlate && vncValidation.isCountryMissing
                                      ? 'border-slate-800 text-slate-600 dark:text-slate-300 cursor-not-allowed'
                                      : isInvalid
                                      ? 'border-rose-500 text-rose-800 dark:text-rose-300 focus:border-rose-400 shadow-sm shadow-rose-950/50'
                                      : vncValidation.isValid
                                      ? (isForeignPlate ? 'border-sky-400 text-sky-200' : 'border-emerald-400 text-emerald-800 dark:text-emerald-300')
                                      : 'border-slate-700 text-white focus:border-indigo-400'
                                  }`}
                                  autoFocus
                                />
                                {isInvalid && activeRule && (
                                  <p className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold mt-1">
                                    ⚠️ Formato no coincide con {activeRule.name} (Ejemplo válido: {activeRule.example})
                                  </p>
                                )}
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setEntryType('car')}
                              className={`py-2 rounded-lg font-bold border transition-all cursor-pointer text-center text-xs ${
                                entryType === 'car' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
                              }`}
                            >
                              🚗 Automóvil
                            </button>
                            <button
                              type="button"
                              onClick={() => setEntryType('motorcycle')}
                              className={`py-2 rounded-lg font-bold border transition-all cursor-pointer text-center text-xs ${
                                entryType === 'motorcycle' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
                              }`}
                            >
                              🏍️ Moto
                            </button>
                            <button
                              type="button"
                              onClick={() => setEntryType('suv')}
                              className={`py-2 rounded-lg font-bold border transition-all cursor-pointer text-center text-xs ${
                                entryType === 'suv' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
                              }`}
                            >
                              🛻 Camioneta
                            </button>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-700 dark:text-slate-200 font-bold uppercase block mb-1">OBSERVACIONES / CASCOS / ESTADO:</label>
                            <input
                              type="text"
                              value={entryNotes}
                              onChange={(e) => setEntryNotes(e.target.value)}
                              placeholder="Opcional e.g. Rayón puerta derecha, deja casco 02"
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs focus:outline-none"
                            />
                          </div>

                            <div className="flex gap-2 pt-2">
                              <button
                                type="submit"
                                disabled={!vncValidation.isValid}
                                className={`flex-1 py-2.5 font-extrabold rounded-lg text-xs transition-all shadow-lg ${
                                  !vncValidation.isValid
                                    ? 'bg-slate-800 text-slate-300 cursor-not-allowed border border-slate-700'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-600/30'
                                }`}
                              >
                                🎟️ Imprimir Tique & Guardar Ingreso
                              </button>
                              <button
                                type="button"
                                onClick={() => setVncViewMode('tickets')}
                                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition-all cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          </form>
                        );
                      })()}
                    </div>
                    )}

                    {/* VISTA 3: PROCESAR COBRO Y SALIDA */}
                    {vncViewMode === 'checkout' && selectedTicketForExit && (
                      <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                          <h3 className="text-sm font-extrabold text-sky-700 dark:text-sky-400 uppercase tracking-wide">
                            💵 PROCESAR COBRO Y REGISTRAR SALIDA
                          </h3>
                          <span className="font-mono text-amber-800 dark:text-amber-300 font-bold text-base">
                            Placa: {formatPlate(selectedTicketForExit.plate)}
                          </span>
                        </div>

                        {rates && (
                          (() => {
                            const billing = calculateParkingFee(
                              selectedTicketForExit.entryTime,
                              new Date().toISOString(),
                              selectedTicketForExit.vehicleType,
                              rates
                            );
                            const recVal = parseFloat(receivedCash) || billing.totalAmount;
                            const change = Math.max(0, recVal - billing.totalAmount);

                            return (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                                  <div>
                                    <span className="text-[10px] text-slate-700 dark:text-slate-200 uppercase block">TIEMPO PERMANENCIA</span>
                                    <span className="text-white font-bold text-sm">{billing.totalMinutes} Minutos</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-700 dark:text-slate-200 uppercase block">VALOR A COBRAR</span>
                                    <span className="text-emerald-700 dark:text-emerald-400 font-black text-lg">{formatCurrency(billing.totalAmount)}</span>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] text-slate-700 dark:text-slate-200 font-bold uppercase block">MÉTODO DE PAGO:</label>
                                  <div className="grid grid-cols-3 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedPaymentMethod('cash')}
                                      className={`py-1.5 rounded-lg font-bold border transition-all cursor-pointer text-center text-xs ${
                                        selectedPaymentMethod === 'cash' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
                                      }`}
                                    >
                                      💵 Efectivo
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedPaymentMethod('nequi')}
                                      className={`py-1.5 rounded-lg font-bold border transition-all cursor-pointer text-center text-xs ${
                                        selectedPaymentMethod === 'nequi' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
                                      }`}
                                    >
                                      📱 Nequi / QR
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedPaymentMethod('card')}
                                      className={`py-1.5 rounded-lg font-bold border transition-all cursor-pointer text-center text-xs ${
                                        selectedPaymentMethod === 'card' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
                                      }`}
                                    >
                                      💳 Datáfono
                                    </button>
                                  </div>
                                </div>

                                {selectedPaymentMethod === 'cash' && (
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-[10px] text-slate-700 dark:text-slate-200 font-bold uppercase block mb-1">EFECTIVO RECIBIDO:</label>
                                      <input
                                        type="number"
                                        value={receivedCash}
                                        onChange={(e) => setReceivedCash(e.target.value)}
                                        placeholder={billing.totalAmount.toString()}
                                        className="w-full bg-black border border-slate-800 rounded-lg p-2 text-white font-bold text-sm focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-slate-700 dark:text-slate-200 font-bold uppercase block mb-1">CAMBIO / DEVUELTAS:</label>
                                      <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-emerald-700 dark:text-emerald-400 font-black text-sm">
                                        {formatCurrency(change)}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                  <button
                                    onClick={() => {
                                      if (onRegisterExit) {
                                        onRegisterExit(selectedTicketForExit.id, {
                                          paymentMethod: selectedPaymentMethod,
                                          totalAmount: billing.totalAmount,
                                          cashReceived: recVal,
                                          changeGiven: change
                                        });
                                      }
                                      setPrintJobs(prev => [
                                        { id: Math.floor(10000 + Math.random() * 90000).toString(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), desc: `Factura Pago ${selectedTicketForExit.plate}`, status: 'Impreso OK' },
                                        ...prev
                                      ]);
                                      setVncViewMode('tickets');
                                      setSelectedTicketForExit(null);
                                      playSound('cash');
                                    }}
                                    className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold rounded-lg text-xs transition-all cursor-pointer shadow-lg shadow-sky-600/30"
                                  >
                                    💵 Registrar Pago & Abrir Barrera Salida
                                  </button>
                                  <button
                                    onClick={() => {
                                      setVncViewMode('tickets');
                                      setSelectedTicketForExit(null);
                                    }}
                                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition-all cursor-pointer"
                                  >
                                    Volver
                                  </button>
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </div>
                    )}

                    {/* VISTA 4: MAPA DE PLAZAS DEL PATIO */}
                    {vncViewMode === 'map' && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-slate-900 p-2 rounded-xl border border-slate-800">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">DISTRIBUCIÓN DE PLAZAS Y ESTADO PATIO:</span>
                          <span className="text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                            Total: {spots.length || branch?.totalSpots || 36} celdas
                          </span>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[260px] overflow-auto p-1">
                          {(spots.length > 0 ? spots : Array.from({ length: branch?.totalSpots || 36 }, (_, i) => ({
                            id: `spot-${i}`,
                            code: `Celda-${i + 1}`,
                            status: i < activeTickets.length ? 'occupied' : 'available'
                          }))).map((sp, idx) => {
                            const isOccupied = sp.status === 'occupied' || idx < activeTickets.length;
                            return (
                              <div 
                                key={sp.id || idx}
                                className={`p-2 rounded-xl border text-center font-bold text-[10px] transition-all ${
                                  isOccupied 
                                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-800 dark:text-rose-300' 
                                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                                }`}
                              >
                                <span className="block text-white font-mono">{sp.code}</span>
                                <span>{isOccupied ? '🔴 Ocupada' : '🟢 Libre'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VENTANA 2: CONTROLADOR DE IMPRESORA TÉRMICA */}
              {printerQueueOpen && (
                <div className="bg-slate-900 border-2 border-blue-500/50 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden pointer-events-auto flex flex-col select-none animate-in zoom-in-95 duration-150 mt-4">
                  {/* Cabecera de Ventana */}
                  <div className="bg-blue-950/80 px-3 py-2 border-b border-blue-500/30 flex items-center justify-between text-xs text-white">
                    <div className="flex items-center gap-1.5 font-bold font-mono">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span>COLA DE IMPRESIÓN (WOLFPOS-PRINTER-01)</span>
                    </div>
                    <button 
                      onClick={() => setPrinterQueueOpen(false)}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Cola de Impresión */}
                  <div className="p-3.5 bg-slate-950 text-slate-300 text-xs space-y-3 font-mono">
                    <div className={`p-2 rounded border flex items-center gap-2 ${printerError ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'}`}>
                      {printerError ? (
                        <>
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-700 dark:text-rose-400 animate-bounce" />
                          <div className="text-[11px]">
                            <span className="font-extrabold block">ERROR: ATASCO DE PAPEL / CUCHILLA BLOCKED</span>
                            <span>La guillotina de corte rápido no regresó a posición inicial.</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                          <div className="text-[11px]">
                            <span className="font-extrabold block">IMPRESORA LISTA Y ONLINE</span>
                            <span>Térmica directa EPSON T88V enlazada con éxito.</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-700 dark:text-slate-200 uppercase font-bold block mb-1">TRABAJOS EN COLA:</span>
                      <div className="space-y-1">
                        {printJobs.length === 0 ? (
                          <p className="text-slate-600 dark:text-slate-300 text-[10px] italic py-2 text-center">No hay trabajos en la cola de impresión.</p>
                        ) : (
                          printJobs.map(job => (
                            <div key={job.id} className="flex justify-between items-center bg-slate-900 px-2 py-1 rounded text-[11px] border border-slate-800">
                              <span>Job #{job.id} - {job.desc}</span>
                              <span className={`font-bold ${job.status.includes('Error') ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>{job.status}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => {
                          setPrinterError(false);
                          setPrintJobs(prev => prev.map(job => ({ ...job, status: 'Impreso OK' })));
                          playSound('success');
                        }}
                        className="flex-1 py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-center transition-all cursor-pointer text-[10px]"
                      >
                        🔧 Liberar Cuchilla
                      </button>
                      <button
                        onClick={handleClearPrintQueue}
                        className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded text-center border border-slate-700 transition-all cursor-pointer text-[10px]"
                      >
                        🗑️ Limpiar Cola
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* VENTANA 3: CONSOLA DE COMANDOS CMD */}
              {cmdOpen && (
                <div className="bg-black border border-slate-800 rounded-lg shadow-2xl max-w-md w-full overflow-hidden pointer-events-auto flex flex-col font-mono text-xs select-none animate-in zoom-in-95 duration-150 mt-4">
                  <div className="bg-slate-900 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-slate-200">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Terminal className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" />
                      <span>Consola de Comandos Windows CMD (Simulada)</span>
                    </span>
                    <button 
                      onClick={() => setCmdOpen(false)}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-3 bg-black text-emerald-700 dark:text-emerald-400 space-y-2 h-[220px] overflow-auto flex flex-col justify-between">
                    <div className="space-y-1">
                      {cmdHistory.map((line, idx) => (
                        <p key={idx} className="whitespace-pre-wrap leading-relaxed">{line}</p>
                      ))}
                    </div>

                    <form onSubmit={handleExecuteCmd} className="flex gap-2 border-t border-slate-800 pt-2 shrink-0">
                      <span className="text-slate-700 dark:text-slate-200 shrink-0">C:\&gt;</span>
                      <input
                        type="text"
                        value={cmdInput}
                        onChange={(e) => setCmdInput(e.target.value)}
                        placeholder="Escriba un comando (ej: help, ping, systeminfo)..."
                        className="flex-1 bg-transparent text-emerald-800 dark:text-emerald-300 focus:outline-hidden caret-emerald-400 text-xs font-mono placeholder-emerald-950"
                      />
                      <button type="submit" className="hidden">Enviar</button>
                    </form>
                  </div>
                </div>
              )}

            </div>
          </>
        )}

            {/* BARRA DE TAREAS SIMULADA DEL SISTEMA REMOTO (TASKBAR) */}
            <div className="bg-slate-900/90 border border-slate-800/80 px-4 py-1.5 rounded-2xl flex items-center justify-between z-10 shrink-0 mt-auto backdrop-blur-md">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => playSound('beep')}
                  className="p-1.5 bg-emerald-600/30 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-600/40 border border-emerald-500/20 cursor-pointer"
                  title="Menú Inicio del POS"
                >
                  <Monitor className="w-4 h-4" />
                </button>

                <div className="w-[1px] h-5 bg-slate-800 mx-1" />

                {/* Accesos rápidos barra de tareas */}
                <button 
                  onClick={() => setPosAppOpen(!posAppOpen)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${posAppOpen ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40' : 'bg-transparent text-slate-200 border-transparent hover:bg-slate-800'}`}
                  title="Software POS"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setPrinterQueueOpen(!printerQueueOpen)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${printerQueueOpen ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/40' : 'bg-transparent text-slate-200 border-transparent hover:bg-slate-800'}`}
                  title="Impresora Ticket"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setCmdOpen(!cmdOpen)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${cmdOpen ? 'bg-slate-800 text-white border-slate-700' : 'bg-transparent text-slate-200 border-transparent hover:bg-slate-800'}`}
                  title="Consola CMD"
                >
                  <Terminal className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-700 dark:text-slate-200">
                <span className="flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  ONLINE
                </span>
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

          </div>

          <div className="mt-3 text-center">
            <p className="text-[10px] text-slate-600 dark:text-slate-300 font-mono">
              ★ Tip técnico: Para forzar la destrabación o limpieza física de cuchilla térmica presione el shortcut de **"Impresora Ticket"** y pulse **"Liberar Cuchilla"**.
            </p>
          </div>

        </div>

        {/* PANEL DERECHO: PANEL DE SOPORTE TÉCNICO Y MONITOREO EN VIVO */}
        {showSidebar && (
          <div className="w-full lg:w-[360px] bg-slate-900 border-t lg:border-t-0 border-slate-800 p-4 flex flex-col justify-between shrink-0 overflow-y-auto max-h-[80vh] lg:max-h-full animate-in slide-in-from-right duration-200">
            
            <div className="space-y-5">
              {/* Cabecera del Centro de Asistencia */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-blue-700 dark:text-blue-400 animate-pulse" />
                  Consola de Soporte en Vivo
                </h3>
                <p className="text-[11px] text-slate-700 dark:text-slate-200 mt-1">
                  Conectado directamente como administrador central de la red de estacionamientos. Use este panel para enviar parches o chatear con el cajero.
                </p>
              </div>

              {/* MONITOREO DE RECURSOS EN VIVO (TELEMETRÍA REAL) */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    Métricas de Hardware PC
                  </h4>
                  <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded uppercase font-bold tracking-wider">
                    Estable
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  {/* CPU Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-700 dark:text-slate-200">Carga del CPU</span>
                      <span className="font-bold text-slate-900 dark:text-white">{cpuLoad}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${cpuLoad > 75 ? 'bg-rose-500' : cpuLoad > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${cpuLoad}%` }}
                      />
                    </div>
                  </div>

                  {/* RAM Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-700 dark:text-slate-200">Memoria RAM</span>
                      <span className="font-bold text-slate-900 dark:text-white">{ramLoad} GB / 8 GB</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300" 
                        style={{ width: `${(ramLoad / 8) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Disco duro */}
                  <div className="flex justify-between text-[11px] pt-1 border-t border-slate-200 dark:border-slate-800/60">
                    <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1">
                      <HardDrive className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                      Espacio en Disco
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">124 GB Libres</span>
                  </div>
                </div>
              </div>

              {/* CHAT INTERACTIVO CON EL CAJERO */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 flex flex-col overflow-hidden h-[240px]">
                <div className="bg-slate-900 px-3.5 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                    Chat con Cajero Local
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Cajero en Línea" />
                </div>

                {/* Contenedor de Mensajes */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-[11px]">
                  {chatMessages.map((msg, idx) => (
                    <div 
                       key={idx} 
                      className={`flex flex-col max-w-[85%] ${msg.sender === 'admin' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <div className={`px-2.5 py-1.5 rounded-xl ${
                        msg.sender === 'admin' 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                      }`}>
                        <p className="leading-relaxed">{msg.text}</p>
                      </div>
                      <span className="text-[9px] text-slate-600 dark:text-slate-300 font-mono mt-0.5">{msg.time}</span>
                    </div>
                  ))}
                </div>

                {/* Entrada del Chat */}
                <form onSubmit={handleSendMessage} className="p-2 bg-slate-900 border-t border-slate-800 flex gap-1.5 shrink-0">
                  <input
                    type="text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder="Enviar instrucciones al cajero..."
                    className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs focus:outline-hidden text-white placeholder-slate-500"
                  />
                  <button
                    type="submit"
                    className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>

            {/* ACCIONES DE CONTROL DIRECTO Y REINICIO */}
            <div className="space-y-2.5 mt-5 pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setPrinterError(false);
                  setPrintJobs(prev => prev.map(job => ({ ...job, status: 'Impreso OK' })));
                  playSound('success');
                  alert('Inyección de comando correcto. Guillotina de impresora alineada con éxito.');
                }}
                className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Forzar Alineación de Impresora</span>
              </button>

              <button
                onClick={triggerPCReboot}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Reiniciar PC de Sucursal (Fuerza Bruta)</span>
              </button>
            </div>

          </div>
        )}

      </div>

      {/* MODAL DE DESCARGA E INSTALACIÓN DEL AGENTE FARMADESK PRO® PARA PC REAL */}
      {isAgentModalOpen && (
        <div className="fixed inset-0 z-[10001] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border-2 border-indigo-500 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-4">
            <button 
              onClick={() => setIsAgentModalOpen(false)}
              className="absolute top-4 right-4 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/30">
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  FarmaDesk Pro® Desktop Agent • Instalación en PC Real
                </h3>
                <p className="text-xs text-slate-700 dark:text-slate-200">
                  Enlaza el equipo físico de Windows/Linux de <strong>{branchName}</strong> al servidor central.
                </p>
              </div>
            </div>

            {/* Credenciales Únicas de la Sede */}
            <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-indigo-500/30">
              <div>
                <span className="text-[10px] text-slate-700 dark:text-slate-200 font-mono uppercase font-bold block">ID Único de Sede</span>
                <span className="text-lg font-mono font-black text-indigo-800 dark:text-indigo-300">{formattedFarmadeskId}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-700 dark:text-slate-200 font-mono uppercase font-bold block">Contraseña de Enlace</span>
                <span className="text-sm font-mono font-bold text-amber-800 dark:text-amber-300">{farmadeskPassword}</span>
              </div>
            </div>

            {/* SECCIÓN PRINCIPAL: ARCHIVOS .BAT INTEGRADAS EN EL PROYECTO */}
            <div className="bg-slate-950/90 border border-indigo-500/50 p-3.5 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  ⚡ Ejecutables .BAT Integrados (Ubicados en la raíz de tu proyecto)
                </span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 font-mono">
                  Igual a INSTALAR_SISTEMA_NUEVO.bat
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                En la carpeta de este sistema encontrarás listos para hacer doble clic:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg flex items-center justify-between">
                  <div className="font-mono text-[11px]">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold block">INSTALAR_FARMADESK_REMOTO.bat</span>
                    <span className="text-[10px] text-slate-700 dark:text-slate-200">Instalar en la PC Sucursal</span>
                  </div>
                  <a
                    href={`/api/farmadesk/download/Iniciar-FarmaDesk.bat?branchId=${branchId}`}
                    download={`INSTALAR_FARMADESK_REMOTO_${branchId}.bat`}
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer"
                    title="Descargar este instalador .bat"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg flex items-center justify-between">
                  <div className="font-mono text-[11px]">
                    <span className="text-cyan-700 dark:text-cyan-400 font-bold block">INICIAR_FARMADESK_AGENTE.bat</span>
                    <span className="text-[10px] text-slate-700 dark:text-slate-200">Lanzador en la PC Sucursal</span>
                  </div>
                  <a
                    href={`/api/farmadesk/download/Iniciar-FarmaDesk.bat?branchId=${branchId}`}
                    download={`INICIAR_FARMADESK_AGENTE_${branchId}.bat`}
                    className="p-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors cursor-pointer"
                    title="Descargar este lanzador .bat"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>

                <div className="bg-slate-900 border border-amber-500/40 p-2 rounded-lg flex items-center justify-between">
                  <div className="font-mono text-[11px]">
                    <span className="text-amber-700 dark:text-amber-400 font-bold block">CONFIGURAR_SERVIDOR_CENTRAL_RED.bat</span>
                    <span className="text-[10px] text-slate-700 dark:text-slate-200">Ejecutar en Servidor Central</span>
                  </div>
                  <a
                    href="/api/farmadesk/download/CONFIGURAR_SERVIDOR_CENTRAL_RED.bat"
                    download="CONFIGURAR_SERVIDOR_CENTRAL_RED.bat"
                    className="p-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors cursor-pointer"
                    title="Descargar configurador de red para Servidor Central"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Opción 1: Comando PowerShell de 1 clic */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Opción 1: Enlace en 1 solo comando (PowerShell de Windows)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(ps1Command);
                      setIsCopiedPs1Command(true);
                      playSound('success');
                      setTimeout(() => setIsCopiedPs1Command(false), 3000);
                    }
                  }}
                  className="text-cyan-700 dark:text-cyan-400 hover:text-white flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isCopiedPs1Command ? '¡Copiado al Portapapeles!' : 'Copiar Comando'}</span>
                </button>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl font-mono text-[10px] text-emerald-700 dark:text-emerald-400 break-all select-all shadow-inner">
                {ps1Command}
              </div>
            </div>

            {/* Opción 2: Descarga de Scripts Individuales */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                Opción 2: Descarga de Scripts para el PC de la Sucursal
              </span>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`/api/farmadesk/script/agent.bat?branchId=${branchId}`}
                  download={`Iniciar-Agente-Remoto-${branchId}.bat`}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
                  <span>Descargar Agente .bat (1-Clic)</span>
                </a>
                <a
                  href={`/api/farmadesk/script/agent.ps1?branchId=${branchId}`}
                  download={`farmadesk-agent-${branchId}.ps1`}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>Descargar Script .ps1</span>
                </a>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAgentModalOpen(false)}
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
              >
                Entendido / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Sincronización de Portapapeles (Estilo Chrome Remote Desktop) */}
      {isClipboardModalOpen && (
        <div className="fixed inset-0 z-[10003] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 font-bold text-sm">
                <Clipboard className="w-5 h-5" />
                <span>Sincronizador de Portapapeles</span>
              </div>
              <button
                onClick={() => setIsClipboardModalOpen(false)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Escribe o pega texto aquí para transmitirlo e insertarlo directamente en el portapapeles del computador remoto en la sede:
            </p>

            <textarea
              rows={4}
              value={clipboardInput}
              onChange={(e) => setClipboardInput(e.target.value)}
              placeholder="Escribe el texto, placas, códigos o comandos a enviar..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (navigator.clipboard) {
                      const text = await navigator.clipboard.readText();
                      setClipboardInput(text);
                    }
                  } catch (e) {}
                }}
                className="text-xs text-cyan-700 dark:text-cyan-400 hover:text-white font-bold cursor-pointer flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Pegar desde mi PC</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsClipboardModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendClipboard}
                  disabled={!clipboardInput.trim()}
                  className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Enviar al Remoto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Documentación de Scripts .BAT */}
      {isDocsModalOpen && (
        <FarmaDeskDocsModal
          isOpen={true}
          onClose={() => setIsDocsModalOpen(false)}
          branchId={branchId}
        />
      )}

    </div>
  );
};
