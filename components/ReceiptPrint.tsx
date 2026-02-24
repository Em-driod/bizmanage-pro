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
    };
    client?: Client;
    businessName?: string;
}

const ReceiptPrint: React.FC<ReceiptPrintProps> = ({ invoice, client, businessName }) => {
    const { formatCurrency } = useCurrency();

    if (!invoice) return null;

    return (
        <div className="print-only p-12 bg-white text-slate-900 font-sans" id="receipt-print-area">
            <style dangerouslySetInnerHTML={{
                __html: `
        @media screen {
          .print-only { display: none !important; }
        }
        @media print {
          .print-only { display: block !important; }
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}} />

            <div className="flex justify-between items-start mb-12 border-b-2 border-slate-100 pb-8">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-indigo-600 mb-2">{businessName || 'OPSFLOW BUSINESS'}</h1>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Official Receipt</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Invoice Number</p>
                    <p className="text-2xl font-black text-slate-900">#{invoice.invoiceNumber}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-12">
                <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-4">Billed To</h3>
                    <p className="text-lg font-black text-slate-900">{client?.name || 'Valued Customer'}</p>
                    {client?.email && <p className="text-sm text-slate-500 font-medium">{client.email}</p>}
                    {client?.phone && <p className="text-sm text-slate-500 font-medium">{client.phone}</p>}
                </div>
                <div className="text-right">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-4">Payment Details</h3>
                    <p className="text-sm text-slate-500 font-medium">Date: {new Date().toLocaleDateString()}</p>
                    <p className="text-sm text-slate-500 font-medium">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                    <p className="text-sm font-black text-emerald-600 mt-2 uppercase tracking-widest">Status: PAID</p>
                </div>
            </div>

            <table className="w-full mb-12">
                <thead className="border-b border-slate-200">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="py-4 text-left">Description</th>
                        <th className="py-4 text-center w-24">Qty</th>
                        <th className="py-4 text-right w-32">Unit Price</th>
                        <th className="py-4 text-right w-32">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {invoice.lineItems.map((item, index) => (
                        <tr key={index} className="text-sm">
                            <td className="py-4 font-bold text-slate-800">{item.description}</td>
                            <td className="py-4 text-center font-medium text-slate-500">{item.quantity}</td>
                            <td className="py-4 text-right font-medium text-slate-500">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-4 text-right font-black text-slate-900">{formatCurrency(item.total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-end">
                <div className="w-72 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-400 font-bold uppercase tracking-widest">Subtotal</span>
                        <span className="text-slate-900 font-black">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-400 font-bold uppercase tracking-widest">Tax ({invoice.tax}%)</span>
                        <span className="text-slate-900 font-black">{formatCurrency(invoice.subtotal * (invoice.tax / 100))}</span>
                    </div>
                    <div className="pt-3 border-t-2 border-slate-900 flex justify-between items-center">
                        <span className="text-lg font-black text-slate-900 uppercase tracking-tighter">Grand Total</span>
                        <span className="text-2xl font-black text-indigo-600">{formatCurrency(invoice.total)}</span>
                    </div>
                </div>
            </div>

            {invoice.notes && (
                <div className="mt-12 pt-8 border-t border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] mb-2">Notes</h3>
                    <p className="text-sm text-slate-500 leading-relaxed italic">{invoice.notes}</p>
                </div>
            )}

            <div className="mt-20 text-center">
                <p className="text-sm font-black text-slate-900 mb-1 uppercase tracking-widest">Thank you for your business!</p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[3px]">Generated via OpsFlow Enterprise OS</p>
            </div>
        </div>
    );
};

export default ReceiptPrint;
