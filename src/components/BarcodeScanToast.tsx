import React, { useEffect, useState } from 'react';
import { 
  Barcode, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles, 
  Clock, 
  DollarSign, 
  Car, 
  X,
  Zap,
  HelpCircle,
  AlertOctagon,
  RefreshCw,
  Search
} from 'lucide-react';
import { BarcodeScanEventData, barcodeScannerService } from '../services/barcodeScannerService';
import { formatCurrency } from '../utils/billing';

interface BarcodeScanToastProps {
  onDismiss?: () => void;
  className?: string;
}

export const BarcodeScanToast: React.FC<BarcodeScanToastProps> = ({
  onDismiss,
  className = ''
}) => {
  const [currentEvent, setCurrentEvent] = useState<BarcodeScanEventData | null>(null);
  const [progress, setProgress] = useState<number>(100);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    const unsub = barcodeScannerService.subscribeScanEvents((event) => {
      const cfg = barcodeScannerService.getConfig();
      if (!cfg.showToastNotification) return;

      setCurrentEvent(event);
      setIsVisible(true);
      setProgress(100);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isVisible || !currentEvent) return;

    // Duración de visualización: 6s para errores (para que el cajero pueda leer el diagnóstico) y 4.5s para éxitos
    const isError = currentEvent.status === 'not_found' || currentEvent.status === 'read_error';
    const duration = isError ? 6500 : 4500;
    const step = 50;

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev - (step / duration) * 100;
        if (next <= 0) {
          setIsVisible(false);
          if (onDismiss) onDismiss();
          return 0;
        }
        return next;
      });
    }, step);

    return () => clearInterval(interval);
  }, [isVisible, currentEvent, onDismiss]);

  if (!isVisible || !currentEvent) return null;

  const isSuccess = currentEvent.status === 'active_found';
  const isFastExit = currentEvent.status === 'fast_exit_executed';
  const isPaid = currentEvent.status === 'already_paid';
  const isNotFound = currentEvent.status === 'not_found';
  const isReadError = currentEvent.status === 'read_error';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 sm:top-5 right-4 sm:right-6 z-[9999] max-w-lg w-full animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto ${className}`}
    >
      <div className={`relative overflow-hidden rounded-2xl p-4 shadow-2xl backdrop-blur-xl border transition-all ${
        isSuccess
          ? 'bg-slate-900/95 text-white border-emerald-500/60 shadow-emerald-950/60 ring-1 ring-emerald-500/40'
          : isFastExit
          ? 'bg-slate-900/95 text-white border-sky-500/60 shadow-sky-950/60 ring-1 ring-sky-500/40'
          : isPaid
          ? 'bg-slate-900/95 text-white border-amber-500/60 shadow-amber-950/60 ring-1 ring-amber-500/40'
          : isReadError
          ? 'bg-slate-950/98 text-white border-fuchsia-500/70 shadow-fuchsia-950/70 ring-2 ring-fuchsia-500/50 animate-pulse'
          : 'bg-slate-950/98 text-white border-rose-500/80 shadow-rose-950/80 ring-2 ring-rose-500/50'
      }`}>
        
        {/* Laser Sweep Effect Animation */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent ${
          isSuccess ? 'via-emerald-400' : isFastExit ? 'via-sky-400' : isPaid ? 'via-amber-400' : isReadError ? 'via-fuchsia-400' : 'via-rose-500'
        } to-transparent opacity-90 animate-pulse`} />

        <div className="flex items-start gap-3.5">
          {/* Status Icon */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-inner ${
            isSuccess
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-900/20'
              : isFastExit
              ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 shadow-sky-900/20'
              : isPaid
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-amber-900/20'
              : isReadError
              ? 'bg-fuchsia-500/25 text-fuchsia-400 border-fuchsia-500/50 shadow-fuchsia-900/30'
              : 'bg-rose-500/25 text-rose-400 border-rose-500/50 shadow-rose-900/30'
          }`}>
            {isSuccess && <Barcode className="w-6 h-6 animate-bounce duration-1000" />}
            {isFastExit && <Sparkles className="w-6 h-6 text-sky-300 animate-spin" />}
            {isPaid && <AlertTriangle className="w-6 h-6 text-amber-400" />}
            {isReadError && <AlertOctagon className="w-6 h-6 text-fuchsia-400 animate-pulse" />}
            {isNotFound && <XCircle className="w-6 h-6 text-rose-400 animate-bounce duration-1000" />}
          </div>

          {/* Details Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] font-mono uppercase tracking-wider font-black px-2.5 py-0.5 rounded-full border shadow-2xs ${
                isSuccess
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                  : isFastExit
                  ? 'bg-sky-950 text-sky-300 border-sky-500/40'
                  : isPaid
                  ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                  : isReadError
                  ? 'bg-fuchsia-950 text-fuchsia-200 border-fuchsia-500/50'
                  : 'bg-rose-950 text-rose-200 border-rose-500/50'
              }`}>
                {isSuccess && 'Lector USB: Ticket Encontrado'}
                {isFastExit && 'Lector USB: Salida Rápida'}
                {isPaid && 'Lector USB: Ticket Ya Liquidado'}
                {isReadError && 'Lector USB: Error de Formato'}
                {isNotFound && 'Lector USB: Ticket No Encontrado'}
              </span>

              <button
                type="button"
                onClick={() => setIsVisible(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cerrar notificación"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ========================================================= */}
            {/* CASO 1: ÉXITO - TICKET ACTIVO ENCONTRADO */}
            {/* ========================================================= */}
            {(isSuccess || isFastExit) && (
              <>
                <div className="mt-1.5 flex items-center gap-2">
                  {currentEvent.ticketNumber && (
                    <span className="font-mono font-black text-sm text-white">
                      #{currentEvent.ticketNumber}
                    </span>
                  )}
                  {currentEvent.plate && (
                    <span className="font-mono font-bold text-xs bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded tracking-widest shadow-2xs">
                      {currentEvent.plate}
                    </span>
                  )}
                  {currentEvent.spotCode && (
                    <span className="text-[11px] font-mono text-slate-300 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                      Plaza {currentEvent.spotCode}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 mt-1 leading-snug">
                  {currentEvent.message}
                </p>

                {currentEvent.totalAmount !== undefined && (
                  <div className="mt-2 flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400">Total a Liquidar:</span>
                    <span className="font-mono font-black text-emerald-400 text-sm">
                      {formatCurrency(currentEvent.totalAmount, currentEvent.currencySymbol || '$')}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* ========================================================= */}
            {/* CASO 2: TICKET YA PAGADO / LIQUIDADO PREVIAMENTE */}
            {/* ========================================================= */}
            {isPaid && (
              <>
                <div className="mt-1.5 flex items-center gap-2">
                  {currentEvent.ticketNumber && (
                    <span className="font-mono font-black text-sm text-amber-300">
                      #{currentEvent.ticketNumber}
                    </span>
                  )}
                  {currentEvent.plate && (
                    <span className="font-mono font-bold text-xs bg-slate-800 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded tracking-widest">
                      {currentEvent.plate}
                    </span>
                  )}
                </div>

                <p className="text-xs text-amber-200/90 mt-1 leading-snug">
                  {currentEvent.message}
                </p>

                {currentEvent.errorDetails && (
                  <div className="mt-2 p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-300/90 leading-relaxed">
                    <div className="flex items-center gap-1 font-bold text-amber-400">
                      <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{currentEvent.errorDetails.diagnosticHint}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ========================================================= */}
            {/* CASO 3 & 4: ERROR / NO ENCONTRADO EN PATIO ACTIVO (DISTINTIVO) */}
            {/* ========================================================= */}
            {(isNotFound || isReadError) && (
              <div className="mt-2 space-y-2">
                {/* Código escaneado con formato monospaciado destacado */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-rose-950/60 border border-rose-500/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <Barcode className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="font-mono font-black text-xs text-rose-200 tracking-wider truncate">
                      "{currentEvent.rawCode}"
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-rose-300/80 bg-rose-900/50 px-1.5 py-0.5 rounded shrink-0 border border-rose-500/30">
                    {currentEvent.rawCode.length} caracteres
                  </span>
                </div>

                {/* Mensaje de Error & Diagnóstico Visual Claro */}
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-rose-500/30 space-y-1 text-xs">
                  <div className="font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                    <span>{isReadError ? 'Error en Lectura de Código de Barras' : 'Código No Registrado en Patio'}</span>
                  </div>
                  
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {currentEvent.errorDetails?.diagnosticHint || currentEvent.message}
                  </p>

                  {currentEvent.errorDetails?.actionSuggestion && (
                    <div className="pt-1.5 mt-1 border-t border-slate-800 text-[10px] text-rose-300 font-medium flex items-center gap-1">
                      <Search className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>Sugerencia: {currentEvent.errorDetails.actionSuggestion}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
          <div 
            className={`h-full transition-all ease-linear ${
              isSuccess ? 'bg-emerald-500' : isFastExit ? 'bg-sky-500' : isPaid ? 'bg-amber-500' : isReadError ? 'bg-fuchsia-500' : 'bg-rose-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
