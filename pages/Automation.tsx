import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

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
  webhookCount: number;
  recentEvents: SyncEvent[];
  queue: {
    pending: number;
    isProcessing: boolean;
  };
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  lastTriggeredAt?: string;
}

const Automation: React.FC = () => {
  const [status, setStatus] = useState<ExportStatus | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [sheetUrl, setSheetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await apiRequest<ExportStatus>('/export/status');
      setStatus(data);
      if (data.googleSheetUrl) setSheetUrl(data.googleSheetUrl);
    } catch (error) {
      console.error('Failed to fetch export status', error);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const data = await apiRequest<Webhook[]>('/export/webhooks');
      setWebhooks(data);
    } catch (error) {
      console.error('Failed to fetch webhooks', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchStatus(), fetchWebhooks()]);
      setIsLoading(false);
    };
    init();
    const interval = setInterval(fetchStatus, 10000); // Polling status
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    if (!sheetUrl) return;
    setIsConnecting(true);
    setMessage(null);
    try {
      const res = await apiRequest<{ message: string }>('/export/connect', {
        method: 'POST',
        body: { sheetUrl },
      });
      setMessage({ text: res.message, type: 'success' });
      await fetchStatus();
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect this spreadsheet?')) return;
    try {
      await apiRequest('/export/disconnect', { method: 'POST' });
      setSheetUrl('');
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

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookUrl) return;
    try {
      await apiRequest('/export/webhooks', {
        method: 'POST',
        body: { url: newWebhookUrl, events: ['*'] }, // Subscribe to all by default
      });
      setNewWebhookUrl('');
      await fetchWebhooks();
      setMessage({ text: 'Webhook added successfully', type: 'success' });
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      await apiRequest(`/export/webhooks/${id}`, { method: 'DELETE' });
      await fetchWebhooks();
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    }
  };

  const handleTestWebhook = async (id: string) => {
    try {
      const res = await apiRequest<{ delivered: boolean; status: number }>(`/export/webhooks/${id}/test`, { method: 'POST' });
      if (res.delivered) {
        alert(`Success! Test event delivered (Status: ${res.status})`);
      } else {
        alert(`Failed to deliver test event (Status: ${res.status})`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
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
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Data Automation</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Connect your workspace to real-time pipelines and spreadsheets.</p>
        </div>
        
        {status?.sheetsConnected && (
          <div className="flex items-center gap-3">
             <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Sheets Sync Active</span>
             </div>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Connection Tool */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Card: Google Sheets */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white text-xl">
                <i className="fas fa-file-excel"></i>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Google Sheets Integration</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Live Live Mirroring</p>
              </div>
            </div>

            <div className="space-y-6">
              <p className="text-sm text-slate-600 leading-relaxed">
                Automatically sync every transaction, client, invoice and payroll record to your Google Sheet in real-time. 
                <span className="block mt-2 font-bold text-indigo-600">Tip: Share your sheet with: <code className="bg-slate-50 px-2 py-1 rounded select-all text-indigo-800 font-mono">opsflow@your-project.iam.gserviceaccount.com</code></span>
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Paste Google Sheet URL..."
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    disabled={status?.sheetsConnected}
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-75"
                  />
                </div>
                {!status?.sheetsConnected ? (
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting || !sheetUrl}
                    className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white px-8 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Sheet'}
                  </button>
                ) : (
                  <button
                    onClick={handleDisconnect}
                    className="h-12 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 px-8 rounded-xl font-bold text-sm transition-all"
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

          {/* Card: Webhooks */}
          <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white text-xl">
                <i className="fas fa-plug"></i>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Automation Webhooks</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Connect to Zapier, n8n, or Make</p>
              </div>
            </div>

            <form onSubmit={handleAddWebhook} className="mb-10">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  placeholder="Enter dynamic endpoint URL..."
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  className="flex-1 h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  required
                />
                <button
                  type="submit"
                  className="h-12 bg-slate-900 text-white px-8 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
                >
                  Register Webhook
                </button>
              </div>
            </form>

            <div className="space-y-4">
              {webhooks.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No active webhooks</p>
                </div>
              ) : (
                webhooks.map((wh) => (
                  <div key={wh.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        <p className="text-xs font-bold text-slate-900 truncate tracking-tight">{wh.url}</p>
                      </div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                        {wh.lastTriggeredAt ? `Last active: ${new Date(wh.lastTriggeredAt).toLocaleString()}` : 'Never triggered'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => handleTestWebhook(wh.id)}
                        className="p-2.5 bg-white text-indigo-600 rounded-lg border border-slate-200 text-[10px] font-extrabold uppercase tracking-wider hover:bg-indigo-50"
                      >
                        Test
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(wh.id)}
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

        {/* Status Bar / Side Panel */}
        <div className="space-y-8">
          
          {/* Card: Sync Status */}
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
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium opacity-60">Webhooks Ready</span>
                <span className="text-xs font-black uppercase tracking-wider">
                   {status?.webhookCount ?? 0}
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

          {/* Card: Recent Sync Events */}
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

          {/* Card: Intelligence Widget - Placeholder for future AI features */}
          <section className="bg-indigo-600 rounded-3xl p-8 text-white">
             <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                <i className="fas fa-brain text-xs"></i>
             </div>
             <h4 className="text-sm font-black mb-2 tracking-tight">AI Insights Coming Soon</h4>
             <p className="text-xs leading-relaxed opacity-80 mb-6">Automated trend analysis and predictive bookkeeping will soon be available directly in your spreadsheet tabs.</p>
             <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="w-2/3 h-full bg-white/40"></div>
             </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Automation;
