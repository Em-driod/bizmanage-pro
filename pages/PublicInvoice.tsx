import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../constants';
import { toPng } from 'html-to-image';
import BrandMark from '../components/BrandMark';
import ScrollRow from '../components/ScrollRow';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PublicInvoiceData {
  _id: string;
  invoiceNumber: string;
  businessId: {
    name: string;
    currency: string;
    profile?: {
      logoImage?: string;
      accentColor?: string;
      email?: string;
      whatsapp?: string;
      location?: string;
      bankName?: string;
      accountNumber?: string;
      accountName?: string;
      bankName2?: string;
      accountNumber2?: string;
      accountName2?: string;
    };
  };
  clientId?: { name: string; email: string } | null;
  customClientName?: string | null;
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void';
  amountPaid?: number;
  balance?: number;
  dueDate: string;
  notes?: string;
  // Short code the client puts in the transfer description, e.g. "IV3HX9QT".
  paymentCode?: string;
  customerMarkedPaidAt?: string | null;
}

// The business's brand colour as the header gradient; falls back to the default
// indigo classes when no valid colour is set.
const brandHeader = (accent?: string): React.CSSProperties | undefined =>
  accent && /^#[0-9a-f]{6}$/i.test(accent) ? { backgroundImage: `linear-gradient(135deg, ${accent}, ${accent}cc)` } : undefined;

const PublicInvoice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState<PublicInvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [sendingNudge, setSendingNudge] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const invoiceCardRef = useRef<HTMLDivElement>(null);

  const justPaid = searchParams.get('paid') === 'true';

  const loadInvoice = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`${API_BASE_URL}/invoices/public/${id}`);
      if (!res.ok) throw new Error('Invoice not found');
      setInvoice(await res.json());
      setError('');
    } catch (err: any) {
      if (silent) return;
      setError(
        err?.message?.toLowerCase().includes('failed to fetch')
          ? 'Could not connect to the server. Please check your internet connection and try again.'
          : 'This invoice link is invalid or has expired.'
      );
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  // While money is still owed, check now and then so the page turns "paid"
  // by itself once the business's bank sees the transfer.
  const owing = !!invoice && !['paid', 'void'].includes(invoice.status);
  useEffect(() => {
    if (!owing) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') loadInvoice(true);
    }, 15000);
    return () => clearInterval(t);
  }, [owing, loadInvoice]);

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
    setSendingNudge(true);
    try {
      const res = await fetch(`${API_BASE_URL}/invoices/public/${id}/sent`, { method: 'POST' });
      if (res.ok) setInvoice(await res.json());
    } finally {
      setSendingNudge(false);
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
  const isPartial = invoice?.status === 'partial' && !isPaid;
  const isOverdue = invoice?.status === 'overdue';
  const balanceDue = invoice ? (invoice.balance ?? (isPaid ? 0 : invoice.total)) : 0;
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

        {isPartial && (
          <div className="mb-6 bg-amber-500 text-white rounded-2xl p-5 flex items-center gap-4 shadow-lg shadow-amber-200">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <i className="fas fa-hourglass-half text-lg"></i>
            </div>
            <div>
              <p className="font-black text-sm uppercase tracking-wider">Partially Paid</p>
              <p className="text-xs text-amber-100 mt-0.5">
                {formatMoney(invoice!.amountPaid ?? 0, currency)} received — {formatMoney(balanceDue, currency)} still due.
              </p>
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
          <div
            className="bg-gradient-to-r from-indigo-600 to-violet-700 px-5 sm:px-8 py-6 sm:py-8"
            style={brandHeader(invoice.businessId.profile?.accentColor)}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <BrandMark
                  name={invoice.businessId.name}
                  logo={invoice.businessId.profile?.logoImage}
                  color="rgba(255,255,255,0.18)"
                  size={56}
                  radius={16}
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[3px] text-white/70 mb-1">Invoice from</p>
                  <h1 className="text-2xl font-black text-white break-words">{invoice.businessId.name}</h1>
                  {(invoice.businessId.profile?.email || invoice.businessId.profile?.whatsapp) && (
                    <p className="text-xs text-white/75 mt-0.5">
                      {[invoice.businessId.profile?.email, invoice.businessId.profile?.whatsapp].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
              <div className="bg-white/15 rounded-2xl px-5 py-3 text-right">
                <p className="text-[10px] font-black uppercase tracking-[2px] text-white/70">Invoice</p>
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
            <ScrollRow wrapperClassName="mb-6" className="rounded-2xl border border-slate-100">
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
            </ScrollRow>

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
                  <span className="text-base font-black text-slate-900">{isPartial ? 'Invoice Total' : 'Total Due'}</span>
                  <span className={`text-lg font-black ${isPartial ? 'text-slate-500' : 'text-indigo-600'}`}>{formatMoney(invoice.total, currency)}</span>
                </div>
                {isPartial && (
                  <>
                    <div className="flex justify-between text-sm text-emerald-600 font-semibold">
                      <span>Amount Paid</span>
                      <span>− {formatMoney(invoice.amountPaid ?? 0, currency)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-100">
                      <span className="text-base font-black text-slate-900">Balance Due</span>
                      <span className="text-lg font-black text-amber-600">{formatMoney(balanceDue, currency)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {invoice.notes && (
              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <p className="text-[10px] font-black uppercase tracking-[2px] text-slate-400 mb-1">Notes</p>
                <p className="text-sm text-slate-600 leading-relaxed">{invoice.notes}</p>
              </div>
            )}

            {/* Pay by bank transfer — straight into the business's own account */}
            {!isPaid && invoice.status !== 'void' && (() => {
              const p = invoice.businessId.profile || {};
              const accounts = [
                { bankName: p.bankName, accountNumber: p.accountNumber, accountName: p.accountName },
                { bankName: p.bankName2, accountNumber: p.accountNumber2, accountName: p.accountName2 },
              ].filter((a) => a.accountNumber);
              const accent = p.accentColor && /^#[0-9a-f]{6}$/i.test(p.accentColor) ? p.accentColor : '#4f46e5';
              const CopyBtn = ({ k, value }: { k: string; value: string }) => (
                <button
                  onClick={() => copy(k, value)}
                  className="shrink-0 h-8 px-3 rounded-lg text-[11px] font-black flex items-center gap-1.5 transition-colors"
                  style={copied === k ? { background: '#ecfdf5', color: '#059669' } : { background: accent + '14', color: accent }}
                >
                  <i className={`fas ${copied === k ? 'fa-check' : 'fa-copy'} text-[10px]`} />
                  {copied === k ? 'Copied' : 'Copy'}
                </button>
              );

              if (accounts.length === 0) {
                return (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 mb-6 text-center">
                    <p className="text-sm font-bold text-slate-700">How to pay</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Please contact {invoice.businessId.name} for their payment details
                      {p.whatsapp || p.email ? ` — ${[p.whatsapp, p.email].filter(Boolean).join(' · ')}` : ''}.
                    </p>
                  </div>
                );
              }

              return (
                <div className="rounded-2xl border border-slate-200 overflow-hidden mb-6">
                  <div className="px-5 py-4 text-center border-b border-slate-100" style={{ background: accent + '0d' }}>
                    <p className="text-[10px] font-black uppercase tracking-[2px]" style={{ color: accent }}>Pay by bank transfer</p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <p className="text-2xl sm:text-3xl font-black text-slate-900">{formatMoney(balanceDue, currency)}</p>
                      <CopyBtn k="amount" value={String(balanceDue)} />
                    </div>
                    {isPartial && <p className="text-xs text-slate-500 mt-0.5">Remaining balance — part already paid</p>}
                  </div>

                  <div className="p-4 sm:p-5 space-y-3">
                    {accounts.map((a, i) => (
                      <div key={i} className="rounded-xl bg-slate-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{a.bankName || 'Bank'}</p>
                        <div className="flex items-center justify-between gap-3 mt-1">
                          <p className="text-lg sm:text-xl font-black text-slate-900 tracking-wider">{a.accountNumber}</p>
                          <CopyBtn k={`acc${i}`} value={a.accountNumber || ''} />
                        </div>
                        {a.accountName && <p className="text-sm font-semibold text-slate-600 mt-0.5">{a.accountName}</p>}
                      </div>
                    ))}

                    {invoice.paymentCode && (
                      <div className="rounded-xl border-2 border-dashed p-4" style={{ borderColor: accent + '55', background: accent + '08' }}>
                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>
                          Put this in the transfer description
                        </p>
                        <div className="flex items-center justify-between gap-3 mt-1">
                          <p className="text-xl sm:text-2xl font-black tracking-[0.15em] text-slate-900 font-mono">{invoice.paymentCode}</p>
                          <CopyBtn k="code" value={invoice.paymentCode} />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1.5">It links your payment to this invoice so it’s confirmed automatically.</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3">
                      <span className="relative flex w-2.5 h-2.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                        <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-amber-500" />
                      </span>
                      <p className="text-xs font-semibold text-amber-800">This page updates by itself once your payment arrives.</p>
                    </div>

                    {invoice.customerMarkedPaidAt ? (
                      <p className="text-[11px] text-slate-400 text-center">
                        <i className="fas fa-check mr-1" />We’ve told {invoice.businessId.name} you’ve paid. They’ll confirm shortly.
                      </p>
                    ) : (
                      <button
                        onClick={sayPaid}
                        disabled={sendingNudge}
                        className="w-full h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {sendingNudge ? 'Letting them know…' : 'I’ve sent the money'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

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

          </div>
        </div>

        <div className="text-center mt-8 pb-2">
          <p className="text-xs text-slate-400 mb-2">Invoiced with</p>
          <a
            href="/register"
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
