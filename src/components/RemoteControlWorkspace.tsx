import React, { useState } from 'react';
import {
  Monitor,
  Radio,
  Zap,
  Activity,
  CheckCircle2,
  XCircle,
  Wifi,
  ShieldCheck,
  Building2,
  MapPin,
  RefreshCw,
  Send,
  Terminal,
  Clock,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { BranchLocation, SystemUser, RemoteExecutionOrder, RemoteCommandType } from '../types';
import { playSound } from '../utils/audio';
import { testRemoteBranch, RemoteTestResult } from '../services/remoteControlService';

interface ActiveRemoteSession {
  branchId: string;
  branchName: string;
  city: string;
  ipAddress: string;
  connectedAt: string;
  pingMs: number;
  mode: 'system' | 'desktop';
}

interface RemoteControlWorkspaceProps {
  branches: BranchLocation[];
  activeRemoteSession: ActiveRemoteSession | null;
  onConnectRemoteBranch: (branch: BranchLocation, mode: 'system' | 'desktop') => void;
  onExitRemoteSession: () => void;
  onExecuteRemoteOrder: (order: Omit<RemoteExecutionOrder, 'id' | 'commandNumber' | 'issuedAt' | 'status'>) => void;
  remoteOrders: RemoteExecutionOrder[];
  currentUser: SystemUser;
  onOpenDocsModal?: () => void;
}

export const RemoteControlWorkspace: React.FC<RemoteControlWorkspaceProps> = ({
  branches,
  activeRemoteSession,
  onConnectRemoteBranch,
  onExitRemoteSession,
  onExecuteRemoteOrder,
  remoteOrders,
  currentUser,
  onOpenDocsModal
}) => {
  const [testingBranchId, setTestingBranchId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, RemoteTestResult>>({});
  const [connectingBranchId, setConnectingBranchId] = useState<string | null>(null);

  // Estados del despachador de órdenes
  const [targetBranchId, setTargetBranchId] = useState<string>(branches[0]?.id || 'all');
  const [commandType, setCommandType] = useState<RemoteCommandType>('ping_telemetry');
  const [customMsg, setCustomMsg] = useState('Notificación de Control Central: Operación nominal y sin novedades.');
  const [isExecuting, setIsExecuting] = useState(false);

  const handleTestIp = async (branch: BranchLocation) => {
    setTestingBranchId(branch.id);
    playSound('beep');
    try {
      const res = await testRemoteBranch(branch);
      setTestResults(prev => ({ ...prev, [branch.id]: res }));
      playSound('success');
    } catch {
      // fallback
    } finally {
      setTestingBranchId(null);
    }
  };

  const handleConnect = (branch: BranchLocation, mode: 'system' | 'desktop') => {
    setConnectingBranchId(`${branch.id}-${mode}`);
    playSound('beep');
    setTimeout(() => {
      onConnectRemoteBranch(branch, mode);
      setConnectingBranchId(null);
    }, 900);
  };

  const handleDispatchOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsExecuting(true);
    playSound('beep');

    const targetB = branches.find(b => b.id === targetBranchId);
    const targetBranchName = targetBranchId === 'all' ? 'Todas las Sedes' : (targetB?.name || 'Sucursal');

    setTimeout(() => {
      onExecuteRemoteOrder({
        branchId: targetBranchId,
        branchName: targetBranchName,
        commandType: commandType,
        title: `Orden Remota: ${commandType}`,
        description: customMsg,
        parameters: { message: customMsg },
        issuedBy: currentUser.name || 'Administrador Central'
      });
      setIsExecuting(false);
      playSound('success');
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal del Módulo */}
      <div className="bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 border border-slate-200 dark:border-blue-500/40 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-500/40">
              Módulo de Asistencia & Control Central
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-600 dark:text-slate-300">
              Protocolo RFB/VNC & Tunnel TLS
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Monitor className="w-6 h-6 text-blue-700 dark:text-blue-400" />
            Consola de Control Remoto & Escritorio VNC de Sedes
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-3xl">
            Acceda en tiempo real a las sucursales para asistencia de pantalla completa VNC o concurrencia transparente sobre el sistema POS sin interferir con la caja.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {onOpenDocsModal && (
            <button
              type="button"
              onClick={onOpenDocsModal}
              className="px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-800 dark:text-indigo-300 hover:text-white border border-indigo-500/50 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-lg"
              title="Ver Guía de Scripts .BAT y Orden de Ejecución"
            >
              <BookOpen className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
              <span>📚 Guía & Documentación .BAT</span>
            </button>
          )}

          {activeRemoteSession && (
            <div className="bg-emerald-950/80 border border-emerald-500/60 p-3 rounded-xl flex items-center gap-3 animate-pulse">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">SESIÓN ACTIVA: {activeRemoteSession.branchName}</div>
                <div className="text-[10px] font-mono text-slate-600 dark:text-slate-300">
                  IP: {activeRemoteSession.ipAddress} • {activeRemoteSession.mode === 'system' ? 'Sistema POS' : 'Escritorio VNC'}
                </div>
              </div>
              <button
                type="button"
                onClick={onExitRemoteSession}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-sm"
              >
                Desconectar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid de Sucursales Registradas con Estado y Controles Remotos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Directorio de Sedes ({branches.length}) & Acceso Remoto
          </h3>
          <span className="text-xs font-mono text-slate-700 dark:text-slate-200">Verificando en red local y nube</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map(branch => {
            const result = testResults[branch.id];
            const isTesting = testingBranchId === branch.id;
            const isConnectingSystem = connectingBranchId === `${branch.id}-system`;
            const isConnectingDesktop = connectingBranchId === `${branch.id}-desktop`;
            const isCurrentActive = activeRemoteSession?.branchId === branch.id;

            return (
              <div
                key={branch.id}
                className={`bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 transition-all space-y-3 flex flex-col justify-between shadow-xs ${
                  isCurrentActive
                    ? 'border-emerald-500 shadow-lg shadow-emerald-500/10'
                    : 'border-slate-800 hover:border-blue-500/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-slate-700 font-bold">
                        {branch.code}
                      </span>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{branch.name}</h4>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      branch.status === 'online' || isCurrentActive
                        ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40'
                    }`}>
                      {branch.status === 'online' || isCurrentActive ? '🟢 En Línea' : '🟠 Esperando'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 shrink-0" />
                    <span>{branch.city} — {branch.address}</span>
                  </p>

                  <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 dark:text-slate-200">Host / Puerto:</span>
                      <span className="font-bold text-sky-800 dark:text-sky-300">{branch.ipAddress || '192.168.1.100'}:{branch.port || 3000}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 dark:text-slate-200">ID FarmaDesk Pro:</span>
                      <span className="font-bold text-cyan-800 dark:text-cyan-300">{branch.farmadeskId || branch.rustdeskId || branch.anydeskId || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 dark:text-slate-200">Bodega:</span>
                      <span className="text-slate-600 dark:text-slate-300 truncate max-w-[140px]">{branch.warehouseName || 'General'}</span>
                    </div>
                  </div>

                  {/* Resultado del Test IP */}
                  {result && (
                    <div className="mt-2 p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-[11px] font-mono flex items-center justify-between">
                      <span>{result.message}</span>
                      <span className="font-bold bg-emerald-500/30 px-1.5 py-0.2 rounded text-[10px]">{result.latencyMs}ms</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleTestIp(branch)}
                    disabled={isTesting}
                    className="w-full py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Zap className={`w-3.5 h-3.5 text-amber-700 dark:text-amber-400 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Probando IP...' : 'Probar Latencia IP & Puertos'}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleConnect(branch, 'system')}
                      disabled={isConnectingSystem}
                      className="py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                      title="Ingresar concurrentemente al sistema de taquilla y cobro de esta sede"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>{isConnectingSystem ? 'Conectando...' : 'Sistema POS'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConnect(branch, 'desktop')}
                      disabled={isConnectingDesktop}
                      className="py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all active:scale-95 border border-indigo-400/40"
                      title="Abrir escritorio remoto FarmaDesk Pro con control interactivo de pantalla y comandos"
                    >
                      <Monitor className="w-3.5 h-3.5 animate-pulse text-cyan-800 dark:text-cyan-300" />
                      <span>{isConnectingDesktop ? 'Abriendo...' : '🖥️ FarmaDesk Pro'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel Despachador de Comandos y Órdenes Remotas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-purple-700 dark:text-purple-400" />
          Despachador de Comandos Remotos & Difusión Central
        </h3>

        <form onSubmit={handleDispatchOrder} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Sede Destino:</label>
            <select
              value={targetBranchId}
              onChange={(e) => setTargetBranchId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium cursor-pointer"
            >
              <option value="all">🌐 Todas las Sedes ({branches.length})</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.code} - {b.name} ({b.city})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">Tipo de Orden Remota:</label>
            <select
              value={commandType}
              onChange={(e) => setCommandType(e.target.value as RemoteCommandType)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium cursor-pointer"
            >
              <option value="ping_telemetry">📡 Telemetría y Latencia</option>
              <option value="force_full_sync">🔄 Forzar Sincronización Inmediata</option>
              <option value="restart_pos_app">⚡ Reiniciar Servicio POS</option>
              <option value="backup_db_now">💾 Copia de Seguridad Instantánea</option>
              <option value="broadcast_message">📢 Enviar Notificación a Pantalla Cajero</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isExecuting}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${isExecuting ? 'animate-bounce' : ''}`} />
              <span>{isExecuting ? 'Transmitiendo...' : 'Despachar Orden Remota'}</span>
            </button>
          </div>
        </form>

        {/* Historial de Comandos Recientes */}
        {remoteOrders.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Últimas Órdenes Despachadas:</h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar text-xs font-mono">
              {remoteOrders.slice(0, 5).map(ord => (
                <div key={ord.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-slate-800 dark:text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span className="font-bold text-purple-800 dark:text-purple-300">{ord.commandNumber}</span>
                    <span>→ {ord.branchName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-700 dark:text-slate-200">
                    <span>{ord.resultMessage || 'OK'}</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">{ord.executionTimeMs}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
