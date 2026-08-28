import React from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { Client } from '../types';

interface ReceiptPrintProps {
    invoice: {
        invoiceNumber: string;
        lineItems: Array<{
            description: string;
            quantity: number;
            unitPrice: number;
            total: number;
        }>;
        subtotal: number;
        tax: number;
        total: number;
        notes?: string;
        dueDate: string;
        status?: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';
        amountPaid?: number;
        balance?: number;
    };
    client?: Client;
    businessName?: string;
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
    paid: { label: 'PAID', cls: 'text-emerald-600' },
    partial: { label: 'PARTIALLY PAID', cls: 'text-amber-600' },
    overdue: { label: 'OVERDUE', cls: 'text-rose-600' },
    sent: { label: 'UNPAID', cls: 'text-rose-600' },
    draft: { label: 'UNPAID', cls: 'text-rose-600' },
};

const ReceiptPrint: React.FC<ReceiptPrintProps> = ({ invoice, client, businessName }) => {
    const { formatCurrency } = useCurrency();

    if (!invoice) return null;

    // Trust an explicit status; otherwise infer from what was paid.
    const paid = invoice.amountPaid ?? (invoice.status === 'paid' ? invoice.total : 0);
    const balance = invoice.balance ?? Math.max(0, invoice.total - paid);
    const status =
        invoice.status ?? (paid <= 0 ? 'sent' : paid >= invoice.total ? 'paid' : 'partial');
    const statusStyle = STATUS_STYLE[status] ?? STATUS_STYLE.sent;
    const isSettled = status === 'paid';
    const hasPartPayment = !isSettled && paid > 0;
    const docLabel = isSettled ? 'Official Receipt' : 'Invoice';

    return (
        <div className="print-only bg-white text-slate-900 font-sans" id="receipt-print-area">
            <style dangerouslySetInnerHTML={{
                __html: `
        @media screen {
          .print-only { display: none !important; }
        }
        @media print {
          @page { size: A4; margin: 12mm 14mm; }
          html, body { height: auto !important; }
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 182mm;
            margin: 0 auto;
            font-size: 12px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #receipt-print-area table { page-break-inside: auto; }
          #receipt-print-area tr { page-break-inside: avoid; }
        }
      `}} />

            <div className="flex justify-between items-start mb-6 border-b-2 border-slate-100 pb-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-indigo-600 mb-0.5">{businessName || 'Morniy BUSINESS'}</h1>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">{docLabel}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Invoice Number</p>
                    <p className="text-lg font-black text-slate-900">#{invoice.invoiceNumber}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-6">
                <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-2">Billed To</h3>
                    <p className="text-base font-black text-slate-900">{client?.name || 'Valued Customer'}</p>
                    {client?.email && <p className="text-xs text-slate-500 font-medium">{client.email}</p>}
                    {client?.phone && <p className="text-xs text-slate-500 font-medium">{client.phone}</p>}
                </div>
                <div className="text-right">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-2">Payment Details</h3>
                    <p className="text-xs text-slate-500 font-medium">Date: {new Date().toLocaleDateString()}</p>
                    <p className="text-xs text-slate-500 font-medium">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                    <p className={`text-xs font-black mt-1.5 uppercase tracking-widest ${statusStyle.cls}`}>Status: {statusStyle.label}</p>
                    {hasPartPayment && (
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {formatCurrency(paid)} paid of {formatCurrency(invoice.total)}
                        </p>
                    )}
                </div>
            </div>

            <table className="w-full mb-6">
                <thead className="border-b border-slate-200">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="py-2 text-left">Description</th>
                        <th className="py-2 text-center w-20">Qty</th>
                        <th className="py-2 text-right w-32">Unit Price</th>
                        <th className="py-2 text-right w-32">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {invoice.lineItems.map((item, index) => (
                        <tr key={index} className="text-xs">
                            <td className="py-2 font-bold text-slate-800">{item.description}</td>
                            <td className="py-2 text-center font-medium text-slate-500">{item.quantity}</td>
                            <td className="py-2 text-right font-medium text-slate-500">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-2 text-right font-black text-slate-900">{formatCurrency(item.total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-end">
                <div className="w-64 space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-widest">Subtotal</span>
                        <span className="text-slate-900 font-black">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-widest">Tax ({invoice.tax}%)</span>
                        <span className="text-slate-900 font-black">{formatCurrency(invoice.subtotal * (invoice.tax / 100))}</span>
                    </div>
                    <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-center">
                        <span className="text-base font-black text-slate-900 uppercase tracking-tighter">Grand Total</span>
                        <span className="text-xl font-black text-indigo-600">{formatCurrency(invoice.total)}</span>
                    </div>
                    {!isSettled && (
                        <>
                            {hasPartPayment && (
                                <div className="flex justify-between text-xs pt-1.5">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest">Amount Paid</span>
                                    <span className="text-emerald-600 font-black">− {formatCurrency(paid)}</span>
                                </div>
                            )}
                            <div className={`flex justify-between items-center bg-amber-50 border border-amber-200 rounded px-3 py-1.5 ${hasPartPayment ? '' : 'mt-1.5'}`}>
                                <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Balance Due</span>
                                <span className="text-base font-black text-amber-600">{formatCurrency(balance)}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {invoice.notes && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-1">Notes</h3>
                    <p className="text-xs text-slate-500 leading-relaxed italic">{invoice.notes}</p>
                </div>
            )}

            <div className="mt-10 text-center">
                <p className="text-xs font-black text-slate-900 mb-0.5 uppercase tracking-widest">Thank you for your business!</p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[3px]">Generated via Morniy</p>
            </div>
        </div>
    );
};

export default ReceiptPrint;
