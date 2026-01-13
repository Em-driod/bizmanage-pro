
import React, { useState, useEffect } from 'react';
import { Client, Transaction } from '../types';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

interface ClientDetailModalProps {
  client: Client;
  onClose: () => void;
  onTransactionAdded: () => void;
}

const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ client, onClose, onTransactionAdded }) => {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [newTransactionData, setNewTransactionData] = useState({
    amount: '',
    type: 'income' as 'income' | 'expense',
    category: '',
    description: '',
  });

  const fetchTransactions = async () => {
    if (!client._id) return;
    setLoadingTransactions(true);
    try {
      // The backend getTransactions already filters by clientId from req.query
      const data = await apiRequest<Transaction[]>(`/transactions?clientId=${client._id}`);
      setTransactions(data);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [client._id]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.businessId) {
      alert('Error: User business ID not found. Cannot add transaction.');
      return;
    }
    try {
      await apiRequest('/transactions', {
        method: 'POST',
        body: {
          ...newTransactionData,
          clientId: client._id,
          businessId: user.businessId,
          amount: parseFloat(newTransactionData.amount),
        },
      });
      setNewTransactionData({ amount: '', type: 'income', category: '', description: '' });
      onTransactionAdded(); // Notify parent to refresh client data (e.g., balance)
      fetchTransactions(); // Refresh transactions list
    } catch (err: any) {
      alert('Error adding transaction: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl h-[90vh] overflow-hidden animate-in zoom-in duration-300 flex flex-col">
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-extrabold text-slate-900 text-lg">Client Details: {client.name}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white transition-colors text-slate-400">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10">
          {/* Client Info */}
          <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <h4 className="font-bold text-slate-900 mb-4">Contact Information</h4>
            <p className="text-sm"><strong>Email:</strong> {client.email}</p>
            <p className="text-sm"><strong>Phone:</strong> {client.phone}</p>
            <p className="text-sm"><strong>Business Value:</strong> {formatCurrency(client.businessValue)}</p>
            <p className="text-sm"><strong>Status:</strong> {client.status}</p>
            <p className="text-sm"><strong>Balance:</strong> {formatCurrency(client.balance || 0)}</p>
          </div>

          {/* Add New Transaction Form */}
          <div className="mb-8 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-4">Add New Activity</h4>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={newTransactionData.description}
                  onChange={(e) => setNewTransactionData({ ...newTransactionData, description: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newTransactionData.amount}
                    onChange={(e) => setNewTransactionData({ ...newTransactionData, amount: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Type</label>
                  <select
                    value={newTransactionData.type}
                    onChange={(e) => setNewTransactionData({ ...newTransactionData, type: e.target.value as 'income' | 'expense' })}
                    className="w-full p-3 border border-slate-200 rounded-lg"
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Category</label>
                <input
                  type="text"
                  value={newTransactionData.category}
                  onChange={(e) => setNewTransactionData({ ...newTransactionData, category: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
              >
                Add Transaction
              </button>
            </form>
          </div>

          {/* Transaction History */}
          <h4 className="font-bold text-slate-900 mb-4">Activity History</h4>
          {loadingTransactions ? (
            <div className="text-center text-slate-500">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-slate-500">No activities recorded for this client.</div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction._id} className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-800">{transaction.description || 'No Description'}</p>
                    <p className="text-sm text-slate-500">{transaction.category}</p>
                  </div>
                  <div className={`font-bold ${transaction.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDetailModal;
