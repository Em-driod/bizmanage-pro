import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ActivityLog {
  _id: string;
  user: { name: string; email: string };
  userName: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  timestamp: string;
  ipAddress?: string;
}

interface ActivityStats {
  resourceStats: Array<{
    _id: string;
    actions: Array<{ action: string; count: number }>;
    total: number;
  }>;
  userActivity: Array<{
    _id: string;
    userName: string;
    userEmail: string;
    count: number;
  }>;
  period: string;
}

const ActivityLog: React.FC = () => {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    action: '',
    resource: '',
    userId: ''
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isAdmin) return;
    fetchLogs();
    fetchStats();
  }, [isAdmin, filter, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...Object.fromEntries(Object.entries(filter).filter(([_, v]) => v))
      });
      
      const data = await apiRequest<{ logs: ActivityLog[], pagination: { pages: number } }>(`/activity?${params}`);
      setLogs(data.logs);
      setTotalPages(data.pagination.pages);
    } catch (err: any) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiRequest<ActivityStats>('/activity/stats?days=7');
      setStats(data);
    } catch (err: any) {
      console.error('Failed to fetch activity stats:', err);
    }
  };

  const getActionColor = (action: string) => {
    const colors = {
      CREATE: 'text-green-600 bg-green-100',
      UPDATE: 'text-blue-600 bg-blue-100',
      DELETE: 'text-red-600 bg-red-100',
      LOGIN: 'text-purple-600 bg-purple-100',
      LOGOUT: 'text-gray-600 bg-gray-100',
      VIEW: 'text-indigo-600 bg-indigo-100'
    };
    return colors[action as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const getResourceIcon = (resource: string) => {
    const icons = {
      USER: 'fas fa-user',
      CLIENT: 'fas fa-users',
      TRANSACTION: 'fas fa-exchange-alt',
      INVOICE: 'fas fa-file-invoice',
      BUSINESS: 'fas fa-building',
      PAYROLL: 'fas fa-money-check-alt'
    };
    return icons[resource as keyof typeof icons] || 'fas fa-circle';
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <i className="fas fa-lock text-rose-600 text-2xl"></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">You don't have permission to access activity logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Activity Log</h2>
          <p className="text-sm sm:text-base text-slate-500 font-medium">Monitor all user activities and system events.</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Activity by Resource</h3>
            <div className="space-y-3">
              {stats.resourceStats.map((stat) => (
                <div key={stat._id} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600 capitalize">{stat._id}</span>
                  <span className="text-sm font-bold text-slate-900">{stat.total}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Top Users (Last {stats.period})</h3>
            <div className="space-y-3">
              {stats.userActivity.slice(0, 5).map((user) => (
                <div key={user._id} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">{user.userName}</span>
                  <span className="text-sm font-bold text-slate-900">{user.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Filters</h3>
            <div className="space-y-3">
              <select
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                value={filter.action}
                onChange={(e) => setFilter({ ...filter, action: e.target.value })}
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN">Login</option>
              </select>
              <select
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                value={filter.resource}
                onChange={(e) => setFilter({ ...filter, resource: e.target.value })}
              >
                <option value="">All Resources</option>
                <option value="USER">Users</option>
                <option value="CLIENT">Clients</option>
                <option value="TRANSACTION">Transactions</option>
                <option value="INVOICE">Invoices</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Activity Logs Table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading activity logs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-extrabold uppercase tracking-[2px]">
                  <th className="px-8 py-5">Timestamp</th>
                  <th className="px-8 py-5">User</th>
                  <th className="px-8 py-5">Action</th>
                  <th className="px-8 py-5">Resource</th>
                  <th className="px-8 py-5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 font-medium italic">
                      No activity logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{log.userName}</p>
                          <p className="text-xs text-slate-500">{log.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-2 py-1 text-xs font-bold uppercase rounded-full ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <i className={`${getResourceIcon(log.resource)} text-slate-400 text-sm`}></i>
                          <span className="text-sm font-medium text-slate-600 capitalize">{log.resource}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm text-slate-600">
                          {log.details && typeof log.details === 'object' ? (
                            <div className="space-y-1">
                              {Object.entries(log.details).map(([key, value]) => (
                                <div key={key} className="text-xs">
                                  <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>{' '}
                                  <span>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">No details</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 p-6 border-t border-slate-100">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
