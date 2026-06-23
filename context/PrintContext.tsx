import React, { createContext, useContext, useState, useCallback } from 'react';
import { Client } from '../types';

interface PrintData {
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

interface PrintContextType {
    printReceipt: (data: PrintData) => void;
    printData: PrintData | null;
}

const PrintContext = createContext<PrintContextType | undefined>(undefined);

export const PrintProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [printData, setPrintData] = useState<PrintData | null>(null);

    const printReceipt = useCallback((data: PrintData) => {
        setPrintData(data);
        // Use a small timeout to ensure the DOM is updated before printing
        setTimeout(() => {
            window.print();
        }, 100);
    }, []);

    return (
        <PrintContext.Provider value={{ printReceipt, printData }}>
            {children}
        </PrintContext.Provider>
    );
};

export const usePrint = () => {
    const context = useContext(PrintContext);
    if (!context) {
        throw new Error('usePrint must be used within a PrintProvider');
    }
    return context;
};
