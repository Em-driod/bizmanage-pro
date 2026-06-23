import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest, getErrorMessage } from '../services/api';
import { User } from '../types';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = await apiRequest<User & { token: string }>('/users/login', {
        method: 'POST',
        body: { email, password },
      });
      const { token, ...userWithoutToken } = data;
      login(userWithoutToken as User, token);
      navigate('/dashboard');
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
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mb-3 tracking-tight">Welcome back</h2>
          <p className="text-slate-500 font-medium">Sign in to your account to continue.</p>
        </div>

        <div className="bg-white/40 backdrop-blur-2xl p-6 sm:p-10 md:p-12 rounded-[2rem] sm:rounded-[3.5rem] border border-white/20 shadow-[0_50px_100px_-20px_rgba(79,70,229,0.08)]">
          {error && (
            <div className="mb-8 p-5 bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-black uppercase tracking-widest rounded-[1.5rem] flex items-center gap-4 animate-in shake duration-500">
              <i className="fas fa-circle-exclamation text-lg"></i>
              {error}
            </div>
          )}

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-2">Email</label>
              <div className="relative group">
                <i className="fas fa-envelope absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors"></i>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-slate-700 placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px]">Password</label>
                <Link to="/forgot-password" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700">Forgot password?</Link>
              </div>
              <div className="relative group">
                <i className="fas fa-lock absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors"></i>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-14 pr-6 py-5 bg-white border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none text-slate-700 placeholder:text-slate-300"
                />
              </div>
            </div>

            <button
              type="submit" disabled={isLoading}
              className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[3px] hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95 disabled:bg-slate-200 disabled:shadow-none disabled:translate-y-0"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-4">
                  <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Signing in...
                </div>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-12 text-center pt-8 border-t border-slate-50">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Don't have an account?{' '}
              <Link to="/register" className="text-indigo-600 hover:text-indigo-800 transition-colors">Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
