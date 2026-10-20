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

const ACTION_META: Record<string, { label: string; text: string; bg: string; icon: string }> = {
  CREATE: { label: 'Created', text: 'text-emerald-600', bg: 'bg-emerald-50', icon: 'fa-plus' },
  UPDATE: { label: 'Updated', text: 'text-blue-600', bg: 'bg-blue-50', icon: 'fa-pen' },
  DELETE: { label: 'Deleted', text: 'text-rose-600', bg: 'bg-rose-50', icon: 'fa-trash' },
  LOGIN: { label: 'Signed in', text: 'text-violet-600', bg: 'bg-violet-50', icon: 'fa-right-to-bracket' },
  LOGOUT: { label: 'Signed out', text: 'text-slate-500', bg: 'bg-slate-100', icon: 'fa-right-from-bracket' },
  VIEW: { label: 'Viewed', text: 'text-indigo-600', bg: 'bg-indigo-50', icon: 'fa-eye' },
  SEND: { label: 'Sent', text: 'text-cyan-600', bg: 'bg-cyan-50', icon: 'fa-paper-plane' },
  PAYMENT: { label: 'Payment', text: 'text-amber-600', bg: 'bg-amber-50', icon: 'fa-money-bill-wave' },
  EXPORT: { label: 'Exported', text: 'text-teal-600', bg: 'bg-teal-50', icon: 'fa-file-export' },
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
const SEVERITY_LABEL: Record<string, string> = { sensitive: 'Sensitive', notice: 'Notice', info: 'Info' };

type DatePreset = 'any' | 'today' | '7d' | '30d' | 'custom';

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const presetRange = (preset: DatePreset): { from: string; to: string } => {
  if (preset === 'any' || preset === 'custom') return { from: '', to: '' };
  const to = new Date();
  const from = new Date();
  if (preset === '7d') from.setDate(from.getDate() - 6);
  if (preset === '30d') from.setDate(from.getDate() - 29);
  return { from: ymd(from), to: ymd(to) };
};

// The date inputs are in the viewer's local time; send exact local day
// boundaries so "20 Oct" means 20 Oct where the user is, not in UTC.
const startOfLocalDay = (d: string) => new Date(`${d}T00:00:00`).toISOString();
const endOfLocalDay = (d: string) => new Date(`${d}T23:59:59.999`).toISOString();

const tsOf = (l: ActivityEntry) => l.timestamp || l.createdAt || '';

const relTime = (iso: string) => {
  if (!iso) return '';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
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

const clockTime = (iso: string) =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

const shortDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

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

// "Chrome on Windows" from a raw user-agent string.
const describeDevice = (ua?: string) => {
  if (!ua) return '';
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari'
    : '';
  const os = /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iOS/.test(ua) ? 'iOS'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : '';
  if (browser && os) return `${browser} on ${os}`;
  return browser || os || 'Unknown device';
};

const cleanIp = (ip?: string) => (ip ? ip.replace(/^::ffff:/, '').replace(/^::1$/, 'localhost') : '');

const EMPTY_FILTER = { q: '', action: '', resource: '', userId: '', severity: '', from: '', to: '' };
type Filter = typeof EMPTY_FILTER;

const ActivityLog: React.FC = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useNotification();

  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<Filter>({ ...EMPTY_FILTER });
  const [datePreset, setDatePreset] = useState<DatePreset>('any');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statsDays, setStatsDays] = useState(7);
  const [live, setLive] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [users, setUsers] = useState<Array<{ _id: string; name: string }>>([]);

  const liveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const PAGE_SIZE = 50;

  // Debounce the free-text search.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filter.q.trim()), 350);
    return () => clearTimeout(t);
  }, [filter.q]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (debouncedQ) p.set('q', debouncedQ);
    if (filter.action) p.set('action', filter.action);
    if (filter.resource) p.set('resource', filter.resource);
    if (filter.userId) p.set('userId', filter.userId);
    if (filter.severity) p.set('severity', filter.severity);
    if (filter.from) p.set('from', startOfLocalDay(filter.from));
    if (filter.to) p.set('to', endOfLocalDay(filter.to));
    return p.toString();
  }, [page, debouncedQ, filter.action, filter.resource, filter.userId, filter.severity, filter.from, filter.to]);

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
      const data = await apiRequest<Partial<ActivityStats>>(`/activity/stats?days=${statsDays}`);
      // Normalise so a partial response (older API) can't crash the render.
      setStats({
        resourceStats: data?.resourceStats || [],
        actionStats: data?.actionStats || [],
        userActivity: data?.userActivity || [],
        daily: data?.daily || [],
        sensitiveCount: data?.sensitiveCount ?? 0,
        totalCount:
          data?.totalCount ?? (data?.resourceStats || []).reduce((sum, r) => sum + (r.total || 0), 0),
        period: data?.period || `${statsDays} days`,
        days: data?.days ?? statsDays,
      });
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
      .then((u) => setUsers(Array.isArray(u) ? u : []))
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

  const patchFilter = (patch: Partial<Filter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilter({ ...EMPTY_FILTER });
    setDatePreset('any');
    setPage(1);
  };

  const applyPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') patchFilter(presetRange(preset));
  };

  const setDate = (field: 'from' | 'to', value: string) => {
    setDatePreset('custom');
    const next = { ...filter, [field]: value };
    // Keep the range valid if the user picks an end before the start (or vice versa).
    if (next.from && next.to && next.from > next.to) {
      if (field === 'from') next.to = value;
      else next.from = value;
    }
    patchFilter({ from: next.from, to: next.to });
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
      const header = ['Timestamp', 'User', 'Email', 'Action', 'Resource', 'Severity', 'Summary', 'Resource ID', 'IP', 'Device'];
      const body = rows.map((l) =>
        [
          tsOf(l) ? new Date(tsOf(l)).toISOString() : '',
          l.userName,
          l.userEmail,
          l.action,
          l.resource,
          l.severity || 'info',
          l.summary || '',
          l.resourceId || '',
          cleanIp(l.ipAddress),
          describeDevice(l.userAgent),
        ]
          .map((c) => esc(String(c)))
          .join(','),
      );
      const csv = '﻿' + [header.map(esc).join(','), ...body].join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `activity-log-${ymd(new Date())}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast(`Exported ${rows.length} events`, 'success');
    } catch {
      showToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      showToast('ID copied', 'success');
    } catch {
      /* clipboard blocked — nothing to do */
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

  // Removable chips for every active filter.
  const chips = useMemo(() => {
    const list: Array<{ key: string; label: string; clear: () => void }> = [];
    if (debouncedQ) list.push({ key: 'q', label: `“${debouncedQ}”`, clear: () => patchFilter({ q: '' }) });
    if (filter.action) list.push({ key: 'action', label: ACTION_META[filter.action]?.label || filter.action, clear: () => patchFilter({ action: '' }) });
    if (filter.resource) list.push({ key: 'resource', label: RESOURCE_META[filter.resource]?.label || filter.resource, clear: () => patchFilter({ resource: '' }) });
    if (filter.userId) {
      const name = users.find((u) => u._id === filter.userId)?.name || stats?.userActivity.find((u) => u._id === filter.userId)?.userName || 'User';
      list.push({ key: 'user', label: name, clear: () => patchFilter({ userId: '' }) });
    }
    if (filter.severity) list.push({ key: 'severity', label: SEVERITY_LABEL[filter.severity] || filter.severity, clear: () => patchFilter({ severity: '' }) });
    if (filter.from || filter.to) {
      const label = filter.from && filter.to
        ? filter.from === filter.to ? shortDate(filter.from) : `${shortDate(filter.from)} – ${shortDate(filter.to)}`
        : filter.from ? `From ${shortDate(filter.from)}` : `Until ${shortDate(filter.to)}`;
      list.push({ key: 'date', label, clear: () => { setDatePreset('any'); patchFilter({ from: '', to: '' }); } });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, filter, users, stats]);

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <i className="fas fa-lock text-rose-500 text-xl"></i>
          </div>
          <h2 className="text-lg font-black text-slate-900 mb-1">Admins only</h2>
          <p className="text-sm text-slate-500">You don't have permission to view the activity log.</p>
        </div>
      </div>
    );
  }

  const selectCls =
    'h-10 w-full px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300';
  const segBtn = (active: boolean) =>
    `px-3 h-10 text-xs font-bold transition-colors whitespace-nowrap ${active ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`;
  const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(total, page * PAGE_SIZE);

  return (
    <div className="min-h-screen space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4 px-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Activity Log</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Every create, edit, delete, payment and sign-in across your business.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setLive((v) => !v)}
            className={`h-10 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-colors ${
              live ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
            title="Refresh automatically every 20 seconds (first page only)"
          >
            <span className={`w-2 h-2 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            {live ? 'Live' : 'Go live'}
          </button>
          <button
            onClick={exportCsv}
            disabled={exporting || total === 0}
            className="h-10 px-3.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
          >
            <i className={`fas ${exporting ? 'fa-spinner fa-spin' : 'fa-download'} text-[11px]`} /> Export CSV
          </button>
        </div>
      </div>

      {/* Overview */}
      {stats && (
        <div className="bg-white rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between px-5 pt-4">
            <p className="text-xs font-black text-slate-900">Overview</p>
            <div className="flex rounded-lg bg-slate-100 p-0.5">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setStatsDays(d)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                    statsDays === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100 mt-2">
            <div className="p-5">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Events</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalCount.toLocaleString()}</p>
              <div className="flex items-end gap-0.5 h-7 mt-2">
                {stats.daily.length === 0 ? (
                  <div className="w-full h-px bg-slate-100 self-end" />
                ) : (
                  stats.daily.slice(-30).map((d) => (
                    <div
                      key={d._id}
                      title={`${d._id}: ${d.count}`}
                      className="flex-1 bg-indigo-200 hover:bg-indigo-400 rounded-sm min-h-[2px] transition-colors"
                      style={{ height: `${(d.count / sparkMax) * 100}%` }}
                    />
                  ))
                )}
              </div>
            </div>
            <div className="p-5">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Sensitive</p>
              <p className={`text-2xl font-black mt-1 ${stats.sensitiveCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {stats.sensitiveCount.toLocaleString()}
              </p>
              {stats.sensitiveCount > 0 ? (
                <button
                  onClick={() => patchFilter({ severity: 'sensitive' })}
                  className="text-[11px] font-bold text-indigo-600 mt-2 hover:underline"
                >
                  Review deletes &amp; role changes →
                </button>
              ) : (
                <p className="text-[11px] text-slate-400 mt-2">No deletes or role changes</p>
              )}
            </div>
            <div className="p-5">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Most changed</p>
              {stats.resourceStats.length === 0 ? (
                <p className="text-[11px] text-slate-400">Nothing yet</p>
              ) : (
                <div className="space-y-1.5">
                  {[...stats.resourceStats].sort((a, b) => b.total - a.total).slice(0, 3).map((r, _i, arr) => (
                    <button
                      key={r._id}
                      onClick={() => patchFilter({ resource: r._id })}
                      className="flex items-center gap-2 w-full group"
                    >
                      <span className="text-[11px] font-medium text-slate-600 w-20 truncate text-left group-hover:text-indigo-600">
                        {RESOURCE_META[r._id]?.label || r._id}
                      </span>
                      <span className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <span className="block h-full bg-indigo-400" style={{ width: `${(r.total / (arr[0]?.total || 1)) * 100}%` }} />
                      </span>
                      <span className="text-[11px] font-bold text-slate-900 w-7 text-right">{r.total}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-5">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Most active</p>
              {stats.userActivity.length === 0 ? (
                <p className="text-[11px] text-slate-400">Nothing yet</p>
              ) : (
                <div className="space-y-1.5">
                  {stats.userActivity.slice(0, 3).map((u) => (
                    <button
                      key={u._id}
                      onClick={() => patchFilter({ userId: u._id })}
                      className="flex items-center gap-2 w-full group"
                    >
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-[8px] font-black text-slate-500 flex items-center justify-center shrink-0">
                        {initials(u.userName)}
                      </span>
                      <span className="text-[11px] font-medium text-slate-600 truncate flex-1 text-left group-hover:text-indigo-600">
                        {u.userName}
                      </span>
                      <span className="text-[11px] font-bold text-slate-900">{u.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 space-y-3">
        <div className="flex flex-col xl:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 text-xs" />
            <input
              value={filter.q}
              onChange={(e) => patchFilter({ q: e.target.value })}
              placeholder="Search by name, email or record ID…"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              {([
                ['any', 'Any time'],
                ['today', 'Today'],
                ['7d', '7 days'],
                ['30d', '30 days'],
              ] as Array<[DatePreset, string]>).map(([id, label]) => (
                <button key={id} onClick={() => applyPreset(id)} className={segBtn(datePreset === id)}>
                  {label}
                </button>
              ))}
            </div>
            <div
              className={`flex items-center h-10 rounded-xl border bg-white px-2 gap-1 ${
                datePreset === 'custom' ? 'border-slate-900' : 'border-slate-200'
              }`}
            >
              <i className="far fa-calendar text-slate-400 text-xs px-1" />
              <input
                type="date"
                aria-label="From date"
                value={filter.from}
                max={filter.to || undefined}
                onChange={(e) => setDate('from', e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none w-[7.5rem]"
              />
              <span className="text-slate-300 text-xs">–</span>
              <input
                type="date"
                aria-label="To date"
                value={filter.to}
                min={filter.from || undefined}
                onChange={(e) => setDate('to', e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none w-[7.5rem]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <select className={selectCls} value={filter.action} onChange={(e) => patchFilter({ action: e.target.value })}>
            <option value="">All actions</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_META[a]?.label || a}
              </option>
            ))}
          </select>
          <select className={selectCls} value={filter.resource} onChange={(e) => patchFilter({ resource: e.target.value })}>
            <option value="">All records</option>
            {RESOURCE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {RESOURCE_META[r].label}
              </option>
            ))}
          </select>
          <select className={selectCls} value={filter.userId} onChange={(e) => patchFilter({ userId: e.target.value })}>
            <option value="">Everyone</option>
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
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {chips.map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold"
              >
                {c.label}
                <button
                  onClick={c.clear}
                  aria-label={`Remove ${c.label} filter`}
                  className="w-4 h-4 rounded flex items-center justify-center hover:bg-indigo-100"
                >
                  <i className="fas fa-xmark text-[9px]" />
                </button>
              </span>
            ))}
            <button onClick={resetFilters} className="text-[11px] font-bold text-slate-400 hover:text-rose-600 px-1.5">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Log list */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500">
            {loading ? 'Loading…' : `${total.toLocaleString()} event${total === 1 ? '' : 's'}`}
          </p>
          {live && page === 1 && <p className="text-[11px] text-emerald-600 font-semibold">Updating every 20s</p>}
        </div>

        {loading ? (
          <div className="divide-y divide-slate-50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-2.5 bg-slate-50 rounded w-1/4" />
                </div>
                <div className="h-2.5 bg-slate-50 rounded w-12" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
              <i className="fas fa-clock-rotate-left text-slate-300 text-xl" />
            </div>
            <p className="text-sm font-bold text-slate-700">No activity found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {chips.length > 0
                ? 'Nothing matches these filters. Try a wider date range or remove a filter.'
                : 'Actions will appear here as your team works.'}
            </p>
            {chips.length > 0 && (
              <button onClick={resetFilters} className="mt-4 text-xs font-bold text-indigo-600 hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div>
            {grouped.map(([day, items]) => (
              <section key={day}>
                <div className="px-5 py-2 bg-slate-50/80 border-y border-slate-100 first:border-t-0 flex items-center justify-between">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{day}</p>
                  <p className="text-[10px] font-bold text-slate-400">{items.length}</p>
                </div>
                <ul className="divide-y divide-slate-50">
                  {items.map((log) => {
                    const am = ACTION_META[log.action] || { label: log.action, text: 'text-slate-500', bg: 'bg-slate-100', icon: 'fa-circle' };
                    const rm = RESOURCE_META[log.resource] || { label: log.resource || 'Item', icon: 'fa-circle' };
                    const open = expandedId === log._id;
                    const sensitive = log.severity === 'sensitive';
                    const detailEntries = Object.entries(log.details || {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
                    const hasDetail =
                      (log.changes && log.changes.length > 0) || detailEntries.length > 0 || !!log.ipAddress || !!log.userAgent || !!log.resourceId;
                    const ts = tsOf(log);
                    return (
                      <li key={log._id} className={`relative ${sensitive ? 'before:absolute before:left-0 before:inset-y-0 before:w-0.5 before:bg-rose-400' : ''}`}>
                        <button
                          type="button"
                          onClick={() => hasDetail && setExpandedId(open ? null : log._id)}
                          aria-expanded={hasDetail ? open : undefined}
                          className={`w-full text-left px-5 py-3.5 flex items-center gap-3.5 transition-colors focus:outline-none focus-visible:bg-indigo-50/60 ${
                            open ? 'bg-slate-50/80' : 'hover:bg-slate-50/60'
                          } ${hasDetail ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          <span className={`w-9 h-9 rounded-xl ${am.bg} ${am.text} flex items-center justify-center shrink-0`}>
                            <i className={`fas ${am.icon} text-xs`} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-semibold text-slate-800 truncate">
                                {log.summary || `${am.label} ${rm.label.toLowerCase()}`}
                              </span>
                              {sensitive && (
                                <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-50 text-rose-600">
                                  Sensitive
                                </span>
                              )}
                            </span>
                            <span className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400 min-w-0">
                              <span className="font-semibold text-slate-500 truncate">{log.userName}</span>
                              <span className="text-slate-300">·</span>
                              <span className="inline-flex items-center gap-1 shrink-0">
                                <i className={`fas ${rm.icon} text-[10px]`} />
                                {rm.label}
                              </span>
                              <span className="text-slate-300 hidden sm:inline">·</span>
                              <span className="hidden sm:inline shrink-0">{clockTime(ts)}</span>
                            </span>
                          </span>
                          <span className="flex items-center gap-3 shrink-0">
                            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap" title={ts ? new Date(ts).toLocaleString() : ''}>
                              {relTime(ts)}
                            </span>
                            <i
                              className={`fas fa-chevron-down text-[10px] text-slate-300 transition-transform ${open ? 'rotate-180' : ''} ${
                                hasDetail ? '' : 'invisible'
                              }`}
                            />
                          </span>
                        </button>

                        {open && hasDetail && (
                          <div className="px-5 pb-4 bg-slate-50/80">
                            <div className="sm:ml-[3.125rem] bg-white rounded-xl border border-slate-100 divide-y divide-slate-100">
                              {log.changes && log.changes.length > 0 && (
                                <div className="p-4">
                                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">What changed</p>
                                  <div className="space-y-1.5">
                                    {log.changes.map((c) => (
                                      <div key={c.field} className="grid grid-cols-[7rem_1fr] sm:grid-cols-[9rem_1fr] gap-3 text-xs items-start">
                                        <span className="font-bold text-slate-500 truncate">{humanKey(c.field)}</span>
                                        <span className="flex flex-wrap items-center gap-1.5 min-w-0">
                                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 line-through break-all">{fmtVal(c.from)}</span>
                                          <i className="fas fa-arrow-right text-[9px] text-slate-300" />
                                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium break-all">{fmtVal(c.to)}</span>
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {detailEntries.length > 0 && (
                                <dl className="p-4 grid sm:grid-cols-2 gap-x-6 gap-y-2">
                                  {detailEntries.map(([k, v]) => (
                                    <div key={k} className="min-w-0">
                                      <dt className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{humanKey(k)}</dt>
                                      <dd className="text-xs font-semibold text-slate-700 break-words">{fmtVal(v)}</dd>
                                    </div>
                                  ))}
                                </dl>
                              )}
                              <div className="px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-slate-500">
                                {ts && (
                                  <span>
                                    <i className="far fa-clock mr-1.5 text-slate-300" />
                                    {new Date(ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                                  </span>
                                )}
                                {log.userEmail && (
                                  <span>
                                    <i className="far fa-envelope mr-1.5 text-slate-300" />
                                    {log.userEmail}
                                  </span>
                                )}
                                {log.userAgent && (
                                  <span title={log.userAgent}>
                                    <i className="fas fa-display mr-1.5 text-slate-300" />
                                    {describeDevice(log.userAgent)}
                                  </span>
                                )}
                                {log.ipAddress && (
                                  <span>
                                    <i className="fas fa-network-wired mr-1.5 text-slate-300" />
                                    {cleanIp(log.ipAddress)}
                                  </span>
                                )}
                                {log.resourceId && (
                                  <button
                                    onClick={() => copyId(log.resourceId!)}
                                    className="font-mono text-slate-400 hover:text-indigo-600"
                                    title="Copy record ID"
                                  >
                                    <i className="far fa-copy mr-1.5" />
                                    {log.resourceId.slice(-8)}
                                  </button>
                                )}
                                {rm.route && (
                                  <Link to={rm.route} className="ml-auto font-bold text-indigo-600 hover:underline">
                                    Go to {rm.label.toLowerCase()}s →
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="flex justify-between items-center gap-2 px-5 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              {firstShown.toLocaleString()}–{lastShown.toLocaleString()} of {total.toLocaleString()}
            </span>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                >
                  <i className="fas fa-chevron-left text-[9px] mr-1" /> Newer
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                >
                  Older <i className="fas fa-chevron-right text-[9px] ml-1" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
