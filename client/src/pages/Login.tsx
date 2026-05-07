import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { isValidEmail, isStrongPassword, isValidPhoneZA } from '../utils';
import { useTheme } from '../context/ThemeContext';
import { logger } from '../utils/logger';

const REGIONS = ['eThekwini','uMgungundlovu','iLembe','Zululand','uThukela'];

type FieldState = 'idle' | 'valid' | 'error';

function fieldCls(state: FieldState) {
  if (state === 'valid') return 'input border-green-400 focus:border-green-500 focus:ring-green-200';
  if (state === 'error') return 'input border-red-400 focus:border-red-500 focus:ring-red-200';
  return 'input';
}

function FieldMsg({ state, msg }: { state: FieldState; msg: string }) {
  if (state === 'idle') return null;
  return (
    <p className={`text-xs mt-1 flex items-center gap-1 ${state === 'valid' ? 'text-green-600' : 'text-red-600'}`}>
      {state === 'valid' ? '✓' : '✕'} {msg}
    </p>
  );
}

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const { isDark } = useTheme();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [banner, setBanner] = useState<{ msg: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  // Login fields
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [tEmail, setTEmail]     = useState(false);
  const [tPwd,   setTPwd]       = useState(false);

  // Register fields
  const [regName,   setRegName]   = useState('');
  const [regEmail,  setRegEmail]  = useState('');
  const [regPhone,  setRegPhone]  = useState('');
  const [regRole,   setRegRole]   = useState('farmer');
  const [regRegion, setRegRegion] = useState('KwaZulu-Natal — eThekwini');
  const [regPwd,    setRegPwd]    = useState('');
  const [regPwd2,   setRegPwd2]   = useState('');
  const [tRName,  setTRName]  = useState(false);
  const [tREmail, setTREmail] = useState(false);
  const [tRPhone, setTRPhone] = useState(false);
  const [tRPwd,   setTRPwd]   = useState(false);
  const [tRPwd2,  setTRPwd2]  = useState(false);

  // ── derived field states ──────────────────────────────────────
  const emailState:  FieldState = !tEmail  ? 'idle' : isValidEmail(email)    ? 'valid' : 'error';
  const pwdState:    FieldState = !tPwd    ? 'idle' : password.length > 0    ? 'valid' : 'error';

  const rNameState:  FieldState = !tRName  ? 'idle' : regName.trim().length >= 2  ? 'valid' : 'error';
  const rEmailState: FieldState = !tREmail ? 'idle' : isValidEmail(regEmail)      ? 'valid' : 'error';
  const rPhoneState: FieldState = !tRPhone ? 'idle'
    : regPhone.trim() === '' ? 'valid'
    : isValidPhoneZA(regPhone) ? 'valid' : 'error';
  const rPwdState:   FieldState = !tRPwd   ? 'idle' : isStrongPassword(regPwd)    ? 'valid' : 'error';
  const rPwd2State:  FieldState = !tRPwd2  ? 'idle' : regPwd2 === regPwd && regPwd2.length > 0 ? 'valid' : 'error';

  // ── handlers ─────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    setTEmail(true); setTPwd(true);
    if (!isValidEmail(email)) { setBanner({ msg: 'Please enter a valid email address.', ok: false }); return; }
    if (!password)             { setBanner({ msg: 'Please enter your password.', ok: false }); return; }

    setLoading(true);
    logger.auth('Login attempt', email);
    try {
      await login(email, password);
      logger.auth('Login success', email);
      navigate('/dashboard');
    } catch (err: any) {
      const code = err.code || '';
      logger.error('Login failed', code);
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setBanner({ msg: 'Incorrect email or password. Please try again.', ok: false });
      } else {
        setBanner({ msg: err.message || t.loginFailed, ok: false });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    setTRName(true); setTREmail(true); setTRPhone(true); setTRPwd(true); setTRPwd2(true);

    if (regName.trim().length < 2)    { setBanner({ msg: 'Full name must be at least 2 characters.', ok: false }); return; }
    if (!isValidEmail(regEmail))       { setBanner({ msg: 'Please enter a valid email address.', ok: false }); return; }
    if (regPhone.trim() && !isValidPhoneZA(regPhone)) { setBanner({ msg: 'Phone must be a valid SA number e.g. 082 000 0000.', ok: false }); return; }
    if (!isStrongPassword(regPwd))     { setBanner({ msg: 'Password needs 8+ characters with uppercase, lowercase and a number.', ok: false }); return; }
    if (regPwd !== regPwd2)            { setBanner({ msg: t.loginPasswordMismatch, ok: false }); return; }

    setLoading(true);
    logger.auth('Register attempt', regEmail);
    try {
      await register({ name: regName, email: regEmail, phone: regPhone, password: regPwd, role: regRole, region: regRegion });
      logger.auth('Register success', regEmail);
      setTab('login');
      setEmail(regEmail);
      setBanner({ msg: '✅ Account created! Sign in below.', ok: true });
    } catch (err: any) {
      const code = err.code || '';
      logger.error('Register failed', code);
      if (code === 'auth/email-already-in-use') {
        setBanner({ msg: 'This email is already registered. Try signing in instead.', ok: false });
      } else {
        setBanner({ msg: err.message || t.loginRegisterFailed, ok: false });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${isDark ? 'bg-night-bg' : ''}`}>

      {/* ── Left panel — branding ── */}
      <div className="hidden md:flex md:w-5/12 lg:w-1/2 bg-gradient-to-br from-forest via-forest-mid to-moss
                      flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/5 rounded-full" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/3 rounded-full" />

        <div className="relative flex items-center gap-3 animate-fade-in">
          <div className="w-11 h-11 bg-white/20 border border-white/30 rounded-xl flex items-center justify-center text-2xl">🌿</div>
          <div>
            <h1 className="font-serif text-white text-xl font-bold leading-none">RurAgriConnect</h1>
            <p className="text-white/60 text-xs mt-0.5">KwaZulu-Natal</p>
          </div>
        </div>

        <div className="relative animate-fade-in-up">
          <h2 className="font-serif text-white text-3xl lg:text-4xl leading-tight mb-4">
            Offline Farm<br />
            <span className="text-mint">Advisory System</span><br />
            for Rural Farmers
          </h2>
          <p className="text-white/65 text-sm leading-relaxed mb-8 max-w-sm">
            Expert crop advisories, AI disease diagnosis, and weather alerts — works even with no signal in remote KZN fields.
          </p>
          <div className="flex flex-wrap gap-2">
            {['📴 Works Offline','🤖 AI Diagnosis','🌦 Weather Alerts','🌍 4 Languages'].map(f => (
              <span key={f} className="bg-white/15 border border-white/20 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="relative border-t border-white/15 pt-5 animate-fade-in">
          <p className="text-white/50 text-xs italic">
            "I was in a remote field with no signal. I opened RurAgriConnect and got the advisory offline."
          </p>
          <p className="text-white/40 text-xs mt-1">— Sipho Dlamini, Smallholder Farmer, uMgungundlovu</p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className={`flex-1 flex flex-col justify-center items-center p-6 md:p-10 min-h-screen md:min-h-0 ${isDark ? 'bg-night-bg' : 'bg-cream'}`}>

        {/* Mobile logo */}
        <div className="md:hidden flex items-center gap-3 mb-8 animate-fade-in">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${isDark ? 'bg-night-card border border-night-border' : 'bg-forest'}`}>🌿</div>
          <div>
            <h1 className={`font-serif text-lg font-bold leading-none ${isDark ? 'text-night-primary' : 'text-forest'}`}>RurAgriConnect</h1>
            <p className={`text-xs ${isDark ? 'text-night-muted' : 'text-muted'}`}>KwaZulu-Natal</p>
          </div>
        </div>

        <div className="w-full max-w-md animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={`font-serif text-2xl ${isDark ? 'text-night-text' : 'text-dark'}`}>
                {tab === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p className={`text-sm mt-0.5 ${isDark ? 'text-night-muted' : 'text-muted'}`}>
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
                      : isDark
                        ? 'border-night-border text-night-muted hover:border-night-primary bg-night-card'
                        : 'border-sand text-muted hover:border-moss bg-white'
                    }`}>
                  {code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className={`flex rounded-2xl p-1 mb-6 ${isDark ? 'bg-night-card' : 'bg-sand'}`}>
            {(['login','register'] as const).map(t_ => (
              <button key={t_} onClick={() => { setTab(t_); setBanner(null); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${tab === t_
                    ? isDark
                      ? 'bg-night-surface text-night-text border border-night-border shadow-sm'
                      : 'bg-white text-forest shadow-sm'
                    : isDark
                      ? 'text-night-muted hover:text-night-text'
                      : 'text-muted hover:text-dark'
                  }`}>
                {t_ === 'login' ? t.loginTitle : t.loginRegister}
              </button>
            ))}
          </div>

          {/* Banner */}
          {banner && (
            <div className={`rounded-xl px-4 py-3 mb-5 text-sm border animate-fade-in ${
              banner.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {banner.msg}
            </div>
          )}

          {/* ── Login form ── */}
          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-night-muted' : 'text-muted'}`}>{t.loginEmail}</label>
                <input
                  className={fieldCls(emailState)}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => setTEmail(true)}
                  placeholder="farmer@example.com"
                  required
                />
                <FieldMsg state={emailState} msg={emailState === 'valid' ? 'Valid email address' : 'Enter a valid email address'} />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-night-muted' : 'text-muted'}`}>{t.loginPassword}</label>
                <input
                  className={fieldCls(pwdState)}
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onBlur={() => setTPwd(true)}
                  placeholder="••••••••"
                  required
                />
                <FieldMsg state={pwdState} msg={pwdState === 'valid' ? 'Password entered' : 'Password is required'} />
                <div className="text-right mt-1.5">
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className={`text-xs hover:underline bg-transparent border-0 cursor-pointer font-medium ${isDark ? 'text-night-primary' : 'text-forest'}`}
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="btn-primary w-full py-3.5 text-base mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading
                  ? <span className="flex items-center justify-center gap-2"><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></span>
                  : t.loginBtn}
              </button>
            </form>

          ) : (
            /* ── Register form ── */
            <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-night-muted' : 'text-muted'}`}>{t.loginFullName}</label>
                <input
                  className={fieldCls(rNameState)}
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  onBlur={() => setTRName(true)}
                  placeholder="Sipho Dlamini"
                  required
                />
                <FieldMsg state={rNameState} msg={rNameState === 'valid' ? 'Looks good' : 'Full name is required'} />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-night-muted' : 'text-muted'}`}>{t.loginEmail}</label>
                <input
                  className={fieldCls(rEmailState)}
                  type="email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  onBlur={() => setTREmail(true)}
                  placeholder="sipho@farm.co.za"
                  required
                />
                <FieldMsg state={rEmailState} msg={rEmailState === 'valid' ? 'Valid email address' : 'Enter a valid email address'} />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-night-muted' : 'text-muted'}`}>{t.loginPhone} <span className={`normal-case font-normal ${isDark ? 'text-night-muted' : 'text-muted'}`}>(optional)</span></label>
                <input
                  className={fieldCls(rPhoneState)}
                  type="tel"
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                  onBlur={() => setTRPhone(true)}
                  placeholder="+27 83 000 0000"
                />
                <FieldMsg state={rPhoneState} msg={rPhoneState === 'valid' ? 'Valid SA number' : 'Use format: 082 000 0000 or +27 82 000 0000'} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-night-muted' : 'text-muted'}`}>{t.loginRole}</label>
                  <select className="input" value={regRole} onChange={e => setRegRole(e.target.value)}>
                    <option value="farmer">🌾 Farmer</option>
                    <option value="admin">⚙️ Admin</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-night-muted' : 'text-muted'}`}>{t.loginRegion}</label>
                  <select className="input" value={regRegion} onChange={e => setRegRegion(e.target.value)}>
                    {REGIONS.map(r => (
                      <option key={r} value={`KwaZulu-Natal — ${r}`}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-night-muted' : 'text-muted'}`}>{t.loginPassword}</label>
                  <input
                    className={fieldCls(rPwdState)}
                    type="password"
                    value={regPwd}
                    onChange={e => setRegPwd(e.target.value)}
                    onBlur={() => setTRPwd(true)}
                    placeholder="Min 8 chars"
                    required
                  />
                  <FieldMsg state={rPwdState} msg={rPwdState === 'valid' ? 'Strong password' : '8+ chars, uppercase, lowercase, number'} />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-night-muted' : 'text-muted'}`}>Confirm</label>
                  <input
                    className={fieldCls(rPwd2State)}
                    type="password"
                    value={regPwd2}
                    onChange={e => setRegPwd2(e.target.value)}
                    onBlur={() => setTRPwd2(true)}
                    placeholder="Repeat"
                    required
                  />
                  <FieldMsg state={rPwd2State} msg={rPwd2State === 'valid' ? 'Passwords match' : 'Passwords do not match'} />
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

          <button onClick={() => navigate('/')}
            className={`w-full mt-4 text-sm transition-colors bg-transparent border-0 cursor-pointer py-2 ${isDark ? 'text-night-muted hover:text-night-primary' : 'text-muted hover:text-forest'}`}>
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
