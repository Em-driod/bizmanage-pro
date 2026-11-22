import React, { useMemo, useState } from 'react';
import { apiRequest, getErrorMessage } from '../services/api';
import { ScanResponse } from '../types';

const CATEGORIES = ['Food & Dining', 'Transportation', 'Utilities', 'Office Supplies', 'Software & Services', 'Professional Services', 'Marketing', 'Equipment', 'Rent', 'Insurance', 'Salary', 'Sales', 'Consulting', 'Other'];

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const todayIso = () => new Date().toISOString().split('T')[0];

// Receipts print dates as yyyy-mm-dd, dd/mm/yyyy (day-first, as used in Nigeria) or "12 Nov 2025".
export const toIsoDate = (raw?: string | null): string => {
  if (!raw) return todayIso();
  const s = raw.trim();
  let y: number, m: number, d: number;
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) { y = +match[1]; m = +match[2]; d = +match[3]; }
  else if ((match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/))) {
    d = +match[1]; m = +match[2]; y = +match[3];
    if (y < 100) y += 2000;
  } else if ((match = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{2,4})$/))) {
    d = +match[1]; m = MONTHS.indexOf(match[2].slice(0, 3).toLowerCase()) + 1; y = +match[3];
    if (y < 100) y += 2000;
  } else return todayIso();
  if (!m || m > 12 || d < 1 || d > 31) return todayIso();
  return `${y}-${pad(m)}-${pad(d)}`;
};

interface Row {
  description: string;
  amount: string;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

interface Props {
  data: ScanResponse;
  imageUrl: string | null;
  fileName: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const ScanReviewModal: React.FC<Props> = ({ data, imageUrl, fileName, onClose, onSaved }) => {
  const [rows, setRows] = useState<Row[]>(() =>
    data.transactions.map((t) => ({
      description: t.description || '',
      amount: String(t.amount ?? ''),
      type: t.type === 'income' ? 'income' : 'expense',
      category: t.category || 'Other',
      date: toIsoDate(data.documentDate),
    })),
  );
  const [confirmed, setConfirmed] = useState(false);
  const [showText, setShowText] = useState(false);
  const [saving, setSaving] = useState<'now' | 'later' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const warnings = useMemo(() => {
    const list = [...(data.warnings ?? [])];
    if (data.lowConfidence) {
      list.unshift(`The text was hard to read (${data.confidence ?? 0}% sure). Handwriting, blur, shadows or tilt can cause wrong digits — compare every figure with the photo.`);
    }
    return list;
  }, [data]);
  const needsConfirm = warnings.length > 0;

  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const validationError = (): string | null => {
    for (const [i, r] of rows.entries()) {
      const n = Number(r.amount);
      if (!r.description.trim()) return `Row ${i + 1}: add a description.`;
      if (!Number.isFinite(n) || n <= 0) return `Row ${i + 1}: enter an amount greater than 0.`;
    }
    if (needsConfirm && !confirmed) return 'Please tick the box to confirm you have checked the figures against the photo.';
    return null;
  };

  const saveNow = async () => {
    const problem = validationError();
    if (problem) return setError(problem);
    setSaving('now');
    setError(null);
    try {
      for (const r of rows) {
        await apiRequest('/transactions', {
          method: 'POST',
          body: { description: r.description.trim(), amount: Number(r.amount), type: r.type, category: r.category, date: r.date },
        });
      }
      onSaved(`${rows.length} transaction${rows.length > 1 ? 's' : ''} added.`);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(null);
    }
  };

  const saveForLater = async () => {
    setSaving('later');
    setError(null);
    try {
      await apiRequest('/scanned-transactions', {
        method: 'POST',
        body: {
          transactions: rows.map((r) => ({ description: r.description, amount: Number(r.amount) || 0, type: r.type, category: r.category })),
          text: data.text,
          originalFileName: fileName,
        },
      });
      onSaved('Saved to Scanned Docs for later review.');
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(null);
    }
  };

  const input = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4">
      <div className="bg-white w-full sm:max-w-4xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[94dvh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-black text-slate-900">Check what we read</h3>
            <p className="text-xs text-slate-500 font-medium">Compare with the photo and fix anything wrong before saving.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Close">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="overflow-y-auto p-6 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center min-h-[10rem] max-h-[26rem]">
              {imageUrl ? (
                <img src={imageUrl} alt="Scanned document" className="w-full h-full max-h-[26rem] object-contain" />
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm font-medium"><i className="fas fa-file-pdf text-3xl text-rose-300 block mb-2"></i>{fileName}</div>
              )}
            </div>
            <button type="button" onClick={() => setShowText((s) => !s)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
              {showText ? 'Hide' : 'Show'} the raw text we read
            </button>
            {showText && <pre className="text-[11px] leading-snug bg-slate-50 border border-slate-100 rounded-xl p-3 max-h-48 overflow-auto whitespace-pre-wrap text-slate-600">{data.text}</pre>}
          </div>

          <div className="space-y-4">
            {warnings.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                <p className="text-sm font-black text-amber-800 flex items-center gap-2"><i className="fas fa-triangle-exclamation"></i> Please double-check</p>
                <ul className="list-disc pl-5 space-y-1 text-xs font-medium text-amber-800">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            {rows.map((r, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 p-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Description</label>
                  <input className={input} value={r.description} onChange={(e) => update(i, { description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Amount</label>
                    <input className={input} type="number" inputMode="decimal" min="0" step="0.01" value={r.amount} onChange={(e) => update(i, { amount: e.target.value })} />
                    {i === 0 && (data.alternativeAmounts?.length ?? 0) > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Also read as</span>
                        {data.alternativeAmounts!.filter((a) => String(a) !== r.amount).map((a) => (
                          <button key={a} type="button" onClick={() => update(i, { amount: String(a) })}
                            className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-black hover:bg-amber-200 transition-colors">
                            {a.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Type</label>
                    <div className="grid grid-cols-2 rounded-lg overflow-hidden border border-slate-200 text-sm font-bold">
                      {(['income', 'expense'] as const).map((t) => (
                        <button key={t} type="button" onClick={() => update(i, { type: t })}
                          className={`py-2 capitalize transition-colors ${r.type === t ? (t === 'income' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white') : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Category</label>
                    <input className={input} list="scan-review-categories" value={r.category} onChange={(e) => update(i, { category: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Date</label>
                    <input className={input} type="date" value={r.date} onChange={(e) => update(i, { date: e.target.value })} />
                  </div>
                </div>
              </div>
            ))}
            <datalist id="scan-review-categories">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>

            {needsConfirm && (
              <label className="flex items-start gap-3 text-sm font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" className="mt-1 rounded" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                I've checked these figures against the photo.
              </label>
            )}
            {error && <p className="text-sm font-medium text-rose-600 bg-rose-50 rounded-lg p-3">{error}</p>}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0">
          <button onClick={onClose} disabled={saving !== null} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50">Discard</button>
          <button onClick={saveForLater} disabled={saving !== null} className="px-5 py-2.5 rounded-xl text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50">
            {saving === 'later' ? 'Saving…' : 'Save for later'}
          </button>
          <button onClick={saveNow} disabled={saving !== null} className="px-6 py-2.5 rounded-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50">
            {saving === 'now' ? 'Adding…' : 'Add to transactions'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanReviewModal;
