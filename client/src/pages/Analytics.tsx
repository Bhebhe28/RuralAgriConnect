import React, { useState, useEffect } from 'react';
import { getAnalytics } from '../services/firestore';

const SEV_COLOR: Record<string, string> = { critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };

function Bar({ value, max, color = '#52B788' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 bg-sand rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export default function Analytics() {
  const [data, setData]       = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-7 text-center text-muted py-20">Loading analytics…</div>;
  if (!data)   return <div className="p-7 text-center text-muted py-20">Failed to load analytics.</div>;

  const maxFarmers = Math.max(...(data.farmersByRegion.map((r: any) => r.count)), 1);
  const maxCrop    = Math.max(...(data.advisoriesByCrop.map((r: any) => r.count)), 1);
  const maxYield   = Math.max(...(data.yieldByCrop.map((r: any) => r.tons)), 1);

  const statCards = [
    { icon: '👥', label: 'Total Users',       value: data.total_users,       color: 'text-forest' },
    { icon: '🌾', label: 'Farmers',           value: data.farmers,           color: 'text-moss' },
    { icon: '📋', label: 'Advisories',        value: data.total_advisories,  color: 'text-earth' },
    { icon: '🦠', label: 'Outbreaks',         value: data.total_outbreaks,   color: 'text-red-500' },
    { icon: '📸', label: 'AI Scans',          value: data.total_scans,       color: 'text-indigo-500' },
    { icon: '🗺️', label: 'Registered Fields', value: data.total_fields,      color: 'text-blue-600' },
    { icon: '📐', label: 'Total Hectares',    value: `${data.total_hectares} ha`, color: 'text-forest' },
    { icon: '🌾', label: 'Yield Reported',    value: `${data.total_yield_tons} t`, color: 'text-moss' },
    { icon: '📦', label: 'Resource Requests', value: data.total_subsidies,   color: 'text-purple-600' },
    { icon: '⏳', label: 'Pending Requests',  value: data.pending_subsidies, color: 'text-amber-600' },
    { icon: '💬', label: 'Community Posts',   value: data.total_posts,       color: 'text-blue-500' },
    { icon: '📊', label: 'Yield Reports',     value: data.total_yields,      color: 'text-teal-600' },
  ];

  return (
    <div className="p-4 md:p-7 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-serif">📊 Municipality Analytics</h2>
        <p className="text-sm text-muted mt-0.5">System-wide overview for KwaZulu-Natal agricultural reporting</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8 stagger">
        {statCards.map(s => (
          <div key={s.label} className="card mb-0 text-center animate-fade-in hover:-translate-y-0.5 transition-transform">
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className={`text-2xl font-serif font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted mt-1 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <div className="card">
          <h3 className="font-serif text-lg mb-4">👥 Farmers by Region</h3>
          {data.farmersByRegion.length === 0 ? <p className="text-muted text-sm">No data yet.</p> : (
            <div className="space-y-3">
              {data.farmersByRegion.map((r: any) => (
                <div key={r.region}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-dark font-medium">{r.region}</span>
                    <span className="font-bold text-forest">{r.count}</span>
                  </div>
                  <Bar value={r.count} max={maxFarmers} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-serif text-lg mb-4">📋 Advisories by Crop</h3>
          {data.advisoriesByCrop.length === 0 ? <p className="text-muted text-sm">No advisories yet.</p> : (
            <div className="space-y-3">
              {data.advisoriesByCrop.map((r: any) => (
                <div key={r.crop_type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-dark font-medium">{r.crop_type}</span>
                    <span className="font-bold text-forest">{r.count}</span>
                  </div>
                  <Bar value={r.count} max={maxCrop} color="#C8963C" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-serif text-lg mb-4">🌾 Yield by Crop</h3>
          {data.yieldByCrop.length === 0 ? <p className="text-muted text-sm">No yield reports yet.</p> : (
            <div className="space-y-3">
              {data.yieldByCrop.map((r: any) => (
                <div key={r.crop_type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-dark font-medium">{r.crop_type}</span>
                    <span className="font-bold text-forest">{r.tons} tons ({r.reports} reports)</span>
                  </div>
                  <Bar value={r.tons} max={maxYield} color="#1B4332" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-serif text-lg mb-4">⚠️ Advisory Severity</h3>
          {data.advisoriesBySeverity.length === 0 ? <p className="text-muted text-sm">No advisories yet.</p> : (
            <div className="space-y-4">
              {data.advisoriesBySeverity.map((s: any) => (
                <div key={s.severity} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-semibold capitalize">{s.severity}</div>
                  <div className="flex-1">
                    <Bar value={s.count} max={data.total_advisories} color={SEV_COLOR[s.severity] || '#52B788'} />
                  </div>
                  <div className="w-8 text-right text-sm font-bold text-forest">{s.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {data.outbreaksByRegion.length > 0 && (
          <div className="card">
            <h3 className="font-serif text-lg mb-4">🦠 Outbreaks by Region</h3>
            <div className="space-y-2">
              {data.outbreaksByRegion.map((o: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-sand last:border-0">
                  <span className="text-sm font-medium">{o.region}</span>
                  <span className="badge badge-orange">{o.count} outbreak{o.count > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.subsidiesByType.length > 0 && (
          <div className="card">
            <h3 className="font-serif text-lg mb-4">📦 Resource Requests by Type</h3>
            <div className="space-y-2">
              {data.subsidiesByType.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-sand last:border-0">
                  <span className="text-sm font-medium">{s.resource_type}</span>
                  <span className="badge badge-blue">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
