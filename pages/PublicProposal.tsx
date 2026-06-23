import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../constants';

const API_BASE = API_BASE_URL;

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ProposalData {
  _id: string;
  proposalNumber: string;
  title: string;
  clientId?: { name: string; email?: string } | null;
  customClientName?: string;
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  validUntil: string;
  notes?: string;
  status: 'sent' | 'accepted' | 'declined' | 'converted';
  signatureName?: string;
  signedAt?: string;
  businessId: {
    name: string;
    currency: string;
    profile?: {
      tagline?: string;
      logoImage?: string;
      accentColor?: string;
    };
  };
}

const fmt = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: currency || 'NGN', minimumFractionDigits: 0 }).format(amount);

const PublicProposal: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [action, setAction] = useState<'idle' | 'accepting' | 'declining' | 'done'>('idle');
  const [signatureName, setSignatureName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/proposals/public/${id}`)
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then(setProposal)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAccept = async () => {
    if (!signatureName.trim()) { setError('Please enter your full name to sign'); return; }
    setError('');
    try {
      const res = await fetch(`${API_BASE}/proposals/public/${id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureName }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      setProposal(p => p ? { ...p, status: 'accepted', signatureName } : p);
      setAction('done');
    } catch (err: any) {
      setError(err.message || 'Failed to accept');
    }
  };

  const handleDecline = async () => {
    try {
      await fetch(`${API_BASE}/proposals/public/${id}/decline`, { method: 'POST' });
      setProposal(p => p ? { ...p, status: 'declined' } : p);
      setAction('done');
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !proposal) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center text-center px-6">
        <div>
          <p className="text-6xl mb-4">📄</p>
          <h1 className="text-xl font-bold text-white mb-2">Proposal not found</h1>
          <p className="text-white/40 text-sm">This link may be invalid or the proposal is not yet sent.</p>
        </div>
      </div>
    );
  }

  const accent = proposal.businessId.profile?.accentColor || '#6366f1';
  const currency = proposal.businessId.currency || 'NGN';
  const clientName = proposal.clientId?.name || proposal.customClientName || 'Valued Client';
  const isExpired = new Date(proposal.validUntil) < new Date();

  const statusBanner = () => {
    if (proposal.status === 'accepted') return { bg: '#065f46', text: '#6ee7b7', msg: `Accepted by ${proposal.signatureName}` };
    if (proposal.status === 'declined') return { bg: '#7f1d1d', text: '#fca5a5', msg: 'This proposal was declined' };
    if (isExpired) return { bg: '#1c1917', text: '#d4a166', msg: 'This proposal has expired' };
    return null;
  };
  const banner = statusBanner();

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Hero */}
      <div
        className="relative px-6 pt-16 pb-12 text-center overflow-hidden"
        style={{ background: `radial-gradient(ellipse at top, ${accent}30 0%, transparent 70%), #080808` }}
      >
        {proposal.businessId.profile?.logoImage ? (
          <img src={proposal.businessId.profile.logoImage} alt="" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4 ring-2 ring-white/10" />
        ) : (
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-black" style={{ background: accent }}>
            {proposal.businessId.name.charAt(0)}
          </div>
        )}
        <p className="text-xs font-extrabold uppercase tracking-[3px] mb-2" style={{ color: accent }}>
          Proposal from
        </p>
        <h1 className="text-2xl font-black text-white mb-1">{proposal.businessId.name}</h1>
        <p className="text-white/40 text-sm">{proposal.businessId.profile?.tagline}</p>
      </div>

      {/* Banner */}
      {banner && (
        <div className="mx-4 mb-4 px-4 py-3 rounded-2xl flex items-center gap-3" style={{ background: banner.bg }}>
          <i className="fas fa-circle-check text-sm" style={{ color: banner.text }} />
          <p className="text-sm font-semibold" style={{ color: banner.text }}>{banner.msg}</p>
        </div>
      )}

      {/* Proposal Card */}
      <div className="px-4 pb-8 max-w-xl mx-auto space-y-4">

        {/* Header Card */}
        <div className="bg-white/5 border border-white/8 rounded-3xl p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold text-white/30 uppercase tracking-[3px]">{proposal.proposalNumber}</p>
              <h2 className="text-xl font-black text-white mt-1">{proposal.title}</h2>
              <p className="text-white/40 text-sm mt-1">For {clientName}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-black" style={{ color: accent }}>{fmt(proposal.total, currency)}</p>
              <p className="text-[11px] text-white/30 mt-1">
                Valid until {new Date(proposal.validUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white/5 border border-white/8 rounded-3xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <p className="text-[10px] font-extrabold text-white/30 uppercase tracking-[3px]">Scope of Work</p>
          </div>
          {proposal.lineItems.map((item, idx) => (
            <div key={idx} className="px-5 py-4 border-b border-white/5 last:border-0 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">{item.description}</p>
                <p className="text-xs text-white/30 mt-0.5">Qty: {item.quantity} × {fmt(item.unitPrice, currency)}</p>
              </div>
              <p className="text-sm font-bold text-white/80 flex-shrink-0">{fmt(item.total, currency)}</p>
            </div>
          ))}
          {/* Totals */}
          <div className="px-5 py-4 bg-white/3 space-y-2">
            <div className="flex justify-between text-sm text-white/40">
              <span>Subtotal</span><span>{fmt(proposal.subtotal, currency)}</span>
            </div>
            {proposal.tax > 0 && (
              <div className="flex justify-between text-sm text-white/40">
                <span>Tax ({proposal.tax}%)</span>
                <span>{fmt(proposal.subtotal * proposal.tax / 100, currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-base text-white border-t border-white/10 pt-2">
              <span>Total</span><span style={{ color: accent }}>{fmt(proposal.total, currency)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {proposal.notes && (
          <div className="bg-white/5 border border-white/8 rounded-3xl p-5">
            <p className="text-[10px] font-extrabold text-white/30 uppercase tracking-[3px] mb-2">Notes</p>
            <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{proposal.notes}</p>
          </div>
        )}

        {/* Accept / Decline */}
        {proposal.status === 'sent' && !isExpired && action === 'idle' && (
          <div className="bg-white/5 border border-white/8 rounded-3xl p-6 space-y-4">
            <p className="text-sm font-semibold text-white/70 text-center">Ready to move forward?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setAction('accepting')}
                className="flex-1 py-3.5 rounded-2xl text-sm font-extrabold transition-all active:scale-95"
                style={{ background: accent, color: '#fff' }}
              >
                Accept Proposal
              </button>
              <button
                onClick={() => setAction('declining')}
                className="py-3.5 px-5 rounded-2xl text-sm font-bold text-white/50 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Decline
              </button>
            </div>
            <button
              onClick={() => {
                const msg = `Hi, I received a proposal from *${proposal.businessId.name}*: *${proposal.title}* — ${fmt(proposal.total, currency)}.\n\nView it here: ${window.location.href}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
              }}
              className="w-full py-3 flex items-center justify-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 rounded-2xl text-sm font-bold text-[#25D366] transition-colors"
            >
              <i className="fab fa-whatsapp text-base"></i>
              Share via WhatsApp
            </button>
          </div>
        )}

        {/* Accept form */}
        {action === 'accepting' && (
          <div className="bg-white/5 border border-white/8 rounded-3xl p-6 space-y-4">
            <div className="text-center">
              <p className="text-base font-extrabold text-white">Sign to Accept</p>
              <p className="text-xs text-white/40 mt-1">Type your full name as your digital signature</p>
            </div>
            <input
              type="text"
              placeholder="Your full name"
              value={signatureName}
              onChange={e => { setSignatureName(e.target.value); setError(''); }}
              className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-4 text-base text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 font-semibold text-center italic"
              style={{ fontFamily: 'cursive' }}
            />
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setAction('idle'); setError(''); }} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white/40 bg-white/5 transition-colors">
                Back
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 py-3 rounded-2xl text-sm font-extrabold text-white transition-all active:scale-95"
                style={{ background: accent }}
              >
                Confirm &amp; Sign
              </button>
            </div>
          </div>
        )}

        {/* Decline confirm */}
        {action === 'declining' && (
          <div className="bg-white/5 border border-white/8 rounded-3xl p-6 space-y-4 text-center">
            <p className="text-base font-extrabold text-white">Decline this proposal?</p>
            <p className="text-xs text-white/40">This will notify the business that you're not moving forward.</p>
            <div className="flex gap-3">
              <button onClick={() => setAction('idle')} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white/40 bg-white/5">
                Back
              </button>
              <button onClick={handleDecline} className="flex-1 py-3 rounded-2xl text-sm font-extrabold text-white bg-red-600/80">
                Yes, Decline
              </button>
            </div>
          </div>
        )}

        {/* Done state */}
        {action === 'done' && proposal.status === 'accepted' && (
          <div className="bg-emerald-900/30 border border-emerald-500/20 rounded-3xl p-6 text-center space-y-2">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-base font-extrabold text-emerald-400">Proposal Accepted!</p>
            <p className="text-sm text-emerald-300/60">
              Signed as <span className="font-bold italic" style={{ fontFamily: 'cursive' }}>{signatureName}</span>
            </p>
            <p className="text-xs text-emerald-300/40">The business will be in touch shortly with next steps.</p>
          </div>
        )}

        {action === 'done' && proposal.status === 'declined' && (
          <div className="bg-red-900/20 border border-red-500/20 rounded-3xl p-6 text-center">
            <p className="text-base font-bold text-red-400">Proposal declined</p>
            <p className="text-xs text-red-300/40 mt-1">Feel free to reach out to the business if you change your mind.</p>
          </div>
        )}

        {/* Powered by */}
        <div className="text-center pb-8">
          <p className="text-[11px] text-white/20 mb-2">Built with</p>
          <a
            href="https://Morniy-d0nw.onrender.com/#/register"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
          >
            <span className="w-4 h-4 bg-white/20 rounded flex items-center justify-center flex-shrink-0">
              <span className="w-2 h-2 bg-white rotate-45 block"></span>
            </span>
            Morniy — Run your business for free
          </a>
          <p className="text-[10px] text-white/15 mt-1.5">Invoices · Proposals · Payroll · More</p>
        </div>
      </div>
    </div>
  );
};

export default PublicProposal;
