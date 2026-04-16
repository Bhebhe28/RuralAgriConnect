import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Advisory } from '../types';

const cropColors: Record<string, string> = {
  Maize:      'from-amber-400 to-amber-600',
  Vegetables: 'from-emerald-400 to-emerald-600',
  Poultry:    'from-orange-400 to-orange-600',
  General:    'from-soil to-amber-900',
  Pest:       'from-red-400 to-red-600',
};

const severityBadge: Record<string, string> = {
  info:     'badge-blue',
  warning:  'badge-orange',
  critical: 'badge-red',
};

interface Props { advisory: Advisory; }

export default function AdvisoryCard({ advisory }: Props) {
  const navigate = useNavigate();
  const gradient = cropColors[advisory.crop] || 'from-moss to-forest-mid';

  return (
    <div
      onClick={() => navigate(`/advisories/${advisory.id}`)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-md transition-all cursor-pointer"
    >
      <div className={`h-2 bg-gradient-to-r ${gradient}`} />
      <div className="p-5">
        <span className={`${severityBadge[advisory.severity]} mb-2`}>{advisory.severity}</span>
        <h3 className="font-serif text-base leading-snug mb-1">{advisory.title}</h3>
        <p className="text-sm text-muted line-clamp-2">{advisory.content}</p>
        <div className="flex gap-3 mt-3 text-xs text-muted">
          <span>🌾 {advisory.crop}</span>
          <span>📍 {advisory.region}</span>
          <span>👤 {advisory.author_name}</span>
        </div>
      </div>
    </div>
  );
}
