import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Proposal {
  _id: string;
  proposalNumber: string;
  title: string;
  clientId?: { _id: string; name: string; email?: string } | null;
  customClientName?: string;
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  validUntil: string;
  notes?: string;
  status: string;
  signatureName?: string;
}

interface Props {
  proposal: Proposal;
  onClose: () => void;
}

const ProposalShareModal: React.FC<Props> = ({ proposal, onClose }) => {
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const clientName = proposal.clientId?.name || proposal.customClientName || 'Valued Client';
  const validDate = new Date(proposal.validUntil).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const publicLink = `${window.location.origin}/proposal/${proposal._id}`;

  const generateImage = async (): Promise<{ dataUrl: string; file: File } | null> => {
    await new Promise(r => setTimeout(r, 150));
    if (!cardRef.current) return null;
    try {
      const dataUrl = await toPng(cardRef.current, { quality: 1, pixelRatio: 2, backgroundColor: '#0f172a' });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `quote-${proposal.proposalNumber}.png`, { type: 'image/png' });
      return { dataUrl, file };
    } catch (e) {
      console.error('Image generation failed', e);
      return null;
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const img = await generateImage();
      if (!img) return;
      if (navigator.canShare && navigator.canShare({ files: [img.file] })) {
        await navigator.share({ files: [img.file], title: `Quote ${proposal.proposalNumber}` });
      } else {
        const a = document.createElement('a');
        a.href = img.dataUrl;
        a.download = `quote-${proposal.proposalNumber}.png`;
        a.click();
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') console.error(e);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const img = await generateImage();
      if (!img) return;
      const a = document.createElement('a');
      a.href = img.dataUrl;
      a.download = `quote-${proposal.proposalNumber}.png`;
      a.click();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = async () => {
    const msg = `Hi ${clientName}, here is your quote *${proposal.proposalNumber}: ${proposal.title}*.\n\nTotal: ${formatCurrency(proposal.total)}\nValid until: ${validDate}\n\nView & accept here: ${publicLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <i className="fas fa-file-signature text-white text-sm"></i>
            </div>
            <div>
              <h3 className="text-base font-black text-white">{proposal.proposalNumber}</h3>
              <p className="text-[11px] text-indigo-100">{proposal.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">

          {/* Hidden card for image capture */}
          <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '440px' }} aria-hidden="true">
            <div ref={cardRef} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#0f172a', width: '440px' }}>

              {/* Top accent */}
              <div style={{ height: '4px', background: 'linear-gradient(90deg, #4f46e5, #818cf8, #a5b4fc)' }} />

              {/* Header */}
              <div style={{ padding: '28px 36px 20px', background: '#0f172a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: '9px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#475569' }}>Quote / Proposal</p>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.5px' }}>{(user as any)?.businessName || 'My Business'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '9px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#475569' }}>{proposal.proposalNumber}</p>
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#818cf8' }}>Valid until {validDate}</p>
                  </div>
                </div>
              </div>

              {/* Title + Client hero */}
              <div style={{ margin: '0 36px 20px', background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: '16px', padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(129,140,248,0.1)' }} />
                <p style={{ margin: '0 0 4px', fontSize: '9px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(165,180,252,0.7)' }}>Prepared For</p>
                <p style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>{clientName}</p>
                <p style={{ margin: '0 0 6px', fontSize: '9px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(165,180,252,0.6)' }}>Subject</p>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#c7d2fe', lineHeight: 1.4 }}>{proposal.title}</p>
              </div>

              {/* Tear line */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 28px', marginBottom: '0' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#1e293b', flexShrink: 0 }} />
                <div style={{ flex: 1, borderTop: '2px dashed #1e293b', margin: '0 4px' }} />
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#1e293b', flexShrink: 0 }} />
              </div>

              {/* Line Items */}
              <div style={{ padding: '20px 36px 0' }}>
                <p style={{ margin: '0 0 10px', fontSize: '9px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#475569' }}>Scope of Work</p>
                {proposal.lineItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: i < proposal.lineItems.length - 1 ? '1px solid #1e293b' : 'none' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>{item.description}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#64748b' }}>Qty: {item.quantity} × {formatCurrency(item.unitPrice)}</p>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#e2e8f0', flexShrink: 0, marginLeft: '12px' }}>{formatCurrency(item.total)}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ margin: '16px 36px 0', background: '#1e293b', borderRadius: '12px', padding: '14px 18px' }}>
                {proposal.tax > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Subtotal</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>{formatCurrency(proposal.subtotal)}</p>
                  </div>
                )}
                {proposal.tax > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Tax ({proposal.tax}%)</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>{formatCurrency(proposal.total - proposal.subtotal)}</p>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: proposal.tax > 0 ? '1px solid #334155' : 'none', paddingTop: proposal.tax > 0 ? '10px' : '0' }}>
                  <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Total</p>
                  <p style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#818cf8' }}>{formatCurrency(proposal.total)}</p>
                </div>
              </div>

              {proposal.notes && (
                <div style={{ margin: '12px 36px 0', background: '#1e293b', borderRadius: '12px', padding: '12px 18px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '9px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#475569' }}>Notes</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>{proposal.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div style={{ borderTop: '1px solid #1e293b', margin: '20px 0 0', padding: '14px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: '10px', color: '#334155' }}>Sent via <strong style={{ color: '#818cf8' }}>Morniy</strong></p>
                <p style={{ margin: 0, fontSize: '10px', color: '#334155' }}>Valid until {validDate}</p>
              </div>
            </div>
          </div>

          {/* Summary card */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <p className="text-xs font-black text-indigo-700">{proposal.title}</p>
            <p className="text-xs text-indigo-500 mt-0.5">{clientName} · {formatCurrency(proposal.total)}</p>
          </div>

          {/* Share actions */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Share Quote</p>

            {/* Share image */}
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="w-full flex items-center gap-4 px-4 py-3.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-60 group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center flex-shrink-0">
                {isSharing
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  : <i className="fas fa-share-nodes text-base"></i>}
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-white">{isSharing ? 'Generating image...' : 'Share Quote Image'}</p>
                <p className="text-xs text-indigo-200">WhatsApp, Telegram, Instagram & more</p>
              </div>
              {!isSharing && <i className="fas fa-arrow-right text-white/50 ml-auto group-hover:translate-x-1 transition-transform"></i>}
            </button>

            {/* WhatsApp with link */}
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center gap-4 px-4 py-3.5 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                <i className="fab fa-whatsapp text-lg"></i>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800">Send via WhatsApp</p>
                <p className="text-xs text-slate-400">Includes link to accept online</p>
              </div>
            </button>

            {/* Copy link */}
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-4 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center flex-shrink-0">
                <i className={`fas ${copied ? 'fa-check' : 'fa-link'} text-sm`}></i>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800">{copied ? 'Link Copied!' : 'Copy Shareable Link'}</p>
                <p className="text-xs text-slate-400">Client can view & accept online</p>
              </div>
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full flex items-center gap-4 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center flex-shrink-0">
                {isDownloading
                  ? <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-600 rounded-full animate-spin"></div>
                  : <i className="fas fa-download text-sm"></i>}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800">{isDownloading ? 'Generating...' : 'Download Image'}</p>
                <p className="text-xs text-slate-400">Save PNG to your device</p>
              </div>
            </button>
          </div>

          <button onClick={onClose} className="w-full py-2.5 bg-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProposalShareModal;
