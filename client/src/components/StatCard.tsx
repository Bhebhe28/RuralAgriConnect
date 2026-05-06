import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  color: 'green' | 'earth' | 'red' | 'blue';
}

const borderMap = {
  green: 'border-l-moss',
  earth: 'border-l-earth',
  red:   'border-l-red-500',
  blue:  'border-l-blue-500',
};

export default function StatCard({ label, value, sub, color }: Props) {
  const { isDark } = useTheme();
  return (
    <div className={`rounded-2xl p-3 md:p-5 shadow-sm border-l-4 ${borderMap[color]} hover:-translate-y-0.5 transition-transform ${
      isDark ? 'bg-night-card border border-night-border' : 'bg-white'
    }`}>
      <p className={`text-[10px] md:text-xs uppercase tracking-widest font-bold mb-1 md:mb-2 leading-tight ${
        isDark ? 'text-night-muted' : 'text-muted'
      }`}>{label}</p>
      <p className={`text-2xl md:text-4xl font-serif ${
        isDark ? 'text-night-text' : 'text-forest'
      }`}>{value}</p>
      {sub && <p className={`text-[10px] md:text-xs mt-0.5 md:mt-1 ${
        isDark ? 'text-night-muted' : 'text-muted'
      }`}>{sub}</p>}
    </div>
  );
}
