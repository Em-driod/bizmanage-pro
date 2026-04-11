import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export interface CommandResponse {
  intent: 'LOG_TRANSACTION' | 'QUERY_DATA';
  data?: {
    amount: number;
    type: 'income' | 'expense';
    description: string;
  };
  markdownResponse?: string;
  message?: string;
}

const CommandPalette: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; isQuery?: boolean; markdown?: string } | null>(null);
  
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
      setTimeout(() => inputRef.current?.focus(), 50);
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
      // 1. Contextual Agentic NLP Phase
      const parsed = await apiRequest<CommandResponse>('/intelligence/parse', {
        method: 'POST',
        body: { command }
      });

      // 2. Intent Execution Phase
      if (parsed.intent === 'LOG_TRANSACTION' && parsed.data) {
        await apiRequest('/transactions', {
          method: 'POST',
          body: {
            amount: parsed.data.amount,
            type: parsed.data.type,
            description: parsed.data.description,
            category: 'Uncategorized' 
          }
        });
        setResult({ success: true, message: `Logged ${parsed.data.type} of $${parsed.data.amount}.` });
        setTimeout(() => setIsOpen(false), 2000);
      } 
      else if (parsed.intent === 'QUERY_DATA' && parsed.markdownResponse) {
        setResult({ 
          success: true, 
          message: 'Query complete', 
          isQuery: true, 
          markdown: parsed.markdownResponse 
        });
        // We do NOT auto-close for queries so the user can read the markdown!
        setCommand(''); // clear the input so they can ask another question
      }
      else {
          setResult({ success: false, message: 'OpsFlow Intelligence could not process the format.' });
      }

    } catch (error: any) {
      console.error('Command failed:', error);
      setResult({ success: false, message: error.message || 'Failed to interpret command.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const createMarkup = (md?: string) => {
    if (!md) return { __html: '' };
    // Synchronously parse markdown and sanitize
    const rawHtml = marked.parse(md, { async: false }) as string;
    const sanitizedHtml = DOMPurify.sanitize(rawHtml);
    return { __html: sanitizedHtml };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center pt-[8vh] px-4 animate-in fade-in zoom-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
        onClick={() => setIsOpen(false)}
      ></div>

      {/* Palette Modal (Premium styling) */}
      <div className="relative w-full max-w-3xl bg-[#080B13] rounded-3xl shadow-[0_0_80px_-15px_rgba(99,102,241,0.3)] border border-slate-700/50 overflow-hidden transform scale-100 transition-all flex flex-col max-h-[85vh]">
        
        {/* Header / Input Area */}
        <div className="relative z-10 flex-shrink-0">
          <form onSubmit={handleSubmit} className="relative flex items-center px-6 h-20 border-b border-white/10 bg-white/[0.02]">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mr-4 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
               <i className="fas fa-sparkles text-sm"></i>
            </div>
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-transparent border-none text-white text-xl md:text-2xl font-light placeholder-slate-600 focus:outline-none focus:ring-0"
              placeholder="Ask OpsFlow anything, or log a transaction..."
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              disabled={isProcessing}
              autoComplete="off"
              spellCheck="false"
            />
            
            <div className="flex items-center gap-2 ml-4">
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <kbd className="hidden sm:flex items-center justify-center h-6 px-2 bg-white/5 text-slate-400 rounded text-[10px] font-bold uppercase tracking-wider border border-white/10">
                    ↵
                  </kbd>
                  <kbd className="hidden sm:flex items-center justify-center h-6 px-2 bg-white/5 text-slate-400 rounded text-[10px] font-bold uppercase tracking-wider border border-white/10">
                    Esc
                  </kbd>
                </>
              )}
            </div>
          </form>
          {isProcessing && (
              <div className="absolute bottom-0 left-0 h-[2px] bg-indigo-500 overflow-hidden w-full">
                  <div className="h-full bg-[#C8FF00] w-1/3 animate-[slide_1.5s_ease-in-out_infinite]"></div>
              </div>
          )}
        </div>

        {/* Results Body / Suggestions */}
        <div className="flex-1 overflow-y-auto bg-black/20 p-6 custom-scrollbar">
          {result ? (
            result.isQuery ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                   <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-robot text-xs"></i>
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">OpsFlow Intelligence</p>
                     <p className="text-xs text-slate-400 font-medium">Context: Live Business Data</p>
                   </div>
                </div>
                {/* Markdown Rendering Container */}
                <div 
                  className="prose prose-invert prose-p:text-slate-300 prose-headings:text-white prose-a:text-indigo-400 hover:prose-a:text-indigo-300 prose-strong:text-white prose-strong:font-bold prose-ul:list-disc prose-ul:pl-4 prose-li:my-1 max-w-none text-sm md:text-base leading-relaxed"
                  dangerouslySetInnerHTML={createMarkup(result.markdown)}
                />
              </div>
            ) : (
              <div className={`p-5 rounded-2xl flex items-center gap-4 ${result.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'} animate-in zoom-in-95 duration-300`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${result.success ? 'bg-emerald-500/20' : 'bg-rose-500/20'} shrink-0`}>
                  <i className={`fas ${result.success ? 'fa-check' : 'fa-exclamation'} text-lg`}></i>
                </div>
                <p className="font-medium">{result.message}</p>
              </div>
            )
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
                <div className="col-span-full">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Try Asking</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setCommand("Which client owes me the most money right now?")}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/10 text-left transition-all group"
                >
                   <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all flex items-center justify-center shrink-0">
                      <i className="fas fa-search-dollar text-xs"></i>
                   </div>
                   <div>
                      <p className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">"Which client owes me the most money right now?"</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-wider">Analytical Query</p>
                   </div>
                </button>
                <button 
                  type="button"
                  onClick={() => setCommand("What was my total income over the last 30 days?")}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/10 text-left transition-all group"
                >
                   <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all flex items-center justify-center shrink-0">
                      <i className="fas fa-chart-line text-xs"></i>
                   </div>
                   <div>
                      <p className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">"What was my total income over the last 30 days?"</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-wider">Analytical Query</p>
                   </div>
                </button>
                
                <div className="col-span-full mt-4">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Or Quick Logging</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setCommand("I just bought coffee for $45.20")}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/10 text-left transition-all group"
                >
                   <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                      <i className="fas fa-arrow-down text-xs"></i>
                   </div>
                   <div>
                      <p className="text-sm text-slate-300 group-hover:text-white transition-colors">I just bought coffee for $45.20</p>
                   </div>
                </button>
                <button 
                  type="button"
                  onClick={() => setCommand("Got paid 2000 from Client Alpha")}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/10 text-left transition-all group"
                >
                   <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                      <i className="fas fa-arrow-up text-xs"></i>
                   </div>
                   <div>
                      <p className="text-sm text-slate-300 group-hover:text-white transition-colors">Got paid 2000 from Client Alpha</p>
                   </div>
                </button>
            </div>
          )}
        </div>
        <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }`}</style>
      </div>
    </div>
  );
};

export default CommandPalette;
