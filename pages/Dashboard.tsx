import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  isLoading: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon, color, isLoading }) => (
  <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white`}>
        <i className={`fas ${icon} text-lg`}></i>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800">
          {isLoading ? '...' : value}
        </p>
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [kpis, setKpis] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalClients: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setIsChartLoading(true);
      try {
        const [kpisData, chartData] = await Promise.all([
          apiRequest<any>('/dashboard/kpis'),
          apiRequest<any>('/dashboard/chart-data')
        ]);
        setKpis(kpisData);
        setChartData(chartData);
      } catch (err) {
        console.error('Error fetching dashboard data', err);
      } finally {
        setIsLoading(false);
        setIsChartLoading(false);
      }
    };

    fetchData();
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-100">
          <p className="text-sm font-bold text-slate-800">{label}</p>
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
    { label: 'Process Payroll', icon: 'fa-money-check-dollar', path: '/payroll' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
          <h2 className="text-xl font-extrabold text-slate-900">Welcome back, {user?.name}!</h2>
          <p className="text-sm text-slate-400 font-medium">Here's a performance overview for your business.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          label="30-Day Income"
          value={formatCurrency(kpis.totalIncome)}
          icon="fa-arrow-up"
          color="bg-emerald-500"
          isLoading={isLoading}
        />
        <KpiCard
          label="30-Day Expenses"
          value={formatCurrency(kpis.totalExpenses)}
          icon="fa-arrow-down"
          color="bg-rose-500"
          isLoading={isLoading}
        />
        <KpiCard
          label="30-Day Net Profit"
          value={formatCurrency(kpis.netProfit)}
          icon="fa-dollar-sign"
          color="bg-indigo-500"
          isLoading={isLoading}
        />
        <KpiCard
          label="Active Clients"
          value={kpis.totalClients}
          icon="fa-users"
          color="bg-blue-500"
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Chart Area */}
        <div className="lg:col-span-2 bg-white border border-slate-100 p-8 rounded-2xl shadow-sm">
           <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Monthly Performance</h3>
                <p className="text-xs text-slate-400">Income vs. Expenses over the last 6 months.</p>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button className="px-3 py-1 text-xs font-bold bg-white shadow-sm rounded-md text-indigo-600">MONTHS</button>
              </div>
           </div>
           <div className="h-72">
            {isChartLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tickFormatter={(value) => formatCurrency(value as number, 0)} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(239, 246, 255, 0.5)' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Bar dataKey="totalIncome" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalExpenses" fill="#f43f5e" name="Expenses" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
           </div>
        </div>

        {/* Quick Actions List */}
        <div className="bg-white border border-slate-100 p-8 rounded-2xl shadow-sm flex flex-col justify-between">
           <div>
              <h3 className="text-lg font-bold text-slate-800 mb-6">Quick Actions</h3>
              <div className="space-y-3">
                {quickActions.map((action, i) => (
                  <button key={i} onClick={() => navigate(action.path)} className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                        <i className={`fas ${action.icon} text-sm`}></i>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{action.label}</span>
                    </div>
                    <i className="fas fa-chevron-right text-xs text-slate-400"></i>
                  </button>
                ))}
              </div>
           </div>
           <div className="mt-8 p-6 bg-indigo-600 rounded-2xl text-white">
              <h4 className="text-sm font-bold mb-2">Upgrade to Pro</h4>
              <p className="text-xs text-indigo-100 mb-4">Unlock advanced reporting and invoicing features.</p>
              <button className="text-xs font-bold bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors w-full text-center">
                Learn More
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;