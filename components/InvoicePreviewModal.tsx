import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { useCurrency } from '../context/CurrencyContext';

export interface InvoicePreviewData {
    invoiceNumber: string;
    clientName: string;
    businessName: string;
    lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
    subtotal: number;
    tax: number;
    total: number;
    dueDate: string;
    notes?: string;
    status?: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';
    amountPaid?: number;
    balance?: number;
}

// ── Shared invoice card — A4 printed document style ──────────────────────────
export const InvoiceCard: React.FC<{ data: InvoicePreviewData; formatCurrency: (n: number) => string }> = ({ data, formatCurrency }) => {
    const dueDate = new Date(data.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const issueDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const taxAmount = data.subtotal * (data.tax / 100);

    const paymentState: 'paid' | 'partial' | 'unpaid' =
        data.status === 'paid' ? 'paid' : data.status === 'partial' ? 'partial' : 'unpaid';
    const amountPaid = data.amountPaid ?? (paymentState === 'paid' ? data.total : 0);
    const balance = data.balance ?? (paymentState === 'paid' ? 0 : data.total);
    const stamp = {
        paid: { label: 'PAID', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
        partial: { label: 'PARTIALLY PAID', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
        unpaid: { label: 'UNPAID', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    }[paymentState];

    return (
        <div style={{ background: '#ffffff', width: '794px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#1a1a1a' }}>

            {/* Top bar */}
            <div style={{ background: '#111827', padding: '10px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#9ca3af' }}>Official Tax Invoice</span>
                <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '2px', color: '#818cf8' }}>Morniy</span>
            </div>

            {/* Header: business name + INVOICE label */}
            <div style={{ padding: '36px 48px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e5e7eb' }}>
                <div>
                    <h1 style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: 900, color: '#111827', letterSpacing: '-0.5px' }}>{data.businessName}</h1>
                    <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Nigeria</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '36px', fontWeight: 900, color: '#111827', letterSpacing: '-1px', lineHeight: 1 }}>INVOICE</p>
                    <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#6366f1', fontWeight: 700 }}>{data.invoiceNumber}</p>
                    <span style={{
                        display: 'inline-block', padding: '4px 14px', fontSize: '11px', fontWeight: 900,
                        letterSpacing: '2px', color: stamp.color, background: stamp.bg,
                        border: `1.5px solid ${stamp.border}`, borderRadius: '6px',
                    }}>{stamp.label}</span>
                </div>
            </div>

            {/* Bill To + Dates */}
            <div style={{ padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fafafa', borderBottom: '1px solid #e5e7eb' }}>
                <div>
                    <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#9ca3af' }}>Bill To</p>
                    <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#111827' }}>{data.clientName}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '32px' }}>
                        <div>
                            <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#9ca3af' }}>Issue Date</p>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#374151' }}>{issueDate}</p>
                        </div>
                        <div>
                            <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#9ca3af' }}>Due Date</p>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>{dueDate}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Line Items */}
            <div style={{ padding: '0 48px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #111827' }}>
                            <th style={{ padding: '14px 0', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#6b7280', textAlign: 'left' }}>Description</th>
                            <th style={{ padding: '14px 8px', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#6b7280', textAlign: 'center', width: '60px' }}>Qty</th>
                            <th style={{ padding: '14px 8px', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#6b7280', textAlign: 'right', width: '140px' }}>Unit Price</th>
                            <th style={{ padding: '14px 0', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#6b7280', textAlign: 'right', width: '140px' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.lineItems.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '14px 0', fontSize: '14px', color: '#374151' }}>{item.description}</td>
                                <td style={{ padding: '14px 8px', fontSize: '14px', color: '#374151', textAlign: 'center' }}>{item.quantity}</td>
                                <td style={{ padding: '14px 8px', fontSize: '14px', color: '#374151', textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                                <td style={{ padding: '14px 0', fontSize: '14px', fontWeight: 700, color: '#111827', textAlign: 'right' }}>{formatCurrency(item.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div style={{ padding: '8px 48px 36px', display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: '280px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px', color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>
                        <span>Subtotal</span><span>{formatCurrency(data.subtotal)}</span>
                    </div>
                    {data.tax > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px', color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>
                            <span>VAT ({data.tax}%)</span><span>{formatCurrency(taxAmount)}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#111827', color: '#fff', marginTop: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>{paymentState === 'partial' ? 'Invoice Total' : 'Total Due'}</span>
                        <span style={{ fontSize: '20px', fontWeight: 900, color: '#a5b4fc' }}>{formatCurrency(data.total)}</span>
                    </div>
                    {paymentState === 'partial' && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px', color: '#059669', fontWeight: 700 }}>
                                <span>Amount Paid</span><span>− {formatCurrency(amountPaid)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fffbeb', border: '1.5px solid #fde68a', marginTop: '4px', borderRadius: '4px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#92400e' }}>Balance Due</span>
                                <span style={{ fontSize: '18px', fontWeight: 900, color: '#d97706' }}>{formatCurrency(balance)}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {data.notes && (
                <div style={{ margin: '0 48px 28px', padding: '14px 16px', borderLeft: '3px solid #6366f1', background: '#f5f3ff' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#6366f1' }}>Notes</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#4b5563', lineHeight: 1.6 }}>{data.notes}</p>
                </div>
            )}

            {/* Footer */}
            <div style={{ background: '#f9fafb', borderTop: '2px solid #e5e7eb', padding: '18px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#374151' }}>Thank you for your business!</p>
                <p style={{ margin: 0, fontSize: '10px', color: '#9ca3af', letterSpacing: '1px' }}>Generated by <strong style={{ color: '#6366f1' }}>Morniy</strong></p>
            </div>
        </div>
    );
};

// ── Hook: generate PNG from invoice data ──────────────────────────────────────
export const useInvoicePng = () => {
    const { formatCurrency } = useCurrency();

    const generatePng = async (data: InvoicePreviewData): Promise<string> => {
        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;left:-9999px;top:-9999px;z-index:-1;';
        document.body.appendChild(container);

        const React = await import('react');
        const { createRoot } = await import('react-dom/client');
        const { CurrencyProvider } = await import('../context/CurrencyContext');

        const root = createRoot(container);
        await new Promise<void>(resolve => {
            root.render(
                React.createElement(CurrencyProvider, null,
                    React.createElement(InvoiceCard, { data, formatCurrency })
                )
            );
            setTimeout(resolve, 150);
        });

        const cardEl = container.firstElementChild as HTMLElement;
        const dataUrl = await toPng(cardEl, { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff' });
        root.unmount();
        document.body.removeChild(container);
        return dataUrl;
    };

    return { generatePng, formatCurrency };
};

// ── Full-screen preview modal ─────────────────────────────────────────────────
interface InvoicePreviewModalProps {
    data: InvoicePreviewData;
    onClose: () => void;
}

const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({ data, onClose }) => {
    const { formatCurrency } = useCurrency();
    const cardRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        try {
            const dataUrl = await toPng(cardRef.current, { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `invoice-${data.invoiceNumber}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Download failed:', err);
            alert('Could not generate image. Try printing instead.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handlePrint = () => {
        setIsPrinting(true);
        const printWindow = window.open('', '_blank', 'width=860,height=1000');
        if (!printWindow || !cardRef.current) { setIsPrinting(false); return; }
        const cardHtml = cardRef.current.outerHTML;
        printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; padding: 24px; background: #fff; font-family: sans-serif; }
    @media print {
      body { padding: 0; }
      html, body { width: 210mm; }
    }
  </style>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css" />
</head>
<body>${cardHtml}</body>
</html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); setIsPrinting(false); }, 600);
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-sm">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/10 flex-shrink-0">
                <p className="text-white font-bold text-sm">Invoice {data.invoiceNumber}</p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                    >
                        {isDownloading
                            ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Generating...</>
                            : <><i className="fas fa-download text-xs"></i> Download PNG</>
                        }
                    </button>
                    <button
                        onClick={handlePrint}
                        disabled={isPrinting}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                    >
                        {isPrinting
                            ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Preparing...</>
                            : <><i className="fas fa-file-pdf text-xs"></i> Save as PDF</>
                        }
                    </button>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            </div>

            {/* Preview */}
            <div className="flex-1 overflow-y-auto flex items-start justify-center py-8 px-4">
                <div ref={cardRef}>
                    <InvoiceCard data={data} formatCurrency={formatCurrency} />
                </div>
            </div>
        </div>
    );
};

export default InvoicePreviewModal;
