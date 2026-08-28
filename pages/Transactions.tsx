import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Transaction, Client, IScannedTransaction, ScanResponse, ProjectSummary } from '../types';
import { apiRequest, getErrorMessage } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import ScanTransactionModal from '../components/ScanTransactionModal';
import ImportCsvModal from '../components/ImportCsvModal';
import IssueReceiptModal from '../components/IssueReceiptModal';
import TransactionSummaryModal from '../components/TransactionSummaryModal';

const Transactions: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || '';
  const [categoryFilter, setCategoryFilter] = useState(categoryParam);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [issueReceiptTxs, setIssueReceiptTxs] = useState<Transaction[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [formData, setFormData] = useState({
    _id: '', // Add _id for editing
    amount: 0,
    type: 'income',
    description: '',
    category: '',
    clientId: '',
    projectId: '',
    taxCategory: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [taxCategoryOptions, setTaxCategoryOptions] = useState<Array<{ id: string; label: string; isIncome: boolean; isAllowableDeduction: boolean; isReliefDeduction: boolean }>>([]);

  useEffect(() => {
    apiRequest<{ taxCategories: Array<{ id: string; label: string; isIncome: boolean; isAllowableDeduction: boolean; isReliefDeduction: boolean }> }>('/tax/metadata')
      .then((m) => setTaxCategoryOptions(m.taxCategories))
      .catch(() => {});
  }, []);
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = async (p = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50' });
      if (categoryFilter) params.set('category', categoryFilter);
      const [txRes, clientRes, projectData] = await Promise.all([
        apiRequest<{ data: Transaction[]; total: number; page: number; pages: number }>(`/transactions?${params}`),
        apiRequest<{ data: Client[] }>(`/clients?limit=200`),
        apiRequest<ProjectSummary[]>('/projects').catch(() => []),
      ]);
      setTransactions(txRes.data);
      setTxTotal(txRes.total);
      setTxPage(txRes.page);
      setTxTotalPages(txRes.pages);
      setClients(clientRes.data);
      setProjects(projectData);
    } catch (err) {
      console.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener('MorniyDataUpdate', handler);
    return () => window.removeEventListener('MorniyDataUpdate', handler);
  }, []);

  const resetForm = () => {
    setFormData({
      _id: '',
      amount: 0,
      type: 'income',
      description: '',
      category: '',
      clientId: '',
      projectId: '',
      taxCategory: '',
      date: new Date().toISOString().split('T')[0]
    });
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const dataToSend: any = { ...formData };
      if (dataToSend.clientId === '') dataToSend.clientId = null;
      if (dataToSend.projectId === '') dataToSend.projectId = null;

      if (isEditing) {
        await apiRequest(`/transactions/${dataToSend._id}`, { method: 'PUT', body: dataToSend });
      } else {
        await apiRequest('/transactions', { method: 'POST', body: dataToSend });
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      alert('Error: ' + getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter project list to those linked to the selected client (if any).
  const projectOptions = useMemo(() => {
    const active = projects.filter((p) => p.status === 'active' || p.status === 'planning');
    if (!formData.clientId) return active;
    return active.filter((p) => {
      const cid = typeof p.clientId === 'object' && p.clientId ? p.clientId._id : p.clientId;
      return !cid || cid === formData.clientId;
    });
  }, [projects, formData.clientId]);

  const projectNameById = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach((p) => { map[p._id] = p.name; });
    return map;
  }, [projects]);

  const deleteTransaction = async (id: string) => {
    if (!confirm('Delete transaction?')) return;
    try {
      await apiRequest(`/transactions/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      alert(getErrorMessage(err));
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
    } catch (err) {
      alert('Error saving scan: ' + getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Receipt attachment state
  const [receiptModal, setReceiptModal] = useState<{ id: string; image: string | null } | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptToast, setReceiptToast] = useState('');

  const showReceiptToast = (msg: string) => { setReceiptToast(msg); setTimeout(() => setReceiptToast(''), 3000); };

  const handleReceiptClick = (tx: Transaction) => {
    setReceiptModal({ id: tx._id, image: (tx as any).receiptImage || null });
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !receiptModal) return;
    setReceiptUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const b64 = reader.result as string;
        await apiRequest(`/transactions/${receiptModal.id}`, { method: 'PUT', body: { receiptImage: b64 } });
        setReceiptModal(m => m ? { ...m, image: b64 } : m);
        showReceiptToast('Receipt attached');
        fetchData();
      };
      reader.readAsDataURL(file);
    } catch {
      showReceiptToast('Upload failed');
    } finally {
      setReceiptUploading(false);
    }
  };

  const handleRemoveReceipt = async () => {
    if (!receiptModal) return;
    try {
      await apiRequest(`/transactions/${receiptModal.id}`, { method: 'PUT', body: { receiptImage: '' } });
      setReceiptModal(m => m ? { ...m, image: null } : m);
      showReceiptToast('Receipt removed');
      fetchData();
    } catch { showReceiptToast('Failed'); }
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
      projectId: transaction.projectId || '',
      taxCategory: (transaction as any).taxCategory || '',
      date: transaction.date.split('T')[0] // Format date for input
    });
    setShowModal(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (visible: Transaction[]) => {
    if (visible.every((tx) => selectedIds.has(tx._id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visible.map((tx) => tx._id)));
    }
  };

  const selectedIncomeTxs = transactions.filter((tx) => selectedIds.has(tx._id) && tx.type === 'income');

  const handleBulkCategorize = async () => {
    if (!bulkCategory.trim() || selectedIds.size === 0) return;
    setIsBulkSaving(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          apiRequest(`/transactions/${id}`, { method: 'PUT', body: { category: bulkCategory } })
        )
      );
      setTransactions((prev) =>
        prev.map((tx) => selectedIds.has(tx._id) ? { ...tx, category: bulkCategory } : tx)
      );
      setSelectedIds(new Set());
      setBulkCategory('');
    } catch {
      // silent
    } finally {
      setIsBulkSaving(false);
    }
  };

  return (
    <div className="min-h-screen space-y-6 sm:space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 px-1 min-w-0">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Financial Records</h2>
          <p className="text-sm sm:text-base md:text-lg text-slate-500 font-medium">Track all incoming and outgoing funds with precision.</p>
        </div>
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full sm:w-auto lg:w-auto lg:shrink-0">
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
          <button
            onClick={() => setShowImportModal(true)}
            className="w-full sm:w-auto lg:w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 sm:px-5 sm:py-3 lg:px-4 lg:py-2.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition-all hover:-translate-y-1 active:scale-95 text-sm font-bold"
          >
            <i className="fas fa-file-csv text-xs"></i> Import CSV
          </button>
          <button
            onClick={() => setShowSummaryModal(true)}
            className="w-full sm:w-auto lg:w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2.5 sm:px-5 sm:py-3 lg:px-4 lg:py-2.5 rounded-2xl flex items-center justify-center gap-2 transition-all text-sm font-bold"
          >
            <i className="fas fa-print text-xs text-slate-400"></i> Print Summary
          </button>
        </div>
      </div>

      {/* Category filter banner — shown when arriving from Budget page */}
      {categoryFilter && (
        <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
          <i className="fas fa-filter text-indigo-400 text-sm flex-shrink-0"></i>
          <p className="text-sm font-bold text-indigo-700 flex-1">Showing <span className="font-black">"{categoryFilter}"</span> expenses</p>
          <button onClick={() => setCategoryFilter('')} className="text-xs font-black text-indigo-500 hover:text-indigo-700 px-3 py-1 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors">
            Clear filter
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 bg-indigo-600 rounded-2xl text-white animate-in slide-in-from-top-2 duration-200">
          <p className="text-sm font-bold shrink-0">{selectedIds.size} selected</p>
          <div className="flex flex-1 gap-2 w-full">
            <input
              type="text"
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              placeholder="Enter category…"
              className="flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm text-slate-900 font-medium bg-white border-0 focus:ring-2 focus:ring-white/40 outline-none"
            />
            <button
              onClick={handleBulkCategorize}
              disabled={!bulkCategory.trim() || isBulkSaving}
              className="px-4 py-1.5 bg-white text-indigo-700 text-sm font-black rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
            >
              {isBulkSaving ? 'Saving…' : 'Apply'}
            </button>
          </div>
          {selectedIncomeTxs.length > 0 && (
            <button
              onClick={() => setIssueReceiptTxs(selectedIncomeTxs)}
              className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 text-white text-sm font-black rounded-lg hover:bg-emerald-400 transition-colors shrink-0"
              title="Issue one receipt covering all selected income transactions"
            >
              <i className="fas fa-receipt text-xs"></i>
              Issue Receipt ({selectedIncomeTxs.length})
            </button>
          )}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-indigo-200 text-xs font-bold hover:text-white shrink-0"
          >
            Cancel
          </button>
        </div>
      )}

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
                    <th className="pl-4 md:pl-5 py-5 pr-2 w-8">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={transactions.filter(tx => !categoryFilter || tx.category?.toLowerCase() === categoryFilter.toLowerCase()).every(tx => selectedIds.has(tx._id))}
                        onChange={() => toggleSelectAll(transactions.filter(tx => !categoryFilter || tx.category?.toLowerCase() === categoryFilter.toLowerCase()))}
                      />
                    </th>
                    <th className="px-4 md:px-5 py-5">Date</th>
                    <th className="px-4 md:px-5 py-5">Description</th>
                    <th className="px-4 md:px-5 py-5">Category</th>
                    <th className="px-4 md:px-5 py-5">Type</th>
                    <th className="px-4 md:px-5 py-5">Amount</th>
                    <th className="px-4 md:px-5 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {transactions.filter(tx => !categoryFilter || tx.category?.toLowerCase() === categoryFilter.toLowerCase()).map((tx) => (
                    <tr key={tx._id} className={`hover:bg-slate-50/50 transition-colors group ${selectedIds.has(tx._id) ? 'bg-indigo-50/40' : ''}`}>
                      <td className="pl-4 md:pl-5 py-6 pr-2 w-8">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={selectedIds.has(tx._id)}
                          onChange={() => toggleSelect(tx._id)}
                        />
                      </td>
                      <td className="px-4 md:px-5 py-6 text-sm font-medium text-slate-500">{tx.date}</td>
                      <td className="px-4 md:px-5 py-6">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{tx.description}</p>
                          {tx.clientId && (
                            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider mt-0.5">
                              Client: {clients.find(c => c._id === tx.clientId)?.name || tx.clientId}
                            </p>
                          )}
                          {tx.projectId && projectNameById[tx.projectId] && (
                            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mt-0.5">
                              Project: {projectNameById[tx.projectId]}
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
                          {tx.type === 'income' && (
                            <button
                              onClick={() => setIssueReceiptTxs([tx])}
                              className="w-9 h-9 flex items-center justify-center bg-white border border-emerald-100 rounded-xl text-emerald-500 hover:text-emerald-700 hover:border-emerald-300 shadow-sm hover:shadow-md transition-all"
                              title="Issue Receipt"
                            >
                              <i className="fas fa-file-invoice text-xs"></i>
                            </button>
                          )}
                          <button
                            onClick={() => handleReceiptClick(tx)}
                            className={`w-9 h-9 flex items-center justify-center bg-white border rounded-xl shadow-sm hover:shadow-md transition-all ${(tx as any).receiptImage ? 'border-emerald-200 text-emerald-500 hover:text-emerald-700' : 'border-slate-100 text-slate-400 hover:text-amber-600 hover:border-amber-100'}`}
                            title={(tx as any).receiptImage ? 'View receipt' : 'Attach receipt'}
                          >
                            <i className={`fas ${(tx as any).receiptImage ? 'fa-receipt' : 'fa-camera'} text-xs`}></i>
                          </button>
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
              {transactions.filter(tx => !categoryFilter || tx.category?.toLowerCase() === categoryFilter.toLowerCase()).map((tx) => (
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
                  {tx.projectId && projectNameById[tx.projectId] && (
                    <div className="flex items-center gap-2 px-1">
                      <i className="fas fa-diagram-project text-[10px] text-amber-500"></i>
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                        {projectNameById[tx.projectId]}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    {tx.type === 'income' && (
                      <button
                        onClick={() => setIssueReceiptTxs([tx])}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-700 active:bg-emerald-100 transition-colors"
                      >
                        <i className="fas fa-file-invoice text-xs"></i>
                        Issue Receipt
                      </button>
                    )}
                    <button
                      onClick={() => handleReceiptClick(tx)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-colors border ${(tx as any).receiptImage ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}
                    >
                      <i className={`fas ${(tx as any).receiptImage ? 'fa-receipt' : 'fa-camera'} text-xs`}></i>
                      {(tx as any).receiptImage ? 'Receipt' : 'Add Receipt'}
                    </button>
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

      {issueReceiptTxs && issueReceiptTxs.length > 0 && (
        <IssueReceiptModal
          transactions={issueReceiptTxs}
          client={(() => {
            const ids = issueReceiptTxs.map(tx => {
              const cid = tx.clientId;
              if (!cid) return null;
              return typeof cid === 'object' ? (cid as any)._id : cid;
            });
            const first = ids[0];
            if (!first || !ids.every(id => id === first)) return null;
            return clients.find(c => c._id === first) || null;
          })()}
          onClose={() => setIssueReceiptTxs(null)}
          onCreated={() => setSelectedIds(new Set())}
        />
      )}

      <ImportCsvModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={fetchData}
      />

      {showSummaryModal && <TransactionSummaryModal onClose={() => setShowSummaryModal(false)} />}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in duration-200 my-auto">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  list="tx-categories"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200"
                  placeholder="Select or type a category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
                <datalist id="tx-categories">
                  {['Food & Dining','Transportation','Utilities','Office Supplies','Software & Services','Professional Services','Marketing','Equipment','Rent','Insurance','Salary','Sales','Consulting','Other'].map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Associate Client (Optional)</label>
                <select
                  className="w-full px-4 py-2 rounded-lg border border-slate-200"
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value, projectId: '' })}
                >
                  <option value="">None</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              {projectOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project (Optional)</label>
                  <select
                    className="w-full px-4 py-2 rounded-lg border border-slate-200"
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  >
                    <option value="">None</option>
                    {projectOptions.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              {taxCategoryOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tax Category (Nigerian PIT)</label>
                  <select
                    className="w-full px-4 py-2 rounded-lg border border-slate-200"
                    value={formData.taxCategory}
                    onChange={(e) => setFormData({ ...formData, taxCategory: e.target.value })}
                  >
                    <option value="">Auto-classify</option>
                    {taxCategoryOptions
                      .filter((o) => formData.type === 'income' ? o.isIncome : !o.isIncome)
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}{o.isReliefDeduction ? ' · Tax Relief' : !o.isIncome && !o.isAllowableDeduction ? ' · Disallowed' : ''}
                        </option>
                      ))}
                  </select>
                </div>
              )}
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
                disabled={isSubmitting}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Entry' : 'Create Entry'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Receipt toast */}
      {receiptToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl">
          {receiptToast}
        </div>
      )}

      {/* Receipt modal */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[90dvh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <h3 className="text-sm font-extrabold text-slate-900">
                {receiptModal.image ? 'Receipt' : 'Attach Receipt'}
              </h3>
              <button onClick={() => setReceiptModal(null)} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {receiptModal.image ? (
                <div className="space-y-3">
                  <img src={receiptModal.image} alt="Receipt" className="w-full rounded-2xl object-contain max-h-96 border border-slate-100" />
                  <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-colors">
                      <i className="fas fa-camera text-xs" />
                      Replace
                      <input type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} disabled={receiptUploading} />
                    </label>
                    <button
                      onClick={handleRemoveReceipt}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-500 hover:bg-red-100 transition-colors"
                    >
                      <i className="fas fa-trash text-xs" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-4 py-14 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <i className="fas fa-camera text-2xl text-slate-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-700">Tap to attach receipt</p>
                    <p className="text-xs text-slate-400 mt-1">Photo or image file</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} disabled={receiptUploading} />
                  {receiptUploading && <p className="text-xs text-indigo-500 font-semibold animate-pulse">Uploading…</p>}
                </label>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;