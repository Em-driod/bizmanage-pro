import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest, getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const data = await apiRequest<User & { token: string }>('/users/register', {
        method: 'POST',
        body: {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          businessName: formData.businessName,
        },
      });

      const { token, ...user } = data;
      login(user, token);
      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = (): { label: string; color: string; width: string } => {
    const p = formData.password;
    if (!p) return { label: '', color: '', width: '0%' };
    if (p.length < 6) return { label: 'Weak', color: 'bg-rose-400', width: '25%' };
    if (p.length < 10) return { label: 'Fair', color: 'bg-amber-400', width: '50%' };
    if (!/[^a-zA-Z0-9]/.test(p)) return { label: 'Good', color: 'bg-blue-400', width: '75%' };
    return { label: 'Strong', color: 'bg-emerald-400', width: '100%' };
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-indigo-50/50 rounded-full blur-[140px] -translate-y-1/2 -translate-x-1/2"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-50/30 rounded-full blur-[100px] translate-y-1/2 translate-x-1/2"></div>

      <div className="w-full max-w-[540px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-10">
          <Link to="/" className="inline-block mb-8">
            <img src="/ner.png" alt="Morniy" className="h-24 w-auto object-contain mx-auto" />
          </Link>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mb-3 tracking-tight">Create your account</h2>
          <p className="text-slate-500 font-medium px-4">Get started in under a minute. No credit card needed.</p>
        </div>

        <div className="bg-white/40 backdrop-blur-2xl p-6 sm:p-10 md:p-14 rounded-[2rem] sm:rounded-[3rem] md:rounded-[4rem] border border-white/20 shadow-[0_50px_100px_-20px_rgba(79,70,229,0.08)]">
          {error && (
            <div className="mb-8 p-5 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold rounded-[1.5rem] flex items-center gap-4 animate-in fade-in">
              <i className="fas fa-circle-exclamation text-lg"></i>
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-2">Your Name</label>
                <input
                  type="text" required
                  placeholder="Jane Smith"
                  className="w-full px-6 py-4 bg-white border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-slate-700 placeholder:text-slate-300"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-2">Business Name</label>
                <input
                  type="text" required
                  placeholder="Acme Ltd."
                  className="w-full px-6 py-4 bg-white border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-slate-700 placeholder:text-slate-300"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-2">Email Address</label>
              <input
                type="email" required
                placeholder="jane@acme.com"
                className="w-full px-6 py-5 bg-white border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold text-slate-700 placeholder:text-slate-300"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-2">Password</label>
              <input
                type="password" required
                placeholder="Min. 8 characters"
                className="w-full px-6 py-5 bg-white border border-slate-100 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none text-slate-700 placeholder:text-slate-300"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              {formData.password && (
                <div className="px-2 pt-1">
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{strength.label}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] ml-2">Confirm Password</label>
              <input
                type="password" required
                placeholder="Repeat your password"
                className={`w-full px-6 py-5 bg-white border rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none text-slate-700 placeholder:text-slate-300 ${
                  formData.confirmPassword && formData.confirmPassword !== formData.password
                    ? 'border-rose-300'
                    : 'border-slate-100'
                }`}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
              {formData.confirmPassword && formData.confirmPassword !== formData.password && (
                <p className="text-[11px] font-bold text-rose-500 px-2">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || (!!formData.confirmPassword && formData.confirmPassword !== formData.password)}
              className="w-full py-6 mt-4 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[3px] hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95 disabled:bg-slate-200 disabled:shadow-none disabled:translate-y-0"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-4">
                  <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Creating account...
                </div>
              ) : 'Create Account'}
            </button>
          </form>

          <div className="mt-12 text-center pt-8 border-t border-slate-50">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-600 hover:text-indigo-800 transition-colors">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
