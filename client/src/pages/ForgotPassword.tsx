import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
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
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center text-4xl mb-6">🔑</div>
          <h2 className="font-serif text-white text-3xl leading-tight mb-3">
            Forgot your<br />
            <span className="text-mint">password?</span>
          </h2>
          <p className="text-white/65 text-sm leading-relaxed max-w-sm">
            No worries. Enter your email and we'll send you a secure link to reset it.
          </p>
        </div>

        <div className="relative border-t border-white/15 pt-5">
          <p className="text-white/40 text-xs">Reset link expires in 1 hour for your security.</p>
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

          {sent ? (
            /* ── Success state ── */
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                📧
              </div>
              <h2 className="font-serif text-2xl text-dark mb-2">Check your email</h2>
              <p className="text-muted text-sm mb-2">
                We sent a password reset link to
              </p>
              <p className="font-semibold text-forest text-sm mb-6">{email}</p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 mb-6 text-left">
                <p className="font-semibold mb-1">📋 What to do next:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Open your email inbox</li>
                  <li>Click the <strong>Reset Password</strong> button in the email</li>
                  <li>Choose a new strong password</li>
                  <li>Sign in with your new password</li>
                </ol>
              </div>
              <p className="text-xs text-muted mb-6">
                Didn't receive it? Check your spam folder or{' '}
                <button onClick={() => setSent(false)}
                  className="text-forest font-semibold hover:underline bg-transparent border-0 cursor-pointer">
                  try again
                </button>
              </p>
              <button onClick={() => navigate('/login')}
                className="btn-primary w-full py-3">
                Back to Sign In
              </button>
            </div>

          ) : (
            /* ── Form state ── */
            <>
              <div className="mb-6">
                <h2 className="font-serif text-2xl text-dark">Reset password</h2>
                <p className="text-muted text-sm mt-1">
                  Enter your account email and we'll send you a reset link.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 mb-5 text-sm animate-fade-in">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1.5">
                    Email Address
                  </label>
                  <input
                    className="input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="farmer@example.com"
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading
                    ? <span className="flex items-center justify-center gap-2">
                        <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
                      </span>
                    : '📧 Send Reset Link'}
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
