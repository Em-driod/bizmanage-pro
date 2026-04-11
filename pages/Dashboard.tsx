import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { useSocket } from '../context/SocketContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import ScanTransactionModal from '../components/ScanTransactionModal';
import AdvisorPanel from '../components/AdvisorPanel';
import Sparkline from '../components/Sparkline';

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
  const hoverBgMap: Record<string, string> = {
    'text-emerald-500': 'group-hover:bg-emerald-50',
    'text-rose-500': 'group-hover:bg-rose-50',
    'text-indigo-500': 'group-hover:bg-indigo-50',
    'text-blue-500': 'group-hover:bg-blue-50',
  };
  const hoverBg = hoverBgMap[color] || 'group-hover:bg-slate-100';

  // Calculate generic percentage change between first half vs second half of the trend array
  let percentChange = 0;
  if (data?.trend && data.trend.length > 0) {
     const len = data.trend.length;
     const pastSegment = data.trend.slice(0, Math.floor(len/2)).reduce((a,b)=>a+b, 0);
     const recentSegment = data.trend.slice(Math.floor(len/2)).reduce((a,b)=>a+b, 0);
     if (pastSegment > 0) {
       percentChange = ((recentSegment - pastSegment) / pastSegment) * 100;
     }
  }
  const isPositive = percentChange >= 0;

  return (
    <div className="group relative bg-[#0B0F19] border border-white/10 p-5 rounded-[1.25rem] shadow-xl overflow-hidden transition-all duration-300 hover:border-white/20">
      {/* Background glow mapping */}
      <div className={`absolute top-0 right-0 w-32 h-32 blur-[40px] opacity-20 pointer-events-none rounded-full ${color.replace('text-', 'bg-')}`} />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
         <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5`}>
            <i className={`fas ${icon} text-lg ${color}`}></i>
         </div>
         {!isLoading && (
            <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-white/5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'} border ${isPositive ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
                {isPositive ? '+' : ''}{percentChange.toFixed(1)}%
            </div>
         )}
      </div>

      <div className="relative z-10">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-black text-white tracking-tight">
          {isLoading ? (
            <span className="inline-block w-20 h-7 bg-white/10 animate-pulse rounded"></span>
          ) : (label === 'Active Clients' ? data.value : formatCurrency(data.value))}
        </p>
      </div>

      {/* Sparkline in the background/bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-12 opacity-50 px-2 select-none group-hover:opacity-100 transition-opacity">
         {!isLoading && data?.trend && (
            <Sparkline data={data.trend} color={color} width={200} height={40} />
         )}
      </div>
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
  }>({
    totalIncome: { value: 0, trend: [] },
    totalExpenses: { value: 0, trend: [] },
    netProfit: { value: 0, trend: [] },
    totalClients: { value: 0, trend: [] },
  });
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [showScanSuccess, setShowScanSuccess] = useState(false);
  const [filter, setFilter] = useState({
    year: new Date().getFullYear(),
    month: '',
    interval: '6m'
  });

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
        const chartData = await apiRequest<any>(`/dashboard/chart-data${query}`);
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
    const handleDataUpdate = (e: any) => {
      // Re-fetch data behind the scenes to keep dashboard live
      apiRequest<any>('/dashboard/kpis').then(setKpis).catch(console.error);
      
      let query = '';
      if (filter.interval === '1y' && filter.year) query = `?year=${filter.year}`;
      else if (filter.interval === '1m' && filter.year && filter.month) query = `?year=${filter.year}&month=${filter.month}`;
      apiRequest<any>(`/dashboard/chart-data${query}`).then(setChartData).catch(console.error);
    };

    window.addEventListener('OpsFlowDataUpdate', handleDataUpdate);
    return () => window.removeEventListener('OpsFlowDataUpdate', handleDataUpdate);
  }, [filter]);

  const handleScanComplete = async (data: any) => {
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-100">
          <p className="text-sm font-bold text-red-800">{label}</p>
          <p className="text-xs text-emerald-500">Income: {formatCurrency(payload[0].value)}</p>
          <p className="text-xs text-rose-500">Expenses: {formatCurrency(payload[1].value)}</p>
        </div>
      );
    }
    return null;
  };

  const quickActions = [
    { label: 'Add New Client', icon: 'fa-user-plus', path: '/clients' },
    { label: 'Log Transaction', icon: 'fa-receipt', path: '/transactions' },
    { label: 'Scan Document', icon: 'fa-scanner', path: '#scan' },
    { label: 'Process Payroll', icon: 'fa-money-check-dollar', path: '/payroll' },
  ];

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
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            Welcome back, <span className="text-indigo-600">{user?.name}</span>!
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-slate-500 font-medium">Here's a performance overview for your business.</p>
        </div>
        <div className={`self-start md:self-auto flex items-center gap-2 text-[10px] sm:text-xs md:text-sm font-bold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 ${isConnected ? 'text-slate-400' : 'text-rose-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
          {isConnected ? 'Live Updates Enabled' : 'Connecting to Core...'}
        </div>
      </div>

      {showScanSuccess && (
        <div className="mx-1 bg-indigo-600 rounded-[2rem] p-6 sm:p-8 md:p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-200 animate-in fade-in zoom-in duration-500">
          <div className="relative z-10 flex flex-col sm:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5 text-center sm:text-left">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl md:text-3xl shrink-0">
                <i className="fas fa-satellite-dish animate-pulse"></i>
              </div>
              <div>
                <h4 className="text-lg md:text-xl font-black tracking-tight mb-1 uppercase tracking-widest">Data Synchronized</h4>
                <p className="text-sm md:text-base text-indigo-100 font-medium">The document has been processed and archived in the intelligence core.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => navigate('/scanned-transactions')}
                className="flex-1 sm:flex-none px-8 py-3.5 md:py-4 bg-white text-indigo-600 rounded-[1.25rem] font-black text-xs md:text-sm uppercase tracking-[2px] hover:bg-indigo-50 transition-all shadow-xl active:scale-95"
              >
                Access Recorded Scans
              </button>
              <button
                onClick={() => setShowScanSuccess(false)}
                className="p-3.5 md:p-4 bg-indigo-500/50 hover:bg-indigo-500 text-white rounded-[1.25rem] transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        </div>
      )}

      {/* Business Intelligence Advisor (Gemini 2.5 Pro) */}
      <AdvisorPanel />

      {/* Metrics Row: 2 columns on mobile, 3 on tablet, 4 on large screens */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-5">
        <KpiCard
          label="30-Day Income"
          data={kpis.totalIncome}
          icon="fa-arrow-up"
          color="text-emerald-500"
          isLoading={isLoading}
        />
        <KpiCard
          label="30-Day Expenses"
          data={kpis.totalExpenses}
          icon="fa-arrow-down"
          color="text-rose-500"
          isLoading={isLoading}
        />
        <KpiCard
          label="30-Day Net Profit"
          data={kpis.netProfit}
          icon="fa-dollar-sign"
          color="text-indigo-500"
          isLoading={isLoading}
        />
        <KpiCard
          label="Active Clients"
          data={kpis.totalClients}
          icon="fa-users"
          color="text-blue-500"
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
        <div className="lg:col-span-2 bg-white border border-slate-100 p-6 sm:p-8 md:p-10 rounded-2xl shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg md:text-xl font-bold text-slate-800">Monthly Performance</h3>
              <p className="text-xs md:text-sm text-slate-400">Income vs. Expenses</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setFilter({ year: new Date().getFullYear(), month: '', interval: '6m' })}
                className={`px-3 py-1 text-xs md:text-sm font-bold rounded-md ${filter.interval === '6m' ? 'bg-white shadow-sm text-indigo-600' : ''}`}>
                6 Months
              </button>
              <button
                onClick={() => setFilter({ ...filter, interval: '1y' })}
                className={`px-3 py-1 text-xs md:text-sm font-bold rounded-md ${filter.interval === '1y' ? 'bg-white shadow-sm text-indigo-600' : ''}`}>
                Year
              </button>
            </div>
          </div>
          <div className="h-56 sm:h-72 md:h-80">
            {isChartLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis tickFormatter={(value) => formatCurrency(value as number)} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                  <Line type="monotone" dataKey="totalIncome" stroke="#10b981" name="Income" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="totalExpenses" stroke="#f43f5e" name="Expenses" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-6 sm:p-8 md:p-10 rounded-2xl shadow-sm flex flex-col">
          <div className="mb-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg md:text-xl font-bold text-slate-800">Quick Actions</h3>
              <span className="text-[10px] md:text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Fast access</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-1 md:grid-cols-2 gap-3">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickActionClick(action.path)}
                  className="group w-full flex flex-col sm:flex-row md:flex-col items-center sm:justify-between md:items-start p-3 sm:p-4 md:p-4 rounded-2xl border border-slate-50 bg-slate-50/30 hover:bg-white hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300"
                >
                  <div className="flex flex-col sm:flex-row md:flex-col items-center gap-2 sm:gap-4 md:gap-3 text-center sm:text-left md:text-center">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                      <i className={`fas ${action.icon} text-base md:text-lg`}></i>
                    </div>
                    <span className="text-[11px] sm:text-sm md:text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{action.label}</span>
                  </div>
                  <div className="hidden sm:flex md:hidden lg:flex w-6 h-6 rounded-full bg-transparent items-center justify-center group-hover:bg-indigo-50 transition-colors">
                    <i className="fas fa-chevron-right text-[10px] text-slate-300 group-hover:text-indigo-600"></i>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 sm:mt-10 md:mt-8 relative overflow-hidden p-5 sm:p-6 md:p-7 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-2xl text-white shadow-xl shadow-indigo-200">
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