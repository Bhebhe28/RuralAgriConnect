import React, { useState } from 'react';

interface Props {
  type: 'critical' | 'warning' | 'info' | 'success';
  message: string;
}

const styles = {
  critical: 'bg-red-50 border border-red-300 text-red-900',
  warning:  'bg-amber-50 border border-amber-300 text-amber-900',
  info:     'bg-blue-50 border border-blue-300 text-blue-900',
  success:  'bg-emerald-50 border border-emerald-300 text-emerald-900',
};

const icons = { critical: '🚨', warning: '⚠️', info: 'ℹ️', success: '✅' };

export default function AlertBanner({ type, message }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className={`flex items-center gap-3 rounded-lg px-4 py-3 mb-3 text-sm animate-fade-in ${styles[type]}`}>
      <span className="text-xl flex-shrink-0">{icons[type]}</span>
      <span className="flex-1">{message}</span>
      <button onClick={() => setDismissed(true)} className="opacity-50 hover:opacity-100 text-lg bg-transparent border-0 cursor-pointer">✕</button>
    </div>
  );
}
