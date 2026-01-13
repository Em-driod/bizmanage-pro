import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Client } from '../types';
import { apiRequest } from '../services/api';
import ClientFormModal from '../components/ClientFormModal';
import { useCurrency } from '../context/CurrencyContext';

const Clients: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { formatCurrency } = useCurrency();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false); // For creating/editing client details
  const [showTransactionModal, setShowTransactionModal] = useState(false); // For viewing/adding transactions
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null); // To pass to ClientFormModal for editing

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<Client[]>('/clients');
      setClients(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchClients();
    }
  }, [authLoading]);

  const handleViewTransactions = (client: Client) => {
    setSelectedClient(client);
    setShowTransactionModal(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await apiRequest(`/clients/${clientId}`, { method: 'DELETE' });
        fetchClients();
      } catch (err: any) {
        alert('Error deleting client: ' + err.message);
      }
    }
  };

  const handleCloseTransactionModal = () => {
    setShowTransactionModal(false);
    setSelectedClient(null);
    fetchClients(); // Refresh clients to update balance
  };

  const handleOpenCreateModal = () => {
    setEditingClient(null); // For creating a new client
    setShowModal(true);
  };

  const handleOpenEditModal = (client: Client) => {
    setEditingClient(client); // For editing an existing client
    setShowModal(true);
  };

  if (authLoading || isLoading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
      <p className="text-xs font-bold text-slate-400 uppercase">Loading clients...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Contact Database</h2>
          <p className="text-sm text-slate-400 font-medium">Manage your relationships and track interactions.</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all hover:-translate-y-1 active:scale-95"
        >
          <i className="fas fa-plus text-xs"></i> New Contact
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
           <div className="relative flex-1 max-w-md">
             <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
             <input type="text" placeholder="Search by name or email..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 transition-all placeholder:text-slate-300" />
           </div>
           <div className="flex items-center gap-2">
             <button className="p-3 text-slate-400 hover:text-slate-600"><i className="fas fa-filter"></i></button>
             <button className="p-3 text-slate-400 hover:text-slate-600"><i className="fas fa-ellipsis-v"></i></button>
           </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400 uppercase">Synchronizing...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-extrabold uppercase tracking-[2px]">
                  <th className="px-8 py-5">Contact</th>
                  <th className="px-8 py-5">Phone</th>
                  <th className="px-8 py-5">Value</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {clients.map((client) => (
                  <tr key={client._id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <i className="fas fa-user"></i>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{client.name}</p>
                          <p className="text-xs text-slate-400 font-medium">{client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-medium text-slate-600">{client.phone}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-medium text-slate-600">{formatCurrency(client.businessValue)}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-full ${client.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{client.status}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleViewTransactions(client)} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm transition-all">
                          <i className="fas fa-eye text-xs"></i>
                        </button>
                        <button onClick={() => handleOpenEditModal(client)} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm transition-all">
                          <i className="fas fa-pen-to-square text-xs"></i>
                        </button>
                        <button onClick={() => handleDeleteClient(client._id)} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-100 shadow-sm transition-all">
                          <i className="fas fa-trash-can text-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedClient && showTransactionModal && (
        <ClientDetailModal
          client={selectedClient}
          onClose={handleCloseTransactionModal}
          onTransactionAdded={fetchClients} // This will re-fetch clients and update their balance
        />
      )}

      {showModal && (
        <ClientFormModal
          showModal={showModal}
          onClose={() => { setShowModal(false); setEditingClient(null); }}
          onSave={fetchClients}
          editingClient={editingClient}
        />
      )}
    </div>
  );
};

export default Clients;