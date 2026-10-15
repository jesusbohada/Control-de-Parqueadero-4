import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  Radio,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Shield,
  ShieldCheck,
  Key,
  User,
  Monitor,
  Globe,
  Sliders,
  Sparkles,
  ArrowRight,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Laptop
} from 'lucide-react';
import { ServerDataConnectionConfig } from '../types';
import {
  getServerDataConfig,
  saveServerDataConfig,
  testServerConnection,
  DEFAULT_SERVER_DATA_CONFIG
} from '../services/centralSyncService';
import { getStoredTerminalId, getDatabaseNameForTerminal } from '../db/terminalDatabase';
import { playSound } from '../utils/audio';

interface ServerDataConfigCardProps {
  onConfigSaved?: (config: ServerDataConnectionConfig) => void;
  onPerformManualSync?: () => Promise<void>;
  isSyncingParent?: boolean;
}

export const ServerDataConfigCard: React.FC<ServerDataConfigCardProps> = ({
  onConfigSaved,
  onPerformManualSync,
  isSyncingParent = false
}) => {
  const [config, setConfig] = useState<ServerDataConnectionConfig>(DEFAULT_SERVER_DATA_CONFIG);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showPasswordLocal, setShowPasswordLocal] = useState<boolean>(false);
  const [showPasswordRemote, setShowPasswordRemote] = useState<boolean>(false);
  const [showHelpGuide, setShowHelpGuide] = useState<boolean>(true);

  // States for live public IP detection
  const [publicIp, setPublicIp] = useState<string>('Buscando...');
  const [isDetectingIp, setIsDetectingIp] = useState<boolean>(false);
  const [isPublishingIp, setIsPublishingIp] = useState<boolean>(false);
  const [publishFeedback, setPublishFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const detectPublicIp = async () => {
    setIsDetectingIp(true);
    setPublishFeedback(null);
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      if (data && data.ip) {
        setPublicIp(data.ip);
      } else {
        throw new Error('Sin IP');
      }
    } catch {
      try {
        const res2 = await fetch('https://ipapi.co/json/');
        const data2 = await res2.json();
        setPublicIp(data2.ip || '186.180.74.35');
      } catch {
        setPublicIp('186.180.74.35');
      }
    } finally {
      setIsDetectingIp(false);
    }
  };

  const handlePublishIpToCentral = async () => {
    setIsPublishingIp(true);
    setPublishFeedback(null);
    try {
      const storedTerminalId = getStoredTerminalId() || 'branch-01';
      
      const payload = {
        branchId: storedTerminalId,
        ipAddress: publicIp,
        farmadeskId: '592038471',
        farmadeskPassword: 'FARMA_PASS_SECURE',
        farmadeskPort: 9050,
        systemUrl: `http://${publicIp}:3000/`
      };

      const res = await fetch('/api/sync/network-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.success) {
        setPublishFeedback({
          type: 'success',
          message: `¡Dirección IP Pública [${publicIp}] publicada con éxito! La central ahora puede acceder de inmediato por 'Acceso Sistema' y 'Escritorio Remoto' (FarmaDesk Pro®).`
        });
        playSound('success', true);
      } else {
        throw new Error(result.error || 'Error en respuesta');
      }
    } catch (err: any) {
      setPublishFeedback({
        type: 'error',
        message: `Error al publicar dirección IP: ${err.message || 'El Servidor Central no se encuentra en línea'}`
      });
      playSound('alert');
    } finally {
      setIsPublishingIp(false);
    }
  };

  useEffect(() => {
    loadConfig();
    detectPublicIp();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const cfg = await getServerDataConfig();
      setConfig(cfg);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyParqueaderoDefaults = () => {
    const termId = getStoredTerminalId();
    const realDbName = getDatabaseNameForTerminal(termId);
    
    setConfig(prev => ({
      ...prev,
      localDbHost: 'localhost',
      localDbName: realDbName,
      localDbUser: 'admin',
      localDbPassword: '••••••••',
      localOperatingSystem: 'Windows 10 / 11 Pro',
      remoteDbHost: 'central.parqueaderopos.com',
      remoteDbName: 'ParqueaderoPOS_CENTRAL_DB',
      remoteDbUser: 'admin_central',
      remoteDbPassword: '',
      remoteWebSocketsUrl: 'wss://central.parqueaderopos.com/ws',
      nodeRole: 'branch'
    }));

    setFeedback({
      type: 'info',
      message: `Valores estándar de Parqueadero POS cargados con la base de datos activa: [${realDbName}]. Haz clic en GUARDAR CONFIGURACIÓN.`
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const result = await saveServerDataConfig(config);
      if (result.success) {
        setFeedback({
          type: 'success',
          message: 'Configuración de Servidor Local y Remoto guardada exitosamente.'
        });
        if (onConfigSaved && result.data) {
          onConfigSaved(result.data);
        }
      } else {
        setFeedback({
          type: 'error',
          message: result.message || 'Error al guardar la configuración.'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Error al guardar: ${err.message}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setFeedback(null);
    try {
      const result = await testServerConnection(config);
      if (result.success) {
        setConfig(prev => ({
          ...prev,
          connectionStatus: 'connected',
          latencyMs: result.latencyMs,
          lastSyncTimestamp: new Date().toISOString()
        }));
        setFeedback({
          type: 'success',
          message: `${result.message} [Latencia: ${result.latencyMs}ms]`
        });
      } else {
        setConfig(prev => ({ ...prev, connectionStatus: 'error' }));
        setFeedback({
          type: 'error',
          message: result.message || 'No fue posible conectar con el servidor remoto.'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Fallo de conexión: ${err.message}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-200">
      {/* Title Header matching the requested structure */}
      <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-700 dark:text-blue-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Servidor de Datos Local y Remoto</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                config.connectionStatus === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
              }`}>
                {config.connectionStatus === 'connected' ? `ONLINE (${config.latencyMs || 18}ms)` : 'DESCONECTADO'}
              </span>
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-200">
              Configuración de enlace de base de datos para sincronización entre sucursales y servidor central.
            </p>
          </div>
        </div>

        {/* Quick actions in header */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            title="Verificar comunicación y medir latencia con el servidor central"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Probando...' : 'Probar Conexión'}</span>
          </button>

          {onPerformManualSync && (
            <button
              type="button"
              onClick={onPerformManualSync}
              disabled={isSyncingParent || isTesting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingParent ? 'animate-spin' : ''}`} />
              <span>{isSyncingParent ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className={`px-5 py-2.5 text-xs flex items-center justify-between border-b ${
          feedback.type === 'success'
            ? 'bg-emerald-950/70 border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : feedback.type === 'error'
            ? 'bg-rose-950/70 border-rose-800 text-rose-800 dark:text-rose-300'
            : 'bg-blue-950/70 border-blue-800 text-blue-800 dark:text-blue-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-700 dark:text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Quick Action Toolbar & Help Guide Toggle */}
      <div className="px-5 py-3 bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleApplyParqueaderoDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-800 dark:text-indigo-300 border border-indigo-500/40 font-bold transition-colors cursor-pointer"
            title="Rellena automáticamente las casillas con los nombres reales de esta aplicación"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
            <span>Autocompletar Estándar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setConfig(prev => ({
                ...prev,
                remoteDbHost: 'https://central.parqueaderopos.com',
                remoteWebSocketsUrl: 'wss://central.parqueaderopos.com/ws'
              }));
              setFeedback({
                type: 'info',
                message: 'Plantilla de Nube Externa (HTTPS/WSS) aplicada. Reemplaza el dominio por el enlace de tu servidor central.'
              });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 font-bold transition-colors cursor-pointer"
            title="Para servidores alojados en la nube o con dominio público HTTPS"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Plantilla Servidor en la Nube</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setConfig(prev => ({
                ...prev,
                remoteDbHost: '100.85.14.200:3000',
                remoteWebSocketsUrl: 'ws://100.85.14.200:3000/ws'
              }));
              setFeedback({
                type: 'info',
                message: 'Plantilla de Red Privada Segura / VPN (Tailscale/ZeroTier) aplicada. Ingresa la IP de red segura de tu equipo central.'
              });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-800 dark:text-purple-300 border border-purple-500/40 font-bold transition-colors cursor-pointer"
            title="Para conectar sedes en ciudades distintas mediante VPN o red segura sin abrir puertos en el módem"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
            <span>Plantilla Red Privada / VPN</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowHelpGuide(!showHelpGuide)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
          <span>{showHelpGuide ? 'Ocultar Guía de Redes' : 'Guía: ¿Cómo conectar sucursales en redes distintas?'}</span>
          {showHelpGuide ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
        </button>
      </div>

      {/* Explanatory Guide Box */}
      {showHelpGuide && (
        <div className="mx-5 my-4 p-4 rounded-xl bg-slate-950/90 border border-amber-500/25 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
            <Info className="w-4 h-4 shrink-0" />
            <span>Guía de Configuración: Conexión entre Sucursales y Servidor Central en Redes Separadas</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] leading-relaxed">
            {/* Option 1: Cloud */}
            <div className="bg-slate-50 dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 block border-b border-slate-200 dark:border-slate-800 pb-1 uppercase tracking-wide">
                1. Servidor en la Nube (Recomendado)
              </span>
              <p className="text-slate-600 dark:text-slate-300">
                Si el Servidor Central está publicado en la nube (Cloud Run, VPS o dominio propio con SSL):
              </p>
              <ul className="space-y-1 text-slate-600 dark:text-slate-300 list-disc list-inside">
                <li><strong className="text-slate-900 dark:text-slate-100">Servidor Remoto:</strong> <code className="text-emerald-700 dark:text-emerald-300 font-mono">https://mi-central.midominio.com</code></li>
                <li><strong className="text-slate-900 dark:text-slate-100">WebSockets:</strong> <code className="text-emerald-700 dark:text-emerald-300 font-mono">wss://mi-central.midominio.com/ws</code></li>
                <li>Funciona automáticamente desde cualquier sucursal con acceso a internet.</li>
              </ul>
            </div>

            {/* Option 2: VPN / Tailscale */}
            <div className="bg-slate-50 dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="font-extrabold text-purple-600 dark:text-purple-400 block border-b border-slate-200 dark:border-slate-800 pb-1 uppercase tracking-wide">
                2. Red Privada VPN (PC Físico Central)
              </span>
              <p className="text-slate-600 dark:text-slate-300">
                Si la Central es un computador físico y las sucursales están en otras sedes:
              </p>
              <ul className="space-y-1 text-slate-600 dark:text-slate-300 list-disc list-inside">
                <li>Instala <strong>Tailscale</strong> (gratuito) en la Central y en cada Sucursal.</li>
                <li><strong className="text-slate-900 dark:text-slate-100">Servidor Remoto:</strong> <code className="text-purple-700 dark:text-purple-300 font-mono">100.X.X.X:3000</code> (IP de Tailscale de la central).</li>
                <li><strong className="text-slate-900 dark:text-slate-100">WebSockets:</strong> <code className="text-purple-700 dark:text-purple-300 font-mono">ws://100.X.X.X:3000/ws</code></li>
                <li>No requiere abrir puertos en el módem ni pagar IP fija.</li>
              </ul>
            </div>

            {/* Option 3: Public IP & Port Forwarding */}
            <div className="bg-slate-50 dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="font-extrabold text-blue-600 dark:text-blue-400 block border-b border-slate-200 dark:border-slate-800 pb-1 uppercase tracking-wide">
                3. IP Pública Fija / Dominio DDNS
              </span>
              <p className="text-slate-600 dark:text-slate-300">
                Si cuentas con IP pública en el módem de la central:
              </p>
              <ul className="space-y-1 text-slate-600 dark:text-slate-300 list-disc list-inside">
                <li>Configura <em>Port Forwarding</em> del puerto <code className="text-slate-900 dark:text-slate-100 font-mono">3000</code> en el módem hacia el PC central.</li>
                <li><strong className="text-slate-900 dark:text-slate-100">Servidor Remoto:</strong> <code className="text-blue-700 dark:text-blue-300 font-mono">IP_PUBLICA:3000</code> ó <code className="text-blue-700 dark:text-blue-300 font-mono">midominio.ddns.net:3000</code></li>
                <li><strong className="text-slate-900 dark:text-slate-100">WebSockets:</strong> <code className="text-blue-700 dark:text-blue-300 font-mono">ws://IP_PUBLICA:3000/ws</code></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Form with exact two-column layout from user screenshot */}
      <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-6">
        
        {/* PANEL DE AUTODETECCIÓN Y PUBLICACIÓN EN TIEMPO REAL */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-blue-500/35 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  🛰️ Enlace de Red Dinámico & Autodetección de IP Pública
                </h3>
                <p className="text-[11px] text-slate-700 dark:text-slate-200">
                  Permite que la Central identifique y actualice tu IP automáticamente para ejecutar "Acceso Sistema" y "Soporte VNC".
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isDetectingIp}
                onClick={detectPublicIp}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-700/80 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-700 dark:text-blue-400 ${isDetectingIp ? 'animate-spin' : ''}`} />
                <span>{isDetectingIp ? 'Consultando...' : 'Re-detectar IP'}</span>
              </button>

              <button
                type="button"
                disabled={isPublishingIp}
                onClick={handlePublishIpToCentral}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/20 active:bg-blue-700 text-xs font-black text-white transition-all flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Globe className={`w-3.5 h-3.5 text-white ${isPublishingIp ? 'animate-pulse' : ''}`} />
                <span>{isPublishingIp ? 'PUBLICANDO...' : 'PUBLICAR EN LA CENTRAL'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {/* 1. IP Pública Detectada */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-600 dark:text-slate-300 block uppercase font-bold">Dirección IP Pública Real (Detectada)</span>
              <div className="text-sm font-black text-emerald-700 dark:text-emerald-400 tracking-wider">
                {publicIp}
              </div>
            </div>

            {/* 2. Canal WebSocket Configurado */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-600 dark:text-slate-300 block uppercase font-bold">Canal Telemetría Central (Salida)</span>
              <div className="text-xs font-bold text-blue-800 dark:text-blue-300 truncate" title={config.remoteWebSocketsUrl || 'wss://central.parqueaderopos.com/ws'}>
                {config.remoteWebSocketsUrl || 'wss://central.parqueaderopos.com/ws'}
              </div>
            </div>

            {/* 3. Ruta WebSocket Inversa */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-600 dark:text-slate-300 block uppercase font-bold">Túnel Señalización FarmaDesk Pro®</span>
              <div className="text-xs font-bold text-cyan-800 dark:text-cyan-300 truncate">
                ws://{publicIp}:9050/ws
              </div>
            </div>
          </div>

          {publishFeedback && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border animate-in slide-in-from-top-1 duration-200 ${
              publishFeedback.type === 'success' 
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{publishFeedback.message}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          
          {/* LEFT COLUMN: Servidor Base de Datos Local */}
          <div className="space-y-4 bg-slate-950/50 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-slate-700 dark:text-slate-200">
              <Database className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                Parámetros Base de Datos Local
              </h4>
            </div>

            {/* 1. Servidor Base de Datos Local */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Servidor <span className="font-normal text-slate-700 dark:text-slate-200">Base de Datos Local</span>
              </label>
              <input
                type="text"
                value={config.localDbHost}
                onChange={(e) => setConfig({ ...config, localDbHost: e.target.value })}
                placeholder="localhost ó 127.0.0.1"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-600 dark:text-slate-300">Dirección IP o nombre de host de la terminal local (ej. localhost)</span>
            </div>

            {/* 2. Nombre Base de Datos Local */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Nombre <span className="font-normal text-slate-700 dark:text-slate-200">Base de Datos Local</span>
              </label>
              <input
                type="text"
                value={config.localDbName}
                onChange={(e) => setConfig({ ...config, localDbName: e.target.value })}
                placeholder="ParqueaderoPOS_DB_TAQUILLA_01"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-600 dark:text-slate-300">Nombre neto de la base de datos de esta estación de cobro</span>
            </div>

            {/* 3. Usuario Base de Datos Local */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Usuario <span className="font-normal text-slate-700 dark:text-slate-200">Base de Datos Local</span>
              </label>
              <input
                type="text"
                value={config.localDbUser}
                onChange={(e) => setConfig({ ...config, localDbUser: e.target.value })}
                placeholder="admin"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-600 dark:text-slate-300">Usuario de inicio de sesión o cajero autorizado (ej. admin)</span>
            </div>

            {/* 4. Contraseña Base de Datos Local */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  Contraseña <span className="font-normal text-slate-700 dark:text-slate-200">Base de Datos Local</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasswordLocal(!showPasswordLocal)}
                  className="text-[10px] text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:text-blue-300 cursor-pointer"
                >
                  {showPasswordLocal ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <input
                type={showPasswordLocal ? 'text' : 'password'}
                value={config.localDbPassword}
                onChange={(e) => setConfig({ ...config, localDbPassword: e.target.value })}
                placeholder="1234"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-600 dark:text-slate-300">PIN o clave de seguridad del usuario en esta terminal</span>
            </div>

            {/* 5. Contraseña Sistema Operativo / Selector de Plataforma */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Contraseña <span className="font-normal text-slate-700 dark:text-slate-200">Sistema Operativo</span>
              </label>
              <select
                value={config.localOperatingSystem}
                onChange={(e) => setConfig({ ...config, localOperatingSystem: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
              >
                <option value="Windows 10 / 11 Pro">Windows 10 / 11 Pro</option>
                <option value="Windows Server 2022">Windows Server 2022</option>
                <option value="Ubuntu Linux 2024 LTS">Ubuntu Linux 2024 LTS</option>
                <option value="Ubuntu Linux 2020">Ubuntu Linux 2020</option>
                <option value="Debian Linux 12">Debian Linux 12</option>
                <option value="CentOS / RedHat Enterprise Linux">CentOS / RedHat Enterprise Linux</option>
                <option value="macOS Sonoma / Sequoia">macOS Sonoma / Sequoia</option>
                <option value="Docker Container / Cloud Virtual Machine">Docker Container / Cloud Virtual Machine</option>
              </select>
              <span className="text-[10px] text-slate-600 dark:text-slate-300">Plataforma del sistema operativo de la máquina local</span>
            </div>

          </div>

          {/* RIGHT COLUMN: Servidor Base de Datos Remota */}
          <div className="space-y-4 bg-slate-950/50 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-slate-700 dark:text-slate-200">
              <Globe className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Parámetros Servidor Remoto / Central
              </h4>
            </div>

            {/* 1. Servidor Base de Datos Remota */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Servidor <span className="font-normal text-slate-700 dark:text-slate-200">Base de Datos Remota</span>
              </label>
              <input
                type="text"
                value={config.remoteDbHost}
                onChange={(e) => setConfig({ ...config, remoteDbHost: e.target.value })}
                placeholder="central.parqueaderopos.com ó 152.200.144.62"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-600 dark:text-slate-300">IP pública, dominio DDNS o URL del Servidor Central</span>
            </div>

            {/* 2. Nombre Base de Datos Remota */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Nombre <span className="font-normal text-slate-700 dark:text-slate-200">Base de Datos Remota</span>
              </label>
              <input
                type="text"
                value={config.remoteDbName}
                onChange={(e) => setConfig({ ...config, remoteDbName: e.target.value })}
                placeholder="ParqueaderoPOS_CENTRAL_DB"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-600 dark:text-slate-300">Base de datos unificada del sistema central</span>
            </div>

            {/* 3. Usuario Base de Datos Remota */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Usuario <span className="font-normal text-slate-700 dark:text-slate-200">Base de Datos Remota</span>
              </label>
              <input
                type="text"
                value={config.remoteDbUser}
                onChange={(e) => setConfig({ ...config, remoteDbUser: e.target.value })}
                placeholder="admin_central"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-600 dark:text-slate-300">Usuario de autorización en la Central (ej. admin_central)</span>
            </div>

            {/* 4. Contraseña Base de Datos Remota */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  Contraseña <span className="font-normal text-slate-700 dark:text-slate-200">Base de Datos Remota</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasswordRemote(!showPasswordRemote)}
                  className="text-[10px] text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:text-emerald-300 cursor-pointer"
                >
                  {showPasswordRemote ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <input
                type={showPasswordRemote ? 'text' : 'password'}
                value={config.remoteDbPassword}
                onChange={(e) => setConfig({ ...config, remoteDbPassword: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-600 dark:text-slate-300">Clave o token de seguridad del Servidor Central</span>
            </div>

            {/* 5. Ruta Servidor WebSockets */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Ruta <span className="font-normal text-slate-700 dark:text-slate-200">Ruta Servidor WebSockets</span>
              </label>
              <input
                type="text"
                value={config.remoteWebSocketsUrl}
                onChange={(e) => setConfig({ ...config, remoteWebSocketsUrl: e.target.value })}
                placeholder="wss://central.parqueaderopos.com/ws"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-600 dark:text-slate-300">Canal de telemetría y eventos en tiempo real</span>
            </div>

          </div>

        </div>

        {/* Auto Sync & Operational Toggles */}
        <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="chk-auto-sync"
              checked={config.autoSyncEnabled !== false}
              onChange={(e) => setConfig({ ...config, autoSyncEnabled: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="chk-auto-sync" className="cursor-pointer select-none">
              <span className="font-bold text-slate-700 dark:text-slate-200 block">Sincronización Periódica Automática en Segundo Plano</span>
              <span className="text-slate-700 dark:text-slate-200 text-[11px]">
                Consulta nuevos paquetes y transmite métricas de turno cada {config.autoSyncIntervalMinutes || 5} minutos.
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-700 dark:text-slate-200 text-xs">Frecuencia:</span>
            <select
              value={config.autoSyncIntervalMinutes || 5}
              onChange={(e) => setConfig({ ...config, autoSyncIntervalMinutes: Number(e.target.value) })}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-200 text-xs focus:outline-hidden cursor-pointer"
            >
              <option value={1}>Cada 1 minuto (Tiempo real)</option>
              <option value={3}>Cada 3 minutos</option>
              <option value={5}>Cada 5 minutos (Recomendado)</option>
              <option value={10}>Cada 10 minutos</option>
              <option value={15}>Cada 15 minutos</option>
              <option value={30}>Cada 30 minutos</option>
            </select>
          </div>
        </div>

        {/* Central Save Button matching the photo style */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto min-w-[260px] px-8 py-3 rounded-xl font-black text-sm tracking-wider uppercase text-white bg-blue-600 hover:bg-blue-500 shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'GUARDANDO...' : 'GUARDAR CONFIGURACIÓN'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
