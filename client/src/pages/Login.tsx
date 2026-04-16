import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin, register as apiRegister } from '../api';
import { useLanguage } from '../context/LanguageContext';
import { isValidEmail, isStrongPassword } from '../utils';

const REGIONS = ['eThekwini','uMgungundlovu','iLembe','Zululand','uThukela'];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  const [regName,   setRegName]   = useState('');
  const [regEmail,  setRegEmail]  = useState('');
  const [regPhone,  setRegPhone]  = useState('');
  const [regRole,   setRegRole]   = useState('farmer');
  const [regRegion, setRegRegion] = useState('KwaZulu-Natal — eThekwini');
  const [regPwd,    setRegPwd]    = useState('');
  const [regPwd2,   setRegPwd2]   = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || t.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail(regEmail))       { setError('Please enter a valid email address.'); return; }
    if (!isStrongPassword(regPwd))     { setError('Password must be 8+ chars with uppercase, lowercase and a number.'); return; }
    if (regPwd !== regPwd2)            { setError(t.loginPasswordMismatch); return; }
    setLoading(true);
    try {
      await apiRegister({ name: regName, email: regEmail, phone: regPhone, password: regPwd, role: regRole, region: regRegion });
      setTab('login');
      setEmail(regEmail);
      setError('✅ Account created! Sign in below.');
    } catch (err: any) {
      setError(err.response?.data?.error || t.loginRegisterFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* ── Left panel — branding ── */}
      <div className="hidden md:flex md:w-5/12 lg:w-1/2 bg-gradient-to-br from-forest via-forest-mid to-moss
                      flex-col justify-between p-10 relative overflow-hidden">
        {/* Background circles */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/5 rounded-full" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/3 rounded-full" />

        {/* Logo */}
        <div className="relative flex items-center gap-3 animate-fade-in">
          <div className="w-11 h-11 bg-white/20 border border-white/30 rounded-xl flex items-center justify-center text-2xl">🌿</div>
          <div>
            <h1 className="font-serif text-white text-xl font-bold leading-none">RurAgriConnect</h1>
            <p className="text-white/60 text-xs mt-0.5">KwaZulu-Natal</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative animate-fade-in-up">
          <h2 className="font-serif text-white text-3xl lg:text-4xl leading-tight mb-4">
            Offline Farm<br />
            <span className="text-mint">Advisory System</span><br />
            for Rural Farmers
          </h2>
          <p className="text-white/65 text-sm leading-relaxed mb-8 max-w-sm">
            Expert crop advisories, AI disease diagnosis, and weather alerts — works even with no signal in remote KZN fields.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {['📴 Works Offline','🤖 AI Diagnosis','🌦 Weather Alerts','🌍 4 Languages'].map(f => (
              <span key={f} className="bg-white/15 border border-white/20 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative border-t border-white/15 pt-5 animate-fade-in">
          <p className="text-white/50 text-xs italic">
            "I was in a remote field with no signal. I opened RurAgriConnect and got the advisory offline."
          </p>
          <p className="text-white/40 text-xs mt-1">— Sipho Dlamini, Smallholder Farmer, uMgungundlovu</p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-10 bg-cream min-h-screen md:min-h-0">

        {/* Mobile logo */}
        <div className="md:hidden flex items-center gap-3 mb-8 animate-fade-in">
          <div className="w-10 h-10 bg-forest rounded-xl flex items-center justify-center text-xl">🌿</div>
          <div>
            <h1 className="font-serif text-forest text-lg font-bold leading-none">RurAgriConnect</h1>
            <p className="text-muted text-xs">KwaZulu-Natal</p>
          </div>
        </div>

        <div className="w-full max-w-md animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-serif text-2xl text-dark">
                {tab === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-muted text-sm mt-0.5">
                {tab === 'login' ? 'Sign in to your farm advisory' : 'Join thousands of KZN farmers'}
              </p>
            </div>
            {/* Language picker */}
            <div className="flex gap-1">
              {(['en','zu','af','st'] as const).map(code => (
                <button key={code} onClick={() => setLanguage(code)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border-2 transition-all font-semibold
                    ${language === code
                      ? 'bg-forest text-white border-forest'
                      : 'border-sand text-muted hover:border-moss bg-white'}`}>
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-sand rounded-2xl p-1 mb-6">
            {(['login','register'] as const).map(t_ => (
              <button key={t_} onClick={() => { setTab(t_); setError(''); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${tab === t_ ? 'bg-white text-forest shadow-sm' : 'text-muted hover:text-dark'}`}>
                {t_ === 'login' ? t.loginTitle : t.loginRegister}
              </button>
            ))}
          </div>

          {/* Error / success */}
          {error && (
            <div className={`rounded-xl px-4 py-3 mb-5 text-sm border animate-fade-in ${
              error.startsWith('✅')
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {error}
            </div>
          )}

          {/* ── Login form ── */}
          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1.5">{t.loginEmail}</label>
                <input className="input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="farmer@example.com" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1.5">{t.loginPassword}</label>
                <input className="input" type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required />
              </div>
              <button type="submit" disabled={loading}
                className="btn-primary w-full py-3.5 text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading
                  ? <span className="flex items-center justify-center gap-2"><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></span>
                  : t.loginBtn}
              </button>
              <div className="bg-sand/60 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-muted">Demo account</p>
                <p className="text-xs font-semibold text-forest mt-0.5">admin@farm.co.za · Admin@123</p>
              </div>
            </form>

          ) : (
            /* ── Register form ── */
            <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1.5">{t.loginFullName}</label>
                <input className="input" value={regName} onChange={e => setRegName(e.target.value)}
                  placeholder="Sipho Dlamini" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1.5">{t.loginEmail}</label>
                <input className="input" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)}
                  placeholder="sipho@farm.co.za" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1.5">{t.loginPhone}</label>
                <input className="input" type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)}
                  placeholder="+27 83 000 0000" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1.5">{t.loginRole}</label>
                  <select className="input" value={regRole} onChange={e => setRegRole(e.target.value)}>
                    <option value="farmer">🌾 Farmer</option>
                    <option value="admin">⚙️ Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1.5">{t.loginRegion}</label>
                  <select className="input" value={regRegion} onChange={e => setRegRegion(e.target.value)}>
                    {REGIONS.map(r => (
                      <option key={r} value={`KwaZulu-Natal — ${r}`}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1.5">{t.loginPassword}</label>
                  <input className="input" type="password" value={regPwd} onChange={e => setRegPwd(e.target.value)}
                    placeholder="Min 8 chars" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1.5">Confirm</label>
                  <input className="input" type="password" value={regPwd2} onChange={e => setRegPwd2(e.target.value)}
                    placeholder="Repeat" required />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="btn-primary w-full py-3.5 text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading
                  ? <span className="flex items-center justify-center gap-2"><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></span>
                  : t.loginCreateBtn}
              </button>
            </form>
          )}

          {/* Back to landing */}
          <button onClick={() => navigate('/')}
            className="w-full mt-4 text-sm text-muted hover:text-forest transition-colors bg-transparent border-0 cursor-pointer py-2">
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
