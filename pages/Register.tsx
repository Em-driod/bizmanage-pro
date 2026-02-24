
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User, UserRole } from '../types';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const payload = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      businessName: formData.businessName,
    };

    try {
      const data = await apiRequest<User & { token: string }>('/users/register', {
        method: 'POST',
        body: payload,
      });

      const { token, ...user } = data;
      login(user, token);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-indigo-50/50 rounded-full blur-[140px] -translate-y-1/2 -translate-x-1/2"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-50/30 rounded-full blur-[100px] translate-y-1/2 translate-x-1/2"></div>

      <div className="w-full max-w-[540px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-3 mb-8 group">
            <div className="w-12 h-12 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-indigo-100 group-hover:scale-110 transition-transform duration-500">
              <div className="w-4 h-4 bg-white rotate-45 rounded-sm"></div>
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase">OpsFlow<span className="text-indigo-600">.</span></span>
          </Link>
          <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Expand the Core</h2>
          <p className="text-slate-500 font-medium px-4">Initialize your enterprise infrastructure and join the operational elite.</p>
        </div>

        <div className="bg-white/40 backdrop-blur-2xl p-10 sm:p-14 rounded-[4rem] border border-white/20 shadow-[0_50px_100px_-20px_rgba(79,70,229,0.08)]">
          {error && (
            <div className="mb-8 p-5 bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-black uppercase tracking-widest rounded-[1.5rem] flex items-center gap-4 animate-in shake duration-500">
              <i className="fas fa-fingerprint text-lg"></i>
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-2">Identity</label>
                <input
                  type="text" required
                  placeholder="Ops Commander"
                  className="w-full px-6 py-4 bg-white border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-slate-700 placeholder:text-slate-300"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-2">Entity Name</label>
                <input
                  type="text" required
                  placeholder="Nexus Corp"
                  className="w-full px-6 py-4 bg-white border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-slate-700 placeholder:text-slate-300"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-2">Interface Email</label>
              <input
                type="email" required
                placeholder="commander@nexus.os"
                className="w-full px-6 py-5 bg-white border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-slate-700 placeholder:text-slate-300"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-2">Encryption Key</label>
              <input
                type="password" required
                placeholder="••••••••"
                className="w-full px-6 py-5 bg-white border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none text-slate-700 placeholder:text-slate-300"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-6 mt-4 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[3px] hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95 disabled:bg-slate-200 disabled:shadow-none disabled:translate-y-0"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-4">
                  <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Initializing...
                </div>
              ) : 'Launch Environment'}
            </button>
          </form>

          <div className="mt-12 text-center pt-8 border-t border-slate-50">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Already Synced?{' '}
              <Link to="/login" className="text-indigo-600 hover:text-indigo-800 transition-colors">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
