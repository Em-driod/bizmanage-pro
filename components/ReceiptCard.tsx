import React, { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import QRCode from 'qrcode';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

export interface ReceiptData {
  _id: string;
  receiptNumber: string;
  payerName: string;
  payerEmail?: string;
  payerPhone?: string;
  amount: number;
  currency?: string;
  date: string;
  notes?: string;
  publicToken: string;
  items: { description: string; amount: number }[];
}

interface Props {
  receipt: ReceiptData;
  businessName?: string;
  onClose: () => void;
}

const ReceiptCard: React.FC<Props> = ({ receipt, businessName, onClose }) => {
  const { formatCurrency } = useCurrency();
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const cardRef = useRef<HTMLDivElement>(null);

  const items = receipt.items?.length ? receipt.items : [{ description: receipt.payerName, amount: receipt.amount }];
  const publicLink = `${window.location.origin}/receipt/${receipt.publicToken}`;
  const formattedDate = new Date(receipt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    QRCode.toDataURL(publicLink, { width: 160, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [publicLink]);

  const generateImage = async (): Promise<{ dataUrl: string; file: File } | null> => {
    await new Promise(r => setTimeout(r, 150));
    if (!cardRef.current) return null;
    try {
      const dataUrl = await toPng(cardRef.current, { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff' });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `receipt-${receipt.receiptNumber}.png`, { type: 'image/png' });
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
        await navigator.share({ files: [img.file], title: `Receipt ${receipt.receiptNumber}` });
      } else {
        const a = document.createElement('a');
        a.href = img.dataUrl;
        a.download = `receipt-${receipt.receiptNumber}.png`;
        a.click();
      }
    } catch (e: any) {
      // User cancelled share — that's fine, do nothing
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
      a.download = `receipt-${receipt.receiptNumber}.png`;
      a.click();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!receipt.payerEmail) return;
    setSendingEmail(true);
    try {
      await apiRequest(`/receipts/${receipt._id}/send-email`, { method: 'POST', body: { email: receipt.payerEmail } });
      setEmailSent(true);
    } catch {
      alert('Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="p-6 space-y-4 print:hidden">

      {/* Hidden receipt card for image capture */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '460px' }} aria-hidden="true">
        <div ref={cardRef} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#0f172a', width: '460px', padding: '0' }}>
          <div style={{ height: '5px', background: 'linear-gradient(90deg, #059669, #10b981, #34d399)' }} />

          <div style={{ padding: '32px 36px 22px', background: '#0f172a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: '9px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#475569' }}>Official Receipt</p>
                <p style={{ margin: 0, fontSize: '19px', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.5px' }}>{businessName || 'Morniy Business'}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0 0 4px', fontSize: '9px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#475569' }}>Receipt No.</p>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 900, color: '#34d399', letterSpacing: '0.5px', fontFamily: 'monospace' }}>{receipt.receiptNumber}</p>
              </div>
            </div>
          </div>

          <div style={{ margin: '0 36px 22px', background: 'linear-gradient(135deg, #064e3b, #065f46)', borderRadius: '16px', padding: '22px 28px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(52,211,153,0.1)' }} />
            <p style={{ margin: '0 0 6px', fontSize: '9px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(52,211,153,0.7)' }}>Total Amount Received</p>
            <p style={{ margin: 0, fontSize: '34px', fontWeight: 900, color: '#ffffff', letterSpacing: '-1px', lineHeight: 1 }}>{formatCurrency(receipt.amount)}</p>
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: '10px', fontWeight: 900 }}>✓</span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'rgba(52,211,153,0.8)' }}>Payment Confirmed</p>
            </div>
          </div>

          <div style={{ padding: '0 36px 18px', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '9px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#475569' }}>Received From</p>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#f1f5f9' }}>{receipt.payerName}</p>
              {receipt.payerPhone && <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#64748b' }}>{receipt.payerPhone}</p>}
              {receipt.payerEmail && <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>{receipt.payerEmail}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 4px', fontSize: '9px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#475569' }}>Date</p>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>{formattedDate}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', padding: '0 28px', marginBottom: '0' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#1e293b', flexShrink: 0 }} />
            <div style={{ flex: 1, borderTop: '2px dashed #1e293b', margin: '0 4px' }} />
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#1e293b', flexShrink: 0 }} />
          </div>

          <div style={{ padding: '20px 36px 8px', background: '#0f172a' }}>
            <p style={{ margin: '0 0 10px', fontSize: '9px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#475569' }}>
              {items.length} Item{items.length !== 1 ? 's' : ''}
            </p>
            <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden' }}>
              {items.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', gap: '12px',
                  padding: '12px 16px',
                  borderBottom: i < items.length - 1 ? '1px solid #334155' : 'none',
                }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#cbd5e1', lineHeight: '1.4' }}>{item.description}</span>
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#f1f5f9', whiteSpace: 'nowrap' }}>{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {receipt.notes && (
            <div style={{ padding: '14px 36px 0' }}>
              <div style={{ background: '#1e293b', borderRadius: '12px', padding: '12px 18px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '9px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#475569' }}>Notes</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{receipt.notes}</p>
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px solid #1e293b', marginTop: '22px', padding: '18px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontSize: '10px', color: '#334155' }}>Issued via <strong style={{ color: '#10b981' }}>Morniy</strong></p>
              <p style={{ margin: '3px 0 0', fontSize: '9px', color: '#334155' }}>Scan to verify this receipt</p>
            </div>
            {qrDataUrl && (
              <img src={qrDataUrl} alt="Verify receipt QR" style={{ width: '52px', height: '52px', borderRadius: '8px', background: '#fff', padding: '4px' }} />
            )}
          </div>
        </div>
      </div>

      {/* Summary badge */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
          <i className="fas fa-receipt text-base"></i>
        </div>
        <p className="text-sm font-black text-emerald-800">Receipt {receipt.receiptNumber}</p>
        <p className="text-xs text-emerald-600 mt-0.5">For {receipt.payerName} · {formatCurrency(receipt.amount)} · {items.length} item{items.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Share &amp; Print</p>

        <button
          onClick={handleShare}
          disabled={isSharing}
          className="w-full flex items-center gap-4 px-4 py-3.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-60 group"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center flex-shrink-0">
            {isSharing
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              : <i className="fas fa-share-nodes text-base"></i>}
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-white">{isSharing ? 'Generating image...' : 'Share Receipt Image'}</p>
            <p className="text-xs text-emerald-100/80">WhatsApp, Telegram, Email & more</p>
          </div>
          {!isSharing && <i className="fas fa-arrow-right text-white/50 ml-auto group-hover:translate-x-1 transition-transform"></i>}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center flex-shrink-0">
              {isDownloading
                ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                : <i className="fas fa-download text-xs"></i>}
            </div>
            <p className="text-xs font-bold text-slate-800 text-left">{isDownloading ? 'Generating…' : 'Download'}</p>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center flex-shrink-0">
              <i className="fas fa-print text-xs"></i>
            </div>
            <p className="text-xs font-bold text-slate-800 text-left">Print</p>
          </button>
        </div>

        {receipt.payerEmail && (
          <button
            onClick={handleSendEmail}
            disabled={sendingEmail || emailSent}
            className="w-full flex items-center gap-4 px-4 py-3.5 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-60"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
              {emailSent ? <i className="fas fa-check text-sm"></i> : sendingEmail ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="fas fa-envelope text-sm"></i>}
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-slate-800">{emailSent ? 'Email Sent!' : 'Send via Email'}</p>
              <p className="text-xs text-slate-500 truncate">{receipt.payerEmail}</p>
            </div>
          </button>
        )}
      </div>

      <a href={publicLink} target="_blank" rel="noreferrer"
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition-colors">
        <i className="fas fa-eye text-xs"></i> View Full Receipt Page
      </a>

      <button onClick={onClose} className="w-full py-2.5 bg-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">
        Done
      </button>

      {/* Printable version — hidden on screen, shown only via @media print */}
      <div className="print-only p-12 bg-white text-slate-900 font-sans" id="receipt-card-print-area">
        <style dangerouslySetInnerHTML={{
          __html: `
            @media screen { .print-only { display: none !important; } }
            @media print {
              .print-only { display: block !important; }
              body * { visibility: hidden; }
              #receipt-card-print-area, #receipt-card-print-area * { visibility: visible; }
              #receipt-card-print-area { position: absolute; left: 0; top: 0; width: 100%; }
            }
          `
        }} />

        <div className="flex justify-between items-start mb-10 border-b-2 border-slate-100 pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-emerald-700 mb-1">{businessName || 'Morniy Business'}</h1>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Official Receipt</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Receipt No.</p>
            <p className="text-xl font-black text-slate-900">{receipt.receiptNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-1">Received From</p>
            <p className="text-base font-bold text-slate-900">{receipt.payerName}</p>
            {receipt.payerEmail && <p className="text-sm text-slate-500">{receipt.payerEmail}</p>}
            {receipt.payerPhone && <p className="text-sm text-slate-500">{receipt.payerPhone}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-1">Date</p>
            <p className="text-base font-bold text-slate-900">{formattedDate}</p>
            <p className="text-sm font-black text-emerald-600 mt-2 uppercase tracking-widest">Paid in Full</p>
          </div>
        </div>

        <table className="w-full mb-10">
          <thead className="border-b border-slate-200">
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="py-3 text-left">Description</th>
              <th className="py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item, i) => (
              <tr key={i} className="text-sm">
                <td className="py-3 font-bold text-slate-800">{item.description}</td>
                <td className="py-3 text-right font-black text-slate-900">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-12">
          <div className="w-64 pt-3 border-t-2 border-slate-900 flex justify-between items-center">
            <span className="text-base font-black text-slate-900 uppercase tracking-tighter">Total</span>
            <span className="text-xl font-black text-emerald-700">{formatCurrency(receipt.amount)}</span>
          </div>
        </div>

        {receipt.notes && (
          <div className="mb-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-2">Notes</p>
            <p className="text-sm text-slate-600 leading-relaxed italic">{receipt.notes}</p>
          </div>
        )}

        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[3px] text-center">Generated via Morniy</p>
      </div>
    </div>
  );
};

export default ReceiptCard;
