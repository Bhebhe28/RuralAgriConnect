import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAdvisories, getAdvisory } from '../api';
import type { Advisory } from '../types';
import AdvisoryCard from '../components/AdvisoryCard';
import { useLanguage } from '../context/LanguageContext';
import { useOffline } from '../hooks/useOffline';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { formatDate } from '../utils';

const CROPS    = ['All', 'Maize', 'Vegetables', 'Poultry', 'General', 'Pest'];
const SEVERITY = ['All', 'info', 'warning', 'critical'];

export function AdvisoriesList() {
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [search, setSearch]         = useState('');
  const [crop, setCrop]             = useState('All');
  const [severity, setSeverity]     = useState('All');
  const [loading, setLoading]       = useState(true);
  const { t } = useLanguage();
  const isOffline = useOffline();
  const { advisories: cachedAdvisories } = useOfflineSync();

  useEffect(() => {
    if (!isOffline) {
      getAdvisories()
        .then(data => { setAdvisories(data); setLoading(false); })
        .catch(() => { setAdvisories(cachedAdvisories); setLoading(false); });
    } else {
      setAdvisories(cachedAdvisories);
      setLoading(false);
    }
  }, [isOffline, cachedAdvisories]);

  const filtered = advisories.filter(a => {
    const matchSearch   = a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase());
    const matchCrop     = crop === 'All' || a.crop === crop;
    const matchSeverity = severity === 'All' || a.severity === severity;
    return matchSearch && matchCrop && matchSeverity;
  });

  return (
    <div className="p-7 animate-fade-in">
      <h2 className="text-2xl font-serif mb-1">{t.advisoriesTitle}</h2>
      <p className="text-sm text-muted mb-6">{t.advisoriesSubtitle}</p>

      {isOffline && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-2.5 mb-4">
          <span>📴</span>
          <span>Offline — showing {advisories.length} cached advisories</span>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
          <input
            className="input pl-9"
            placeholder={t.advisoriesSearchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={crop} onChange={e => setCrop(e.target.value)}>
          {CROPS.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="input w-auto" value={severity} onChange={e => setSeverity(e.target.value)}>
          {SEVERITY.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-center text-muted py-12">{t.advisoriesLoadingText}</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted py-12">{t.advisoriesNoMatch}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(a => <AdvisoryCard key={a.id} advisory={a} />)}
        </div>
      )}
    </div>
  );
}

export function AdvisoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [advisory, setAdvisory] = useState<Advisory | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (id) getAdvisory(id).then(setAdvisory).catch(() => navigate('/advisories'));
  }, [id]);

  if (!advisory) return <div className="p-7 text-muted">{t.loading}</div>;

  return (
    <div className="p-7 max-w-3xl animate-fade-in">
      <button onClick={() => navigate('/advisories')} className="btn-outline mb-5 text-sm">{t.back}</button>
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <span className={`badge ${advisory.severity === 'critical' ? 'badge-red' : advisory.severity === 'warning' ? 'badge-orange' : 'badge-blue'}`}>
            {advisory.severity}
          </span>
          <span className="text-xs text-muted">{formatDate(advisory.published_at)}</span>
        </div>
        <h2 className="text-2xl font-serif mb-2">{advisory.title}</h2>
        <div className="flex gap-4 text-sm text-muted mb-6">
          <span>🌾 {advisory.crop}</span>
          <span>📍 {advisory.region}</span>
          <span>👤 {advisory.author_name}</span>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{advisory.content}</p>
      </div>

      {advisory.prevention_tips && advisory.prevention_tips.length > 0 && (
        <div className="card mt-5">
          <h3 className="font-serif text-lg mb-1">🛡️ Prevention Tips</h3>
          <p className="text-xs text-muted mb-4">Follow these steps to protect your crops and reduce disease risk</p>
          <ul className="space-y-3">
            {advisory.prevention_tips.map((tip, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-moss/10 text-moss flex items-center justify-center font-bold text-xs">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
