
import React, { useState, useEffect } from 'react';
import { Business } from '../types';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

const BusinessPage: React.FC = () => {
  const { user } = useAuth();
  const { availableCurrencies } = useCurrency();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '', email: '', phone: '', currency: '' });

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!user?.businessId) return;
      try {
        const data = await apiRequest<Business>(`/businesses/${user.businessId}`);
        setBusiness(data);
        setFormData({ name: data.name, address: data.address, email: data.email, phone: data.phone, currency: data.currency });
      } catch (err) {
        setBusiness({ _id: user.businessId, name: 'Sample Business', address: '123 Main St', email: 'biz@example.com', phone: '555-1234', currency: 'USD' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchBusiness();
  }, [user?.businessId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest(`/businesses/${user?.businessId}`, { method: 'PUT', body: formData });
      setBusiness({ ...business!, ...formData });
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) return <div className="p-8">Loading business information...</div>;

  return (
    <div className="min-h-screen space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-12">
      <div className="px-1">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Organization Profile</h2>
        <p className="text-base text-slate-500 font-medium leading-relaxed max-w-xl">
          Maintain your core business identity and operational preferences across the platform.
        </p>
      </div>

      <div className="max-w-4xl bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="relative h-32 bg-gradient-to-r from-indigo-600 to-blue-600 overflow-hidden">
          <div className="absolute inset-0 opacity-20 flex items-center justify-center pointer-events-none">
            <i className="fas fa-microchip text-[120px]"></i>
          </div>
        </div>

        <div className="px-8 pb-10">
          <div className="flex flex-col sm:flex-row justify-between items-end -mt-10 mb-8 gap-4 px-2">
            <div className="w-24 h-24 rounded-[2rem] bg-white border-4 border-white shadow-xl flex items-center justify-center text-indigo-600 text-3xl">
              <i className="fas fa-briefcase"></i>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-white hover:bg-slate-50 text-indigo-600 border border-slate-100 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm transition-all hover:shadow-md"
              >
                Modify Identity
              </button>
            )}
          </div>

          {!isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 px-2">
              {[
                { label: 'Entity Nomenclature', val: business?.name, icon: 'fa-id-card' },
                { label: 'Operational Email', val: business?.email, icon: 'fa-envelope-open-text' },
                { label: 'Communication Line', val: business?.phone, icon: 'fa-phone-volume' },
                { label: 'Primary Jurisdiction', val: business?.address, icon: 'fa-location-dot' },
                { label: 'Currency Baseline', val: business?.currency || 'USD', icon: 'fa-coins' }
              ].map((field, idx) => (
                <div key={idx} className="space-y-1.5 p-4 rounded-2xl border border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <i className={`fas ${field.icon} text-[10px] text-indigo-400`}></i>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[2px]">{field.label}</p>
                  </div>
                  <p className="text-lg font-bold text-slate-800">{field.val || 'Unconfigured intelligence'}</p>
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-6 px-2 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Entity Name</label>
                  <input
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Email Interface</label>
                  <input
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Communication Line</label>
                  <input
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Jurisdiction Address</label>
                  <input
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Currency Standard</label>
                  <select
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                    value={formData.currency}
                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                  >
                    {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-4 pt-4 border-t border-slate-50">
                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 h-12 border border-slate-100 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all">Discard Changes</button>
                <button type="submit" className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-indigo-100 transition-all active:scale-95">Synchronize Profile</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessPage;
