import React from 'react';
import { Sparkles, Droplets } from 'lucide-react';
import type { PatioUiVersion } from './usePatioUiVersion';

interface PatioUiSwitchProps {
  value: PatioUiVersion;
  onChange: (v: PatioUiVersion) => void;
  /** Efecto cristal: se ofrece con la vista nueva (o siempre si no hay selector de versión). */
  glass?: boolean;
  onGlassChange?: (v: boolean) => void;
  /** false: no muestra Clásica/Nueva (pantalla con un solo diseño); solo el interruptor Cristal. */
  showVersion?: boolean;
}

/** Selector Clásica / Nueva, con el efecto cristal opcional. */
export const PatioUiSwitch: React.FC<PatioUiSwitchProps> = ({ value, onChange, glass = false, onGlassChange, showVersion = true }) => (
  <div className="flex flex-wrap items-center justify-end gap-3 px-4 pt-3 md:px-6">
    {showVersion && (
      <>
        <span className="text-sm text-slate-600 dark:text-slate-400">Vista</span>
        <div role="radiogroup" aria-label="Vista" className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {([['clasica', 'Clásica'], ['nueva', 'Nueva']] as const).map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={value === id} onClick={() => onChange(id)}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${value === id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
              {id === 'nueva' && <Sparkles className="h-3.5 w-3.5" aria-hidden />}{label}
            </button>
          ))}
        </div>
      </>
    )}
    {(!showVersion || value === 'nueva') && onGlassChange && (
      <button type="button" role="switch" aria-checked={glass} onClick={() => onGlassChange(!glass)}
        className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${glass ? 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-100' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
        <Droplets className="h-4 w-4" aria-hidden />Cristal
        <span aria-hidden className={`relative h-5 w-9 rounded-full transition ${glass ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${glass ? 'left-[18px]' : 'left-0.5'}`} />
        </span>
      </button>
    )}
  </div>
);

export default PatioUiSwitch;
