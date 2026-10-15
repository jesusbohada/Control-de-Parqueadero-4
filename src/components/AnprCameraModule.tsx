import React, { useState, useRef } from 'react';
import {
  Camera,
  Video,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Upload,
  Sparkles,
  Search,
  Settings,
  ShieldCheck,
  Zap,
  ArrowRight,
  Maximize2,
  Layers,
  Clock,
  Car,
  Bike,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  Eye,
  FileText
} from 'lucide-react';
import { IPCameraConfig, ANPRDetectionRecord, VehicleType, ParkingTicket } from '../types';
import { playSound } from '../utils/audio';

interface AnprCameraModuleProps {
  tickets: ParkingTicket[];
  onRegisterEntry: (plate: string, vehicleType: VehicleType, notes?: string) => void;
  onSelectTicketForExit: (ticket: ParkingTicket) => void;
  currencySymbol?: string;
  onClose?: () => void;
}

// Sample High Quality Vehicle Images with License Plates for simulation/testing
const SAMPLE_VEHICLES = [
  {
    name: 'Carro Gris (KLR-890) - Entrada',
    type: 'car' as VehicleType,
    plate: 'KLR890',
    color: 'Gris Metalizado',
    brand: 'Chevrolet Onix',
    imageUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Camioneta Blanca (GHT-412) - Entrada',
    type: 'suv' as VehicleType,
    plate: 'GHT412',
    color: 'Blanco Perlado',
    brand: 'Toyota Hilux',
    imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Motocicleta Negra (MNO-78E) - Entrada',
    type: 'motorcycle' as VehicleType,
    plate: 'MNO78E',
    color: 'Negro Mate',
    brand: 'Yamaha FZ',
    imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Carro Rojo (PKL-109) - Salida',
    type: 'car' as VehicleType,
    plate: 'PKL109',
    color: 'Rojo Carmín',
    brand: 'Mazda 3',
    imageUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80'
  }
];

export const AnprCameraModule: React.FC<AnprCameraModuleProps> = ({
  tickets,
  onRegisterEntry,
  onSelectTicketForExit,
  currencySymbol = '$',
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'entry' | 'exit' | 'cameras' | 'logs'>('entry');
  
  // Camera Configurations State
  const [cameras, setCameras] = useState<IPCameraConfig[]>([
    {
      id: 'cam-entry-01',
      name: 'Cámara IP 01 - Entrada Vehicular Principal',
      type: 'entry',
      ipAddress: '192.168.1.201',
      port: 8080,
      protocol: 'http',
      streamUrl: 'http://192.168.1.201:8080/video',
      username: 'admin',
      password: '••••••••',
      isEnabled: true,
      autoRecognizeOnMotion: true,
      gateTriggerEnabled: true,
      confidenceThreshold: 80,
      assignedSpotZone: 'Zona A - Autos'
    },
    {
      id: 'cam-exit-01',
      name: 'Cámara IP 02 - Salida Vehicular Cobro',
      type: 'exit',
      ipAddress: '192.168.1.202',
      port: 8080,
      protocol: 'http',
      streamUrl: 'http://192.168.1.202:8080/video',
      username: 'admin',
      password: '••••••••',
      isEnabled: true,
      autoRecognizeOnMotion: true,
      gateTriggerEnabled: true,
      confidenceThreshold: 80,
      assignedSpotZone: 'Zona General Salida'
    }
  ]);

  // ANPR Detection State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState<number>(0);
  const [customImageBase64, setCustomImageBase64] = useState<string | null>(null);
  const [currentDetection, setCurrentDetection] = useState<ANPRDetectionRecord | null>(null);
  const [detectionLogs, setDetectionLogs] = useState<ANPRDetectionRecord[]>([]);
  const [gateStatus, setGateStatus] = useState<'closed' | 'opening' | 'open'>('closed');
  const [statusMessage, setStatusMessage] = useState<string>('Esperando aproximación vehicular frente a la talanquera...');
  const [searchLogQuery, setSearchLogQuery] = useState<string>('');

  // ANPR Thresholds & Sound Alerts Configuration State
  const [minConfidenceThreshold, setMinConfidenceThreshold] = useState<number>(80);
  const [unregisteredAlertSound, setUnregisteredAlertSound] = useState<boolean>(true);
  const [lowConfidenceAlertSound, setLowConfidenceAlertSound] = useState<boolean>(true);
  const [blacklistedPlates, setBlacklistedPlates] = useState<string[]>(['SUS-001', 'ALR-999']);
  const [newBlacklistInput, setNewBlacklistInput] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Image Upload from File System
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCustomImageBase64(reader.result as string);
        setCurrentDetection(null);
        setStatusMessage('Fotografía de cámara IP cargada. Haga clic en "Analizar Placa con IA".');
      };
      reader.readAsDataURL(file);
    }
  };

  // Convert image URL to Base64
  const getActiveImageBase64 = async (): Promise<string> => {
    if (customImageBase64) return customImageBase64;

    const sample = SAMPLE_VEHICLES[selectedSampleIndex];
    try {
      const response = await fetch(sample.imageUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      // Fallback tiny 1x1 png base64
      return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...';
    }
  };

  // Trigger Gemini AI Plate Recognition
  const handleProcessAiRecognition = async (cameraType: 'entry' | 'exit') => {
    setIsScanning(true);
    setStatusMessage('Capturando frame y transmitiendo a Gemini AI Vision para lectura de placa...');

    try {
      const imageBase64 = await getActiveImageBase64();
      const activeCamera = cameras.find(c => c.type === cameraType) || cameras[0];

      const res = await fetch('/api/anpr/recognize-plate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          cameraType,
          cameraName: activeCamera.name
        })
      });

      const data = await res.json();

      if (data.success && data.detection) {
        const detection: ANPRDetectionRecord = {
          ...data.detection,
          snapshotImageBase64: imageBase64
        };

        setCurrentDetection(detection);
        setDetectionLogs(prev => [detection, ...prev]);

        const cleanPlate = detection.plateNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const isBlacklisted = blacklistedPlates.some(p => p.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanPlate);

        if (isBlacklisted) {
          if (unregisteredAlertSound) playSound('unregistered_vehicle');
          setStatusMessage(`🚨 ¡ALERTA DE SEGURIDAD! Placa ${detection.plateNumber} en lista de restricciones/observación.`);
          return;
        }

        const isLowConfidence = detection.confidenceScore < minConfidenceThreshold;

        if (isLowConfidence) {
          if (lowConfidenceAlertSound) playSound('low_confidence');
          setStatusMessage(`⚠️ Lectura de placa ${detection.plateNumber} con baja certeza (${detection.confidenceScore}% < umbral ${minConfidenceThreshold}%). Requiere confirmación manual.`);
        } else if (cameraType === 'entry') {
          playSound('success');
          setStatusMessage(`✅ Placa ${detection.plateNumber} identificada con ${detection.confidenceScore}% de certidumbre.`);
        } else {
          // Exit search
          const activeMatch = tickets.find(
            t => t.status === 'active' && t.plate.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanPlate
          );
          if (activeMatch) {
            playSound('success');
            setStatusMessage(`✅ Vehículo ${detection.plateNumber} encontrado en patio (Ticket ${activeMatch.ticketNumber}).`);
          } else {
            if (unregisteredAlertSound) playSound('unregistered_vehicle');
            setStatusMessage(`🚨 ¡ALERTA SONORA! Vehículo con placa ${detection.plateNumber} NO REGISTRADO en patio.`);
          }
        }

      } else {
        setStatusMessage(`❌ Error en lectura: ${data.error || 'No fue posible leer la placa'}`);
      }
    } catch (err: any) {
      console.error('[ANPR UI Error]', err);
      setStatusMessage(`❌ Error de conexión con el módulo ANPR: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Action: Register Entry from ANPR
  const handleConfirmEntry = () => {
    if (!currentDetection) return;

    // Trigger barrier opening simulation
    setGateStatus('opening');
    setTimeout(() => {
      setGateStatus('open');
      onRegisterEntry(currentDetection.plateNumber, currentDetection.vehicleType, `ANPR IA Camera (${currentDetection.color} ${currentDetection.brand})`);
      setStatusMessage(`🚗 ¡Ingreso registrado! Talanquera abierta para vehículo ${currentDetection.plateNumber}.`);
      
      setTimeout(() => {
        setGateStatus('closed');
        setCurrentDetection(null);
      }, 3000);
    }, 1200);
  };

  // Action: Confirm Exit from ANPR
  const handleConfirmExit = (matchedTicket: ParkingTicket) => {
    setGateStatus('opening');
    setTimeout(() => {
      setGateStatus('open');
      onSelectTicketForExit(matchedTicket);
      setStatusMessage(`💰 Liquidando ticket ${matchedTicket.ticketNumber} para vehículo ${matchedTicket.plate}.`);
      
      setTimeout(() => {
        setGateStatus('closed');
      }, 2000);
    }, 1000);
  };

  const activeMatchTicket = currentDetection && activeTab === 'exit'
    ? tickets.find(t => t.status === 'active' && t.plate.toUpperCase().replace(/[^A-Z0-9]/g, '') === currentDetection.plateNumber.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    : null;

  const filteredLogs = detectionLogs.filter(log =>
    log.plateNumber.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
    log.cameraName.toLowerCase().includes(searchLogQuery.toLowerCase()) ||
    (log.brand && log.brand.toLowerCase().includes(searchLogQuery.toLowerCase()))
  );

  return (
    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-w-6xl mx-auto my-4 min-h-[680px]">
      
      {/* HEADER WITH AI & STATUS BADGE */}
      <div className="bg-slate-50 dark:bg-slate-950 p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-2 ring-cyan-400/30">
            <Camera className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r text-slate-900 dark:text-white">
                Módulo ANPR / LPR - Reconocimiento de Placas
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Gemini Vision AI
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5">
              Lectura automática de matrículas con cámaras IP, integración de talanqueras e ingreso/salida inteligente
            </p>
          </div>
        </div>

        {/* Action Controls & Close */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-emerald-700 dark:text-emerald-400 font-medium">2 Cámaras IP En Línea</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 px-4 flex space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('entry')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'entry'
              ? 'border-cyan-500 text-cyan-700 dark:text-cyan-400 bg-cyan-500/10'
              : 'border-transparent text-slate-700 dark:text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Lector de Entrada (Ingreso)</span>
        </button>

        <button
          onClick={() => setActiveTab('exit')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'exit'
              ? 'border-indigo-500 text-indigo-700 dark:text-indigo-400 bg-indigo-500/10'
              : 'border-transparent text-slate-700 dark:text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Lector de Salida (Cobro)</span>
        </button>

        <button
          onClick={() => setActiveTab('cameras')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'cameras'
              ? 'border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-500/10'
              : 'border-transparent text-slate-700 dark:text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Configuración Cámaras IP ({cameras.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'logs'
              ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-700 dark:text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Histórico de Placas ({detectionLogs.length})</span>
        </button>
      </div>

      {/* MAIN BODY AREA */}
      <div className="p-6 flex-1 flex flex-col bg-white dark:bg-slate-900/90">

        {/* TAB 1 & 2: LIVE READER ENTRY / EXIT */}
        {(activeTab === 'entry' || activeTab === 'exit') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            
            {/* LEFT 7 COLS: CAMERA VIDEO STREAM & CAPTURE PREVIEW */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              <div className="relative bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl aspect-video flex items-center justify-center group">
                
                {/* Active Image Feed */}
                <img
                  src={customImageBase64 || SAMPLE_VEHICLES[selectedSampleIndex].imageUrl}
                  alt="IP Camera Feed"
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    isScanning ? 'filter brightness-110 contrast-125' : ''
                  }`}
                />

                {/* Laser / Scanner Animation Effect during AI processing */}
                {isScanning && (
                  <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/20 via-transparent to-cyan-500/20 pointer-events-none">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#06b6d4] animate-pulse my-auto transform top-1/2 relative"></div>
                  </div>
                )}

                {/* Target Overlay Corners for License Plate Box */}
                <div className="absolute inset-12 border-2 border-dashed border-cyan-400/40 rounded-xl pointer-events-none flex items-center justify-center">
                  <div className="bg-white dark:bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-cyan-800 dark:text-cyan-300 font-mono tracking-widest uppercase border border-cyan-500/30 shadow-lg">
                    [ ÁREA DE LECTURA DE PLACA - CÁMARA IP ]
                  </div>
                </div>

                {/* Top Overlay Camera Status Header */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700/80 text-xs font-mono flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    <span className="text-white font-bold">
                      REC | {activeTab === 'entry' ? 'CÁMARA ENTRADA 01' : 'CÁMARA SALIDA 01'}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700/80 text-xs font-mono text-cyan-800 dark:text-cyan-300">
                    RTSP / 1080p @ 30fps
                  </div>
                </div>

                {/* Barrier / Gate Status Overlay */}
                <div className="absolute bottom-3 right-3">
                  <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 backdrop-blur-md shadow-lg ${
                    gateStatus === 'open'
                      ? 'bg-emerald-900/90 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                      : gateStatus === 'opening'
                      ? 'bg-amber-900/90 border-amber-500 text-amber-800 dark:text-amber-300 animate-pulse'
                      : 'bg-slate-900/90 border-slate-700 text-slate-300'
                  }`}>
                    {gateStatus === 'open' ? (
                      <><Unlock className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> <span>Talanquera Abierta</span></>
                    ) : gateStatus === 'opening' ? (
                      <><RotateCw className="w-4 h-4 text-amber-700 dark:text-amber-400 animate-spin" /> <span>Abriendo Talanquera...</span></>
                    ) : (
                      <><Lock className="w-4 h-4 text-slate-700 dark:text-slate-200" /> <span>Talanquera Cerrada</span></>
                    )}
                  </div>
                </div>
              </div>

              {/* SIMULATION & SOURCE SELECTION CONTROLS */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-200 font-medium">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold">
                    <Video className="w-4 h-4 text-cyan-700 dark:text-cyan-400" /> Selección de Fuente de Cámara / Muestra:
                  </span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:text-cyan-300 flex items-center gap-1 font-semibold hover:underline"
                  >
                    <Upload className="w-3.5 h-3.5" /> Subir Foto de Cámara
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SAMPLE_VEHICLES.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCustomImageBase64(null);
                        setSelectedSampleIndex(idx);
                        setCurrentDetection(null);
                      }}
                      className={`p-2 rounded-lg border text-left transition-all text-xs flex flex-col justify-between ${
                        !customImageBase64 && selectedSampleIndex === idx
                          ? 'border-cyan-500 bg-cyan-500/20 text-white ring-1 ring-cyan-500'
                          : 'border-slate-800 bg-slate-900/80 text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="font-bold truncate text-slate-700 dark:text-slate-200">{sample.plate}</span>
                      <span className="text-[10px] text-slate-700 dark:text-slate-200 truncate">{sample.brand}</span>
                    </button>
                  ))}
                </div>

                {/* TRIGGER ANALYZE BUTTON */}
                <button
                  onClick={() => handleProcessAiRecognition(activeTab)}
                  disabled={isScanning}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-lg ${
                    activeTab === 'entry'
                      ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-cyan-500/20'
                      : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white shadow-purple-500/20'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isScanning ? (
                    <>
                      <RotateCw className="w-5 h-5 animate-spin" />
                      <span>Procesando Visión con Gemini AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Escanear y Reconocer Placa con IA ({activeTab === 'entry' ? 'Ingreso' : 'Salida'})</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status Bar */}
              <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-mono flex items-center justify-between">
                <span className="truncate">{statusMessage}</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-300 font-sans">Modelo: gemini-3.8-flash</span>
              </div>
            </div>

            {/* RIGHT 5 COLS: AI RECOGNITION RESULTS & AUTOMATED ACTIONS */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              
              {currentDetection ? (
                <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-cyan-500/40 shadow-xl flex-1 flex flex-col justify-between space-y-4 relative overflow-hidden">
                  
                  {/* Subtle AI Glow Background */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

                  <div className="space-y-4">
                    {/* Header Result */}
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                      <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> Resultado de Visión IA
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                        {currentDetection.confidenceScore}% Certeza
                      </span>
                    </div>

                    {/* DIPLOMATIC / COLOMBIAN PARKING PLATE BADGE DESIGN */}
                    <div className="bg-gradient-to-b from-amber-300 via-amber-400 to-yellow-500 text-slate-950 p-4 rounded-xl border-4 border-slate-950 shadow-2xl text-center space-y-1">
                      <div className="text-[10px] font-bold tracking-widest uppercase text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800/20 pb-0.5">
                        COLOMBIA - REGISTRO VEHICULAR
                      </div>
                      <div className="text-4xl font-black font-mono tracking-widest py-1 drop-shadow-sm select-all">
                        {currentDetection.plateNumber}
                      </div>
                      <div className="text-[10px] font-bold text-slate-900 dark:text-slate-100 tracking-wider uppercase">
                        {currentDetection.brand} - {currentDetection.color}
                      </div>
                    </div>

                    {/* Detected Attributes */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-700 dark:text-slate-200 block text-[10px]">Categoría Detectada:</span>
                        <span className="font-bold text-slate-900 dark:text-white capitalize flex items-center gap-1 mt-0.5">
                          {currentDetection.vehicleType === 'motorcycle' ? <Bike className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" /> : <Car className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />}
                          {currentDetection.vehicleType === 'car' ? 'Carro / Automóvil' : currentDetection.vehicleType === 'motorcycle' ? 'Motocicleta' : 'Camioneta / SUV'}
                        </span>
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-700 dark:text-slate-200 block text-[10px]">Cámara de Origen:</span>
                        <span className="font-bold text-slate-900 dark:text-white truncate block mt-0.5">
                          {currentDetection.cameraName}
                        </span>
                      </div>
                    </div>

                    {/* Additional Notes */}
                    <div className="bg-white dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                      <span className="text-slate-700 dark:text-slate-200 font-semibold block text-[10px] mb-1">Observaciones de Visión IA:</span>
                      <p className="italic text-slate-600 dark:text-slate-300">{currentDetection.notes}</p>
                    </div>

                    {/* TAB SPECIFIC MATCHES & ACTIONS */}
                    {activeTab === 'entry' ? (
                      <div className="bg-cyan-950/40 p-4 rounded-xl border border-cyan-500/30 space-y-3">
                        <div className="text-xs text-cyan-200 font-medium flex items-center gap-2">
                          <Zap className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                          <span>Listo para registrar ingreso automático y habilitar talanquera.</span>
                        </div>

                        <button
                          onClick={handleConfirmEntry}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Registrar Ingreso e Imprimir Ticket</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeMatchTicket ? (
                          <div className="bg-emerald-950/40 p-4 rounded-xl border border-emerald-500/40 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Vehículo Encontrado en Patio
                              </span>
                              <span className="font-mono text-slate-600 dark:text-slate-300">Ticket: {activeMatchTicket.ticketNumber}</span>
                            </div>

                            <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                              <div>Hora de Ingreso: <strong className="text-white">{new Date(activeMatchTicket.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
                              <div>Plaza Asignada: <strong className="text-cyan-700 dark:text-cyan-400">{activeMatchTicket.spotCode}</strong></div>
                            </div>

                            <button
                              onClick={() => handleConfirmExit(activeMatchTicket)}
                              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center space-x-2"
                            >
                              <ArrowRight className="w-5 h-5" />
                              <span>Procesar Liquidación de Salida ({currencySymbol})</span>
                            </button>
                          </div>
                        ) : (
                          <div className="bg-amber-950/40 p-4 rounded-xl border border-amber-500/40 text-xs text-amber-200 space-y-2">
                            <div className="font-bold flex items-center gap-1 text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="w-4 h-4" /> Sin Ingreso Activo Registrado
                            </div>
                            <p>Esta placa no registra ticket de ingreso activo en patio. Verifique si ingresó sin ticket o registre el cobro manual.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-600 dark:text-slate-300 text-center font-mono pt-2 border-t border-slate-200 dark:border-slate-800">
                    ID Registro: {currentDetection.id} • {new Date(currentDetection.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center flex-1 flex flex-col items-center justify-center space-y-3 text-slate-800 dark:text-slate-200">
                  <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-700 dark:text-slate-300">
                    <Eye className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">Esperando Captura de Placa</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs">
                    Haga clic en &quot;Escanear y Reconocer Placa con IA&quot; para procesar el frame de la cámara IP y activar la talanquera.
                  </p>
                </div>
              )}

            </div>

          </div>
        )}

        {/* TAB 3: IP CAMERA CONFIGURATION & GATE RELAYS */}
        {activeTab === 'cameras' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Gestión de Cámaras IP ANPR & Talanqueras</h3>
                <p className="text-xs text-slate-700 dark:text-slate-200">
                  Configure direcciones IP, flujos RTSP/HTTP, credenciales y relevadores de apertura automática de talanquera
                </p>
              </div>

              <button
                onClick={() => {
                  const newCam: IPCameraConfig = {
                    id: `cam-${Date.now()}`,
                    name: `Cámara IP ${cameras.length + 1} - Nueva Zona`,
                    type: 'entry',
                    ipAddress: '192.168.1.203',
                    port: 8080,
                    protocol: 'rtsp',
                    isEnabled: true,
                    autoRecognizeOnMotion: true,
                    gateTriggerEnabled: true,
                    confidenceThreshold: 80
                  };
                  setCameras([...cameras, newCam]);
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Cámara IP</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cameras.map((cam, idx) => (
                <div key={cam.id} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <Camera className="w-5 h-5 text-cyan-700 dark:text-cyan-400" />
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{cam.name}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        cam.type === 'entry' ? 'bg-cyan-500/20 text-cyan-800 dark:text-cyan-300' : 'bg-purple-500/20 text-purple-800 dark:text-purple-300'
                      }`}>
                        {cam.type === 'entry' ? 'Entrada' : 'Salida'}
                      </span>
                      <button
                        onClick={() => setCameras(cameras.filter(c => c.id !== cam.id))}
                        className="p-1 text-slate-600 dark:text-slate-300 hover:text-red-700 dark:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-700 dark:text-slate-200 block mb-1">Dirección IP:</label>
                      <input
                        type="text"
                        value={cam.ipAddress}
                        onChange={(e) => {
                          const updated = [...cameras];
                          updated[idx].ipAddress = e.target.value;
                          setCameras(updated);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-slate-900 dark:text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-slate-700 dark:text-slate-200 block mb-1">Puerto / Protocolo:</label>
                      <input
                        type="text"
                        value={`${cam.port} (${cam.protocol.toUpperCase()})`}
                        readOnly
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-mono"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="text-slate-700 dark:text-slate-200 block mb-1">URL de Stream RTSP / Snapshot:</label>
                      <input
                        type="text"
                        value={cam.streamUrl || ''}
                        onChange={(e) => {
                          const updated = [...cameras];
                          updated[idx].streamUrl = e.target.value;
                          setCameras(updated);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-cyan-800 dark:text-cyan-300 font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <label className="flex items-center justify-between text-slate-600 dark:text-slate-300 cursor-pointer">
                      <span>Lectura Automática por Sensor de Movimiento</span>
                      <input
                        type="checkbox"
                        checked={cam.autoRecognizeOnMotion}
                        onChange={(e) => {
                          const updated = [...cameras];
                          updated[idx].autoRecognizeOnMotion = e.target.checked;
                          setCameras(updated);
                        }}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-cyan-600 focus:ring-0"
                      />
                    </label>

                    <label className="flex items-center justify-between text-slate-600 dark:text-slate-300 cursor-pointer">
                      <span>Apertura Automática de Talanquera al Verificar Placa</span>
                      <input
                        type="checkbox"
                        checked={cam.gateTriggerEnabled}
                        onChange={(e) => {
                          const updated = [...cameras];
                          updated[idx].gateTriggerEnabled = e.target.checked;
                          setCameras(updated);
                        }}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-emerald-600 focus:ring-0"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* NEW SECTION: THRESHOLD SCORE, AUDIO ALERTS & BLACKLIST MANAGEMENT */}
            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
              
              <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Parámetros de Certidumbre (Score) & Alertas Sonoras</h3>
                  <p className="text-xs text-slate-700 dark:text-slate-200">
                    Defina el nivel de exigencia de visión por IA y configure avisos auditivos de seguridad
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* LEFT: CONFIDENCE SCORE THRESHOLD SLIDER */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Umbral Mínimo de Confianza (Score):
                    </label>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                      minConfidenceThreshold >= 85
                        ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                        : minConfidenceThreshold >= 70
                        ? 'bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30'
                    }`}>
                      {minConfidenceThreshold}% Mínimo
                    </span>
                  </div>

                  <input
                    type="range"
                    min="50"
                    max="98"
                    step="1"
                    value={minConfidenceThreshold}
                    onChange={(e) => setMinConfidenceThreshold(Number(e.target.value))}
                    className="w-full accent-cyan-500 bg-slate-50 dark:bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                    <span>50% (Permisivo)</span>
                    <span>80% (Recomendado)</span>
                    <span>98% (Estricto)</span>
                  </div>

                  <p className="text-[11px] text-slate-200 italic bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80">
                    💡 Las lecturas con una precisión menor al <strong>{minConfidenceThreshold}%</strong> requerirán confirmación manual del operador y no abrirán la talanquera de forma directa.
                  </p>
                </div>

                {/* RIGHT: SOUND ALERTS CONFIGURATION */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    Alertas Sonoras Específicas
                  </h4>

                  <div className="space-y-3 text-xs">
                    <label className="flex items-center justify-between text-slate-300 cursor-pointer bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-white block">Sirena por Vehículos No Registrados</span>
                        <span className="text-[10px] text-slate-700 dark:text-slate-200">Emite tono urgente si un vehículo intenta salir sin ingreso activo en patio.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={unregisteredAlertSound}
                        onChange={(e) => setUnregisteredAlertSound(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-cyan-600 focus:ring-0 ml-3"
                      />
                    </label>

                    <label className="flex items-center justify-between text-slate-300 cursor-pointer bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-white block">Tono por Baja Certidumbre (&lt; {minConfidenceThreshold}%)</span>
                        <span className="text-[10px] text-slate-700 dark:text-slate-200">Alerta auditiva dual cuando la precisión de visión es dudosa.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={lowConfidenceAlertSound}
                        onChange={(e) => setLowConfidenceAlertSound(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-cyan-600 focus:ring-0 ml-3"
                      />
                    </label>
                  </div>

                  {/* TEST SOUND BUTTONS */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => playSound('unregistered_vehicle')}
                      className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1"
                    >
                      <span>Probar Sirena Alerta</span>
                    </button>

                    <button
                      onClick={() => playSound('low_confidence')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1"
                    >
                      <span>Probar Tono Duda</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* BLACKLISTED / WATCHLIST PLATES MANAGEMENT */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-red-700 dark:text-red-400" />
                      Placas en Lista de Restricción / Observación ({blacklistedPlates.length})
                    </h4>
                    <p className="text-[11px] text-slate-700 dark:text-slate-200">
                      Cualquier captura de estas matrículas disparará inmediatamente la sirena de seguridad y bloqueará el paso.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 max-w-md">
                  <input
                    type="text"
                    placeholder="Ej. KLR-890, SUS-001..."
                    value={newBlacklistInput}
                    onChange={(e) => setNewBlacklistInput(e.target.value.toUpperCase())}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono flex-1 uppercase"
                  />
                  <button
                    onClick={() => {
                      if (newBlacklistInput.trim()) {
                        const clean = newBlacklistInput.trim().toUpperCase();
                        if (!blacklistedPlates.includes(clean)) {
                          setBlacklistedPlates([...blacklistedPlates, clean]);
                        }
                        setNewBlacklistInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition-colors"
                  >
                    Agregar Placa
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {blacklistedPlates.map((plate) => (
                    <span
                      key={plate}
                      className="px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-500/40 text-red-800 dark:text-red-300 font-mono text-xs font-bold flex items-center space-x-1.5"
                    >
                      <span>{plate}</span>
                      <button
                        onClick={() => setBlacklistedPlates(blacklistedPlates.filter(p => p !== plate))}
                        className="text-red-700 dark:text-red-400 hover:text-white font-bold text-xs"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS HISTORY */}
        {activeTab === 'logs' && (
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-300" />
                <input
                  type="text"
                  placeholder="Buscar por número de placa, marca o cámara..."
                  value={searchLogQuery}
                  onChange={(e) => setSearchLogQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <span className="text-xs text-slate-700 dark:text-slate-200 font-mono">
                Total Registros: {filteredLogs.length}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex-1 overflow-y-auto max-h-[460px]">
              {filteredLogs.length > 0 ? (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3">Hora / Fecha</th>
                      <th className="p-3">Cámara IP</th>
                      <th className="p-3">Placa Detectada</th>
                      <th className="p-3">Categoría</th>
                      <th className="p-3">Marca / Color</th>
                      <th className="p-3 text-center">Precisión IA</th>
                      <th className="p-3 text-right">Acción Talanquera</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-700 dark:text-slate-200">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white dark:bg-slate-900/50 transition-colors">
                        <td className="p-3 font-mono text-slate-700 dark:text-slate-200">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.cameraType === 'entry' ? 'bg-cyan-500/20 text-cyan-800 dark:text-cyan-300' : 'bg-purple-500/20 text-purple-800 dark:text-purple-300'
                          }`}>
                            {log.cameraName}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-700 dark:text-amber-400 text-sm">
                          {log.plateNumber}
                        </td>
                        <td className="p-3 capitalize">{log.vehicleType}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{log.brand} - {log.color}</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {log.confidenceScore}%
                        </td>
                        <td className="p-3 text-right">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                            Apertura OK
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-slate-600 dark:text-slate-300 text-xs">
                  No hay capturas registradas aún. Pruebe el módulo en la pestaña &quot;Lector de Entrada&quot;.
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
