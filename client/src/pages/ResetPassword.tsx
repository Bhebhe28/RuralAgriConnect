import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { isStrongPassword } from '../utils';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (!token) setError('Invalid or missing reset link. Please request a new one.');
  }, [token]);

  // Password strength indicator
  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8)          s++;
    if (/[A-Z]/.test(password))        s++;
    if (/[a-z]/.test(password))        s++;
    if (/[0-9]/.test(password))        s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][strength];
  const strengthColor = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-emerald-600'][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isStrongPassword(password)) {
      setError('Password must be at least 8 characters with uppercase, lowercase and a number.');
      return;
    }
    if (password !== password2) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* ── Left branding panel ── */}
      <div className="hidden md:flex md:w-5/12 lg:w-1/2 bg-gradient-to-br from-forest via-forest-mid to-moss
                      flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/5 rounded-full" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-white/5 rounded-full" />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 bg-white/20 border border-white/30 rounded-xl flex items-center justify-center text-2xl">🌿</div>
          <div>
            <h1 className="font-serif text-white text-xl font-bold leading-none">RurAgriConnect</h1>
            <p className="text-white/60 text-xs mt-0.5">KwaZulu-Natal</p>
          </div>
        </div>

        <div className="relative">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center text-4xl mb-6">🔒</div>
          <h2 className="font-serif text-white text-3xl leading-tight mb-3">
            Create a new<br />
            <span className="text-mint">secure password</span>
          </h2>
          <p className="text-white/65 text-sm leading-relaxed max-w-sm">
            Choose a strong password to keep your farm data safe.
          </p>
          <div className="mt-6 space-y-2">
            {['At least 8 characters', 'One uppercase letter', 'One lowercase letter', 'One number'].map(tip => (
              <div key={tip} className="flex items-center gap-2 text-white/60 text-xs">
                <span className="text-mint">✓</span> {tip}
              </div>
            ))}
          </div>
        </div>

        <div className="relative border-t border-white/15 pt-5">
          <p className="text-white/40 text-xs">Your reset link is single-use and expires in 1 hour.</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-10 bg-cream min-h-screen md:min-h-0">

        {/* Mobile logo */}
        <div className="md:hidden flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-forest rounded-xl flex items-center justify-center text-xl">🌿</div>
          <div>
            <h1 className="font-serif text-forest text-lg font-bold leading-none">RurAgriConnect</h1>
            <p className="text-muted text-xs">KwaZulu-Natal</p>
          </div>
        </div>

        <div className="w-full max-w-md animate-scale-in">

          {done ? (
            /* ── Success state ── */
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                ✅
              </div>
              <h2 className="font-serif text-2xl text-dark mb-2">Password updated!</h2>
              <p className="text-muted text-sm mb-6">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="btn-primary w-full py-3.5 text-base"
              >
                Sign In Now
              </button>
            </div>

          ) : (
            /* ── Form state ── */
            <>
              <div className="mb-6">
                <h2 className="font-serif text-2xl text-dark">Set new password</h2>
                <p className="text-muted text-sm mt-1">
                  Choose a strong password for your account.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 mb-5 text-sm animate-fade-in">
                  {error}
                  {error.includes('expired') && (
                    <div className="mt-2">
                      <button
                        onClick={() => navigate('/forgot-password')}
                        className="text-forest font-semibold hover:underline bg-transparent border-0 cursor-pointer text-sm"
                      >
                        Request a new reset link →
                      </button>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New password */}
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      className="input pr-12"
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark transition-colors bg-transparent border-0 cursor-pointer text-lg"
                      aria-label={showPwd ? 'Hide password' : 'Show password'}
                    >
                      {showPwd ? '🙈' : '👁️'}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {password && (
                    <div className="mt-2 animate-fade-in">
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4,5].map(i => (
                          <div key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength ? strengthColor : 'bg-sand'}`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${
                        strength <= 1 ? 'text-red-500' :
                        strength <= 2 ? 'text-orange-500' :
                        strength <= 3 ? 'text-yellow-600' : 'text-emerald-600'
                      }`}>
                        {strengthLabel}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    className={`input ${password2 && password !== password2 ? 'border-red-300 focus:border-red-400' : ''}`}
                    type={showPwd ? 'text' : 'password'}
                    value={password2}
                    onChange={e => setPassword2(e.target.value)}
                    placeholder="Repeat password"
                    required
                  />
                  {password2 && password !== password2 && (
                    <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                  )}
                  {password2 && password === password2 && (
                    <p className="text-xs text-emerald-600 mt-1">✓ Passwords match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="btn-primary w-full py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading
                    ? <span className="flex items-center justify-center gap-2">
                        <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
                      </span>
                    : '🔒 Update Password'}
                </button>
              </form>

              <button
                onClick={() => navigate('/login')}
                className="w-full mt-4 text-sm text-muted hover:text-forest transition-colors bg-transparent border-0 cursor-pointer py-2"
              >
                ← Back to Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
