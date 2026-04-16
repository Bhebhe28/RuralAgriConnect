import React, { useState, useEffect } from 'react';
import api from '../api/client';

interface AnalyticsData {
  totals: {
    users: number; farmers: number; advisories: number; alerts: number;
    outbreaks: number; yieldReports: number; fields: number;
    subsidies: number; pendingSubsidies: number;
    hectares: number; yieldTons: number; aiChats: number; imageScans: number;
  };
  farmersByRegion: Array<{ region: string; count: number }>;
  advisoriesByCrop: Array<{ crop_type: string; count: number }>;
  advisoriesBySeverity: Array<{ severity: string; count: number }>;
  yieldByCrop: Array<{ crop_type: string; tons: number; reports: number }>;
  outbreaksByRegion: Array<{ region: string; count: number; severity: string }>;
  subsidiesByType: Array<{ resource_type: string; count: number; status: string }>;
  recentActivity: Array<{ action: string; details: string; created_at: string; user_name: string }>;
  monthlyRegistrations: Array<{ month: string; count: number }>;
}

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
  const [data, setData]     = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-7 text-center text-muted py-20">Loading analytics…</div>;
  if (!data)   return <div className="p-7 text-center text-muted py-20">Failed to load analytics.</div>;

  const { totals } = data;
  const maxFarmers = Math.max(...data.farmersByRegion.map(r => r.count), 1);
  const maxCrop    = Math.max(...data.advisoriesByCrop.map(r => r.count), 1);
  const maxYield   = Math.max(...data.yieldByCrop.map(r => r.tons), 1);

  const statCards = [
    { icon: '👥', label: 'Total Users',       value: totals.users,          color: 'text-forest' },
    { icon: '🌾', label: 'Farmers',           value: totals.farmers,        color: 'text-moss' },
    { icon: '📋', label: 'Advisories',        value: totals.advisories,     color: 'text-earth' },
    { icon: '⚠️', label: 'Active Alerts',     value: totals.alerts,         color: 'text-amber-600' },
    { icon: '🦠', label: 'Outbreaks',         value: totals.outbreaks,      color: 'text-red-500' },
    { icon: '🗺️', label: 'Registered Fields', value: totals.fields,         color: 'text-blue-600' },
    { icon: '📐', label: 'Total Hectares',    value: `${totals.hectares} ha`, color: 'text-forest' },
    { icon: '🌾', label: 'Yield Reported',    value: `${totals.yieldTons} t`, color: 'text-moss' },
    { icon: '📦', label: 'Resource Requests', value: totals.subsidies,      color: 'text-purple-600' },
    { icon: '⏳', label: 'Pending Requests',  value: totals.pendingSubsidies, color: 'text-amber-600' },
    { icon: '🤖', label: 'AI Chats',          value: totals.aiChats,        color: 'text-blue-500' },
    { icon: '📸', label: 'Image Scans',       value: totals.imageScans,     color: 'text-indigo-500' },
  ];

  return (
    <div className="p-4 md:p-7 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-serif">📊 Municipality Analytics</h2>
        <p className="text-sm text-muted mt-0.5">System-wide overview for KwaZulu-Natal agricultural reporting</p>
      </div>

      {/* KPI grid */}
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

        {/* Farmers by region */}
        <div className="card">
          <h3 className="font-serif text-lg mb-4">👥 Farmers by Region</h3>
          {data.farmersByRegion.length === 0 ? <p className="text-muted text-sm">No data yet.</p> : (
            <div className="space-y-3">
              {data.farmersByRegion.map(r => (
                <div key={r.region}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-dark font-medium">{r.region?.split('—')[1]?.trim() || r.region}</span>
                    <span className="font-bold text-forest">{r.count}</span>
                  </div>
                  <Bar value={r.count} max={maxFarmers} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Advisories by crop */}
        <div className="card">
          <h3 className="font-serif text-lg mb-4">📋 Advisories by Crop</h3>
          {data.advisoriesByCrop.length === 0 ? <p className="text-muted text-sm">No advisories yet.</p> : (
            <div className="space-y-3">
              {data.advisoriesByCrop.map(r => (
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

        {/* Yield by crop */}
        <div className="card">
          <h3 className="font-serif text-lg mb-4">🌾 Yield Reported by Crop</h3>
          {data.yieldByCrop.length === 0 ? <p className="text-muted text-sm">No yield reports yet.</p> : (
            <div className="space-y-3">
              {data.yieldByCrop.map(r => (
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

        {/* Advisory severity breakdown */}
        <div className="card">
          <h3 className="font-serif text-lg mb-4">⚠️ Advisory Severity Breakdown</h3>
          {data.advisoriesBySeverity.length === 0 ? <p className="text-muted text-sm">No advisories yet.</p> : (
            <div className="space-y-4">
              {data.advisoriesBySeverity.map(s => (
                <div key={s.severity} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-semibold capitalize">{s.severity}</div>
                  <div className="flex-1">
                    <Bar value={s.count} max={totals.advisories} color={SEV_COLOR[s.severity] || '#52B788'} />
                  </div>
                  <div className="w-8 text-right text-sm font-bold text-forest">{s.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Outbreaks by region */}
        {data.outbreaksByRegion.length > 0 && (
          <div className="card">
            <h3 className="font-serif text-lg mb-4">🦠 Outbreaks by Region</h3>
            <div className="space-y-2">
              {data.outbreaksByRegion.map((o, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-sand last:border-0">
                  <span className="text-sm font-medium">{o.region?.split('—')[1]?.trim() || o.region}</span>
                  <span className="badge badge-orange">{o.count} outbreak{o.count > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resource requests by type */}
        {data.subsidiesByType.length > 0 && (
          <div className="card">
            <h3 className="font-serif text-lg mb-4">📦 Resource Requests by Type</h3>
            <div className="space-y-2">
              {data.subsidiesByType.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-sand last:border-0">
                  <span className="text-sm font-medium">{s.resource_type}</span>
                  <span className="badge badge-blue">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent activity */}
        <div className="card lg:col-span-2">
          <h3 className="font-serif text-lg mb-4">🕐 Recent System Activity</h3>
          {data.recentActivity.length === 0 ? <p className="text-muted text-sm">No activity yet.</p> : (
            <div className="divide-y divide-sand">
              {data.recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 py-3">
                  <div className="w-8 h-8 rounded-full bg-forest/10 flex items-center justify-center text-xs font-bold text-forest flex-shrink-0">
                    {a.user_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark">{a.user_name || 'System'}</p>
                    <p className="text-xs text-muted truncate">{a.action.replace(/_/g, ' ')} — {a.details}</p>
                  </div>
                  <p className="text-xs text-muted flex-shrink-0">{new Date(a.created_at).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
