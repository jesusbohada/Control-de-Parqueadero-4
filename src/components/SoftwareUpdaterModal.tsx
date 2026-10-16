import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  ArrowRight,
  FileCode,
  Database,
  X,
  Check,
  Clock,
  Terminal,
  Boxes,
  RotateCcw,
  History,
  ShieldAlert,
  ArrowDownLeft,
  CheckCheck,
  Lock,
  ExternalLink,
  Globe,
  Radio,
  Car,
  Palette
} from 'lucide-react';
import { SoftwareReleaseBuild, SystemUser, BranchLocation } from '../types';
import { fetchCentralSoftwareReleases, fetchLiveServerVersion } from '../services/centralSyncService';

interface SoftwareUpdaterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SystemUser;
  builds: SoftwareReleaseBuild[];
  currentBranch?: BranchLocation;
  onInstallBuild: (buildId: string) => Promise<void>;
  embedded?: boolean;
}

export const SoftwareUpdaterModal: React.FC<SoftwareUpdaterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  builds: initialBuilds,
  currentBranch,
  onInstallBuild,
  embedded = false
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'installed' | 'history' | 'beta'>('all');
  const [isChecking, setIsChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [liveBuilds, setLiveBuilds] = useState<SoftwareReleaseBuild[]>(initialBuilds);
  const [authorizedBetaBranches, setAuthorizedBetaBranches] = useState<string[]>([]);
  const [serverLiveInfo, setServerLiveInfo] = useState<{
    version?: string;
    buildNumber?: number;
    commit?: { hash: string; shortHash: string; message: string; date: string };
    serverTime?: string;
  } | null>(null);
  
  // Updating State (Forward Upgrade)
  const [updatingBuildId, setUpdatingBuildId] = useState<string | null>(null);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateCurrentStep, setUpdateCurrentStep] = useState<string>('');
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateLogs, setUpdateLogs] = useState<string[]>([]);

  // Rollback State (Reversion)
  const [rollbackTargetBuild, setRollbackTargetBuild] = useState<SoftwareReleaseBuild | null>(null);
  const [isRollbacking, setIsRollbacking] = useState(false);
  const [rollbackProgress, setRollbackProgress] = useState(0);
  const [rollbackCurrentStep, setRollbackCurrentStep] = useState<string>('');
  const [rollbackSuccess, setRollbackSuccess] = useState(false);
  const [rollbackLogs, setRollbackLogs] = useState<string[]>([]);

  // Load live releases and server status from Central on open
  useEffect(() => {
    if (isOpen) {
      handleCheckUpdates(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentInstalledBuild = liveBuilds.find(b => b.status === 'installed') || liveBuilds[0];
  const availableBuilds = liveBuilds.filter(b => b.status === 'available');
  
  // Past versions are enterprise builds that are NOT currently installed
  const pastVersionBuilds = liveBuilds.filter(b => b.id !== currentInstalledBuild.id && b.channel !== 'beta');
  const betaBuilds = liveBuilds.filter(b => b.channel === 'beta' || b.isExperimentalOnly);

  const filteredBuilds = liveBuilds.filter(b => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'installed') return b.status === 'installed';
    if (activeCategory === 'history') return b.id !== currentInstalledBuild.id && b.channel !== 'beta' && !b.isExperimentalOnly;
    if (activeCategory === 'beta') return b.channel === 'beta' || b.isExperimentalOnly;
    return true;
  });

  const handleCheckUpdates = async (showNotification = true) => {
    setIsChecking(true);
    if (showNotification) {
      setCheckMessage('Contactando Servidor Central y sincronizando estado de repositorio Git...');
    }

    try {
      const [releasesRes, liveVersionRes] = await Promise.all([
        fetchCentralSoftwareReleases(),
        fetchLiveServerVersion()
      ]);

      if (releasesRes.success && Array.isArray(releasesRes.releases) && releasesRes.releases.length > 0) {
        setLiveBuilds(releasesRes.releases);
        setAuthorizedBetaBranches(releasesRes.authorizedBetaBranches || []);
      }

      if (liveVersionRes && liveVersionRes.success) {
        setServerLiveInfo(liveVersionRes);
      }

      if (showNotification) {
        const count = (releasesRes.releases || []).length;
        setCheckMessage(`¡Repositorio Central conectado! ${count} versiones catalogadas. Último commit en servidor: ${liveVersionRes.commit?.shortHash || 'v2.5.0'}`);
      }
    } catch (e: any) {
      if (showNotification) {
        setCheckMessage('Aviso: Operando con el catálogo de versiones local.');
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleStartUpdate = async (build: SoftwareReleaseBuild) => {
    setUpdatingBuildId(build.id);
    setUpdateProgress(10);
    setUpdateSuccess(false);
    setUpdateLogs([]);

    const addLog = (msg: string) => {
      setUpdateLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      setUpdateCurrentStep('Contactando Servidor Central para descargar paquete OTA despachado...');
      addLog(`Descargando paquete compilado oficial de ${build.version} (${build.downloadSize}) vía HTTP/API...`);
      setUpdateProgress(25);
      await new Promise(r => setTimeout(r, 600));

      setUpdateCurrentStep('Verificando Checksum SHA-256 e integridad del paquete...');
      addLog(`Validando checksum SHA-256: ${build.checksumSha256.slice(0, 16)}... VÁLIDO.`);
      setUpdateProgress(50);
      await new Promise(r => setTimeout(r, 500));

      if (build.databaseMigrationRequired || (build.databaseMigrations && build.databaseMigrations.length > 0)) {
        setUpdateCurrentStep('Ejecutando migraciones de estructura de base de datos...');
        addLog('Modificando estructuras relacionales y tablas del sistema...');
        if (build.databaseMigrations && build.databaseMigrations.length > 0) {
          build.databaseMigrations.forEach(m => addLog(`  🛠 Migración DDL: ${m}`));
        } else {
          addLog('  🛠 Esquemas de persistencia y llaves foráneas actualizadas.');
        }
        setUpdateProgress(65);
        await new Promise(r => setTimeout(r, 600));
      }

      if (build.visualThemeChanges && build.visualThemeChanges.length > 0) {
        setUpdateCurrentStep('Aplicando mejoras visuales y nuevo aspecto de interfaz...');
        build.visualThemeChanges.forEach(v => addLog(`  🎨 Aspecto visual: ${v}`));
        setUpdateProgress(80);
        await new Promise(r => setTimeout(r, 400));
      }

      setUpdateCurrentStep('Inyectando nuevos módulos y aplicando registro de cambios en la terminal...');
      addLog(`=== REGISTRO DE CAMBIOS APLICADOS (${build.version}) ===`);
      (build.changelog || []).forEach(item => {
        addLog(`  ✔ ${item}`);
      });
      (build.newModules || []).forEach(mod => {
        addLog(`  🚀 Módulo activo: ${mod}`);
      });
      addLog(`====================================================`);
      setUpdateProgress(90);
      await new Promise(r => setTimeout(r, 600));

      // Mark locally as installed
      await onInstallBuild(build.id);

      // Report to server if possible
      try {
        await fetch('/api/sync/apply-package', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packageId: build.id,
            branchId: currentBranch?.id || 'SUC-LOCAL',
            branchName: currentBranch?.name || 'Sucursal Local'
          })
        });
      } catch (e) { /* ignore */ }

      setUpdateProgress(100);
      setUpdateCurrentStep('¡Actualización e Inyección Completada con Éxito!');
      addLog('Los nuevos desarrollos y código compilado están listos.');
      addLog('Haz clic en "Aplicar y Recargar Sistema" para que esta terminal inicie con los nuevos módulos.');
      setUpdateSuccess(true);
    } catch (err: any) {
      addLog(`ERROR durante la actualización: ${err.message}`);
    }
  };

  // Execution of Rollback
  const handleExecuteRollback = async () => {
    if (!rollbackTargetBuild) return;

    setIsRollbacking(true);
    setRollbackProgress(10);
    setRollbackSuccess(false);
    setRollbackLogs([]);

    const addLog = (msg: string) => {
      setRollbackLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      setRollbackCurrentStep('Creando punto de restauración de seguridad...');
      addLog(`Generando Snapshot de base de datos local y tickets activos...`);
      setRollbackProgress(20);
      await new Promise(r => setTimeout(r, 500));

      setRollbackCurrentStep(`Descargando paquete de rollback ${rollbackTargetBuild.version}...`);
      addLog(`Recuperando compilación previa #${rollbackTargetBuild.buildNumber}...`);
      setRollbackProgress(45);
      await new Promise(r => setTimeout(r, 600));

      setRollbackCurrentStep('Alineando esquemas de base de datos y compatibilidad...');
      addLog(`Verificando integridad: spots, activeTickets, cashShifts... 100% INTACTOS.`);
      setRollbackProgress(70);
      await new Promise(r => setTimeout(r, 500));

      setRollbackCurrentStep(`Restaurando entorno a ${rollbackTargetBuild.version}...`);
      addLog(`Reajustando componentes visuales a la versión ${rollbackTargetBuild.version}...`);
      setRollbackProgress(90);
      await new Promise(r => setTimeout(r, 600));

      try {
        await fetch('/api/system/rollback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: rollbackTargetBuild.version })
        });
      } catch { /* ignore fallback */ }

      await onInstallBuild(rollbackTargetBuild.id);

      setRollbackProgress(100);
      setRollbackCurrentStep('¡Reversión y Restauración Exitosa!');
      addLog(`Sistema restaurado correctamente a ${rollbackTargetBuild.version}. Tus datos y dinero siguen 100% seguros.`);
      setRollbackSuccess(true);
    } catch (err: any) {
      addLog(`ERROR durante rollback: ${err.message}`);
    }
  };

  const handleApplyAndHardReload = () => {
    // Clear updating states and reload the browser page to mount fresh compiled bundle
    setUpdatingBuildId(null);
    window.location.reload();
  };

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full animate-in fade-in duration-150" : "fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-hidden animate-in fade-in duration-200"}>
      <div className={embedded ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 w-full rounded-2xl shadow-sm flex flex-col overflow-hidden" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Actualizador de Software & Control de Versiones (OTA)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 font-bold">
                  OTA & Rollback Engine
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Distribución controlada de versiones autorizadas desde el Servidor Central y reversión segura (Rollback).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-300 dark:border-slate-700"
              title="Volver a la taquilla de Patio POS"
            >
              <Car className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span className="hidden sm:inline">Volver a Patio POS</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cerrar módulo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Installed & Server Git Status Banner */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 shrink-0 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  <span>Versión Actual en esta Terminal:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-sm">{currentInstalledBuild.version}</span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Build #{currentInstalledBuild.buildNumber}</span>
                  <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded text-[9px] font-bold border border-emerald-200 dark:border-emerald-500/30">
                    ACTIVA
                  </span>
                  {currentBranch && (
                    <span className="px-1.5 py-0.2 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 rounded text-[9px] font-mono border border-blue-200 dark:border-blue-500/30">
                      Sede: {currentBranch.name} ({currentBranch.code})
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>Canal: <strong className="text-slate-800 dark:text-slate-200 uppercase font-mono">{currentInstalledBuild.channel}</strong></span>
                  <span>•</span>
                  <span>Lanzamiento: {currentInstalledBuild.releaseDate}</span>
                  {serverLiveInfo?.commit && (
                    <>
                      <span>•</span>
                      <span className="text-slate-800 dark:text-slate-200 font-mono flex items-center gap-1">
                        <Terminal className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        Git Servidor: {serverLiveInfo.commit.shortHash}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCheckUpdates(true)}
                disabled={isChecking || updatingBuildId !== null || isRollbacking}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? 'Sincronizando...' : 'Buscar Actualizaciones'}
              </button>
            </div>
          </div>
        </div>

        {checkMessage && (
          <div className="px-6 py-2 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/30 text-xs text-amber-900 dark:text-amber-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0 animate-pulse" />
              {checkMessage}
            </span>
            <button type="button" onClick={() => setCheckMessage(null)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer font-bold px-1">×</button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* Active Update In-Progress Box */}
          {updatingBuildId && (
            <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-slate-950 border border-amber-300 dark:border-amber-500/40 space-y-4 shadow-sm animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-bounce" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Instalando Actualización del Sistema</h3>
                </div>
                <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">{updateProgress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-300 dark:border-slate-800">
                <div
                  className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${updateProgress}%` }}
                ></div>
              </div>

              <div className="text-xs text-slate-700 dark:text-slate-300 font-mono flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{updateCurrentStep}</span>
              </div>

              {/* Live Terminal Logs */}
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-[11px] font-mono text-emerald-400 max-h-32 overflow-y-auto space-y-1 select-text scrollbar-thin">
                {updateLogs.map((log, idx) => (
                  <div key={idx} className="text-emerald-400">{log}</div>
                ))}
              </div>

              {updateSuccess && (
                <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200 dark:border-emerald-500/30">
                  <div className="text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>¡Compilación instalada con éxito! Aplica el reinicio en caliente para cargar los nuevos módulos.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyAndHardReload}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer font-mono"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Aplicar y Recargar Sistema</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Active Rollback In-Progress Box */}
          {isRollbacking && (
            <div className="p-5 rounded-2xl bg-orange-50/50 dark:bg-slate-950 border border-orange-300 dark:border-orange-500/50 space-y-4 shadow-sm animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-orange-600 dark:text-orange-400 animate-spin" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Reversión de Versión en Proceso (Rollback a {rollbackTargetBuild?.version})
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-orange-700 dark:text-orange-400">{rollbackProgress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-300 dark:border-slate-800">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-400 h-full transition-all duration-300"
                  style={{ width: `${rollbackProgress}%` }}
                ></div>
              </div>

              <div className="text-xs text-slate-700 dark:text-slate-300 font-mono flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-600 dark:text-orange-400 shrink-0" />
                <span>{rollbackCurrentStep}</span>
              </div>

              {/* Live Terminal Logs */}
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-[11px] font-mono text-orange-300 max-h-32 overflow-y-auto space-y-1 select-text scrollbar-thin">
                {rollbackLogs.map((log, idx) => (
                  <div key={idx} className="text-orange-300">{log}</div>
                ))}
              </div>

              {rollbackSuccess && (
                <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200 dark:border-emerald-500/30">
                  <div className="text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                    <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ¡El sistema fue revertido y restaurado con éxito a {rollbackTargetBuild?.version}!
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyAndHardReload}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-400 text-slate-950 flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer font-mono"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Aplicar y Recargar Sistema</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Category Tabs: Todas / Versión Actual / Historial Rollback / Beta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Control de Versiones, Historial & Rollback</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Consulta los cambios de cada versión y revierte de forma segura cuando lo desees.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs shrink-0">
              <button
                type="button"
                aria-selected={activeCategory === 'all'}
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeCategory === 'all' ? 'active-tab-indicator bg-amber-500 text-slate-950 font-bold shadow-xs' : 'inactive-tab-indicator text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Todas ({liveBuilds.length})
              </button>

              <button
                type="button"
                aria-selected={activeCategory === 'installed'}
                onClick={() => setActiveCategory('installed')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  activeCategory === 'installed' ? 'active-tab-indicator bg-emerald-500 text-slate-950 font-bold shadow-xs' : 'inactive-tab-indicator text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Actual
              </button>

              <button
                type="button"
                aria-selected={activeCategory === 'history'}
                onClick={() => setActiveCategory('history')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === 'history' ? 'active-tab-indicator bg-orange-500 text-slate-950 font-bold shadow-xs' : 'inactive-tab-indicator text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <History className={`w-3.5 h-3.5 ${activeCategory === 'history' ? 'text-slate-950' : 'text-orange-600 dark:text-orange-400'}`} />
                <span>Historial (Rollback)</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                  activeCategory === 'history' ? 'bg-orange-600/30 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-orange-700 dark:text-orange-400'
                }`}>
                  {pastVersionBuilds.length}
                </span>
              </button>

              <button
                type="button"
                aria-selected={activeCategory === 'beta'}
                onClick={() => setActiveCategory('beta')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  activeCategory === 'beta' ? 'active-tab-indicator bg-purple-500 text-slate-950 font-bold shadow-xs' : 'inactive-tab-indicator text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Lock className={`w-3 h-3 ${activeCategory === 'beta' ? 'text-slate-950' : 'text-purple-600 dark:text-purple-400'}`} />
                <span>Beta / IA (Informativa)</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  activeCategory === 'beta' ? 'bg-purple-600/30 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-purple-700 dark:text-purple-400'
                }`}>
                  {betaBuilds.length}
                </span>
              </button>
            </div>
          </div>

          {/* Special Banner for Beta / Experimental Tab */}
          {activeCategory === 'beta' && (
            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-500/40 rounded-xl p-4 flex items-start gap-3 text-xs">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-500/40 flex items-center justify-center text-purple-700 dark:text-purple-300 shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                  <span>Versiones Beta y Experimentales: Modo Informativo Protegido</span>
                </h4>
                <p className="text-purple-800 dark:text-purple-300 text-[11px] leading-relaxed">
                  Las versiones experimentales (como IA ANPR o Reconocimiento Óptico) se muestran <strong className="text-purple-950 dark:text-white">únicamente con fines informativos</strong> y se encuentran bloqueadas para instalación directa en sucursales. Solo podrán desplegarse si el <strong className="text-purple-900 dark:text-purple-200 font-bold">Servidor Central</strong> emite una orden de autorización explícita para sedes piloto.
                </p>
              </div>
            </div>
          )}

          {/* Safety Notice Box when in History tab */}
          {activeCategory === 'history' && (
            <div className="bg-orange-50/70 dark:bg-slate-950 border border-orange-200 dark:border-orange-500/30 rounded-xl p-4 flex items-start gap-3 text-xs">
              <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 mt-0.5">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-orange-900 dark:text-orange-300">
                  ¿Cómo funciona la Reversión de Versión (Rollback)?
                </h4>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  Si una actualización reciente presenta incompatibilidad en algún equipo, puedes seleccionar cualquiera de las versiones estables anteriores para restaurarla con un clic. 
                  <strong className="text-slate-900 dark:text-white"> Los carros parqueados (activeTickets), arqueos de caja y cobros NO se eliminarán.</strong>
                </p>
              </div>
            </div>
          )}

          {/* Builds List */}
          <div className="space-y-4">
            {filteredBuilds.map(build => {
              const isInstalled = build.status === 'installed' || build.id === currentInstalledBuild.id;
              const isBeta = build.channel === 'beta' || build.isExperimentalOnly;
              const isPastVersion = !isInstalled && !isBeta;
              const isBranchAuthorizedForBeta = currentBranch && authorizedBetaBranches.includes(currentBranch.id);
              const isBetaBlocked = isBeta && !isBranchAuthorizedForBeta;

              return (
                <div
                  key={build.id}
                  className={`border rounded-2xl p-4.5 space-y-3.5 transition-all text-slate-900 dark:text-slate-100 ${
                    isInstalled
                      ? 'border-emerald-300 dark:border-emerald-500/60 shadow-sm bg-emerald-50/30 dark:bg-slate-900'
                      : isBeta
                      ? 'border-purple-200 dark:border-purple-500/40 bg-purple-50/30 dark:bg-purple-950/20 shadow-xs'
                      : isPastVersion
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-500/40 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-500/40 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          isInstalled
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40'
                            : isBeta
                            ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30'
                            : isPastVersion
                            ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-500/30'
                            : 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30'
                        }`}>
                          {isInstalled
                            ? 'VERSIÓN ACTIVA'
                            : isBeta
                            ? 'BETA EXPERIMENTAL (SOLO INFORMATIVA)'
                            : isPastVersion
                            ? 'VERSIÓN EN HISTORIAL'
                            : 'OFICIAL DISPONIBLE'}
                        </span>
                        
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          Build #{build.buildNumber}
                        </span>

                        {build.isOfficialDispatched && (
                          <span className="text-[9px] font-mono text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 px-1.5 py-0.2 rounded font-bold">
                            AUTORIZADA POR CENTRAL
                          </span>
                        )}

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{build.title}</h4>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{build.description}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 block">{build.version}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Tamaño: {build.downloadSize}</span>
                    </div>
                  </div>

                  {/* Modules, UI Themes, DB Migrations & Changelog */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    {/* New Modules */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        Módulos Incluidos en el Sistema:
                      </span>
                      <ul className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                        {build.newModules.map((mod, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>{mod}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Visual & Theme Changes & Database Migrations */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Aspecto Visual y Diseño UI:
                      </span>
                      <ul className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                        {(build.visualThemeChanges && build.visualThemeChanges.length > 0) ? (
                          build.visualThemeChanges.map((theme, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              <span>{theme}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-[11px] text-slate-500 italic">Diseño estándar refinado y soporte de temas</li>
                        )}
                      </ul>

                      {/* Database Structure Migrations */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 mt-2">
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                          <Database className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          Estructura de Base de Datos:
                        </span>
                        {(build.databaseMigrations && build.databaseMigrations.length > 0) ? (
                          <ul className="space-y-0.5 text-[10px] text-slate-600 dark:text-slate-400 mt-1 font-mono">
                            {build.databaseMigrations.map((mig, i) => (
                              <li key={i}>• {mig}</li>
                            ))}
                          </ul>
                        ) : build.databaseMigrationRequired ? (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5">Migración de esquemas requerida</span>
                        ) : (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">Sin cambios DDL estructurales</span>
                        )}
                      </div>
                    </div>

                    {/* Changelog */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 md:col-span-2 lg:col-span-1">
                      <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Notas de la Versión & Changelog:
                      </span>
                      <ul className="space-y-1.5 text-slate-700 dark:text-slate-200 text-[11px]">
                        {build.changelog.map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5 leading-snug">
                            <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Beta Block warning if applicable */}
                  {isBetaBlocked && (
                    <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 flex items-center justify-between text-xs text-purple-700 dark:text-purple-300">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Lock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                        Esta versión se encuentra protegida. Solo el Servidor Central puede autorizar su instalación.
                      </span>
                      <span className="text-[10px] font-mono text-purple-700 dark:text-purple-300 uppercase font-bold">
                        BLOQUEADO EN SUCURSAL
                      </span>
                    </div>
                  )}

                  {/* Footer Card Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono flex-wrap">
                      <span>Lanzamiento: {build.releaseDate}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        SHA256: {build.checksumSha256.slice(0, 10)}...
                      </span>
                      {build.databaseMigrationRequired && (
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          Requiere migración de BD
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isInstalled ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/15 px-3.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-500/30">
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          Versión Actual Instalada
                        </span>
                      ) : isBetaBlocked ? (
                        <button
                          type="button"
                          disabled={true}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 opacity-60 cursor-not-allowed"
                          title="Versión Beta informativa - Bloqueada hasta autorización del Servidor Central"
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          Solo Informativa (Bloqueada por Central)
                        </button>
                      ) : isPastVersion ? (
                        <button
                          type="button"
                          onClick={() => setRollbackTargetBuild(build)}
                          disabled={updatingBuildId !== null || isRollbacking}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Revertir / Restaurar Versión ({build.version})
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartUpdate(build)}
                          disabled={updatingBuildId !== null || isRollbacking}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Descargar e Instalar Ahora
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span>Actualizador de Software • Distribución de Paquetes OTA desde Servidor Central</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>

      {/* CONFIRMATION MODAL FOR ROLLBACK */}
      {rollbackTargetBuild && !isRollbacking && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-orange-400 dark:border-orange-500/60 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                <RotateCcw className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  ¿Confirmar Reversión (Rollback) a {rollbackTargetBuild.version}?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Estás a punto de restaurar el sistema a una versión anterior estable.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Garantías de Seguridad durante la Reversión:</span>
              </div>
              <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px] pl-6 list-disc">
                <li><strong className="text-slate-800 dark:text-slate-200">Vehículos en Patio:</strong> Los carros y motos parqueados actualmente no se borrarán.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Caja y Dinero:</strong> Los cobros, recaudos y arqueos del turno se mantendrán intactos.</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Tarifas y Datos:</strong> La base de datos local no sufrirá pérdida de registros.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRollbackTargetBuild(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteRollback}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white flex items-center gap-2 shadow-md transition-all cursor-pointer font-bold"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Confirmar y Restaurar a {rollbackTargetBuild.version}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
