import React, { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

interface AdvisorData {
  metrics: {
    healthScore: number;
    cashRunwayMonths: number;
    monthlyBurnRate: number;
    netMargin: number;
    overdueDebt: number;
  };
  advisor: {
    message: string;
    status: 'healthy' | 'warning' | 'critical';
  };
}

const AdvisorPanel: React.FC = () => {
  const [data, setData] = useState<AdvisorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { formatCurrency } = useCurrency();

  const fetchIntelligence = async () => {
    try {
      const res = await apiRequest<AdvisorData>('/intelligence/advisor');
      setData(res);
    } catch (error) {
      console.error('Failed to fetch advisor data', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligence();
    // Listen for real-time updates and refresh advisor data
    window.addEventListener('OpsFlowDataUpdate', fetchIntelligence);
    return () => window.removeEventListener('OpsFlowDataUpdate', fetchIntelligence);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-slate-900 rounded-3xl p-8 mb-8 flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">OpsFlow AI Analyzing...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, advisor } = data;

  // Status Colors
  const statusColors = {
    healthy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    critical: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };

  const currentStatusStyle = statusColors[advisor.status];

  return (
    <div className="bg-white rounded-[2rem] p-6 lg:p-8 border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden mb-8 w-full">
      {/* Subtle decorative elements matching light theme */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 opacity-50"></div>
      
      <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-center">
        
        {/* Left Side: Score & Core Metrics */}
        <div className="w-full lg:w-auto lg:min-w-[300px] flex flex-col items-center lg:items-start text-center lg:text-left lg:border-r lg:border-slate-100 lg:pr-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm shadow-md">
              <i className="fas fa-brain"></i>
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Intelligence</h3>
          </div>

          <div className="flex flex-col items-center lg:items-start mb-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Score</p>
            <div className="flex items-baseline gap-1">
              <span className="text-6xl font-black tracking-tighter text-slate-900">
                {metrics.healthScore}
              </span>
              <span className="text-lg font-bold text-slate-300">/100</span>
            </div>
            
            {/* Status Badge */}
            <div className={`mt-3 px-3 py-1 rounded-full border flex items-center gap-1.5 ${currentStatusStyle} bg-opacity-10 border-opacity-20`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider">
                {advisor.status === 'healthy' ? 'Great' : advisor.status === 'warning' ? 'Check' : 'Help'}
              </span>
            </div>
          </div>

          {/* Quick Stats Grid - Cleaner layout */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs lg:max-w-none">
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide mb-0.5 text-center">Time Left</p>
              <p className="text-sm font-black text-slate-800 text-center">{metrics.cashRunwayMonths >= 99 ? '∞' : `${metrics.cashRunwayMonths.toFixed(1)} mo`}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide mb-0.5 text-center">Spend</p>
              <p className="text-sm font-black text-slate-800 text-center">{formatCurrency(metrics.monthlyBurnRate)}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide mb-0.5 text-center">Profit</p>
              <p className="text-sm font-black text-slate-800 text-center">{metrics.netMargin}%</p>
            </div>
             <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide mb-0.5 text-center">Unpaid</p>
              <p className="text-sm font-black text-slate-800 text-center">{formatCurrency(metrics.overdueDebt)}</p>
            </div>
          </div>
        </div>

        {/* Right Side: Simple Advice */}
        <div className="flex-1 w-full bg-slate-50/50 rounded-3xl p-6 lg:p-8 border border-slate-100 relative">
          <div className="absolute top-4 right-4 text-indigo-100">
             <i className="fas fa-quote-right text-4xl"></i>
          </div>
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <i className="fas fa-sparkles text-[8px]"></i> Advice
          </p>
          <div className="relative">
            <p className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight">
              {advisor.message}
            </p>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Live Insight</span>
            <button className="text-[10px] font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest px-3 py-1 hover:bg-slate-100 rounded-lg">
              Got it
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdvisorPanel;
