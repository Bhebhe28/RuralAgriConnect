import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface Outbreak {
  outbreak_id: string;
  region: string;
  crop_type: string;
  description: string;
  severity: 'warning' | 'critical' | 'info';
  reported_date: string;
  reported_by_name?: string;
  source?: 'scan' | 'farmer' | 'admin' | 'feed';
}

interface CropScan {
  scan_id: string;
  user_name: string;
  region: string;
  crop_type: string;
  disease_name: string;
  has_disease: number;
  severity: string;
  diagnosis: string;
  created_at: string;
}

const SEV_STYLE: Record<string, string> = {
  critical: 'border-l-red-500 bg-red-50',
  warning:  'border-l-amber-500 bg-amber-50',
  info:     'border-l-blue-500 bg-blue-50',
};
const SEV_STYLE_DARK: Record<string, string> = {
  critical: 'border-l-red-500 bg-red-900/20',
  warning:  'border-l-amber-500 bg-amber-900/20',
  info:     'border-l-blue-500 bg-blue-900/20',
};
const SEV_BADGE: Record<string, string> = {
  critical: 'badge-red', warning: 'badge-orange', info: 'badge-blue',
};
const SEV_ICON: Record<string, string> = {
  critical: '🚨', warning: '⚠️', info: 'ℹ️',
};
const SOURCE_LABEL: Record<string, { icon: string; label: string; color: string }> = {
  scan:   { icon: '🔬', label: 'Crop Scan', color: 'bg-purple-100 text-purple-800' },
  farmer: { icon: '👤', label: 'Farmer Report', color: 'bg-green-100 text-green-800' },
  admin:  { icon: '🛡️', label: 'Admin Alert', color: 'bg-blue-100 text-blue-800' },
  feed:   { icon: '📡', label: 'Live Feed', color: 'bg-gray-100 text-gray-700' },
};

const CROPS   = ['Maize', 'Vegetables', 'Legumes', 'Poultry', 'Root Crops', 'Other'];
const REGIONS = ['eThekwini', 'uMgungundlovu', 'iLembe', 'Zululand', 'uThukela'];

export default function OutbreakDashboard() {
  const { isAdmin, user } = useAuth();
  const { isDark } = useTheme();
  const [tab, setTab]             = useState<'outbreaks' | 'scans'>('outbreaks');
  const [outbreaks, setOutbreaks] = useState<Outbreak[]>([]);
  const [scans, setScans]         = useState<CropScan[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [saved, setSaved]         = useState('');
  const [filter, setFilter]       = useState('all');
  const [syncing, setSyncing]     = useState(false);

  const [form, setForm] = useState({
    region: user?.region || 'KwaZulu-Natal — eThekwini',
    crop_type: 'Maize', description: '', severity: 'warning',
  });

  const load = async () => {
    try {
      const [oRes, sRes] = await Promise.all([
        api.get('/outbreaks'),
        api.get('/outbreaks/scans'),
      ]);
      setOutbreaks(oRes.data);
      setScans(sRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/outbreaks', form);
      setSaved('✅ Outbreak reported — all farmers notified.');
      setShowForm(false);
      setForm({ region: user?.region || 'KwaZulu-Natal — eThekwini', crop_type: 'Maize', description: '', severity: 'warning' });
      load();
      setTimeout(() => setSaved(''), 5000);
    } catch (err: any) {
      setSaved('❌ ' + (err.response?.data?.error || 'Failed to report'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    await api.delete(`/outbreaks/${id}`);
    load();
  };

  const handleLiveSync = async () => {
    setSyncing(true);
    setSaved('');
    try {
      const res = await api.post('/outbreaks/sync-feed');
      await load();
      setSaved(`✅ ${res.data.message}`);
      setTimeout(() => setSaved(''), 6000);
    } catch (err: any) {
      setSaved('❌ ' + (err.response?.data?.error || 'Feed sync failed'));
    } finally {
      setSyncing(false);
    }
  };

  const filtered    = filter === 'all' ? outbreaks : outbreaks.filter(o => o.severity === filter);
  const criticalCount = outbreaks.filter(o => o.severity === 'critical').length;
  const scanAlerts  = outbreaks.filter(o => o.source === 'scan');
  const byRegion    = REGIONS.map(r => ({
    region: r,
    count:    outbreaks.filter(o => o.region.includes(r)).length,
    critical: outbreaks.filter(o => o.region.includes(r) && o.severity === 'critical').length,
  }));

  const cardBase = isDark ? 'bg-night-card border-night-border' : 'bg-white border-sand';

  return (
    <div className={`p-4 md:p-7 animate-fade-in ${isDark ? 'text-night-text' : ''}`}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-serif">🦠 Pest & Disease Outbreaks</h2>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-night-muted' : 'text-muted'}`}>
            {criticalCount > 0
              ? `🚨 ${criticalCount} critical outbreak${criticalCount > 1 ? 's' : ''} active`
              : 'Community-driven outbreak monitoring for KZN'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <button onClick={handleLiveSync} disabled={syncing} className="btn-outline text-sm px-4 disabled:opacity-50">
              {syncing ? '⏳ Syncing…' : '📡 Live Feed'}
            </button>
          )}
          <button onClick={() => setShowForm(s => !s)} className="btn-danger">
            {showForm ? '✕ Cancel' : '🚨 Report Outbreak'}
          </button>
        </div>
      </div>

      {/* ── HIGH ALERT banner for scan-triggered outbreaks ── */}
      {scanAlerts.length > 0 && (
        <div className="rounded-2xl bg-red-600 text-white px-5 py-4 mb-5 animate-pulse-ring">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔬</span>
            <div>
              <p className="font-bold text-lg">HIGH ALERT — Disease Detected via Crop Scan</p>
              <p className="text-sm opacity-90">
                {scanAlerts.length} disease{scanAlerts.length > 1 ? 's' : ''} confirmed by AI crop scans from farmers in the field.
                Inspect your crops immediately.
              </p>
            </div>
          </div>
        </div>
      )}

      {saved && (
        <div className={`rounded-xl px-4 py-3 mb-4 text-sm border animate-fade-in ${
          saved.startsWith('✅') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>{saved}</div>
      )}

      {/* ── Region overview ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5 stagger">
        {byRegion.map(r => (
          <div key={r.region} className={`rounded-2xl p-4 text-center border-2 ${
            r.critical > 0 ? 'border-red-300 bg-red-50' : r.count > 0 ? 'border-amber-200 bg-amber-50' : `border-sand ${isDark ? 'bg-night-card' : 'bg-white'}`
          }`}>
            <p className={`text-2xl font-serif font-bold ${isDark ? 'text-night-primary' : 'text-forest'}`}>{r.count}</p>
            <p className={`text-xs font-semibold mt-0.5 ${isDark ? 'text-night-text' : 'text-dark'}`}>{r.region}</p>
            {r.critical > 0 && <p className="text-xs text-red-600 font-bold mt-0.5">🚨 {r.critical} critical</p>}
          </div>
        ))}
      </div>

      {/* ── Report form (all users) ── */}
      {showForm && (
        <div className={`card animate-scale-in mb-5 ${isDark ? 'bg-night-card border-night-border' : ''}`}>
          <h3 className="font-serif text-lg mb-4">🚨 Report an Outbreak in Your Area</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${isDark ? 'text-night-muted' : 'text-muted'}`}>Region</label>
                <select className="input" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}>
                  {REGIONS.map(r => <option key={r} value={`KwaZulu-Natal — ${r}`}>KZN — {r}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${isDark ? 'text-night-muted' : 'text-muted'}`}>Crop Affected</label>
                <select className="input" value={form.crop_type} onChange={e => setForm(f => ({ ...f, crop_type: e.target.value }))}>
                  {CROPS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${isDark ? 'text-night-muted' : 'text-muted'}`}>Severity</label>
              <div className="flex gap-2">
                {(['warning', 'critical', 'info'] as const).map(s => (
                  <button key={s} type="button" onClick={() => setForm(f => ({ ...f, severity: s }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all cursor-pointer ${
                      form.severity === s
                        ? s === 'critical' ? 'bg-red-600 text-white border-red-600'
                          : s === 'warning' ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-blue-500 text-white border-blue-500'
                        : `${isDark ? 'bg-night-surface border-night-border text-night-muted' : 'bg-white border-sand text-muted'} hover:border-moss`
                    }`}>
                    {SEV_ICON[s]} {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${isDark ? 'text-night-muted' : 'text-muted'}`}>What did you observe?</label>
              <textarea className="input resize-none" rows={3}
                placeholder="Describe what you saw — pest name, symptoms, how many plants affected…"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
            </div>
            <button type="submit" className="btn-danger w-full py-3">🚨 Submit & Alert Farmers</button>
          </form>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-2 mb-5">
        {(['outbreaks', 'scans'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold border-2 transition-all cursor-pointer ${
              tab === t ? 'bg-forest text-white border-forest' : `${isDark ? 'bg-night-card border-night-border text-night-muted' : 'bg-white border-sand text-muted'} hover:border-moss`
            }`}>
            {t === 'outbreaks' ? `🦠 Active Outbreaks ${outbreaks.length > 0 ? `(${outbreaks.length})` : ''}` : `🔬 Scan History ${scans.length > 0 ? `(${scans.length})` : ''}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={`card text-center py-12 ${isDark ? 'text-night-muted' : 'text-muted'}`}>Loading…</div>
      ) : tab === 'outbreaks' ? (
        <>
          {/* Severity filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {(['all', 'critical', 'warning', 'info'] as const).map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all cursor-pointer ${
                  filter === s ? 'bg-forest text-white border-forest' : `${isDark ? 'bg-night-card border-night-border text-night-muted' : 'bg-white border-sand text-muted'} hover:border-moss`
                }`}>
                {s === 'all' ? 'All' : `${SEV_ICON[s]} ${s}`}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className={`card text-center py-12 ${isDark ? cardBase : ''}`}>
              <p className="text-4xl mb-3">✅</p>
              <p className={`font-semibold ${isDark ? 'text-night-muted' : 'text-muted'}`}>No active outbreaks reported.</p>
              <p className={`text-sm mt-1 ${isDark ? 'text-night-muted' : 'text-muted'}`}>All regions are clear.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(o => {
                const src = SOURCE_LABEL[o.source || 'admin'];
                return (
                  <div key={o.outbreak_id}
                    className={`rounded-2xl p-5 border-l-4 border ${isDark ? SEV_STYLE_DARK[o.severity] + ' border-night-border' : SEV_STYLE[o.severity]}`}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`badge ${SEV_BADGE[o.severity]}`}>{SEV_ICON[o.severity]} {o.severity}</span>
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${src.color}`}>
                            {src.icon} {src.label}
                          </span>
                          <span className={`text-sm font-bold ${isDark ? 'text-night-text' : 'text-dark'}`}>{o.crop_type}</span>
                          <span className={`text-xs ${isDark ? 'text-night-muted' : 'text-muted'}`}>📍 {o.region.split('—')[1]?.trim() || o.region}</span>
                        </div>
                        <p className={`text-sm leading-relaxed ${isDark ? 'text-night-text' : ''}`}>{o.description}</p>
                        <div className={`flex gap-4 mt-2 text-xs flex-wrap ${isDark ? 'text-night-muted' : 'text-muted'}`}>
                          <span>👤 {o.reported_by_name || 'System'}</span>
                          <span>🕐 {new Date(o.reported_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {isAdmin && (
                        <button onClick={() => handleDelete(o.outbreak_id)} className="btn-danger text-xs px-3 py-1.5 flex-shrink-0">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ── Scan History tab ── */
        scans.length === 0 ? (
          <div className={`card text-center py-12 ${isDark ? cardBase : ''}`}>
            <p className="text-4xl mb-3">🔬</p>
            <p className={`font-semibold ${isDark ? 'text-night-muted' : 'text-muted'}`}>No crop scans yet.</p>
            <p className={`text-sm mt-1 ${isDark ? 'text-night-muted' : 'text-muted'}`}>When a farmer scans a plant in the AI Chatbot, the diagnosis appears here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scans.map(s => (
              <div key={s.scan_id} className={`card mb-0 ${isDark ? cardBase : ''}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        s.has_disease ? (s.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800') : 'bg-green-100 text-green-800'
                      }`}>
                        {s.has_disease ? (s.severity === 'critical' ? '🚨 Disease Found' : '⚠️ Disease Found') : '✅ Healthy'}
                      </span>
                      <span className={`text-sm font-semibold ${isDark ? 'text-night-text' : 'text-dark'}`}>{s.disease_name || s.crop_type}</span>
                    </div>
                    <div className={`flex gap-3 text-xs flex-wrap ${isDark ? 'text-night-muted' : 'text-muted'}`}>
                      <span>👤 {s.user_name}</span>
                      <span>📍 {s.region?.split('— ')[1] || s.region}</span>
                      <span>🕐 {new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className={`text-xs mt-2 line-clamp-2 ${isDark ? 'text-night-muted' : 'text-muted'}`}>{s.diagnosis}</p>
                  </div>
                  {s.has_disease === 1 && (
                    <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-1 rounded-lg flex-shrink-0">🔬 Outbreak triggered</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
