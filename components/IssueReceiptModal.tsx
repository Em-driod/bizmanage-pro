import React, { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { Client } from '../types';

interface Transaction {
  _id: string;
  amount: number;
  description: string;
  category: string;
  clientId?: any;
}

interface Props {
  transaction: Transaction;
  client?: Client | null;
  onClose: () => void;
  onCreated: (receipt: any) => void;
}

const IssueReceiptModal: React.FC<Props> = ({ transaction, client, onClose, onCreated }) => {
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const [step, setStep] = useState<'form' | 'share'>('form');
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  const txDate = (transaction as any).createdAt || (transaction as any).date || new Date().toISOString();
  const [form, setForm] = useState({
    payerName: client?.name || '',
    payerEmail: client?.email || '',
    payerPhone: client?.phone || '',
    description: transaction.description || '',
    notes: '',
    date: new Date(txDate).toISOString().split('T')[0],
  });

  const generateImage = async (): Promise<{ dataUrl: string; file: File } | null> => {
    await new Promise(r => setTimeout(r, 150));
    if (!cardRef.current) return null;
    try {
      const dataUrl = await toPng(cardRef.current, { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff' });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `receipt-${receipt?.receiptNumber || 'RCP'}.png`, { type: 'image/png' });
      return { dataUrl, file };
    } catch (e) {
      console.error('Image generation failed', e);
      return null;
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.payerName.trim()) return;
    setSaving(true);
    try {
      const data = await apiRequest<any>('/receipts', {
        method: 'POST',
        body: { ...form, transactionId: transaction._id, amount: transaction.amount, date: form.date },
      });
      setReceipt(data);
      onCreated(data);
      setStep('share');
    } catch (err: any) {
      alert(err.message || 'Failed to create receipt');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const img = await generateImage();
      if (!img) return;
      if (navigator.canShare && navigator.canShare({ files: [img.file] })) {
        await navigator.share({ files: [img.file], title: `Receipt ${receipt?.receiptNumber}` });
      } else {
        // Desktop: download the image
        const a = document.createElement('a');
        a.href = img.dataUrl;
        a.download = `receipt-${receipt?.receiptNumber}.png`;
        a.click();
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        // User cancelled share — that's fine, do nothing
      }
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
      a.download = `receipt-${receipt?.receiptNumber}.png`;
      a.click();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!receipt || !form.payerEmail) return;
    setSendingEmail(true);
    try {
      await apiRequest(`/receipts/${receipt._id}/send-email`, { method: 'POST', body: { email: form.payerEmail } });
      setEmailSent(true);
    } catch {
      alert('Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const publicLink = receipt
    ? `${window.location.origin}${window.location.pathname}#/receipt/${receipt.publicToken}`
    : '';

  const formattedDate = form.date
    ? new Date(form.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const hasPreFill = !!(client?.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <i className="fas fa-receipt text-white text-sm"></i>
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {step === 'form' ? 'Issue Receipt' : `Receipt ${receipt?.receiptNumber}`}
              </h3>
              <p className="text-[11px] text-emerald-100">
                {step === 'form' ? formatCurrency(transaction.amount) : 'Ready to share'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {step === 'form' ? (
            <form onSubmit={handleCreate} className="p-6 space-y-4">

              {/* Amount banner */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center justify-between">
                <p className="text-xs font-bold text-emerald-700">Amount</p>
                <p className="text-lg font-black text-emerald-700">{formatCurrency(transaction.amount)}</p>
              </div>

              {/* Pre-fill notice */}
              {hasPreFill && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                  <i className="fas fa-circle-check text-blue-400 text-xs flex-shrink-0"></i>
                  <p className="text-xs text-blue-600 font-semibold">Pre-filled from <span className="font-black">{client!.name}</span>'s profile. Edit if needed.</p>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Received From *</label>
                <input type="text" required placeholder="Payer's full name or company" value={form.payerName}
                  onChange={e => setForm(f => ({ ...f, payerName: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Email</label>
                  <input type="email" placeholder="payer@email.com" value={form.payerEmail}
                    onChange={e => setForm(f => ({ ...f, payerEmail: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Phone</label>
                  <input type="tel" placeholder="+234..." value={form.payerPhone}
                    onChange={e => setForm(f => ({ ...f, payerPhone: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Payment For *</label>
                <input type="text" required placeholder="e.g. Web design services, Rent payment..." value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Notes</label>
                  <input type="text" placeholder="Optional" value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                  {saving
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Creating...</>
                    : <><i className="fas fa-receipt text-xs"></i> Issue Receipt</>}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6 space-y-4">

              {/* Hidden receipt card for image capture */}
              <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '440px' }} aria-hidden="true">
                <div ref={cardRef} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#0f172a', width: '440px', padding: '0' }}>

                  {/* Top accent bar */}
                  <div style={{ height: '4px', background: 'linear-gradient(90deg, #059669, #10b981, #34d399)' }} />

                  {/* Header */}
                  <div style={{ padding: '32px 36px 24px', background: '#0f172a' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ margin: '0 0 6px', fontSize: '9px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#475569' }}>Official Receipt</p>
                        <p style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.5px' }}>{user?.businessName || 'Morniy Business'}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '9px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#475569' }}>Receipt</p>
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#34d399', letterSpacing: '0.5px' }}>{receipt?.receiptNumber}</p>
                      </div>
                    </div>
                  </div>

                  {/* Amount hero */}
                  <div style={{ margin: '0 36px 24px', background: 'linear-gradient(135deg, #064e3b, #065f46)', borderRadius: '16px', padding: '24px 28px', position: 'relative', overflow: 'hidden' }}>
                    {/* decorative circle */}
                    <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(52,211,153,0.1)' }} />
                    <p style={{ margin: '0 0 6px', fontSize: '9px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(52,211,153,0.7)' }}>Amount Received</p>
                    <p style={{ margin: 0, fontSize: '36px', fontWeight: 900, color: '#ffffff', letterSpacing: '-1px', lineHeight: 1 }}>{formatCurrency(transaction.amount)}</p>
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontSize: '10px', fontWeight: 900 }}>✓</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'rgba(52,211,153,0.8)' }}>Payment Confirmed</p>
                    </div>
                  </div>

                  {/* Divider dots — receipt tear look */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 28px', marginBottom: '0' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#1e293b', flexShrink: 0 }} />
                    <div style={{ flex: 1, borderTop: '2px dashed #1e293b', margin: '0 4px' }} />
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#1e293b', flexShrink: 0 }} />
                  </div>

                  {/* Details */}
                  <div style={{ padding: '20px 36px 28px', background: '#0f172a' }}>
                    {/* From / Date row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: '9px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#475569' }}>Received From</p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#f1f5f9' }}>{form.payerName}</p>
                        {form.payerPhone && <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#64748b' }}>{form.payerPhone}</p>}
                        {form.payerEmail && <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>{form.payerEmail}</p>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '9px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#475569' }}>Date</p>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>{formattedDate}</p>
                      </div>
                    </div>

                    {/* Payment for */}
                    <div style={{ background: '#1e293b', borderRadius: '12px', padding: '14px 18px', marginBottom: form.notes ? '10px' : '0' }}>
                      <p style={{ margin: '0 0 5px', fontSize: '9px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#475569' }}>Payment For</p>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#cbd5e1', lineHeight: '1.5' }}>{form.description}</p>
                    </div>

                    {form.notes && (
                      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '12px 18px' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '9px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#475569' }}>Notes</p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{form.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{ borderTop: '1px solid #1e293b', padding: '14px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontSize: '10px', color: '#334155' }}>Issued via <strong style={{ color: '#10b981' }}>Morniy</strong></p>
                    <p style={{ margin: 0, fontSize: '10px', color: '#334155' }}>{formattedDate}</p>
                  </div>

                </div>
              </div>

              {/* Success badge */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <i className="fas fa-check text-base"></i>
                </div>
                <p className="text-sm font-black text-emerald-800">Receipt {receipt?.receiptNumber} Created</p>
                <p className="text-xs text-emerald-600 mt-0.5">For {form.payerName} · {formatCurrency(transaction.amount)}</p>
              </div>

              {/* Share section */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Send Receipt</p>

                {/* Primary: native share sheet — picks WhatsApp, Telegram, etc. */}
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

                {/* Download */}
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full flex items-center gap-4 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center flex-shrink-0">
                    {isDownloading
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      : <i className="fas fa-download text-sm"></i>}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-800">{isDownloading ? 'Generating...' : 'Download Image'}</p>
                    <p className="text-xs text-slate-400">Save PNG to your device</p>
                  </div>
                </button>

                {/* Email — only if email was provided */}
                {form.payerEmail && (
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
                      <p className="text-xs text-slate-500 truncate">{form.payerEmail}</p>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueReceiptModal;
