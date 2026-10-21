import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import OrderPaymentSetup, { type PaymentSettings } from '../components/OrderPaymentSetup';
import { useBranding } from '../context/BrandingContext';

type Status = 'pending_payment' | 'paid' | 'fulfilled' | 'cancelled';
type Stage = 'placed' | 'paid' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
type Tab = 'orders' | 'payments' | 'setup';

interface Order {
  _id: string;
  code: string;
  publicToken: string;
  items: { name: string; unitPrice: number; quantity: number; total: number }[];
  total: number;
  customer: { name: string; phone: string; email?: string; address?: string };
  deliveryMethod: 'pickup' | 'delivery';
  note?: string;
  status: Status;
  customerMarkedPaidAt?: string;
  paidAt?: string;
  paidAmount?: number;
  paymentSource?: 'manual' | 'email_alert' | 'mono';
  matchedBy?: 'code' | 'amount' | 'manual';
  fulfilledAt?: string;
  cancelledAt?: string;
  createdAt: string;
  receipt?: { receiptNumber?: string; publicToken?: string } | null;
  progress?: { stage: Stage; at: string; note?: string }[];
  stage?: Stage;
  nextStages?: Stage[];
}

interface Credit {
  _id: string;
  source: 'email_alert' | 'mono';
  amount: number;
  narration?: string;
  receivedAt: string;
  status: 'matched' | 'unmatched' | 'dismissed';
  note?: string;
  order: { _id: string; code: string } | null;
  suggestedOrder: { _id: string; code: string; total: number; customer: { name: string } } | null;
}

const STATUS_META: Record<Status, { label: string; cls: string; icon: string }> = {
  pending_payment: { label: 'Awaiting payment', cls: 'bg-amber-50 text-amber-700', icon: 'fa-hourglass-half' },
  paid: { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700', icon: 'fa-circle-check' },
  fulfilled: { label: 'Fulfilled', cls: 'bg-slate-100 text-slate-600', icon: 'fa-box' },
  cancelled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-600', icon: 'fa-ban' },
};

// Owner-facing wording for each step; pickup/delivery change the last one.
const stageLabel = (stage: Stage, method: 'pickup' | 'delivery') =>
  ({
    placed: 'Order placed',
    paid: 'Payment received',
    preparing: 'Being prepared',
    ready: 'Ready for pickup',
    out_for_delivery: 'Out for delivery',
    completed: method === 'delivery' ? 'Delivered' : 'Picked up',
    cancelled: 'Cancelled',
  })[stage];
const stageAction = (stage: Stage, method: 'pickup' | 'delivery') =>
  ({
    preparing: 'Start preparing',
    ready: 'Ready for pickup',
    out_for_delivery: 'Out for delivery',
    completed: method === 'delivery' ? 'Mark delivered' : 'Mark picked up',
  } as Partial<Record<Stage, string>>)[stage] ?? stage;
const stageIcon: Record<Stage, string> = {
  placed: 'fa-bag-shopping', paid: 'fa-circle-check', preparing: 'fa-kitchen-set', ready: 'fa-store',
  out_for_delivery: 'fa-truck-fast', completed: 'fa-flag-checkered', cancelled: 'fa-ban',
};
// What to tell the customer on WhatsApp for the current step.
const whatsappUpdate = (o: Order, business: string) => {
  const link = `${window.location.origin}/order/${o.publicToken}`;
  const first = o.customer.name.split(' ')[0];
  const lines: Partial<Record<Stage, string>> = {
    paid: `Hi ${first}, we've received your payment for order ${o.code}. Thank you!`,
    preparing: `Hi ${first}, we're preparing your order ${o.code} now.`,
    ready: `Hi ${first}, your order ${o.code} is ready for pickup.`,
    out_for_delivery: `Hi ${first}, your order ${o.code} is on its way to you.`,
    completed: `Hi ${first}, thanks for your order ${o.code}! We hope to see you again.`,
  };
  const note = o.progress?.at(-1)?.note;
  const text = `${lines[o.stage || 'paid'] ?? `Hi ${first}, an update on your order ${o.code}.`}${note ? `\n\n${note}` : ''}\n\nTrack it here: ${link}\n\n— ${business}`;
  return `https://wa.me/${o.customer.phone.replace(/\D/g, '').replace(/^0/, '234')}?text=${encodeURIComponent(text)}`;
};

const SOURCE_LABEL: Record<string, string> = {
  manual: 'Confirmed by hand',
  email_alert: 'Bank alert',
  mono: 'Linked bank',
};

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const when = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

const Orders: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const { showToast } = useNotification();
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'orders';
  const openId = params.get('open');

  const [status, setStatus] = useState<Status | ''>('pending_payment');
  const [q, setQ] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState<Record<Status, number>>({ pending_payment: 0, paid: 0, fulfilled: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [detail, setDetail] = useState<Order | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [matchChoice, setMatchChoice] = useState<Record<string, string>>({});
  const [stageNote, setStageNote] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const { branding } = useBranding();

  const setTab = (t: Tab) => setParams((p) => { const n = new URLSearchParams(p); n.set('tab', t); n.delete('open'); return n; });
  const openOrder = (id: string | null) =>
    setParams((p) => { const n = new URLSearchParams(p); if (id) n.set('open', id); else n.delete('open'); return n; });

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (status) qs.set('status', status);
      if (q.trim()) qs.set('q', q.trim());
      const res = await apiRequest<{ data: Order[]; counts: Record<Status, number> }>(`/orders?${qs}`);
      setOrders(res.data);
      setCounts(res.counts);
    } catch (err: any) {
      if (!silent) showToast(err?.message || 'Could not load orders', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [status, q, showToast]);

  const loadSettings = useCallback(async () => {
    try { setSettings(await apiRequest<PaymentSettings>('/payments/settings')); } catch { /* shown as empty */ }
  }, []);
  const loadCredits = useCallback(async () => {
    try { setCredits(await apiRequest<Credit[]>('/payments/credits')); } catch { setCredits([]); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadOrders(), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadOrders, q]);
  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { if (tab === 'payments') loadCredits(); }, [tab, loadCredits]);

  // Detail drawer follows ?open=
  useEffect(() => {
    if (!openId) { setDetail(null); return; }
    apiRequest<Order>(`/orders/${openId}`).then(setDetail).catch(() => { setDetail(null); openOrder(null); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  // Live: new orders and matched payments appear without a refresh.
  useEffect(() => {
    const onUpdate = (e: Event) => {
      const type = (e as CustomEvent).detail?.type;
      if (type !== 'order') return;
      loadOrders(true);
      loadSettings();
      if (tab === 'payments') loadCredits();
      if (openId) apiRequest<Order>(`/orders/${openId}`).then(setDetail).catch(() => {});
    };
    window.addEventListener('MorniyDataUpdate', onUpdate);
    return () => window.removeEventListener('MorniyDataUpdate', onUpdate);
  }, [loadOrders, loadSettings, loadCredits, tab, openId]);

  const act = async (label: string, fn: () => Promise<Order>, success: string) => {
    setBusy(label);
    try {
      const updated = await fn();
      setDetail(updated);
      showToast(success, 'success');
      loadOrders(true);
      loadSettings();
    } catch (err: any) {
      showToast(err?.message || 'Something went wrong', 'error');
    } finally {
      setBusy(null);
    }
  };

  const confirmPaid = (o: Order) => {
    if (!confirm(`Only confirm if ${formatCurrency(o.total)} is already in your account.\n\nThis issues the receipt, records the income and reduces stock.`)) return;
    act('confirm', () => apiRequest<Order>(`/orders/${o._id}/confirm-payment`, { method: 'POST' }), `Order ${o.code} marked as paid`);
  };
  const advance = (o: Order, stage: Stage) =>
    act(
      stage,
      () => apiRequest<Order>(`/orders/${o._id}/stage`, { method: 'PUT', body: { stage, note: stageNote, notify: notifyCustomer } }),
      `${stageLabel(stage, o.deliveryMethod)}${o.customer.email && notifyCustomer ? ' — customer emailed' : ''}`,
    ).then(() => setStageNote(''));
  const undoStage = (o: Order) =>
    act('undo', () => apiRequest<Order>(`/orders/${o._id}/stage/undo`, { method: 'POST' }), 'Last step undone');

  const setOrderStatus = (o: Order, next: Status, success: string) =>
    act(next, () => apiRequest<Order>(`/orders/${o._id}/status`, { method: 'PUT', body: { status: next } }), success);

  const matchCredit = async (c: Credit) => {
    const orderId = matchChoice[c._id] ?? c.suggestedOrder?._id;
    if (!orderId) return;
    setBusy(c._id);
    try {
      await apiRequest(`/payments/credits/${c._id}/match`, { method: 'POST', body: { orderId } });
      showToast('Payment matched — order marked paid', 'success');
      loadCredits(); loadOrders(true); loadSettings();
    } catch (err: any) {
      showToast(err?.message || 'Could not match', 'error');
    } finally {
      setBusy(null);
    }
  };
  const dismissCredit = async (c: Credit) => {
    setBusy(c._id);
    try {
      await apiRequest(`/payments/credits/${c._id}/dismiss`, { method: 'POST' });
      loadCredits(); loadSettings();
    } finally {
      setBusy(null);
    }
  };

  const [pendingForMatch, setPendingForMatch] = useState<Order[]>([]);
  useEffect(() => {
    if (tab !== 'payments') return;
    apiRequest<{ data: Order[] }>('/orders?status=pending_payment&limit=100').then((r) => setPendingForMatch(r.data)).catch(() => {});
  }, [tab, credits.length]);

  const unmatched = credits.filter((c) => c.status === 'unmatched');
  const recentMatched = credits.filter((c) => c.status === 'matched').slice(0, 10);
  const totalCount = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);
  const notSetUp = settings && !settings.ordersEnabled;

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'orders', label: 'Orders', badge: counts.pending_payment || undefined },
    { id: 'payments', label: 'Unmatched payments', badge: settings?.unmatchedCredits || undefined },
    { id: 'setup', label: 'Payment setup' },
  ];

  return (
    <div className="min-h-screen space-y-5 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Orders</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Orders from your public page, paid by transfer into your own account.</p>
        </div>
        {settings?.storefrontSlug && settings.ordersEnabled && (
          <a
            href={`${window.location.origin}/biz/${settings.storefrontSlug}`}
            target="_blank"
            rel="noreferrer"
            className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 inline-flex items-center gap-2 self-start"
          >
            <i className="fas fa-store text-[11px]" /> View your shop
          </a>
        )}
      </div>

      <div className="inline-flex max-w-full gap-1 rounded-xl bg-slate-100 p-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
              tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
            {t.badge ? <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {tab === 'setup' && settings && <OrderPaymentSetup settings={settings} onChange={setSettings} />}

      {tab === 'orders' && (
        <>
          {notSetUp && totalCount === 0 && (
            <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-black text-indigo-900">Let customers order from your page</p>
                <p className="text-sm text-indigo-700/80 mt-0.5">They pay into your bank account, and orders show up here with the payment matched for you.</p>
              </div>
              <button onClick={() => setTab('setup')} className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-black shrink-0">
                Set up ordering
              </button>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex gap-1 overflow-x-auto">
              {([['pending_payment', 'Awaiting payment'], ['paid', 'Paid'], ['fulfilled', 'Fulfilled'], ['cancelled', 'Cancelled'], ['', 'All']] as [Status | '', string][]).map(([s, label]) => (
                <button
                  key={s || 'all'}
                  onClick={() => setStatus(s)}
                  className={`h-9 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    status === s ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {label}
                  <span className={`ml-1.5 ${status === s ? 'text-white/60' : 'text-slate-300'}`}>{s ? counts[s] : totalCount}</span>
                </button>
              ))}
            </div>
            <div className="relative md:ml-auto md:w-64">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Code, name or phone…"
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {loading ? (
              <div className="p-14 flex justify-center"><div className="w-8 h-8 border-4 border-slate-100 border-t-slate-500 rounded-full animate-spin" /></div>
            ) : orders.length === 0 ? (
              <div className="p-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-bag-shopping text-slate-300 text-xl" />
                </div>
                <p className="text-sm font-bold text-slate-700">
                  {q ? 'No orders match that search' : status === 'pending_payment' ? 'Nothing waiting for payment' : 'No orders here yet'}
                </p>
                <p className="text-xs text-slate-400 mt-1">New orders from your public page appear here instantly.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {orders.map((o) => {
                  const sm =
                    o.status === 'paid' && o.progress?.length && o.progress.at(-1)!.stage !== 'paid'
                      ? { ...STATUS_META.paid, label: stageLabel(o.progress.at(-1)!.stage, o.deliveryMethod) }
                      : STATUS_META[o.status];
                  return (
                    <li key={o._id}>
                      <button
                        onClick={() => openOrder(o._id)}
                        className={`w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-slate-50/70 transition-colors ${openId === o._id ? 'bg-slate-50' : ''}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black text-slate-900">{o.code}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${sm.cls}`}>{sm.label}</span>
                            {o.status === 'pending_payment' && o.customerMarkedPaidAt && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-600">Customer says paid</span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-slate-800 mt-1 truncate">{o.customer.name}</p>
                          <p className="text-xs text-slate-400 truncate">
                            {o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-slate-900">{formatCurrency(o.total)}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{ago(o.createdAt)}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {tab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-sm font-black text-slate-900">Payments that need you</p>
              <p className="text-xs text-slate-400 mt-0.5">Money that arrived but couldn’t be matched to one order for sure — e.g. no code and several orders with the same amount.</p>
            </div>
            {unmatched.length === 0 ? (
              <p className="p-10 text-center text-sm text-slate-400">All caught up — nothing to match.</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {unmatched.map((c) => {
                  const choice = matchChoice[c._id] ?? c.suggestedOrder?._id ?? '';
                  return (
                    <li key={c._id} className="px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-black text-slate-900">{formatCurrency(c.amount)}</p>
                        <p className="text-xs text-slate-500 truncate">{c.narration || 'No description'}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {SOURCE_LABEL[c.source]} · {when(c.receivedAt)}
                          {c.note && <span className="text-amber-600 font-semibold"> · {c.note}</span>}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <select
                            value={choice}
                            onChange={(e) => setMatchChoice((m) => ({ ...m, [c._id]: e.target.value }))}
                            className="h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold bg-white w-full lg:w-64"
                          >
                            <option value="">Match to order…</option>
                            {pendingForMatch.map((o) => (
                              <option key={o._id} value={o._id}>
                                {o.code} · {o.customer.name} · {formatCurrency(o.total)}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => matchCredit(c)}
                            disabled={!choice || busy === c._id}
                            className="h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-black disabled:opacity-40 shrink-0"
                          >
                            Match
                          </button>
                          <button
                            onClick={() => dismissCredit(c)}
                            disabled={busy === c._id}
                            title="Not an order payment"
                            className="h-10 px-3 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 text-xs font-bold shrink-0"
                          >
                            Ignore
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {recentMatched.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <p className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Matched automatically</p>
              <ul className="divide-y divide-slate-50">
                {recentMatched.map((c) => (
                  <li key={c._id} className="px-5 py-3 flex items-center gap-3 text-sm">
                    <i className="fas fa-circle-check text-emerald-500" />
                    <span className="font-semibold text-slate-800">{formatCurrency(c.amount)}</span>
                    <span className="text-slate-400 text-xs truncate flex-1">{SOURCE_LABEL[c.source]} · {when(c.receivedAt)}</span>
                    {c.order && (
                      <button onClick={() => { setTab('orders'); openOrder(c.order!._id); }} className="font-mono text-xs font-black text-indigo-600 hover:underline">
                        {c.order.code}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Detail drawer */}
      {detail && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" onClick={() => openOrder(null)} />
          <div className="absolute right-0 top-0 bottom-0 w-full sm:max-w-md bg-white shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-black text-slate-900">{detail.code}</p>
                <p className="text-xs text-slate-400">Placed {when(detail.createdAt)}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${STATUS_META[detail.status].cls}`}>
                <i className={`fas ${STATUS_META[detail.status].icon} mr-1`} />
                {STATUS_META[detail.status].label}
              </span>
              <button onClick={() => openOrder(null)} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100" aria-label="Close">
                <i className="fas fa-xmark" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {detail.status === 'pending_payment' && detail.customerMarkedPaidAt && (
                <div className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-800">
                  <i className="fas fa-bell mr-2" />
                  {detail.customer.name.split(' ')[0]} said they paid {ago(detail.customerMarkedPaidAt)}. Check your account for {formatCurrency(detail.total)} with code{' '}
                  <span className="font-mono font-black">{detail.code}</span>.
                </div>
              )}

              {detail.paidAt && (
                <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p className="font-bold">
                    <i className="fas fa-circle-check mr-2" />
                    Paid {formatCurrency(detail.paidAmount ?? detail.total)} · {when(detail.paidAt)}
                  </p>
                  <p className="text-xs text-emerald-700/80 mt-1 ml-6">
                    {SOURCE_LABEL[detail.paymentSource || 'manual']}
                    {detail.matchedBy === 'code' && ' — matched by order code'}
                    {detail.matchedBy === 'amount' && ' — matched by amount'}
                  </p>
                </div>
              )}

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Items</p>
                <div className="rounded-xl border border-slate-100 divide-y divide-slate-50">
                  {detail.items.map((it, i) => (
                    <div key={i} className="px-4 py-2.5 flex justify-between gap-3 text-sm">
                      <span className="text-slate-700">{it.quantity}× {it.name}</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(it.total)}</span>
                    </div>
                  ))}
                  <div className="px-4 py-2.5 flex justify-between text-sm font-black text-slate-900 bg-slate-50/60">
                    <span>Total</span>
                    <span>{formatCurrency(detail.total)}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Customer</p>
                <div className="rounded-xl border border-slate-100 p-4 space-y-2 text-sm">
                  <p className="font-bold text-slate-900">{detail.customer.name}</p>
                  <div className="flex flex-wrap gap-2">
                    <a href={`tel:${detail.customer.phone}`} className="h-8 px-3 rounded-lg bg-slate-50 text-xs font-bold text-slate-600 inline-flex items-center gap-1.5 hover:bg-slate-100">
                      <i className="fas fa-phone text-[10px]" />{detail.customer.phone}
                    </a>
                    <a
                      href={`https://wa.me/${detail.customer.phone.replace(/\D/g, '').replace(/^0/, '234')}?text=${encodeURIComponent(`Hi ${detail.customer.name.split(' ')[0]}, about your order ${detail.code}.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-8 px-3 rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700 inline-flex items-center gap-1.5 hover:bg-emerald-100"
                    >
                      <i className="fab fa-whatsapp" />WhatsApp
                    </a>
                    {detail.customer.email && (
                      <a href={`mailto:${detail.customer.email}`} className="h-8 px-3 rounded-lg bg-slate-50 text-xs font-bold text-slate-600 inline-flex items-center gap-1.5 hover:bg-slate-100 max-w-full truncate">
                        <i className="far fa-envelope text-[10px]" />{detail.customer.email}
                      </a>
                    )}
                  </div>
                  <p className="text-slate-600 pt-1">
                    <i className={`fas ${detail.deliveryMethod === 'delivery' ? 'fa-truck' : 'fa-store'} text-slate-300 mr-2`} />
                    {detail.deliveryMethod === 'delivery' ? detail.customer.address || 'Delivery' : 'Pick up'}
                  </p>
                  {detail.note && <p className="text-slate-600 bg-amber-50/60 rounded-lg px-3 py-2"><i className="far fa-note-sticky text-amber-500 mr-2" />{detail.note}</p>}
                </div>
              </div>

              {detail.progress && detail.progress.length > 0 && detail.status !== 'cancelled' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progress</p>
                    {detail.status !== 'pending_payment' && (
                      <a
                        href={whatsappUpdate(detail, branding.name)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-emerald-600 hover:underline"
                      >
                        <i className="fab fa-whatsapp mr-1" />Send update
                      </a>
                    )}
                  </div>
                  <ol className="relative ml-3 border-l-2 border-slate-100 space-y-4 py-1">
                    {detail.progress.map((p, i) => {
                      const isLast = i === detail.progress!.length - 1;
                      return (
                        <li key={i} className="pl-5 relative">
                          <span
                            className={`absolute -left-[13px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                              isLast ? 'bg-indigo-600 text-white ring-4 ring-indigo-50' : 'bg-white border-2 border-slate-200 text-slate-400'
                            }`}
                          >
                            <i className={`fas ${stageIcon[p.stage]}`} />
                          </span>
                          <p className={`text-sm ${isLast ? 'font-black text-slate-900' : 'font-semibold text-slate-600'}`}>{stageLabel(p.stage, detail.deliveryMethod)}</p>
                          <p className="text-[11px] text-slate-400">{when(p.at)}</p>
                          {p.note && <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5 mt-1">{p.note}</p>}
                        </li>
                      );
                    })}
                  </ol>
                  {['preparing', 'ready', 'out_for_delivery', 'completed'].includes(detail.stage || '') && (
                    <button onClick={() => undoStage(detail)} disabled={!!busy} className="mt-2 text-[11px] font-bold text-slate-400 hover:text-slate-700">
                      <i className="fas fa-rotate-left mr-1" />Undo last step
                    </button>
                  )}
                </div>
              )}

              {detail.receipt?.publicToken && (
                <a
                  href={`/receipt/${detail.receipt.publicToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 hover:bg-slate-50"
                >
                  <i className="fas fa-receipt text-emerald-500" />
                  <span className="flex-1 text-sm font-bold text-slate-800">Receipt {detail.receipt.receiptNumber}</span>
                  <i className="fas fa-arrow-up-right-from-square text-[10px] text-slate-300" />
                </a>
              )}

              <button
                onClick={async () => {
                  try { await navigator.clipboard.writeText(`${window.location.origin}/order/${detail.publicToken}`); showToast('Order link copied', 'success'); } catch { /* */ }
                }}
                className="text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                <i className="fas fa-link mr-1.5" />Copy the customer’s order link
              </button>
            </div>

            {/* Staff can move orders along; confirming payment and cancelling stay with admins. */}
            {(isAdmin || detail.status !== 'pending_payment') && (
              <div className="border-t border-slate-100 p-4 flex gap-2">
                {detail.status === 'pending_payment' && isAdmin && (
                  <>
                    <button
                      onClick={() => confirmPaid(detail)}
                      disabled={!!busy}
                      className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black disabled:opacity-60"
                    >
                      {busy === 'confirm' ? <i className="fas fa-spinner fa-spin" /> : 'Confirm payment'}
                    </button>
                    <button
                      onClick={() => confirm('Cancel this order? The customer’s page will say not to pay.') && setOrderStatus(detail, 'cancelled', 'Order cancelled')}
                      disabled={!!busy}
                      className="h-11 px-4 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 text-sm font-bold"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {detail.status === 'paid' && detail.nextStages && detail.nextStages.length > 0 && (
                  <div className="flex-1 space-y-2.5">
                    <input
                      value={stageNote}
                      onChange={(e) => setStageNote(e.target.value)}
                      maxLength={300}
                      placeholder="Note for the customer (optional) — e.g. rider’s name and number"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                    {detail.customer.email && (
                      <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                        <input type="checkbox" checked={notifyCustomer} onChange={(e) => setNotifyCustomer(e.target.checked)} className="accent-indigo-600" />
                        Email {detail.customer.name.split(' ')[0]} about this step
                      </label>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => advance(detail, detail.nextStages![0]!)}
                        disabled={!!busy}
                        className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black disabled:opacity-60"
                      >
                        {busy === detail.nextStages[0] ? <i className="fas fa-spinner fa-spin" /> : (
                          <><i className={`fas ${stageIcon[detail.nextStages[0]!]} mr-2`} />{stageAction(detail.nextStages[0]!, detail.deliveryMethod)}</>
                        )}
                      </button>
                      {detail.nextStages.length > 1 && (
                        <button
                          onClick={() => advance(detail, detail.nextStages!.at(-1)!)}
                          disabled={!!busy}
                          title="Skip straight to the end"
                          className="h-11 px-3 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 text-xs font-bold"
                        >
                          {stageAction(detail.nextStages.at(-1)!, detail.deliveryMethod)}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {detail.status === 'fulfilled' && (
                  <p className="flex-1 text-center text-xs text-slate-400 py-3">
                    <i className="fas fa-flag-checkered mr-1.5" />
                    {stageLabel('completed', detail.deliveryMethod)} {ago(detail.fulfilledAt || detail.createdAt)}
                  </p>
                )}
                {detail.status === 'cancelled' && <p className="flex-1 text-center text-xs text-slate-400 py-3">This order was cancelled {ago(detail.cancelledAt || detail.createdAt)}.</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {!isAdmin && tab === 'setup' && (
        <p className="text-xs text-slate-400">Only admins can change these settings.</p>
      )}
      <p className="text-[11px] text-slate-300 text-center">
        Payments go straight to your bank — Morniy never holds your money. <Link to="/storefront" className="underline">Bank details</Link>
      </p>
    </div>
  );
};

export default Orders;
