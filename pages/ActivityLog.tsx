import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

interface ActivityChange { field: string; from: unknown; to: unknown }

interface ActivityEntry {
  _id: string;
  userName: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  summary?: string;
  changes?: ActivityChange[];
  details?: Record<string, unknown> | null;
  severity?: 'info' | 'notice' | 'sensitive';
  ipAddress?: string;
  userAgent?: string;
  timestamp?: string;
  createdAt?: string;
}

interface ActivityStats {
  resourceStats: Array<{ _id: string; actions: Array<{ action: string; count: number }>; total: number }>;
  actionStats: Array<{ _id: string; count: number }>;
  userActivity: Array<{ _id: string; userName: string; userEmail: string; count: number; lastActive?: string }>;
  daily: Array<{ _id: string; count: number }>;
  sensitiveCount: number;
  totalCount: number;
  period: string;
  days: number;
}

const ACTION_META: Record<string, { label: string; cls: string; icon: string }> = {
  CREATE: { label: 'Create', cls: 'text-emerald-700 bg-emerald-100', icon: 'fa-plus' },
  UPDATE: { label: 'Update', cls: 'text-blue-700 bg-blue-100', icon: 'fa-pen' },
  DELETE: { label: 'Delete', cls: 'text-rose-700 bg-rose-100', icon: 'fa-trash' },
  LOGIN: { label: 'Login', cls: 'text-violet-700 bg-violet-100', icon: 'fa-right-to-bracket' },
  LOGOUT: { label: 'Logout', cls: 'text-slate-600 bg-slate-100', icon: 'fa-right-from-bracket' },
  VIEW: { label: 'View', cls: 'text-indigo-700 bg-indigo-100', icon: 'fa-eye' },
  SEND: { label: 'Send', cls: 'text-cyan-700 bg-cyan-100', icon: 'fa-paper-plane' },
  PAYMENT: { label: 'Payment', cls: 'text-amber-700 bg-amber-100', icon: 'fa-money-bill-wave' },
  EXPORT: { label: 'Export', cls: 'text-teal-700 bg-teal-100', icon: 'fa-file-export' },
};

const RESOURCE_META: Record<string, { label: string; icon: string; route?: string }> = {
  USER: { label: 'User', icon: 'fa-user', route: '/users' },
  CLIENT: { label: 'Client', icon: 'fa-users', route: '/clients' },
  TRANSACTION: { label: 'Transaction', icon: 'fa-exchange-alt', route: '/transactions' },
  INVOICE: { label: 'Invoice', icon: 'fa-file-invoice', route: '/invoices' },
  PROPOSAL: { label: 'Proposal', icon: 'fa-file-signature', route: '/proposals' },
  RECEIPT: { label: 'Receipt', icon: 'fa-receipt', route: '/receipts' },
  PRODUCT: { label: 'Product', icon: 'fa-box', route: '/products' },
  PROJECT: { label: 'Project', icon: 'fa-diagram-project', route: '/projects' },
  BUDGET: { label: 'Budget', icon: 'fa-chart-pie', route: '/budgets' },
  CAPITAL_ASSET: { label: 'Capital asset', icon: 'fa-building', route: '/capital-assets' },
  AUTOMATION_RULE: { label: 'Automation rule', icon: 'fa-robot', route: '/automation' },
  BUSINESS: { label: 'Business', icon: 'fa-briefcase', route: '/business' },
  PAYROLL: { label: 'Payroll', icon: 'fa-money-check-alt', route: '/payroll' },
  EXPORT: { label: 'Export', icon: 'fa-file-export' },
  AUTH: { label: 'Auth', icon: 'fa-shield-halved' },
};

const ACTION_OPTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'SEND', 'PAYMENT', 'EXPORT', 'VIEW'];
const RESOURCE_OPTIONS = Object.keys(RESOURCE_META);

const tsOf = (l: ActivityEntry) => l.timestamp || l.createdAt || '';

const relTime = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  const s = Math.round((Date.now() - d) / 1000);
  if (s < 45) return 'just now';
  if (s < 90) return '1 min ago';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const initials = (name: string) =>
  (name || '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

const fmtVal = (v: unknown) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const humanKey = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();

const EMPTY_FILTER = { q: '', action: '', resource: '', userId: '', severity: '', from: '', to: '' };

const ActivityLog: React.FC = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useNotification();

  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ ...EMPTY_FILTER });
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statsDays, setStatsDays] = useState(7);
  const [live, setLive] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [users, setUsers] = useState<Array<{ _id: string; name: string }>>([]);

  const liveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Debounce the free-text search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filter.q.trim()), 350);
    return () => clearTimeout(t);
  }, [filter.q]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: '50' });
    if (debouncedQ) p.set('q', debouncedQ);
    if (filter.action) p.set('action', filter.action);
    if (filter.resource) p.set('resource', filter.resource);
    if (filter.userId) p.set('userId', filter.userId);
    if (filter.severity) p.set('severity', filter.severity);
    if (filter.from) p.set('from', filter.from);
    if (filter.to) p.set('to', filter.to);
    return p.toString();
  }, [page, debouncedQ, filter.action, filter.resource, filter.userId, filter.severity, filter.from, filter.to]);

  const activeFilterCount =
    (debouncedQ ? 1 : 0) +
    (filter.action ? 1 : 0) +
    (filter.resource ? 1 : 0) +
    (filter.userId ? 1 : 0) +
    (filter.severity ? 1 : 0) +
    (filter.from ? 1 : 0) +
    (filter.to ? 1 : 0);

  const fetchLogs = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true);
      try {
        const data = await apiRequest<{ logs: ActivityEntry[]; pagination: { pages: number; total: number } }>(
          `/activity?${queryString}`,
        );
        setLogs(data.logs || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotal(data.pagination?.total || 0);
      } catch (err) {
        console.error('Failed to fetch activity logs:', err);
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [queryString],
  );

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiRequest<ActivityStats>(`/activity/stats?days=${statsDays}`);
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch activity stats:', err);
    }
  }, [statsDays]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchLogs();
  }, [isAdmin, fetchLogs]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchStats();
  }, [isAdmin, fetchStats]);

  useEffect(() => {
    if (!isAdmin) return;
    apiRequest<Array<{ _id: string; name: string }>>('/users')
      .then((u) => setUsers(u || []))
      .catch(() => setUsers([]));
  }, [isAdmin]);

  // Live tail — only meaningful on page 1.
  useEffect(() => {
    if (liveTimer.current) clearInterval(liveTimer.current);
    if (live && isAdmin && page === 1) {
      liveTimer.current = setInterval(() => {
        fetchLogs({ silent: true });
        fetchStats();
      }, 20000);
    }
    return () => {
      if (liveTimer.current) clearInterval(liveTimer.current);
    };
  }, [live, isAdmin, page, fetchLogs, fetchStats]);

  const resetFilters = () => {
    setFilter({ ...EMPTY_FILTER });
    setPage(1);
  };

  const patchFilter = (patch: Partial<typeof EMPTY_FILTER>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const p = new URLSearchParams(queryString);
      p.set('page', '1');
      p.set('limit', '1000');
      const data = await apiRequest<{ logs: ActivityEntry[] }>(`/activity?${p.toString()}`);
      const rows = data.logs || [];
      const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const header = ['Timestamp', 'User', 'Email', 'Action', 'Resource', 'Severity', 'Summary', 'Resource ID', 'IP'];
      const body = rows.map((l) =>
        [
          new Date(tsOf(l)).toISOString(),
          l.userName,
          l.userEmail,
          l.action,
          l.resource,
          l.severity || 'info',
          l.summary || '',
          l.resourceId || '',
          l.ipAddress || '',
        ]
          .map((c) => esc(String(c)))
          .join(','),
      );
      const csv = '﻿' + [header.map(esc).join(','), ...body].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast(`Exported ${rows.length} events`, 'success');
    } catch {
      showToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>();
    for (const l of logs) {
      const key = dayLabel(tsOf(l));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return Array.from(map.entries());
  }, [logs]);

  const sparkMax = useMemo(() => Math.max(1, ...(stats?.daily || []).map((d) => d.count)), [stats]);

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

  const selectCls = 'px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300';

  return (
    <div className="min-h-screen space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Activity Log</h2>
          <p className="text-sm text-slate-500 font-medium">
            {total.toLocaleString()} recorded events · every create, edit, delete, payment and sign-in.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setStatsDays(d)}
                className={`px-3 py-2 text-xs font-bold transition-colors ${
                  statsDays === d ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={() => setLive((v) => !v)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-colors ${
              live ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500'
            }`}
            title="Auto-refresh every 20s (page 1 only)"
          >
            <span className={`w-2 h-2 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            Live
          </button>
          <button
            onClick={exportCsv}
            disabled={exporting}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-60"
          >
            <i className={`fas ${exporting ? 'fa-spinner fa-spin' : 'fa-download'} text-[11px]`} /> CSV
          </button>
        </div>
      </div>

      {/* Stat tiles */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Events · {stats.days}d</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalCount.toLocaleString()}</p>
            <div className="flex items-end gap-0.5 h-8 mt-2">
              {(stats.daily || []).slice(-21).map((d) => (
                <div
                  key={d._id}
                  title={`${d._id}: ${d.count}`}
                  className="flex-1 bg-indigo-200 rounded-sm min-h-[2px]"
                  style={{ height: `${(d.count / sparkMax) * 100}%` }}
                />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Sensitive</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{stats.sensitiveCount.toLocaleString()}</p>
            <button
              onClick={() => patchFilter({ severity: 'sensitive' })}
              className="text-[11px] font-bold text-indigo-600 mt-2 hover:underline"
            >
              View deletes &amp; role changes →
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Top activity</p>
            <div className="space-y-1.5">
              {stats.resourceStats.slice(0, 3).map((r) => (
                <div key={r._id} className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-600 w-20 truncate capitalize">
                    {(RESOURCE_META[r._id]?.label || r._id).toLowerCase()}
                  </span>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400"
                      style={{ width: `${(r.total / (stats.resourceStats[0]?.total || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-900 w-6 text-right">{r.total}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Most active</p>
            <div className="space-y-1.5">
              {stats.userActivity.slice(0, 3).map((u) => (
                <button
                  key={u._id}
                  onClick={() => patchFilter({ userId: u._id })}
                  className="flex items-center justify-between w-full group"
                >
                  <span className="text-[11px] font-medium text-slate-600 truncate group-hover:text-indigo-600">
                    {u.userName}
                  </span>
                  <span className="text-[11px] font-bold text-slate-900">{u.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs" />
          <input
            value={filter.q}
            onChange={(e) => patchFilter({ q: e.target.value })}
            placeholder="Search user, email, summary, ID…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
          />
        </div>
        <select className={selectCls} value={filter.action} onChange={(e) => patchFilter({ action: e.target.value })}>
          <option value="">All actions</option>
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {ACTION_META[a]?.label || a}
            </option>
          ))}
        </select>
        <select className={selectCls} value={filter.resource} onChange={(e) => patchFilter({ resource: e.target.value })}>
          <option value="">All resources</option>
          {RESOURCE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {RESOURCE_META[r].label}
            </option>
          ))}
        </select>
        <select className={selectCls} value={filter.userId} onChange={(e) => patchFilter({ userId: e.target.value })}>
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name}
            </option>
          ))}
        </select>
        <select className={selectCls} value={filter.severity} onChange={(e) => patchFilter({ severity: e.target.value })}>
          <option value="">Any severity</option>
          <option value="sensitive">Sensitive</option>
          <option value="notice">Notice</option>
          <option value="info">Info</option>
        </select>
        <input
          type="date"
          className={selectCls}
          value={filter.from}
          max={filter.to || undefined}
          onChange={(e) => patchFilter({ from: e.target.value })}
        />
        <input
          type="date"
          className={selectCls}
          value={filter.to}
          min={filter.from || undefined}
          onChange={(e) => patchFilter({ to: e.target.value })}
        />
        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50"
          >
            Clear ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Log list */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading activity…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
              <i className="fas fa-clock-rotate-left text-slate-400 text-xl" />
            </div>
            <p className="text-sm font-bold text-slate-600">No matching activity</p>
            <p className="text-xs text-slate-400 mt-1">
              {activeFilterCount > 0 ? 'Try widening the filters or the date range.' : 'Actions will appear here as your team works.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {grouped.map(([day, items]) => (
              <div key={day}>
                <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur px-4 sm:px-6 py-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  {day} · {items.length}
                </div>
                {items.map((log) => {
                  const am = ACTION_META[log.action] || { label: log.action, cls: 'text-slate-600 bg-slate-100', icon: 'fa-circle' };
                  const rm = RESOURCE_META[log.resource] || { label: log.resource, icon: 'fa-circle' };
                  const open = expandedId === log._id;
                  const hasDetail =
                    (log.changes && log.changes.length > 0) ||
                    (log.details && Object.keys(log.details).length > 0) ||
                    log.ipAddress ||
                    log.userAgent;
                  return (
                    <div key={log._id} className={log.severity === 'sensitive' ? 'bg-rose-50/30' : ''}>
                      <button
                        onClick={() => hasDetail && setExpandedId(open ? null : log._id)}
                        className={`w-full text-left px-4 sm:px-6 py-3.5 flex items-start gap-3 hover:bg-slate-50/70 transition-colors ${
                          hasDetail ? 'cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-[10px] font-black text-slate-500 mt-0.5">
                          {initials(log.userName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${am.cls}`}>
                              <i className={`fas ${am.icon} mr-1 text-[9px]`} />
                              {am.label}
                            </span>
                            <span className="text-sm font-semibold text-slate-800">
                              {log.summary || `${am.label} ${rm.label.toLowerCase()}`}
                            </span>
                            {log.severity === 'sensitive' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-600">
                                Sensitive
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-slate-400">
                            <span className="font-medium text-slate-500">{log.userName}</span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1">
                              <i className={`fas ${rm.icon} text-[10px]`} />
                              {rm.label}
                            </span>
                            {rm.route && (
                              <>
                                <span>·</span>
                                <Link
                                  to={rm.route}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-indigo-500 hover:underline"
                                >
                                  open
                                </Link>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-2">
                          <span
                            className="text-[11px] text-slate-400 font-medium whitespace-nowrap"
                            title={new Date(tsOf(log)).toLocaleString()}
                          >
                            {relTime(tsOf(log))}
                          </span>
                          {hasDetail && (
                            <i className={`fas fa-chevron-${open ? 'up' : 'down'} text-[10px] text-slate-300`} />
                          )}
                        </div>
                      </button>

                      {open && hasDetail && (
                        <div className="px-4 sm:px-6 pb-4 pt-1 ml-11 space-y-3">
                          {log.changes && log.changes.length > 0 && (
                            <div className="rounded-xl border border-slate-100 overflow-hidden">
                              {log.changes.map((c) => (
                                <div key={c.field} className="flex text-xs border-b border-slate-50 last:border-0">
                                  <span className="w-28 shrink-0 bg-slate-50 px-3 py-2 font-bold text-slate-500 capitalize">
                                    {humanKey(c.field)}
                                  </span>
                                  <span className="px-3 py-2 text-rose-500 line-through truncate max-w-[40%]">{fmtVal(c.from)}</span>
                                  <span className="px-2 py-2 text-slate-300">→</span>
                                  <span className="px-3 py-2 text-emerald-600 font-medium truncate">{fmtVal(c.to)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="flex flex-wrap gap-x-6 gap-y-1">
                              {Object.entries(log.details).map(([k, v]) => (
                                <div key={k} className="text-xs">
                                  <span className="font-bold text-slate-400">{humanKey(k)}: </span>
                                  <span className="text-slate-700">{fmtVal(v)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-slate-400">
                            {log.resourceId && <span>ID: <span className="font-mono text-slate-500">{log.resourceId}</span></span>}
                            {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                            <span>{new Date(tsOf(log)).toLocaleString()}</span>
                          </div>
                          {log.userAgent && <p className="text-[10px] text-slate-300 truncate">{log.userAgent}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="flex justify-between items-center gap-2 p-4 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold disabled:opacity-40 hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
