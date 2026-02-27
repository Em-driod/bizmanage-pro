import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { Client, ScannedInvoice } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { usePrint } from '../context/PrintContext';

interface LineItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

interface InvoiceFormModalProps {
    onClose: () => void;
    onSave: () => void;
    initialData?: ScannedInvoice | null;
}

const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({ onClose, onSave, initialData }) => {
    const { formatCurrency } = useCurrency();
    const { printReceipt } = usePrint();
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [customClientName, setCustomClientName] = useState<string>('');
    const [useCustomClient, setUseCustomClient] = useState<boolean>(false);
    const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    const [dueDate, setDueDate] = useState('');
    const [taxRate, setTaxRate] = useState(0); // in percentage
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const data = await apiRequest<Client[]>('/clients');
                setClients(data);
                if (data.length > 0) {
                    setSelectedClientId(data[0]._id);
                }
            } catch (err: any) {
                console.error("Failed to fetch clients:", err);
                setError("Failed to load clients.");
            }
        };
        fetchClients();
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

    const handleSaveAndPrint = async () => {
        setError(null);
        setIsLoading(true);

        try {
            const payload = {
                clientId: useCustomClient ? null : selectedClientId,
                customClientName: useCustomClient ? customClientName : null,
                lineItems,
                dueDate,
                tax: taxRate,
                subtotal: calculateSubtotal(),
                total: calculateTotal(),
                notes,
                recordAsIncome: true,
            };
            const response = await apiRequest<any>('/invoices', { method: 'POST', body: payload });

            // Trigger print
            let clientData;
            if (useCustomClient) {
                clientData = { _id: 'custom', name: customClientName };
            } else {
                clientData = clients.find(c => c._id === selectedClientId);
            }
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

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-4 p-6 max-h-[90vh] overflow-y-auto">
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
                        <label className="block text-sm font-medium mb-1 text-slate-700">Line Items</label>
                        <div className="space-y-2">
                            {lineItems.map((item, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Description"
                                        value={item.description}
                                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                                        className="flex-grow p-2 border border-slate-200 rounded-lg text-sm"
                                        required
                                    />
                                    <input
                                        type="number"
                                        placeholder="Qty"
                                        value={item.quantity}
                                        onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                                        className="w-20 p-2 border border-slate-200 rounded-lg text-sm"
                                        min="1"
                                        required
                                    />
                                    <input
                                        type="number"
                                        placeholder="Unit Price"
                                        value={item.unitPrice === 0 ? '' : item.unitPrice}
                                        onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                                        className="w-28 p-2 border border-slate-200 rounded-lg text-sm"
                                        step="0.01"
                                        required
                                    />
                                    <span className="w-24 text-right font-medium">{formatCurrency(item.total)}</span>
                                    <button type="button" onClick={() => removeLineItem(index)} className="text-rose-500 hover:text-rose-700 p-2">
                                        <i className="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addLineItem} className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1">
                            <i className="fas fa-plus-circle"></i> Add Line Item
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
                                    const payload = {
                                        clientId: useCustomClient ? null : selectedClientId,
                                        customClientName: useCustomClient ? customClientName : null,
                                        lineItems,
                                        dueDate,
                                        tax: taxRate,
                                        subtotal: calculateSubtotal(),
                                        total: calculateTotal(),
                                        notes,
                                    };
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
                            {isLoading ? 'Processing...' : 'Print & Record Income'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InvoiceFormModal;
