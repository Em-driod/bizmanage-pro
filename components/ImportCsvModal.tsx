import React, { useState } from 'react';
import { apiRequest } from '../services/api';

type SignConvention = 'debits-negative' | 'debits-positive';

interface PreviewRow {
  rowIndex: number;
  date: string | null;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  category: string | null;
  predictedCategory: string | null;
  willAutoCommit: boolean;
  ruleName: string | null;
  warnings: string[];
}

interface PreviewResponse {
  detectedColumns: { date: number | null; description: number | null; amount: number | null; debit: number | null; credit: number | null };
  signConvention: SignConvention;
  totalRows: number;
  skippedRows: number;
  truncated: boolean;
  rows: PreviewRow[];
  message?: string;
}

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

const BANK_GUIDES = [
  {
    bank: 'GTBank',
    steps: [
      'Log in at gtbank.com → Internet Banking',
      'Go to Accounts → Account Statement',
      'Select date range → Format: CSV → Download',
    ],
  },
  {
    bank: 'Access Bank',
    steps: [
      'Log in at accessbank.com → Internet Banking',
      'Go to Accounts → Statement of Account',
      'Choose date range → Export as CSV',
    ],
  },
  {
    bank: 'Zenith Bank',
    steps: [
      'Log in at zenithbank.com → Internet Banking',
      'Go to Account Services → Account Statement',
      'Set date range → Download as CSV/Excel',
      'Columns detected: Withdrawal Dr, Deposits Cr, Remarks',
    ],
  },
  {
    bank: 'First Bank',
    steps: [
      'Log in at firstbanknigeria.com → FirstOnline',
      'Go to Accounts → Account Statement',
      'Choose date range → Export as CSV',
    ],
  },
  {
    bank: 'UBA',
    steps: [
      'Log in at ubagroup.com → UBA Online Banking',
      'Go to Accounts → Statement Request',
      'Set range → Download CSV',
    ],
  },
];

const ImportCsvModal: React.FC<ImportCsvModalProps> = ({ isOpen, onClose, onImported }) => {
  const [csv, setCsv] = useState('');
  const [signConvention, setSignConvention] = useState<SignConvention>('debits-negative');
  const [showBankGuide, setShowBankGuide] = useState(false);
  const [activeBankGuide, setActiveBankGuide] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setCsv('');
    setPreview(null);
    setRows([]);
    setSelected({});
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string) || '';
      setCsv(text);
    };
    reader.readAsText(file);
  };

  const handlePreview = async () => {
    if (!csv.trim()) {
      setError('Paste CSV or upload a file first.');
      return;
    }
    setIsPreviewing(true);
    setError(null);
    try {
      const data = await apiRequest<PreviewResponse>('/transactions/csv/preview', {
        method: 'POST',
        body: { csv, signConvention },
      });
      setPreview(data);
      setRows(data.rows);
      const initial: Record<number, boolean> = {};
      data.rows.forEach((r) => { initial[r.rowIndex] = true; });
      setSelected(initial);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleCommit = async () => {
    const toCommit = rows.filter((r) => selected[r.rowIndex]);
    if (toCommit.length === 0) {
      setError('Select at least one row.');
      return;
    }
    setIsCommitting(true);
    setError(null);
    try {
      const res = await apiRequest<{ message: string; imported: number; attempted: number }>(
        '/transactions/csv/commit',
        {
          method: 'POST',
          body: {
            rows: toCommit.map((r) => ({
              date: r.date,
              amount: r.amount,
              type: r.type,
              description: r.description,
              category: r.category || 'Uncategorized',
            })),
          },
        },
      );
      onImported();
      reset();
      onClose();
      // Quick feedback to user
      window.setTimeout(() => alert(res.message), 50);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsCommitting(false);
    }
  };

  const updateRow = (rowIndex: number, patch: Partial<PreviewRow>) => {
    setRows((prev) => prev.map((r) => (r.rowIndex === rowIndex ? { ...r, ...patch } : r)));
  };

  const selectedCount = rows.filter((r) => selected[r.rowIndex]).length;
  const autoCommitCount = rows.filter((r) => r.willAutoCommit && selected[r.rowIndex]).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Import bank statement CSV</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">Paste or upload a CSV. We detect columns, predict categories, and let you review before saving.</p>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-700">
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-sm font-bold">
              {error}
            </div>
          )}

          {!preview ? (
            <>
              {/* Nigerian bank export guide */}
              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowBankGuide(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <i className="fas fa-university text-xs text-indigo-500"></i>
                    How to export from your Nigerian bank
                  </span>
                  <i className={`fas fa-chevron-${showBankGuide ? 'up' : 'down'} text-xs text-slate-400`}></i>
                </button>
                {showBankGuide && (
                  <div className="p-5 space-y-4 bg-white">
                    <div className="flex flex-wrap gap-2">
                      {BANK_GUIDES.map(g => (
                        <button
                          key={g.bank}
                          type="button"
                          onClick={() => setActiveBankGuide(prev => prev === g.bank ? null : g.bank)}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${activeBankGuide === g.bank ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'}`}
                        >
                          {g.bank}
                        </button>
                      ))}
                    </div>
                    {activeBankGuide && (() => {
                      const guide = BANK_GUIDES.find(g => g.bank === activeBankGuide)!;
                      return (
                        <ol className="space-y-2 pl-1">
                          {guide.steps.map((step, i) => (
                            <li key={i} className="flex gap-3 text-sm text-slate-700">
                              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      );
                    })()}
                    <p className="text-[11px] text-slate-400">Morniy auto-detects columns for all major Nigerian banks. If rows are skipped, try changing the Sign Convention below.</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">Paste CSV</label>
                  <textarea
                    value={csv}
                    onChange={(e) => setCsv(e.target.value)}
                    placeholder={`Date,Description,Amount\n2024-01-15,Coffee shop,-4.50\n2024-01-16,Client payment,1500.00`}
                    className="w-full h-48 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">Or upload file</label>
                    <input
                      type="file"
                      accept=".csv,text/csv,text/plain"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                      className="block w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white file:font-bold file:text-xs hover:file:bg-slate-800 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">Sign convention</label>
                    <select
                      value={signConvention}
                      onChange={(e) => setSignConvention(e.target.value as SignConvention)}
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="debits-negative">Debits are negative (most US/EU banks)</option>
                      <option value="debits-positive">Debits are positive</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">Ignored when CSV has separate Debit/Credit columns.</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handlePreview}
                  disabled={isPreviewing || !csv.trim()}
                  className="h-11 bg-slate-900 text-white px-8 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-60"
                >
                  {isPreviewing ? 'Parsing...' : 'Preview'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Total rows" value={String(preview.totalRows)} />
                <Stat label="Parsed" value={String(rows.length)} />
                <Stat label="Skipped" value={String(preview.skippedRows)} accent={preview.skippedRows > 0 ? 'text-amber-600' : ''} />
                <Stat label="Will auto-commit" value={String(autoCommitCount)} accent={autoCommitCount > 0 ? 'text-emerald-600' : ''} />
              </div>

              {preview.message && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-sm">
                  {preview.message}
                </div>
              )}
              {preview.truncated && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-xs font-bold">
                  Showing the first {rows.length} rows. Split your file to import more.
                </div>
              )}

              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                        <th className="px-3 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedCount === rows.length && rows.length > 0}
                            onChange={(e) => {
                              const all: Record<number, boolean> = {};
                              rows.forEach((r) => { all[r.rowIndex] = e.target.checked; });
                              setSelected(all);
                            }}
                          />
                        </th>
                        <th className="px-3 py-3 text-left">Date</th>
                        <th className="px-3 py-3 text-left">Description</th>
                        <th className="px-3 py-3 text-left">Type</th>
                        <th className="px-3 py-3 text-right">Amount</th>
                        <th className="px-3 py-3 text-left">Category</th>
                        <th className="px-3 py-3 text-left">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rows.map((r) => {
                        const checked = !!selected[r.rowIndex];
                        return (
                          <tr key={r.rowIndex} className={r.willAutoCommit ? 'bg-emerald-50/40' : ''}>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => setSelected({ ...selected, [r.rowIndex]: e.target.checked })}
                              />
                            </td>
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                              {r.date ? new Date(r.date).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-3 py-2 max-w-xs">
                              <input
                                type="text"
                                value={r.description}
                                onChange={(e) => updateRow(r.rowIndex, { description: e.target.value })}
                                className="w-full bg-transparent text-slate-800 font-medium focus:bg-white focus:border-slate-200 focus:border focus:rounded focus:px-2 outline-none"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={r.type}
                                onChange={(e) => updateRow(r.rowIndex, { type: e.target.value as 'income' | 'expense' })}
                                className={`bg-transparent font-bold text-[10px] uppercase tracking-wider ${r.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}
                              >
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                              </select>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                value={r.amount}
                                onChange={(e) => updateRow(r.rowIndex, { amount: Number(e.target.value) || 0 })}
                                step="0.01"
                                className="w-24 bg-transparent text-right font-bold text-slate-800 focus:bg-white focus:border-slate-200 focus:border focus:rounded focus:px-2 outline-none"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={r.category || ''}
                                placeholder="Uncategorized"
                                onChange={(e) => updateRow(r.rowIndex, { category: e.target.value })}
                                className="w-full bg-transparent text-slate-800 font-medium focus:bg-white focus:border-slate-200 focus:border focus:rounded focus:px-2 outline-none"
                              />
                            </td>
                            <td className="px-3 py-2 text-[10px]">
                              {r.willAutoCommit && r.ruleName && (
                                <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold uppercase tracking-wider mr-1">
                                  Rule: {r.ruleName}
                                </span>
                              )}
                              {r.predictedCategory && !r.willAutoCommit && (
                                <span className="inline-block px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold uppercase tracking-wider mr-1">
                                  Predicted
                                </span>
                              )}
                              {r.warnings.length > 0 && (
                                <span className="text-amber-600 font-medium">
                                  {r.warnings.join('; ')}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => { setPreview(null); setRows([]); setSelected({}); }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900"
                >
                  ← Back to upload
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500">
                    {selectedCount} selected
                  </span>
                  <button
                    onClick={handleCommit}
                    disabled={isCommitting || selectedCount === 0}
                    className="h-11 bg-slate-900 text-white px-8 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-60"
                  >
                    {isCommitting ? 'Importing...' : `Import ${selectedCount} transaction${selectedCount === 1 ? '' : 's'}`}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => (
  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
    <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-lg font-black tracking-tight ${accent || 'text-slate-900'}`}>{value}</p>
  </div>
);

export default ImportCsvModal;
