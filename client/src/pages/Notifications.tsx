import React, { useEffect, useState } from 'react';
import { getNotifications, markRead, markAllRead } from '../services/firestore';
import { useLanguage } from '../context/LanguageContext';
import { useOffline } from '../hooks/useOffline';
import { timeAgo } from '../utils';

export default function Notifications() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const isOffline = useOffline();

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
    <div className="p-4 md:p-7 animate-fade-in">
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
          <span>You are offline — connect to load latest notifications.</span>
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
