import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Outbreak {
  outbreak_id: string;
  region: string;
  crop_type: string;
  description: string;
  severity: 'warning' | 'critical' | 'info';
  reported_date: string;
  reported_by_name: string;
  temperature?: number;
  humidity?: number;
}

const SEV_STYLE: Record<string, string> = {
  critical: 'border-l-red-500 bg-red-50',
  warning:  'border-l-amber-500 bg-amber-50',
  info:     'border-l-blue-500 bg-blue-50',
};
const SEV_BADGE: Record<string, string> = {
  critical: 'badge-red', warning: 'badge-orange', info: 'badge-blue',
};
const SEV_ICON: Record<string, string> = {
  critical: '🚨', warning: '⚠️', info: 'ℹ️',
};

const CROPS   = ['Maize', 'Vegetables', 'Legumes', 'Poultry', 'Root Crops', 'Other'];
const REGIONS = ['eThekwini', 'uMgungundlovu', 'iLembe', 'Zululand', 'uThukela'];

export default function OutbreakDashboard() {
  const { isAdmin } = useAuth();
  const [outbreaks, setOutbreaks] = useState<Outbreak[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [saved, setSaved]         = useState('');
  const [filter, setFilter]       = useState('all');

  const [form, setForm] = useState({
    region: 'KwaZulu-Natal — eThekwini',
    crop_type: 'Maize', description: '', severity: 'warning',
  });

  const load = () => api.get('/outbreaks').then(r => { setOutbreaks(r.data); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/outbreaks', form);
      setSaved('✅ Outbreak reported and farmers notified.');
      setShowForm(false);
      setForm({ region: 'KwaZulu-Natal — eThekwini', crop_type: 'Maize', description: '', severity: 'warning' });
      load();
      setTimeout(() => setSaved(''), 4000);
    } catch (err: any) {
      setSaved('❌ ' + (err.response?.data?.error || 'Failed to report'));
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/outbreaks/${id}`);
    load();
  };

  const filtered = filter === 'all' ? outbreaks : outbreaks.filter(o => o.severity === filter);
  const criticalCount = outbreaks.filter(o => o.severity === 'critical').length;

  // Region summary
  const byRegion = REGIONS.map(r => ({
    region: r,
    count: outbreaks.filter(o => o.region.includes(r)).length,
    critical: outbreaks.filter(o => o.region.includes(r) && o.severity === 'critical').length,
  }));

  return (
    <div className="p-4 md:p-7 animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-serif">🦠 Pest & Disease Outbreaks</h2>
          <p className="text-sm text-muted mt-0.5">
            {criticalCount > 0
              ? `🚨 ${criticalCount} critical outbreak${criticalCount > 1 ? 's' : ''} active`
              : 'Monitor and report pest outbreaks across KZN regions'}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(s => !s)} className="btn-danger">
            {showForm ? '✕ Cancel' : '🚨 Report Outbreak'}
          </button>
        )}
      </div>

      {saved && (
        <div className={`rounded-xl px-4 py-3 mb-5 text-sm border animate-fade-in ${
          saved.startsWith('✅') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>{saved}</div>
      )}

      {/* Region overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 stagger">
        {byRegion.map(r => (
          <div key={r.region} className={`rounded-2xl p-4 text-center border-2 animate-fade-in ${
            r.critical > 0 ? 'border-red-300 bg-red-50' : r.count > 0 ? 'border-amber-200 bg-amber-50' : 'border-sand bg-white'
          }`}>
            <p className="text-2xl font-serif font-bold text-forest">{r.count}</p>
            <p className="text-xs font-semibold text-dark mt-0.5">{r.region}</p>
            {r.critical > 0 && <p className="text-xs text-red-600 font-bold mt-0.5">🚨 {r.critical} critical</p>}
          </div>
        ))}
      </div>

      {/* Report form */}
      {showForm && isAdmin && (
        <div className="card animate-scale-in mb-6">
          <h3 className="font-serif text-lg mb-4">🚨 Report New Outbreak</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Region</label>
                <select className="input" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}>
                  {REGIONS.map(r => <option key={r} value={`KwaZulu-Natal — ${r}`}>KZN — {r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Crop Affected</label>
                <select className="input" value={form.crop_type} onChange={e => setForm(f => ({ ...f, crop_type: e.target.value }))}>
                  {CROPS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Severity</label>
              <div className="flex gap-2">
                {['warning', 'critical', 'info'].map(s => (
                  <button key={s} type="button" onClick={() => setForm(f => ({ ...f, severity: s }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all cursor-pointer ${
                      form.severity === s
                        ? s === 'critical' ? 'bg-red-600 text-white border-red-600'
                          : s === 'warning' ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white border-sand text-muted hover:border-moss'
                    }`}>
                    {SEV_ICON[s]} {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Description</label>
              <textarea className="input resize-none" rows={3}
                placeholder="Describe the outbreak — pest/disease name, symptoms, spread, recommended action…"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
            </div>
            <button type="submit" className="btn-danger w-full py-3">🚨 Report & Alert Farmers</button>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {['all', 'critical', 'warning', 'info'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all cursor-pointer ${
              filter === s ? 'bg-forest text-white border-forest' : 'bg-white border-sand text-muted hover:border-moss'
            }`}>
            {s === 'all' ? 'All' : `${SEV_ICON[s]} ${s}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card text-center py-12 text-muted">Loading outbreaks…</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-muted font-semibold">No active outbreaks reported.</p>
          <p className="text-muted text-sm mt-1">All regions are clear.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => (
            <div key={o.outbreak_id} className={`rounded-2xl p-5 border-l-4 border border-sand ${SEV_STYLE[o.severity]}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`badge ${SEV_BADGE[o.severity]}`}>{SEV_ICON[o.severity]} {o.severity}</span>
                    <span className="text-sm font-bold text-dark">{o.crop_type}</span>
                    <span className="text-xs text-muted">📍 {o.region.split('—')[1]?.trim() || o.region}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{o.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-muted flex-wrap">
                    <span>👤 Reported by {o.reported_by_name || 'System'}</span>
                    <span>🕐 {new Date(o.reported_date).toLocaleDateString()}</span>
                    {o.temperature && <span>🌡️ {o.temperature}°C</span>}
                    {o.humidity && <span>💧 {o.humidity}% humidity</span>}
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => handleDelete(o.outbreak_id)} className="btn-danger text-xs px-3 py-1.5 flex-shrink-0">
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
