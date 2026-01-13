import React, { useState } from 'react';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

interface ReportData {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    totalTransactions: number;
}

const Reports: React.FC = () => {
    const { formatCurrency } = useCurrency();
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(thirtyDaysAgoStr);
    const [endDate, setEndDate] = useState(today);

    const handleGenerateReport = async () => {
        if (!startDate || !endDate) {
            setError("Please select both a start and end date.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setReportData(null);
        try {
            const data = await apiRequest<ReportData>(`/reporting/financial-summary?startDate=${startDate}&endDate=${endDate}`);
            setReportData(data);
        } catch (err: any) {
            setError(err.message || "Failed to generate report.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-xl font-extrabold text-slate-900">Financial Reports</h2>
                <p className="text-sm text-slate-400 font-medium">Generate and view financial summaries for specific periods.</p>
            </div>

            <div className="bg-white border border-slate-100 p-8 rounded-2xl shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={handleGenerateReport}
                        disabled={isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg shadow-sm transition-colors disabled:bg-indigo-300"
                    >
                        {isLoading ? 'Generating...' : 'Generate Report'}
                    </button>
                </div>
            </div>

            {error && <div className="bg-rose-50 text-rose-600 p-4 rounded-lg">{error}</div>}

            {reportData && (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm animate-in fade-in duration-300">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800">Report for {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
                        <div className="bg-slate-50 p-6 rounded-xl">
                            <p className="text-sm text-slate-500 font-medium">Total Income</p>
                            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(reportData.totalIncome)}</p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-xl">
                            <p className="text-sm text-slate-500 font-medium">Total Expenses</p>
                            <p className="text-2xl font-bold text-rose-600">{formatCurrency(reportData.totalExpenses)}</p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-xl">
                            <p className="text-sm text-slate-500 font-medium">Net Profit</p>
                            <p className="text-2xl font-bold text-indigo-600">{formatCurrency(reportData.netProfit)}</p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-xl">
                            <p className="text-sm text-slate-500 font-medium">Total Transactions</p>
                            <p className="text-2xl font-bold text-slate-800">{reportData.totalTransactions}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
