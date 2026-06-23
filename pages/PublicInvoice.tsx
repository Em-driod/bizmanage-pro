import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../constants';
import { toPng } from 'html-to-image';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PublicInvoiceData {
  _id: string;
  invoiceNumber: string;
  businessId: { name: string; currency: string };
  clientId?: { name: string; email: string } | null;
  customClientName?: string | null;
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: string;
  notes?: string;
}

const PublicInvoice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState<PublicInvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [payEmail, setPayEmail] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [showPayForm, setShowPayForm] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const invoiceCardRef = useRef<HTMLDivElement>(null);

  const justPaid = searchParams.get('paid') === 'true';

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/invoices/public/${id}`);
        if (!res.ok) throw new Error('Invoice not found');
        const data = await res.json();
        setInvoice(data);
        if (data.clientId?.email) setPayEmail(data.clientId.email);
      } catch (err: any) {
        setError(
          err?.message?.toLowerCase().includes('failed to fetch')
            ? 'Could not connect to the server. Please check your internet connection and try again.'
            : 'This invoice link is invalid or has expired.'
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payEmail.trim()) { setPayError('Enter your email to continue'); return; }
    setIsPaying(true);
    setPayError('');
    try {
      const res = await fetch(`${API_BASE_URL}/invoices/public/${id}/pay/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: payEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment init failed');
      window.location.href = data.authorization_url;
    } catch (err: any) {
      setPayError(err.message);
    } finally {
      setIsPaying(false);
    }
  };

  const formatMoney = (amount: number, currency = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString()}`;
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoiceCardRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(invoiceCardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `Invoice-${invoice?.invoiceNumber || 'download'}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // silent fail
    } finally {
      setIsDownloading(false);
    }
  };

  const currency = invoice?.businessId?.currency || 'USD';
  const clientName = invoice?.clientId?.name || invoice?.customClientName || 'Client';
  const isPaid = invoice?.status === 'paid' || justPaid;
  const isOverdue = invoice?.status === 'overdue';
  const dueDate = invoice ? new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-rose-500 text-xl"></i>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Invoice Not Found</h2>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Paid Banner */}
        {isPaid && (
          <div className="mb-6 bg-emerald-500 text-white rounded-2xl p-5 flex items-center gap-4 shadow-lg shadow-emerald-200">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <i className="fas fa-check-circle text-lg"></i>
            </div>
            <div>
              <p className="font-black text-sm uppercase tracking-wider">Payment Received</p>
              <p className="text-xs text-emerald-100 mt-0.5">Thank you — this invoice has been settled.</p>
            </div>
          </div>
        )}

        {isOverdue && !isPaid && (
          <div className="mb-6 bg-rose-500 text-white rounded-2xl p-5 flex items-center gap-4 shadow-lg shadow-rose-200">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <i className="fas fa-clock text-lg"></i>
            </div>
            <div>
              <p className="font-black text-sm uppercase tracking-wider">Payment Overdue</p>
              <p className="text-xs text-rose-100 mt-0.5">This invoice is past its due date. Please pay as soon as possible.</p>
            </div>
          </div>
        )}

        {/* Invoice Card */}
        <div ref={invoiceCardRef} className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-700 px-5 sm:px-8 py-6 sm:py-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[3px] text-indigo-200 mb-1">Invoice from</p>
                <h1 className="text-2xl font-black text-white">{invoice.businessId.name}</h1>
              </div>
              <div className="bg-white/15 rounded-2xl px-5 py-3 text-right">
                <p className="text-[10px] font-black uppercase tracking-[2px] text-indigo-200">Invoice</p>
                <p className="text-xl font-black text-white mt-0.5">{invoice.invoiceNumber}</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-8">
            {/* Billed To + Due Date */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[2px] text-slate-400 mb-1">Billed to</p>
                <p className="text-base font-bold text-slate-900">{clientName}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-[2px] text-slate-400 mb-1">Due date</p>
                <p className={`text-base font-bold ${isOverdue && !isPaid ? 'text-rose-600' : 'text-slate-900'}`}>{dueDate}</p>
              </div>
            </div>

            {/* Line Items */}
            <div className="rounded-2xl border border-slate-100 overflow-x-auto mb-6">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[2px] text-slate-400">Description</th>
                    <th className="px-5 py-3 text-center text-[10px] font-black uppercase tracking-[2px] text-slate-400">Qty</th>
                    <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-[2px] text-slate-400">Unit Price</th>
                    <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-[2px] text-slate-400">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {invoice.lineItems.map((item, i) => (
                    <tr key={i}>
                      <td className="px-5 py-4 text-sm text-slate-700">{item.description}</td>
                      <td className="px-5 py-4 text-sm text-slate-600 text-center">{item.quantity}</td>
                      <td className="px-5 py-4 text-sm text-slate-600 text-right">{formatMoney(item.unitPrice, currency)}</td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-900 text-right">{formatMoney(item.total, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-6">
              <div className="w-full sm:w-64 space-y-2">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span>{formatMoney(invoice.subtotal, currency)}</span>
                </div>
                {invoice.tax > 0 && (
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Tax</span>
                    <span>{formatMoney(invoice.tax, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t-2 border-slate-100">
                  <span className="text-base font-black text-slate-900">Total Due</span>
                  <span className="text-lg font-black text-indigo-600">{formatMoney(invoice.total, currency)}</span>
                </div>
              </div>
            </div>

            {invoice.notes && (
              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <p className="text-[10px] font-black uppercase tracking-[2px] text-slate-400 mb-1">Notes</p>
                <p className="text-sm text-slate-600 leading-relaxed">{invoice.notes}</p>
              </div>
            )}

            {/* Share Buttons */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => {
                  const link = window.location.href;
                  const msg = `Hi, please find invoice *${invoice.invoiceNumber}* for *${formatMoney(invoice.total, currency)}* from *${invoice.businessId.name}*.\n\nView & pay here: ${link}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                className="flex-1 py-3 flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 rounded-2xl text-sm font-bold text-emerald-700 transition-colors"
              >
                <i className="fab fa-whatsapp"></i>
                Share on WhatsApp
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="flex-1 py-3 flex items-center justify-center gap-2 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors disabled:opacity-50"
              >
                <i className="fas fa-download text-xs text-slate-400"></i>
                {isDownloading ? 'Saving…' : 'Download'}
              </button>
            </div>

            {/* Pay Button */}
            {!isPaid && (
              <div>
                {!showPayForm ? (
                  <button
                    onClick={() => setShowPayForm(true)}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-sm uppercase tracking-[2px] rounded-2xl shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    <i className="fas fa-lock mr-2"></i>Pay Now — {formatMoney(invoice.total, currency)}
                  </button>
                ) : (
                  <form onSubmit={handlePay} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Your Email</label>
                      <input
                        type="email"
                        value={payEmail}
                        onChange={e => setPayEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                      />
                    </div>
                    {payError && <p className="text-xs text-rose-600 font-medium">{payError}</p>}
                    <button
                      type="submit"
                      disabled={isPaying}
                      className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-sm uppercase tracking-[2px] rounded-2xl shadow-xl shadow-indigo-200 transition-all disabled:opacity-60"
                    >
                      {isPaying ? 'Redirecting to Paystack...' : `Pay ${formatMoney(invoice.total, currency)} securely`}
                    </button>
                    <button type="button" onClick={() => setShowPayForm(false)} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-8 pb-2">
          <p className="text-xs text-slate-400 mb-2">Invoiced with</p>
          <a
            href="https://Morniy-d0nw.onrender.com/#/register"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <span className="w-4 h-4 bg-white/20 rounded flex items-center justify-center flex-shrink-0">
              <span className="w-2 h-2 bg-white rotate-45 block"></span>
            </span>
            Morniy — Run your business for free
          </a>
          <p className="text-[10px] text-slate-300 mt-1.5">Invoices · Proposals · Payroll · More</p>
        </div>
      </div>
    </div>
  );
};

export default PublicInvoice;
