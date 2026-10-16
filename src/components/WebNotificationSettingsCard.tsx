import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellOff, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Volume2, 
  Package, 
  Building2, 
  Radio, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { 
  webNotificationService, 
  WebNotificationConfig 
} from '../services/webNotificationService';

interface WebNotificationSettingsCardProps {
  onTestNotificationSuccess?: () => void;
  className?: string;
}

export const WebNotificationSettingsCard: React.FC<WebNotificationSettingsCardProps> = ({
  onTestNotificationSuccess,
  className = ''
}) => {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    webNotificationService.getPermission()
  );
  const [config, setConfig] = useState<WebNotificationConfig>(
    webNotificationService.getConfig()
  );
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const unsub = webNotificationService.subscribe((newConfig, newPermission) => {
      setConfig(newConfig);
      setPermission(newPermission);
    });
    return () => unsub();
  }, []);

  const handleRequestPermission = async () => {
    const result = await webNotificationService.requestPermission();
    setPermission(result);
  };

  const handleToggle = (key: keyof WebNotificationConfig) => {
    webNotificationService.updateConfig({
      [key]: !config[key]
    });
  };

  const handleTest = async () => {
    setIsTesting(true);
    const success = await webNotificationService.testNotification();
    setIsTesting(false);
    if (success && onTestNotificationSuccess) {
      onTestNotificationSuccess();
    }
  };

  const isGranted = permission === 'granted';
  const isDenied = permission === 'denied';
  const isDefault = permission === 'default';
  const isUnsupported = permission === 'unsupported';

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 ${className}`}>
      {/* Header with Permission Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
            isGranted 
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
              : isDenied 
              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800' 
              : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
          }`}>
            {isGranted ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Notificaciones Web (HTML5 Notification API)
              </h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isGranted
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : isDenied
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : isUnsupported
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}>
                {isGranted ? 'ACTIVO (PERMITIDO)' : isDenied ? 'BLOQUEADO' : isUnsupported ? 'NO SOPORTADO' : 'PENDIENTE'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Alertas nativas de escritorio para cambios en sucursales y paquetes recibidos desde la Central.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          {isDefault && (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Habilitar Permiso</span>
            </button>
          )}

          {isGranted && (
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isTesting ? 'Enviando...' : 'Probar Notificación'}</span>
            </button>
          )}

          {isDenied && (
            <span className="text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Permiso bloqueado en navegador</span>
            </span>
          )}
        </div>
      </div>

      {/* Granular Notification Switches */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        {/* Switch 1: Sucursales Críticas */}
        <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
          config.alertOnBranchOffline 
            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-slate-900 dark:text-slate-100' 
            : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
        }`}>
          <input
            type="checkbox"
            checked={config.alertOnBranchOffline}
            onChange={() => handleToggle('alertOnBranchOffline')}
            className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
          />
          <div className="text-xs">
            <div className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Estado de Sucursales</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              Alertar inmediatamente si una sede pasa a desconectada u offline.
            </p>
          </div>
        </label>

        {/* Switch 2: Paquetes Centrales */}
        <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
          config.alertOnPendingPackages 
            ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 text-slate-900 dark:text-slate-100' 
            : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
        }`}>
          <input
            type="checkbox"
            checked={config.alertOnPendingPackages}
            onChange={() => handleToggle('alertOnPendingPackages')}
            className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
          />
          <div className="text-xs">
            <div className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
              <Package className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Paquetes de la Central</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              Avisar cuando se reciban nuevas versiones, tarifas o parches pendientes.
            </p>
          </div>
        </label>

        {/* Switch 3: Audio de Notificación */}
        <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
          config.playSound 
            ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-slate-900 dark:text-slate-100' 
            : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
        }`}>
          <input
            type="checkbox"
            checked={config.playSound}
            onChange={() => handleToggle('playSound')}
            className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
          />
          <div className="text-xs">
            <div className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
              <Volume2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Sonido de Alerta</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              Reproducir tono audible al desplegar la notificación en pantalla.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};
