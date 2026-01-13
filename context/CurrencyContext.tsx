
import React, { createContext, useContext, useState, useMemo } from 'react';
import { formatCurrency } from '../utils/currency';

// Define the shape of the context
interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  availableCurrencies: string[];
  formatCurrency: (amount: number) => string; // Modified to use the context's currency
}

// Create the context with a default value
const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Define the props for the provider
interface CurrencyProviderProps {
  children: React.ReactNode;
}

// Create the provider component
export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const [currency, setCurrency] = useState<string>('USD'); // Default currency
  const availableCurrencies = useMemo(() => ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NGN'], []);

  const contextValue = useMemo(() => ({
    currency,
    setCurrency,
    availableCurrencies,
    formatCurrency: (amount: number) => formatCurrency(amount, currency) // Pass the current currency from context
  }), [currency, availableCurrencies]);

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
};

// Create a custom hook for using the context
export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
