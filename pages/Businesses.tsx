
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
        setBusiness({ _id: user.businessId, name: 'Sample Business', address: '123 Main St', email: 'biz@example.com', phone: '555-1234' });
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
    <div className="max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Business Profile</h2>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="text-indigo-600 font-medium hover:text-indigo-700"
          >
            Edit Profile
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs uppercase text-slate-400 font-bold tracking-wider mb-1">Business Name</p>
              <p className="text-lg font-medium text-slate-800">{business?.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-bold tracking-wider mb-1">Business Email</p>
              <p className="text-lg font-medium text-slate-800">{business?.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-bold tracking-wider mb-1">Phone</p>
              <p className="text-lg font-medium text-slate-800">{business?.phone}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400 font-bold tracking-wider mb-1">Location</p>
              <p className="text-lg font-medium text-slate-800">{business?.address}</p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input 
                className="w-full p-2 border rounded-lg" 
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input 
                className="w-full p-2 border rounded-lg" 
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input 
                className="w-full p-2 border rounded-lg" 
                value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <input 
                className="w-full p-2 border rounded-lg" 
                value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <select
                className="w-full p-2 border rounded-lg"
                value={formData.currency}
                onChange={e => setFormData({...formData, currency: e.target.value})}
              >
                {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2 border rounded-lg">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg">Update Profile</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default BusinessPage;
