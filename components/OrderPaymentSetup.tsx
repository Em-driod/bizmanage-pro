import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export interface PaymentSettings {
  ordersEnabled: boolean;
  autoMatchByAmount?: boolean;
  storefrontPublic: boolean;
  storefrontSlug: string | null;
  hasBankDetails: boolean;
  unmatchedCredits: number;
  pendingOrders: number;
  email: {
    available: boolean;
    address: string | null;
    lastAlertAt: string | null;
    forwardingVerification: { code?: string; link?: string; receivedAt: string } | null;
    recentAlerts: { subject: string; receivedAt: string; outcome: string }[];
  };
  mono: {
    available: boolean;
    publicKey: string | null;
    linked: boolean;
    accountName: string | null;
    accountNumber: string | null;
    institution: string | null;
    linkedAt: string | null;
    lastSyncedAt: string | null;
    lastError: string | null;
  };
}

declare global {
  interface Window {
    Connect?: new (opts: { key: string; onSuccess: (d: { code: string }) => void; onClose?: () => void }) => { setup: () => void; open: () => void };
  }
}

const MONO_SCRIPT = 'https://connect.withmono.com/connect.js';
const loadMono = () =>
  new Promise<void>((resolve, reject) => {
    if (window.Connect) return resolve();
    const existing = document.querySelector(`script[src="${MONO_SCRIPT}"]`);
    const s = (existing as HTMLScriptElement) || document.createElement('script');
    s.addEventListener('load', () => resolve());
    s.addEventListener('error', () => reject(new Error('Could not load Mono')));
    if (!existing) {
      s.src = MONO_SCRIPT;
      s.async = true;
      document.body.appendChild(s);
    }
  });

const timeAgo = (iso: string | null) => {
  if (!iso) return 'never';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const Step: React.FC<{ n: number; children: React.ReactNode }> = ({ n, children }) => (
  <li className="flex gap-3">
    <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{n}</span>
    <span className="text-sm text-slate-600 leading-relaxed">{children}</span>
  </li>
);

// Turning online ordering on, and the two ways Morniy can see payments land
// in the business's own bank account.
const OrderPaymentSetup: React.FC<{ settings: PaymentSettings; onChange: (s: PaymentSettings) => void }> = ({ settings, onChange }) => {
  const { showToast } = useNotification();
  const { isAdmin } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [guide, setGuide] = useState<'gmail' | 'outlook' | 'other'>('gmail');

  const save = async (body: Record<string, unknown>, label: string, success?: string) => {
    setBusy(label);
    try {
      onChange(await apiRequest<PaymentSettings>('/payments/settings', { method: 'PUT', body }));
      if (success) showToast(success, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Could not save', 'error');
    } finally {
      setBusy(null);
    }
  };

  const copyAddress = async () => {
    if (!settings.email.address) return;
    try {
      await navigator.clipboard.writeText(settings.email.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* blocked */ }
  };

  const linkBank = async () => {
    if (!settings.mono.publicKey) return;
    setBusy('mono');
    try {
      await loadMono();
      const connect = new window.Connect!({
        key: settings.mono.publicKey,
        onSuccess: async ({ code }) => {
          try {
            onChange(await apiRequest<PaymentSettings>('/payments/mono/link', { method: 'POST', body: { code } }));
            showToast('Bank linked — payments will be matched automatically', 'success');
          } catch (err: any) {
            showToast(err?.message || 'Could not link the bank', 'error');
          } finally {
            setBusy(null);
          }
        },
        onClose: () => setBusy(null),
      });
      connect.setup();
      connect.open();
    } catch (err: any) {
      showToast(err?.message || 'Could not open bank linking', 'error');
      setBusy(null);
    }
  };

  const unlinkBank = async () => {
    if (!confirm('Unlink this bank? Payments will no longer be matched from it.')) return;
    setBusy('unlink');
    try {
      onChange(await apiRequest<PaymentSettings>('/payments/mono', { method: 'DELETE' }));
    } catch (err: any) {
      showToast(err?.message || 'Could not unlink', 'error');
    } finally {
      setBusy(null);
    }
  };

  const syncBank = async () => {
    setBusy('sync');
    try {
      const r = await apiRequest<{ synced: number; error?: string }>('/payments/mono/sync', { method: 'POST' });
      if (r.error) showToast(r.error, 'error');
      else showToast(r.synced ? `Found ${r.synced} new payment${r.synced === 1 ? '' : 's'}` : 'No new payments', 'success');
      onChange(await apiRequest<PaymentSettings>('/payments/settings'));
    } finally {
      setBusy(null);
    }
  };

  const ready = settings.storefrontPublic && settings.hasBankDetails;
  const anyAuto = !!settings.email.lastAlertAt || settings.mono.linked;

  return (
    <div className="space-y-4">
      {/* 1. Accept orders */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-slate-900">Take orders on your public page</p>
            <p className="text-sm text-slate-500 mt-1">
              Customers add items from your catalog, place an order, and pay by transfer straight into your bank account.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={settings.ordersEnabled}
            disabled={!isAdmin || busy === 'toggle' || (!settings.ordersEnabled && !ready)}
            onClick={() =>
              save({ ordersEnabled: !settings.ordersEnabled }, 'toggle', settings.ordersEnabled ? 'Online orders turned off' : 'Your page now takes orders')
            }
            className={`relative w-12 h-7 rounded-full shrink-0 transition-colors disabled:opacity-50 ${settings.ordersEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
          >
            <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.ordersEnabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        <div className="mt-4 grid sm:grid-cols-3 gap-2">
          {[
            { ok: settings.storefrontPublic, label: 'Public page published', to: '/storefront' },
            { ok: settings.hasBankDetails, label: 'Bank details added', to: '/storefront' },
            { ok: anyAuto, label: 'Payment detection on', to: null },
          ].map((c) => (
            <div key={c.label} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold ${c.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
              <i className={`fas ${c.ok ? 'fa-circle-check' : 'fa-circle'} ${c.ok ? '' : 'text-slate-300'}`} />
              <span className="flex-1">{c.label}</span>
              {!c.ok && c.to && (
                <Link to={c.to} className="text-indigo-600 hover:underline">Set up</Link>
              )}
              {!c.ok && !c.to && <span className="text-[10px] font-semibold text-slate-400">optional</span>}
            </div>
          ))}
        </div>
        {settings.ordersEnabled && settings.storefrontSlug && (
          <a
            href={`${window.location.origin}/biz/${settings.storefrontSlug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-indigo-600 hover:underline"
          >
            See your page as a customer <i className="fas fa-arrow-up-right-from-square text-[9px]" />
          </a>
        )}
      </div>

      <div className="px-1 pt-2">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Confirm payments automatically</p>
        <p className="text-sm text-slate-500 mt-1">
          Use either or both. Anything they can’t match lands in <span className="font-semibold">Unmatched payments</span>, and you can always confirm an order by hand.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-slate-900">Match payments by amount alone</p>
            <p className="text-sm text-slate-500 mt-1">
              A transfer with no order code is normally left for you to confirm. Turn this on to mark an order paid automatically when exactly one open order has that amount.
              Risky: an unrelated transfer of the same amount would be counted as that order’s payment.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={!!settings.autoMatchByAmount}
            aria-label="Match payments by amount alone"
            disabled={!isAdmin || busy === 'amount'}
            onClick={() =>
              save(
                { autoMatchByAmount: !settings.autoMatchByAmount },
                'amount',
                settings.autoMatchByAmount ? 'Amount-only matches now need your confirmation' : 'Orders will be matched by amount when there is no code',
              )
            }
            className={`relative w-12 h-7 rounded-full shrink-0 transition-colors disabled:opacity-50 ${settings.autoMatchByAmount ? 'bg-emerald-500' : 'bg-slate-200'}`}
          >
            <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.autoMatchByAmount ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* 2. Forwarded alerts */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 flex flex-col">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <i className="fas fa-envelope-open-text" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-900">Forward bank alerts</p>
              <p className="text-xs text-slate-400">Free · works with any bank</p>
            </div>
            {settings.email.lastAlertAt && (
              <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full">Active</span>
            )}
          </div>

          {!settings.email.available ? (
            <p className="mt-4 text-sm text-slate-500 rounded-xl bg-slate-50 p-4">
              Alert forwarding isn’t switched on for this server yet.
            </p>
          ) : (
            <>
              <p className="text-sm text-slate-500 mt-4">Forward your bank’s credit-alert emails to this private address:</p>
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5">
                <code className="flex-1 min-w-0 truncate text-[13px] text-white">{settings.email.address}</code>
                <button onClick={copyAddress} className="shrink-0 h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-black">
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">Keep it private — anyone with it could send fake alerts.</p>

              {settings.email.forwardingVerification && (
                <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-4">
                  <p className="text-xs font-black text-amber-800">Gmail sent a confirmation code</p>
                  {settings.email.forwardingVerification.code && (
                    <p className="text-2xl font-black tracking-widest text-amber-900 font-mono mt-1">{settings.email.forwardingVerification.code}</p>
                  )}
                  <p className="text-xs text-amber-700 mt-1">
                    Enter it in Gmail → Settings → Forwarding
                    {settings.email.forwardingVerification.link && (
                      <>
                        , or{' '}
                        <a href={settings.email.forwardingVerification.link} target="_blank" rel="noreferrer" className="font-bold underline">
                          confirm with this link
                        </a>
                      </>
                    )}
                    .
                  </p>
                </div>
              )}

              <div className="mt-4">
                <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 w-fit">
                  {(['gmail', 'outlook', 'other'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGuide(g)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${guide === g ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                    >
                      {g === 'gmail' ? 'Gmail' : g === 'outlook' ? 'Outlook' : 'Other'}
                    </button>
                  ))}
                </div>
                <ol className="mt-3 space-y-2">
                  {guide === 'gmail' ? (
                    <>
                      <Step n={1}>Gmail → Settings → <b>Forwarding and POP/IMAP</b> → <b>Add a forwarding address</b>, paste the address above.</Step>
                      <Step n={2}>Gmail sends a code here — it appears on this page within a minute. Enter it in Gmail.</Step>
                      <Step n={3}>Make a filter: <b>From</b> your bank’s alert address, action <b>Forward to</b> this address. Only alerts get forwarded.</Step>
                    </>
                  ) : guide === 'outlook' ? (
                    <>
                      <Step n={1}>Outlook → Settings → Mail → <b>Rules</b> → <b>Add new rule</b>.</Step>
                      <Step n={2}>Condition: <b>From</b> your bank’s alert address.</Step>
                      <Step n={3}>Action: <b>Forward to</b> the address above. Save.</Step>
                    </>
                  ) : (
                    <>
                      <Step n={1}>In your email app, create a rule for messages from your bank’s alert address.</Step>
                      <Step n={2}>Set it to forward (not redirect) them to the address above.</Step>
                      <Step n={3}>Or set the address as an alert email in your bank’s app, if it allows a second one.</Step>
                    </>
                  )}
                </ol>
              </div>

              {settings.email.recentAlerts.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Recently received</p>
                  <ul className="space-y-1.5">
                    {settings.email.recentAlerts.slice(0, 5).map((a, i) => (
                      <li key={i} className="text-xs flex gap-2">
                        <span className="text-slate-400 shrink-0 w-14">{timeAgo(a.receivedAt)}</span>
                        <span className="min-w-0">
                          <span className="block text-slate-700 truncate">{a.subject}</span>
                          <span className={`block font-semibold ${/matched order/.test(a.outcome) ? 'text-emerald-600' : 'text-slate-400'}`}>{a.outcome}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {isAdmin && (
                <button
                  onClick={() => {
                    if (confirm('Create a new address? The old one stops working, so update your forwarding rule.')) {
                      save({ regenerateAddress: true }, 'regen', 'New address created — update your forwarding rule');
                    }
                  }}
                  disabled={busy === 'regen'}
                  className="mt-auto pt-4 self-start text-[11px] font-bold text-slate-400 hover:text-slate-700"
                >
                  <i className="fas fa-rotate mr-1" />Get a new address
                </button>
              )}
            </>
          )}
        </div>

        {/* 3. Mono */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 flex flex-col">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <i className="fas fa-building-columns" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-900">Link your bank</p>
              <p className="text-xs text-slate-400">Through Mono · read-only access</p>
            </div>
            {settings.mono.linked && (
              <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full">Linked</span>
            )}
          </div>

          {!settings.mono.available ? (
            <p className="mt-4 text-sm text-slate-500 rounded-xl bg-slate-50 p-4">
              Bank linking isn’t switched on for this server yet. Forwarding alerts works in the meantime.
            </p>
          ) : settings.mono.linked ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-900">{settings.mono.institution || 'Linked account'}</p>
                <p className="text-sm text-slate-600">
                  {settings.mono.accountName} {settings.mono.accountNumber && <span className="text-slate-400">{settings.mono.accountNumber}</span>}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Last checked {timeAgo(settings.mono.lastSyncedAt)}</p>
              </div>
              {settings.mono.lastError && (
                <p className="text-xs text-rose-600 rounded-xl bg-rose-50 p-3">
                  <i className="fas fa-triangle-exclamation mr-1" />
                  {settings.mono.lastError}
                </p>
              )}
              <div className="flex gap-2">
                <button onClick={syncBank} disabled={busy === 'sync'} className="h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-black disabled:opacity-60">
                  {busy === 'sync' ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-rotate mr-1.5" />Check now</>}
                </button>
                {isAdmin && (
                  <button onClick={unlinkBank} disabled={busy === 'unlink'} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:text-rose-600">
                    Unlink
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 mt-4">
                Connect your business account once. Morniy sees new credits on it and matches them to orders — nothing to forward, and Morniy can never move money.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-500">
                <li><i className="fas fa-check text-emerald-500 mr-2" />Most Nigerian banks and fintechs</li>
                <li><i className="fas fa-check text-emerald-500 mr-2" />Checked every few minutes while orders are waiting</li>
              </ul>
              {isAdmin && (
                <button onClick={linkBank} disabled={busy === 'mono'} className="mt-auto pt-0 self-start">
                  <span className="mt-5 inline-flex h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black items-center gap-2">
                    {busy === 'mono' ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-link" />}
                    Link bank account
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderPaymentSetup;
