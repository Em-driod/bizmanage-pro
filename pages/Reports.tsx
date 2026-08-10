import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

interface ReportSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  totalTransactions: number;
}

interface ReportItem {
  _id: string | null;
  clientName?: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  totalTransactions: number;
}

interface MonthlyRow {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

type Tab = 'summary' | 'pl' | 'trend' | 'breakdown';

const formatMonthLabel = (m: string) => {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const today = new Date().toISOString().split('T')[0];
const thirtyDaysAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; })();
const yearStart = `${new Date().getFullYear()}-01-01`;

const Reports: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [tab, setTab] = useState<Tab>('summary');

  // Summary / P&L / breakdown state
  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [groupBy, setGroupBy] = useState<'none' | 'category' | 'client'>('none');
  const [reportData, setReportData] = useState<ReportSummary | ReportItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Monthly trend state
  const [trendMonths, setTrendMonths] = useState(12);
  const [trendData, setTrendData] = useState<MonthlyRow[]>([]);
  const [isTrendLoading, setIsTrendLoading] = useState(false);

  const fetchSummary = async () => {
    if (!startDate || !endDate) { setError('Select both dates.'); return; }
    setIsLoading(true); setError(''); setReportData(null);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (groupBy !== 'none') params.append('groupBy', groupBy);
      const data = await apiRequest<ReportSummary | ReportItem[]>(`/reporting/financial-summary?${params}`);
      setReportData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrend = async () => {
    setIsTrendLoading(true);
    try {
      const data = await apiRequest<MonthlyRow[]>(`/reporting/monthly-trend?months=${trendMonths}`);
      setTrendData(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsTrendLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'trend') fetchTrend();
  }, [tab, trendMonths]);

  // Auto-fetch category breakdown when switching to breakdown tab
  useEffect(() => {
    if (tab === 'breakdown') {
      setGroupBy('category');
    }
  }, [tab]);

  const exportCsv = () => {
    if (!reportData) return;
    const fmt = (n: number) => n.toFixed(2);
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const isGrouped = groupBy !== 'none' && Array.isArray(reportData);
    let csv = '';

    // Header block
    csv += `Morniy Financial Report\n`;
    csv += `Period,${startDate} to ${endDate}\n`;
    csv += `Generated,${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}\n`;
    csv += `\n`;

    if (isGrouped) {
      const rows = reportData as ReportItem[];
      const label = groupBy === 'client' ? 'Client' : 'Category';
      // Summary totals first
      const totalInc = rows.reduce((s, r) => s + r.totalIncome, 0);
      const totalExp = rows.reduce((s, r) => s + r.totalExpenses, 0);
      const totalNet = rows.reduce((s, r) => s + r.netProfit, 0);
      const totalTxns = rows.reduce((s, r) => s + r.totalTransactions, 0);
      csv += `SUMMARY\n`;
      csv += `Total Income,${fmt(totalInc)}\n`;
      csv += `Total Expenses,${fmt(totalExp)}\n`;
      csv += `Net Profit,${fmt(totalNet)}\n`;
      csv += `Total Transactions,${totalTxns}\n`;
      csv += `\n`;
      // Detail rows
      csv += `BREAKDOWN BY ${label.toUpperCase()}\n`;
      csv += `${label},Income,Expenses,Net Profit,Transactions,Income %,Expense %\n`;
      rows.forEach(row => {
        const name = esc(row.clientName || row._id || 'Uncategorised');
        const incPct = totalInc > 0 ? ((row.totalIncome / totalInc) * 100).toFixed(1) + '%' : '0%';
        const expPct = totalExp > 0 ? ((row.totalExpenses / totalExp) * 100).toFixed(1) + '%' : '0%';
        csv += `${name},${fmt(row.totalIncome)},${fmt(row.totalExpenses)},${fmt(row.netProfit)},${row.totalTransactions},${incPct},${expPct}\n`;
      });
    } else {
      const s = (Array.isArray(reportData) ? reportData[0] : reportData) as ReportSummary;
      const margin = s.totalIncome > 0 ? ((s.netProfit / s.totalIncome) * 100).toFixed(1) : '0';
      csv += `OVERALL SUMMARY\n`;
      csv += `Metric,Value\n`;
      csv += `Total Income,${fmt(s.totalIncome)}\n`;
      csv += `Total Expenses,${fmt(s.totalExpenses)}\n`;
      csv += `Net Profit,${fmt(s.netProfit)}\n`;
      csv += `Profit Margin,${margin}%\n`;
      csv += `Total Transactions,${s.totalTransactions}\n`;
    }

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Morniy-report-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportTrendCsv = () => {
    let csv = 'Month,Income,Expenses,Net\n';
    trendData.forEach(r => { csv += `${r.month},${r.income},${r.expenses},${r.net}\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Morniy-trend-${trendMonths}mo.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // The backend always returns an array from /reports/summary, even in "Overall" mode
  // (a one-element array with no _id). Array.isArray() alone can't tell grouped from
  // ungrouped responses apart — groupBy is the actual source of truth for that.
  const summary = groupBy === 'none' && Array.isArray(reportData)
    ? ((reportData[0] as ReportSummary | undefined) ?? null)
    : null;
  const grouped = groupBy !== 'none' && Array.isArray(reportData) ? (reportData as ReportItem[]) : null;

  const maxTrendVal = trendData.length > 0 ? Math.max(...trendData.map(r => Math.max(r.income, r.expenses))) : 1;

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'summary', label: 'Summary', icon: 'fa-chart-pie' },
    { id: 'pl', label: 'P&L Statement', icon: 'fa-file-invoice-dollar' },
    { id: 'trend', label: 'Monthly Trend', icon: 'fa-chart-bar' },
    { id: 'breakdown', label: 'By Category', icon: 'fa-tags' },
  ];

  return (
    <div className="min-h-screen space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Reports</h2>
          <p className="text-sm sm:text-base text-slate-500 font-medium">Financial summaries, P&L, and trends.</p>
        </div>
        <div className="flex gap-2">
          {(tab === 'summary' || tab === 'pl' || tab === 'breakdown') && reportData && (
            <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all">
              <i className="fas fa-download text-xs"></i> Export CSV
            </button>
          )}
          {tab === 'trend' && trendData.length > 0 && (
            <button onClick={exportTrendCsv} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all">
              <i className="fas fa-download text-xs"></i> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-100 p-1 rounded-2xl inline-flex gap-1 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <i className={`fas ${t.icon} text-xs`}></i> {t.label}
          </button>
        ))}
      </div>

      {/* ── Summary Tab ── */}
      {tab === 'summary' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 sm:p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Group By</label>
                <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="none">Overall</option>
                  <option value="category">By Category</option>
                  <option value="client">By Client</option>
                </select>
              </div>
              <button onClick={fetchSummary} disabled={isLoading} className="col-span-2 md:col-span-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl font-black text-sm disabled:opacity-60 transition-all">
                {isLoading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>

          {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-sm font-bold"><i className="fas fa-circle-exclamation mr-2" />{error}</div>}

          {summary && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Income', val: summary.totalIncome, color: 'emerald', icon: 'fa-arrow-trend-up', bg: 'from-emerald-500 to-teal-500' },
                { label: 'Total Expenses', val: summary.totalExpenses, color: 'rose', icon: 'fa-arrow-trend-down', bg: 'from-rose-500 to-pink-500' },
                { label: 'Net Profit', val: summary.netProfit, color: summary.netProfit >= 0 ? 'indigo' : 'rose', icon: 'fa-vault', bg: summary.netProfit >= 0 ? 'from-indigo-500 to-violet-500' : 'from-rose-500 to-pink-500' },
                { label: 'Transactions', val: summary.totalTransactions, color: 'slate', icon: 'fa-layer-group', bg: 'from-slate-600 to-slate-700', raw: true },
              ].map((kpi, i) => (
                <div key={i} className={`relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-br ${kpi.bg}`}>
                  <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-white/10 pointer-events-none" />
                  <i className={`fas ${kpi.icon} text-white/60 text-xs mb-2 block`}></i>
                  <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">{kpi.label}</p>
                  <p className="text-lg sm:text-xl font-black text-white leading-tight break-all">{kpi.raw ? kpi.val : formatCurrency(kpi.val as number)}</p>
                </div>
              ))}
            </div>
          )}

          {grouped && (
            <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden">
              <div className="px-5 sm:px-8 py-5 border-b border-slate-50">
                <h3 className="text-base font-black text-slate-900">Breakdown — {groupBy === 'category' ? 'By Category' : 'By Client'}</h3>
              </div>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-slate-50">
                {grouped.map(item => (
                  <div key={item._id} className="px-5 py-4">
                    <p className="text-sm font-black text-slate-900 mb-3">{item.clientName || item._id || 'Uncategorised'}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-emerald-50 rounded-xl px-3 py-2">
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">Income</p>
                        <p className="text-sm font-black text-emerald-700">{formatCurrency(item.totalIncome)}</p>
                      </div>
                      <div className="bg-rose-50 rounded-xl px-3 py-2">
                        <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-0.5">Expenses</p>
                        <p className="text-sm font-black text-rose-700">{formatCurrency(item.totalExpenses)}</p>
                      </div>
                      <div className={`rounded-xl px-3 py-2 ${item.netProfit >= 0 ? 'bg-indigo-50' : 'bg-rose-50'}`}>
                        <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${item.netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>Net</p>
                        <p className={`text-sm font-black ${item.netProfit >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>{formatCurrency(item.netProfit)}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl px-3 py-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Txns</p>
                        <p className="text-sm font-black text-slate-700">{item.totalTransactions}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-extrabold uppercase tracking-[2px]">
                      <th className="px-8 py-4">{groupBy === 'category' ? 'Category' : 'Client'}</th>
                      <th className="px-8 py-4">Income</th>
                      <th className="px-8 py-4">Expenses</th>
                      <th className="px-8 py-4">Net</th>
                      <th className="px-8 py-4">Txns</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {grouped.map(item => (
                      <tr key={item._id} className="hover:bg-slate-50/50">
                        <td className="px-8 py-5 font-bold text-slate-900">{item.clientName || item._id || 'Uncategorised'}</td>
                        <td className="px-8 py-5 font-black text-emerald-600">{formatCurrency(item.totalIncome)}</td>
                        <td className="px-8 py-5 font-black text-rose-600">{formatCurrency(item.totalExpenses)}</td>
                        <td className={`px-8 py-5 font-black ${item.netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>{formatCurrency(item.netProfit)}</td>
                        <td className="px-8 py-5 text-slate-400 font-bold">{item.totalTransactions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── P&L Statement Tab ── */}
      {tab === 'pl' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">From</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">To</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <button
                onClick={() => { setGroupBy('category'); fetchSummary(); }}
                disabled={isLoading}
                className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl font-black text-sm disabled:opacity-60 transition-all"
              >
                {isLoading ? 'Loading...' : 'Generate P&L'}
              </button>
            </div>
            <div className="flex gap-2 mt-4 flex-wrap">
              {[
                { label: 'This Month', start: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`, end: today },
                { label: 'This Year', start: yearStart, end: today },
                { label: 'Last 30 days', start: thirtyDaysAgo, end: today },
              ].map(p => (
                <button key={p.label} onClick={() => { setStartDate(p.start); setEndDate(p.end); }}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl border bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-sm font-bold"><i className="fas fa-circle-exclamation mr-2" />{error}</div>}

          {grouped && (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              {/* P&L Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-violet-700 px-8 py-6 text-white">
                <p className="text-[10px] font-extrabold uppercase tracking-[3px] text-indigo-200 mb-1">Profit & Loss Statement</p>
                <p className="text-lg font-black">{new Date(startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} — {new Date(endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                {/* Revenue section */}
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 mb-3">Revenue</p>
                  <div className="space-y-2">
                    {grouped.filter(r => r.totalIncome > 0).map(r => (
                      <div key={r._id} className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-sm text-slate-700 font-medium">{r._id || 'General Income'}</span>
                        <span className="text-sm font-black text-emerald-600">{formatCurrency(r.totalIncome)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-3 bg-emerald-50 rounded-xl px-4 mt-2">
                      <span className="text-sm font-extrabold text-emerald-800 uppercase tracking-wider">Total Revenue</span>
                      <span className="text-base font-black text-emerald-700">{formatCurrency(grouped.reduce((s, r) => s + r.totalIncome, 0))}</span>
                    </div>
                  </div>
                </div>

                {/* Expenses section */}
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600 mb-3">Expenses</p>
                  <div className="space-y-2">
                    {grouped.filter(r => r.totalExpenses > 0).sort((a, b) => b.totalExpenses - a.totalExpenses).map(r => (
                      <div key={r._id} className="flex justify-between items-center py-2 border-b border-slate-50">
                        <span className="text-sm text-slate-700 font-medium">{r._id || 'General Expenses'}</span>
                        <span className="text-sm font-black text-rose-600">{formatCurrency(r.totalExpenses)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-3 bg-rose-50 rounded-xl px-4 mt-2">
                      <span className="text-sm font-extrabold text-rose-800 uppercase tracking-wider">Total Expenses</span>
                      <span className="text-base font-black text-rose-700">{formatCurrency(grouped.reduce((s, r) => s + r.totalExpenses, 0))}</span>
                    </div>
                  </div>
                </div>

                {/* Net */}
                {(() => {
                  const net = grouped.reduce((s, r) => s + r.netProfit, 0);
                  return (
                    <div className={`flex justify-between items-center p-5 rounded-2xl border-2 ${net >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-rose-50 border-rose-200'}`}>
                      <div>
                        <p className={`text-[10px] font-extrabold uppercase tracking-widest ${net >= 0 ? 'text-indigo-500' : 'text-rose-500'}`}>Net Profit / (Loss)</p>
                        <p className="text-xs text-slate-400 mt-0.5">Revenue minus expenses</p>
                      </div>
                      <span className={`text-2xl font-black ${net >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>{formatCurrency(net)}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Monthly Trend Tab ── */}
      {tab === 'trend' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 flex items-center gap-4">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Show last</label>
            <select value={trendMonths} onChange={e => setTrendMonths(Number(e.target.value))} className="h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
              {[3, 6, 12, 24].map(n => <option key={n} value={n}>{n} months</option>)}
            </select>
          </div>

          {isTrendLoading ? (
            <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div></div>
          ) : trendData.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-slate-100 p-16 text-center text-slate-400 text-sm">No transaction data found for this period.</div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 sm:p-8">
              <div className="flex items-center gap-4 mb-6 flex-wrap">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block"></span><span className="text-xs font-bold text-slate-500">Income</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-400 inline-block"></span><span className="text-xs font-bold text-slate-500">Expenses</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-indigo-400 inline-block"></span><span className="text-xs font-bold text-slate-500">Net</span></div>
              </div>

              {/* Bar chart */}
              <div className="overflow-x-auto">
                <div className="flex items-end gap-2 sm:gap-3 min-w-max pb-2" style={{ minHeight: '200px' }}>
                  {trendData.map(row => {
                    const incH = maxTrendVal > 0 ? (row.income / maxTrendVal) * 160 : 0;
                    const expH = maxTrendVal > 0 ? (row.expenses / maxTrendVal) * 160 : 0;
                    const netH = Math.abs(maxTrendVal > 0 ? (row.net / maxTrendVal) * 160 : 0);
                    return (
                      <div key={row.month} className="flex flex-col items-center gap-1 group">
                        <div className="flex items-end gap-0.5" style={{ height: '160px' }}>
                          <div className="w-5 sm:w-6 bg-emerald-400 rounded-t-sm transition-all" style={{ height: `${Math.max(incH, 2)}px` }} title={`Income: ${formatCurrency(row.income)}`}></div>
                          <div className="w-5 sm:w-6 bg-rose-400 rounded-t-sm transition-all" style={{ height: `${Math.max(expH, 2)}px` }} title={`Expenses: ${formatCurrency(row.expenses)}`}></div>
                          <div className={`w-5 sm:w-6 ${row.net >= 0 ? 'bg-indigo-400' : 'bg-slate-300'} rounded-t-sm transition-all`} style={{ height: `${Math.max(netH, 2)}px` }} title={`Net: ${formatCurrency(row.net)}`}></div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 rotate-0">{formatMonthLabel(row.month)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Table */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest border-b border-slate-100">
                      <th className="pb-3 pr-8">Month</th>
                      <th className="pb-3 pr-8 text-emerald-600">Income</th>
                      <th className="pb-3 pr-8 text-rose-600">Expenses</th>
                      <th className="pb-3">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[...trendData].reverse().map(row => (
                      <tr key={row.month} className="hover:bg-slate-50/50">
                        <td className="py-3 pr-8 font-bold text-slate-700">{formatMonthLabel(row.month)}</td>
                        <td className="py-3 pr-8 font-black text-emerald-600">{formatCurrency(row.income)}</td>
                        <td className="py-3 pr-8 font-black text-rose-600">{formatCurrency(row.expenses)}</td>
                        <td className={`py-3 font-black ${row.net >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>{formatCurrency(row.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Category Breakdown Tab ── */}
      {tab === 'breakdown' && (
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">From</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">To</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <button onClick={() => { setGroupBy('category'); fetchSummary(); }} disabled={isLoading} className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl font-black text-sm disabled:opacity-60 transition-all">
                {isLoading ? 'Loading...' : 'Analyse'}
              </button>
            </div>
          </div>

          {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-sm font-bold"><i className="fas fa-circle-exclamation mr-2" />{error}</div>}

          {grouped && (() => {
            const totalExp = grouped.reduce((s, r) => s + r.totalExpenses, 0);
            const totalInc = grouped.reduce((s, r) => s + r.totalIncome, 0);
            const expItems = grouped.filter(r => r.totalExpenses > 0).sort((a, b) => b.totalExpenses - a.totalExpenses);
            const incItems = grouped.filter(r => r.totalIncome > 0).sort((a, b) => b.totalIncome - a.totalIncome);
            return (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Expense breakdown */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-black text-slate-900">Expenses by Category</h3>
                    <span className="text-sm font-black text-rose-600">{formatCurrency(totalExp)}</span>
                  </div>
                  <div className="space-y-3">
                    {expItems.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">No expense data</p> : expItems.map(r => {
                      const p = totalExp > 0 ? (r.totalExpenses / totalExp) * 100 : 0;
                      return (
                        <div key={r._id}>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-700 truncate max-w-[180px]">{r._id || 'Uncategorised'}</span>
                            <span className="text-slate-500 shrink-0 ml-2">{formatCurrency(r.totalExpenses)} · {p.toFixed(0)}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-400 rounded-full" style={{ width: `${p}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Income breakdown */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-black text-slate-900">Income by Category</h3>
                    <span className="text-sm font-black text-emerald-600">{formatCurrency(totalInc)}</span>
                  </div>
                  <div className="space-y-3">
                    {incItems.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">No income data</p> : incItems.map(r => {
                      const p = totalInc > 0 ? (r.totalIncome / totalInc) * 100 : 0;
                      return (
                        <div key={r._id}>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-700 truncate max-w-[180px]">{r._id || 'Uncategorised'}</span>
                            <span className="text-slate-500 shrink-0 ml-2">{formatCurrency(r.totalIncome)} · {p.toFixed(0)}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${p}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default Reports;
