import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Transaction, Client, IScannedTransaction, ScanResponse } from '../types';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import ScanTransactionModal from '../components/ScanTransactionModal';

const Transactions: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [formData, setFormData] = useState({
    _id: '', // Add _id for editing
    amount: 0,
    type: 'income',
    description: '',
    category: '',
    clientId: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [txData, clientData] = await Promise.all([
        apiRequest<Transaction[]>('/transactions'),
        apiRequest<Client[]>('/clients')
      ]);
      setTransactions(txData);
      setClients(clientData);
    } catch (err: any) {
      // Mock data if failed
      setTransactions([
        { _id: '1', amount: 500, type: 'income', description: 'Consulting Fee', category: 'Consulting', clientId: '1', businessId: 'bus1', date: '2023-10-25', recordedBy: 'u1' },
        { _id: '2', amount: 150, type: 'expense', description: 'Office Supplies', category: 'Office Supplies', businessId: 'bus1', date: '2023-10-26', recordedBy: 'u1' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      _id: '',
      amount: 0,
      type: 'income',
      description: '',
      category: '',
      clientId: '',
      date: new Date().toISOString().split('T')[0]
    });
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSend = { ...formData };
      if (dataToSend.clientId === '') {
        (dataToSend as any).clientId = null; // Set to null if no client is selected
      }

      if (isEditing) {
        await apiRequest(`/transactions/${dataToSend._id}`, { method: 'PUT', body: dataToSend });
      } else {
        await apiRequest('/transactions', { method: 'POST', body: dataToSend });
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!confirm('Delete transaction?')) return;
    try {
      await apiRequest(`/transactions/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle data from the scan modal
  const handleScanComplete = async (data: ScanResponse) => {
    setShowScanModal(false);
    setIsSubmitting(true);
    try {
      if (data.transactions && data.transactions.length > 0) {
        await apiRequest('/scanned-transactions', {
          method: 'POST',
          body: {
            transactions: data.transactions,
            text: data.text,
            originalFileName: "Scanned Document" // This could be improved to use the actual file name
          },
        });
        alert('Scan saved successfully! You can review it in the Scanned Transactions page.');
        // Maybe navigate to the scanned transactions page? For now, just an alert.
      } else {
        alert("No transactions were found in the document.");
      }
    } catch (err: any) {
      alert('Error saving scan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setIsEditing(true);
    setFormData({
      _id: transaction._id,
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description,
      category: transaction.category,
      clientId: transaction.clientId || '',
      date: transaction.date.split('T')[0] // Format date for input
    });
    setShowModal(true);
  };

  return (
    <div className="min-h-screen space-y-6 sm:space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Financial Records</h2>
          <p className="text-sm sm:text-base md:text-lg text-slate-500 font-medium">Track all incoming and outgoing funds with precision.</p>
        </div>
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full sm:w-auto lg:w-auto">
          <button
            onClick={() => { navigate('/scanned-transactions'); }}
            className="w-full sm:w-auto lg:w-full bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 sm:px-5 sm:py-3 lg:px-4 lg:py-2.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-slate-200 transition-all hover:-translate-y-1 active:scale-95 text-sm font-bold"
          >
            <i className="fas fa-box-archive text-xs text-indigo-400"></i> View Recorded Scans
          </button>
          <div className="flex gap-2 w-full sm:w-auto lg:w-full">
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 sm:px-5 sm:py-3 lg:px-4 lg:py-2.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95 text-sm font-bold"
            >
              <i className="fas fa-plus text-xs"></i> New Entry
            </button>
            <button
              onClick={() => { setShowScanModal(true); }}
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 sm:px-5 sm:py-3 lg:px-4 lg:py-2.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all hover:-translate-y-1 active:scale-95 text-sm font-bold disabled:bg-slate-200 disabled:shadow-none"
            >
              <i className="fas fa-camera text-xs"></i> {isSubmitting ? 'Processing...' : 'Scan'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Synchronizing...</p>
          </div>
        ) : (
          <div>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-extrabold uppercase tracking-[2px]">
                    <th className="px-4 md:px-5 py-5">Date</th>
                    <th className="px-4 md:px-5 py-5">Description</th>
                    <th className="px-4 md:px-5 py-5">Category</th>
                    <th className="px-4 md:px-5 py-5">Type</th>
                    <th className="px-4 md:px-5 py-5">Amount</th>
                    <th className="px-4 md:px-5 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {transactions.map((tx) => (
                    <tr key={tx._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 md:px-5 py-6 text-sm font-medium text-slate-500">{tx.date}</td>
                      <td className="px-4 md:px-5 py-6">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{tx.description}</p>
                          {tx.clientId && (
                            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mt-0.5">
                              Client: {clients.find(c => c._id === tx.clientId)?.name || tx.clientId}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 md:px-5 py-6">
                        <span className="text-sm font-semibold text-slate-600">{tx.category || 'Uncategorized'}</span>
                      </td>
                      <td className="px-4 md:px-5 py-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase rounded-full ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-4 md:px-5 py-6">
                        <span className={`text-sm font-black ${tx.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="px-4 md:px-5 py-6 text-right">
                        <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                          <button
                            onClick={() => handleEditTransaction(tx)}
                            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm hover:shadow-md transition-all"
                          >
                            <i className="fas fa-edit text-xs"></i>
                          </button>
                          <button
                            onClick={() => deleteTransaction(tx._id)}
                            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-100 shadow-sm hover:shadow-md transition-all"
                          >
                            <i className="fas fa-trash-alt text-xs"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-slate-100">
              {transactions.map((tx) => (
                <div key={tx._id} className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">{tx.date}</p>
                      <p className="text-sm font-black text-slate-900 truncate">{tx.description}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      <span className={`w-1 h-1 rounded-full ${tx.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      {tx.type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Category</p>
                      <p className="text-xs font-semibold text-slate-600">{tx.category || 'General'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Amount</p>
                      <p className={`text-sm font-black ${tx.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  </div>

                  {tx.clientId && (
                    <div className="flex items-center gap-2 px-1">
                      <i className="fas fa-user-tag text-[10px] text-indigo-400"></i>
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                        {clients.find(c => c._id === tx.clientId)?.name || tx.clientId}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleEditTransaction(tx)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 active:bg-slate-50 transition-colors shadow-sm"
                    >
                      <i className="fas fa-pen-to-square text-xs text-indigo-500"></i>
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTransaction(tx._id)}
                      className="w-11 flex items-center justify-center py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-rose-500 active:bg-rose-50 transition-colors shadow-sm"
                    >
                      <i className="fas fa-trash-alt text-xs"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>


      <ScanTransactionModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onScanComplete={handleScanComplete}
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">{isEditing ? 'Edit Transaction' : 'Add Transaction'}</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-slate-400">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input
                  type="text" required
                  className="w-full px-4 py-2 rounded-lg border border-slate-200"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount ($)</label>
                  <input
                    type="number" required
                    className="w-full px-4 py-2 rounded-lg border border-slate-200"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    className="w-full px-4 py-2 rounded-lg border border-slate-2.00"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Associate Client (Optional)</label>
                <select
                  className="w-full px-4 py-2 rounded-lg border border-slate-200"
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                >
                  <option value="">None</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold"
              >
                {isEditing ? 'Update Entry' : 'Create Entry'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;