import React, { useState, useEffect, useRef } from 'react';
import { apiRequest, getErrorMessage } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { usePrint } from '../context/PrintContext';
import { useAuth } from '../context/AuthContext';
import InvoiceFormModal from '../components/InvoiceFormModal';
import ScanInvoiceModal from '../components/ScanInvoiceModal';
import InvoicePreviewModal, { InvoiceCard, InvoicePreviewData } from '../components/InvoicePreviewModal';
import { toPng } from 'html-to-image';
import { ScannedInvoice, Client } from '../types';

interface RecurringInvoice {
    _id: string;
    clientId?: { _id: string; name: string; email?: string } | null;
    customClientName?: string | null;
    recipientEmail?: string | null;
    lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
    subtotal: number;
    tax: number;
    total: number;
    notes?: string;
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    dayOfMonth?: number;
    nextRunDate: string;
    lastRunDate?: string;
    isActive: boolean;
    dueDaysAfter: number;
}

const FREQUENCY_LABELS: Record<string, string> = {
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
};

interface InvoicePayment {
    amount: number;
    date: string;
    method: string;
    note?: string;
}

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
    status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';
    dueDate: string;
    createdAt: string;
    amountPaid?: number;
    balance?: number;
    payments?: InvoicePayment[];
}

const Invoices: React.FC = () => {
    const { formatCurrency } = useCurrency();
    const { printReceipt } = usePrint();
    const { user } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [invTotal, setInvTotal] = useState(0);
    const [invPage, setInvPage] = useState(1);
    const [invTotalPages, setInvTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showScanModal, setShowScanModal] = useState(false);
    const [scannedData, setScannedData] = useState<ScannedInvoice | null>(null);
    const [sendingInvoice, setSendingInvoice] = useState<Invoice | null>(null);
    const [sendEmail, setSendEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);
    const [waInvoice, setWaInvoice] = useState<Invoice | null>(null);
    const [waPhone, setWaPhone] = useState('');
    const [isWaSharing, setIsWaSharing] = useState(false);
    const [waFile, setWaFile] = useState<File | null>(null);
    const [waGenerating, setWaGenerating] = useState(false);
    const [previewInvoice, setPreviewInvoice] = useState<any | null>(null);
    const waCardRef = useRef<HTMLDivElement>(null);

    // Record payment (full or partial)
    const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState('bank transfer');
    const [payNote, setPayNote] = useState('');
    const [isRecordingPayment, setIsRecordingPayment] = useState(false);

    // Tab state
    const [activeTab, setActiveTab] = useState<'invoices' | 'recurring'>('invoices');

    // Recurring invoices
    const [recurring, setRecurring] = useState<RecurringInvoice[]>([]);
    const [isRecurringLoading, setIsRecurringLoading] = useState(false);
    const [showRecurringForm, setShowRecurringForm] = useState(false);
    const [editingRecurring, setEditingRecurring] = useState<RecurringInvoice | null>(null);
    const [recurringForm, setRecurringForm] = useState({
        customClientName: '',
        recipientEmail: '',
        description: '',
        amount: '',
        tax: '0',
        frequency: 'monthly' as RecurringInvoice['frequency'],
        dayOfMonth: '1',
        startDate: new Date().toISOString().split('T')[0],
        dueDaysAfter: '7',
        notes: '',
    });

    const fetchRecurring = async () => {
        setIsRecurringLoading(true);
        try {
            const data = await apiRequest<RecurringInvoice[]>('/recurring-invoices');
            setRecurring(data);
        } catch (err) {
            console.error('Failed to fetch recurring invoices', err);
        } finally {
            setIsRecurringLoading(false);
        }
    };

    const fetchInvoices = async (p = 1) => {
        setIsLoading(true);
        try {
            const res = await apiRequest<{ data: Invoice[]; total: number; page: number; pages: number }>(`/invoices?page=${p}&limit=50`);
            setInvoices(res.data);
            setInvTotal(res.total);
            setInvPage(res.page);
            setInvTotalPages(res.pages);
        } catch (err) {
            console.error('Failed to fetch invoices:', getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
        fetchRecurring();
    }, []);

    useEffect(() => {
        const handler = () => fetchInvoices();
        window.addEventListener('MorniyDataUpdate', handler);
        return () => window.removeEventListener('MorniyDataUpdate', handler);
    }, []);

    const handleUpdateStatus = async (invoiceId: string, newStatus: Invoice['status']) => {
        try {
            await apiRequest(`/invoices/${invoiceId}/status`, {
                method: 'PUT',
                body: { status: newStatus },
            });
            fetchInvoices();
        } catch (err) {
            alert('Failed to update status: ' + getErrorMessage(err));
        }
    };

    const getNextActions = (status: Invoice['status']): { label: string; next: Invoice['status'] }[] => {
        switch (status) {
            case 'draft':    return [{ label: 'Mark Sent', next: 'sent' }];
            case 'sent':     return [{ label: 'Mark Paid', next: 'paid' }, { label: 'Mark Overdue', next: 'overdue' }];
            case 'partial':  return [{ label: 'Mark Rest Paid', next: 'paid' }];
            case 'overdue':  return [{ label: 'Mark Paid', next: 'paid' }];
            case 'paid':     return [];
        }
    };

    const balanceOf = (invoice: Invoice) => invoice.balance ?? (invoice.status === 'paid' ? 0 : invoice.total);

    const openPaymentModal = (invoice: Invoice) => {
        setPayingInvoice(invoice);
        setPayAmount(String(balanceOf(invoice)));
        setPayMethod('bank transfer');
        setPayNote('');
    };

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payingInvoice) return;
        const amount = parseFloat(payAmount);
        if (!amount || amount <= 0) { alert('Enter a valid amount'); return; }
        setIsRecordingPayment(true);
        try {
            await apiRequest(`/invoices/${payingInvoice._id}/payments`, {
                method: 'POST',
                body: { amount, method: payMethod, note: payNote || undefined },
            });
            setPayingInvoice(null);
            fetchInvoices(invPage);
        } catch (err) {
            alert('Failed to record payment: ' + getErrorMessage(err));
        } finally {
            setIsRecordingPayment(false);
        }
    };

    const resetRecurringForm = () => setRecurringForm({
        customClientName: '', recipientEmail: '', description: '', amount: '',
        tax: '0', frequency: 'monthly', dayOfMonth: '1',
        startDate: new Date().toISOString().split('T')[0], dueDaysAfter: '7', notes: '',
    });

    const handleOpenRecurringForm = (template?: RecurringInvoice) => {
        if (template) {
            setEditingRecurring(template);
            const clientName = template.customClientName || (template.clientId as any)?.name || '';
            const firstItem = template.lineItems[0];
            setRecurringForm({
                customClientName: clientName,
                recipientEmail: template.recipientEmail || '',
                description: firstItem?.description || '',
                amount: String(firstItem?.unitPrice || template.total),
                tax: String(template.tax),
                frequency: template.frequency,
                dayOfMonth: String(template.dayOfMonth || 1),
                startDate: template.nextRunDate.split('T')[0],
                dueDaysAfter: String(template.dueDaysAfter),
                notes: template.notes || '',
            });
        } else {
            setEditingRecurring(null);
            resetRecurringForm();
        }
        setShowRecurringForm(true);
    };

    const handleSaveRecurring = async (e: React.FormEvent) => {
        e.preventDefault();
        const qty = 1;
        const unitPrice = parseFloat(recurringForm.amount) || 0;
        const lineItems = [{ description: recurringForm.description, quantity: qty, unitPrice, total: unitPrice }];
        const subtotal = unitPrice;
        const taxRate = parseFloat(recurringForm.tax) || 0;
        const total = subtotal + subtotal * (taxRate / 100);
        const payload = {
            customClientName: recurringForm.customClientName,
            recipientEmail: recurringForm.recipientEmail || null,
            lineItems,
            subtotal,
            tax: taxRate,
            total,
            frequency: recurringForm.frequency,
            dayOfMonth: parseInt(recurringForm.dayOfMonth) || undefined,
            startDate: recurringForm.startDate,
            dueDaysAfter: parseInt(recurringForm.dueDaysAfter) || 7,
            notes: recurringForm.notes || undefined,
        };
        try {
            if (editingRecurring) {
                await apiRequest(`/recurring-invoices/${editingRecurring._id}`, { method: 'PUT', body: payload });
            } else {
                await apiRequest('/recurring-invoices', { method: 'POST', body: payload });
            }
            setShowRecurringForm(false);
            setEditingRecurring(null);
            resetRecurringForm();
            fetchRecurring();
        } catch (err) {
            alert(getErrorMessage(err));
        }
    };

    const handleToggleRecurring = async (template: RecurringInvoice) => {
        try {
            await apiRequest(`/recurring-invoices/${template._id}`, {
                method: 'PUT',
                body: { isActive: !template.isActive },
            });
            fetchRecurring();
        } catch (err) {
            alert(getErrorMessage(err));
        }
    };

    const handleDeleteRecurring = async (id: string) => {
        if (!confirm('Delete this recurring schedule?')) return;
        try {
            await apiRequest(`/recurring-invoices/${id}`, { method: 'DELETE' });
            fetchRecurring();
        } catch (err) {
            alert(getErrorMessage(err));
        }
    };

    const handleOpenSend = (invoice: Invoice) => {
        setSendEmail(invoice.clientId?.email || '');
        setSendResult(null);
        setSendingInvoice(invoice);
    };


    // Format Nigerian numbers: 0XXXXXXXXXX → +234XXXXXXXXXX
    const formatNigerianPhone = (raw: string) => {
        const digits = raw.replace(/\D/g, '');
        if (digits.startsWith('0') && digits.length === 11) return '234' + digits.slice(1);
        if (digits.startsWith('234')) return digits;
        return digits;
    };

    // Pre-generate invoice image as soon as modal opens
    const openWaModal = async (invoice: Invoice) => {
        setWaInvoice(invoice);
        setWaFile(null);
        const phone = invoice.clientId?.phone || '';
        setWaPhone(phone);
        setWaGenerating(true);
        // Wait a tick for the hidden card to render
        await new Promise(r => setTimeout(r, 200));
        try {
            if (!waCardRef.current) return;
            const dataUrl = await toPng(waCardRef.current, { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff' });
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `invoice-${invoice.invoiceNumber}.png`, { type: 'image/png' });
            setWaFile(file);
        } catch { /* will fallback to download */ }
        finally { setWaGenerating(false); }
    };

    // Called synchronously from click — no await before navigator.share
    const handleShareInvoiceImage = () => {
        if (!waInvoice) return;
        setIsWaSharing(true);

        if (waFile && navigator.canShare && navigator.canShare({ files: [waFile] })) {
            // Mobile: share sheet opens — user picks WhatsApp contact directly
            navigator.share({ files: [waFile], title: `Invoice ${waInvoice.invoiceNumber}` })
                .catch(() => {
                    // Fallback: download the file
                    const url = URL.createObjectURL(waFile);
                    const a = document.createElement('a');
                    a.href = url; a.download = `invoice-${waInvoice.invoiceNumber}.png`; a.click();
                    URL.revokeObjectURL(url);
                })
                .finally(() => setIsWaSharing(false));
        } else {
            // Desktop fallback: just download the image
            if (waFile) {
                const url = URL.createObjectURL(waFile);
                const a = document.createElement('a');
                a.href = url; a.download = `invoice-${waInvoice.invoiceNumber}.png`; a.click();
                URL.revokeObjectURL(url);
            }
            setIsWaSharing(false);
        }
    };

    const handleSendInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sendingInvoice) return;
        setIsSending(true);
        setSendResult(null);
        try {
            const res = await apiRequest<{ message: string; emailSent: boolean; publicLink: string }>(
                `/invoices/${sendingInvoice._id}/send`,
                { method: 'POST', body: { email: sendEmail } }
            );
            setSendResult({ ok: true, msg: res.emailSent ? `Sent to ${sendEmail}` : res.message });
            fetchInvoices();
        } catch (err) {
            setSendResult({ ok: false, msg: getErrorMessage(err) });
        } finally {
            setIsSending(false);
        }
    };

    const handleViewReceipt = async (invoiceId: string) => {
        try {
            const fullInvoice = await apiRequest<Invoice>(`/invoices/${invoiceId}`);
            const clientName = getClientName(fullInvoice);
            setPreviewInvoice({
                invoiceNumber: fullInvoice.invoiceNumber,
                clientName,
                businessName: user?.businessName || 'My Business',
                lineItems: fullInvoice.lineItems.map((item: any) => ({
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.price || item.unitPrice,
                    total: item.total,
                })),
                subtotal: fullInvoice.subtotal,
                tax: fullInvoice.tax,
                total: fullInvoice.total,
                dueDate: fullInvoice.dueDate,
                notes: (fullInvoice as any).notes,
            });
        } catch (err) {
            alert('Failed to load invoice: ' + getErrorMessage(err));
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
            partial: 'bg-amber-100 text-amber-700',
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
                    {activeTab === 'invoices' ? (
                        <>
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
                        </>
                    ) : (
                        <button
                            onClick={() => handleOpenRecurringForm()}
                            className="flex-1 sm:flex-none bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-violet-200 transition-all hover:-translate-y-1 active:scale-95 text-sm font-bold"
                        >
                            <i className="fas fa-plus text-xs"></i> Add Schedule
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('invoices')}
                    className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'invoices' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Invoices
                </button>
                <button
                    onClick={() => setActiveTab('recurring')}
                    className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'recurring' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <i className="fas fa-rotate text-xs"></i> Recurring
                    {recurring.filter(r => r.isActive).length > 0 && (
                        <span className="w-5 h-5 bg-violet-600 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                            {recurring.filter(r => r.isActive).length}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === 'invoices' && <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
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
                                                <td className="px-8 py-6">
                                                    <p className="font-black text-slate-900">{formatCurrency(invoice.total)}</p>
                                                    {invoice.status === 'partial' && (
                                                        <p className="text-[10px] font-bold text-amber-600 mt-0.5">{formatCurrency(balanceOf(invoice))} left</p>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6 text-sm text-slate-500 font-medium">
                                                    {new Date(invoice.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        {getStatusChip(invoice.status)}
                                                        {(invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'partial') && (
                                                            <button
                                                                onClick={() => openPaymentModal(invoice)}
                                                                className="h-6 px-2.5 text-[10px] font-extrabold uppercase rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                                            >
                                                                Record Payment
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 md:translate-x-2 md:group-hover:translate-x-0 transition-all">
                                                        {getNextActions(invoice.status).map(({ label, next }) => (
                                                            <button
                                                                key={next}
                                                                onClick={() => handleUpdateStatus(invoice._id, next)}
                                                                className="h-8 px-3 text-[10px] font-extrabold uppercase tracking-wider rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                                            >
                                                                {label}
                                                            </button>
                                                        ))}
                                                        <button
                                                            onClick={() => handleOpenSend(invoice)}
                                                            title="Send invoice by email"
                                                            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm transition-all"
                                                        >
                                                            <i className="fas fa-paper-plane text-xs"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => openWaModal(invoice)}
                                                            title="Send via WhatsApp"
                                                            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-emerald-600 hover:border-emerald-100 shadow-sm transition-all"
                                                        >
                                                            <i className="fab fa-whatsapp text-sm"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleViewReceipt(invoice._id)}
                                                            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm transition-all"
                                                        >
                                                            <i className="fas fa-eye text-xs"></i>
                                                        </button>
                                                    </div>
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
                                                {invoice.status === 'partial' && (
                                                    <p className="text-[10px] font-bold text-amber-600 mt-0.5">{formatCurrency(balanceOf(invoice))} left</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {(invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'partial') && (
                                                <button
                                                    onClick={() => openPaymentModal(invoice)}
                                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                                >
                                                    Record Payment
                                                </button>
                                            )}
                                            {getNextActions(invoice.status).map(({ label, next }) => (
                                                <button
                                                    key={next}
                                                    onClick={() => handleUpdateStatus(invoice._id, next)}
                                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-indigo-50 border border-indigo-100 text-indigo-600 active:bg-indigo-100 transition-colors"
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => handleOpenSend(invoice)}
                                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 active:bg-slate-50 transition-colors shadow-sm"
                                            >
                                                <i className="fas fa-paper-plane text-xs text-indigo-500"></i>
                                            </button>
                                            <button
                                                onClick={() => openWaModal(invoice)}
                                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 active:bg-slate-50 transition-colors shadow-sm"
                                            >
                                                <i className="fab fa-whatsapp text-sm text-emerald-500"></i>
                                            </button>
                                            <button
                                                onClick={() => handleViewReceipt(invoice._id)}
                                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 active:bg-slate-50 transition-colors shadow-sm"
                                            >
                                                <i className="fas fa-eye text-xs text-indigo-500"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>}

            {activeTab === 'recurring' && (
                <div className="space-y-4">
                    {isRecurringLoading ? (
                        <div className="flex flex-col items-center justify-center p-20 gap-4">
                            <div className="w-10 h-10 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin"></div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading schedules...</p>
                        </div>
                    ) : recurring.length === 0 ? (
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-16 flex flex-col items-center gap-4 text-center">
                            <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center">
                                <i className="fas fa-rotate text-2xl text-violet-400"></i>
                            </div>
                            <div>
                                <p className="font-black text-slate-800 mb-1">No recurring schedules yet</p>
                                <p className="text-sm text-slate-400">Set up a recurring invoice and it will generate automatically on your chosen schedule.</p>
                            </div>
                            <button
                                onClick={() => handleOpenRecurringForm()}
                                className="mt-2 bg-violet-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-violet-700 transition-all"
                            >
                                <i className="fas fa-plus mr-2 text-xs"></i>Add First Schedule
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                            {/* Desktop */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-extrabold uppercase tracking-[2px]">
                                            <th className="px-8 py-5">Client / Description</th>
                                            <th className="px-8 py-5">Amount</th>
                                            <th className="px-8 py-5">Frequency</th>
                                            <th className="px-8 py-5">Next Run</th>
                                            <th className="px-8 py-5">Status</th>
                                            <th className="px-8 py-5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {recurring.map(r => (
                                            <tr key={r._id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <p className="text-sm font-bold text-slate-800">{r.customClientName || (r.clientId as any)?.name || '—'}</p>
                                                    <p className="text-xs text-slate-400">{r.lineItems[0]?.description || ''}</p>
                                                </td>
                                                <td className="px-8 py-6 font-black text-slate-900">{formatCurrency(r.total)}</td>
                                                <td className="px-8 py-6">
                                                    <span className="px-3 py-1 text-[10px] font-extrabold uppercase rounded-full bg-violet-100 text-violet-600">
                                                        {FREQUENCY_LABELS[r.frequency]}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-sm text-slate-500 font-medium">
                                                    {new Date(r.nextRunDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-full ${r.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                        {r.isActive ? 'Active' : 'Paused'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all">
                                                        <button
                                                            onClick={() => handleToggleRecurring(r)}
                                                            title={r.isActive ? 'Pause' : 'Resume'}
                                                            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-amber-600 hover:border-amber-100 shadow-sm transition-all"
                                                        >
                                                            <i className={`fas ${r.isActive ? 'fa-pause' : 'fa-play'} text-xs`}></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenRecurringForm(r)}
                                                            title="Edit"
                                                            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm transition-all"
                                                        >
                                                            <i className="fas fa-pen text-xs"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteRecurring(r._id)}
                                                            title="Delete"
                                                            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-100 shadow-sm transition-all"
                                                        >
                                                            <i className="fas fa-trash text-xs"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile */}
                            <div className="md:hidden divide-y divide-slate-100">
                                {recurring.map(r => (
                                    <div key={r._id} className="p-5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{r.customClientName || (r.clientId as any)?.name || '—'}</p>
                                                <p className="text-xs text-slate-400">{r.lineItems[0]?.description || ''}</p>
                                            </div>
                                            <span className={`px-3 py-1 text-[10px] font-extrabold uppercase rounded-full ${r.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {r.isActive ? 'Active' : 'Paused'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Frequency</p>
                                                <p className="text-xs font-bold text-violet-600">{FREQUENCY_LABELS[r.frequency]}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Next Run</p>
                                                <p className="text-xs font-semibold text-slate-600">{new Date(r.nextRunDate).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Amount</p>
                                                <p className="text-sm font-black text-slate-900">{formatCurrency(r.total)}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleToggleRecurring(r)} className="flex-1 py-2.5 bg-amber-50 border border-amber-100 rounded-xl text-xs font-bold text-amber-600 active:bg-amber-100 transition-colors">
                                                <i className={`fas ${r.isActive ? 'fa-pause' : 'fa-play'} mr-1`}></i>{r.isActive ? 'Pause' : 'Resume'}
                                            </button>
                                            <button onClick={() => handleOpenRecurringForm(r)} className="flex-1 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-600 active:bg-indigo-100 transition-colors">
                                                <i className="fas fa-pen mr-1 text-xs"></i>Edit
                                            </button>
                                            <button onClick={() => handleDeleteRecurring(r._id)} className="px-4 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600 active:bg-rose-100 transition-colors">
                                                <i className="fas fa-trash text-xs"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Recurring Invoice Form Modal */}
            {showRecurringForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-5 sm:p-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto my-auto">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                                <i className="fas fa-rotate text-violet-600"></i>
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-900">{editingRecurring ? 'Edit Schedule' : 'New Recurring Invoice'}</h3>
                                <p className="text-xs text-slate-400 font-medium">Generates automatically on your chosen schedule</p>
                            </div>
                        </div>
                        <form onSubmit={handleSaveRecurring} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Client / Recipient Name</label>
                                    <input
                                        type="text"
                                        value={recurringForm.customClientName}
                                        onChange={e => setRecurringForm(f => ({ ...f, customClientName: e.target.value }))}
                                        placeholder="e.g. Acme Corp"
                                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none"
                                        required
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                                    <input
                                        type="text"
                                        value={recurringForm.description}
                                        onChange={e => setRecurringForm(f => ({ ...f, description: e.target.value }))}
                                        placeholder="e.g. Monthly retainer fee"
                                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={recurringForm.amount}
                                        onChange={e => setRecurringForm(f => ({ ...f, amount: e.target.value }))}
                                        placeholder="0.00"
                                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tax %</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={recurringForm.tax}
                                        onChange={e => setRecurringForm(f => ({ ...f, tax: e.target.value }))}
                                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Frequency</label>
                                    <select
                                        value={recurringForm.frequency}
                                        onChange={e => setRecurringForm(f => ({ ...f, frequency: e.target.value as any }))}
                                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none"
                                    >
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Day of Month</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="28"
                                        value={recurringForm.dayOfMonth}
                                        onChange={e => setRecurringForm(f => ({ ...f, dayOfMonth: e.target.value }))}
                                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">First Run Date</label>
                                    <input
                                        type="date"
                                        value={recurringForm.startDate}
                                        onChange={e => setRecurringForm(f => ({ ...f, startDate: e.target.value }))}
                                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Due Days After</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="90"
                                        value={recurringForm.dueDaysAfter}
                                        onChange={e => setRecurringForm(f => ({ ...f, dueDaysAfter: e.target.value }))}
                                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Recipient Email (optional)</label>
                                    <input
                                        type="email"
                                        value={recurringForm.recipientEmail}
                                        onChange={e => setRecurringForm(f => ({ ...f, recipientEmail: e.target.value }))}
                                        placeholder="client@example.com"
                                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowRecurringForm(false); setEditingRecurring(null); resetRecurringForm(); }}
                                    className="flex-1 h-11 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 h-11 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <i className="fas fa-check text-xs"></i> {editingRecurring ? 'Save Changes' : 'Create Schedule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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

            {/* Send Invoice Modal */}
            {sendingInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-5 sm:p-8 animate-in fade-in zoom-in-95 duration-200 my-auto">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                                <i className="fas fa-paper-plane text-indigo-600"></i>
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-900">Send Invoice</h3>
                                <p className="text-xs text-slate-400 font-medium">{sendingInvoice.invoiceNumber} · {formatCurrency(sendingInvoice.total)}</p>
                            </div>
                        </div>

                        {sendResult ? (
                            <div className={`p-4 rounded-2xl mb-4 flex items-start gap-3 ${sendResult.ok ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
                                <i className={`fas ${sendResult.ok ? 'fa-check-circle text-emerald-500' : 'fa-exclamation-circle text-rose-500'} mt-0.5 flex-shrink-0`}></i>
                                <div>
                                    <p className={`text-sm font-medium ${sendResult.ok ? 'text-emerald-800' : 'text-rose-800'}`}>{sendResult.msg}</p>
                                    {sendResult.ok && sendResult.msg.includes('failed') && (
                                        <p className="text-xs text-amber-700 mt-1 font-medium">
                                            Tip: If you're on Render/cloud hosting, make sure SMTP_PASS is updated in your environment variables — not just .env locally.
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSendInvoice} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Recipient Email</label>
                                    <input
                                        type="email"
                                        value={sendEmail}
                                        onChange={e => setSendEmail(e.target.value)}
                                        placeholder="client@example.com"
                                        className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                        required
                                        autoFocus
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1.5">The client will receive a link to view and pay the invoice online.</p>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setSendingInvoice(null)}
                                        className="flex-1 h-11 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSending}
                                        className="flex-1 h-11 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                    >
                                        {isSending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Sending...</> : <><i className="fas fa-paper-plane text-xs"></i> Send Invoice</>}
                                    </button>
                                </div>
                            </form>
                        )}

                        {sendResult && (
                            <button
                                onClick={() => setSendingInvoice(null)}
                                className="w-full h-11 mt-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                            >
                                Close
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* WhatsApp Invoice Modal */}
            {waInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg my-4 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                    <i className="fab fa-whatsapp text-emerald-600 text-lg"></i>
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Send via WhatsApp</h3>
                                    <p className="text-xs text-slate-400 font-medium">{waInvoice.invoiceNumber} · {formatCurrency(waInvoice.total)}</p>
                                </div>
                            </div>
                            <button onClick={() => { setWaInvoice(null); setWaPhone(''); setWaFile(null); }} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
                                <i className="fas fa-times text-sm"></i>
                            </button>
                        </div>

                        {/* Invoice preview card (hidden offscreen, used for image capture) */}
                        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', zIndex: -1 }}>
                            <div ref={waCardRef}>
                                <InvoiceCard
                                    data={{
                                        invoiceNumber: waInvoice.invoiceNumber,
                                        clientName: getClientName(waInvoice),
                                        businessName: user?.businessName || 'My Business',
                                        lineItems: waInvoice.lineItems.map((item: any) => ({
                                            description: item.description,
                                            quantity: item.quantity,
                                            unitPrice: item.price || item.unitPrice,
                                            total: item.total,
                                        })),
                                        subtotal: waInvoice.subtotal,
                                        tax: waInvoice.tax,
                                        total: waInvoice.total,
                                        dueDate: waInvoice.dueDate,
                                    } as InvoicePreviewData}
                                    formatCurrency={formatCurrency}
                                />
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Invoice summary */}
                            <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4">
                                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                                    <i className="fas fa-file-invoice text-emerald-600"></i>
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-800">{getClientName(waInvoice)}</p>
                                    <p className="text-xs text-slate-400">{waInvoice.invoiceNumber} · {formatCurrency(waInvoice.total)}</p>
                                </div>
                            </div>

                            <div className={`flex items-center gap-2 text-xs font-semibold ${waGenerating ? 'text-slate-400' : waFile ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {waGenerating
                                    ? <><div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" /> Preparing invoice image...</>
                                    : waFile
                                        ? <><i className="fas fa-check-circle text-emerald-500" /> Ready — WhatsApp will open, pick your contact there</>
                                        : <><i className="fas fa-info-circle" /> Image will be generated on send</>
                                }
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setWaInvoice(null); setWaPhone(''); setWaFile(null); }}
                                    className="flex-1 h-11 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleShareInvoiceImage}
                                    disabled={isWaSharing || waGenerating}
                                    className="flex-1 h-11 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {isWaSharing
                                        ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                                        : waGenerating
                                            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Preparing...</>
                                            : <><i className="fab fa-whatsapp" /> Send Invoice</>
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Preview / Download Modal */}
            {previewInvoice && (
                <InvoicePreviewModal
                    data={previewInvoice}
                    onClose={() => setPreviewInvoice(null)}
                />
            )}

            {/* Record Payment Modal */}
            {payingInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-5 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-white">Record Payment</h3>
                                <p className="text-xs text-emerald-100">{payingInvoice.invoiceNumber} · {getClientName(payingInvoice)}</p>
                            </div>
                            <button onClick={() => setPayingInvoice(null)} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                                <i className="fas fa-times text-sm"></i>
                            </button>
                        </div>
                        <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
                            <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                                <span className="text-xs font-bold text-slate-500">Balance Due</span>
                                <span className="text-sm font-black text-slate-900">{formatCurrency(balanceOf(payingInvoice))}</span>
                            </div>
                            <div>
                                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Amount Received *</label>
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    min="0.01"
                                    max={balanceOf(payingInvoice)}
                                    value={payAmount}
                                    onChange={e => setPayAmount(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                                />
                                {parseFloat(payAmount) > 0 && parseFloat(payAmount) < balanceOf(payingInvoice) && (
                                    <p className="text-[11px] text-amber-600 font-semibold mt-1.5">
                                        Leaves {formatCurrency(balanceOf(payingInvoice) - parseFloat(payAmount))} still owing — invoice will be marked "partial".
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Method</label>
                                <select
                                    value={payMethod}
                                    onChange={e => setPayMethod(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                                >
                                    <option value="bank transfer">Bank Transfer</option>
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Note</label>
                                <input
                                    type="text"
                                    placeholder="Optional"
                                    value={payNote}
                                    onChange={e => setPayNote(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setPayingInvoice(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isRecordingPayment} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 transition-colors">
                                    {isRecordingPayment ? 'Saving…' : 'Record Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Invoices;
