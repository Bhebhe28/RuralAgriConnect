import React, { useEffect, useState } from 'react';
import { getAdvisories, getWeatherAlerts, getUsers, deleteAdvisory, deleteWeatherAlert } from '../api';
import type { Advisory, WeatherAlert, User } from '../types';
import { useLanguage } from '../context/LanguageContext';

export default function AdminPanel() {
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [alerts, setAlerts]         = useState<WeatherAlert[]>([]);
  const [users, setUsers]           = useState<User[]>([]);
  const { t } = useLanguage();

  useEffect(() => {
    getAdvisories().then(setAdvisories).catch(() => {});
    getWeatherAlerts().then(setAlerts).catch(() => {});
    getUsers().then(setUsers).catch(() => {});
  }, []);

  const removeAdvisory = async (id: string) => {
    await deleteAdvisory(id);
    setAdvisories(prev => prev.filter(a => a.id !== id));
  };

  const removeAlert = async (id: string) => {
    await deleteWeatherAlert(id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const stats = [
    { label: t.adminTotalUsers,    value: users.length,                                color: 'text-forest' },
    { label: t.adminFarmers,       value: users.filter(u => u.role === 'farmer').length, color: 'text-moss' },
    { label: t.adminAdvisories,    value: advisories.length,                            color: 'text-earth' },
    { label: t.adminWeatherAlerts, value: alerts.length,                                color: 'text-red-500' },
  ];

  return (
    <div className="p-7 animate-fade-in">
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
          <h3 className="font-serif text-lg mb-4">{t.adminWeatherSection}</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {alerts.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-sand last:border-0">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-medium truncate">{a.type}</p>
                  <p className="text-xs text-muted">{a.region} · {a.severity}</p>
                </div>
                <button onClick={() => removeAlert(a.id)} className="btn-danger text-xs px-2.5 py-1 flex-shrink-0">{t.delete}</button>
              </div>
            ))}
            {alerts.length === 0 && <p className="text-sm text-muted text-center py-4">{t.adminNoAlerts}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
