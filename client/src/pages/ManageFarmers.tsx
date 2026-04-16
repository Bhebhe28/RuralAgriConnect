import React, { useEffect, useState } from 'react';
import { getUsers, deleteUser } from '../api';
import type { User } from '../types';
import { useLanguage } from '../context/LanguageContext';

export default function ManageFarmers() {
  const [users, setUsers]   = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const load = () => getUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${t.farmersRemoveConfirm} ${name}?`)) return;
    await deleteUser(id);
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-7 animate-fade-in">
      <h2 className="text-2xl font-serif mb-1">{t.farmersTitle}</h2>
      <p className="text-sm text-muted mb-6">{t.farmersSubtitle}</p>

      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
            <input className="input pl-9" placeholder={t.farmersSearchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="text-sm text-muted">{filtered.length} {t.farmersUsers}</span>
        </div>

        {loading ? (
          <p className="text-center text-muted py-8">{t.farmersLoading}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-sand">
                {[t.farmersName, t.farmersEmail, t.farmersPhone, t.farmersRole, t.farmersRegion, t.farmersJoined, ''].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs uppercase tracking-wide text-muted font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-sand hover:bg-cream transition-colors">
                  <td className="py-3 px-3 font-medium">{u.name}</td>
                  <td className="py-3 px-3 text-muted">{u.email}</td>
                  <td className="py-3 px-3 text-muted">{u.phone || '—'}</td>
                  <td className="py-3 px-3">
                    <span className={`badge ${u.role === 'admin' ? 'badge-blue' : 'badge-green'}`}>{u.role}</span>
                  </td>
                  <td className="py-3 px-3 text-muted text-xs">{u.region?.split('—')[1]?.trim() || '—'}</td>
                  <td className="py-3 px-3 text-muted text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-3">
                    <button onClick={() => handleDelete(u.id, u.name)} className="btn-danger text-xs px-3 py-1">{t.remove}</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-muted">{t.farmersNone}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
