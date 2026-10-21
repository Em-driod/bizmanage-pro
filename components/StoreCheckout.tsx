import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../constants';

export interface CartProduct {
  productId: string;
  name: string;
  price: number;
  image?: string;
  inStock?: number; // undefined = not tracked
}

interface Props {
  open: boolean;
  onClose: () => void;
  slug: string;
  businessName: string;
  accent: string;
  products: CartProduct[];
  cart: Record<string, number>;
  setQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  fmt: (n: number) => string;
}

const inputCls =
  'w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400';

const DETAILS_KEY = 'morniy.checkout.details';

// Slide-over cart + checkout for a business's public page. Places the order and
// sends the customer to its tracking page, which shows where to pay.
const StoreCheckout: React.FC<Props> = ({ open, onClose, slug, businessName, accent, products, cart, setQty, clearCart, fmt }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'cart' | 'details'>('cart');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(() => {
    // Returning customers don't retype their details.
    try {
      const saved = JSON.parse(localStorage.getItem(DETAILS_KEY) || '{}');
      return { name: saved.name || '', phone: saved.phone || '', email: saved.email || '', address: saved.address || '', deliveryMethod: (saved.deliveryMethod as 'pickup' | 'delivery') || 'pickup', note: '' };
    } catch {
      return { name: '', phone: '', email: '', address: '', deliveryMethod: 'pickup' as 'pickup' | 'delivery', note: '' };
    }
  });

  useEffect(() => {
    if (!open) {
      setStep('cart');
      setError('');
    }
  }, [open]);

  // Lock page scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const lines = useMemo(
    () =>
      products
        .filter((p) => (cart[p.productId] ?? 0) > 0)
        .map((p) => ({ ...p, qty: cart[p.productId]!, total: p.price * cart[p.productId]! })),
    [products, cart],
  );
  const total = lines.reduce((s, l) => s + l.total, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  const place = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.deliveryMethod === 'delivery' && form.address.trim().length < 5) {
      setError('Please enter a delivery address');
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/public/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: lines.map((l) => ({ productId: l.productId, quantity: l.qty })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not place your order');
      try {
        const { note: _note, ...keep } = form;
        localStorage.setItem(DETAILS_KEY, JSON.stringify(keep));
      } catch {
        /* private mode */
      }
      clearCart();
      navigate(`/order/${data.token}`);
    } catch (err: any) {
      setError(err?.message || 'Could not place your order');
    } finally {
      setPlacing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000]" role="dialog" aria-modal="true" aria-label="Your order">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full sm:max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          {step === 'details' && (
            <button onClick={() => setStep('cart')} className="w-9 h-9 -ml-2 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100" aria-label="Back to cart">
              <i className="fas fa-arrow-left text-sm" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base font-black text-slate-900">{step === 'cart' ? 'Your order' : 'Your details'}</p>
            <p className="text-xs text-slate-400 truncate">from {businessName}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100" aria-label="Close">
            <i className="fas fa-xmark" />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <i className="fas fa-bag-shopping text-slate-300 text-xl" />
            </div>
            <p className="text-sm font-bold text-slate-700">Your order is empty</p>
            <p className="text-xs text-slate-400 mt-1">Tap “Add” on any item to start.</p>
          </div>
        ) : step === 'cart' ? (
          <>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {lines.map((l) => {
                const max = l.inStock !== undefined ? Math.max(0, l.inStock) : 999;
                return (
                  <div key={l.productId} className="px-5 py-4 flex items-center gap-3">
                    {l.image ? (
                      <img src={l.image} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: accent + '15' }}>
                        <i className="fas fa-box text-sm" style={{ color: accent }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{l.name}</p>
                      <p className="text-xs text-slate-400">{fmt(l.price)} each</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => setQty(l.productId, l.qty - 1)}
                          className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"
                          aria-label={`One less ${l.name}`}
                        >
                          <i className={`fas ${l.qty === 1 ? 'fa-trash' : 'fa-minus'} text-[10px]`} />
                        </button>
                        <span className="w-6 text-center text-sm font-bold">{l.qty}</span>
                        <button
                          onClick={() => setQty(l.productId, l.qty + 1)}
                          disabled={l.qty >= max}
                          className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center disabled:opacity-30"
                          aria-label={`One more ${l.name}`}
                        >
                          <i className="fas fa-plus text-[10px]" />
                        </button>
                        {l.inStock !== undefined && l.qty >= max && <span className="text-[10px] font-bold text-amber-600">max in stock</span>}
                      </div>
                    </div>
                    <p className="text-sm font-black text-slate-900 shrink-0">{fmt(l.total)}</p>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-slate-100 p-5 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-slate-500">
                  {count} item{count === 1 ? '' : 's'}
                </span>
                <span className="text-xl font-black text-slate-900">{fmt(total)}</span>
              </div>
              <button
                onClick={() => setStep('details')}
                className="w-full h-12 rounded-xl text-white text-sm font-black tracking-wide"
                style={{ background: accent }}
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={place} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Full name</label>
                <input required minLength={2} autoComplete="name" className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Phone</label>
                  <input required type="tel" autoComplete="tel" placeholder="080…" className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Email <span className="font-normal text-slate-300">for your receipt</span></label>
                  <input type="email" autoComplete="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">How will you get it?</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['pickup', 'delivery'] as const).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setForm({ ...form, deliveryMethod: m })}
                      className={`h-11 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                        form.deliveryMethod === m ? 'text-white border-transparent' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                      style={form.deliveryMethod === m ? { background: accent } : undefined}
                    >
                      <i className={`fas ${m === 'pickup' ? 'fa-store' : 'fa-truck'} text-xs`} />
                      {m === 'pickup' ? 'Pick up' : 'Delivery'}
                    </button>
                  ))}
                </div>
              </div>

              {form.deliveryMethod === 'delivery' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Delivery address</label>
                  <textarea
                    required
                    rows={2}
                    autoComplete="street-address"
                    className={`${inputCls} h-auto py-2.5 resize-none`}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Note <span className="font-normal text-slate-300">optional</span></label>
                <textarea
                  rows={2}
                  placeholder="Size, colour, best time to deliver…"
                  className={`${inputCls} h-auto py-2.5 resize-none`}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500 leading-relaxed">
                <i className="fas fa-building-columns mr-1.5 text-slate-400" />
                Next, you’ll see {businessName}’s bank account and a short order code to put in your transfer. Your order is confirmed as soon as the payment arrives.
              </div>
            </div>
            <div className="border-t border-slate-100 p-5 space-y-3">
              {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
              <button
                type="submit"
                disabled={placing}
                className="w-full h-12 rounded-xl text-white text-sm font-black tracking-wide disabled:opacity-60"
                style={{ background: accent }}
              >
                {placing ? <><i className="fas fa-spinner fa-spin mr-2" />Placing order…</> : `Place order · ${fmt(total)}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default StoreCheckout;
