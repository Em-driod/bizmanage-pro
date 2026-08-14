import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import QrScannerModal from '../components/QrScannerModal';

export interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  unit?: string;
  category?: string;
  image?: string;
  trackStock?: boolean;
  stock?: number;
}

const toBase64 = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

const CATEGORIES = ['Services', 'Products', 'Design', 'Development', 'Consulting', 'Other'];

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
  const [showScanner, setShowScanner] = useState(false);
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [stockFixId, setStockFixId] = useState<string | null>(null);
  const [stockFixValue, setStockFixValue] = useState('');
  const [savingStockFix, setSavingStockFix] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    unit: 'unit',
    category: '',
    image: '',
    trackStock: false,
    stock: '',
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
    setForm({ name: '', description: '', price: '', unit: 'unit', category: '', image: '', trackStock: false, stock: '' });
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p._id);
    setForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      unit: p.unit || 'unit',
      category: p.category || '',
      image: p.image || '',
      trackStock: !!p.trackStock,
      stock: p.stock != null ? String(p.stock) : '',
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
    const stock = form.trackStock ? (parseInt(form.stock, 10) || 0) : undefined;
    const payload = { ...form, price, stock };
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

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))] as string[];
  const attentionCount = products.filter(p => p.trackStock && (p.stock ?? 0) <= 0).length;

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || p.category === filterCat;
    const matchAttention = !attentionOnly || (p.trackStock && (p.stock ?? 0) <= 0);
    return matchSearch && matchCat && matchAttention;
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
          {categories.length > 0 && (
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">All categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
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
                      {p.category}
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
                  <div>
                    <p className="text-lg font-black text-indigo-600">{formatCurrency(p.price)}</p>
                    {p.unit && p.unit !== 'unit' && <p className="text-[10px] text-slate-400">per {p.unit}</p>}
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
                <td className="py-2 pr-4">{p.category || '—'}</td>
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

              {/* Price + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Price *</label>
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
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Unit</label>
                  <input
                    type="text"
                    placeholder="unit, hour, month…"
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>

              {/* Stock tracking */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <span>
                    <span className="block text-sm font-bold text-slate-700">Track stock for this item</span>
                    <span className="block text-xs text-slate-400 mt-0.5">Reduces automatically when picked on a receipt</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.trackStock}
                    onChange={e => setForm(f => ({ ...f, trackStock: e.target.checked }))}
                    className="w-5 h-5 accent-indigo-600"
                  />
                </label>
                {form.trackStock && (
                  <div className="mt-3">
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Stock Quantity</label>
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
                  </div>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setForm(f => ({ ...f, category: f.category === cat ? '' : cat }))}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                        form.category === cat
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
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
