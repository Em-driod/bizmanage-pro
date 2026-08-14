import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../constants';
import { toPng } from 'html-to-image';

interface ReceiptData {
  receiptNumber: string;
  payerName: string;
  payerEmail?: string;
  amount: number;
  currency: string;
  description: string;
  date: string;
  notes?: string;
  items?: { description: string; amount: number; quantity?: number }[];
}

const lineParts = (item: { amount: number; quantity?: number }) => {
  const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
  return { qty, unitPrice: item.amount / qty };
};

interface BusinessData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

const PublicReceipt: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/receipts/public/${token}`)
      .then(r => r.json())
      .then(d => { setReceipt(d.receipt); setBusiness(d.business); })
      .catch(() => setError('Receipt not found'))
      .finally(() => setLoading(false));
  }, [token]);

  const formatAmount = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: currency || 'NGN', minimumFractionDigits: 0 }).format(amount);

  const handleSaveImage = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const url = await toPng(cardRef.current, { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff' });
      const a = document.createElement('a'); a.href = url; a.download = `receipt-${receipt?.receiptNumber}.png`; a.click();
    } finally { setIsDownloading(false); }
  };

  const handlePrint = () => {
    if (!cardRef.current) return;
    const w = window.open('', '_blank', 'width=860,height=1000');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${receipt?.receiptNumber}</title>
      <style>@page{size:A4;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;padding:24px;background:#fff;font-family:sans-serif}</style>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css"/>
      </head><body>${cardRef.current.outerHTML}</body></html>`);
    w.document.close(); w.focus(); setTimeout(() => { w.print(); }, 600);
  };

  const handleShare = async () => {
    const link = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `Receipt ${receipt?.receiptNumber}`, url: link });
    } else {
      await navigator.clipboard.writeText(link);
      alert('Link copied!');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
    </div>
  );

  if (error || !receipt) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-slate-500 font-medium">{error || 'Receipt not found'}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      {/* Action bar */}
      <div className="max-w-lg mx-auto mb-4 flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Official Receipt</p>
        <div className="flex items-center gap-2">
          <button onClick={handleShare} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all">
            <i className="fas fa-share-nodes text-xs"></i> Share
          </button>
          <button onClick={handleSaveImage} disabled={isDownloading} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all">
            <i className="fas fa-image text-xs"></i> {isDownloading ? 'Saving...' : 'Image'}
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm transition-all">
            <i className="fas fa-file-pdf text-xs"></i> PDF
          </button>
        </div>
      </div>

      {/* Receipt card */}
      <div ref={cardRef} className="relative max-w-lg mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Ink stamp */}
        <div className="absolute top-24 right-8 w-24 h-24 rounded-full border-[3px] border-double border-rose-600/50 flex items-center justify-center rotate-[-16deg] pointer-events-none z-10">
          <div className="flex flex-col items-center">
            <span className="text-sm font-black text-rose-600/75 tracking-wider">PAID</span>
            <span className="text-[6px] font-bold text-rose-600/60 tracking-[2px] mt-0.5">MORNIY VERIFIED</span>
          </div>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 px-8 py-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-1">Receipt from</p>
              <h1 className="text-2xl font-black text-white">{business?.name}</h1>
              {business?.email && <p className="text-sm text-emerald-100 mt-1">{business.email}</p>}
              {business?.phone && <p className="text-sm text-emerald-100">{business.phone}</p>}
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 text-right">
              <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">Receipt No.</p>
              <p className="text-xl font-black text-white mt-1">{receipt.receiptNumber}</p>
            </div>
          </div>
        </div>

        {/* Amount highlight */}
        <div className="bg-emerald-50 border-b border-emerald-100 px-8 py-6 text-center">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Amount Received</p>
          <p className="text-4xl font-black text-emerald-700">{formatAmount(receipt.amount, receipt.currency)}</p>
        </div>

        {/* Details */}
        <div className="px-8 py-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Received from</p>
              <p className="text-sm font-bold text-slate-800">{receipt.payerName}</p>
              {receipt.payerEmail && <p className="text-xs text-slate-500 mt-0.5">{receipt.payerEmail}</p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
              <p className="text-sm font-bold text-slate-800">
                {new Date(receipt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              {receipt.items?.length ? `${receipt.items.length} Item${receipt.items.length !== 1 ? 's' : ''}` : 'Payment For'}
            </p>
            {receipt.items?.length ? (
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                {receipt.items.map((item, i) => {
                  const { qty, unitPrice } = lineParts(item);
                  return (
                    <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-slate-50' : ''}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{item.description}</p>
                        {qty > 1 && <p className="text-[11px] text-slate-400">{qty} × {formatAmount(unitPrice, receipt.currency)}</p>}
                      </div>
                      <p className="text-sm font-black text-slate-900 shrink-0 ml-3">{formatAmount(item.amount, receipt.currency)}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-700 leading-relaxed">{receipt.description}</p>
            )}
          </div>

          {receipt.notes && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notes</p>
              <p className="text-sm text-slate-600 leading-relaxed">{receipt.notes}</p>
            </div>
          )}

          {/* Confirmation stamp */}
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
              <i className="fas fa-check text-sm"></i>
            </div>
            <div>
              <p className="text-xs font-black text-emerald-700">Payment Confirmed</p>
              <p className="text-[11px] text-emerald-600">This is an official receipt issued by {business?.name}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400">Powered by <span className="font-bold text-slate-600">Morniy</span></p>
        </div>
      </div>
    </div>
  );
};

export default PublicReceipt;
