import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import type { Client, User } from '../types';

type ProjectStatus = 'planning' | 'active' | 'completed' | 'on_hold';

interface ProjectListItem {
  _id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  budget?: number;
  clientId?: { _id: string; name: string } | null;
  teamMembers: Array<{ _id: string; name: string }>;
  createdAt: string;
}

interface ProjectPnL {
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  budget: number;
  budgetUtilization: number;
  invoicedTotal: number;
  paidTotal: number;
  outstanding: number;
}

interface ProjectDetailResponse {
  project: ProjectListItem & { teamMembers: Array<{ _id: string; name: string; email: string; role: string }> };
  pnl: ProjectPnL;
}

interface TeamUtilization {
  utilization: Array<{
    userId: string;
    name: string;
    email: string;
    role: string;
    activeProjects: Array<{ id: string; name: string; status: ProjectStatus }>;
    load: number;
  }>;
  totalActiveProjects: number;
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planning',
  active: 'Active',
  completed: 'Completed',
  on_hold: 'On Hold',
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
  planning: 'bg-amber-50 text-amber-700 border-amber-100',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  completed: 'bg-slate-100 text-slate-600 border-slate-200',
  on_hold: 'bg-rose-50 text-rose-700 border-rose-100',
};

const emptyDraft = {
  name: '',
  description: '',
  clientId: '',
  budget: '',
  status: 'active' as ProjectStatus,
  teamMembers: [] as string[],
};

const Projects: React.FC = () => {
  const { formatCurrency: format } = useCurrency();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [team, setTeam] = useState<TeamUtilization | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProjectDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      const [projectsData, clientsRes, usersData, teamData] = await Promise.all([
        apiRequest<ProjectListItem[]>('/projects'),
        apiRequest<{ data: Client[] } | Client[]>('/clients?limit=200').catch(() => []),
        apiRequest<User[]>('/users').catch(() => []),
        apiRequest<TeamUtilization>('/projects/team/utilization').catch(() => null),
      ]);
      const clientsData = Array.isArray(clientsRes) ? clientsRes : (clientsRes as any).data ?? [];
      setProjects(projectsData);
      setClients(clientsData);
      setUsers(usersData);
      setTeam(teamData);
      if (!selectedId && projectsData.length > 0) {
        setSelectedId(projectsData[0]._id);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadAll();
      setIsLoading(false);
    };
    init();
    const handler = () => loadAll();
    window.addEventListener('MorniyDataUpdate', handler);
    return () => window.removeEventListener('MorniyDataUpdate', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    apiRequest<ProjectDetailResponse>(`/projects/${selectedId}`)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, projects]);

  const stats = useMemo(() => {
    const active = projects.filter((p) => p.status === 'active').length;
    const planning = projects.filter((p) => p.status === 'planning').length;
    const onHold = projects.filter((p) => p.status === 'on_hold').length;
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    return { total: projects.length, active, planning, onHold, totalBudget };
  }, [projects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      setError('Project name is required');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: any = {
        name: draft.name.trim(),
        status: draft.status,
        teamMembers: draft.teamMembers,
      };
      if (draft.description.trim()) payload.description = draft.description.trim();
      if (draft.clientId) payload.clientId = draft.clientId;
      if (draft.budget !== '') {
        const b = Number(draft.budget);
        if (!Number.isNaN(b)) payload.budget = b;
      }
      const created = await apiRequest<ProjectListItem>('/projects', { method: 'POST', body: payload });
      setProjects([created, ...projects]);
      setSelectedId(created._id);
      setDraft(emptyDraft);
      setShowForm(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: ProjectStatus) => {
    try {
      const updated = await apiRequest<ProjectListItem>(`/projects/${id}`, {
        method: 'PUT',
        body: { status },
      });
      setProjects((prev) => prev.map((p) => (p._id === id ? updated : p)));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this project? Linked transactions are not deleted.')) return;
    try {
      await apiRequest(`/projects/${id}`, { method: 'DELETE' });
      setProjects((prev) => prev.filter((p) => p._id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (e: any) {
      setError(e.message);
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
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Projects</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Track project profitability and team capacity in one place.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="h-11 bg-slate-900 text-white px-6 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
        >
          {showForm ? 'Cancel' : 'New Project'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border bg-rose-50 border-rose-100 text-rose-800 text-sm font-bold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="opacity-50 hover:opacity-100">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={String(stats.total)} />
        <StatCard label="Active" value={String(stats.active)} accent="text-emerald-600" />
        <StatCard label="Planning" value={String(stats.planning)} accent="text-amber-600" />
        <StatCard label="Total Budget" value={format(stats.totalBudget)} />
      </div>

      {/* Create form */}
      {showForm && (
        <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-8">
          <h3 className="text-lg font-extrabold text-slate-900 mb-6">New Project</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Project name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
            <select
              value={draft.clientId}
              onChange={(e) => setDraft({ ...draft, clientId: e.target.value })}
              className="h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Budget"
              value={draft.budget}
              onChange={(e) => setDraft({ ...draft, budget: e.target.value as any })}
              className="h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              min={0}
              step="0.01"
            />
            <select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as ProjectStatus })}
              className="h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
            <textarea
              placeholder="Description (optional)"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="md:col-span-2 min-h-[80px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
            />
            <div className="md:col-span-2">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">Team members</label>
              <div className="flex flex-wrap gap-2">
                {users.map((u) => {
                  const checked = draft.teamMembers.includes(u._id);
                  return (
                    <button
                      type="button"
                      key={u._id}
                      onClick={() => {
                        const next = checked
                          ? draft.teamMembers.filter((id) => id !== u._id)
                          : [...draft.teamMembers, u._id];
                        setDraft({ ...draft, teamMembers: next });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${checked ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                      {u.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 bg-slate-900 text-white px-8 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-60"
              >
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Main grid: list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-3">
          {projects.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No projects yet</p>
            </div>
          ) : (
            projects.map((p) => (
              <button
                key={p._id}
                onClick={() => setSelectedId(p._id)}
                className={`w-full text-left p-5 rounded-2xl border transition-all ${selectedId === p._id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-900 border-slate-100 hover:border-slate-300'}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className={`text-sm font-extrabold tracking-tight truncate ${selectedId === p._id ? 'text-white' : 'text-slate-900'}`}>{p.name}</p>
                  <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-full border ${selectedId === p._id ? 'bg-white/10 text-white border-white/20' : STATUS_COLORS[p.status]}`}>
                    {STATUS_LABELS[p.status]}
                  </span>
                </div>
                <p className={`text-[10px] font-bold uppercase tracking-widest truncate ${selectedId === p._id ? 'text-white/60' : 'text-slate-400'}`}>
                  {p.clientId?.name || 'No client'} · {p.teamMembers.length} member{p.teamMembers.length === 1 ? '' : 's'}
                </p>
                {typeof p.budget === 'number' && p.budget > 0 && (
                  <p className={`text-xs font-bold mt-2 ${selectedId === p._id ? 'text-white/80' : 'text-slate-600'}`}>{format(p.budget)} budget</p>
                )}
              </button>
            ))
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {detail ? (
            <ProjectDetailView
              detail={detail}
              format={format}
              onStatusChange={(s) => handleStatusChange(detail.project._id, s)}
              onDelete={() => handleDelete(detail.project._id)}
            />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center">
              <p className="text-sm font-bold text-slate-400">Select a project to see profitability and team load.</p>
            </div>
          )}

          {/* Team utilization */}
          {team && team.utilization.length > 0 && (
            <section className="bg-[#0F172A] rounded-3xl p-8 text-white shadow-xl shadow-slate-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold uppercase tracking-widest opacity-60">Team Capacity</h3>
                <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-60">
                  {team.totalActiveProjects} active project{team.totalActiveProjects === 1 ? '' : 's'}
                </span>
              </div>
              <div className="space-y-3">
                {team.utilization.map((u) => {
                  const pct = team.totalActiveProjects > 0 ? Math.min(100, Math.round((u.load / team.totalActiveProjects) * 100)) : 0;
                  const overloaded = u.load >= 3;
                  return (
                    <div key={u.userId}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold">{u.name}</span>
                        <span className={`font-extrabold uppercase tracking-widest text-[10px] ${overloaded ? 'text-rose-300' : 'text-emerald-300'}`}>
                          {u.load} project{u.load === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${overloaded ? 'bg-rose-400' : 'bg-emerald-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-5">
    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
    <p className={`text-2xl font-black tracking-tight ${accent || 'text-slate-900'}`}>{value}</p>
  </div>
);

const ProjectDetailView: React.FC<{
  detail: ProjectDetailResponse;
  format: (n: number) => string;
  onStatusChange: (s: ProjectStatus) => void;
  onDelete: () => void;
}> = ({ detail, format, onStatusChange, onDelete }) => {
  const { project, pnl } = detail;
  const marginPct = Math.round(pnl.margin * 100);
  const utilPct = Math.min(150, Math.round(pnl.budgetUtilization * 100));
  const profitColor = pnl.profit >= 0 ? 'text-emerald-600' : 'text-rose-600';
  const utilColor = utilPct > 90 ? 'bg-rose-500' : utilPct > 70 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-8 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
            {project.clientId?.name || 'No client linked'}
          </p>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{project.name}</h2>
          {project.description && <p className="text-sm text-slate-500 mt-2">{project.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={project.status}
            onChange={(e) => onStatusChange(e.target.value as ProjectStatus)}
            className="h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
          <button
            onClick={onDelete}
            className="h-10 px-4 bg-white text-rose-600 rounded-lg border border-slate-200 text-[10px] font-extrabold uppercase tracking-wider hover:bg-rose-50"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <PnlCell label="Revenue" value={format(pnl.revenue)} />
        <PnlCell label="Expenses" value={format(pnl.expenses)} />
        <PnlCell label="Profit" value={format(pnl.profit)} accent={profitColor} />
        <PnlCell label="Margin" value={`${marginPct}%`} accent={profitColor} />
      </div>

      {project.budget && project.budget > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Budget Utilization</p>
            <span className="text-xs font-bold text-slate-700">
              {format(pnl.expenses)} / {format(pnl.budget)} · {utilPct}%
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${utilColor}`} style={{ width: `${Math.min(100, utilPct)}%` }} />
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PnlCell label="Invoiced" value={format(pnl.invoicedTotal)} />
        <PnlCell label="Paid" value={format(pnl.paidTotal)} />
        <PnlCell label="Outstanding" value={format(pnl.outstanding)} accent={pnl.outstanding > 0 ? 'text-amber-600' : 'text-slate-900'} />
      </div>

      {project.teamMembers.length > 0 && (
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Team</p>
          <div className="flex flex-wrap gap-2">
            {project.teamMembers.map((m) => (
              <span key={m._id} className="px-3 py-1.5 bg-slate-50 rounded-lg text-xs font-bold text-slate-700 border border-slate-100">
                {m.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

const PnlCell: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => (
  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-lg font-black tracking-tight ${accent || 'text-slate-900'}`}>{value}</p>
  </div>
);

export default Projects;
