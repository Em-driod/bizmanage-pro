import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest, getErrorMessage } from '../services/api';

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await apiRequest(`/users/reset-password/${token}`, { method: 'POST', body: { password } });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-50/50 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-50/30 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

      <div className="w-full max-w-[460px] relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-10">
          <Link to="/" className="inline-block mb-8">
            <img src="/ner.png" alt="Morniy" className="h-24 w-auto object-contain mx-auto" />
          </Link>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mb-3 tracking-tight">Choose a new password</h2>
          <p className="text-slate-500 font-medium">Make it strong — at least 8 characters.</p>
        </div>

        <div className="bg-white/40 backdrop-blur-2xl p-6 sm:p-10 md:p-12 rounded-[2rem] sm:rounded-[3.5rem] border border-white/20 shadow-[0_50px_100px_-20px_rgba(79,70,229,0.08)]">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <p className="text-sm font-semibold text-slate-600">Password updated. Redirecting you to sign in…</p>
              <Link to="/login" className="block text-[11px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 mt-4">
                Sign in now
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-black uppercase tracking-widest rounded-2xl">
                  {error}
                </div>
              )}
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-2">New Password</label>
                  <div className="relative group">
                    <i className="fas fa-lock absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                    <input
                      type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-slate-700 placeholder:text-slate-300"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-2">Confirm Password</label>
                  <div className="relative group">
                    <i className="fas fa-lock absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                    <input
                      type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-slate-700 placeholder:text-slate-300"
                    />
                  </div>
                </div>
                <button
                  type="submit" disabled={isLoading}
                  className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[3px] hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95 disabled:bg-slate-200 disabled:shadow-none disabled:translate-y-0"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-4">
                      <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                      Saving...
                    </div>
                  ) : 'Set New Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
