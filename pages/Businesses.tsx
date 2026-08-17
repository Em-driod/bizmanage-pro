import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Business } from '../types';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

const inputCls = 'w-full h-11 px-4 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 outline-none transition-all text-sm placeholder:text-slate-300';
const labelCls = 'block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5';

const BusinessPage: React.FC = () => {
  const { user } = useAuth();
  const { availableCurrencies } = useCurrency();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '', email: '', phone: '', currency: '' });
  const [isPublic, setIsPublic] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchBusiness = async () => {
    if (!user?.businessId) return;
    setIsLoading(true);
    try {
      const data = await apiRequest<any>(`/businesses/${user.businessId}`);
      setBusiness(data);
      setLoadError(null);
      setFormData({ name: data.name, address: data.address || '', email: data.email || '', phone: data.phone || '', currency: data.currency });
      setIsPublic(!!data.profile?.isPublic);
    } catch (err: any) {
      setBusiness(null);
      setLoadError(err?.message || 'Could not load your business. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusiness();
  }, [user?.businessId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest(`/businesses/${user?.businessId}`, { method: 'PUT', body: formData });
      setBusiness({ ...business!, ...formData });
      setIsEditing(false);
    } catch (err: any) { alert(err.message); }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 animate-pulse">
          <i className="fas fa-briefcase text-white text-lg"></i>
        </div>
        <p className="text-sm font-bold text-slate-400">Loading your workspace...</p>
      </div>
    </div>
  );

  if (loadError || !business) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
          <i className="fas fa-triangle-exclamation text-rose-500 text-lg"></i>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-700">Couldn't load your business</p>
          <p className="text-xs text-slate-400 mt-1">{loadError || 'Something went wrong.'}</p>
        </div>
        <button onClick={fetchBusiness}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all">
          <i className="fas fa-rotate-right mr-1.5"></i>Try Again
        </button>
      </div>
    </div>
  );

  const initials = business?.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';

  return (
    <div className="min-h-screen pb-24 lg:pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">

      {/* ── Page Hero ── */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm tracking-tight">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Workspace</p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight truncate">{business?.name || 'Your Business'}</h1>
        </div>
      </div>

      <div className="space-y-5 max-w-4xl">

        {/* Storefront promo */}
        <Link to="/storefront"
          className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-left group transition-all bg-white border border-slate-200/70 hover:border-slate-300 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <i className="fas fa-store text-indigo-600 text-sm"></i>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-tight">
              {isPublic ? 'Manage Your Storefront' : 'Launch Your Public Business Page'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
              {isPublic ? 'Edit branding, catalog visibility & contact info' : 'Showcase services, logo & social links — share with anyone free'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isPublic && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
            <span className="px-3 py-1.5 bg-slate-900 text-white text-xs font-black rounded-xl whitespace-nowrap">
              {isPublic ? 'Open' : 'Get Started'}
            </span>
            <i className="fas fa-arrow-right text-slate-300 text-xs group-hover:translate-x-1 transition-transform"></i>
          </div>
        </Link>

        {/* Info card */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
          <div className="p-6">
            {!isEditing ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Business Details</p>
                  <button onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-black transition-all">
                    <i className="fas fa-pen text-[10px]"></i> Edit
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Business Name', val: business?.name, icon: 'fa-id-card' },
                    { label: 'Email Address', val: (business as any)?.email, icon: 'fa-envelope' },
                    { label: 'Phone Number', val: (business as any)?.phone, icon: 'fa-phone' },
                    { label: 'Address', val: (business as any)?.address, icon: 'fa-location-dot' },
                    { label: 'Currency', val: business?.currency || 'USD', icon: 'fa-coins' },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100/70 transition-colors group">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-slate-100 text-slate-500 text-xs">
                        <i className={`fas ${f.icon}`}></i>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{f.label}</p>
                        <p className="font-bold text-slate-800 truncate mt-0.5">{f.val || <span className="text-slate-300 font-medium">Not set</span>}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <form onSubmit={handleUpdate} className="space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Edit Business Details</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Business Name', key: 'name', icon: 'fa-id-card' },
                    { label: 'Email Address', key: 'email', icon: 'fa-envelope' },
                    { label: 'Phone Number', key: 'phone', icon: 'fa-phone' },
                    { label: 'Address', key: 'address', icon: 'fa-location-dot' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className={labelCls}><i className={`fas ${f.icon} mr-1.5 text-indigo-400`}></i>{f.label}</label>
                      <input className={inputCls} value={(formData as any)[f.key]}
                        onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} />
                    </div>
                  ))}
                  <div>
                    <label className={labelCls}><i className="fas fa-coins mr-1.5 text-indigo-400"></i>Currency</label>
                    <select className={inputCls} value={formData.currency}
                      onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                      {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-slate-50">
                  <button type="button" onClick={() => setIsEditing(false)}
                    className="flex-1 h-11 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 text-sm transition-all">
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all">
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {[
            { label: 'Currency', val: business?.currency || 'USD', icon: 'fa-coins', showDot: false, live: false },
            { label: 'Page Views', val: `${business?.profileViews || 0}`, icon: 'fa-eye', showDot: false, live: false },
          ].map((s, i) => (
            <div key={i} className="rounded-xl sm:rounded-2xl p-3 sm:p-4 bg-white border border-slate-200/70">
              <div className="flex items-center justify-between mb-1.5">
                <i className={`fas ${s.icon} text-slate-300 text-xs`}></i>
                {s.showDot && (
                  <span className={`w-1.5 h-1.5 rounded-full ${s.live ? 'bg-emerald-500' : 'bg-slate-200'}`}></span>
                )}
              </div>
              <p className="text-base sm:text-lg font-black leading-none text-slate-900">{s.val}</p>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BusinessPage;
