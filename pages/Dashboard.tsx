import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import ScanTransactionModal from '../components/ScanTransactionModal';
import AdvisorPanel, { AdvisorData } from '../components/AdvisorPanel';

import OnboardingChecklist from '../components/OnboardingChecklist';

interface KpiData {
  value: number;
  trend: number[];
}

interface KpiCardProps {
  label: string;
  data: KpiData;
  icon: string;
  color: string;
  isLoading: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, data, icon, color, isLoading }) => {
  const { formatCurrency } = useCurrency();

  const bgMap: Record<string, string> = {
    'text-emerald-500': 'bg-emerald-50',
    'text-rose-500': 'bg-rose-50',
    'text-indigo-500': 'bg-indigo-50',
    'text-blue-500': 'bg-blue-50',
  };
  const iconBg = bgMap[color] || 'bg-slate-50';

  let percentChange = 0;
  if (data?.trend && data.trend.length > 1) {
    const len = data.trend.length;
    const prev = data.trend.slice(0, Math.floor(len / 2)).reduce((a, b) => a + b, 0);
    const curr = data.trend.slice(Math.floor(len / 2)).reduce((a, b) => a + b, 0);
    if (prev > 0) percentChange = ((curr - prev) / prev) * 100;
  }
  const isPositive = percentChange >= 0;
  const showBadge = !isLoading && percentChange !== 0 && Math.abs(percentChange) < 1000;

  const formatCompact = (v: number) => {
    const formatted = formatCurrency(v);
    if (v >= 1_000_000) return formatCurrency(v / 1_000_000).replace(/\.0+$/, '') + 'M';
    if (v >= 100_000) return formatCurrency(v / 1_000).replace(/\.0+$/, '') + 'K';
    return formatted;
  };

  return (
    <div className="bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <i className={`fas ${icon} ${color} text-sm`}></i>
        </div>
        {showBadge && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {isPositive ? '+' : ''}{percentChange.toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">{label}</p>
      <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate leading-tight">
        {isLoading
          ? <span className="inline-block w-20 h-6 bg-slate-100 animate-pulse rounded" />
          : (label === 'Customers' ? data.value : formatCompact(data.value))
        }
      </p>
    </div>
  );
};

/* ─── Custom SVG Area Chart ─────────────────────────────────────── */
interface PerfChartPoint {
  month?: string;
  isProjection?: boolean;
  totalIncome?: number;
  totalExpenses?: number;
  projIncome?: number;
  projExpenses?: number;
}

interface PerfChartFilter {
  year: number;
  month: string;
  interval: '6m' | '1y' | '1m';
}

const PerfChart: React.FC<{
  data: PerfChartPoint[];
  isLoading: boolean;
  filter: PerfChartFilter;
  onFilterChange: (f: PerfChartFilter) => void;
  formatCurrency: (v: number) => string;
}> = ({ data, isLoading, filter, onFilterChange, formatCurrency }) => {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [hover, setHover] = React.useState<{ x: number; idx: number } | null>(null);
  const [dims, setDims] = React.useState({ w: 600, h: 240 });

  React.useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0]!.contentRect;
      setDims({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const PAD = { top: 20, right: 16, bottom: 32, left: 52 };
  const W = dims.w - PAD.left - PAD.right;
  const H = dims.h - PAD.top - PAD.bottom;

  const historical = data.filter((d: PerfChartPoint) => !d.isProjection);
  const allVals = data.flatMap((d: PerfChartPoint) => [d.totalIncome ?? 0, d.totalExpenses ?? 0, d.projIncome ?? 0, d.projExpenses ?? 0]);
  const maxVal = Math.max(...allVals, 1);

  const xPos = (i: number, total: number) => PAD.left + (i / Math.max(total - 1, 1)) * W;
  const yPos = (v: number) => PAD.top + H - (v / maxVal) * H;

  const smoothPath = (points: [number, number][]): string => {
    if (points.length < 2) return '';
    let d = `M ${points[0]![0]} ${points[0]![1]}`;
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1]!;
      const [x1, y1] = points[i]!;
      const cx = (x0 + x1) / 2;
      d += ` C ${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`;
    }
    return d;
  };

  const areaPath = (points: [number, number][], bottom: number): string => {
    if (points.length < 2) return '';
    const line = smoothPath(points);
    const last = points[points.length - 1]!;
    const first = points[0]!;
    return `${line} L ${last[0]} ${bottom} L ${first[0]} ${bottom} Z`;
  };

  const incomePoints: [number, number][] = historical.map((d: PerfChartPoint, i: number) => [xPos(i, historical.length), yPos(d.totalIncome ?? 0)]);
  const expensePoints: [number, number][] = historical.map((d: PerfChartPoint, i: number) => [xPos(i, historical.length), yPos(d.totalExpenses ?? 0)]);

  const projData = data.filter((d: PerfChartPoint) => d.isProjection);
  const projStart = historical.length - 1;
  const projIncomePoints: [number, number][] = [
    [xPos(projStart, data.length), yPos(historical[projStart]?.totalIncome ?? 0)],
    ...projData.map((d: PerfChartPoint, i: number) => [xPos(projStart + 1 + i, data.length), yPos(d.projIncome ?? 0)] as [number, number]),
  ];
  const projExpensePoints: [number, number][] = [
    [xPos(projStart, data.length), yPos(historical[projStart]?.totalExpenses ?? 0)],
    ...projData.map((d: PerfChartPoint, i: number) => [xPos(projStart + 1 + i, data.length), yPos(d.projExpenses ?? 0)] as [number, number]),
  ];

  const bottom = PAD.top + H;
  const gridVals = [0, 0.25, 0.5, 0.75, 1].map(f => maxVal * f);

  const totalIncome = historical.reduce((s: number, d: PerfChartPoint) => s + (d.totalIncome ?? 0), 0);
  const totalExpenses = historical.reduce((s: number, d: PerfChartPoint) => s + (d.totalExpenses ?? 0), 0);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left - PAD.left;
    const count = data.length;
    if (count < 2) return;
    const step = W / (count - 1);
    const idx = Math.round(mx / step);
    if (idx >= 0 && idx < count) {
      setHover({ x: xPos(idx, count), idx });
    }
  };

  const hoverItem = hover !== null ? data[hover.idx] : null;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-slate-900 tracking-tight">Performance</h3>
          <p className="text-xs text-slate-400 mt-0.5">Income vs. Expenses over time</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-shrink-0">
          {[{ label: '6M', value: '6m' }, { label: '1Y', value: '1y' }].map(opt => (
            <button
              key={opt.value}
              onClick={() => opt.value === '6m'
                ? onFilterChange({ year: new Date().getFullYear(), month: '', interval: '6m' })
                : onFilterChange({ ...filter, interval: '1y' })
              }
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filter.interval === opt.value ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="px-6 pb-4 flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Income</p>
            <p className="text-sm font-black text-slate-900">{formatCurrency(totalIncome)}</p>
          </div>
        </div>
        <div className="w-px h-8 bg-slate-100" />
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expenses</p>
            <p className="text-sm font-black text-slate-900">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
        <div className="w-px h-8 bg-slate-100" />
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net</p>
          <p className={`text-sm font-black ${totalIncome - totalExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(totalIncome - totalExpenses)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: 220 }}>
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-slate-100 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-slate-300 font-medium">No data yet</p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            width="100%" height="100%"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHover(null)}
            className="overflow-visible"
          >
            <defs>
              <linearGradient id="g-income" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="g-expense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.13" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
              </linearGradient>
              <filter id="glow-green">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glow-rose">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Grid lines */}
            {gridVals.map((v, i) => {
              const y = yPos(v);
              return (
                <g key={i}>
                  <line x1={PAD.left} y1={y} x2={PAD.left + W} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                  <text x={PAD.left - 6} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="9" fontWeight="600">
                    {v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : v.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {/* X labels */}
            {data.map((d: PerfChartPoint, i: number) => (
              <text key={i} x={xPos(i, data.length)} y={bottom + 18} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="700">
                {d.month}
              </text>
            ))}

            {/* Filled areas */}
            {incomePoints.length > 1 && (
              <path d={areaPath(incomePoints, bottom)} fill="url(#g-income)" />
            )}
            {expensePoints.length > 1 && (
              <path d={areaPath(expensePoints, bottom)} fill="url(#g-expense)" />
            )}

            {/* Lines */}
            {incomePoints.length > 1 && (
              <path d={smoothPath(incomePoints)} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow-green)" />
            )}
            {expensePoints.length > 1 && (
              <path d={smoothPath(expensePoints)} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow-rose)" />
            )}

            {/* Forecast dashed lines */}
            {projIncomePoints.length > 1 && (
              <path d={smoothPath(projIncomePoints)} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" opacity="0.5" />
            )}
            {projExpensePoints.length > 1 && (
              <path d={smoothPath(projExpensePoints)} fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" opacity="0.5" />
            )}

            {/* Data dots */}
            {incomePoints.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="3.5" fill="#10b981" stroke="white" strokeWidth="2" />
            ))}
            {expensePoints.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="3.5" fill="#f43f5e" stroke="white" strokeWidth="2" />
            ))}

            {/* Hover crosshair */}
            {hover && hoverItem && (
              <>
                <line x1={hover.x} y1={PAD.top} x2={hover.x} y2={bottom} stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="3 3" />
                {/* Highlight dots */}
                {hoverItem.totalIncome != null && (
                  <circle cx={hover.x} cy={yPos(hoverItem.totalIncome)} r="6" fill="#10b981" stroke="white" strokeWidth="2.5" />
                )}
                {hoverItem.totalExpenses != null && (
                  <circle cx={hover.x} cy={yPos(hoverItem.totalExpenses)} r="6" fill="#f43f5e" stroke="white" strokeWidth="2.5" />
                )}
              </>
            )}
          </svg>
        )}

        {/* Floating tooltip */}
        {hover && hoverItem && (
          <div
            className="absolute pointer-events-none z-10"
            style={{
              left: Math.min(hover.x + 12, dims.w - 160),
              top: PAD.top,
              transform: hover.x > dims.w * 0.65 ? 'translateX(calc(-100% - 20px))' : undefined,
            }}
          >
            <div className="bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 shadow-2xl min-w-[150px]">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2.5">{hoverItem.month}{hoverItem.isProjection ? ' · Forecast' : ''}</p>
              {hoverItem.totalIncome != null && (
                <div className="flex items-center justify-between gap-4 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-slate-400 font-bold">Income</span>
                  </div>
                  <span className="text-xs font-black text-white">{formatCurrency(hoverItem.totalIncome)}</span>
                </div>
              )}
              {hoverItem.totalExpenses != null && (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-rose-400" />
                    <span className="text-[11px] text-slate-400 font-bold">Expenses</span>
                  </div>
                  <span className="text-xs font-black text-white">{formatCurrency(hoverItem.totalExpenses)}</span>
                </div>
              )}
              {hoverItem.totalIncome != null && hoverItem.totalExpenses != null && (
                <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-4">
                  <span className="text-[11px] text-slate-400 font-bold">Net</span>
                  <span className={`text-xs font-black ${hoverItem.totalIncome - hoverItem.totalExpenses >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(hoverItem.totalIncome - hoverItem.totalExpenses)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="h-4" />
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const { isConnected } = useSocket();
  const navigate = useNavigate();

  const [kpis, setKpis] = useState<{
    totalIncome: KpiData;
    totalExpenses: KpiData;
    netProfit: KpiData;
    totalClients: KpiData;
    pendingProposals?: number;
    overdueInvoices?: number;
  }>({
    totalIncome: { value: 0, trend: [] },
    totalExpenses: { value: 0, trend: [] },
    netProfit: { value: 0, trend: [] },
    totalClients: { value: 0, trend: [] },
  });
  const [chartData, setChartData] = useState<PerfChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [showScanSuccess, setShowScanSuccess] = useState(false);
  const [filter, setFilter] = useState<PerfChartFilter>({
    year: new Date().getFullYear(),
    month: '',
    interval: '6m'
  });
  const [advisorData, setAdvisorData] = useState<AdvisorData | null>(null);
  const [isAdvisorLoading, setIsAdvisorLoading] = useState(true);

  useEffect(() => {
    const fetchAdvisor = async () => {
      setIsAdvisorLoading(true);
      try {
        const data = await apiRequest<AdvisorData>('/intelligence/advisor');
        setAdvisorData(data);
      } catch (err) {
        console.error('Error fetching advisor data', err);
      } finally {
        setIsAdvisorLoading(false);
      }
    };
    fetchAdvisor();

    const handleDataUpdate = () => { fetchAdvisor(); };
    window.addEventListener('MorniyDataUpdate', handleDataUpdate);
    return () => window.removeEventListener('MorniyDataUpdate', handleDataUpdate);
  }, []);

  useEffect(() => {
    if (showScanSuccess) {
      const timer = setTimeout(() => setShowScanSuccess(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [showScanSuccess]);

  useEffect(() => {
    const fetchKpis = async () => {
      setIsLoading(true);
      try {
        const kpisData = await apiRequest<any>('/dashboard/kpis');
        setKpis(kpisData);
      } catch (err) {
        console.error('Error fetching dashboard kpis', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchKpis();
  }, []);

  useEffect(() => {
    const fetchChartData = async () => {
      setIsChartLoading(true);
      try {
        let query = '';
        if (filter.interval === '1y' && filter.year) {
          query = `?year=${filter.year}`;
        } else if (filter.interval === '1m' && filter.year && filter.month) {
          query = `?year=${filter.year}&month=${filter.month}`;
        }
        const chartData = await apiRequest<PerfChartPoint[]>(`/dashboard/chart-data${query}`);
        setChartData(chartData);
      } catch (err) {
        console.error('Error fetching dashboard chart data', err);
      } finally {
        setIsChartLoading(false);
      }
    };
    fetchChartData();
  }, [filter]);

  // Real-time Event Listener
  useEffect(() => {
    const handleDataUpdate = () => {
      // Re-fetch data behind the scenes to keep dashboard live
      apiRequest<typeof kpis>('/dashboard/kpis').then(setKpis).catch(console.error);

      let query = '';
      if (filter.interval === '1y' && filter.year) query = `?year=${filter.year}`;
      else if (filter.interval === '1m' && filter.year && filter.month) query = `?year=${filter.year}&month=${filter.month}`;
      apiRequest<PerfChartPoint[]>(`/dashboard/chart-data${query}`).then(setChartData).catch(console.error);
    };

    window.addEventListener('MorniyDataUpdate', handleDataUpdate);
    return () => window.removeEventListener('MorniyDataUpdate', handleDataUpdate);
  }, [filter]);

  const handleScanComplete = async (data: { transactions?: unknown[]; text?: string }) => {
    setIsScanModalOpen(false);
    try {
      if (data.transactions && data.transactions.length > 0) {
        await apiRequest('/scanned-transactions', {
          method: 'POST',
          body: {
            transactions: data.transactions,
            text: data.text,
            originalFileName: "Scanned Document"
          },
        });
        // Instead of immediate navigation, show a success toast with a CTA
        setShowScanSuccess(true);
      } else {
        alert("No transactions were found in the document.");
      }
    } catch (err: any) {
      alert('Error saving scan: ' + err.message);
    }
  };


  const advisorMetrics = advisorData?.metrics ?? null;

  // Enhance chart data with projections if we have advisor metrics
  const enhancedChartData: PerfChartPoint[] = chartData.map((item, index) => {
    const isLastHistorical = index === chartData.length - 1;
    return {
      ...item,
      projIncome: isLastHistorical ? item.totalIncome : undefined,
      projExpenses: isLastHistorical ? item.totalExpenses : undefined,
    };
  });

  if (advisorMetrics && chartData.length > 0 && filter.interval === '6m') {
    const lastMonth = chartData[chartData.length - 1]!;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const lastMonthIdx = months.indexOf(lastMonth.month ?? '');

    for (let i = 1; i <= 2; i++) {
      enhancedChartData.push({
        month: months[(lastMonthIdx + i) % 12],
        projIncome: advisorMetrics.projectedRevenueNext30d,
        projExpenses: advisorMetrics.monthlyBurnRate,
        isProjection: true,
      });
    }
  }

  const quickActions = [
    { label: 'New Invoice', icon: 'fa-file-invoice', path: '/invoices' },
    { label: 'Log Transaction', icon: 'fa-receipt', path: '/transactions' },
    { label: 'Scan Document', icon: 'fa-camera', path: '#scan' },
    { label: 'Add Client', icon: 'fa-user-plus', path: '/clients' },
  ];

  const actionAlerts: { label: string; sub: string; color: string; icon: string; path: string }[] = [];
  if ((kpis.overdueInvoices ?? 0) > 0) {
    actionAlerts.push({
      label: `${kpis.overdueInvoices} overdue invoice${(kpis.overdueInvoices ?? 0) > 1 ? 's' : ''}`,
      sub: 'Needs follow-up now',
      color: 'rose',
      icon: 'fa-triangle-exclamation',
      path: '/invoices',
    });
  }
  if ((kpis.pendingProposals ?? 0) > 0) {
    actionAlerts.push({
      label: `${kpis.pendingProposals} proposal${(kpis.pendingProposals ?? 0) > 1 ? 's' : ''} pending`,
      sub: 'Awaiting client response',
      color: 'amber',
      icon: 'fa-file-signature',
      path: '/proposals',
    });
  }

  const handleQuickActionClick = (path: string) => {
    if (path === '#scan') {
      setIsScanModalOpen(true);
    } else {
      navigate(path);
    }
  };

  return (
    <div className="min-h-screen space-y-6 sm:space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Good day, <span className="text-indigo-600">{user?.name}</span>
          </h2>
          <p className="text-sm text-slate-400 font-medium mt-1">Here's how your business is doing.</p>
        </div>
        <div className={`self-start md:self-auto flex items-center gap-2 text-[10px] font-bold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 ${isConnected ? 'text-slate-400' : 'text-rose-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
          {isConnected ? 'Live' : 'Connecting...'}
        </div>
      </div>

      {showScanSuccess && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 sm:px-6 py-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shrink-0">
              <i className="fas fa-check text-sm"></i>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Document scanned successfully</p>
              <p className="text-xs text-slate-400">Your receipt has been saved and is ready to review.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/scanned-transactions')} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors">
              View Scans
            </button>
            <button onClick={() => setShowScanSuccess(false)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600">
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>
        </div>
      )}

      {/* Onboarding Checklist — shown until all steps complete */}
      <OnboardingChecklist />

      {/* Business Intelligence Advisor */}
      <AdvisorPanel data={advisorData} isLoading={isAdvisorLoading} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <KpiCard label="Money In" data={kpis.totalIncome} icon="fa-arrow-up" color="text-emerald-500" isLoading={isLoading} />
        <KpiCard label="Money Out" data={kpis.totalExpenses} icon="fa-arrow-down" color="text-rose-500" isLoading={isLoading} />
        <KpiCard label="Net Profit" data={kpis.netProfit} icon="fa-naira-sign" color="text-indigo-500" isLoading={isLoading} />
        <KpiCard label="Customers" data={kpis.totalClients} icon="fa-users" color="text-indigo-500" isLoading={isLoading} />
        <div className="bg-white border border-slate-100 p-4 sm:p-5 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <i className="fas fa-hourglass-half text-amber-500 text-sm"></i>
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">Money Lasts</p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
            {isLoading || !advisorMetrics
              ? <span className="inline-block w-16 h-6 bg-slate-100 animate-pulse rounded" />
              : `${advisorMetrics.cashRunwayMonths} mo.`}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">at current spending</p>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2">
          <PerfChart
            data={enhancedChartData}
            isLoading={isChartLoading}
            filter={filter}
            onFilterChange={setFilter}
            formatCurrency={formatCurrency}
          />
        </div>

        <div className="bg-white border border-slate-100 p-6 sm:p-8 md:p-10 rounded-2xl shadow-sm flex flex-col">
          <div className="mb-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg md:text-xl font-bold text-slate-800">Today's Focus</h3>
              {actionAlerts.length === 0 && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">All clear</span>
              )}
            </div>

            {/* Action alerts */}
            {actionAlerts.length > 0 && (
              <div className="space-y-2 mb-4">
                {actionAlerts.map((alert, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(alert.path)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left bg-${alert.color}-50 border border-${alert.color}-100 hover:border-${alert.color}-300 transition-all`}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-${alert.color}-100 flex items-center justify-center shrink-0`}>
                      <i className={`fas ${alert.icon} text-${alert.color}-600 text-xs`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-black text-${alert.color}-800 leading-tight`}>{alert.label}</p>
                      <p className={`text-[10px] text-${alert.color}-600`}>{alert.sub}</p>
                    </div>
                    <i className={`fas fa-chevron-right text-${alert.color}-400 text-[10px] shrink-0`}></i>
                  </button>
                ))}
              </div>
            )}

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickActionClick(action.path)}
                  className="group w-full flex flex-col items-center gap-2 p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all duration-200"
                >
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                    <i className={`fas ${action.icon} text-sm`}></i>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors text-center leading-tight">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 sm:mt-10 md:mt-8 relative overflow-hidden p-5 sm:p-6 md:p-7 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 rounded-2xl text-white shadow-xl shadow-indigo-200">
            <div className="relative z-10">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 sm:mb-4 md:mb-5">
                <i className="fas fa-crown text-amber-300 text-xs sm:text-base md:text-lg"></i>
              </div>
              <h4 className="text-sm sm:text-base md:text-lg font-black mb-1">Upgrade to Pro</h4>
              <p className="text-[10px] sm:text-xs md:text-sm text-indigo-100 mb-4 font-medium leading-tight">Unlock advanced analytics and unlimited AI scans.</p>
              <button className="text-xs md:text-sm font-bold bg-white text-indigo-600 hover:bg-indigo-50 px-4 py-2 sm:py-2.5 md:py-3 rounded-xl w-full transition-colors shadow-lg">
                Get Started
              </button>
            </div>
            {/* Decorative circles */}
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -left-2 -top-2 w-12 h-12 bg-indigo-400/20 rounded-full blur-xl"></div>
          </div>
        </div>
      </div>

      <ScanTransactionModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onScanComplete={handleScanComplete}
      />
    </div>
  );
};

export default Dashboard;