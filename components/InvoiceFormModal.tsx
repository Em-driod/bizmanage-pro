import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { Client, ScannedInvoice } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { usePrint } from '../context/PrintContext';
import type { Product } from '../pages/Products';

interface LineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    productId?: string;
}

interface InvoiceFormModalProps {
    onClose: () => void;
    onSave: () => void;
    initialData?: ScannedInvoice | null;
    prefilledClientId?: string;
}

const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({ onClose, onSave, initialData, prefilledClientId }) => {
    const { formatCurrency } = useCurrency();
    const { printReceipt } = usePrint();
    const navigate = useNavigate();
    const [showBankPrompt, setShowBankPrompt] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string>(prefilledClientId || '');
    const [customClientName, setCustomClientName] = useState<string>('');
    const [useCustomClient, setUseCustomClient] = useState<boolean>(false);
    const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    const [dueDate, setDueDate] = useState('');
    const [taxRate, setTaxRate] = useState(0); // in percentage
    const [notes, setNotes] = useState('');
    const [depositAmount, setDepositAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [showCatalog, setShowCatalog] = useState(false);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await apiRequest<{ data: Client[] } | Client[]>('/clients?limit=200');
                const data = Array.isArray(res) ? res : res.data ?? [];
                setClients(data);
                if (data.length > 0) {
                    setSelectedClientId(data[0]._id);
                }
            } catch (err: any) {
                console.error("Failed to fetch clients:", err);
                setError("Failed to load clients.");
            }
        };
        const fetchProducts = async () => {
            try {
                const data = await apiRequest<Product[]>('/products');
                setProducts(data);
            } catch { /* ignore */ }
        };
        fetchClients();
        fetchProducts();
    }, []);

    // Pre-fill form if initialData is provided (from AI scan)
    useEffect(() => {
        if (initialData) {
            if (initialData.lineItems && initialData.lineItems.length > 0) {
                const mappedItems: LineItem[] = initialData.lineItems.map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.price,
                    total: item.total || item.quantity * item.price,
                }));
                setLineItems(mappedItems);
            }
            if (initialData.dueDate) {
                setDueDate(initialData.dueDate);
            }
            if (initialData.tax) {
                setTaxRate(initialData.tax);
            }
        }
    }, [initialData]);

    const handleLineItemChange = (index: number, field: keyof LineItem, value: any) => {
        const newLineItems = [...lineItems];
        if (field === 'quantity' || field === 'unitPrice') {
            newLineItems[index][field] = parseFloat(value) || 0;
            newLineItems[index].total = newLineItems[index].quantity * newLineItems[index].unitPrice;
        } else {
            (newLineItems[index] as any)[field] = value;
            // Typing over a catalog-filled description breaks the link to that
            // product — clear it so stock isn't deducted for the wrong item.
            if (field === 'description') {
                newLineItems[index].productId = undefined;
            }
        }
        setLineItems(newLineItems);
    };

    const addLineItem = () => {
        setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    };

    const removeLineItem = (index: number) => {
        const newLineItems = lineItems.filter((_, i) => i !== index);
        setLineItems(newLineItems);
    };

    const calculateSubtotal = () => {
        return lineItems.reduce((acc, item) => acc + item.total, 0);
    };

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        const taxAmount = subtotal * (taxRate / 100);
        return subtotal + taxAmount;
    };

    const buildPayload = () => {
        const deposit = parseFloat(depositAmount) || 0;
        return {
            clientId: useCustomClient ? null : selectedClientId,
            customClientName: useCustomClient ? customClientName : null,
            lineItems,
            dueDate,
            tax: taxRate,
            subtotal: calculateSubtotal(),
            total: calculateTotal(),
            notes,
            depositAmount: deposit > 0 ? deposit : undefined,
        };
    };

    const handleSaveAndPrint = async () => {
        setError(null);

        // Check bank details first
        try {
            const biz = await apiRequest<any>('/businesses/me');
            if (!biz?.profile?.accountNumber) {
                setShowBankPrompt(true);
                return;
            }
        } catch { /* proceed anyway if check fails */ }

        setIsLoading(true);

        try {
            const payload = buildPayload();
            const response = await apiRequest<any>('/invoices', { method: 'POST', body: payload });

            // Trigger print
            const clientData: Client | undefined = useCustomClient
                ? ({ _id: 'custom', name: customClientName } as unknown as Client)
                : clients.find(c => c._id === selectedClientId);
            printReceipt({
                invoice: {
                    invoiceNumber: response.invoiceNumber,
                    lineItems,
                    subtotal: calculateSubtotal(),
                    tax: taxRate,
                    total: calculateTotal(),
                    notes,
                    dueDate,
                },
                client: clientData,
            });

            onSave();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create and print invoice.');
        } finally {
            setIsLoading(false);
        }
    };

    if (showBankPrompt) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center space-y-4">
                    <div className="text-4xl">🏦</div>
                    <h3 className="text-lg font-bold text-slate-800">Add Your Bank Details First</h3>
                    <p className="text-sm text-slate-500">
                        Your invoice needs a bank account number so clients know where to pay you.
                        Add it in Settings and come back.
                    </p>
                    <div className="flex flex-col gap-2 pt-2">
                        <button
                            onClick={() => { onClose(); navigate('/businesses'); }}
                            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                        >
                            Go to Settings
                        </button>
                        <button
                            onClick={() => setShowBankPrompt(false)}
                            className="w-full py-2.5 text-slate-500 text-sm hover:text-slate-700"
                        >
                            Continue anyway
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white sm:rounded-xl shadow-xl w-full max-w-2xl sm:my-4 p-5 sm:p-6 rounded-t-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4 text-slate-800">Create New Invoice</h3>
                <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700">Client</label>
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setUseCustomClient(false)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                        !useCustomClient
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    Known Client
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUseCustomClient(true)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                        useCustomClient
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    Custom Name
                                </button>
                            </div>
                            
                            {!useCustomClient ? (
                                <select
                                    value={selectedClientId}
                                    onChange={(e) => setSelectedClientId(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    required
                                >
                                    {clients.map(client => (
                                        <option key={client._id} value={client._id}>{client.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={customClientName}
                                    onChange={(e) => setCustomClientName(e.target.value)}
                                    placeholder="Enter client name"
                                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    required
                                />
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-700">Line Items</label>
                            {products.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => { setShowCatalog(v => !v); setCatalogSearch(''); setActiveLineIndex(null); }}
                                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${showCatalog ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}
                                >
                                    <i className="fas fa-box-open text-[10px]"></i> Catalog {showCatalog ? '▲' : '▼'}
                                </button>
                            )}
                        </div>

                        {/* Catalog picker */}
                        {showCatalog && products.length > 0 && (
                            <div className="mb-3 border border-indigo-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                                <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
                                    <i className="fas fa-magnifying-glass text-indigo-300 text-xs"></i>
                                    <input
                                        type="text"
                                        placeholder="Search catalog..."
                                        value={catalogSearch}
                                        onChange={e => setCatalogSearch(e.target.value)}
                                        className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
                                        autoFocus
                                    />
                                    {catalogSearch && (
                                        <button type="button" onClick={() => setCatalogSearch('')} className="text-slate-300 hover:text-slate-500 text-xs"><i className="fas fa-times"/></button>
                                    )}
                                </div>
                                <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                                    {products
                                        .filter(p => !catalogSearch || p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || (p.category || '').toLowerCase().includes(catalogSearch.toLowerCase()))
                                        .map(p => (
                                            <button
                                                key={p._id}
                                                type="button"
                                                onClick={() => {
                                                    const newItem = { description: p.name + (p.description ? ` — ${p.description}` : ''), quantity: 1, unitPrice: p.price, total: p.price, productId: p._id };
                                                    if (activeLineIndex !== null) {
                                                        // Fill the selected empty row
                                                        const updated = [...lineItems];
                                                        updated[activeLineIndex] = newItem;
                                                        setLineItems(updated);
                                                    } else {
                                                        setLineItems(prev => [...prev, newItem]);
                                                    }
                                                    setShowCatalog(false);
                                                    setActiveLineIndex(null);
                                                    setCatalogSearch('');
                                                }}
                                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-50 transition-colors text-left group"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {p.image
                                                        ? <img src={p.image} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0"/>
                                                        : <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100"><i className="fas fa-box text-indigo-300 text-xs"/></div>
                                                    }
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                                                        {p.description && <p className="text-[11px] text-slate-400 truncate">{p.description}</p>}
                                                        {p.category && !p.description && <p className="text-[11px] text-slate-400">{p.category}</p>}
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0 ml-3 text-right">
                                                    <p className="text-sm font-black text-indigo-600">{formatCurrency(p.price)}</p>
                                                    {p.unit && p.unit !== 'unit' && <p className="text-[10px] text-slate-400">per {p.unit}</p>}
                                                </div>
                                            </button>
                                        ))
                                    }
                                    {products.filter(p => !catalogSearch || p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || (p.category || '').toLowerCase().includes(catalogSearch.toLowerCase())).length === 0 && (
                                        <p className="text-sm text-slate-400 text-center py-6">No items match "{catalogSearch}"</p>
                                    )}
                                </div>
                                {activeLineIndex !== null && (
                                    <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
                                        <p className="text-[11px] text-amber-700 font-medium">Filling row {activeLineIndex + 1} — click an item above to replace it</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-3">
                            {lineItems.map((item, index) => (
                                <div key={index} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Description"
                                            value={item.description}
                                            onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                                            onFocus={() => { if (!item.description && products.length > 0) { setActiveLineIndex(index); setShowCatalog(true); setCatalogSearch(''); } }}
                                            className="flex-grow p-2 border border-slate-200 rounded-lg text-sm bg-white"
                                            required
                                        />
                                        <button type="button" onClick={() => removeLineItem(index)} className="text-slate-300 hover:text-rose-500 p-1.5 transition-colors shrink-0">
                                            <i className="fas fa-times text-sm"></i>
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 flex-1">
                                            <label className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Qty</label>
                                            <input
                                                type="number"
                                                placeholder="1"
                                                value={item.quantity}
                                                onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                                                min="1"
                                                required
                                            />
                                        </div>
                                        <div className="flex items-center gap-1 flex-[2]">
                                            <label className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Price</label>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={item.unitPrice === 0 ? '' : item.unitPrice}
                                                onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                                                step="0.01"
                                                required
                                            />
                                        </div>
                                        <span className="text-sm font-black text-indigo-600 shrink-0 text-right min-w-[4rem]">{formatCurrency(item.total)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addLineItem} className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1">
                            <i className="fas fa-plus-circle text-xs"></i> Add Line Item
                        </button>
                    </div>

                    <div className="text-right space-y-1">
                        <p className="text-sm">Subtotal: <span className="font-semibold">{formatCurrency(calculateSubtotal())}</span></p>
                        <div className="flex items-center justify-end gap-2">
                            <label className="text-sm">Tax Rate (%):</label>
                            <input
                                type="number"
                                value={taxRate === 0 ? '' : taxRate}
                                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                                className="w-20 p-1 border border-slate-200 rounded-lg text-sm text-right"
                                min="0"
                                max="100"
                            />
                        </div>
                        <p className="text-lg font-bold">Total: <span className="text-indigo-600">{formatCurrency(calculateTotal())}</span></p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700">Due Date</label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700">Amount Paid Now (Optional)</label>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            step="0.01"
                            min="0"
                            max={calculateTotal() || undefined}
                        />
                        {(() => {
                            const deposit = parseFloat(depositAmount) || 0;
                            const total = calculateTotal();
                            if (deposit <= 0) {
                                return <p className="text-xs text-slate-400 mt-1">Leave blank if nothing has been paid yet — invoice saves as unpaid.</p>;
                            }
                            if (deposit >= total && total > 0) {
                                return <p className="text-xs font-medium text-emerald-600 mt-1">Covers the full total — invoice will be marked fully paid, recorded as income now.</p>;
                            }
                            return <p className="text-xs font-medium text-amber-600 mt-1">Leaves {formatCurrency(Math.max(0, total - deposit))} still owing — invoice will be marked "partial".</p>;
                        })()}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700">Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        ></textarea>
                    </div>

                    {error && <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm">{error}</div>}

                    <div className="flex flex-col sm:flex-row gap-3 mt-6 sticky bottom-0 bg-white pt-4 pb-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-bold text-slate-600 order-3 sm:order-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={async () => {
                                // Basic form of handleSubmit but without print
                                setIsLoading(true);
                                try {
                                    const payload = buildPayload();
                                    await apiRequest('/invoices', { method: 'POST', body: payload });
                                    onSave();
                                    onClose();
                                } catch (err: any) {
                                    setError(err.message || 'Failed to create invoice.');
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                            className="flex-1 py-3 bg-slate-100 text-slate-900 rounded-xl hover:bg-slate-200 transition-colors font-bold order-2"
                            disabled={isLoading}
                        >
                            Save Only
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveAndPrint}
                            className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all hover:-translate-y-0.5 active:scale-95 disabled:bg-indigo-300 font-black uppercase tracking-wider text-xs order-1 sm:order-3"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Processing...' : 'Save & Print'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InvoiceFormModal;
