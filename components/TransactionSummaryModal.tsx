import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Transaction } from '../types';
import { apiRequest, getErrorMessage } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';

interface Props {
  onClose: () => void;
}

type TypeFilter = 'all' | 'income' | 'expense';

const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};
const today = () => new Date().toISOString().split('T')[0];

const TransactionSummaryModal: React.FC<Props> = ({ onClose }) => {
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [type, setType] = useState<TypeFilter>('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Transaction[] | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ startDate, endDate, limit: '500' });
      if (type !== 'all') params.set('type', type);
      const res = await apiRequest<{ data: Transaction[] }>(`/transactions?${params}`);
      setResults(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = (results || []).filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = (results || []).filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpense;

  const formattedRange = `${new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} – ${new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <i className="fas fa-print text-white text-sm"></i>
            </div>
            <h3 className="text-base font-black text-white">Print Transaction Summary</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">From</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-400 outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">To</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-400 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Include</label>
            <div className="flex gap-2">
              {(['all', 'income', 'expense'] as TypeFilter[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-colors ${
                    type === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {t === 'all' ? 'Both' : t}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60"
          >
            {loading ? 'Generating…' : 'Generate Summary'}
          </button>

          {error && <p className="text-xs text-rose-500 font-semibold text-center">{error}</p>}

          {results && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-[9px] font-bold uppercase text-emerald-600">Income</p>
                  <p className="text-sm font-black text-emerald-700">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="bg-rose-50 rounded-xl p-3 text-center">
                  <p className="text-[9px] font-bold uppercase text-rose-600">Expense</p>
                  <p className="text-sm font-black text-rose-700">{formatCurrency(totalExpense)}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${net >= 0 ? 'bg-indigo-50' : 'bg-amber-50'}`}>
                  <p className={`text-[9px] font-bold uppercase ${net >= 0 ? 'text-indigo-600' : 'text-amber-600'}`}>Net</p>
                  <p className={`text-sm font-black ${net >= 0 ? 'text-indigo-700' : 'text-amber-700'}`}>{formatCurrency(net)}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center">{results.length} transaction{results.length !== 1 ? 's' : ''} · {formattedRange}</p>
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 border-2 border-slate-800 text-slate-800 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <i className="fas fa-print text-xs"></i> Print
              </button>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Printable summary, portaled to <body> — hidden on screen, shown only via @media print */}
      {results && createPortal(
        <div className="print-only p-12 bg-white text-slate-900 font-sans" id="tx-summary-print-area">
          <style dangerouslySetInnerHTML={{
            __html: `
              @media screen { .print-only { display: none !important; } }
              @media print {
                .print-only { display: block !important; }
                body * { visibility: hidden; }
                #tx-summary-print-area, #tx-summary-print-area * { visibility: visible; }
                #tx-summary-print-area { position: absolute; left: 0; top: 0; width: 100%; }
              }
            `
          }} />

          <div className="flex justify-between items-start mb-10 border-b-2 border-slate-100 pb-8">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-1">{user?.businessName || 'Morniy Business'}</h1>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Transaction Summary</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Period</p>
              <p className="text-base font-black text-slate-900">{formattedRange}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-10">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-1">Total Income</p>
              <p className="text-xl font-black text-emerald-700">{formatCurrency(totalIncome)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-1">Total Expense</p>
              <p className="text-xl font-black text-rose-700">{formatCurrency(totalExpense)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-1">Net</p>
              <p className="text-xl font-black text-slate-900">{formatCurrency(net)}</p>
            </div>
          </div>

          <table className="w-full mb-8">
            <thead className="border-b border-slate-200">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-3 text-left">Date</th>
                <th className="py-3 text-left">Description</th>
                <th className="py-3 text-left">Category</th>
                <th className="py-3 text-right">Type</th>
                <th className="py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {results.map(tx => (
                <tr key={tx._id} className="text-sm">
                  <td className="py-3 text-slate-500">{new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="py-3 font-bold text-slate-800">{tx.description || '—'}</td>
                  <td className="py-3 text-slate-500">{tx.category || '—'}</td>
                  <td className="py-3 text-right capitalize text-slate-500">{tx.type}</td>
                  <td className={`py-3 text-right font-black ${tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[3px] text-center">Generated via Morniy</p>
        </div>,
        document.body
      )}
    </>
  );
};

export default TransactionSummaryModal;
