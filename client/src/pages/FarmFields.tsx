import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Field {
  field_id: string;
  field_name: string;
  crop_type: string;
  area_hectares: number;
  gps_lat?: number;
  gps_lng?: number;
  soil_type?: string;
  irrigation: string;
  notes?: string;
  created_at: string;
  farmer_name?: string;
  farmer_region?: string;
}

interface Summary {
  region: string;
  crop_type: string;
  field_count: number;
  total_hectares: number;
  avg_field_size: number;
}

const CROPS      = ['Maize', 'Vegetables', 'Legumes', 'Poultry', 'Root Crops', 'Fruit', 'Other'];
const SOILS      = ['Sandy', 'Clay', 'Loam', 'Sandy Loam', 'Clay Loam', 'Silt', 'Unknown'];
const IRRIGATION = ['none', 'drip', 'sprinkler', 'flood', 'manual'];
const REGIONS    = ['eThekwini', 'uMgungundlovu', 'iLembe', 'Zululand', 'uThukela'];

export default function FarmFields() {
  const { isAdmin } = useAuth();
  const [fields, setFields]     = useState<Field[]>([]);
  const [summary, setSummary]   = useState<Summary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Field | null>(null);
  const [saved, setSaved]       = useState('');
  const [tab, setTab]           = useState<'fields' | 'summary'>('fields');
  const [gpsLoading, setGpsLoading] = useState(false);

  const [form, setForm] = useState({
    field_name: '', crop_type: 'Maize', area_hectares: '',
    gps_lat: '', gps_lng: '', soil_type: 'Loam', irrigation: 'none', notes: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const [all, sum] = await Promise.all([
          api.get('/fields').then(r => r.data),
          api.get('/fields/summary').then(r => r.data),
        ]);
        setFields(all);
        setSummary(sum);
      } else {
        setFields(await api.get('/fields/mine').then(r => r.data));
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({ ...f, gps_lat: pos.coords.latitude.toFixed(6), gps_lng: pos.coords.longitude.toFixed(6) }));
        setGpsLoading(false);
      },
      () => setGpsLoading(false)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, area_hectares: parseFloat(form.area_hectares), gps_lat: form.gps_lat ? parseFloat(form.gps_lat) : undefined, gps_lng: form.gps_lng ? parseFloat(form.gps_lng) : undefined };
      if (editing) {
        await api.put(`/fields/${editing.field_id}`, payload);
        setSaved('✅ Field updated.');
      } else {
        await api.post('/fields', payload);
        setSaved('✅ Field registered successfully!');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ field_name: '', crop_type: 'Maize', area_hectares: '', gps_lat: '', gps_lng: '', soil_type: 'Loam', irrigation: 'none', notes: '' });
      load();
      setTimeout(() => setSaved(''), 3000);
    } catch (err: any) {
      setSaved('❌ ' + (err.response?.data?.error || 'Failed'));
    }
  };

  const startEdit = (f: Field) => {
    setEditing(f);
    setForm({ field_name: f.field_name, crop_type: f.crop_type, area_hectares: String(f.area_hectares), gps_lat: String(f.gps_lat || ''), gps_lng: String(f.gps_lng || ''), soil_type: f.soil_type || 'Loam', irrigation: f.irrigation, notes: f.notes || '' });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/fields/${id}`);
    load();
  };

  const totalHa = fields.reduce((a, f) => a + f.area_hectares, 0);

  return (
    <div className="p-4 md:p-7 animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-serif">🗺️ Farm Field Registration</h2>
          <p className="text-sm text-muted mt-0.5">
            {isAdmin ? `${fields.length} fields registered · ${totalHa.toFixed(1)} total hectares` : 'Register and manage your farm fields'}
          </p>
        </div>
        {!isAdmin && (
          <button onClick={() => { setShowForm(s => !s); setEditing(null); setForm({ field_name: '', crop_type: 'Maize', area_hectares: '', gps_lat: '', gps_lng: '', soil_type: 'Loam', irrigation: 'none', notes: '' }); }}
            className="btn-primary">
            {showForm && !editing ? '✕ Cancel' : '+ Register Field'}
          </button>
        )}
      </div>

      {saved && (
        <div className={`rounded-xl px-4 py-3 mb-5 text-sm border animate-fade-in ${
          saved.startsWith('✅') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>{saved}</div>
      )}

      {/* Form */}
      {showForm && (
        <div className="card animate-scale-in mb-6">
          <h3 className="font-serif text-lg mb-4">{editing ? '✏️ Edit Field' : '📍 Register New Field'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Field Name</label>
                <input className="input" placeholder="e.g. North Field A" value={form.field_name}
                  onChange={e => setForm(f => ({ ...f, field_name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Crop Type</label>
                <select className="input" value={form.crop_type} onChange={e => setForm(f => ({ ...f, crop_type: e.target.value }))}>
                  {CROPS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Area (Hectares)</label>
                <input className="input" type="number" step="0.1" min="0.1" placeholder="e.g. 3.5"
                  value={form.area_hectares} onChange={e => setForm(f => ({ ...f, area_hectares: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Irrigation</label>
                <select className="input" value={form.irrigation} onChange={e => setForm(f => ({ ...f, irrigation: e.target.value }))}>
                  {IRRIGATION.map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">GPS Location</label>
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="Latitude" value={form.gps_lat}
                  onChange={e => setForm(f => ({ ...f, gps_lat: e.target.value }))} />
                <input className="input flex-1" placeholder="Longitude" value={form.gps_lng}
                  onChange={e => setForm(f => ({ ...f, gps_lng: e.target.value }))} />
                <button type="button" onClick={getGPS} disabled={gpsLoading}
                  className="btn-outline px-3 flex-shrink-0 text-sm" title="Use my current location">
                  {gpsLoading ? '⏳' : '📍'}
                </button>
              </div>
              <p className="text-xs text-muted mt-1">Tap 📍 to auto-fill your current GPS coordinates</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Soil Type</label>
              <select className="input" value={form.soil_type} onChange={e => setForm(f => ({ ...f, soil_type: e.target.value }))}>
                {SOILS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">Notes (optional)</label>
              <textarea className="input resize-none" rows={2} placeholder="Any additional details about this field…"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1 py-3">{editing ? 'Update Field' : 'Register Field'}</button>
              {editing && <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn-outline px-5">Cancel</button>}
            </div>
          </form>
        </div>
      )}

      {/* Admin tabs */}
      {isAdmin && (
        <div className="flex bg-sand rounded-2xl p-1 mb-5 w-fit">
          {(['fields', 'summary'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? 'bg-white text-forest shadow-sm' : 'text-muted'}`}>
              {t === 'fields' ? '📋 All Fields' : '📊 Summary'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="card text-center py-12 text-muted">Loading fields…</div>
      ) : tab === 'summary' && isAdmin ? (
        <div className="card overflow-x-auto">
          <h3 className="font-serif text-lg mb-4">Regional Land Use Summary</h3>
          {summary.length === 0 ? <p className="text-muted text-sm">No fields registered yet.</p> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-sand">
                  {['Region', 'Crop', 'Fields', 'Total Ha', 'Avg Size'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs uppercase tracking-wide text-muted font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.map((s, i) => (
                  <tr key={i} className="border-b border-sand hover:bg-cream">
                    <td className="py-3 px-3 text-xs text-muted">{s.region?.split('—')[1]?.trim() || s.region || 'Unknown'}</td>
                    <td className="py-3 px-3 font-medium">{s.crop_type}</td>
                    <td className="py-3 px-3 text-center font-bold text-forest">{s.field_count}</td>
                    <td className="py-3 px-3 font-semibold">{s.total_hectares} ha</td>
                    <td className="py-3 px-3 text-muted">{s.avg_field_size} ha</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : fields.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="text-muted">No fields registered yet.</p>
          {!isAdmin && <button onClick={() => setShowForm(true)} className="btn-primary mt-4">Register Your First Field</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map(f => (
            <div key={f.field_id} className="card mb-0">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-dark">{f.field_name}</h3>
                  {isAdmin && <p className="text-xs text-forest font-medium mt-0.5">👤 {f.farmer_name} · {f.farmer_region?.split('—')[1]?.trim()}</p>}
                </div>
                <span className="badge badge-green">{f.crop_type}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div className="bg-cream rounded-lg px-3 py-2">
                  <p className="text-xs text-muted">Area</p>
                  <p className="font-bold text-forest">{f.area_hectares} ha</p>
                </div>
                <div className="bg-cream rounded-lg px-3 py-2">
                  <p className="text-xs text-muted">Irrigation</p>
                  <p className="font-semibold capitalize">{f.irrigation}</p>
                </div>
                {f.soil_type && (
                  <div className="bg-cream rounded-lg px-3 py-2">
                    <p className="text-xs text-muted">Soil</p>
                    <p className="font-semibold">{f.soil_type}</p>
                  </div>
                )}
                {f.gps_lat && (
                  <div className="bg-cream rounded-lg px-3 py-2">
                    <p className="text-xs text-muted">GPS</p>
                    <p className="font-semibold text-xs">{Number(f.gps_lat).toFixed(4)}, {Number(f.gps_lng).toFixed(4)}</p>
                  </div>
                )}
              </div>
              {f.notes && <p className="text-xs text-muted mb-3 italic">"{f.notes}"</p>}
              {!isAdmin && (
                <div className="flex gap-2">
                  <button onClick={() => startEdit(f)} className="btn-outline text-xs px-3 py-1.5 flex-1">✏️ Edit</button>
                  <button onClick={() => handleDelete(f.field_id)} className="btn-danger text-xs px-3 py-1.5">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
