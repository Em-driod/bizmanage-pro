import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

interface Budget {
  _id: string;
  category: string;
  monthlyLimit: number;
  spent: number;
  period: string;
}

interface BudgetsResponse {
  budgets: Budget[];
  period: string;
  prevPeriod: string;
  hasPrev: boolean;
}

const COMMON_CATEGORIES = [
  'Food & Dining', 'Transportation', 'Utilities', 'Office Supplies',
  'Software & Services', 'Professional Services', 'Marketing', 'Equipment',
  'Rent', 'Insurance', 'Salary', 'Other',
];

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
});

const formatMonth = (m: string) => {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const pct = (spent: number, limit: number) => limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
const barColor = (p: number) => p >= 100 ? 'bg-rose-500' : p >= 80 ? 'bg-amber-400' : 'bg-emerald-500';
const statusLabel = (p: number) =>
  p >= 100 ? { text: 'Over budget', cls: 'text-rose-600 bg-rose-50' }
  : p >= 80 ? { text: 'Near limit', cls: 'text-amber-700 bg-amber-50' }
  : { text: 'On track', cls: 'text-emerald-700 bg-emerald-50' };

const Budgets: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [prevPeriodVal, setPrevPeriodVal] = useState('');
  const [hasPrev, setHasPrev] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopying, setIsCopying] = useState(false);
  const [period, setPeriod] = useState(MONTHS[0]!);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [form, setForm] = useState({ category: COMMON_CATEGORIES[0]!, customCategory: '', monthlyLimit: '' });
  const [useCustom, setUseCustom] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchBudgets = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<BudgetsResponse>(`/budgets?period=${period}`);
      setBudgets(data.budgets);
      setPrevPeriodVal(data.prevPeriod);
      setHasPrev(data.hasPrev);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchBudgets(); }, [period]);

  const openCreate = () => {
    setEditingBudget(null);
    setForm({ category: COMMON_CATEGORIES[0]!, customCategory: '', monthlyLimit: '' });
    setUseCustom(false);
    setError('');
    setShowModal(true);
  };

  const openEdit = (b: Budget) => {
    setEditingBudget(b);
    const isCommon = COMMON_CATEGORIES.includes(b.category);
    setUseCustom(!isCommon);
    setForm({ category: isCommon ? b.category : COMMON_CATEGORIES[0]!, customCategory: !isCommon ? b.category : '', monthlyLimit: String(b.monthlyLimit) });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const category = useCustom ? form.customCategory.trim() : form.category;
    const monthlyLimit = parseFloat(form.monthlyLimit);
    if (!category || isNaN(monthlyLimit) || monthlyLimit < 0) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      if (editingBudget) {
        await apiRequest(`/budgets/${editingBudget._id}`, { method: 'PUT', body: { category, monthlyLimit } });
        showToast('Budget updated');
      } else {
        await apiRequest('/budgets', { method: 'POST', body: { category, monthlyLimit, period } });
        showToast('Budget created');
      }
      setShowModal(false);
      fetchBudgets();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (b: Budget) => {
    if (!window.confirm(`Delete budget for "${b.category}"?`)) return;
    try {
      await apiRequest(`/budgets/${b._id}`, { method: 'DELETE' });
      showToast('Budget deleted');
      fetchBudgets();
    } catch (err: any) {
      showToast('Failed to delete: ' + err.message);
    }
  };

  const handleCopy = async () => {
    if (!hasPrev) return;
    setIsCopying(true);
    try {
      await apiRequest('/budgets/copy', { method: 'POST', body: { fromPeriod: prevPeriodVal, toPeriod: period } });
      showToast(`Budgets copied from ${formatMonth(prevPeriodVal)}`);
      fetchBudgets();
    } catch (err: any) {
      showToast(err.message || 'Failed to copy budgets');
    } finally {
      setIsCopying(false);
    }
  };

  const totalLimit = budgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overCount = budgets.filter(b => b.spent > b.monthlyLimit).length;

  return (
    <div className="min-h-screen space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-8">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Budgets</h2>
          <p className="text-sm sm:text-base text-slate-500 font-medium">Monthly spending limits per category — automatically tracked from your expenses.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {MONTHS.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
          </select>
          <button
            onClick={openCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95 text-sm font-bold whitespace-nowrap"
          >
            <i className="fas fa-plus text-xs"></i> Add Budget
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {!isLoading && budgets.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Total Budget</p>
            <p className="text-xl font-black text-slate-900 truncate">{formatCurrency(totalLimit)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{formatMonth(period)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Spent</p>
            <p className="text-xl font-black text-slate-900 truncate">{formatCurrency(totalSpent)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{totalLimit > 0 ? `${((totalSpent / totalLimit) * 100).toFixed(0)}% of budget` : '—'}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Remaining</p>
            <p className={`text-xl font-black truncate ${totalSpent > totalLimit ? 'text-rose-600' : 'text-emerald-600'}`}>
              {formatCurrency(Math.max(totalLimit - totalSpent, 0))}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">{totalSpent > totalLimit ? 'over budget' : 'left to spend'}</p>
          </div>
          <div className={`rounded-2xl border p-4 shadow-sm ${overCount > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <p className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${overCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>Over Budget</p>
            <p className={`text-xl font-black ${overCount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{overCount}</p>
            <p className={`text-[11px] mt-0.5 ${overCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{overCount > 0 ? `${overCount} categor${overCount === 1 ? 'y' : 'ies'} exceeded` : 'All within limits'}</p>
          </div>
        </div>
      )}

      {/* Budget cards */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading budgets...</p>
        </div>
      ) : budgets.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-10 flex flex-col items-center gap-5 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <i className="fas fa-wallet text-indigo-400 text-2xl"></i>
          </div>
          <div>
            <p className="font-black text-slate-800 mb-1">No budgets for {formatMonth(period)}</p>
            <p className="text-sm text-slate-400 leading-relaxed">
              Set a monthly spending limit per category — Morniy automatically tracks burn from your <strong className="text-slate-600">expense transactions</strong>.
            </p>
          </div>

          {hasPrev && (
            <button
              onClick={handleCopy}
              disabled={isCopying}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 border border-indigo-200 rounded-xl text-sm font-bold text-indigo-700 transition-colors"
            >
              {isCopying
                ? <><div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /> Copying...</>
                : <><i className="fas fa-copy text-xs" /> Copy budgets from {formatMonth(prevPeriodVal)}</>
              }
            </button>
          )}

          <div className="w-full flex items-start gap-2.5 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-left">
            <i className="fas fa-circle-info text-slate-400 flex-shrink-0 mt-0.5 text-sm"></i>
            <p className="text-xs text-slate-500 leading-relaxed">
              Create a <strong className="text-slate-700">Marketing</strong> budget → record expense transactions with category <strong className="text-slate-700">"Marketing"</strong> → they automatically count against this budget.
            </p>
          </div>

          <button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors">
            <i className="fas fa-plus mr-1.5 text-xs"></i> Create budget for {formatMonth(period)}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {budgets.map(b => {
            const p = pct(b.spent, b.monthlyLimit);
            const status = statusLabel(p);
            const remaining = b.monthlyLimit - b.spent;
            return (
              <div key={b._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all group flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-slate-900">{b.category}</p>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${status.cls}`}>{status.text}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => openEdit(b)} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors">
                      <i className="fas fa-pen-to-square text-xs"></i>
                    </button>
                    <button onClick={() => handleDelete(b)} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors">
                      <i className="fas fa-trash-can text-xs"></i>
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-500">{formatCurrency(b.spent)} spent</span>
                    <span className="text-slate-400">{formatCurrency(b.monthlyLimit)} limit</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${barColor(p)}`} style={{ width: `${p}%` }} />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] font-bold text-slate-400">{p.toFixed(0)}% used</span>
                    <span className={`text-[10px] font-bold ${remaining < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {remaining < 0 ? `${formatCurrency(Math.abs(remaining))} over` : `${formatCurrency(remaining)} left`}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <i className="fas fa-link text-[10px]"></i>
                    <span className="text-[10px] font-bold">Tracked from expenses</span>
                  </div>
                  <button
                    onClick={() => navigate(`/transactions?category=${encodeURIComponent(b.category)}`)}
                    className="flex items-center gap-1 text-[11px] font-black text-indigo-500 hover:text-indigo-700 transition-colors"
                  >
                    View transactions <i className="fas fa-arrow-right text-[9px]"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add budget to existing month banner */}
      {!isLoading && budgets.length > 0 && (
        <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4">
          <div>
            <p className="text-sm font-bold text-slate-700">Want to add more categories to {formatMonth(period)}?</p>
            <p className="text-xs text-slate-400 mt-0.5">Each budget is specific to this month.</p>
          </div>
          <button onClick={openCreate} className="flex-shrink-0 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
            <i className="fas fa-plus mr-1.5 text-xs"></i> Add
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900">{editingBudget ? 'Edit Budget' : 'New Budget'}</h3>
                {!editingBudget && <p className="text-xs text-slate-400 mt-0.5">For {formatMonth(period)}</p>}
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <p className="text-sm text-rose-600 font-medium bg-rose-50 rounded-xl px-4 py-3"><i className="fas fa-exclamation-circle mr-2" />{error}</p>}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                {!useCustom ? (
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {COMMON_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <input
                    type="text" required
                    value={form.customCategory}
                    onChange={e => setForm(f => ({ ...f, customCategory: e.target.value }))}
                    placeholder="e.g. Generator Fuel"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                )}
                <button type="button" onClick={() => setUseCustom(v => !v)} className="mt-1.5 text-xs text-indigo-600 font-bold hover:text-indigo-700">
                  {useCustom ? '← Pick from list' : '+ Custom category'}
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Monthly Limit</label>
                <input
                  type="number" required min="0" step="0.01"
                  value={form.monthlyLimit}
                  onChange={e => setForm(f => ({ ...f, monthlyLimit: e.target.value }))}
                  placeholder="0.00"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">Expense transactions with the same category are counted automatically.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-11 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors">
                  {isSaving ? 'Saving...' : editingBudget ? 'Update' : 'Create Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;
