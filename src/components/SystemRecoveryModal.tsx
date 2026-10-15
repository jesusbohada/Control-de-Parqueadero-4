import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Database,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  HardDrive,
  FileText,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Info,
  Clock,
  User,
  Activity,
  Layers,
  Check
} from 'lucide-react';

export interface BackupItem {
  fileName: string;
  size: number;
  date: string;
  type: string;
  summary: string;
}

export interface IntegrityCheckResult {
  healthy: boolean;
  corrupted: boolean;
  postgresReady: boolean;
  issues: string[];
  tableStats?: Record<string, number>;
  backups: BackupItem[];
  timestamp: string;
}

interface SystemRecoveryModalProps {
  isOpen: boolean;
  integrityData: IntegrityCheckResult | null;
  onClose: () => void;
  onRestoreSuccess: () => void;
  onContinueOffline: () => void;
}

export const SystemRecoveryModal: React.FC<SystemRecoveryModalProps> = ({
  isOpen,
  integrityData,
  onClose,
  onRestoreSuccess,
  onContinueOffline
}) => {
  const [selectedBackup, setSelectedBackup] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreStatus, setRestoreStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isRechecking, setIsRechecking] = useState<boolean>(false);
  const [localBackups, setLocalBackups] = useState<BackupItem[]>(integrityData?.backups || []);

  useEffect(() => {
    if (integrityData?.backups) {
      setLocalBackups(integrityData.backups);
      if (integrityData.backups.length > 0 && !selectedBackup) {
        setSelectedBackup(integrityData.backups[0].fileName);
      }
    }
  }, [integrityData]);

  if (!isOpen) return null;

  const handleRestoreFromBackups = async (targetFileName?: string) => {
    const fileToRestore = targetFileName || selectedBackup;
    if (!fileToRestore) return;

    setIsRestoring(true);
    setRestoreStatus(null);

    try {
      const res = await fetch('/api/database/restore-backup-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: fileToRestore })
      });
      const data = await res.json();
      if (data.success) {
        setRestoreStatus({
          success: true,
          message: data.message || 'Restauración completada con éxito. Base de datos recuperada.'
        });
        setTimeout(() => {
          onRestoreSuccess();
        }, 1800);
      } else {
        setRestoreStatus({
          success: false,
          message: data.error || 'Error al procesar la restauración del archivo.'
        });
      }
    } catch (err: any) {
      setRestoreStatus({
        success: false,
        message: `Fallo de comunicación: ${err.message}`
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        setIsRestoring(true);
        setRestoreStatus(null);

        const res = await fetch('/api/database/restore-backup-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileContent: content })
        });
        const data = await res.json();
        if (data.success) {
          setRestoreStatus({
            success: true,
            message: data.message || 'Copia de seguridad externa restaurada correctamente.'
          });
          setTimeout(() => {
            onRestoreSuccess();
          }, 1800);
        } else {
          setRestoreStatus({
            success: false,
            message: data.error || 'Error restaurando el archivo subido.'
          });
        }
      } catch (err: any) {
        setRestoreStatus({
          success: false,
          message: `Error al leer archivo: ${err.message}`
        });
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  const handleRecheckIntegrity = async () => {
    setIsRechecking(true);
    setRestoreStatus(null);
    try {
      const res = await fetch('/api/database/integrity-check');
      const data: IntegrityCheckResult = await res.json();
      if (data.backups) {
        setLocalBackups(data.backups);
      }
      if (data.healthy && !data.corrupted) {
        setRestoreStatus({
          success: true,
          message: '¡Verificación exitosa! Los archivos de PostgreSQL y las tablas responden correctamente.'
        });
        setTimeout(() => {
          onRestoreSuccess();
        }, 1200);
      } else {
        setRestoreStatus({
          success: false,
          message: `Inconsistencia detectada: ${data.issues?.join(', ') || 'Archivos no legibles en PostgreSQL'}`
        });
      }
    } catch (err: any) {
      setRestoreStatus({
        success: false,
        message: `Error al comprobar integridad: ${err.message}`
      });
    } finally {
      setIsRechecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-red-500/60 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header con alerta roja/ámbar */}
        <div className="bg-gradient-to-r from-red-950 via-slate-900 to-amber-950 px-6 py-5 border-b border-red-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <ShieldAlert className="w-7 h-7 animate-pulse text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">Recuperación de Sistema</h2>
                <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full bg-red-500/25 text-red-200 border border-red-500/40">
                  Inconsistencia en Data
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-0.5">
                La rutina de integridad detectó archivos dañados o inaccesibles en el motor de base de datos.
              </p>
            </div>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Diagnóstico */}
          <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-red-300 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>Diagnóstico de Integridad del Motor:</span>
            </div>
            <ul className="text-xs text-red-200/90 list-disc list-inside space-y-1 pl-1">
              {integrityData?.issues && integrityData.issues.length > 0 ? (
                integrityData.issues.map((issue, idx) => <li key={idx}>{issue}</li>)
              ) : (
                <li>No se pudo leer la estructura de tablas en la carpeta PostgreSQL/data.</li>
              )}
            </ul>
            <div className="text-[11px] text-slate-400 mt-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              💡 <strong>Tip de Reparación Rápida:</strong> Si el fallo se debe a un corte de luz repentino, puedes ejecutar el archivo <code className="text-amber-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded">REPARAR_POSTGRESQL.bat</code> en la carpeta de la app para limpiar bloqueos de <code className="text-amber-300">postmaster.pid</code>.
            </div>
          </div>

          {/* Estado de Restauración / Alertas */}
          {restoreStatus && (
            <div
              className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
                restoreStatus.success
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/50 border-rose-500/50 text-rose-200'
              }`}
            >
              {restoreStatus.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{restoreStatus.message}</div>
            </div>
          )}

          {/* Sección 1: Selección de Backup existente en /backups/ */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                Copias de Seguridad Disponibles en Disco (C:\wolfzonepos\backups\)
              </h3>
              <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">
                {localBackups.length} respaldos detectados
              </span>
            </div>

            {localBackups.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {localBackups.map((b) => {
                  const isSelected = selectedBackup === b.fileName;
                  return (
                    <div
                      key={b.fileName}
                      onClick={() => setSelectedBackup(b.fileName)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-950/30'
                          : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-cyan-500 text-slate-950 font-bold'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100 text-sm truncate">
                              {b.fileName}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-700 text-cyan-300 border border-slate-600 shrink-0">
                              {b.type}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {new Date(b.date).toLocaleString()}
                            </span>
                            <span>•</span>
                            <span className="text-slate-300">{b.summary}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreFromBackups(b.fileName);
                          }}
                          disabled={isRestoring}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isRestoring && isSelected ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Restaurando...</span>
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restaurar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 bg-slate-800/40 rounded-xl border border-dashed border-slate-700 text-center">
                <Database className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-sm text-slate-300 font-medium">No se encontraron archivos en la carpeta de backups</p>
                <p className="text-xs text-slate-500 mt-1">
                  Puedes cargar un archivo de copia de seguridad externo (.json / .sql) a continuación.
                </p>
              </div>
            )}
          </div>

          {/* Sección 2: Cargar archivo externo */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                Cargar Archivo de Copia de Seguridad Externo
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Selecciona un archivo .json o .sql desde tu memoria USB o disco externo.
              </p>
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-semibold text-slate-200 transition-all shadow-sm">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Examinar Archivo...</span>
                <input
                  type="file"
                  accept=".json,.sql"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isRestoring}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer de Acciones */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleRecheckIntegrity}
            disabled={isRechecking || isRestoring}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRechecking ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Reintentar Verificación</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onContinueOffline}
              className="px-4 py-2 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-600/40 text-amber-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-sm"
              title="Continuar operando con el almacenamiento local del navegador"
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>Modo Contingencia Local (IndexedDB)</span>
            </button>

            {selectedBackup && (
              <button
                type="button"
                onClick={() => handleRestoreFromBackups()}
                disabled={isRestoring}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Restaurando Estado...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Restaurar Seleccionado</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default SystemRecoveryModal;
