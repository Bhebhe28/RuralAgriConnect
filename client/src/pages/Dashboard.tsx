import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAdvisories, getOutbreaks } from '../services/firestore';
import StatCard from '../components/StatCard';
import AlertBanner from '../components/AlertBanner';
import { useLanguage } from '../context/LanguageContext';
import { useOffline } from '../hooks/useOffline';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isOffline = useOffline();

  const [advisories, setAdvisories] = useState<any[]>([]);
  const [outbreaks,  setOutbreaks]  = useState<any[]>([]);
  const [lastSync,   setLastSync]   = useState<string | null>(localStorage.getItem('offline_last_sync'));

  useEffect(() => {
    if (isOffline) {
      try { setAdvisories(JSON.parse(localStorage.getItem('offline_advisories') || '[]')); } catch { /* ignore */ }
      return;
    }
    getAdvisories()
      .then(data => {
        setAdvisories(data);
        localStorage.setItem('offline_advisories', JSON.stringify(data));
        const now = new Date().toISOString();
        localStorage.setItem('offline_last_sync', now);
        setLastSync(now);
      })
      .catch(() => {
        try { setAdvisories(JSON.parse(localStorage.getItem('offline_advisories') || '[]')); } catch { /* ignore */ }
      });
    getOutbreaks().then(setOutbreaks).catch(() => {});
  }, [isOffline]);

  const crops = ['Maize', 'Vegetables', 'Legumes'];
  const progress = [74, 52, 88];

  return (
    <div className="p-4 md:p-7 animate-fade-in">
      <h2 className="text-2xl font-serif mb-1">{t.dashWelcome}, {user?.name?.split(' ')[0]} 👋</h2>
      <p className="text-sm text-muted mb-6">{t.dashSubtitle}</p>

      {isOffline && (
        <AlertBanner type="warning" message={`📴 You're offline — showing cached data${lastSync ? ` (last synced ${new Date(lastSync).toLocaleTimeString()})` : ''}`} />
      )}

      {outbreaks.filter(o => o.severity === 'critical').slice(0, 2).map((o: any) => (
        <AlertBanner key={o.outbreak_id || o.id} type="critical" message={`🚨 Outbreak: ${o.pest_name || o.description?.slice(0, 60)} — ${(o.region || '').split('—')[1]?.trim() || o.region}`} />
      ))}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label={t.dashTotalAdvisories} value={advisories.length}  sub={t.dashAdvisoriesSub} color="green" />
        <StatCard label="Active Outbreaks"      value={outbreaks.length}   sub="Pest & disease reports" color="red" />
        <StatCard label={t.dashCriticalAlerts}  value={outbreaks.filter((o: any) => o.severity === 'critical').length} sub={t.dashCriticalSub} color="earth" />
        <StatCard label={t.dashOfflineReady}    value="100%"               sub={t.dashOfflineSub}    color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg">{t.dashRecentAdvisories}</h3>
            <button onClick={() => navigate('/advisories')} className="btn-outline text-xs px-3 py-1.5">{t.dashViewAll}</button>
          </div>
          <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <table className="w-full text-sm" style={{ minWidth: '360px' }}>
            <thead>
              <tr className="border-b-2 border-sand">
                <th className="text-left py-2 pr-2 pl-0 text-xs uppercase tracking-wide text-muted font-bold w-2/5">{t.dashTitle}</th>
                <th className="text-left py-2 px-2 text-xs uppercase tracking-wide text-muted font-bold hidden sm:table-cell">{t.dashCrop}</th>
                <th className="text-left py-2 px-2 text-xs uppercase tracking-wide text-muted font-bold">{t.dashRegionCol}</th>
                <th className="text-left py-2 pl-2 pr-0 text-xs uppercase tracking-wide text-muted font-bold">{t.dashSeverity}</th>
              </tr>
            </thead>
            <tbody>
              {advisories.slice(0, 5).map(a => (
                <tr key={a.id} onClick={() => navigate(`/advisories/${a.id}`)}
                  className="border-b border-sand hover:bg-cream cursor-pointer transition-colors">
                  <td className="py-3 pr-2 pl-0 font-medium text-xs md:text-sm leading-snug">{a.title}</td>
                  <td className="py-3 px-2 text-muted text-xs hidden sm:table-cell">{a.crop}</td>
                  <td className="py-3 px-2 text-muted text-xs">{a.region.split('—')[1]?.trim() || a.region}</td>
                  <td className="py-3 pl-2 pr-0">
                    <span className={`badge ${a.severity === 'critical' ? 'badge-red' : a.severity === 'warning' ? 'badge-orange' : 'badge-blue'}`}>
                      {a.severity?.slice(0, 4)}
                    </span>
                  </td>
                </tr>
              ))}
              {advisories.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-muted text-sm">{t.dashNoAdvisories}</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card">
            <h3 className="font-serif text-lg mb-4">{t.dashSeasonProgress}</h3>
            {crops.map((crop, i) => (
              <div key={crop} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>{crop}</span>
                  <span className="font-bold text-moss">{progress[i]}%</span>
                </div>
                <div className="h-2 bg-sand rounded-full overflow-hidden">
                  <div className="h-full bg-moss rounded-full transition-all" style={{ width: `${progress[i]}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 className="font-serif text-lg mb-4">{t.dashQuickActions}</h3>
            <div className="flex flex-col gap-2.5">
              <button onClick={() => navigate('/advisories')} className="btn-primary w-full">{t.dashBrowseAdvisories}</button>
              <button onClick={() => navigate('/chatbot')}    className="btn-moss w-full">{t.dashAskAI}</button>
              <button onClick={() => navigate('/weather')}    className="btn-outline w-full">{t.dashCheckWeather}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
