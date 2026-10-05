import React from 'react';

export function summarizeExecution(results) {
  if (!results || results.length === 0) return '';
  const modes = new Set(results.map(r => r.execution_mode).filter(Boolean));
  if (modes.size === 0) return '';
  if (modes.has('REAL_API') && modes.has('LOCAL_SIMULATION')) return 'MIXED';
  if (modes.has('REAL_API')) return 'REAL_API';
  if (modes.has('LOCAL_SIMULATION')) return 'LOCAL_SIMULATION';
  return Array.from(modes)[0] || '';
}

export const ExecutionModeBadge = ({ mode, className = '' }) => {
  const normalized = (mode || '').toUpperCase().trim();

  let label = 'MODE UNKNOWN';
  let badgeStyle = 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700/60';

  if (normalized === 'REAL_API') {
    label = 'LIVE MODEL';
    badgeStyle = 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700/50';
  } else if (normalized === 'LOCAL_SIMULATION') {
    label = 'SIMULATED';
    badgeStyle = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/50';
  } else if (normalized === 'MIXED') {
    label = 'MIXED SOURCES';
    badgeStyle = 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700/50';
  }

  return (
    <span
      className={`text-[9px] font-mono rounded border uppercase px-2 py-0.5 font-bold tracking-wider inline-flex items-center gap-1 ${badgeStyle} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full fill-current bg-current opacity-70" />
      <span>{label}</span>
    </span>
  );
};
