import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { Link } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';
import QrScannerModal from '../components/QrScannerModal';
import ScrollRow from '../components/ScrollRow';

export interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  costPrice?: number | null;
  unit?: string;
  category?: string;
  subcategory?: string;
  image?: string;
  trackStock?: boolean;
  stock?: number;
  showOnProfile?: boolean;
}

const toBase64 = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

// Offered only until the business has categories of its own.
const STARTER_CATEGORIES = ['Food', 'Drinks', 'Fashion', 'Beauty', 'Electronics', 'Services'];

const sameLabel = (a?: string, b?: string) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
export const categoryLabel = (p: { category?: string; subcategory?: string }) =>
  [p.category, p.subcategory].filter(Boolean).join(' › ');

const hasCost = (p: Pick<Product, 'costPrice'>) => typeof p.costPrice === 'number';

// Profit per unit and margin (as % of the selling price), or null when either side is missing.
export const unitMargin = (price: number, cost: number | null | undefined) => {
  if (typeof cost !== 'number' || !(price > 0)) return null;
  const profit = price - cost;
  return { profit, pct: (profit / price) * 100 };
};

const Products: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterSub, setFilterSub] = useState('');
  const [showManage, setShowManage] = useState(false);
  const [renaming, setRenaming] = useState<{ category: string; subcategory?: string; value: string } | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [stockFixId, setStockFixId] = useState<string | null>(null);
  const [stockFixValue, setStockFixValue] = useState('');
  const [savingStockFix, setSavingStockFix] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    costPrice: '',
    unit: '',
    category: '',
    subcategory: '',
    image: '',
    trackStock: false,
    stock: '',
    showOnProfile: true,
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchProducts = useCallback(async () => {
    try {
      const data = await apiRequest<Product[]>('/products');
      setProducts(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openCreate = () => {
    setEditingId(null);
    // Adding while browsing a category starts the item in that category.
    setForm({ name: '', description: '', price: '', costPrice: '', unit: '', category: filterCat, subcategory: filterSub, image: '', trackStock: false, stock: '', showOnProfile: true });
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p._id);
    setForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      costPrice: hasCost(p) ? String(p.costPrice) : '',
      unit: p.unit && p.unit !== 'unit' ? p.unit : '',
      category: p.category || '',
      subcategory: p.subcategory || '',
      image: p.image || '',
      trackStock: !!p.trackStock,
      stock: p.stock != null ? String(p.stock) : '',
      showOnProfile: p.showOnProfile !== false,
    });
    setShowForm(true);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const b64 = await toBase64(f);
    setForm(fm => ({ ...fm, image: b64 }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Name is required'); return; }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) { showToast('Enter a valid price'); return; }
    const costPrice = form.costPrice.trim() === '' ? null : parseFloat(form.costPrice);
    if (costPrice !== null && (isNaN(costPrice) || costPrice < 0)) { showToast('Enter a valid cost price'); return; }
    const stock = form.stock !== '' ? (parseInt(form.stock, 10) || 0) : undefined;
    const payload = { ...form, price, costPrice, stock };
    setSaving(true);
    try {
      if (editingId) {
        await apiRequest(`/products/${editingId}`, { method: 'PUT', body: payload });
      } else {
        await apiRequest('/products', { method: 'POST', body: payload });
      }
      showToast(editingId ? 'Product updated' : 'Product added');
      setShowForm(false);
      fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this product from catalog?')) return;
    try {
      await apiRequest(`/products/${id}`, { method: 'DELETE' });
      showToast('Removed');
      fetchProducts();
    } catch { showToast('Failed'); }
  };

  const openStockFix = (p: Product) => {
    setStockFixId(p._id);
    setStockFixValue(String(p.stock ?? 0));
  };

  const handleStockFixSave = async () => {
    if (!stockFixId) return;
    const value = parseInt(stockFixValue, 10);
    if (isNaN(value)) { showToast('Enter a valid number'); return; }
    setSavingStockFix(true);
    try {
      await apiRequest(`/products/${stockFixId}`, { method: 'PUT', body: { stock: value } });
      showToast('Stock updated');
      setStockFixId(null);
      fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Failed to update stock');
    } finally {
      setSavingStockFix(false);
    }
  };

  const handlePrintCatalog = () => window.print();

  // Category tree from the products themselves, case-insensitively merged.
  const tree = (() => {
    const map = new Map<string, { name: string; count: number; subs: Map<string, { name: string; count: number }> }>();
    for (const p of products) {
      if (!p.category) continue;
      const key = p.category.trim().toLowerCase();
      const node = map.get(key) ?? { name: p.category.trim(), count: 0, subs: new Map() };
      node.count += 1;
      if (p.subcategory) {
        const sk = p.subcategory.trim().toLowerCase();
        const sub = node.subs.get(sk) ?? { name: p.subcategory.trim(), count: 0 };
        sub.count += 1;
        node.subs.set(sk, sub);
      }
      map.set(key, node);
    }
    return [...map.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(n => ({ ...n, subs: [...n.subs.values()].sort((a, b) => a.name.localeCompare(b.name)) }));
  })();
  const categories = tree.map(c => c.name);
  const activeNode = tree.find(c => sameLabel(c.name, filterCat));
  const uncategorised = products.filter(p => !p.category).length;
  const formNode = tree.find(c => sameLabel(c.name, form.category));

  const saveRename = async () => {
    if (!renaming || !renaming.value.trim()) return;
    try {
      const res = await apiRequest<{ updated: number }>('/products/categories/rename', {
        method: 'POST',
        body: { category: renaming.category, subcategory: renaming.subcategory, newName: renaming.value },
      });
      showToast(`Renamed on ${res.updated} item${res.updated === 1 ? '' : 's'}`);
      if (sameLabel(filterCat, renaming.category)) {
        if (renaming.subcategory) { if (sameLabel(filterSub, renaming.subcategory)) setFilterSub(renaming.value.trim()); }
        else setFilterCat(renaming.value.trim());
      }
      setRenaming(null);
      fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Could not rename');
    }
  };
  const attentionCount = products.filter(p => p.trackStock && (p.stock ?? 0) <= 0).length;

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || (filterCat === '__none' ? !p.category : sameLabel(p.category, filterCat));
    const matchSub = !filterSub || sameLabel(p.subcategory, filterSub);
    const matchAttention = !attentionOnly || (p.trackStock && (p.stock ?? 0) <= 0);
    return matchSearch && matchCat && matchSub && matchAttention;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Products &amp; Services</h1>
          <p className="text-sm text-slate-400 mt-0.5">Your catalog — pick items directly when creating invoices or proposals</p>
        </div>
        <div className="flex items-center gap-2">
          {products.length > 0 && (
            <Link
              to="/profit"
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
            >
              <i className="fas fa-sack-dollar text-xs text-emerald-500" />
              Profit
            </Link>
          )}
          {products.length > 0 && (
            <button
              onClick={handlePrintCatalog}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
            >
              <i className="fas fa-print text-xs" />
              Print Catalog
            </button>
          )}
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
          >
            <i className="fas fa-plus text-xs" />
            Add Item
          </button>
        </div>
      </div>

      {/* Search + filter */}
      {products.length > 0 && (
        <div className="flex gap-3 flex-wrap print:hidden">
          <div className="relative flex-1 min-w-48">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs" />
            <input
              type="text"
              placeholder="Search catalog…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            title="Scan barcode / QR to search"
            className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <i className="fas fa-qrcode text-indigo-500" /> Scan
          </button>
          {attentionCount > 0 && (
            <button
              type="button"
              onClick={() => setAttentionOnly(v => !v)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                attentionOnly ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
              }`}
            >
              <i className="fas fa-triangle-exclamation text-xs" />
              Needs attention ({attentionCount})
            </button>
          )}
        </div>
      )}

      {/* Category browser */}
      {categories.length > 0 && (
        <div className="space-y-2 print:hidden">
          <ScrollRow className="flex items-center gap-1.5 pb-1" fade="#FDFDFD" activeKey={filterCat}>
            {[{ key: '', label: 'All', count: products.length }, ...tree.map(c => ({ key: c.name, label: c.name, count: c.count })), ...(uncategorised ? [{ key: '__none', label: 'No category', count: uncategorised }] : [])].map(c => {
              const active = c.key === '' ? !filterCat : c.key === '__none' ? filterCat === '__none' : sameLabel(filterCat, c.key);
              return (
                <button
                  key={c.key || 'all'}
                  data-active={active}
                  onClick={() => { setFilterCat(c.key); setFilterSub(''); }}
                  className={`shrink-0 h-9 px-3.5 rounded-xl text-xs font-bold transition-colors ${
                    active ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {c.label}
                  <span className={`ml-1.5 ${active ? 'text-white/50' : 'text-slate-300'}`}>{c.count}</span>
                </button>
              );
            })}
            <button
              onClick={() => setShowManage(true)}
              className="shrink-0 h-9 px-3 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-700"
              title="Rename categories"
            >
              <i className="fas fa-sliders mr-1.5 text-[10px]" />Manage
            </button>
          </ScrollRow>
          {activeNode && activeNode.subs.length > 0 && (
            <ScrollRow className="flex items-center gap-1.5 pl-1" fade="#FDFDFD" activeKey={filterSub}>
              <i className="fas fa-turn-up rotate-90 text-[10px] text-slate-300 mr-1" />
              {[{ name: '', count: activeNode.count }, ...activeNode.subs].map(sc => {
                const active = sc.name === '' ? !filterSub : sameLabel(filterSub, sc.name);
                return (
                  <button
                    key={sc.name || 'all'}
                    data-active={active}
                    onClick={() => setFilterSub(sc.name)}
                    className={`shrink-0 h-8 px-3 rounded-lg text-[11px] font-bold transition-colors ${
                      active ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    }`}
                  >
                    {sc.name || `All ${activeNode.name}`}
                    <span className={`ml-1 ${active ? 'text-white/60' : 'text-indigo-300'}`}>{sc.count}</span>
                  </button>
                );
              })}
            </ScrollRow>
          )}
        </div>
      )}

      {/* Empty state */}
      {products.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center print:hidden">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-box-open text-2xl text-indigo-400" />
          </div>
          <p className="text-base font-bold text-slate-700">No products yet</p>
          <p className="text-sm text-slate-400 mt-1">Add your services and products to quickly build invoices and proposals</p>
          <button onClick={openCreate} className="mt-5 bg-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
            Add First Item
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center print:hidden">
          <p className="text-sm text-slate-400">No items match your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:hidden">
          {filtered.map(p => {
            const lowStock = p.trackStock && (p.stock ?? 0) <= 0;
            return (
            <div key={p._id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow group">
              {/* Image */}
              {p.image ? (
                <div className="h-36 overflow-hidden">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              ) : (
                <div className="h-36 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                  <i className="fas fa-box text-3xl text-indigo-200" />
                </div>
              )}

              <div className="p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {p.category && (
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {categoryLabel(p)}
                    </span>
                  )}
                  {p.trackStock && (
                    <button
                      onClick={() => openStockFix(p)}
                      title="Click to correct stock count"
                      className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full transition-colors ${
                        lowStock ? 'text-rose-600 bg-rose-50 hover:bg-rose-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                    >
                      <i className="fas fa-cubes mr-1" />
                      {p.stock} in stock{lowStock ? ' · fix' : ''}
                    </button>
                  )}
                </div>
                <p className="text-base font-bold text-slate-900 mt-2">{p.name}</p>
                {p.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{p.description}</p>}
                <div className="flex items-center justify-between mt-3">
                  <div className="min-w-0">
                    <p className="text-lg font-black text-indigo-600">{formatCurrency(p.price)}</p>
                    {p.unit && p.unit !== 'unit' && <p className="text-[10px] text-slate-400">per {p.unit}</p>}
                    {hasCost(p) ? (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Cost {formatCurrency(p.costPrice as number)}
                        {(() => {
                          const m = unitMargin(p.price, p.costPrice);
                          return m ? (
                            <span className={`ml-1.5 font-bold ${m.profit < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                              · {m.pct.toFixed(0)}% margin
                            </span>
                          ) : null;
                        })()}
                      </p>
                    ) : (
                      <button onClick={() => openEdit(p)} className="text-[11px] font-bold text-amber-600 hover:text-amber-700 mt-0.5">
                        <i className="fas fa-circle-plus mr-1 text-[10px]" />Add cost price
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                    >
                      <i className="fas fa-pen text-xs" />
                    </button>
                    <button
                      onClick={() => handleDelete(p._id)}
                      className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-300 hover:text-red-500 flex items-center justify-center transition-colors"
                    >
                      <i className="fas fa-trash text-xs" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Print-only catalog table */}
      {products.length > 0 && (
        <table className="hidden print:table w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="py-2 pr-4">Item</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Price</th>
              <th className="py-2 pr-4">Stock</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p._id} className="border-b border-slate-200">
                <td className="py-2 pr-4">
                  <p className="font-semibold">{p.name}</p>
                  {p.description && <p className="text-xs text-slate-500">{p.description}</p>}
                </td>
                <td className="py-2 pr-4">{categoryLabel(p) || '—'}</td>
                <td className="py-2 pr-4">{formatCurrency(p.price)}{p.unit && p.unit !== 'unit' ? ` / ${p.unit}` : ''}</td>
                <td className="py-2 pr-4">{p.trackStock ? p.stock : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95dvh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <h2 className="text-base font-extrabold text-slate-900">{editingId ? 'Edit Item' : 'Add to Catalog'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* Image preview + upload */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
                  {form.image
                    ? <img src={form.image} alt="" className="w-full h-full object-cover" />
                    : <i className="fas fa-image text-slate-300 text-2xl" />}
                </div>
                <div>
                  <label className="cursor-pointer inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-bold px-3 py-2 rounded-xl hover:bg-indigo-100 transition-colors">
                    <i className="fas fa-camera text-[10px]" />
                    {form.image ? 'Change Image' : 'Add Image'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                  {form.image && (
                    <button onClick={() => setForm(f => ({ ...f, image: '' }))} className="ml-2 text-xs text-red-400 hover:text-red-600 font-semibold">Remove</button>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">Optional product photo</p>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Logo Design, Monthly Retainer"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Description</label>
                <textarea
                  rows={2}
                  placeholder="Short description shown on invoices/proposals"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Selling price + cost price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Selling Price *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={form.price}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '' || /^\d*\.?\d*$/.test(v)) setForm(f => ({ ...f, price: v }));
                    }}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Cost Price</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="What it costs you"
                    value={form.costPrice}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '' || /^\d*\.?\d*$/.test(v)) setForm(f => ({ ...f, costPrice: v }));
                    }}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
              {(() => {
                const price = parseFloat(form.price);
                const cost = form.costPrice.trim() === '' ? null : parseFloat(form.costPrice);
                const m = unitMargin(price, cost === null || isNaN(cost) ? null : cost);
                if (!m) {
                  return (
                    <p className="text-[11px] text-slate-400 -mt-2">
                      <i className="fas fa-lock text-[9px] mr-1" />
                      Private — never shown to customers. Used to work out your profit on every sale.
                    </p>
                  );
                }
                return (
                  <div className={`-mt-2 flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-xs font-bold ${m.profit < 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
                    <span>
                      <i className={`fas ${m.profit < 0 ? 'fa-arrow-trend-down' : 'fa-arrow-trend-up'} mr-1.5`} />
                      {m.profit < 0 ? 'Loss' : 'Profit'} of {formatCurrency(Math.abs(m.profit))} per {form.unit || 'unit'}
                    </span>
                    <span className="shrink-0">{m.pct.toFixed(1)}% margin</span>
                  </div>
                );
              })()}

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Sold Per</label>
                <input
                  type="text"
                  placeholder="50mls, bottle, hour…"
                  value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">What one unit is — a label, not a count</p>
              </div>

              {/* Stock tracking */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Units in Stock</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={form.stock}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '' || /^-?\d*$/.test(v)) setForm(f => ({ ...f, stock: v }));
                  }}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {form.stock !== '' && !isNaN(parseInt(form.stock, 10)) && (
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    <i className="fas fa-circle-info text-indigo-400 mr-1"></i>
                    You have {parseInt(form.stock, 10)} {form.unit ? `× ${form.unit}` : 'unit(s)'} in stock
                  </p>
                )}

                <label className="flex items-center justify-between cursor-pointer mt-3 pt-3 border-t border-slate-200">
                  <span>
                    <span className="block text-sm font-bold text-slate-700">Auto-reduce on receipts</span>
                    <span className="block text-xs text-slate-400 mt-0.5">Show on the catalog card and reduce automatically when picked on a receipt</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.trackStock}
                    onChange={e => setForm(f => ({ ...f, trackStock: e.target.checked }))}
                    className="w-5 h-5 accent-indigo-600 flex-shrink-0 ml-3"
                  />
                </label>
              </div>

              {/* Public profile visibility */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <span>
                    <span className="block text-sm font-bold text-slate-700">Show on public profile</span>
                    <span className="block text-xs text-slate-400 mt-0.5">Appears automatically on your public business page, if it's turned on</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.showOnProfile}
                    onChange={e => setForm(f => ({ ...f, showOnProfile: e.target.checked }))}
                    className="w-5 h-5 accent-indigo-600 flex-shrink-0 ml-3"
                  />
                </label>
              </div>

              {/* Category + sub-category */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Drinks"
                    maxLength={60}
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(categories.length ? categories : STARTER_CATEGORIES).map(cat => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setForm(f => ({ ...f, category: sameLabel(f.category, cat) ? '' : cat, subcategory: sameLabel(f.category, cat) ? f.subcategory : '' }))}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                          sameLabel(form.category, cat) ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={form.category.trim() ? '' : 'opacity-50 pointer-events-none'}>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                    Sub-category <span className="normal-case tracking-normal font-semibold text-slate-400">optional</span>
                  </label>
                  <input
                    type="text"
                    placeholder={form.category.trim() ? `e.g. a type of ${form.category.trim().toLowerCase()}` : 'Choose a category first'}
                    maxLength={60}
                    value={form.subcategory}
                    onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}
                    className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  {formNode && formNode.subs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formNode.subs.map(sc => (
                        <button
                          type="button"
                          key={sc.name}
                          onClick={() => setForm(f => ({ ...f, subcategory: sameLabel(f.subcategory, sc.name) ? '' : sc.name }))}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors ${
                            sameLabel(form.subcategory, sc.name) ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {sc.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">Your public page groups items by these, so customers can browse.</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add to Catalog'}
              </button>
            </div>
          </div>
        </div>
      )}

      <QrScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onResult={(text) => {
          setSearch(text);
          setShowScanner(false);
        }}
        title="Scan Product Barcode / QR"
      />

      {/* Manage categories */}
      {showManage && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm" onClick={() => { setShowManage(false); setRenaming(null); }}>
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85dvh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Categories</h3>
                <p className="text-xs text-slate-400 mt-0.5">Renaming updates every item in it.</p>
              </div>
              <button onClick={() => { setShowManage(false); setRenaming(null); }} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100">
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {tree.map(c => (
                <div key={c.name} className="rounded-xl border border-slate-100">
                  {[{ sub: undefined as string | undefined, name: c.name, count: c.count }, ...c.subs.map(sc => ({ sub: sc.name, name: sc.name, count: sc.count }))].map(row => {
                    const editing = renaming && sameLabel(renaming.category, c.name) && (renaming.subcategory || '') === (row.sub || '');
                    return (
                      <div key={row.sub ?? '__cat'} className={`flex items-center gap-2 px-3 py-2.5 ${row.sub ? 'pl-8 border-t border-slate-50' : ''}`}>
                        {editing ? (
                          <>
                            <input
                              autoFocus
                              value={renaming!.value}
                              onChange={e => setRenaming(r => r && { ...r, value: e.target.value })}
                              onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setRenaming(null); }}
                              className="flex-1 min-w-0 border border-indigo-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            />
                            <button onClick={saveRename} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold">Save</button>
                          </>
                        ) : (
                          <>
                            <span className={`flex-1 min-w-0 truncate text-sm ${row.sub ? 'text-slate-600' : 'font-bold text-slate-900'}`}>{row.name}</span>
                            <span className="text-[11px] text-slate-300">{row.count}</span>
                            <button
                              onClick={() => setRenaming({ category: c.name, subcategory: row.sub, value: row.name })}
                              className="w-7 h-7 rounded-lg text-slate-300 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
                              title="Rename"
                            >
                              <i className="fas fa-pen text-[10px]" />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              <p className="text-[11px] text-slate-400 px-1 pt-1">
                To move one item to another category, edit that item. Giving two categories the same name merges them.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stock correction modal */}
      {stockFixId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Correct Stock Count</h3>
              <p className="text-xs text-slate-400 mt-0.5">Set the actual quantity on hand right now.</p>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={stockFixValue}
              onChange={e => {
                const v = e.target.value;
                if (v === '' || /^-?\d*$/.test(v)) setStockFixValue(v);
              }}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <div className="flex gap-3">
              <button onClick={() => setStockFixId(null)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleStockFixSave} disabled={savingStockFix} className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {savingStockFix ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
