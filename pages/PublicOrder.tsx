import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_BASE_URL } from '../constants';
import BrandMark from '../components/BrandMark';

interface PublicOrderData {
  code: string;
  token: string;
  status: 'pending_payment' | 'paid' | 'fulfilled' | 'cancelled';
  items: { name: string; unitPrice: number; quantity: number; total: number }[];
  subtotal: number;
  total: number;
  currency: string;
  customerName: string;
  deliveryMethod: 'pickup' | 'delivery';
  createdAt: string;
  paidAt: string | null;
  customerMarkedPaidAt: string | null;
  receiptToken: string | null;
  business: { name: string; slug: string | null; logoImage: string | null; accentColor: string; whatsapp: string | null; email: string | null };
  payTo: { bankName?: string; accountNumber?: string; accountName?: string }[];
}

const POLL_MS = 8000;

// The customer's view of one order: where to pay, the code to use, and a live
// status that flips to "Paid" by itself once the business's bank sees it.
const PublicOrder: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<PublicOrderData | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/orders/public/track/${token}`);
      if (!res.ok) throw new Error(res.status === 404 ? 'not_found' : 'failed');
      setOrder(await res.json());
      setError('');
    } catch (e: any) {
      setError(e?.message === 'not_found' ? 'This order link is invalid.' : 'Could not load your order. Check your connection.');
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep checking while payment is pending, so it turns green on its own.
  useEffect(() => {
    if (order?.status !== 'pending_payment') return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [order?.status, load]);

  const fmt = (n: number) => {
    try {
      return new Intl.NumberFormat('en-NG', { style: 'currency', currency: order?.currency || 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
    } catch {
      return n.toLocaleString();
    }
  };

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const sayPaid = async () => {
    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/public/track/${token}/sent`, { method: 'POST' });
      if (res.ok) setOrder(await res.json());
    } finally {
      setSending(false);
    }
  };

  if (error && !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div>
          <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-triangle-exclamation text-rose-500" />
          </div>
          <p className="text-sm font-bold text-slate-700">{error}</p>
          <button onClick={load} className="mt-3 text-xs font-bold text-indigo-600 hover:underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  const accent = order.business.accentColor || '#6366f1';
  const paid = order.status === 'paid' || order.status === 'fulfilled';
  const cancelled = order.status === 'cancelled';
  const waLink = order.business.whatsapp
    ? `https://wa.me/${order.business.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${order.business.name}, about my order ${order.code}.`)}`
    : null;

  const CopyBtn: React.FC<{ k: string; value: string; label?: string }> = ({ k, value, label }) => (
    <button
      onClick={() => copy(k, value)}
      className="shrink-0 h-8 px-3 rounded-lg text-[11px] font-black flex items-center gap-1.5 transition-colors"
      style={copied === k ? { background: '#ecfdf5', color: '#059669' } : { background: accent + '14', color: accent }}
    >
      <i className={`fas ${copied === k ? 'fa-check' : 'fa-copy'} text-[10px]`} />
      {copied === k ? 'Copied' : label || 'Copy'}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-100 py-6 sm:py-10 px-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Business */}
        <div className="flex items-center gap-3 px-1">
          <BrandMark name={order.business.name} logo={order.business.logoImage} color={accent} size={40} radius={12} />
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 truncate">{order.business.name}</p>
            <p className="text-[11px] text-slate-400">Order {order.code}</p>
          </div>
          {order.business.slug && (
            <Link to={`/biz/${order.business.slug}`} className="ml-auto text-[11px] font-bold text-slate-400 hover:text-slate-700">
              Back to shop
            </Link>
          )}
        </div>

        {/* Status */}
        {paid ? (
          <div className="rounded-2xl bg-emerald-500 text-white p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-check text-2xl" />
            </div>
            <p className="text-lg font-black">Payment received</p>
            <p className="text-sm text-emerald-50 mt-1">
              Thank you, {order.customerName.split(' ')[0]}! {order.business.name} has your order
              {order.status === 'fulfilled' ? ' and it’s been completed.' : ' and will get it ready.'}
            </p>
            {order.receiptToken && (
              <Link
                to={`/receipt/${order.receiptToken}`}
                className="inline-flex items-center gap-2 mt-4 h-10 px-4 rounded-xl bg-white text-emerald-700 text-sm font-black"
              >
                <i className="fas fa-receipt text-xs" /> View receipt
              </Link>
            )}
          </div>
        ) : cancelled ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center">
            <p className="text-lg font-black text-slate-900">Order cancelled</p>
            <p className="text-sm text-slate-500 mt-1">This order was cancelled by {order.business.name}. Please don’t send payment for it.</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
            <div className="p-5 text-center border-b border-slate-100">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Transfer exactly</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <p className="text-3xl font-black text-slate-900">{fmt(order.total)}</p>
                <CopyBtn k="amount" value={String(order.total)} />
              </div>
            </div>

            <div className="p-5 space-y-3">
              {order.payTo.map((acc, i) => (
                <div key={i} className="rounded-xl bg-slate-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{acc.bankName || 'Bank'}</p>
                  <div className="flex items-center justify-between gap-3 mt-1">
                    <p className="text-xl font-black text-slate-900 tracking-wider">{acc.accountNumber}</p>
                    <CopyBtn k={`acc${i}`} value={acc.accountNumber || ''} />
                  </div>
                  {acc.accountName && <p className="text-sm font-semibold text-slate-600 mt-0.5">{acc.accountName}</p>}
                </div>
              ))}

              <div className="rounded-xl border-2 border-dashed p-4" style={{ borderColor: accent + '55', background: accent + '08' }}>
                <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: accent }}>
                  Put this in the transfer description
                </p>
                <div className="flex items-center justify-between gap-3 mt-1">
                  <p className="text-2xl font-black tracking-[0.15em] text-slate-900 font-mono">{order.code}</p>
                  <CopyBtn k="code" value={order.code} />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">It’s how your payment is matched to this order automatically.</p>
              </div>
            </div>

            <div className="px-5 pb-5">
              <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3">
                <span className="relative flex w-2.5 h-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-amber-500" />
                </span>
                <p className="text-xs font-semibold text-amber-800">
                  Waiting for your payment — this page updates by itself once it arrives.
                </p>
              </div>
              {order.customerMarkedPaidAt ? (
                <p className="text-[11px] text-slate-400 text-center mt-3">
                  <i className="fas fa-check mr-1" />We’ve told {order.business.name} you’ve paid. They’ll confirm shortly.
                </p>
              ) : (
                <button
                  onClick={sayPaid}
                  disabled={sending}
                  className="w-full mt-3 h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  {sending ? 'Letting them know…' : 'I’ve sent the money'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Order summary</p>
          <div className="space-y-2">
            {order.items.map((it, i) => (
              <div key={i} className="flex justify-between gap-3 text-sm">
                <span className="text-slate-700 min-w-0">
                  {it.name} <span className="text-slate-400">× {it.quantity}</span>
                </span>
                <span className="font-semibold text-slate-900 shrink-0">{fmt(it.total)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 pt-3 border-t border-slate-100">
            <span className="text-sm font-black text-slate-900">Total</span>
            <span className="text-sm font-black text-slate-900">{fmt(order.total)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            <i className={`fas ${order.deliveryMethod === 'delivery' ? 'fa-truck' : 'fa-store'} mr-1.5`} />
            {order.deliveryMethod === 'delivery' ? 'Delivery' : 'Pick up'} · placed{' '}
            {new Date(order.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {(waLink || order.business.email) && (
          <div className="flex gap-2">
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer" className="flex-1 h-11 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-50">
                <i className="fab fa-whatsapp text-emerald-500" /> Questions?
              </a>
            )}
            {order.business.email && (
              <a href={`mailto:${order.business.email}?subject=${encodeURIComponent(`Order ${order.code}`)}`} className="flex-1 h-11 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-50">
                <i className="far fa-envelope text-slate-400" /> Email
              </a>
            )}
          </div>
        )}

        <p className="text-center text-[10px] text-slate-400 pt-2">
          Keep this page — it’s your order link. Powered by <a href="/" className="font-bold text-slate-500">Morniy</a>
        </p>
      </div>
    </div>
  );
};

export default PublicOrder;
