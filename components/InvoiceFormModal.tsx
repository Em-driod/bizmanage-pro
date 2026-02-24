import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { Client, ScannedInvoice } from '../types';
import { useCurrency } from '../context/CurrencyContext';

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
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string>('');
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
            newLineItems[index][field] = value;
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const payload = {
                clientId: selectedClientId,
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
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
                <h3 className="text-lg font-bold mb-4 text-slate-800">Create New Invoice</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700">Client</label>
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
                                        value={item.unitPrice}
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
                                value={taxRate}
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

                    <div className="flex gap-4 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors disabled:bg-indigo-300"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Creating...' : 'Create Invoice'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InvoiceFormModal;
