import React from 'react';
import { useCurrency } from '../context/CurrencyContext';

export interface AdvisorData {
  metrics: {
    healthScore: number;
    cashRunwayMonths: number;
    monthlyBurnRate: number;
    netMargin: number;
    overdueDebt: number;
    projectedRevenueNext30d: number;
  };
  dataQuality?: {
    confidence: 'low' | 'medium' | 'high';
    daysOfHistory: number;
    transactionsLast90d: number;
    caveat: string | null;
  };
  advisor: {
    scenarios: Array<{ title: string; impact: string; action: string }>;
    status: 'healthy' | 'warning' | 'critical';
  };
}

interface AdvisorPanelProps {
  data: AdvisorData | null;
  isLoading: boolean;
}

const AdvisorPanel: React.FC<AdvisorPanelProps> = ({ data, isLoading }) => {
  const { formatCurrency } = useCurrency();

  if (isLoading) {
    return (
      <div className="bg-slate-900 rounded-3xl p-8 mb-8 flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Morniy AI Analyzing...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, advisor, dataQuality } = data;

  const statusColors = {
    healthy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    critical: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };

  const currentStatusStyle = statusColors[advisor.status];

  const confidenceLabel = dataQuality?.confidence === 'high' ? 'High confidence'
    : dataQuality?.confidence === 'medium' ? 'Medium confidence'
    : dataQuality?.confidence === 'low' ? 'Low confidence' : null;
  const confidenceColor = dataQuality?.confidence === 'high' ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
    : dataQuality?.confidence === 'medium' ? 'text-amber-600 bg-amber-50 border-amber-100'
    : 'text-rose-600 bg-rose-50 border-rose-100';

  return (
    <div className="bg-white rounded-[2rem] p-6 lg:p-8 border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden mb-8 w-full">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 opacity-50"></div>

      <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-center">

        {/* Left Side: Score & Core Metrics */}
        <div className="w-full lg:w-auto lg:min-w-[300px] flex flex-col items-center lg:items-start text-center lg:text-left lg:border-r lg:border-slate-100 lg:pr-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm shadow-md">
              <i className="fas fa-brain"></i>
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Intelligence</h3>
          </div>

          {confidenceLabel && (
            <div className={`mb-6 px-3 py-2 rounded-xl border text-[10px] font-extrabold uppercase tracking-widest ${confidenceColor}`}>
              {confidenceLabel} · {dataQuality!.daysOfHistory}d history
              {dataQuality?.caveat && (
                <p className="text-[10px] font-medium normal-case tracking-normal mt-1 opacity-80">
                  {dataQuality.caveat}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col items-center lg:items-start mb-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Score</p>
            <div className="flex items-baseline gap-1">
              <span className="text-6xl font-black tracking-tighter text-slate-900">
                {metrics.healthScore}
              </span>
              <span className="text-lg font-bold text-slate-300">/100</span>
            </div>

            <div className={`mt-3 px-3 py-1 rounded-full border flex items-center gap-1.5 ${currentStatusStyle} bg-opacity-10 border-opacity-20`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider">
                {advisor.status === 'healthy' ? 'Great' : advisor.status === 'warning' ? 'Check' : 'Help'}
              </span>
            </div>
          </div>

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
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 col-span-2">
              <p className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-wide mb-0.5 text-center">Projected Revenue (30d)</p>
              <p className="text-sm font-black text-indigo-600 text-center">{formatCurrency(metrics.projectedRevenueNext30d)}</p>
            </div>
          </div>
        </div>

        {/* Right Side: Agentic Scenarios */}
        <div className="flex-1 w-full bg-[#080B13] rounded-3xl p-6 lg:p-8 border border-white/5 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

          <div className="flex items-center justify-between mb-6 relative z-10">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-indigo-500/20 flex items-center justify-center">
                <i className="fas fa-bolt text-[10px] text-indigo-400"></i>
              </div>
              {dataQuality?.confidence === 'low' ? 'Suggested next steps' : 'AI Strategic Scenarios'}
            </p>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest border border-white/10 px-2 py-1 rounded bg-white/5">
              {dataQuality?.confidence === 'low' ? 'Rule-based' : 'AI-generated'}
            </span>
          </div>

          <div className="space-y-4 relative z-10">
            {advisor.scenarios?.map((scenario, idx) => (
              <div key={idx} className="group p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all cursor-default">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{scenario.title}</h4>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black tracking-wider uppercase shrink-0">
                    <i className="fas fa-chart-line"></i> {scenario.impact}
                  </div>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                  {scenario.action}
                </p>
              </div>
            ))}

            {(!advisor.scenarios || advisor.scenarios.length === 0) && (
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                <p className="text-sm text-slate-400 font-medium">Business operates at optimal capacity. No immediate critical actions flagged by AI.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdvisorPanel;
