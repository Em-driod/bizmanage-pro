import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../services/api';
import { API_BASE_URL, AUTH_TOKEN_KEY } from '../constants';
import { toPng } from 'html-to-image';
import { useAuth } from '../context/AuthContext';

interface CategoryRollup {
  taxCategory: string;
  label: string;
  amount: number;
  count: number;
  isIncome: boolean;
  isAllowable: boolean;
  isRelief: boolean;
}

interface PitTaxBreakdown {
  band: string;
  amountInBand: number;
  rate: number;
  tax: number;
}

interface PitSummary {
  taxYear: number;
  generatedAt: string;
  grossIncome: number;
  totalAllowableExpenses: number;
  totalDisallowedExpenses: number;
  totalReliefDeductions: number;
  capitalAllowance: number;
  totalIncome: number;
  incomeBeforeCra: number;
  consolidatedRelief: number;
  taxableIncome: number;
  taxComputation: { totalTax: number; breakdown: PitTaxBreakdown[] };
  byCategory: CategoryRollup[];
  unclassifiedCount: number;
  unclassifiedAmount: number;
  caveats: string[];
}

interface CapitalAsset {
  _id: string;
  name: string;
  assetClass: string;
  assetClassLabel?: string;
  cost: number;
  acquiredOn: string;
  disposedOn?: string | null;
  notes?: string;
  currentYearAllowance?: number;
}

interface AssetClassOption { id: string; label: string; }

const ngn = (n: number) => `₦${Math.round(n).toLocaleString()}`;
const formatPct = (n: number) => `${(n * 100).toFixed(0)}%`;

const emptyAssetDraft = {
  name: '',
  assetClass: 'computer_equipment',
  cost: '' as string,
  acquiredOn: new Date().toISOString().slice(0, 10),
  notes: '',
};

const Tax: React.FC = () => {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [taxYear, setTaxYear] = useState(currentYear);
  const [summary, setSummary] = useState<PitSummary | null>(null);
  const [assets, setAssets] = useState<CapitalAsset[]>([]);
  const [assetClasses, setAssetClasses] = useState<AssetClassOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [assetDraft, setAssetDraft] = useState(emptyAssetDraft);
  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const fetchAll = async (year: number) => {
    try {
      const [s, a, m] = await Promise.all([
        apiRequest<PitSummary>(`/tax/pit/summary?year=${year}`),
        apiRequest<CapitalAsset[]>('/capital-assets'),
        apiRequest<{ assetClasses: AssetClassOption[] }>('/tax/metadata'),
      ]);
      setSummary(s);
      setAssets(a);
      setAssetClasses(m.assetClasses);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchAll(taxYear).finally(() => setIsLoading(false));
    const handler = () => fetchAll(taxYear);
    window.addEventListener('MorniyDataUpdate', handler);
    return () => window.removeEventListener('MorniyDataUpdate', handler);
  }, [taxYear]);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= currentYear - 4; y--) years.push(y);
    return years;
  }, [currentYear]);

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetDraft.name.trim() || !assetDraft.assetClass || !assetDraft.cost) {
      setError('Name, class, and cost are required.');
      return;
    }
    setIsSavingAsset(true);
    setError(null);
    try {
      await apiRequest('/capital-assets', {
        method: 'POST',
        body: {
          name: assetDraft.name.trim(),
          assetClass: assetDraft.assetClass,
          cost: Number(assetDraft.cost),
          acquiredOn: assetDraft.acquiredOn,
          notes: assetDraft.notes || undefined,
        },
      });
      setAssetDraft(emptyAssetDraft);
      setShowAssetForm(false);
      await fetchAll(taxYear);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSavingAsset(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!window.confirm('Delete this asset? Capital allowance for this asset will no longer be claimed.')) return;
    try {
      await apiRequest(`/capital-assets/${id}`, { method: 'DELETE' });
      await fetchAll(taxYear);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current || !summary) return;
    setIsExportingPdf(true);
    try {
      const dataUrl = await toPng(reportRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Morniy-Tax-Report-${taxYear}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setError('Failed to export PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadCsv = () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const url = `${API_BASE_URL}/tax/pit/export.csv?year=${taxYear}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `Morniy-pit-${taxYear}.csv`;
        link.click();
      })
      .catch((e) => setError(e.message));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const mainContent = (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Nigerian Tax · PIT</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Personal Income Tax (Form A) worksheet for self-employed / sole proprietor filings.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={taxYear}
            onChange={(e) => setTaxYear(Number(e.target.value))}
            className="h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {yearOptions.map((y) => <option key={y} value={y}>Tax Year {y}</option>)}
          </select>
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf || !summary}
            className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <i className="fas fa-file-image text-xs" />
            {isExportingPdf ? 'Exporting…' : 'Export Report'}
          </button>
          <button
            onClick={handleDownloadCsv}
            className="h-11 bg-slate-900 text-white px-6 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
          >
            Download CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-sm font-bold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="opacity-50 hover:opacity-100">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {summary?.caveats && summary.caveats.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 space-y-2">
          <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest">Read this</p>
          {summary.caveats.map((c, i) => (
            <p key={i} className="text-xs text-amber-900 font-medium leading-relaxed">{c}</p>
          ))}
        </div>
      )}

      {summary && (
        <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-8 space-y-8">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">PIT Computation · Tax Year {summary.taxYear}</p>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Tax Due: <span className={summary.taxComputation.totalTax > 0 ? 'text-rose-600' : 'text-emerald-600'}>{ngn(summary.taxComputation.totalTax)}</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <ComputationRow label="Gross Income" value={ngn(summary.grossIncome)} bold />
              <ComputationRow label="− Allowable Expenses" value={ngn(summary.totalAllowableExpenses)} negative />
              <ComputationRow label="− Capital Allowance" value={ngn(summary.capitalAllowance)} negative />
              <ComputationRow label="= Total Income" value={ngn(summary.totalIncome)} highlight />
              <ComputationRow label="− Tax-Exempt Reliefs" value={ngn(summary.totalReliefDeductions)} negative />
              <ComputationRow label="= Income before CRA" value={ngn(summary.incomeBeforeCra)} />
              <ComputationRow label="− Consolidated Relief Allowance" value={ngn(summary.consolidatedRelief)} negative />
              <ComputationRow label="= Taxable Income" value={ngn(summary.taxableIncome)} highlight bold />
            </div>

            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">PIT Bands</p>
              <div className="space-y-2">
                {summary.taxComputation.breakdown.length === 0 ? (
                  <p className="text-sm text-slate-500">No tax owed at this income level.</p>
                ) : (
                  summary.taxComputation.breakdown.map((b, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-xs font-bold text-slate-700">{b.band}</p>
                        <p className="text-[10px] text-slate-400">{ngn(b.amountInBand)} × {formatPct(b.rate)}</p>
                      </div>
                      <p className="text-sm font-black text-slate-900">{ngn(b.tax)}</p>
                    </div>
                  ))
                )}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Total Tax</p>
                  <p className="text-lg font-black text-rose-600">{ngn(summary.taxComputation.totalTax)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {summary && summary.byCategory.length > 0 && (
        <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-8">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">Category Breakdown</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-left">Treatment</th>
                  <th className="px-3 py-2 text-right">Count</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {summary.byCategory.map((c) => {
                  const treatment = c.isIncome ? 'Income' : c.isRelief ? 'Tax Relief' : c.isAllowable ? 'Allowable' : 'Disallowed';
                  const treatmentClass = c.isIncome ? 'text-emerald-600' : c.isRelief ? 'text-indigo-600' : c.isAllowable ? 'text-slate-700' : 'text-rose-600';
                  return (
                    <tr key={c.taxCategory}>
                      <td className="px-3 py-3 font-bold text-slate-900">{c.label}</td>
                      <td className={`px-3 py-3 text-xs font-extrabold uppercase tracking-wider ${treatmentClass}`}>{treatment}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{c.count}</td>
                      <td className="px-3 py-3 text-right font-black text-slate-900">{ngn(c.amount)}</td>
                    </tr>
                  );
                })}
                {summary.unclassifiedCount > 0 && (
                  <tr className="bg-amber-50">
                    <td className="px-3 py-3 font-bold text-amber-900">Unclassified</td>
                    <td className="px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-amber-700">Pending Review</td>
                    <td className="px-3 py-3 text-right text-amber-700">{summary.unclassifiedCount}</td>
                    <td className="px-3 py-3 text-right font-black text-amber-900">{ngn(summary.unclassifiedAmount)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Capital Assets</p>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Fixed assets eligible for capital allowance</h3>
          </div>
          <button
            onClick={() => setShowAssetForm((v) => !v)}
            className="h-10 bg-slate-900 text-white px-5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
          >
            {showAssetForm ? 'Cancel' : 'Add asset'}
          </button>
        </div>

        {showAssetForm && (
          <form onSubmit={handleSaveAsset} className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 rounded-2xl p-4 sm:p-5">
            <input
              type="text"
              placeholder="Asset name (e.g. MacBook Pro 2024)"
              value={assetDraft.name}
              onChange={(e) => setAssetDraft({ ...assetDraft, name: e.target.value })}
              className="h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
            <select
              value={assetDraft.assetClass}
              onChange={(e) => setAssetDraft({ ...assetDraft, assetClass: e.target.value })}
              className="h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {assetClasses.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <input
              type="number"
              placeholder="Cost (NGN)"
              value={assetDraft.cost}
              onChange={(e) => setAssetDraft({ ...assetDraft, cost: e.target.value })}
              className="h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              min={0}
              step="0.01"
              required
            />
            <input
              type="date"
              value={assetDraft.acquiredOn}
              onChange={(e) => setAssetDraft({ ...assetDraft, acquiredOn: e.target.value })}
              className="h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={assetDraft.notes}
              onChange={(e) => setAssetDraft({ ...assetDraft, notes: e.target.value })}
              className="md:col-span-2 h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingAsset}
                className="h-11 bg-slate-900 text-white px-8 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-60"
              >
                {isSavingAsset ? 'Saving...' : 'Save Asset'}
              </button>
            </div>
          </form>
        )}

        {assets.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No capital assets yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assets.map((a) => (
              <div key={a._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-900 truncate">{a.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {a.assetClassLabel || a.assetClass} · acquired {new Date(a.acquiredOn).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">{ngn(a.cost)}</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                    {a.currentYearAllowance != null ? `${ngn(a.currentYearAllowance)} allowance ${currentYear}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteAsset(a._id)}
                  className="p-2.5 bg-white text-rose-600 rounded-lg border border-slate-200 text-[10px] font-extrabold uppercase tracking-wider hover:bg-rose-50"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  // ── Hidden printable report captured by toPng ──────────────────────────────
  return (
    <>
      {mainContent}

      {summary && (
        <div
          ref={reportRef}
          style={{
            position: 'fixed', left: '-9999px', top: 0,
            width: '794px', background: '#ffffff',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            color: '#0f172a', fontSize: '13px', lineHeight: '1.5',
            padding: '48px 48px 40px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', paddingBottom: '24px', borderBottom: '2px solid #e2e8f0' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '28px', height: '28px', background: '#4f46e5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '10px', height: '10px', background: 'white', transform: 'rotate(45deg)' }} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '-0.5px', color: '#0f172a' }}>Morniy</span>
              </div>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>Personal Income Tax Report</p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Form A Worksheet · Nigeria</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 20px' }}>
                <p style={{ margin: '0 0 2px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#94a3b8' }}>Tax Year</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#4f46e5' }}>{summary.taxYear}</p>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '10px', color: '#94a3b8' }}>Generated {new Date(summary.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          {/* Business info */}
          {user?.businessName && (
            <div style={{ marginBottom: '24px', background: '#f8fafc', borderRadius: '12px', padding: '14px 20px' }}>
              <p style={{ margin: '0 0 2px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#94a3b8' }}>Business</p>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{user.businessName}</p>
            </div>
          )}

          {/* Summary grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '28px' }}>
            {[
              { label: 'Gross Income', value: ngn(summary.grossIncome), color: '#10b981' },
              { label: 'Allowable Expenses', value: ngn(summary.totalAllowableExpenses), color: '#f59e0b' },
              { label: 'Net Tax Due', value: ngn(summary.taxComputation.totalTax), color: '#ef4444' },
            ].map(card => (
              <div key={card.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#94a3b8' }}>{card.label}</p>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: card.color }}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Income Computation */}
          <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#64748b' }}>Income Computation</p>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
            {[
              { label: 'Gross Income', value: ngn(summary.grossIncome) },
              { label: 'Less: Allowable Business Expenses', value: `(${ngn(summary.totalAllowableExpenses)})` },
              { label: 'Less: Capital Allowance', value: `(${ngn(summary.capitalAllowance)})` },
              { label: 'Total Income', value: ngn(summary.totalIncome), bold: true },
              { label: 'Less: Consolidated Relief Allowance', value: `(${ngn(summary.consolidatedRelief)})` },
              { label: 'Less: Relief Deductions', value: `(${ngn(summary.totalReliefDeductions)})` },
              { label: 'Taxable Income', value: ngn(summary.taxableIncome), bold: true, highlight: true },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', background: row.highlight ? '#1e1b4b' : i % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '12px', fontWeight: row.bold ? 800 : 500, color: row.highlight ? '#a5b4fc' : '#475569' }}>{row.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: row.highlight ? '#ffffff' : '#0f172a' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Tax Bands */}
          <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#64748b' }}>Tax Computation (PIT Bands)</p>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', background: '#f8fafc', padding: '10px 16px', borderBottom: '1px solid #e2e8f0' }}>
              {['Band', 'Amount', 'Rate', 'Tax'].map(h => (
                <span key={h} style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#94a3b8' }}>{h}</span>
              ))}
            </div>
            {summary.taxComputation.breakdown.map((band, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 16px', background: i % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '12px', color: '#334155' }}>{band.band}</span>
                <span style={{ fontSize: '12px', color: '#334155' }}>{ngn(band.amountInBand)}</span>
                <span style={{ fontSize: '12px', color: '#334155' }}>{formatPct(band.rate)}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{ngn(band.tax)}</span>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '12px 16px', background: '#0f172a' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', gridColumn: '1/4' }}>Total Tax Due</span>
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#a5b4fc' }}>{ngn(summary.taxComputation.totalTax)}</span>
            </div>
          </div>

          {/* Category Breakdown */}
          {summary.byCategory.length > 0 && (
            <>
              <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#64748b' }}>Category Breakdown</p>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', background: '#f8fafc', padding: '10px 16px', borderBottom: '1px solid #e2e8f0' }}>
                  {['Category', 'Count', 'Type', 'Amount'].map(h => (
                    <span key={h} style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#94a3b8' }}>{h}</span>
                  ))}
                </div>
                {summary.byCategory.map((cat, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 16px', background: i % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '12px', color: '#334155' }}>{cat.label}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{cat.count}</span>
                    <span style={{ fontSize: '11px', color: cat.isIncome ? '#10b981' : '#f59e0b', fontWeight: 700 }}>{cat.isIncome ? 'Income' : cat.isAllowable ? 'Allowable' : 'Expense'}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{ngn(cat.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Caveats */}
          {summary.caveats.length > 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px 16px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#92400e' }}>Notes &amp; Caveats</p>
              {summary.caveats.map((c, i) => (
                <p key={i} style={{ margin: '0 0 4px', fontSize: '11px', color: '#78350f' }}>• {c}</p>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8' }}>This is a worksheet only — have your accountant review before filing with FIRS / State IRS.</p>
            <p style={{ margin: 0, fontSize: '10px', color: '#cbd5e1', fontWeight: 700 }}>Morniy</p>
          </div>
        </div>
      )}
    </>
  );
};

const ComputationRow: React.FC<{ label: string; value: string; bold?: boolean; negative?: boolean; highlight?: boolean }> = ({ label, value, bold, negative, highlight }) => (
  <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl ${highlight ? 'bg-slate-900 text-white' : 'bg-slate-50'}`}>
    <p className={`text-xs ${bold ? 'font-black' : 'font-bold'} ${highlight ? 'text-white' : negative ? 'text-rose-600' : 'text-slate-700'}`}>{label}</p>
    <p className={`text-sm ${bold ? 'font-black' : 'font-bold'} ${highlight ? 'text-white' : 'text-slate-900'}`}>{value}</p>
  </div>
);

export default Tax;
