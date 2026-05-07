import React, { useEffect, useState } from 'react';
import { getAdvisories, getOutbreaks, getUsers, deleteAdvisory, deleteOutbreak } from '../services/firestore';
import { useLanguage } from '../context/LanguageContext';

export default function AdminPanel() {
  const [advisories, setAdvisories] = useState<any[]>([]);
  const [outbreaks, setOutbreaks]   = useState<any[]>([]);
  const [users, setUsers]           = useState<any[]>([]);
  const { t } = useLanguage();

  useEffect(() => {
    getAdvisories().then(setAdvisories).catch(() => {});
    getOutbreaks().then(setOutbreaks).catch(() => {});
    getUsers().then(setUsers).catch(() => {});
  }, []);

  const removeAdvisory = async (id: string) => {
    await deleteAdvisory(id);
    setAdvisories(prev => prev.filter(a => a.id !== id));
  };

  const removeOutbreak = async (id: string) => {
    await deleteOutbreak(id);
    setOutbreaks(prev => prev.filter(o => o.id !== id));
  };

  const stats = [
    { label: t.adminTotalUsers,    value: users.length,                                  color: 'text-forest' },
    { label: t.adminFarmers,       value: users.filter((u: any) => u.role === 'farmer').length, color: 'text-moss' },
    { label: t.adminAdvisories,    value: advisories.length,                              color: 'text-earth' },
    { label: 'Active Outbreaks',   value: outbreaks.length,                              color: 'text-red-500' },
  ];

  return (
    <div className="p-4 md:p-7 animate-fade-in">
      <h2 className="text-2xl font-serif mb-1">{t.adminTitle}</h2>
      <p className="text-sm text-muted mb-6">{t.adminSubtitle}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="card mb-0 text-center">
            <p className={`text-4xl font-serif ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted uppercase tracking-wide mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="font-serif text-lg mb-4">{t.adminAdvisoriesSection}</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {advisories.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-sand last:border-0">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-medium truncate">{a.title}</p>
                  <p className="text-xs text-muted">{a.crop} · {a.severity}</p>
                </div>
                <button onClick={() => removeAdvisory(a.id)} className="btn-danger text-xs px-2.5 py-1 flex-shrink-0">{t.delete}</button>
              </div>
            ))}
            {advisories.length === 0 && <p className="text-sm text-muted text-center py-4">{t.adminNoAdvisories}</p>}
          </div>
        </div>

        <div className="card">
          <h3 className="font-serif text-lg mb-4">🦠 Active Outbreaks</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {outbreaks.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-sand last:border-0">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-medium truncate">{o.pest_name || o.description?.slice(0, 40)}</p>
                  <p className="text-xs text-muted">{(o.region || '').split('—')[1]?.trim() || o.region} · {o.severity}</p>
                </div>
                <button onClick={() => removeOutbreak(o.id)} className="btn-danger text-xs px-2.5 py-1 flex-shrink-0">{t.delete}</button>
              </div>
            ))}
            {outbreaks.length === 0 && <p className="text-sm text-muted text-center py-4">No active outbreaks.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
