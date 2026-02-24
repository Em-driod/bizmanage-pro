import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { IScannedTransaction, Client } from '../types';
import { useCurrency } from '../context/CurrencyContext';

interface ParsedScanItem {
  amount: number;
  type: 'income' | 'expense' | 'unassigned';
  description?: string;
  category?: string;
  status?: 'pending' | 'edited' | 'committed';
}

const ScannedTransactions: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [scannedTxs, setScannedTxs] = useState<IScannedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<IScannedTransaction | null>(null);
  const [editingParsedItem, setEditingParsedItem] = useState<ParsedScanItem | null>(null);
  const [editingParsedItemIndex, setEditingParsedItemIndex] = useState<number | null>(null); // Index of the item in parsedDetails

  const [clients, setClients] = useState<Client[]>([]);
  const [commitFormData, setCommitFormData] = useState({
    amount: 0,
    type: 'expense' as 'income' | 'expense',
    description: '',
    category: '',
    clientId: '',
  });

  const fetchScannedTransactions = async () => {
    setIsLoading(true);
    try {
      const [scans, clientData] = await Promise.all([
        apiRequest<IScannedTransaction[]>('/scanned-transactions'),
        apiRequest<Client[]>('/clients')
      ]);
      setScannedTxs(scans);
      setClients(clientData);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to fetch scanned transactions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScannedTransactions();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this scanned item? This cannot be undone.')) {
      try {
        await apiRequest(`/scanned-transactions/${id}`, { method: 'DELETE' });
        fetchScannedTransactions(); // Refresh list
      } catch (error) {
        console.error('Error deleting scanned transaction:', error);
        alert('Failed to delete scanned item.');
      }
    }
  };

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTxForDetails, setSelectedTxForDetails] = useState<IScannedTransaction | null>(null);

  // ... other functions ...

  const openDetailsModal = (tx: IScannedTransaction) => {
    setSelectedTxForDetails(tx);
    setShowDetailsModal(true);
  };

  const openCommitModal = (item: ParsedScanItem, index: number) => {
    setSelectedTx(selectedTxForDetails); // Keep the main scanned document selected
    setEditingParsedItem(item); // Temporarily store the item that was chosen to commit
    setEditingParsedItemIndex(index); // Ensure index is set for direct commit
    setCommitFormData({
      amount: item.amount,
      type: item.type === 'unassigned' ? 'expense' : item.type,
      description: item.description || '',
      category: item.category || '',
      clientId: '', // Reset clientId for new commit
    });
    setShowCommitModal(true);
  };

  const openEditItemModal = (item: ParsedScanItem, index: number) => {
    setSelectedTx(selectedTxForDetails); // Ensure the main scanned document is selected
    setEditingParsedItem(item);
    setEditingParsedItemIndex(index);
    setCommitFormData({
      amount: item.amount,
      type: item.type === 'unassigned' ? 'expense' : item.type,
      description: item.description || '',
      category: item.category || '',
      clientId: '',
    });
    setShowCommitModal(true);
  };

  const handleCommitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;

    try {
      if (editingParsedItem !== null && editingParsedItemIndex !== null) {
        // Scenario 1: Saving edits to a parsed item
        await apiRequest(`/scanned-transactions/${selectedTx._id}/parsed-items/${editingParsedItemIndex}`, {
          method: 'PUT',
          body: {
            ...commitFormData,
            status: 'edited', // Explicitly mark as edited
          },
        });
        alert('Item updated successfully!');
        setShowCommitModal(false);
        setEditingParsedItem(null);
        setEditingParsedItemIndex(null);
        await fetchScannedTransactions(); // Refresh list to reflect changes
        // Re-find and update selectedTxForDetails to get the latest data
        setSelectedTxForDetails(prevDetails => {
          if (!prevDetails) return null;
          return scannedTxs.find(tx => tx._id === prevDetails._id) || null;
        });
        // Do NOT close setShowDetailsModal(false) here
      } else if (editingParsedItem !== null) {
        // Scenario 2: Committing a parsed item (could be after editing, or directly committing)
        // Ensure the commitFormData includes the itemIndex for the backend
        await apiRequest(`/scanned-transactions/${selectedTx._id}/commit`, {
          method: 'POST',
          body: {
            ...commitFormData,
            itemIndex: editingParsedItemIndex,
          },
        });
        alert('Transaction committed successfully!');
        setShowCommitModal(false);
        setEditingParsedItem(null);
        setEditingParsedItemIndex(null);
        fetchScannedTransactions(); // Refresh list to reflect changes
        setShowDetailsModal(false); // Close details modal after commit
      }

    } catch (error) {
      console.error('Error handling commit/edit:', error);
      alert('Failed to process action.');
    }
  };

  const handleCommitAll = async () => {
    if (!selectedTxForDetails) return;
    if (window.confirm('Are you sure you want to commit all pending/edited items from this document?')) {
      try {
        await apiRequest(`/scanned-transactions/${selectedTxForDetails._id}/commit-all`, {
          method: 'POST',
        });
        alert('All pending/edited items committed successfully!');
        setShowDetailsModal(false);
        fetchScannedTransactions();
      } catch (error) {
        console.error('Error committing all items:', error);
        alert('Failed to commit all items.');
      }
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-8">
      <div className="px-1">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Review Library</h2>
        <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed max-w-2xl">
          Approve and commit financial data extracted from your AI-scanned documents into your primary ledgers.
        </p>
      </div>

      {scannedTxs.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
            <i className="fas fa-box-open text-2xl"></i>
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest text-center">No pending archives</p>
          <p className="text-xs text-slate-400 mt-2">New scans will appear here for verification.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-extrabold uppercase tracking-[2px]">
                  <th className="px-8 py-5">Scanned Date</th>
                  <th className="px-8 py-5">Source Document</th>
                  <th className="px-8 py-5">Detection Count</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {scannedTxs.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6 text-sm font-medium text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 text-xs">
                          <i className="fas fa-file-invoice"></i>
                        </div>
                        <p className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{tx.originalFileName || 'Untitled Document'}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-black px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg">{tx.parsedDetails.length} items</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase rounded-full ${tx.status === 'pending' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tx.status === 'pending' ? 'bg-blue-500' : 'bg-emerald-500'}`}></span>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                        <button onClick={() => openDetailsModal(tx)} className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100">Review</button>
                        <button onClick={() => handleDelete(tx._id)} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-300 hover:text-rose-600 hover:border-rose-100 shadow-sm transition-all"><i className="fas fa-trash-alt text-xs"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-slate-100">
            {scannedTxs.map((tx) => (
              <div key={tx._id} className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    <p className="text-sm font-bold text-slate-900 truncate max-w-[180px]">{tx.originalFileName || 'Scanned Doc'}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full ${tx.status === 'pending' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                    {tx.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                  <div className="flex-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Found Items</p>
                    <p className="text-xs font-bold text-slate-900">{tx.parsedDetails.length} Transactions</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => openDetailsModal(tx)}
                    className="flex-3 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold active:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 flex-1"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleDelete(tx._id)}
                    className="w-11 h-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-rose-500 active:bg-rose-50 transition-colors shadow-sm"
                  >
                    <i className="fas fa-trash-alt text-xs"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {showCommitModal && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">{editingParsedItem ? 'Edit and Commit Transaction' : 'Commit Transaction'}</h3>
              <button onClick={() => { setShowCommitModal(false); setEditingParsedItem(null); setEditingParsedItemIndex(null); }} className="text-slate-400"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleCommitSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input type="text" required className="w-full px-4 py-2 rounded-lg border border-slate-200" value={commitFormData.description} onChange={(e) => setCommitFormData({ ...commitFormData, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <input type="number" required className="w-full px-4 py-2 rounded-lg border border-slate-200" value={commitFormData.amount} onChange={(e) => setCommitFormData({ ...commitFormData, amount: parseFloat(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select className="w-full px-4 py-2 rounded-lg border border-slate-200" value={commitFormData.type} onChange={(e) => setCommitFormData({ ...commitFormData, type: e.target.value as any })}>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-200" value={commitFormData.category} onChange={(e) => setCommitFormData({ ...commitFormData, category: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Associate Client (Optional)</label>
                <select className="w-full px-4 py-2 rounded-lg border border-slate-200" value={commitFormData.clientId} onChange={(e) => setCommitFormData({ ...commitFormData, clientId: e.target.value })}>
                  <option value="">None</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex justify-between gap-4">
                {editingParsedItemIndex !== null ? (
                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                  >
                    Save Changes
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold"
                  >
                    Confirm and Create Transaction
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setShowCommitModal(false); setEditingParsedItem(null); setEditingParsedItemIndex(null); }}
                  className="w-full py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailsModal && selectedTxForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Scanned Document Details</h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-slate-400"><i className="fas fa-times"></i></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700">Original File Name:</p>
                <p className="text-base text-slate-900">{selectedTxForDetails.originalFileName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Raw Extracted Text:</p>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 max-h-60 overflow-y-auto">
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap">{selectedTxForDetails.rawText}</pre>
                </div>
              </div>
              {selectedTxForDetails.parsedDetails.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Extracted Items:</p>
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {selectedTxForDetails.parsedDetails.map((item, index) => (
                      <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.description || 'No Description'}</p>
                          <p className="text-xs text-slate-500">
                            {item.category} - {item.type}
                            {item.status && (
                              <span className={`ml-2 px-2 py-0.5 text-[8px] font-bold uppercase rounded-full ${item.status === 'committed' ? 'bg-green-100 text-green-700' :
                                item.status === 'edited' ? 'bg-orange-100 text-orange-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                {item.status}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{formatCurrency(item.amount)}</span>
                          <button onClick={() => { setShowDetailsModal(false); openEditItemModal(item, index); }} className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700">Edit</button>
                          <button onClick={() => { setShowDetailsModal(false); openCommitModal(item, index); }} className="px-3 py-1 bg-green-600 text-white rounded-md text-xs hover:bg-green-700">Commit</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 mt-4">
                {selectedTxForDetails.parsedDetails.some(item => item.status === 'pending' || item.status === 'edited') && (
                  <button onClick={handleCommitAll} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold">Commit All Pending Items</button>
                )}
                <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-bold">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScannedTransactions;
