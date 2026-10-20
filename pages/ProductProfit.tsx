import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { useNotification } from '../context/NotificationContext';
import type { Product } from './Products';

type Method = 'proportional' | 'cost_first';
type Source = 'all' | 'invoices' | 'receipts';
type Period = 'month' | '30d' | 'quarter' | 'year' | 'all' | 'custom';

interface ProductRow {
  productId: string;
  name: string;
  category: string | null;
  unit: string | null;
  price: number | null;
  currentCostPrice: number | null;
  isActive: boolean;
  unitsSold: number;
  salesCount: number;
  revenue: number;
  costedRevenue: number;
  cost: number;
  profit: number;
  margin: number | null;
  collectedRevenue: number;
  collectedProfit: number;
  outstandingRevenue: number;
  outstandingProfit: number;
  missingCostUnits: number;
  missingCostRevenue: number;
  lastSoldAt: string | null;
}

interface Summary {
  revenue: number;
  costedRevenue: number;
  cost: number;
  profit: number;
  margin: number | null;
  collectedRevenue: number;
  collectedProfit: number;
  outstandingRevenue: number;
  outstandingProfit: number;
  unitsSold: number;
  productsSold: number;
  missingCost: { products: number; revenue: number };
  unlinked: { lines: number; revenue: number };
  invoiceCount: number;
  receiptCount: number;
}

interface UnlinkedGroup {
  description: string;
  lines: number;
  units: number;
  revenue: number;
  lastDate: string;
  invoices: number;
  receipts: number;
  suggestedProductId: string | null;
  suggestedProductName: string | null;
}

interface Sale {
  source: 'invoice' | 'receipt';
  id: string;
  number: string;
  date: string;
  customer: string;
  status: string;
  paidPercent: number;
  quantity: number;
  revenue: number;
  unitCost: number | null;
  cost: number;
  profit: number | null;
  collectedProfit: number | null;
}

interface ProfitReport {
  method: Method;
  summary: Summary;
  products: ProductRow[];
  unlinked: UnlinkedGroup[];
  sales?: Sale[];
}

const PERIODS: { id: Period; label: string }[] = [
  { id: 'month', label: 'This month' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'quarter', label: 'Last 3 months' },
  { id: 'year', label: 'This year' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
];

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const periodRange = (period: Period): { from: string; to: string } => {
  const now = new Date();
  const today = ymd(now);
  switch (period) {
    case 'month':
      return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    case '30d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: ymd(d), to: today };
    }
    case 'quarter': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return { from: ymd(d), to: today };
    }
    case 'year':
      return { from: `${now.getFullYear()}-01-01`, to: today };
    default:
      return { from: '', to: '' };
  }
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const pct = (n: number | null) => (n === null ? '—' : `${n.toFixed(1)}%`);

const marginTone = (m: number | null) =>
  m === null ? 'text-slate-400' : m < 0 ? 'text-rose-600' : m < 15 ? 'text-amber-600' : 'text-emerald-600';

const ProductProfit: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const { showToast } = useNotification();

  const [period, setPeriod] = useState<Period>('month');
  const [custom, setCustom] = useState(() => periodRange('month'));
  const [source, setSource] = useState<Source>('all');
  const [method, setMethod] = useState<Method>('proportional');
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);

  const [costDraft, setCostDraft] = useState<Record<string, string>>({});
  const [savingCostId, setSavingCostId] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<Product[]>([]);
  const [linkChoice, setLinkChoice] = useState<Record<string, string>>({});
  const [linkingKey, setLinkingKey] = useState<string | null>(null);

  const range = period === 'custom' ? custom : periodRange(period);

  const baseQuery = useMemo(() => {
    const p = new URLSearchParams({ method });
    if (range.from) p.set('from', range.from);
    if (range.to) p.set('to', range.to);
    if (source !== 'all') p.set('source', source);
    return p;
  }, [method, range.from, range.to, source]);

  const fetchReport = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true);
      setError('');
      try {
        const data = await apiRequest<ProfitReport>(`/reporting/product-profit?${baseQuery}`);
        setReport(data);
      } catch (err: any) {
        setError(err?.message || 'Could not load the profit report');
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [baseQuery],
  );

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    apiRequest<Product[]>('/products')
      .then((p) => setCatalog(Array.isArray(p) ? p : []))
      .catch(() => setCatalog([]));
  }, []);

  // Drill-down: reload the open product's sales whenever the filters change.
  useEffect(() => {
    if (!expandedId) {
      setSales(null);
      return;
    }
    let cancelled = false;
    setSalesLoading(true);
    const p = new URLSearchParams(baseQuery);
    p.set('productId', expandedId);
    apiRequest<ProfitReport>(`/reporting/product-profit?${p}`)
      .then((data) => !cancelled && setSales(data.sales || []))
      .catch(() => !cancelled && setSales([]))
      .finally(() => !cancelled && setSalesLoading(false));
    return () => {
      cancelled = true;
    };
  }, [expandedId, baseQuery]);

  const saveCost = async (row: ProductRow) => {
    const raw = (costDraft[row.productId] ?? '').trim();
    const value = parseFloat(raw);
    if (raw === '' || isNaN(value) || value < 0) {
      showToast('Enter a valid cost price', 'error');
      return;
    }
    setSavingCostId(row.productId);
    try {
      await apiRequest(`/products/${row.productId}`, { method: 'PUT', body: { costPrice: value } });
      setCostDraft((d) => {
        const { [row.productId]: _, ...rest } = d;
        return rest;
      });
      showToast(`Cost price saved for ${row.name}`, 'success');
      await fetchReport({ silent: true });
    } catch (err: any) {
      showToast(err?.message || 'Could not save cost price', 'error');
    } finally {
      setSavingCostId(null);
    }
  };

  const linkGroup = async (group: UnlinkedGroup) => {
    const productId = linkChoice[group.description] ?? group.suggestedProductId ?? '';
    if (!productId) {
      showToast('Pick a product to link to', 'error');
      return;
    }
    setLinkingKey(group.description);
    try {
      const res = await apiRequest<{ invoicesUpdated: number; receiptsUpdated: number; productName: string }>(
        '/reporting/product-profit/link',
        { method: 'POST', body: { description: group.description, productId } },
      );
      const n = res.invoicesUpdated + res.receiptsUpdated;
      showToast(`Linked ${n} sale${n === 1 ? '' : 's'} to ${res.productName}`, 'success');
      await fetchReport({ silent: true });
    } catch (err: any) {
      showToast(err?.message || 'Could not link these sales', 'error');
    } finally {
      setLinkingKey(null);
    }
  };

  const exportCsv = () => {
    if (!report) return;
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const n = (v: number | null) => (v === null ? '' : v.toFixed(2));
    const header = [
      'Product', 'Category', 'Units sold', 'Sales', 'Revenue', 'Cost', 'Profit', 'Margin %',
      'Collected revenue', 'Collected profit', 'Outstanding revenue', 'Outstanding profit', 'Cost price set',
    ];
    const rows = report.products.map((r) =>
      [
        r.name, r.category || '', r.unitsSold, r.salesCount, n(r.revenue), n(r.cost), n(r.profit), n(r.margin),
        n(r.collectedRevenue), n(r.collectedProfit), n(r.outstandingRevenue), n(r.outstandingProfit),
        r.missingCostUnits > 0 ? 'No' : 'Yes',
      ].map(esc).join(','),
    );
    const s = report.summary;
    const meta = [
      `Product profit report`,
      `Period,${range.from || 'All time'} to ${range.to || 'today'}`,
      `Method,${method === 'cost_first' ? 'Cost first' : 'Proportional'}`,
      `Booked profit,${n(s.profit)}`,
      `Collected profit,${n(s.collectedProfit)}`,
      `Outstanding profit,${n(s.outstandingProfit)}`,
      '',
    ];
    const csv = '﻿' + [...meta, header.map(esc).join(','), ...rows].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `product-profit-${range.from || 'all'}-${range.to || ymd(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const s = report?.summary;
  const rows = useMemo(() => {
    const list = report?.products || [];
    const q = search.trim().toLowerCase();
    return q ? list.filter((r) => r.name.toLowerCase().includes(q) || (r.category || '').toLowerCase().includes(q)) : list;
  }, [report, search]);
  const maxProfit = useMemo(() => Math.max(1, ...rows.map((r) => Math.abs(r.profit))), [rows]);
  const collectedShare = s && s.profit > 0 ? Math.min(100, Math.max(0, (s.collectedProfit / s.profit) * 100)) : 0;


  const segBtn = (active: boolean) =>
    `px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap ${active ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`;

  const costEditor = (row: ProductRow, compact = false) => (
    <div className={`flex items-center gap-1.5 ${compact ? '' : 'justify-end'}`} onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        inputMode="decimal"
        placeholder="Cost / unit"
        value={costDraft[row.productId] ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '' || /^\d*\.?\d*$/.test(v)) setCostDraft((d) => ({ ...d, [row.productId]: v }));
        }}
        onKeyDown={(e) => e.key === 'Enter' && saveCost(row)}
        className="w-24 px-2 py-1.5 border border-amber-200 bg-amber-50/50 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
      />
      <button
        onClick={() => saveCost(row)}
        disabled={savingCostId === row.productId}
        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black rounded-lg disabled:opacity-60"
      >
        {savingCostId === row.productId ? <i className="fas fa-spinner fa-spin" /> : 'Save'}
      </button>
    </div>
  );

  const salesPanel = (row: ProductRow) => (
    <div className="bg-slate-50/70 border-t border-slate-100 px-4 sm:px-6 py-4">
      {salesLoading || !sales ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
          <div className="w-4 h-4 border-2 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" /> Loading sales…
        </div>
      ) : sales.length === 0 ? (
        <p className="text-xs text-slate-400">No sales in this period.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            {sales.length} sale{sales.length === 1 ? '' : 's'} of {row.name}
            {row.currentCostPrice !== null && <> · current cost {formatCurrency(row.currentCostPrice)}</>}
          </p>
          <div className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-100 overflow-hidden">
            {sales.map((sale, i) => (
              <div key={`${sale.id}-${i}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5 text-xs">
                <Link
                  to={sale.source === 'invoice' ? '/invoices' : '/receipts'}
                  className="font-bold text-indigo-600 hover:underline w-40 truncate"
                  title={sale.number}
                >
                  <i className={`fas ${sale.source === 'invoice' ? 'fa-file-invoice' : 'fa-receipt'} mr-1.5 text-[10px] text-slate-400`} />
                  {sale.number}
                </Link>
                <span className="text-slate-400 w-24">{fmtDate(sale.date)}</span>
                <span className="text-slate-600 flex-1 min-w-[6rem] truncate">{sale.customer || '—'}</span>
                <span className="text-slate-500 w-14 text-right">×{sale.quantity}</span>
                <span className="font-semibold text-slate-800 w-24 text-right">{formatCurrency(sale.revenue)}</span>
                <span className={`font-bold w-24 text-right ${sale.profit === null ? 'text-slate-300' : sale.profit < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {sale.profit === null ? 'no cost' : formatCurrency(sale.profit)}
                </span>
                <span
                  className={`w-20 text-right font-bold ${
                    sale.paidPercent >= 100 ? 'text-emerald-600' : sale.paidPercent > 0 ? 'text-amber-600' : 'text-slate-400'
                  }`}
                >
                  {sale.paidPercent >= 100 ? 'Paid' : sale.paidPercent > 0 ? `${sale.paidPercent.toFixed(0)}% paid` : 'Unpaid'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Product Profit</h2>
          <p className="text-sm text-slate-500 font-medium">
            What each catalog item actually earns you — from your invoices and receipts.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowHelp((v) => !v)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-colors ${
              showHelp ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <i className="fas fa-circle-question text-[11px]" /> How it works
          </button>
          <button
            onClick={exportCsv}
            disabled={!report || report.products.length === 0}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
          >
            <i className="fas fa-download text-[11px]" /> CSV
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-5 text-sm text-slate-600 space-y-2">
          <p>
            <span className="font-bold text-slate-800">Profit</span> = selling price − cost price, for every invoice line
            and receipt item linked to a catalog product. Each sale keeps the cost price it had on the day it was made, so
            changing a cost later doesn't rewrite past profit.
          </p>
          <p>
            <span className="font-bold text-slate-800">Not fully paid?</span> Booked profit assumes every invoice gets paid.
            Collected profit is the part already in your account; outstanding is still owed.
            With <span className="font-semibold">Proportional</span>, a 40%-paid invoice has collected 40% of its profit.
            With <span className="font-semibold">Cost first</span>, payments cover your cost before any profit counts — the
            cautious view if customers often pay late or not at all.
          </p>
          <p>
            Tax is left out of profit. Void invoices are excluded, and receipts issued for an invoice payment aren't counted
            twice. Cost prices are private and never shown to customers.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 flex flex-wrap items-center gap-2">
        <select
          value={period}
          onChange={(e) => {
            const p = e.target.value as Period;
            if (p === 'custom') setCustom(period === 'all' ? periodRange('month') : periodRange(period));
            setPeriod(p);
          }}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          {PERIODS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        {period === 'custom' && (
          <>
            <input
              type="date"
              value={custom.from}
              max={custom.to || undefined}
              onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            />
            <span className="text-slate-300 text-xs">to</span>
            <input
              type="date"
              value={custom.to}
              min={custom.from || undefined}
              onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            />
          </>
        )}
        <div className="flex rounded-xl border border-slate-200 overflow-hidden">
          {(['all', 'invoices', 'receipts'] as Source[]).map((src) => (
            <button key={src} onClick={() => setSource(src)} className={segBtn(source === src)}>
              {src === 'all' ? 'All sales' : src === 'invoices' ? 'Invoices' : 'Receipts'}
            </button>
          ))}
        </div>
        <div className="flex rounded-xl border border-slate-200 overflow-hidden sm:ml-auto" title="How part-payments count towards profit">
          <button onClick={() => setMethod('proportional')} className={segBtn(method === 'proportional')}>
            Proportional
          </button>
          <button onClick={() => setMethod('cost_first')} className={segBtn(method === 'cost_first')}>
            Cost first
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-sm font-bold flex items-center justify-between gap-3">
          <span>
            <i className="fas fa-circle-exclamation mr-2" />
            {error}
          </span>
          <button onClick={() => fetchReport()} className="text-xs underline">
            Retry
          </button>
        </div>
      )}

      {loading && !report ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Working out your profit…</p>
        </div>
      ) : report && s ? (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
          {/* KPI tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Booked profit</p>
              <p className={`text-xl sm:text-2xl font-black mt-1 break-all ${s.profit < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {formatCurrency(s.profit)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                <span className={`font-bold ${marginTone(s.margin)}`}>{pct(s.margin)}</span> margin · if all paid
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-emerald-100 p-4">
              <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest">Collected profit</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 break-all">{formatCurrency(s.collectedProfit)}</p>
              <p className="text-[11px] text-slate-400 mt-1">already in your account</p>
            </div>
            <div className="bg-white rounded-2xl border border-amber-100 p-4">
              <p className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest">Outstanding profit</p>
              <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1 break-all">{formatCurrency(s.outstandingProfit)}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                in {formatCurrency(s.outstandingRevenue)} still owed
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Product sales</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1 break-all">{formatCurrency(s.revenue)}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {s.unitsSold.toLocaleString()} units · cost {formatCurrency(s.cost)}
              </p>
            </div>
          </div>

          {/* Collected vs outstanding bar */}
          {s.profit > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="flex justify-between text-[11px] font-bold mb-2">
                <span className="text-emerald-600">{collectedShare.toFixed(0)}% of profit collected</span>
                <span className="text-amber-600">{(100 - collectedShare).toFixed(0)}% outstanding</span>
              </div>
              <div className="h-2.5 bg-amber-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${collectedShare}%` }} />
              </div>
            </div>
          )}

          {/* Data-quality nudges */}
          {(s.missingCost.products > 0 || s.unlinked.lines > 0) && (
            <div className="grid sm:grid-cols-2 gap-3">
              {s.missingCost.products > 0 && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <i className="fas fa-tag text-amber-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold text-amber-800">
                      {s.missingCost.products} product{s.missingCost.products === 1 ? ' has' : 's have'} no cost price
                    </p>
                    <p className="text-amber-700/80 text-xs mt-0.5">
                      {formatCurrency(s.missingCost.revenue)} of sales isn't in the profit figures yet. Add the cost in the
                      table below — past sales update instantly.
                    </p>
                  </div>
                </div>
              )}
              {s.unlinked.lines > 0 && (
                <a href="#unlinked" className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 hover:bg-slate-100 transition-colors">
                  <i className="fas fa-link-slash text-slate-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold text-slate-700">
                      {s.unlinked.lines} typed-in line{s.unlinked.lines === 1 ? '' : 's'} not linked to a product
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {formatCurrency(s.unlinked.revenue)} of sales. Link them below to include them →
                    </p>
                  </div>
                </a>
              )}
            </div>
          )}

          {/* Products */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-black text-slate-900">
                By product <span className="text-slate-400 font-semibold">· {s.productsSold}</span>
              </p>
              {report.products.length > 5 && (
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Find a product…"
                    className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              )}
            </div>

            {report.products.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-14 text-center">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-3">
                  <i className="fas fa-sack-dollar text-indigo-300 text-xl" />
                </div>
                <p className="text-sm font-bold text-slate-600">No catalog sales in this period</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Pick items from your catalog when you create an invoice or receipt and their profit shows up here.
                  {s.unlinked.lines > 0 && ' You can also link the typed-in lines below.'}
                </p>
                <Link to="/products" className="mt-4 text-xs font-bold text-indigo-600 hover:underline">
                  Go to catalog →
                </Link>
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-slate-400 text-center p-10">No products match "{search}"</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                        <th className="text-left px-6 py-3">Product</th>
                        <th className="text-right px-3 py-3">Units</th>
                        <th className="text-right px-3 py-3">Revenue</th>
                        <th className="text-right px-3 py-3">Cost</th>
                        <th className="text-right px-3 py-3">Profit</th>
                        <th className="text-right px-3 py-3">Margin</th>
                        <th className="text-right px-3 py-3 text-emerald-600">Collected</th>
                        <th className="text-right px-6 py-3 text-amber-600">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const open = expandedId === r.productId;
                        const noCost = r.costedRevenue === 0 && r.missingCostUnits > 0;
                        return (
                          <React.Fragment key={r.productId}>
                            <tr
                              onClick={() => setExpandedId(open ? null : r.productId)}
                              className={`border-b border-slate-50 cursor-pointer transition-colors ${open ? 'bg-indigo-50/40' : 'hover:bg-slate-50/70'}`}
                            >
                              <td className="px-6 py-3.5">
                                <div className="flex items-center gap-2">
                                  <i className={`fas fa-chevron-${open ? 'down' : 'right'} text-[9px] text-slate-300 w-3`} />
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-800 truncate max-w-[16rem]">
                                      {r.name}
                                      {!r.isActive && <span className="ml-2 text-[9px] font-black uppercase text-slate-400">removed</span>}
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                      {r.salesCount} sale{r.salesCount === 1 ? '' : 's'}
                                      {r.category ? ` · ${r.category}` : ''}
                                      {r.missingCostUnits > 0 && !noCost && (
                                        <span className="text-amber-600 font-semibold"> · {r.missingCostUnits} unit(s) without cost</span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="text-right px-3 py-3.5 text-slate-600">{r.unitsSold.toLocaleString()}</td>
                              <td className="text-right px-3 py-3.5 font-semibold text-slate-800">{formatCurrency(r.revenue)}</td>
                              {noCost ? (
                                <td colSpan={5} className="px-6 py-3.5">
                                  <div className="flex items-center justify-end gap-3">
                                    <span className="text-[11px] font-semibold text-amber-600">Add a cost price to see profit</span>
                                    {costEditor(r)}
                                  </div>
                                </td>
                              ) : (
                                <>
                                  <td className="text-right px-3 py-3.5 text-slate-500">{formatCurrency(r.cost)}</td>
                                  <td className="text-right px-3 py-3.5">
                                    <p className={`font-black ${r.profit < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{formatCurrency(r.profit)}</p>
                                    <div className="h-1 bg-slate-100 rounded-full mt-1 ml-auto w-20 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${r.profit < 0 ? 'bg-rose-400' : 'bg-indigo-400'}`}
                                        style={{ width: `${(Math.abs(r.profit) / maxProfit) * 100}%` }}
                                      />
                                    </div>
                                  </td>
                                  <td className={`text-right px-3 py-3.5 font-bold ${marginTone(r.margin)}`}>{pct(r.margin)}</td>
                                  <td className="text-right px-3 py-3.5 font-semibold text-emerald-600">{formatCurrency(r.collectedProfit)}</td>
                                  <td className="text-right px-6 py-3.5 font-semibold text-amber-600">
                                    {r.outstandingProfit === 0 ? <span className="text-slate-300">—</span> : formatCurrency(r.outstandingProfit)}
                                  </td>
                                </>
                              )}
                            </tr>
                            {open && (
                              <tr>
                                <td colSpan={8} className="p-0">
                                  {salesPanel(r)}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {rows.map((r) => {
                    const open = expandedId === r.productId;
                    const noCost = r.costedRevenue === 0 && r.missingCostUnits > 0;
                    return (
                      <div key={r.productId}>
                        <button
                          onClick={() => setExpandedId(open ? null : r.productId)}
                          className="w-full text-left px-4 py-3.5 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate">{r.name}</p>
                              <p className="text-[11px] text-slate-400">
                                {r.unitsSold.toLocaleString()} units · {formatCurrency(r.revenue)}
                              </p>
                            </div>
                            {!noCost && (
                              <div className="text-right shrink-0">
                                <p className={`font-black ${r.profit < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{formatCurrency(r.profit)}</p>
                                <p className={`text-[11px] font-bold ${marginTone(r.margin)}`}>{pct(r.margin)}</p>
                              </div>
                            )}
                          </div>
                          {noCost ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold text-amber-600">No cost price</span>
                              {costEditor(r, true)}
                            </div>
                          ) : (
                            <div className="flex justify-between text-[11px] font-semibold">
                              <span className="text-emerald-600">Collected {formatCurrency(r.collectedProfit)}</span>
                              <span className="text-amber-600">Owed {formatCurrency(r.outstandingProfit)}</span>
                            </div>
                          )}
                        </button>
                        {open && salesPanel(r)}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Unlinked lines */}
          {report.unlinked.length > 0 && (
            <div id="unlinked" className="bg-white rounded-2xl border border-slate-100 overflow-hidden scroll-mt-6">
              <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
                <p className="text-sm font-black text-slate-900">Typed-in sales, not linked to a product</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Link a line to a catalog product and every past sale with that exact wording is included in its profit.
                  Stock isn't changed.
                </p>
              </div>
              <div className="divide-y divide-slate-50">
                {report.unlinked.map((g) => {
                  const chosen = linkChoice[g.description] ?? g.suggestedProductId ?? '';
                  return (
                    <div key={g.description} className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate" title={g.description}>
                          {g.description || <span className="italic text-slate-400">No description</span>}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {g.lines} line{g.lines === 1 ? '' : 's'} · {formatCurrency(g.revenue)} · last {fmtDate(g.lastDate)}
                        </p>
                      </div>
                      {g.description && (
                        <div className="flex items-center gap-2">
                          <select
                            value={chosen}
                            onChange={(e) => setLinkChoice((c) => ({ ...c, [g.description]: e.target.value }))}
                            className={`px-3 py-2 rounded-xl border text-xs font-semibold bg-white w-full sm:w-52 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${
                              chosen && chosen === g.suggestedProductId && linkChoice[g.description] === undefined
                                ? 'border-indigo-200 text-indigo-700'
                                : 'border-slate-200 text-slate-700'
                            }`}
                          >
                            <option value="">Choose product…</option>
                            {catalog.map((p) => (
                              <option key={p._id} value={p._id}>
                                {p._id === g.suggestedProductId ? `${p.name} (suggested)` : p.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => linkGroup(g)}
                            disabled={!chosen || linkingKey === g.description}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl disabled:opacity-40 shrink-0"
                          >
                            {linkingKey === g.description ? <i className="fas fa-spinner fa-spin" /> : 'Link'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-400 text-center">
            Based on {s.invoiceCount} invoice{s.invoiceCount === 1 ? '' : 's'} and {s.receiptCount} receipt
            {s.receiptCount === 1 ? '' : 's'}
            {range.from ? ` from ${fmtDate(range.from)} to ${fmtDate(range.to)}` : ''}. Invoices are dated by when they were
            issued.
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default ProductProfit;
