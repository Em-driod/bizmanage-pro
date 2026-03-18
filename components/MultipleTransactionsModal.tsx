import React from 'react';
import { useCurrency } from '../context/CurrencyContext';

interface ScannedTransaction {
  amount: number;
  type: 'income' | 'expense';
  description: string;
  category: string;
}

interface MultipleTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: ScannedTransaction[];
  onConfirm: () => void;
}

const MultipleTransactionsModal: React.FC<MultipleTransactionsModalProps> = ({ isOpen, onClose, transactions, onConfirm }) => {
  const { formatCurrency } = useCurrency();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center animate-in fade-in-25">
      <div className="bg-blue-50 rounded-2xl shadow-xl w-full max-w-2xl p-8 m-4 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Scanned your Transactions</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {transactions.map((tx, index) => (
            <div key={index} className="p-4 border rounded-lg flex justify-between items-center">
              <div>
                <p className="font-semibold">{tx.description}</p>
                <p className="text-sm text-gray-500">{tx.category} - <span className={tx.type === 'income' ? 'text-green-500' : 'text-red-500'}>{tx.type}</span></p>
              </div>
              <p className="font-bold">{formatCurrency(tx.amount)}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Confirm and Add All
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultipleTransactionsModal;
