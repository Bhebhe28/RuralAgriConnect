import React, { useEffect, useState } from 'react';
import { getNotifications, markRead, markAllRead } from '../api';
import type { Notification } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useOffline } from '../hooks/useOffline';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { timeAgo } from '../utils';

export default function Notifications() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const isOffline = useOffline();
  const { alerts: cachedAlerts, lastSync } = useOfflineSync();

  const load = () => getNotifications().then(setNotifs).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => {
    if (!isOffline) {
      load();
    } else {
      setLoading(false);
    }
  }, [isOffline]);

  const handleRead = async (id: string) => {
    await markRead(id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
  };

  const handleReadAll = async () => {
    await markAllRead();
    setNotifs(prev => prev.map(n => ({ ...n, read: 1 })));
  };

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="p-7 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-serif">{t.notifTitle}</h2>
          <p className="text-sm text-muted mt-0.5">{unread} {t.notifUnread}</p>
        </div>
        {unread > 0 && !isOffline && (
          <button onClick={handleReadAll} className="btn-outline text-sm">{t.notifMarkAll}</button>
        )}
      </div>

      {isOffline && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-2.5 mb-4">
          <span>📴</span>
          <span>Offline — showing cached alerts{lastSync ? ` · last synced ${new Date(lastSync).toLocaleTimeString()}` : ''}</span>
        </div>
      )}

      {/* Cached weather alerts shown when offline */}
      {isOffline && cachedAlerts.length > 0 && (
        <div className="card max-w-2xl mb-5">
          <h3 className="font-serif text-base mb-3">⚠️ Cached Weather Alerts</h3>
          <div className="divide-y divide-sand">
            {cachedAlerts.map(a => (
              <div key={a.id} className="flex gap-3 py-3">
                <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                  a.severity === 'critical' ? 'bg-red-500' :
                  a.severity === 'warning'  ? 'bg-amber-500' : 'bg-blue-400'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{a.type}</p>
                  <p className="text-sm text-muted mt-0.5">{a.message}</p>
                  <div className="flex gap-3 text-xs text-muted mt-1">
                    <span>📍 {a.region}</span>
                    <span className={`badge ${
                      a.severity === 'critical' ? 'badge-red' :
                      a.severity === 'warning'  ? 'badge-orange' : 'badge-blue'
                    }`}>{a.severity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card max-w-2xl">
        {loading ? (
          <p className="text-muted text-sm text-center py-8">{t.notifLoading}</p>
        ) : isOffline && notifs.length === 0 ? (
          <p className="text-muted text-sm text-center py-8">Connect to the internet to load your notifications.</p>
        ) : notifs.length === 0 ? (
          <p className="text-muted text-sm text-center py-8">{t.notifNone}</p>
        ) : (
          <div className="divide-y divide-sand">
            {notifs.map(n => (
              <div
                key={n.id}
                onClick={() => !n.read && handleRead(n.id)}
                className={`flex gap-3 py-4 cursor-pointer hover:bg-cream/50 transition-colors rounded-lg px-2
                  ${!n.read ? 'opacity-100' : 'opacity-60'}`}
              >
                <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? 'bg-moss' : 'bg-sand'}`} />
                <div className="flex-1">
                  <p className={`text-sm ${!n.read ? 'font-semibold' : ''}`}>{n.title}</p>
                  <p className="text-sm text-muted mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
