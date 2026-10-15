import React, { useState } from 'react';
import {
  FileText,
  X,
  Download,
  Copy,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Play,
  Monitor,
  Radio,
  Server,
  Network,
  Settings,
  ChevronRight,
  ChevronDown,
  Layers,
  HelpCircle,
  Code,
  Sparkles,
  Zap,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Cpu,
  RefreshCw,
  FolderOpen,
  Info,
  Check,
  Workflow
} from 'lucide-react';
import { playSound } from '../utils/audio';

interface FarmaDeskDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId?: string;
  serverUrl?: string;
}

interface ScriptInfo {
  id: string;
  name: string;
  path: string;
  category: 'cliente' | 'servidor' | 'config' | 'utilidad';
  categoryLabel: string;
  summary: string;
  targetMachine: 'PC de la Sucursal (Cajero)' | 'Servidor Central' | 'Cualquier Equipo' | 'Servidor Central o PC Local POS';
  permissions: 'Usuario Estándar' | 'Administrador (Requerido)';
  downloadUrl: string;
  codeSnippet: string;
  description: string;
  argumentsAndPrompts: string[];
  executionOrderPosition: string;
  orderBadge: string;
}

export const FarmaDeskDocsModal: React.FC<FarmaDeskDocsModalProps> = ({
  isOpen,
  onClose,
  branchId = 'branch-01',
  serverUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:9050` : 'http://localhost:9050'
}) => {
  const [activeTab, setActiveTab] = useState<'scenarios' | 'directory' | 'cheatsheet' | 'simulator' | 'architecture'>('scenarios');
  const [selectedScenario, setSelectedScenario] = useState<number>(0);
  const [selectedScriptId, setSelectedScriptId] = useState<string>('farmadesk-exe');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Custom server configuration in modal (FarmaDesk default Port 9050)
  const [customServerUrl, setCustomServerUrl] = useState<string>(serverUrl);
  const [customBranchId, setCustomBranchId] = useState<string>(branchId);

  // Estados para el simulador de consola interactivo
  const [simOption, setSimOption] = useState<'1' | '2' | '3'>('1');
  const [simConsoleOutput, setSimConsoleOutput] = useState<string[]>([
    '🔵 FarmaDesk Pro [Versión 1.3.0 Corporativa]',
    'Motor Rust Ed25519 de Latencia Ultrabaja & Renderizado GDI 60 FPS',
    'Presione "Simular Ejecución" para verificar el flujo operativo.',
    ''
  ]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  if (!isOpen) return null;

  const scriptsData: ScriptInfo[] = [
    {
      id: 'farmadesk-exe',
      name: 'farmadesk.exe',
      path: '/farmadesk.exe',
      category: 'cliente',
      categoryLabel: 'Cliente Nativo / Rust 60 FPS',
      summary: 'Ejecutable nativo en Rust con aceleración GDI, cifrado asimétrico Ed25519 e identidad fija por equipo.',
      targetMachine: 'PC de la Sucursal (Cajero)',
      permissions: 'Usuario Estándar',
      downloadUrl: '/api/farmadesk/download/farmadesk.exe',
      executionOrderPosition: 'Paso Principal para Control y Asistencia Remota',
      orderBadge: 'NATIVO RUST 60 FPS (Ed25519)',
      description: 'Es el cliente oficial de escritorio remoto para Farmanorte. Desarrollado en Rust con biblioteca eframe/egui y visor nativo de ultra-baja latencia. Permite transferir archivos bidireccionales, gestionar múltiples monitores, ajustar calidad de imagen en tiempo real y ofrece modo espectador silencioso.',
      argumentsAndPrompts: [
        'Doble clic para iniciar la interfaz gráfica en modo ventana fija (19060 single-instance)',
        'Lectura automática de farmadesk_config.json para URL de servidor y parámetros STUN'
      ],
      codeSnippet: `// Ejecución directa de FarmaDesk Pro (Windows / Linux / macOS)\nfarmadesk.exe`
    },
    {
      id: 'iniciar-farmadesk-bat',
      name: 'Iniciar-FarmaDesk.bat',
      path: '/Iniciar-FarmaDesk.bat',
      category: 'cliente',
      categoryLabel: 'Lanzador 1-Clic Windows',
      summary: 'Menú interactivo por lotes para iniciar el cliente, reiniciar procesos colgados o verificar el servidor de señalización.',
      targetMachine: 'Cualquier Equipo',
      permissions: 'Usuario Estándar',
      downloadUrl: '/api/farmadesk/download/Iniciar-FarmaDesk.bat',
      executionOrderPosition: 'Lanzador de Acceso Rápido para Operadores',
      orderBadge: 'LANZADOR POR LOTES',
      description: 'Script que simplifica la operación para cajeros y personal no técnico. Ofrece opciones numéricas para arrancar FarmaDesk, matar instancias duplicadas o abrir el servidor de señalización en puerto 9050.',
      argumentsAndPrompts: [
        'Opción 1: Iniciar FarmaDesk Pro en modo cliente',
        'Opción 2: Reiniciar FarmaDesk Pro de forma limpia',
        'Opción 3: Verificar / Iniciar Servidor de Señalización'
      ],
      codeSnippet: `@echo off\ntitle FarmaDesk Pro - Farmanorte\nstart "" farmadesk.exe`
    },
    {
      id: 'reiniciar-farmadesk-bat',
      name: 'reiniciar_farmadesk.bat',
      path: '/reiniciar_farmadesk.bat',
      category: 'utilidad',
      categoryLabel: 'Mantenimiento Rápido',
      summary: 'Mata el proceso farmadesk.exe y lo reinicia limpiamente en caso de bloqueo o cambio de red.',
      targetMachine: 'PC de la Sucursal (Cajero)',
      permissions: 'Usuario Estándar',
      downloadUrl: '/api/farmadesk/download/reiniciar_farmadesk.bat',
      executionOrderPosition: 'Utilidad de Auto-Recuperación',
      orderBadge: 'TASKKILL & RESTART',
      description: 'Cierra cualquier proceso colgado de farmadesk.exe con taskkill /F y luego lo arranca nuevamente de forma limpia. Ideal para soporte técnico cuando la red sufre micro-cortes.',
      argumentsAndPrompts: [
        'Cierra instancias previas en background',
        'Inicia nueva sesión limpia'
      ],
      codeSnippet: `@echo off\ntaskkill /F /IM farmadesk.exe >nul 2>&1\nping 127.0.0.1 -n 2 >nul\nstart "" farmadesk.exe`
    },
    {
      id: 'farmadesk-config-json',
      name: 'farmadesk_config.json',
      path: '/farmadesk_config.json',
      category: 'config',
      categoryLabel: 'Configuración JSON',
      summary: 'Archivo de persistencia de credenciales, servidores STUN y URL del servidor de señalización.',
      targetMachine: 'Cualquier Equipo',
      permissions: 'Usuario Estándar',
      downloadUrl: '/api/farmadesk/download/farmadesk_config.json',
      executionOrderPosition: 'Configuración Base',
      orderBadge: 'JSON PERMUTABLE',
      description: 'Define la URL de señalización WebSocket (ej: ws://127.0.0.1:9050/ws o IP de red), los servidores STUN públicos y las directivas de control de ratón, teclado, portapapeles y transferencia de archivos.',
      argumentsAndPrompts: [
        'server_url: Dirección del WebSocket de señalización',
        'stun_servers: Lista de servidores STUN de Google y Cloudflare',
        'default_permissions: Permisos predeterminados concedidos a la sesión'
      ],
      codeSnippet: `{\n  "server_url": "ws://127.0.0.1:9050/ws",\n  "stun_servers": [\n    "stun.l.google.com:19302",\n    "stun.cloudflare.com:3478"\n  ],\n  "default_permissions": {\n    "allow_mouse": true,\n    "allow_keyboard": true,\n    "allow_clipboard": true,\n    "allow_file_transfer": true\n  }\n}`
    }
  ];

  const handleCopyCode = (id: string, text: string) => {
    playSound('beep');
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    playSound('beep');
    setSimConsoleOutput([
      '🔵 [FarmaDesk Pro] Inicializando proceso...',
      `[*] Conectando a servidor de señalización: ${customServerUrl}`,
      '[*] Identidad criptográfica Ed25519 cargada exitosamente.',
      `[*] ID FarmaDesk asignado a la sede: ${customBranchId}`,
      '[*] Modo de captura de pantalla: GDI Acelerado 60 FPS.',
      '[OK] Sesión lista para recibir conexiones remotas seguras.'
    ]);
    setTimeout(() => {
      setIsSimulating(false);
      playSound('success');
    }, 1200);
  };

  const currentScript = scriptsData.find(s => s.id === selectedScriptId) || scriptsData[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🔵 FarmaDesk Pro</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                    Farmanorte Edition
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Solución de Escritorio Remoto Nativa en Rust con Aceleración Gráfica y Cifrado Ed25519
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-100/50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('scenarios')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'scenarios'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Guía de Conexión</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'directory'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Binarios & Scripts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'simulator'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Simulador de Conexión</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'architecture'
                ? 'bg-blue-600 text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Arquitectura Rust</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'scenarios' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-xs uppercase">
                    <Zap className="w-4 h-4" />
                    <span>Paso 1: Descargar FarmaDesk</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Descargue el cliente oficial <code>farmadesk.exe</code> o ejecute <code>Iniciar-FarmaDesk.bat</code> en el equipo de la taquilla.
                  </p>
                  <a
                    href="/api/farmadesk/download/farmadesk.exe"
                    download="farmadesk.exe"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar farmadesk.exe</span>
                  </a>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300 font-bold text-xs uppercase">
                    <Radio className="w-4 h-4" />
                    <span>Paso 2: Obtener ID y Contraseña</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Al abrir FarmaDesk Pro, el cliente mostrará un ID numérico fijo de 9 dígitos (ej: <code>770 130 282</code>) y una clave de acceso seguro.
                  </p>
                  <div className="text-[11px] font-mono px-2 py-1 rounded bg-white dark:bg-slate-950 border border-cyan-500/30 text-cyan-800 dark:text-cyan-300 font-bold">
                    ID Fijo Persistente por Hardware
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs uppercase">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Paso 3: Conexión Bidireccional</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Desde el visor central de WolfZone POS, ingrese las credenciales para tomar control total a 60 FPS con sincronización de portapapeles.
                  </p>
                  <div className="text-[11px] font-mono px-2 py-1 rounded bg-white dark:bg-slate-950 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold">
                    Cifrado Ed25519 E2E
                  </div>
                </div>
              </div>

              {/* Direct Fast Action Launcher */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Lanzador Directo Local FarmaDesk Pro
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Inicie el cliente nativo instalado en este equipo o descargue el paquete portable:
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="/api/farmadesk/download/Iniciar-FarmaDesk.bat"
                    download="Iniciar-FarmaDesk.bat"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Iniciar-FarmaDesk.bat</span>
                  </a>
                  <a
                    href="/api/farmadesk/download/farmadesk.exe"
                    download="farmadesk.exe"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>farmadesk.exe (7.2 MB)</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'directory' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Archivos Disponibles</h4>
                {scriptsData.map(script => (
                  <button
                    key={script.id}
                    type="button"
                    onClick={() => setSelectedScriptId(script.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${
                      selectedScriptId === script.id
                        ? 'bg-blue-500/10 border-blue-500 text-blue-900 dark:text-blue-200 shadow-xs'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold text-xs">{script.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{script.categoryLabel}</div>
                  </button>
                ))}
              </div>

              <div className="md:col-span-2 space-y-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-sm text-slate-900 dark:text-white">{currentScript.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                        {currentScript.orderBadge}
                      </span>
                    </div>
                    <a
                      href={currentScript.downloadUrl}
                      download={currentScript.name}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar</span>
                    </a>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {currentScript.description}
                  </p>

                  <div className="relative">
                    <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto border border-slate-800">
                      <code>{currentScript.codeSnippet}</code>
                    </pre>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(currentScript.id, currentScript.codeSnippet)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                    >
                      {copiedId === currentScript.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'simulator' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Prueba el handshake del cliente FarmaDesk Pro con el servidor central:
                </p>
                <button
                  type="button"
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isSimulating ? 'Verificando Handshake...' : 'Simular Ejecución'}</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 font-mono text-xs text-cyan-400 border border-slate-800 space-y-1 min-h-[180px]">
                {simConsoleOutput.map((line, idx) => (
                  <div key={idx} className="leading-relaxed">{line}</div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-xs text-blue-700 dark:text-blue-300 uppercase">
                  Identidad Criptográfica Ed25519
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  A diferencia de soluciones que rotan contraseñas aleatorias que expiran, FarmaDesk Pro genera un par de llaves Ed25519 basado en el hardware de la máquina. El ID permanece constante e inmune a reinicios.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-xs text-cyan-700 dark:text-cyan-300 uppercase">
                  Renderizado GDI a 60 FPS
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Captura optimizada en memoria RAM con detección de regiones sucias (dirty rects). Solo se transmiten los píxeles que cambiaron, reduciendo el consumo de ancho de banda hasta en un 85%.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-xs text-purple-700 dark:text-purple-300 uppercase">
                  Servidor de Señalización en Rust (Puerto 9050)
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  El servidor de relay y rendezvous opera en el puerto 9050 con WebSocket <code>/ws</code> y ruta de diagnóstico <code>/health</code>. Se integra con el POS y permite atravesar routers NAT y firewalls corporativos.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-xs text-emerald-700 dark:text-emerald-300 uppercase">
                  Instancia Única Garantizada (19060)
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Evita que múltiples operadores abran duplicados accidentales mediante un socket de exclusión mutua en el puerto 19060. Si ya está abierto, el segundo intento simplemente enfoca la ventana existente.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono">FarmaDesk Pro v1.3.0 • Puerto Señalización: 9050</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-slate-700 dark:text-slate-200 transition-colors"
          >
            Cerrar Guía
          </button>
        </div>
      </div>
    </div>
  );
};
