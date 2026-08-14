import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest, getErrorMessage } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import IssueReceiptModal from '../components/IssueReceiptModal';
import ReceiptCard, { ReceiptData } from '../components/ReceiptCard';

const Receipts: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [viewing, setViewing] = useState<ReceiptData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReceipts = useCallback(async () => {
    try {
      const data = await apiRequest<ReceiptData[]>('/receipts');
      setReceipts(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this receipt? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await apiRequest(`/receipts/${id}`, { method: 'DELETE' });
      setReceipts(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = receipts.filter(r =>
    !search ||
    r.payerName.toLowerCase().includes(search.toLowerCase()) ||
    r.receiptNumber.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Receipts</h1>
          <p className="text-sm text-slate-400 mt-0.5">Every receipt you've issued — view, print, or share any of them</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
        >
          <i className="fas fa-plus text-xs" />
          New Receipt
        </button>
      </div>

      {/* Search */}
      {receipts.length > 0 && (
        <div className="relative max-w-md">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs" />
          <input
            type="text"
            placeholder="Search by payer or receipt number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
      )}

      {/* Empty state */}
      {receipts.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-receipt text-2xl text-emerald-400" />
          </div>
          <p className="text-base font-bold text-slate-700">No receipts yet</p>
          <p className="text-sm text-slate-400 mt-1">Issue your first receipt — pick items from your catalog or existing transactions</p>
          <button onClick={() => setShowNew(true)} className="mt-5 bg-emerald-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors">
            New Receipt
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
          <p className="text-sm text-slate-400">No receipts match your search</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          <div className="divide-y divide-slate-50">
            {filtered.map(r => (
              <div key={r._id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors group">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-receipt text-sm" />
                </div>
                <button onClick={() => setViewing(r)} className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold text-slate-900 truncate">{r.payerName}</p>
                  <p className="text-xs text-slate-400 font-mono">{r.receiptNumber} · {new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </button>
                <p className="text-sm font-black text-emerald-700 shrink-0">{formatCurrency(r.amount)}</p>
                <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setViewing(r)}
                    className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                    title="View / print / share"
                  >
                    <i className="fas fa-eye text-xs" />
                  </button>
                  <button
                    onClick={() => handleDelete(r._id)}
                    disabled={deletingId === r._id}
                    className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-300 hover:text-red-500 flex items-center justify-center transition-colors disabled:opacity-40"
                    title="Delete"
                  >
                    <i className="fas fa-trash text-xs" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showNew && (
        <IssueReceiptModal
          transactions={[]}
          client={null}
          onClose={() => setShowNew(false)}
          onCreated={(r: ReceiptData) => setReceipts(prev => [r, ...prev])}
        />
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-5 flex items-center justify-between flex-shrink-0 print:hidden">
              <h3 className="text-base font-black text-white">Receipt {viewing.receiptNumber}</h3>
              <button onClick={() => setViewing(null)} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <ReceiptCard receipt={viewing} businessName={user?.businessName} onClose={() => setViewing(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Receipts;
