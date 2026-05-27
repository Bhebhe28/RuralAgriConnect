import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateMe } from '../services/firestore';
import { useLanguage } from '../context/LanguageContext';
import { updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { isValidName, isValidPhoneZA } from '../utils';

const REGIONS = ['eThekwini','uMgungundlovu','iLembe','Zululand','uThukela'];

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const MAX = 200;
      let w = img.width, h = img.height;
      if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
      else       { w = Math.round(w * MAX / h); h = MAX; }
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function Profile() {
  const { user, firebaseUser, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [name, setName]     = useState(user?.name || '');
  const [phone, setPhone]   = useState(user?.phone || '');
  const [region, setRegion] = useState(user?.region || '');
  const [avatar, setAvatar] = useState<string | null>(user?.avatar_url || null);
  const [saved, setSaved]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [error, setError]   = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    setError('');
    try {
      const compressed = await compressImage(file);
      setAvatar(compressed);
    } catch {
      setError('Could not process image. Please try a different photo.');
    } finally {
      setAvatarLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidName(name)) {
      setError('Full name must be 2–100 characters and contain only letters, spaces, hyphens or apostrophes.');
      return;
    }
    if (phone.trim() && !isValidPhoneZA(phone)) {
      setError('Phone must be a valid SA number — 10 digits starting with 0 (e.g. 082 000 0000) or +27 format.');
      return;
    }
    setLoading(true);
    try {
      await updateMe({ name, phone, region, avatar_url: avatar || undefined });
      if (firebaseUser) await updateProfile(firebaseUser, { displayName: name });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const initials = (name || user?.name || '?').charAt(0).toUpperCase();

  return (
    <div className="p-4 md:p-7 animate-fade-in max-w-xl">
      <h2 className="text-2xl font-serif mb-1">{t.profileEditTitle}</h2>
      <p className="text-sm text-muted mb-6">Update your account information and profile photo.</p>

      {/* Avatar upload */}
      <div className="flex items-center gap-5 mb-6">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-full bg-forest flex items-center justify-center text-3xl text-white font-bold overflow-hidden ring-4 ring-sand">
            {avatar
              ? <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
              : initials
            }
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={avatarLoading}
            className="absolute bottom-0 right-0 w-7 h-7 bg-forest border-2 border-white rounded-full flex items-center justify-center text-white text-xs hover:bg-moss transition-colors disabled:opacity-50"
            title="Change photo"
          >
            {avatarLoading ? '⏳' : '📷'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div>
          <p className="font-semibold text-dark">{user?.name}</p>
          <p className="text-sm text-muted">{user?.email}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block ${user?.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
            {user?.role === 'admin' ? '⚙️ Admin' : '🌾 Farmer'}
          </span>
          <p className="text-xs text-muted mt-1">Tap 📷 to change photo</p>
        </div>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 mb-4 text-sm animate-fade-in">
          ✅ Profile updated successfully!
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 mb-4 text-sm animate-fade-in">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1.5">{t.profileFullName}</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)}
            maxLength={100} required />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1.5">{t.profilePhone}</label>
          <input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="+27 83 000 0000" maxLength={13} />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1.5">{t.profileRegion}</label>
          <select className="input" value={region} onChange={e => setRegion(e.target.value)}>
            <option value="">Select region</option>
            {REGIONS.map(r => (
              <option key={r} value={`KwaZulu-Natal — ${r}`}>{r}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={loading || avatarLoading} className="btn-primary py-3 px-6 disabled:opacity-60">
          {loading ? t.profileSavingBtn : t.profileSaveBtn}
        </button>
      </form>
    </div>
  );
}
