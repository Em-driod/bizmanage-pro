import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { usePrint } from '../context/PrintContext';
import InvoiceFormModal from '../components/InvoiceFormModal';
import ScanInvoiceModal from '../components/ScanInvoiceModal';
import { ScannedInvoice, Client } from '../types';

// Define the Invoice type according to the backend model
interface Invoice {
    _id: string;
    invoiceNumber: string;
    clientId?: { _id: string; name: string; email?: string; phone?: string } | null;
    customClientName?: string | null;
    total: number;
    subtotal: number;
    tax: number;
    lineItems: any[];
    status: 'draft' | 'sent' | 'paid' | 'overdue';
    dueDate: string;
    createdAt: string;
}

const Invoices: React.FC = () => {
    const { formatCurrency } = useCurrency();
    const { printReceipt } = usePrint();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showScanModal, setShowScanModal] = useState(false);
    const [scannedData, setScannedData] = useState<ScannedInvoice | null>(null);

    const fetchInvoices = async () => {
        setIsLoading(true);
        try {
            const data = await apiRequest<Invoice[]>('/invoices');
            setInvoices(data);
        } catch (err: any) {
            console.error("Failed to fetch invoices", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const handleViewReceipt = async (invoiceId: string) => {
        try {
            const fullInvoice = await apiRequest<Invoice>(`/invoices/${invoiceId}`);
            printReceipt({
                invoice: {
                    invoiceNumber: fullInvoice.invoiceNumber,
                    lineItems: fullInvoice.lineItems.map(item => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.price || item.unitPrice,
                        total: item.total
                    })),
                    subtotal: fullInvoice.subtotal,
                    tax: fullInvoice.tax,
                    total: fullInvoice.total,
                    dueDate: fullInvoice.dueDate
                },
                client: getClientData(fullInvoice)
            });
        } catch (err: any) {
            alert('Failed to load receipt: ' + err.message);
        }
    };

    const getClientName = (invoice: Invoice) => {
        if (invoice.customClientName) {
            return invoice.customClientName;
        }
        if (invoice.clientId) {
            return invoice.clientId.name;
        }
        return 'Unknown Client';
    };

    const getClientData = (invoice: Invoice): Client => {
        if (invoice.customClientName) {
            return {
                _id: 'custom',
                name: invoice.customClientName,
                email: '',
                phone: '',
                businessId: '',
                businessValue: 0,
                status: 'active'
            };
        }
        return invoice.clientId as unknown as Client;
    };
    const getStatusChip = (status: Invoice['status']) => {
        const styles = {
            draft: 'bg-slate-100 text-slate-600',
            sent: 'bg-blue-100 text-blue-600',
            paid: 'bg-emerald-100 text-emerald-600',
            overdue: 'bg-rose-100 text-rose-600',
        };
        return (
            <span className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-full ${styles[status]}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="min-h-screen space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Billing & Invoices</h2>
                    <p className="text-sm sm:text-base text-slate-500 font-medium">Manage customer billing and track payment statuses.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => setShowScanModal(true)}
                        className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all hover:-translate-y-1 active:scale-95 text-sm font-bold"
                    >
                        <i className="fas fa-camera text-xs"></i> AI Scan
                    </button>
                    <button
                        onClick={() => { setScannedData(null); setShowModal(true); }}
                        className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95 text-sm font-bold"
                    >
                        Create Invoice
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-4">
                        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading invoices...</p>
                    </div>
                ) : (
                    <div>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-extrabold uppercase tracking-[2px]">
                                        <th className="px-8 py-5">Invoice #</th>
                                        <th className="px-8 py-5">Client Name</th>
                                        <th className="px-8 py-5">Amount</th>
                                        <th className="px-8 py-5">Due Date</th>
                                        <th className="px-8 py-5">Status</th>
                                        <th className="px-8 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {invoices.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-medium italic">No invoices found.</td></tr>
                                    ) : (
                                        invoices.map(invoice => (
                                            <tr key={invoice._id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-6 font-black text-indigo-600">{invoice.invoiceNumber}</td>
                                                <td className="px-8 py-6">
                                                    <p className="text-sm font-bold text-slate-800">{getClientName(invoice)}</p>
                                                </td>
                                                <td className="px-8 py-6 font-black text-slate-900">{formatCurrency(invoice.total)}</td>
                                                <td className="px-8 py-6 text-sm text-slate-500 font-medium">
                                                    {new Date(invoice.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </td>
                                                <td className="px-8 py-6">{getStatusChip(invoice.status)}</td>
                                                <td className="px-8 py-6 text-right">
                                                    <button
                                                        onClick={() => handleViewReceipt(invoice._id)}
                                                        className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-300 hover:text-indigo-600 hover:border-indigo-100 shadow-sm transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                                                    >
                                                        <i className="fas fa-eye text-xs"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card Layout */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {invoices.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 font-medium italic">No invoices found.</div>
                            ) : (
                                invoices.map(invoice => (
                                    <div key={invoice._id} className="p-5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-black text-indigo-600 mb-0.5">{invoice.invoiceNumber}</p>
                                                <p className="text-sm font-bold text-slate-900">{getClientName(invoice)}</p>
                                            </div>
                                            {getStatusChip(invoice.status)}
                                        </div>

                                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Due Date</p>
                                                <p className="text-xs font-semibold text-slate-600">{new Date(invoice.dueDate).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Amount</p>
                                                <p className="text-sm font-black text-slate-900">{formatCurrency(invoice.total)}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleViewReceipt(invoice._id)}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 active:bg-slate-50 transition-colors shadow-sm"
                                        >
                                            <i className="fas fa-eye text-xs text-indigo-500"></i>
                                            View Details
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>


            {showModal && (
                <InvoiceFormModal
                    onClose={() => { setShowModal(false); setScannedData(null); }}
                    onSave={fetchInvoices}
                    initialData={scannedData}
                />
            )}

            <ScanInvoiceModal
                isOpen={showScanModal}
                onClose={() => setShowScanModal(false)}
                onScanComplete={(data) => {
                    setScannedData(data);
                    setShowScanModal(false);
                    setShowModal(true);
                }}
            />
        </div>
    );
};

export default Invoices;
