import React, { useState } from 'react';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

interface ReportItem {
    _id: string | null; // Category name or Client ID
    clientName?: string; // For client grouping
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    totalTransactions: number;
}

interface ReportSummary {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    totalTransactions: number;
}

const Reports: React.FC = () => {
    const { formatCurrency } = useCurrency();
    const [reportData, setReportData] = useState<ReportItem[] | ReportSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(thirtyDaysAgoStr);
    const [endDate, setEndDate] = useState(today);
    const [groupBy, setGroupBy] = useState<'none' | 'category' | 'client'>('none');

    const handleGenerateReport = async () => {
        if (!startDate || !endDate) {
            setError("Please select both a start and end date.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setReportData(null);
        try {
            const params = new URLSearchParams({
                startDate,
                endDate,
            });
            if (groupBy !== 'none') {
                params.append('groupBy', groupBy);
            }
            const data = await apiRequest<ReportItem[] | ReportSummary>(`/reporting/financial-summary?${params.toString()}`);
            setReportData(data);
        } catch (err: any) {
            setError(err.message || "Failed to generate report.");
        } finally {
            setIsLoading(false);
        }
    };

    const isGroupedReport = Array.isArray(reportData);

    return (
        <div className="min-h-screen space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-8">
            <div className="px-1">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Intelligence & Reporting</h2>
                <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed max-w-2xl">
                    Generate deep-dive financial summaries and analytical breakdowns for specific operational periods.
                </p>
            </div>

            <div className="bg-white/80 backdrop-blur-xl border border-slate-100 p-6 sm:p-8 rounded-[2rem] shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Term Start</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Term End</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Aggregation</label>
                        <select
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value as 'none' | 'category' | 'client')}
                            className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                        >
                            <option value="none">Overall Summary</option>
                            <option value="category">By Category</option>
                            <option value="client">By Client</option>
                        </select>
                    </div>
                    <button
                        onClick={handleGenerateReport}
                        disabled={isLoading}
                        className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white px-8 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-indigo-100 transition-all hover:-translate-y-1 active:scale-95 disabled:bg-slate-200 disabled:shadow-none"
                    >
                        {isLoading ? 'Processing...' : 'Generate Intelligence'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 p-5 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                    <i className="fas fa-circle-exclamation"></i>
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}

            {reportData && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {!isGroupedReport ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            {[
                                { label: 'Revenue Vector', val: (reportData as ReportSummary).totalIncome, color: 'emerald', icon: 'fa-arrow-trend-up' },
                                { label: 'Expense Load', val: (reportData as ReportSummary).totalExpenses, color: 'rose', icon: 'fa-arrow-trend-down' },
                                { label: 'Net Liquidity', val: (reportData as ReportSummary).netProfit, color: 'indigo', icon: 'fa-vault' },
                                { label: 'Event Volume', val: (reportData as ReportSummary).totalTransactions, color: 'slate', icon: 'fa-layer-group', isCurrency: false }
                            ].map((kpi, idx) => (
                                <div key={idx} className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 hover:-translate-y-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`w-12 h-12 rounded-2xl bg-${kpi.color}-50 flex items-center justify-center text-${kpi.color}-600 group-hover:bg-${kpi.color}-600 group-hover:text-white transition-all duration-500`}>
                                            <i className={`fas ${kpi.icon}`}></i>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-1">{kpi.label}</p>
                                    <p className={`text-2xl font-black text-slate-900`}>
                                        {kpi.isCurrency === false ? kpi.val : formatCurrency(kpi.val as number)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Analytical Breakdown</h3>
                                <span className="px-4 py-1.5 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">{groupBy} Analysis</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-extrabold uppercase tracking-[2px]">
                                            <th className="px-8 py-5">{groupBy === 'category' ? 'Category Segment' : 'Client Profile'}</th>
                                            <th className="px-8 py-5">Income Inflow</th>
                                            <th className="px-8 py-5">Expense Attrition</th>
                                            <th className="px-8 py-5">Margin Profit</th>
                                            <th className="px-8 py-5">Count</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {(reportData as ReportItem[]).map((item) => (
                                            <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-6 font-bold text-slate-900">
                                                    {item.clientName || item._id || 'General Allocation'}
                                                </td>
                                                <td className="px-8 py-6 font-black text-emerald-600">
                                                    {formatCurrency(item.totalIncome)}
                                                </td>
                                                <td className="px-8 py-6 font-black text-rose-600">
                                                    {formatCurrency(item.totalExpenses)}
                                                </td>
                                                <td className="px-8 py-6 font-black text-indigo-600">
                                                    {formatCurrency(item.netProfit)}
                                                </td>
                                                <td className="px-8 py-6 text-sm font-bold text-slate-400">
                                                    {item.totalTransactions}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Reports;
