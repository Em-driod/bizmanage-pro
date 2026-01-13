
import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ClientFormModalProps {
  showModal: boolean;
  onClose: () => void;
  onSave: () => void;
  editingClient: Client | null; // Pass the client being edited, or null for creation
}

const ClientFormModal: React.FC<ClientFormModalProps> = ({ showModal, onClose, onSave, editingClient }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', businessValue: 50, status: 'active' as 'active' | 'inactive' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingClient) {
      setFormData({
        name: editingClient.name,
        email: editingClient.email,
        phone: editingClient.phone,
        businessValue: editingClient.businessValue,
        status: editingClient.status,
      });
    } else {
      setFormData({ name: '', email: '', phone: '', businessValue: 50, status: 'active' });
    }
  }, [editingClient, showModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingClient) {
        await apiRequest(`/clients/${editingClient._id}`, { method: 'PUT', body: formData });
      } else {
        await apiRequest('/clients', { method: 'POST', body: formData });
      }
      onSave(); // Notify parent to refresh client list
      onClose();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-extrabold text-slate-900 text-lg">{editingClient ? 'Edit Contact' : 'Create Contact'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white transition-colors text-slate-400">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
            <input
              type="text" required value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
            <input
              type="email" required value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
            <input
              type="text" value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Business Value</label>
            <input
              type="range" min="0" max="100" value={formData.businessValue}
              onChange={(e) => setFormData({ ...formData, businessValue: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ml-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
              className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="pt-4 flex gap-4">
            <button
              type="button" onClick={onClose}
              className="flex-1 px-6 py-4 border border-slate-100 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
              disabled={loading}
            >
              Discard
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientFormModal;