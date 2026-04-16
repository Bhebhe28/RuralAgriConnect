import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAdvisory } from '../api';
import { useLanguage } from '../context/LanguageContext';

const CROPS    = ['Maize', 'Vegetables', 'Poultry', 'General', 'Pest', 'Legumes'];
const REGIONS  = ['eThekwini','uMgungundlovu','iLembe','Zululand','uThukela'].map(r => `KwaZulu-Natal — ${r}`);
const SEVERITY = ['info', 'warning', 'critical'] as const;

export default function PublishAdvisory() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    title: '', content: '', crop: 'Maize',
    region: REGIONS[0], severity: 'info' as typeof SEVERITY[number],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createAdvisory(form);
      navigate('/advisories');
    } catch (err: any) {
      setError(err.response?.data?.error || t.publishFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-7 animate-fade-in">
      <h2 className="text-2xl font-serif mb-1">{t.publishTitle}</h2>
      <p className="text-sm text-muted mb-6">{t.publishSubtitle}</p>

      <div className="card max-w-2xl">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">{t.publishTitleField}</label>
            <input className="input" value={form.title} onChange={set('title')} placeholder={t.publishTitlePlaceholder} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">{t.publishCrop}</label>
              <select className="input" value={form.crop} onChange={set('crop')}>
                {CROPS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">{t.publishSeverity}</label>
              <select className="input" value={form.severity} onChange={set('severity')}>
                {SEVERITY.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">{t.publishRegion}</label>
              <select className="input" value={form.region} onChange={set('region')}>
                {REGIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">{t.publishContent}</label>
            <textarea
              className="input min-h-40 resize-y"
              value={form.content}
              onChange={set('content')}
              placeholder={t.publishContentPlaceholder}
              required
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
              {loading ? t.publishBtnLoading : t.publishBtn}
            </button>
            <button type="button" onClick={() => navigate('/advisories')} className="btn-outline px-6">{t.cancel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
