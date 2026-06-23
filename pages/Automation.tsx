import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { API_BASE_URL, AUTH_TOKEN_KEY } from '../constants';

interface SyncEvent {
  type: string;
  action: string;
  recordId: string;
  status: 'synced' | 'pending' | 'failed';
  error?: string;
  syncedAt: string;
}

interface ExportStatus {
  sheetsConnected: boolean;
  googleSheetUrl: string;
  autoSyncEnabled: boolean;
  lastFullSyncAt?: string;
  recentEvents: SyncEvent[];
  queue: {
    pending: number;
    isProcessing: boolean;
  };
}

interface AutoCommitRule {
  _id: string;
  name: string;
  enabled: boolean;
  vendorPattern?: string;
  categories?: string[];
  maxAmount?: number;
  minConfidence: number;
  type?: 'income' | 'expense';
  defaultCategory?: string;
  matchCount: number;
  lastMatchedAt?: string;
}

const emptyRuleDraft = {
  name: '',
  vendorPattern: '',
  maxAmount: '',
  minConfidence: 0.85,
  type: '' as '' | 'income' | 'expense',
  defaultCategory: '',
};

const Automation: React.FC = () => {
  const [status, setStatus] = useState<ExportStatus | null>(null);
  const [rules, setRules] = useState<AutoCommitRule[]>([]);
  const [learningStats, setLearningStats] = useState<{ patternCount: number; highConfidenceCount: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [ruleDraft, setRuleDraft] = useState(emptyRuleDraft);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      setMessage({ text: 'Google Sheets successfully connected!', type: 'success' });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error') === 'consent_denied') {
      setMessage({ text: 'Google sign-in was cancelled or denied.', type: 'error' });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('error') === 'server_error') {
      setMessage({ text: 'Failed to connect Google Sheets. Please check server configuration.', type: 'error' });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await apiRequest<ExportStatus>('/export/status');
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch export status', error);
    }
  };

  const fetchRules = async () => {
    try {
      const data = await apiRequest<AutoCommitRule[]>('/automation/rules');
      setRules(data);
    } catch (error) {
      console.error('Failed to fetch auto-commit rules', error);
    }
  };

  const fetchLearningStats = async () => {
    try {
      const data = await apiRequest<{ patternCount: number; highConfidenceCount: number }>('/automation/learning-stats');
      setLearningStats(data);
    } catch (error) {
      console.error('Failed to fetch learning stats', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchStatus(), fetchRules(), fetchLearningStats()]);
      setIsLoading(false);
    };
    init();

    const handleUpdate = () => {
      fetchStatus();
      fetchRules();
      fetchLearningStats();
    };
    window.addEventListener('MorniyDataUpdate', handleUpdate);
    return () => window.removeEventListener('MorniyDataUpdate', handleUpdate);
  }, []);

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect this spreadsheet?')) return;
    try {
      await apiRequest('/export/disconnect', { method: 'POST' });
      await fetchStatus();
      setMessage({ text: 'Spreadsheet disconnected', type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleSyncAll = async () => {
    if (!window.confirm('This will sync all existing data to your spreadsheet. Large datasets may take a moment. Continue?')) return;
    setIsSyncingAll(true);
    setMessage(null);
    try {
      const res = await apiRequest<{ message: string }>('/export/sync-all', { method: 'POST' });
      setMessage({ text: res.message, type: 'success' });
      await fetchStatus();
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleDraft.name.trim()) {
      setMessage({ text: 'Rule name is required', type: 'error' });
      return;
    }
    setIsSavingRule(true);
    try {
      const payload: any = {
        name: ruleDraft.name.trim(),
        minConfidence: Number(ruleDraft.minConfidence) || 0,
      };
      if (ruleDraft.vendorPattern.trim()) payload.vendorPattern = ruleDraft.vendorPattern.trim();
      if (ruleDraft.maxAmount !== '') {
        const amt = Number(ruleDraft.maxAmount);
        if (!Number.isNaN(amt)) payload.maxAmount = amt;
      }
      if (ruleDraft.type === 'income' || ruleDraft.type === 'expense') payload.type = ruleDraft.type;
      if (ruleDraft.defaultCategory.trim()) payload.defaultCategory = ruleDraft.defaultCategory.trim();

      if (editingRuleId) {
        await apiRequest(`/automation/rules/${editingRuleId}`, { method: 'PUT', body: payload });
        setMessage({ text: 'Rule updated', type: 'success' });
      } else {
        await apiRequest('/automation/rules', { method: 'POST', body: payload });
        setMessage({ text: 'Auto-commit rule created', type: 'success' });
      }
      setRuleDraft(emptyRuleDraft);
      setEditingRuleId(null);
      await fetchRules();
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleEditRule = (rule: AutoCommitRule) => {
    setEditingRuleId(rule._id);
    setRuleDraft({
      name: rule.name,
      vendorPattern: rule.vendorPattern || '',
      maxAmount: typeof rule.maxAmount === 'number' ? String(rule.maxAmount) : '',
      minConfidence: rule.minConfidence,
      type: rule.type || '',
      defaultCategory: rule.defaultCategory || '',
    });
    document.getElementById('rule-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleToggleRule = async (rule: AutoCommitRule) => {
    try {
      await apiRequest(`/automation/rules/${rule._id}`, {
        method: 'PUT',
        body: { enabled: !rule.enabled },
      });
      await fetchRules();
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Delete this auto-commit rule?')) return;
    try {
      await apiRequest(`/automation/rules/${id}`, { method: 'DELETE' });
      await fetchRules();
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Data Automation</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Connect your workspace to real-time pipelines and spreadsheets.</p>
        </div>
        {status?.sheetsConnected && (
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Sheets Sync Active</span>
          </div>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'} text-sm font-bold flex items-center justify-between`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-current opacity-50 hover:opacity-100">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">

          {/* Google Sheets */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-4 sm:p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white text-xl">
                <i className="fas fa-file-excel"></i>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Google Sheets Integration</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Live Mirroring</p>
              </div>
            </div>

            <div className="space-y-6">
              <p className="text-sm text-slate-600 leading-relaxed">
                Connect your Google account to automatically provision a new Morniy Financials spreadsheet. Every transaction, client, invoice, and payroll record syncs in real-time.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                {!status?.sheetsConnected ? (
                  <button
                    onClick={() => {
                      const token = localStorage.getItem(AUTH_TOKEN_KEY);
                      window.location.href = `${API_BASE_URL}/export/google/auth?token=${token}`;
                    }}
                    className="h-12 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 px-8 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-3 w-full sm:w-auto"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                    Sign in with Google
                  </button>
                ) : (
                  <button
                    onClick={handleDisconnect}
                    className="h-12 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 px-8 rounded-xl font-bold text-sm transition-all w-full sm:w-auto"
                  >
                    Disconnect
                  </button>
                )}
              </div>

              {status?.sheetsConnected && (
                <div className="pt-6 border-t border-slate-50 flex flex-wrap gap-4">
                  <button
                    onClick={handleSyncAll}
                    disabled={isSyncingAll}
                    className="flex-1 min-w-[200px] h-11 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-all"
                  >
                    {isSyncingAll ? 'Syncing...' : 'Sync All Historical Data'}
                  </button>
                  <a
                    href={status.googleSheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[200px] h-11 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center hover:bg-emerald-100 transition-all"
                  >
                    Open Spreadsheet <i className="fas fa-external-link-alt ml-2"></i>
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* Auto-Commit Rules */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-4 sm:p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white text-xl">
                <i className="fas fa-bolt"></i>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Auto-Commit Rules</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                  {editingRuleId ? 'Editing rule — update fields below' : 'Skip review for predictable scans'}
                </p>
              </div>
            </div>

            <form id="rule-form" onSubmit={handleSaveRule} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <input
                type="text"
                placeholder="Rule name (e.g., Diesel under ₦50,000)"
                value={ruleDraft.name}
                onChange={(e) => setRuleDraft({ ...ruleDraft, name: e.target.value })}
                className="h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
              <input
                type="text"
                placeholder="Vendor pattern (e.g., oando)"
                value={ruleDraft.vendorPattern}
                onChange={(e) => setRuleDraft({ ...ruleDraft, vendorPattern: e.target.value })}
                className="h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <input
                type="number"
                placeholder="Max amount (optional)"
                value={ruleDraft.maxAmount}
                onChange={(e) => setRuleDraft({ ...ruleDraft, maxAmount: e.target.value as any })}
                className="h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                min={0}
                step="0.01"
              />
              <select
                value={ruleDraft.type}
                onChange={(e) => setRuleDraft({ ...ruleDraft, type: e.target.value as any })}
                className="h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Any type</option>
                <option value="expense">Expense only</option>
                <option value="income">Income only</option>
              </select>
              <input
                type="text"
                placeholder="Override category (optional)"
                value={ruleDraft.defaultCategory}
                onChange={(e) => setRuleDraft({ ...ruleDraft, defaultCategory: e.target.value })}
                className="h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Min confidence
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={ruleDraft.minConfidence}
                  onChange={(e) => setRuleDraft({ ...ruleDraft, minConfidence: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-xs font-bold text-slate-700 w-10 text-right">{Math.round(ruleDraft.minConfidence * 100)}%</span>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3">
                {editingRuleId && (
                  <button
                    type="button"
                    onClick={() => { setEditingRuleId(null); setRuleDraft(emptyRuleDraft); }}
                    className="h-11 bg-slate-100 text-slate-600 px-6 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSavingRule}
                  className="h-11 bg-slate-900 text-white px-8 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-60"
                >
                  {isSavingRule ? 'Saving...' : editingRuleId ? 'Update Rule' : 'Add Rule'}
                </button>
              </div>
            </form>

            <div className="space-y-3">
              {rules.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No rules yet — every scan goes to manual review</p>
                </div>
              ) : (
                rules.map((rule) => (
                  <div key={rule._id} className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${rule.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                        <p className="text-xs font-extrabold text-slate-900 tracking-tight truncate">{rule.name}</p>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                        {[
                          rule.vendorPattern && `vendor: ${rule.vendorPattern}`,
                          typeof rule.maxAmount === 'number' && `≤ ${rule.maxAmount}`,
                          rule.type && rule.type,
                          `conf ≥ ${Math.round(rule.minConfidence * 100)}%`,
                        ].filter(Boolean).join(' · ')}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">
                        Triggered {rule.matchCount} time{rule.matchCount === 1 ? '' : 's'}
                        {rule.lastMatchedAt ? ` · last ${new Date(rule.lastMatchedAt).toLocaleString()}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleToggleRule(rule)}
                        className={`px-3 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${rule.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white text-slate-500 border-slate-200'}`}
                      >
                        {rule.enabled ? 'On' : 'Off'}
                      </button>
                      <button
                        onClick={() => handleEditRule(rule)}
                        className="p-2.5 bg-white text-indigo-600 rounded-lg border border-slate-200 text-[10px] font-extrabold uppercase tracking-wider hover:bg-indigo-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule._id)}
                        className="p-2.5 bg-white text-rose-600 rounded-lg border border-slate-200 text-[10px] font-extrabold uppercase tracking-wider hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Side Panel */}
        <div className="space-y-8">

          {/* Engine Status */}
          <section className="bg-[#0F172A] rounded-3xl p-8 text-white shadow-xl shadow-slate-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <h3 className="text-sm font-bold uppercase tracking-widest mb-6 opacity-60">Engine Status</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium opacity-60">Sheets Connected</span>
                <span className={`text-xs font-black uppercase tracking-wider ${status?.sheetsConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {status?.sheetsConnected ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium opacity-60">Automation Queue</span>
                <span className="text-xs font-black uppercase tracking-wider text-indigo-400">
                  {status?.queue.pending ?? 0} Pending
                </span>
              </div>
              {status?.lastFullSyncAt && (
                <div className="pt-4 border-t border-white/10 mt-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-40 mb-1">Last Full Audit</p>
                  <p className="text-xs font-bold">{new Date(status.lastFullSyncAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </section>

          {/* Recent Sync Events */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400 mb-6">Recent Activities</h3>
            <div className="space-y-4">
              {status?.recentEvents.length === 0 ? (
                <p className="text-center py-6 text-xs font-bold text-slate-300 uppercase italic">Waiting for events...</p>
              ) : (
                status?.recentEvents.map((ev, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${ev.status === 'synced' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 tracking-tight capitalize">{ev.type} {ev.action}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">{new Date(ev.syncedAt).toLocaleTimeString()}</p>
                      {ev.error && <p className="text-[9px] text-rose-500 mt-1 font-medium">{ev.error}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Smart Learning */}
          <section className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-6">
              <i className="fas fa-brain text-xs"></i>
            </div>
            <h4 className="text-sm font-black mb-2 tracking-tight">Smart Learning Active</h4>
            <p className="text-xs leading-relaxed opacity-80 mb-6">Morniy learns from every transaction you categorise. Future scans of similar vendors are auto-suggested.</p>
            <div className="space-y-3">
              <div className="bg-white/10 px-3 py-2 rounded-lg flex items-center justify-between">
                <span className="text-[10px] font-bold">Patterns Learned</span>
                <span className="text-[10px] font-black tracking-widest text-[#C8FF00]">
                  {learningStats ? learningStats.patternCount : '—'}
                </span>
              </div>
              <div className="bg-white/10 px-3 py-2 rounded-lg flex items-center justify-between">
                <span className="text-[10px] font-bold">High-confidence</span>
                <span className="text-[10px] font-black tracking-widest text-[#C8FF00]">
                  {learningStats ? learningStats.highConfidenceCount : '—'}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Automation;
