
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { formatCurrency as formatCurrencyUtil } from '../utils/currency';
import { apiRequest } from '../services/api';
import { useAuth } from './AuthContext'; // Import useAuth

// Define the shape of the context
interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  availableCurrencies: string[];
  formatCurrency: (amount: number, baseCurrency?: string) => string;
}

// Create the context with a default value
const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Define the props for the provider
interface CurrencyProviderProps {
  children: React.ReactNode;
}

// Create the provider component
export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth(); // Get authentication status
  const [currency, setCurrency] = useState<string>('NGN'); // Default currency is Naira
  const [rates, setRates] = useState<any>(null);
  const availableCurrencies = useMemo(() => ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NGN'], []);

  useEffect(() => {
    const fetchRates = async () => {
      if (!isAuthenticated) { // Only fetch if authenticated
        setRates(null); // Clear rates if not authenticated
        return;
      }
      try {
        const data = await apiRequest<any>('/currency/rates');
        setRates(data.ngn);
      } catch (error) {
        console.error("Failed to fetch exchange rates", error);
        setRates(null); // Clear rates on error
      }
    };
    fetchRates();
  }, [isAuthenticated]); // Re-run when authentication status changes

  const formatCurrency = (amount: number, targetCurrency: string = currency): string => {
    if (!rates) {
      return formatCurrencyUtil(amount, 'NGN'); // Show in base currency if rates not loaded
    }

    const rate = rates[targetCurrency.toLowerCase()];
    if (!rate) {
        return formatCurrencyUtil(amount, 'NGN'); // Fallback to NGN if rate not found
    }

    const convertedAmount = amount * rate;
    return formatCurrencyUtil(convertedAmount, targetCurrency);
  };

  const contextValue = useMemo(() => ({
    currency,
    setCurrency,
    availableCurrencies,
    formatCurrency,
  }), [currency, availableCurrencies, rates]);

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
