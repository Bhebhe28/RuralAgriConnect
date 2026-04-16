import React from 'react';

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
  return (
    <div className={`bg-white rounded-2xl p-3 md:p-5 shadow-sm border-l-4 ${borderMap[color]} hover:-translate-y-0.5 transition-transform`}>
      <p className="text-[10px] md:text-xs uppercase tracking-widest text-muted font-bold mb-1 md:mb-2 leading-tight">{label}</p>
      <p className="text-2xl md:text-4xl font-serif text-forest">{value}</p>
      {sub && <p className="text-[10px] md:text-xs text-muted mt-0.5 md:mt-1">{sub}</p>}
    </div>
  );
}
