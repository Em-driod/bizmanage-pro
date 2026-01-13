
import React, { useState, useEffect } from 'react';
import { Transaction, Client } from '../types';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

const Transactions: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    amount: 0,
    type: 'income',
    description: '',
    clientId: '',
    date: new Date().toISOString().split('T')[0]
  });

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
        { _id: '1', amount: 500, type: 'income', description: 'Consulting Fee', clientId: '1', businessId: 'bus1', date: '2023-10-25' },
        { _id: '2', amount: 150, type: 'expense', description: 'Office Supplies', businessId: 'bus1', date: '2023-10-26' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSend = { ...formData };
      if (dataToSend.clientId === '') {
        (dataToSend as any).clientId = null; // Set to null if no client is selected
      }
      await apiRequest('/transactions', { method: 'POST', body: dataToSend });
      setShowModal(false);
      setFormData({ amount: 0, type: 'income', description: '', clientId: '', date: new Date().toISOString().split('T')[0] });
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-slate-500 text-sm">Track all incoming and outgoing funds.</h3>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
        >
          <i className="fas fa-plus"></i> New Transaction
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {transactions.map((tx) => (
              <tr key={tx._id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-600">{tx.date}</td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-slate-900">{tx.description}</p>
                  {tx.clientId && (
                    <p className="text-xs text-indigo-500">Client: {clients.find(c => c._id === tx.clientId)?.name || tx.clientId}</p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {tx.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900">
                  {tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amount)}
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => deleteTransaction(tx._id)} className="text-slate-300 hover:text-red-600">
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Add Transaction</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400">
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
                    className="w-full px-4 py-2 rounded-lg border border-slate-200"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
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
                Create Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
