import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '../firebase';
import { isStrongPassword } from '../utils';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const oobCode = params.get('oobCode') || '';

  const [password, setPassword]   = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');

  if (!oobCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream p-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="font-serif text-2xl text-dark mb-2">Invalid reset link</h2>
          <p className="text-muted text-sm mb-6">This link is invalid or has expired. Please request a new one.</p>
          <button onClick={() => navigate('/forgot-password')} className="btn-primary px-6 py-3">
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isStrongPassword(password)) { setError('Password must be at least 8 characters with uppercase, lowercase and a number.'); return; }
    if (password !== password2) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setDone(true);
    } catch (err: any) {
      const code = err.code || '';
      if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
        setError('This reset link has expired or already been used. Please request a new one.');
      } else {
        setError('Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream p-6">
        <div className="text-center max-w-md animate-scale-in">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✅</div>
          <h2 className="font-serif text-2xl text-dark mb-2">Password updated!</h2>
          <p className="text-muted text-sm mb-6">Your password has been reset. You can now sign in.</p>
          <button onClick={() => navigate('/login')} className="btn-primary w-full py-3">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-6">
      <div className="w-full max-w-md animate-scale-in">

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-forest rounded-xl flex items-center justify-center text-xl">🌿</div>
          <div>
            <h1 className="font-serif text-forest text-lg font-bold leading-none">RurAgriConnect</h1>
            <p className="text-muted text-xs">KwaZulu-Natal</p>
          </div>
        </div>

        <h2 className="font-serif text-2xl text-dark mb-1">Set new password</h2>
        <p className="text-muted text-sm mb-6">Choose a strong password for your account.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 mb-5 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1.5">New Password</label>
            <input className="input" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 8 characters" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1.5">Confirm Password</label>
            <input className="input" type="password" value={password2}
              onChange={e => setPassword2(e.target.value)}
              placeholder="Repeat password" required />
          </div>
          <button type="submit" disabled={loading}
            className="btn-primary w-full py-3.5 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
                </span>
              : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
