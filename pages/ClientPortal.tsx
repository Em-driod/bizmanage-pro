import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../constants';

interface PortalInvoice {
  _id: string;
  invoiceNumber: string;
  total: number;
  subtotal: number;
  tax: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: string;
  createdAt: string;
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
}

interface PortalProposal {
  _id: string;
  proposalNumber: string;
  title: string;
  total: number;
  status: 'sent' | 'accepted' | 'declined';
  validUntil: string;
  createdAt: string;
}

interface PortalData {
  client: { name: string; email: string };
  business: { name: string; currency: string; logoImage?: string; accentColor?: string };
  invoices: PortalInvoice[];
  proposals: PortalProposal[];
}

const fmt = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: currency || 'NGN', minimumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
};

const INVOICE_STATUS: Record<string, { label: string; cls: string }> = {
  draft:   { label: 'Draft',   cls: 'bg-white/10 text-white/40' },
  sent:    { label: 'Pending', cls: 'bg-amber-500/20 text-amber-300' },
  overdue: { label: 'Overdue', cls: 'bg-red-500/20 text-red-400' },
  paid:    { label: 'Paid',    cls: 'bg-emerald-500/20 text-emerald-400' },
};

const PROPOSAL_STATUS: Record<string, { label: string; cls: string }> = {
  sent:     { label: 'Awaiting',  cls: 'bg-indigo-500/20 text-indigo-300' },
  accepted: { label: 'Accepted',  cls: 'bg-emerald-500/20 text-emerald-400' },
  declined: { label: 'Declined',  cls: 'bg-red-500/20 text-red-400' },
};

const ClientPortal: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<'invoices' | 'proposals'>('invoices');

  useEffect(() => {
    fetch(`${API_BASE_URL}/clients/portal/${token}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center text-center px-6">
        <div>
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-xl font-bold text-white mb-2">Portal not found</h1>
          <p className="text-white/40 text-sm">This link may be invalid or has been revoked.</p>
        </div>
      </div>
    );
  }

  const accent = data.business.accentColor || '#6366f1';
  const currency = data.business.currency;
  const unpaidInvoices = data.invoices.filter(i => i.status !== 'paid');
  const totalOwed = unpaidInvoices.reduce((s, i) => s + i.total, 0);

  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* Header */}
      <div className="px-5 pt-12 pb-8 text-center relative overflow-hidden"
        style={{ background: `radial-gradient(ellipse at top, ${accent}25 0%, transparent 65%), #080808` }}>
        {data.business.logoImage ? (
          <img src={data.business.logoImage} alt="" className="w-14 h-14 rounded-2xl object-cover mx-auto mb-3 ring-2 ring-white/10" />
        ) : (
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black mx-auto mb-3" style={{ background: accent }}>
            {data.business.name.charAt(0)}
          </div>
        )}
        <p className="text-xs font-extrabold uppercase tracking-[3px] mb-1" style={{ color: accent }}>Client Portal</p>
        <h1 className="text-2xl font-black text-white">{data.client.name}</h1>
        <p className="text-white/30 text-sm mt-0.5">{data.business.name}</p>

        {/* Summary pill */}
        {totalOwed > 0 && (
          <div className="mt-5 inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/20 text-amber-300 text-sm font-bold px-4 py-2 rounded-2xl">
            <i className="fas fa-circle-exclamation text-xs" />
            {fmt(totalOwed, currency)} outstanding
          </div>
        )}
        {totalOwed === 0 && data.invoices.length > 0 && (
          <div className="mt-5 inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-sm font-bold px-4 py-2 rounded-2xl">
            <i className="fas fa-circle-check text-xs" />
            All paid up — thank you!
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 mb-5">
        <div className="flex bg-white/5 rounded-2xl p-1 gap-1">
          {(['invoices', 'proposals'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all capitalize ${
                tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t} {t === 'invoices' ? `(${data.invoices.length})` : `(${data.proposals.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-12 max-w-xl mx-auto space-y-3">

        {/* Invoices tab */}
        {tab === 'invoices' && (
          data.invoices.length === 0 ? (
            <div className="bg-white/5 border border-white/8 rounded-3xl p-10 text-center">
              <p className="text-3xl mb-3">📄</p>
              <p className="text-white/40 text-sm">No invoices yet</p>
            </div>
          ) : (
            data.invoices.map(inv => {
              const s = INVOICE_STATUS[inv.status] || INVOICE_STATUS.sent;
              const canPay = inv.status === 'sent' || inv.status === 'overdue';
              return (
                <div key={inv._id} className="bg-white/5 border border-white/8 rounded-3xl overflow-hidden">
                  <div className="px-5 py-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-extrabold text-white/30 uppercase tracking-[3px]">{inv.invoiceNumber}</p>
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                      </div>
                      <p className="text-sm text-white/50">
                        Due {new Date(inv.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <p className="text-lg font-black flex-shrink-0" style={{ color: inv.status === 'paid' ? '#34d399' : '#fff' }}>
                      {fmt(inv.total, currency)}
                    </p>
                  </div>

                  {/* Line items preview */}
                  <div className="border-t border-white/5 px-5 py-3 space-y-1">
                    {inv.lineItems.slice(0, 3).map((li, i) => (
                      <div key={i} className="flex justify-between text-xs text-white/30">
                        <span className="truncate mr-4">{li.description}</span>
                        <span className="flex-shrink-0">{fmt(li.total, currency)}</span>
                      </div>
                    ))}
                    {inv.lineItems.length > 3 && (
                      <p className="text-[10px] text-white/20">+{inv.lineItems.length - 3} more items</p>
                    )}
                  </div>

                  {canPay && (
                    <div className="border-t border-white/5 px-5 py-3">
                      <a
                        href={`${window.location.origin}${window.location.pathname.replace(/\/portal\/.*/, '')}#/invoice/${inv._id}`}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-extrabold text-white transition-all active:scale-95"
                        style={{ background: accent }}
                      >
                        <i className="fas fa-lock text-xs" />
                        Pay {fmt(inv.total, currency)}
                      </a>
                    </div>
                  )}

                  {inv.status === 'paid' && (
                    <div className="border-t border-white/5 px-5 py-3">
                      <a
                        href={`${window.location.origin}${window.location.pathname.replace(/\/portal\/.*/, '')}#/invoice/${inv._id}`}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10"
                      >
                        <i className="fas fa-receipt text-xs" />
                        View Receipt
                      </a>
                    </div>
                  )}
                </div>
              );
            })
          )
        )}

        {/* Proposals tab */}
        {tab === 'proposals' && (
          data.proposals.length === 0 ? (
            <div className="bg-white/5 border border-white/8 rounded-3xl p-10 text-center">
              <p className="text-3xl mb-3">📋</p>
              <p className="text-white/40 text-sm">No proposals yet</p>
            </div>
          ) : (
            data.proposals.map(p => {
              const s = PROPOSAL_STATUS[p.status] || PROPOSAL_STATUS.sent;
              const canRespond = p.status === 'sent';
              return (
                <div key={p._id} className="bg-white/5 border border-white/8 rounded-3xl overflow-hidden">
                  <div className="px-5 py-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-extrabold text-white/30 uppercase tracking-[3px]">{p.proposalNumber}</p>
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                      </div>
                      <p className="text-base font-bold text-white">{p.title}</p>
                      <p className="text-xs text-white/30 mt-0.5">
                        Valid until {new Date(p.validUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <p className="text-lg font-black text-white flex-shrink-0">{fmt(p.total, currency)}</p>
                  </div>

                  {canRespond && (
                    <div className="border-t border-white/5 px-5 py-3">
                      <a
                        href={`${window.location.origin}${window.location.pathname.replace(/\/portal\/.*/, '')}#/proposal/${p._id}`}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-extrabold text-white transition-all active:scale-95"
                        style={{ background: accent }}
                      >
                        Review &amp; Respond
                      </a>
                    </div>
                  )}
                </div>
              );
            })
          )
        )}

        {/* Powered by */}
        <div className="text-center pt-4">
          <a
            href="https://Morniy-d0nw.onrender.com/#/register"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/20 hover:text-white/40 transition-colors"
          >
            <span className="w-3.5 h-3.5 bg-white/10 rounded flex items-center justify-center flex-shrink-0">
              <span className="w-1.5 h-1.5 bg-white rotate-45 block" />
            </span>
            Powered by Morniy — Get yours free
          </a>
        </div>
      </div>
    </div>
  );
};

export default ClientPortal;
