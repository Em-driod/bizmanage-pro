import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import InvoiceFormModal from '../components/InvoiceFormModal'; // Import the modal

// Define the Invoice type according to the backend model
interface Invoice {
    _id: string;
    invoiceNumber: string;
    clientId: { _id: string; name: string };
    total: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
    dueDate: string;
    createdAt: string;
}

const Invoices: React.FC = () => {
    const { formatCurrency } = useCurrency();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

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
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-extrabold text-slate-900">Invoices</h2>
                    <p className="text-sm text-slate-400 font-medium">Manage all your customer billing.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl shadow-sm transition-colors"
                >
                    Create Invoice
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr className="text-slate-400 text-xs font-bold uppercase">
                            <th className="px-6 py-4">Invoice #</th>
                            <th className="px-6 py-4">Client</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Due Date</th>
                            <th className="px-6 py-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={5} className="text-center p-8 text-slate-400">Loading invoices...</td></tr>
                        ) : invoices.length === 0 ? (
                            <tr><td colSpan={5} className="text-center p-8 text-slate-400">No invoices found.</td></tr>
                        ) : (
                            invoices.map(invoice => (
                                <tr key={invoice._id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-bold text-indigo-600">{invoice.invoiceNumber}</td>
                                    <td className="px-6 py-4 text-slate-800">{invoice.clientId?.name || 'N/A'}</td>
                                    <td className="px-6 py-4 font-semibold text-slate-800">{formatCurrency(invoice.total)}</td>
                                    <td className="px-6 py-4 text-slate-500">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">{getStatusChip(invoice.status)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <InvoiceFormModal
                    onClose={() => setShowModal(false)}
                    onSave={fetchInvoices}
                />
            )}
        </div>
    );
};

export default Invoices;
