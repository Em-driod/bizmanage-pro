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
    <div className="bg-[#0A0F1A] rounded-3xl p-8 lg:p-10 text-white shadow-2xl relative overflow-hidden mb-10 w-full">
      {/* Decorative gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-violet-600/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/3"></div>

      <div className="relative z-10 flex flex-col lg:flex-row gap-10 items-stretch">
        
        {/* Left Side: Score & Core Metrics */}
        <div className="flex-1 lg:border-r lg:border-white/10 lg:pr-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-indigo-500/30">
              <i className="fas fa-brain"></i>
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">OpsFlow Intelligence</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Powered by Gemini 2.5 Pro</p>
            </div>
          </div>

          <div className="flex items-end gap-6 mb-8">
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-2">Health Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">
                  {metrics.healthScore}
                </span>
                <span className="text-xl font-bold text-slate-500">/100</span>
              </div>
            </div>
            
            {/* Status Badge */}
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 mb-2 ${currentStatusStyle}`}>
              <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
              <span className="text-xs font-black uppercase tracking-wider">
                {advisor.status === 'healthy' ? 'OPTIMAL' : advisor.status === 'warning' ? 'CAUTION' : 'CRITICAL'}
              </span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <i className="fas fa-plane-departure text-indigo-400 mb-2"></i>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Cash Runway</p>
              <p className="text-lg font-black">{metrics.cashRunwayMonths >= 99 ? '∞' : `${metrics.cashRunwayMonths.toFixed(1)} mo`}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <i className="fas fa-fire text-rose-400 mb-2"></i>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Avg Burn</p>
              <p className="text-lg font-black">{formatCurrency(metrics.monthlyBurnRate)}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <i className="fas fa-percentage text-emerald-400 mb-2"></i>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Net Margin</p>
              <p className="text-lg font-black">{metrics.netMargin}%</p>
            </div>
             <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <i className="fas fa-file-invoice-dollar text-amber-400 mb-2"></i>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">At Risk Debt</p>
              <p className="text-lg font-black">{formatCurrency(metrics.overdueDebt)}</p>
            </div>
          </div>
        </div>

        {/* Right Side: AI Advice */}
        <div className="flex-1 flex flex-col justify-center bg-white/5 rounded-3xl p-6 lg:p-8 border border-white/10 backdrop-blur-sm">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <i className="fas fa-sparkles"></i> CFO Directive
          </p>
          <div className="prose prose-invert prose-p:leading-relaxed prose-p:text-slate-300 max-w-none">
            <p className="text-lg sm:text-xl md:text-2xl font-medium !leading-snug">
              "{advisor.message}"
            </p>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-medium">Insights generated in real-time.</span>
            <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors tooltip" aria-label="Dismiss">
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdvisorPanel;
