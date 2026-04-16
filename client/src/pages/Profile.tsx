import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateMe } from '../api';
import { useLanguage } from '../context/LanguageContext';
import api from '../api/client';

export default function Profile() {
  const { user, login } = useAuth();
  const { t } = useLanguage();
  const [name, setName]     = useState(user?.name || '');
  const [phone, setPhone]   = useState(user?.phone || '');
  const [region, setRegion] = useState(user?.region || '');
  const [saved, setSaved]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateMe({ name, phone, region });
      if (user) login({ ...user, name, phone, region }, localStorage.getItem('token')!);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Update user context with new avatar
      if (user) {
        const updatedUser = { ...user, avatar_url: response.data.avatar_url };
        login(updatedUser, localStorage.getItem('token')!);
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Avatar upload failed:', error);
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div className="p-7 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-forest to-forest-mid rounded-2xl p-8 text-white flex items-center gap-6 mb-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-moss flex items-center justify-center text-4xl border-4 border-white/30 overflow-hidden">
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              '👤'
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-gray-50 transition-colors">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleAvatarUpload}
              className="hidden"
              disabled={avatarUploading}
            />
            {avatarUploading ? (
              <div className="w-4 h-4 border-2 border-forest border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className="text-forest text-sm">📷</span>
            )}
          </label>
        </div>
        <div>
          <h2 className="text-2xl font-serif">{user?.name}</h2>
          <p className="text-sm opacity-70 mt-0.5">{user?.email}</p>
          <span className="mt-2 inline-block bg-earth text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
            {user?.role}
          </span>
        </div>
      </div>

      {/* Edit form */}
      <div className="card max-w-lg">
        <h3 className="font-serif text-lg mb-5">{t.profileEditTitle}</h3>
        {saved && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 mb-4 text-sm">
            {t.profileSaved}
          </div>
        )}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">{t.profileFullName}</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">{t.profileEmail}</label>
            <input className="input bg-sand cursor-not-allowed" value={user?.email} disabled />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">{t.profilePhone}</label>
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+27 83 000 0000" />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wide mb-1.5">{t.profileRegion}</label>
            <select className="input" value={region} onChange={e => setRegion(e.target.value)}>
              {['eThekwini','uMgungundlovu','iLembe','Zululand','uThukela'].map(r => (
                <option key={r} value={`KwaZulu-Natal — ${r}`}>KwaZulu-Natal — {r}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? t.profileSavingBtn : t.profileSaveBtn}
          </button>
        </form>
      </div>
    </div>
  );
}
