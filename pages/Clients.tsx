import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Client } from '../types';
import { apiRequest, getErrorMessage } from '../services/api';
import ClientFormModal from '../components/ClientFormModal';
import ClientDetailModal from '../components/ClientDetailModal';
import InvoiceFormModal from '../components/InvoiceFormModal';
import { useCurrency } from '../context/CurrencyContext';

const Clients: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { formatCurrency } = useCurrency();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoicePrefilledClient, setInvoicePrefilledClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [portalToast, setPortalToast] = useState('');
  const showPortalToast = (msg: string) => { setPortalToast(msg); setTimeout(() => setPortalToast(''), 3000); };

  const fetchClients = useCallback(async (p = page, search = searchQuery) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50' });
      if (search) params.set('search', search);
      const res = await apiRequest<{ data: Client[]; total: number; page: number; pages: number }>(`/clients?${params}`);
      setClients(res.data);
      setTotal(res.total);
      setTotalPages(res.pages);
      setPage(res.page);
    } catch (err) {
      console.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) fetchClients(1, searchQuery);
  }, [authLoading]);

  // Debounce server-side search
  useEffect(() => {
    const id = setTimeout(() => fetchClients(1, searchQuery), 350);
    return () => clearTimeout(id);
  }, [searchQuery]);

  useEffect(() => {
    const handler = () => fetchClients(1, searchQuery);
    window.addEventListener('MorniyDataUpdate', handler);
    return () => window.removeEventListener('MorniyDataUpdate', handler);
  }, [searchQuery]);

  const handleViewTransactions = (client: Client) => {
    setSelectedClient(client);
    setShowTransactionModal(true);
  };

  const filteredClients = clients; // filtering is now server-side

  const handleCopyPortalLink = async (clientId: string) => {
    try {
      const { token } = await apiRequest<{ token: string }>(`/clients/${clientId}/portal`, { method: 'POST' });
      const link = `${window.location.origin}/portal/${token}`;
      await navigator.clipboard.writeText(link);
      showPortalToast('Client portal link copied!');
    } catch {
      showPortalToast('Failed to generate portal link');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await apiRequest(`/clients/${clientId}`, { method: 'DELETE' });
        fetchClients(page, searchQuery);
      } catch (err) {
        alert('Error deleting client: ' + getErrorMessage(err));
      }
    }
  };

  const handleCloseTransactionModal = () => {
    setShowTransactionModal(false);
    setSelectedClient(null);
    fetchClients(page, searchQuery);
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
    <div className="min-h-screen space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-8">
      {portalToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl">
          {portalToast}
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Contact Database</h2>
          <p className="text-sm sm:text-base text-slate-500 font-medium">Manage your relationships and track interactions.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95 text-sm font-bold"
        >
          <i className="fas fa-plus text-xs"></i> New Contact
        </button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full max-w-md">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-12 pr-4 py-2.5 sm:py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 transition-all placeholder:text-slate-300 font-medium"
            />
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"><i className="fas fa-filter text-sm"></i></button>
            <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"><i className="fas fa-ellipsis-v text-sm"></i></button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Synchronizing...</p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-extrabold uppercase tracking-[2px]">
                    <th className="px-8 py-5">Contact</th>
                    <th className="px-8 py-5">Phone</th>
                    <th className="px-8 py-5">Contact Base</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredClients.map((client) => (
                    <tr key={client._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-300">
                            <i className="fas fa-user"></i>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{client.name}</p>
                            <p className="text-xs text-slate-400 font-medium truncate">{client.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm font-semibold text-slate-600">{client.phone}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm font-black text-indigo-600">{client.businessValue}%</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase rounded-full ${client.status === 'active'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-rose-50 text-rose-600'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${client.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {client.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                          <button
                            onClick={() => handleViewTransactions(client)}
                            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm hover:shadow-md transition-all"
                            title="View Details"
                          >
                            <i className="fas fa-eye text-xs"></i>
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(client)}
                            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm hover:shadow-md transition-all"
                            title="Edit"
                          >
                            <i className="fas fa-pen-to-square text-xs"></i>
                          </button>
                          <button
                            onClick={() => handleCopyPortalLink(client._id)}
                            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm hover:shadow-md transition-all"
                            title="Copy client portal link"
                          >
                            <i className="fas fa-link text-xs"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client._id)}
                            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-100 shadow-sm hover:shadow-md transition-all"
                            title="Delete"
                          >
                            <i className="fas fa-trash-can text-xs"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredClients.map((client) => (
                <div key={client._id} className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                        <i className="fas fa-user text-sm"></i>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-tight">{client.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{client.email}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full ${client.status === 'active'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-rose-50 text-rose-600'
                      }`}>
                      <span className={`w-1 h-1 rounded-full ${client.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      {client.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Contact</p>
                      <p className="text-xs font-semibold text-slate-600">{client.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Contact Base</p>
                      <p className="text-xs font-black text-indigo-600">{client.businessValue}%</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleViewTransactions(client)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 active:bg-slate-50 transition-colors shadow-sm"
                    >
                      <i className="fas fa-eye text-xs text-indigo-500"></i>
                      View
                    </button>
                    <button
                      onClick={() => handleCopyPortalLink(client._id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-600 active:bg-indigo-100 transition-colors"
                    >
                      <i className="fas fa-link text-xs"></i>
                      Portal
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(client)}
                      className="w-11 flex items-center justify-center py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 active:bg-slate-50 transition-colors shadow-sm"
                    >
                      <i className="fas fa-pen-to-square text-xs text-indigo-500"></i>
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client._id)}
                      className="w-11 flex items-center justify-center py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-rose-500 active:bg-rose-50 transition-colors shadow-sm"
                    >
                      <i className="fas fa-trash-can text-xs"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-50">
            <p className="text-xs font-semibold text-slate-400">{total} clients total</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchClients(page - 1, searchQuery)}
                disabled={page <= 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <i className="fas fa-chevron-left text-xs" />
              </button>
              <span className="text-xs font-bold text-slate-600 px-2">{page} / {totalPages}</span>
              <button
                onClick={() => fetchClients(page + 1, searchQuery)}
                disabled={page >= totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <i className="fas fa-chevron-right text-xs" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedClient && showTransactionModal && (
        <ClientDetailModal
          client={selectedClient}
          onClose={handleCloseTransactionModal}
          onTransactionAdded={() => fetchClients(page, searchQuery)}
          onSendInvoice={(client) => {
            setInvoicePrefilledClient(client);
            setShowInvoiceModal(true);
          }}
        />
      )}

      {showInvoiceModal && (
        <InvoiceFormModal
          onClose={() => { setShowInvoiceModal(false); setInvoicePrefilledClient(null); }}
          onSave={() => { setShowInvoiceModal(false); setInvoicePrefilledClient(null); }}
          prefilledClientId={invoicePrefilledClient?._id}
        />
      )}

      {showModal && (
        <ClientFormModal
          showModal={showModal}
          onClose={() => { setShowModal(false); setEditingClient(null); }}
          onSave={() => fetchClients(page, searchQuery)}
          editingClient={editingClient}
        />
      )}
    </div>
  );
};

export default Clients;