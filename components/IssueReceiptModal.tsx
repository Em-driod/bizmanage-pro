import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { Client } from '../types';
import ReceiptCard, { ReceiptData } from './ReceiptCard';

interface Transaction {
  _id: string;
  amount: number;
  description: string;
  category: string;
  clientId?: any;
}

interface ReceiptItem {
  description: string;
  amount: number;
  transactionId?: string;
  productId?: string;
  quantity?: number;
}

interface CatalogProduct {
  _id: string;
  name: string;
  price: number;
  unit?: string;
  trackStock?: boolean;
  stock?: number;
}

interface Props {
  transactions?: Transaction[];
  client?: Client | null;
  onClose: () => void;
  onCreated: (receipt: any) => void;
}

const IssueReceiptModal: React.FC<Props> = ({ transactions = [], client, onClose, onCreated }) => {
  const { formatCurrency } = useCurrency();
  const [step, setStep] = useState<'form' | 'share'>('form');
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const [showCatalog, setShowCatalog] = useState(false);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogQty, setCatalogQty] = useState<Record<string, number>>({});

  const [showTxPicker, setShowTxPicker] = useState(false);
  const [itemsError, setItemsError] = useState('');
  const [txOptions, setTxOptions] = useState<Transaction[]>([]);
  const [txSearch, setTxSearch] = useState('');

  useEffect(() => {
    if (!showCatalog || catalog.length > 0) return;
    apiRequest<CatalogProduct[]>('/products').then(setCatalog).catch(() => {});
  }, [showCatalog]);

  useEffect(() => {
    if (!showTxPicker || txOptions.length > 0) return;
    apiRequest<{ data: Transaction[] }>('/transactions?limit=100').then(res => setTxOptions(res.data)).catch(() => {});
  }, [showTxPicker]);

  const latestDate = transactions.reduce<string | null>((latest, tx) => {
    const d = (tx as any).createdAt || (tx as any).date;
    if (!d) return latest;
    return !latest || new Date(d) > new Date(latest) ? d : latest;
  }, null);

  const [items, setItems] = useState<ReceiptItem[]>(
    transactions.map(tx => ({ description: tx.description || '', amount: tx.amount, transactionId: tx._id }))
  );

  const [form, setForm] = useState({
    payerName: client?.name || '',
    payerEmail: client?.email || '',
    payerPhone: client?.phone || '',
    notes: '',
    date: new Date(latestDate || Date.now()).toISOString().split('T')[0],
  });

  const total = useMemo(() => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [items]);

  const updateItem = (i: number, field: keyof ReceiptItem, value: string) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: field === 'amount' ? Number(value) || 0 : value } : it));
  };
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const addBlankItem = () => {
    setItemsError('');
    setShowCatalog(false);
    setShowTxPicker(false);
    setItems(prev => [...prev, { description: '', amount: 0 }]);
  };

  const filteredCatalog = catalog.filter(p => !catalogSearch || p.name.toLowerCase().includes(catalogSearch.toLowerCase()));

  const addFromCatalog = (product: CatalogProduct) => {
    const qty = Math.max(1, catalogQty[product._id] || 1);
    setItems(prev => {
      const existingIdx = prev.findIndex(it => it.productId === product._id);
      if (existingIdx >= 0) {
        const newQty = (prev[existingIdx].quantity || 1) + qty;
        return prev.map((it, idx) => idx === existingIdx
          ? { ...it, quantity: newQty, amount: product.price * newQty }
          : it);
      }
      return [
        ...prev,
        {
          description: qty > 1 ? `${product.name} x${qty}` : product.name,
          amount: product.price * qty,
          productId: product._id,
          quantity: qty,
        },
      ];
    });
  };

  const addedTxIds = new Set(items.map(it => it.transactionId).filter(Boolean));
  const filteredTxOptions = txOptions.filter(tx =>
    !addedTxIds.has(tx._id) && (!txSearch || (tx.description || '').toLowerCase().includes(txSearch.toLowerCase()))
  );

  const addFromTransaction = (tx: Transaction) => {
    setItems(prev => [...prev, { description: tx.description || tx.category || 'Transaction', amount: tx.amount, transactionId: tx._id }]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.payerName.trim()) return;
    if (items.length === 0) {
      setItemsError('Add at least one item — what did they pay for?');
      return;
    }
    if (items.some(it => !it.description.trim())) {
      setItemsError('Every item needs a description.');
      return;
    }
    setItemsError('');
    setSaving(true);
    try {
      const data = await apiRequest<ReceiptData>('/receipts', {
        method: 'POST',
        body: {
          ...form,
          // transactionId per line lets the profit report skip lines that just
          // re-state an invoice payment (already counted on the invoice).
          items: items.map(({ description, amount, productId, quantity, transactionId }) => ({ description, amount, productId, quantity, transactionId })),
          transactionIds: items.map(it => it.transactionId).filter(Boolean),
          description: items.length === 1 ? items[0].description : `${items[0].description} + ${items.length - 1} more item${items.length - 1 !== 1 ? 's' : ''}`,
          amount: total,
        },
      });
      setReceipt(data);
      onCreated(data);
      setStep('share');
    } catch (err: any) {
      alert(err.message || 'Failed to create receipt');
    } finally {
      setSaving(false);
    }
  };

  const hasPreFill = !!(client?.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <i className="fas fa-receipt text-white text-sm"></i>
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {step === 'form' ? `Issue Receipt${items.length > 1 ? ` · ${items.length} items` : ''}` : `Receipt ${receipt?.receiptNumber}`}
              </h3>
              <p className="text-[11px] text-emerald-100">
                {step === 'form' ? formatCurrency(total) : 'Ready to share'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {step === 'form' ? (
            <form onSubmit={handleCreate} className="p-6 space-y-4">

              {/* Itemized list */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">What did they pay for? *</label>
                <p className="text-xs text-slate-400 mt-0.5 mb-2">Add items using any of these:</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                  {[
                    {
                      key: 'catalog',
                      active: showCatalog,
                      onClick: () => { setItemsError(''); setShowTxPicker(false); setShowCatalog(v => !v); },
                      icon: 'fa-box-open',
                      tone: 'text-indigo-600 bg-indigo-50',
                      title: 'From my catalog',
                      hint: 'A product you sell. Stock goes down.',
                    },
                    {
                      key: 'transactions',
                      active: showTxPicker,
                      onClick: () => { setItemsError(''); setShowCatalog(false); setShowTxPicker(v => !v); },
                      icon: 'fa-receipt',
                      tone: 'text-slate-600 bg-slate-100',
                      title: 'From a transaction',
                      hint: 'Money you already recorded.',
                    },
                    {
                      key: 'manual',
                      active: false,
                      onClick: addBlankItem,
                      icon: 'fa-pen',
                      tone: 'text-emerald-600 bg-emerald-50',
                      title: 'Type it in',
                      hint: 'Anything else — write what it’s for and the amount.',
                    },
                  ].map(o => (
                    <button
                      key={o.key}
                      type="button"
                      onClick={o.onClick}
                      aria-pressed={o.active}
                      className={`text-left rounded-xl border p-2.5 flex sm:block items-center gap-2.5 transition-colors ${
                        o.active ? 'border-emerald-400 bg-emerald-50/40 ring-1 ring-emerald-200' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 sm:mb-1.5 ${o.tone}`}>
                        <i className={`fas ${o.icon} text-[11px]`}></i>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-black text-slate-800">{o.title}</span>
                        <span className="block text-[10px] text-slate-500 leading-snug mt-0.5">{o.hint}</span>
                      </span>
                    </button>
                  ))}
                </div>

                {showTxPicker && (
                  <div className="mb-3 bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Search transactions…"
                      value={txSearch}
                      onChange={e => setTxSearch(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-400 outline-none"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {filteredTxOptions.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-3">No matching transactions</p>
                      ) : filteredTxOptions.map(tx => (
                        <div key={tx._id} className="flex items-center gap-2 bg-white border border-slate-100 rounded-lg p-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{tx.description || tx.category || 'Transaction'}</p>
                            <p className="text-[10px] text-slate-400">{formatCurrency(tx.amount)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => addFromTransaction(tx)}
                            className="shrink-0 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showCatalog && (
                  <div className="mb-3 bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Search catalog…"
                      value={catalogSearch}
                      onChange={e => setCatalogSearch(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-400 outline-none"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {filteredCatalog.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-3">No catalog items found</p>
                      ) : filteredCatalog.map(p => {
                        const lowStock = p.trackStock && (p.stock ?? 0) <= 0;
                        const qty = catalogQty[p._id] || 1;
                        return (
                          <div key={p._id} className="flex items-center gap-2 bg-white border border-slate-100 rounded-lg p-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                              <p className="text-[10px] text-slate-400">
                                {formatCurrency(p.price)}
                                {p.trackStock && (
                                  <span className={lowStock ? 'text-rose-500 font-bold' : ''}> · {p.stock} in stock</span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button type="button" onClick={() => setCatalogQty(q => ({ ...q, [p._id]: Math.max(1, qty - 1) }))}
                                className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded text-slate-500 hover:bg-slate-200">
                                <i className="fas fa-minus text-[9px]"></i>
                              </button>
                              <span className="w-6 text-center text-xs font-bold">{qty}</span>
                              <button type="button" onClick={() => setCatalogQty(q => ({ ...q, [p._id]: qty + 1 }))}
                                className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded text-slate-500 hover:bg-slate-200">
                                <i className="fas fa-plus text-[9px]"></i>
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => addFromCatalog(p)}
                              className="shrink-0 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg transition-colors"
                            >
                              Add
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {items.length > 0 && (
                  <div className="flex items-center gap-2 px-2 mb-1 text-[10px] font-bold text-slate-400">
                    <span className="flex-1">What it’s for</span>
                    <span className="w-24 shrink-0">Amount</span>
                    <span className="w-7 shrink-0" />
                  </div>
                )}
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-2">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Bag of rice, delivery fee"
                        value={item.description}
                        onChange={e => updateItem(i, 'description', e.target.value)}
                        className="flex-1 min-w-0 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-400 outline-none"
                      />
                      <input
                        type="number"
                        required
                        placeholder="0"
                        value={item.amount || ''}
                        onChange={e => updateItem(i, 'amount', e.target.value)}
                        className="w-24 shrink-0 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-400 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        aria-label="Remove this item"
                        className="w-7 h-7 shrink-0 flex items-center justify-center text-slate-300 hover:text-rose-500 disabled:opacity-20 transition-colors"
                      >
                        <i className="fas fa-trash text-xs"></i>
                      </button>
                    </div>
                  ))}
                </div>
                {itemsError && (
                  <p className="text-xs font-semibold text-rose-600 mt-2" role="alert">
                    <i className="fas fa-circle-exclamation mr-1" />
                    {itemsError}
                  </p>
                )}
                <div className="flex justify-between items-center px-1 mt-2">
                  <span className="text-xs font-bold text-slate-500">Total</span>
                  <span className="text-sm font-black text-emerald-700">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Pre-fill notice */}
              {hasPreFill && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                  <i className="fas fa-circle-check text-blue-400 text-xs flex-shrink-0"></i>
                  <p className="text-xs text-blue-600 font-semibold">Pre-filled from <span className="font-black">{client!.name}</span>'s profile. Edit if needed.</p>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Received From *</label>
                <input type="text" required placeholder="Payer's full name or company" value={form.payerName}
                  onChange={e => setForm(f => ({ ...f, payerName: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Email</label>
                  <input type="email" placeholder="payer@email.com" value={form.payerEmail}
                    onChange={e => setForm(f => ({ ...f, payerEmail: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Phone</label>
                  <input type="tel" placeholder="+234..." value={form.payerPhone}
                    onChange={e => setForm(f => ({ ...f, payerPhone: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Notes</label>
                  <input type="text" placeholder="Optional" value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                  {saving
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Creating...</>
                    : <><i className="fas fa-receipt text-xs"></i> Issue Receipt</>}
                </button>
              </div>
            </form>
          ) : receipt ? (
            <ReceiptCard receipt={receipt} onClose={onClose} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default IssueReceiptModal;
