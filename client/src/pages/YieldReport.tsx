import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface YieldReport {
  report_id: string;
  season: string;
  crop_type: string;
  region: string;
  area_hectares: number;
  yield_kg: number;
  quality: string;
  notes: string;
  reported_at: string;
  farmer_name?: string;
}

interface Summary {
  crop_type: string;
  region: string;
  season: string;
  farm_count: number;
  total_hectares: number;
  total_yield_kg: number;
  avg_yield_per_ha: number;
}

const CROPS   = ['Maize', 'Vegetables', 'Legumes', 'Poultry', 'Root Crops', 'Other'];
const SEASONS = ['2026/27', '2025/26', '2024/25', '2023/24'];
const QUALITY = ['excellent', 'good', 'fair', 'poor'];
const REGIONS = ['eThekwini', 'uMgungundlovu', 'iLembe', 'Zululand', 'uThukela'];

export default function YieldReport() {
  const { isAdmin } = useAuth();
  const [reports, setReports]   = useState<YieldReport[]>([]);
  const [summary, setSummary]   = useState<Summary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved]       = useState('');
  const [tab, setTab]           = useState<'mine' | 'all' | 'summary'>('mine');

  const [form, setForm] = useState({
    season: '2025/26', crop_type: 'Maize',
    region: 'KwaZulu-Natal — eThekwini',
    area_hectares: '', yield_kg: '', quality: 'good', notes: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const [all, sum] = await Promise.all([
          api.get('/yields').then(r => r.data),
          api.get('/yields/summary').then(r => r.data),
        ]);
        setReports(all);
        setSummary(sum);
      } else {
        const mine = await api.get('/yields/mine').then(r => r.data);
        setReports(mine);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/yields', {
        ...form,
        area_hectares: parseFloat(form.area_hectares),
        yield_kg: parseFloat(form.yield_kg),
      });
      setSaved('✅ Yield report submitted successfully!');
      setShowForm(false);
      setForm({ season: '2025/26', crop_type: 'Maize', region: 'KwaZulu-Natal — eThekwini', area_hectares: '', yield_kg: '', quality: 'good', notes: '' });
      load();
      setTimeout(() => setSaved(''), 4000);
    } catch (err: any) {
      setSaved('❌ ' + (err.response?.data?.error || 'Failed to submit'));
    }
  };

  const qualityColor = (q: string) => ({
    excellent: 'badge-green', good: 'badge-blue', fair: 'badge-orange', poor: 'badge-red'
  }[q] || 'badge-blue');

  return (
    <div className="p-4 md:p-7 animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-serif">🌾 Crop Yield Reports</h2>
          <p className="text-sm text-muted mt-0.5">
            {isAdmin ? 'Municipality food production overview' : 'Track your harvest and contribute to regional food security data'}
          </p>
        </div>
        {!isAdmin && (
          <button onClick={() => setShowForm(s => !s)} className="btn-primary">
            {showForm ? '✕ Cancel' : '+ Log Harvest'}
          </button>
        )}
      </div>

      {saved && (
        <div className={`rounded-xl px-4 py-3 mb-5 text-sm border animate-fade-in ${
          saved.startsWith('✅') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>{saved}</div>
      )}

      {/* Submit form */}
      {showForm && (
        <div className="card animate-scale-in mb-6">
          <h3 className="font-serif text-lg mb-4">📝 Log Your Harvest</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Season</label>
                <select className="input" value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))}>
                  {SEASONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Crop Type</label>
                <select className="input" value={form.crop_type} onChange={e => setForm(f => ({ ...f, crop_type: e.target.value }))}>
                  {CROPS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Region</label>
              <select className="input" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}>
                {REGIONS.map(r => <option key={r} value={`KwaZulu-Natal — ${r}`}>KwaZulu-Natal — {r}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Area (Hectares)</label>
                <input className="input" type="number" step="0.1" min="0.1" placeholder="e.g. 2.5"
                  value={form.area_hectares} onChange={e => setForm(f => ({ ...f, area_hectares: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Total Yield (kg)</label>
                <input className="input" type="number" step="1" min="1" placeholder="e.g. 4500"
                  value={form.yield_kg} onChange={e => setForm(f => ({ ...f, yield_kg: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Crop Quality</label>
              <div className="flex gap-2 flex-wrap">
                {QUALITY.map(q => (
                  <button key={q} type="button"
                    onClick={() => setForm(f => ({ ...f, quality: q }))}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all cursor-pointer ${
                      form.quality === q ? 'bg-forest text-white border-forest' : 'bg-white border-sand text-muted hover:border-moss'
                    }`}>
                    {q.charAt(0).toUpperCase() + q.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Notes (optional)</label>
              <textarea className="input resize-none" rows={2} placeholder="Any challenges, observations, or comments…"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button type="submit" className="btn-primary w-full py-3">Submit Yield Report</button>
          </form>
        </div>
      )}

      {/* Admin tabs */}
      {isAdmin && (
        <div className="flex bg-sand rounded-2xl p-1 mb-5 w-fit">
          {(['all', 'summary'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-white text-forest shadow-sm' : 'text-muted'}`}>
              {t === 'all' ? '📋 All Reports' : '📊 Summary'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="card text-center py-12 text-muted">Loading reports…</div>
      ) : tab === 'summary' && isAdmin ? (
        /* Summary view */
        <div className="space-y-4">
          {summary.length === 0 ? (
            <div className="card text-center py-12 text-muted">No yield data yet.</div>
          ) : (
            <>
              {/* Totals banner */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2 stagger">
                {[
                  { label: 'Total Farms Reporting', value: summary.reduce((a, s) => a + s.farm_count, 0), icon: '🏡' },
                  { label: 'Total Hectares', value: summary.reduce((a, s) => a + s.total_hectares, 0).toFixed(1) + ' ha', icon: '📐' },
                  { label: 'Total Yield', value: (summary.reduce((a, s) => a + s.total_yield_kg, 0) / 1000).toFixed(1) + ' tons', icon: '🌾' },
                  { label: 'Crop Types', value: [...new Set(summary.map(s => s.crop_type))].length, icon: '🌱' },
                ].map(stat => (
                  <div key={stat.label} className="card mb-0 text-center animate-fade-in">
                    <div className="text-3xl mb-1">{stat.icon}</div>
                    <p className="text-2xl font-serif text-forest font-bold">{stat.value}</p>
                    <p className="text-xs text-muted mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="card overflow-x-auto">
                <h3 className="font-serif text-lg mb-4">Regional Production Summary</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-sand">
                      {['Crop', 'Region', 'Season', 'Farms', 'Hectares', 'Total Yield', 'Avg/Ha'].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-xs uppercase tracking-wide text-muted font-bold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((s, i) => (
                      <tr key={i} className="border-b border-sand hover:bg-cream transition-colors">
                        <td className="py-3 px-3 font-medium">{s.crop_type}</td>
                        <td className="py-3 px-3 text-muted text-xs">{s.region.split('—')[1]?.trim() || s.region}</td>
                        <td className="py-3 px-3 text-muted">{s.season}</td>
                        <td className="py-3 px-3 text-center font-semibold text-forest">{s.farm_count}</td>
                        <td className="py-3 px-3">{s.total_hectares} ha</td>
                        <td className="py-3 px-3 font-semibold">{(s.total_yield_kg / 1000).toFixed(1)} tons</td>
                        <td className="py-3 px-3 text-moss font-semibold">{s.avg_yield_per_ha} kg/ha</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Reports list */
        <div className="card overflow-x-auto">
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🌾</p>
              <p className="text-muted">No yield reports yet.</p>
              {!isAdmin && <button onClick={() => setShowForm(true)} className="btn-primary mt-4">Log Your First Harvest</button>}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-sand">
                  {[isAdmin && 'Farmer', 'Crop', 'Season', 'Region', 'Area', 'Yield', 'Quality', 'Date']
                    .filter(Boolean).map(h => (
                    <th key={h as string} className="text-left py-2 px-3 text-xs uppercase tracking-wide text-muted font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.report_id} className="border-b border-sand hover:bg-cream transition-colors">
                    {isAdmin && <td className="py-3 px-3 font-medium">{r.farmer_name}</td>}
                    <td className="py-3 px-3 font-medium">{r.crop_type}</td>
                    <td className="py-3 px-3 text-muted">{r.season}</td>
                    <td className="py-3 px-3 text-muted text-xs">{r.region.split('—')[1]?.trim() || r.region}</td>
                    <td className="py-3 px-3">{r.area_hectares} ha</td>
                    <td className="py-3 px-3 font-semibold text-forest">{r.yield_kg.toLocaleString()} kg</td>
                    <td className="py-3 px-3"><span className={`badge ${qualityColor(r.quality)}`}>{r.quality}</span></td>
                    <td className="py-3 px-3 text-muted text-xs">{new Date(r.reported_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
