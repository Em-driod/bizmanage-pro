import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CommandPalette: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Key Listener for Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isAuthenticated) {
          setIsOpen((prev) => !prev);
        }
      }
      
      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAuthenticated]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small timeout to ensure transition completes before focus
      setTimeout(() => inputRef.current?.focus(), 50);
      // Reset state when opening
      setCommand('');
      setResult(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isProcessing) return;

    setIsProcessing(true);
    setResult(null);

    try {
      // 1. NLP Parse Phase
      const parsed = await apiRequest<{ amount: number; type: 'income' | 'expense'; description: string }>('/intelligence/parse', {
        method: 'POST',
        body: { command }
      });

      // 2. Execution Phase
      // We pass null for category so the ML engine (learningService) can auto-categorize it backwardly in the controller!
      await apiRequest('/transactions', {
        method: 'POST',
        body: {
          amount: parsed.amount,
          type: parsed.type,
          description: parsed.description,
          category: 'Uncategorized' // Will be auto-replaced by AI
        }
      });

      setResult({ success: true, message: `Logged ${parsed.type} of $${parsed.amount}.` });
      
      // Flash success, then close automatically after brief delay
      setTimeout(() => {
        setIsOpen(false);
      }, 1500);

    } catch (error: any) {
      console.error('Command failed:', error);
      setResult({ success: false, message: error.message || 'Failed to parse command.' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pt-[10vh] px-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      ></div>

      {/* Palette Modal */}
      <div className="relative w-full max-w-2xl bg-[#0F172A] rounded-2xl shadow-2xl shadow-indigo-900/50 border border-slate-700/50 overflow-hidden transform scale-100 transition-all">
        
        {/* Header / Input Area */}
        <form onSubmit={handleSubmit} className="relative flex items-center px-4 border-b border-slate-700/50">
          <i className="fas fa-terminal text-indigo-400 text-lg mr-4"></i>
          <input
            ref={inputRef}
            type="text"
            className="w-full h-16 bg-transparent border-none text-white text-lg font-medium placeholder-slate-500 focus:outline-none focus:ring-0"
            placeholder="Type a command... e.g. 'Log 50 bucks for Uber'"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={isProcessing}
            autoComplete="off"
            spellCheck="false"
          />
          
          <div className="flex items-center gap-2">
            {isProcessing && (
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            )}
            <kbd className="hidden sm:inline-block px-2 py-1 bg-slate-800 text-slate-400 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-700">
              Enter
            </kbd>
            <kbd className="hidden sm:inline-block px-2 py-1 bg-slate-800 text-slate-400 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-700">
              Esc
            </kbd>
          </div>
        </form>

        {/* Results Body / Suggestions */}
        <div className="p-4 bg-slate-800/20">
          {result ? (
            <div className={`p-4 rounded-xl flex items-center gap-3 ${result.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
              <i className={`fas ${result.success ? 'fa-check-circle' : 'fa-exclamation-circle'} text-lg`}></i>
              <p className="text-sm font-bold">{result.message}</p>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-3">AI Suggestions</p>
              <div className="space-y-1">
                <button 
                  type="button"
                  onClick={() => setCommand("I paid $15.50 for Staples office supplies")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-left transition-colors group"
                >
                   <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <i className="fas fa-sparkles text-xs"></i>
                   </div>
                   <div>
                      <p className="text-sm text-slate-300 font-medium group-hover:text-white">I paid <span className="text-indigo-400 font-bold">$15.50</span> for Staples office supplies</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 tracking-wider">Example Command</p>
                   </div>
                </button>
                <button 
                  type="button"
                  onClick={() => setCommand("Got paid 2000 from Client Alpha")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-left transition-colors group"
                >
                   <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <i className="fas fa-money-bill-wave text-xs"></i>
                   </div>
                   <div>
                      <p className="text-sm text-slate-300 font-medium group-hover:text-white">Got paid <span className="text-emerald-400 font-bold">2000</span> from Client Alpha</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 tracking-wider">Example Command</p>
                   </div>
                </button>
              </div>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default CommandPalette;
