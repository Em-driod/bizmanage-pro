import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

interface SearchResults {
  clients: Array<{ _id: string; name: string; email: string; phone?: string }>;
  invoices: Array<{ _id: string; invoiceNumber: string; clientName: string; total: number; status: string }>;
  transactions: Array<{ _id: string; description: string; amount: number; type: string; category: string }>;
}

const SearchModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setIsLoading(true);
    try {
      const data = await apiRequest<SearchResults>(`/search?q=${encodeURIComponent(q)}`);
      setResults(data);
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 280);
  };

  const go = (path: string) => { navigate(path); onClose(); };

  const totalResults = results
    ? results.clients.length + results.invoices.length + results.transactions.length
    : 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-100">
          <i className={`fas fa-magnifying-glass text-slate-400 ${isLoading ? 'animate-pulse' : ''}`}></i>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Search clients, invoices, transactions..."
            className="flex-1 text-base text-slate-800 placeholder-slate-400 bg-transparent border-none outline-none focus:ring-0"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:flex items-center h-6 px-2 bg-slate-100 text-slate-400 rounded text-[10px] font-bold">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-50">
          {!query || query.length < 2 ? (
            <div className="p-8 text-center">
              <i className="fas fa-magnifying-glass text-2xl text-slate-200 mb-3 block"></i>
              <p className="text-sm text-slate-400">Type at least 2 characters to search</p>
              <p className="text-[11px] text-slate-300 mt-1">Searches clients, invoices &amp; transactions</p>
            </div>
          ) : isLoading && !results ? (
            <div className="p-8 text-center">
              <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
            </div>
          ) : totalResults === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-400">No results for "<span className="font-semibold text-slate-600">{query}</span>"</p>
            </div>
          ) : (
            <>
              {results!.clients.length > 0 && (
                <div>
                  <p className="px-5 pt-4 pb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clients</p>
                  {results!.clients.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => go('/clients')}
                      className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-indigo-50 transition-colors text-left group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-address-book text-sm"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-700">{c.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{c.email}</p>
                      </div>
                      <i className="fas fa-arrow-right text-xs text-slate-300 group-hover:text-indigo-400 transition-colors"></i>
                    </button>
                  ))}
                </div>
              )}

              {results!.invoices.length > 0 && (
                <div>
                  <p className="px-5 pt-4 pb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoices</p>
                  {results!.invoices.map((inv) => (
                    <button
                      key={inv._id}
                      onClick={() => go('/invoices')}
                      className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-indigo-50 transition-colors text-left group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-file-invoice text-sm"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-700">
                          #{inv.invoiceNumber}
                          <span className="ml-2 text-slate-400 font-medium">{inv.clientName}</span>
                        </p>
                        <p className="text-[11px] text-slate-400">{formatCurrency(inv.total)} · {inv.status}</p>
                      </div>
                      <i className="fas fa-arrow-right text-xs text-slate-300 group-hover:text-indigo-400 transition-colors"></i>
                    </button>
                  ))}
                </div>
              )}

              {results!.transactions.length > 0 && (
                <div>
                  <p className="px-5 pt-4 pb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transactions</p>
                  {results!.transactions.map((tx) => (
                    <button
                      key={tx._id}
                      onClick={() => go('/transactions')}
                      className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-indigo-50 transition-colors text-left group"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        <i className={`fas ${tx.type === 'income' ? 'fa-arrow-down-left' : 'fa-arrow-up-right'} text-sm`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-700">{tx.description}</p>
                        <p className="text-[11px] text-slate-400">{tx.category} · {formatCurrency(tx.amount)}</p>
                      </div>
                      <i className="fas fa-arrow-right text-xs text-slate-300 group-hover:text-indigo-400 transition-colors"></i>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-slate-50 flex items-center justify-between bg-slate-50/50">
          <p className="text-[10px] text-slate-400">Press <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold">S</kbd> anywhere to search</p>
          {totalResults > 0 && (
            <p className="text-[10px] text-slate-400 font-semibold">{totalResults} result{totalResults !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
