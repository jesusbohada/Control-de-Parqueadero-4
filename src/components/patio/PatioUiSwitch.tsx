import React from 'react';
import { Sparkles } from 'lucide-react';
import type { PatioUiVersion } from './usePatioUiVersion';

/** Selector Clásica / Nueva del Patio POS. */
export const PatioUiSwitch: React.FC<{ value: PatioUiVersion; onChange: (v: PatioUiVersion) => void }> = ({ value, onChange }) => (
  <div className="flex flex-wrap items-center justify-end gap-3 px-4 pt-3 md:px-6">
    <span className="text-sm text-slate-600 dark:text-slate-400">Vista del patio</span>
    <div role="radiogroup" aria-label="Vista del patio" className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {([['clasica', 'Clásica'], ['nueva', 'Nueva']] as const).map(([id, label]) => (
        <button key={id} type="button" role="radio" aria-checked={value === id} onClick={() => onChange(id)}
          className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 ${value === id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
          {id === 'nueva' && <Sparkles className="h-3.5 w-3.5" aria-hidden />}{label}
        </button>
      ))}
    </div>
  </div>
);

export default PatioUiSwitch;
