import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { Payroll } from '../types';

const Payrolls: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPayrollId, setEditingPayrollId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkConfirm, setIsBulkConfirm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const initialFormData = {
    staffName: '',
    salary: 0,
    payday: new Date().toISOString().split('T')[0],
    status: 'pending',
  };
  const [formData, setFormData] = useState(initialFormData);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<Payroll[]>('/payrolls');
      setPayrolls(data);
    } catch (err: any) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const handler = () => fetchData();
    window.addEventListener('MorniyDataUpdate', handler);
    return () => window.removeEventListener('MorniyDataUpdate', handler);
  }, []);

  const [toastMsg, setToastMsg] = useState('');
  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000); };

  // KPI calculations (all-time)
  const kpis = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthItems = payrolls.filter(p => new Date(p.payday).toISOString().slice(0, 7) === thisMonth);
    const pending = payrolls.filter(p => p.status === 'pending');
    const paid = payrolls.filter(p => p.status === 'paid');
    return {
      monthTotal: monthItems.reduce((s, p) => s + p.salary, 0),
      pendingCount: pending.length,
      pendingTotal: pending.reduce((s, p) => s + p.salary, 0),
      paidCount: paid.length,
      paidTotal: paid.reduce((s, p) => s + p.salary, 0),
    };
  }, [payrolls]);

  // Group by pay period (YYYY-MM)
  const grouped = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const filtered = q
      ? payrolls.filter(p => p.staffName.toLowerCase().includes(q))
      : payrolls;

    const map: Record<string, Payroll[]> = {};
    for (const p of filtered) {
      const key = new Date(p.payday).toISOString().slice(0, 7);
      if (!map[key]) map[key] = [];
      map[key].push(p);
    }
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [payrolls, searchQuery]);

  const handleAddClick = () => {
    setEditingPayrollId(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const handleEditClick = (payroll: Payroll) => {
    setEditingPayrollId(payroll._id);
    setFormData({
      staffName: payroll.staffName,
      salary: payroll.salary,
      payday: new Date(payroll.payday).toISOString().split('T')[0],
      status: payroll.status,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPayrollId(null);
    setFormData(initialFormData);
  };

  const handleSharePayslip = async (id: string) => {
    try {
      const { token } = await apiRequest<{ token: string }>(`/payrolls/${id}/payslip`, { method: 'POST' });
      const link = `${window.location.origin}${window.location.pathname}#/payslip/${token}`;
      await navigator.clipboard.writeText(link);
      showToast('Payslip link copied!');
    } catch {
      showToast('Failed to generate payslip');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/payrolls/${id}`, { method: 'DELETE' });
      showToast('Entry deleted');
      fetchData();
    } catch {
      showToast('Delete failed');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleBulkPay = async () => {
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          apiRequest(`/payrolls/${id}`, { method: 'PUT', body: { status: 'paid' } })
        )
      );
      showToast(`${selectedIds.size} entries marked as paid`);
      setSelectedIds(new Set());
      fetchData();
    } catch {
      showToast('Bulk update failed');
    } finally {
      setIsBulkConfirm(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPayrollId) {
        await apiRequest(`/payrolls/${editingPayrollId}`, { method: 'PUT', body: formData });
      } else {
        await apiRequest('/payrolls', { method: 'POST', body: formData });
      }
      closeModal();
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const pendingInView = grouped.flatMap(([, items]) => items).filter(p => p.status === 'pending');

  return (
    <div className="min-h-screen space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-8">
      {toastMsg && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Financial Disbursements</h2>
          <p className="text-sm sm:text-base text-slate-500 font-medium">Manage organization-wide payroll and staff compensation.</p>
        </div>
        <button
          onClick={handleAddClick}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95 text-sm font-bold"
        >
          <i className="fas fa-plus text-xs"></i> Manual Entry
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'This Month', value: formatCurrency(kpis.monthTotal), icon: 'fa-calendar', color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Pending', value: `${kpis.pendingCount} · ${formatCurrency(kpis.pendingTotal)}`, icon: 'fa-clock', color: 'bg-amber-50 text-amber-600' },
          { label: 'Paid', value: `${kpis.paidCount} · ${formatCurrency(kpis.paidTotal)}`, icon: 'fa-check-circle', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Total Staff', value: `${new Set(payrolls.map(p => p.staffName)).size}`, icon: 'fa-users', color: 'bg-slate-100 text-slate-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.color}`}>
              <i className={`fas ${kpi.icon} text-sm`}></i>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
              <p className="text-sm font-black text-slate-900 mt-0.5">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input
            type="text"
            placeholder="Search staff..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          />
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={() => setIsBulkConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-100"
          >
            <i className="fas fa-check text-xs"></i>
            Mark {selectedIds.size} as Paid
          </button>
        )}
        {pendingInView.length > 0 && selectedIds.size === 0 && (
          <button
            onClick={() => setSelectedIds(new Set(pendingInView.map(p => p._id)))}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors"
          >
            <i className="fas fa-check-double text-xs"></i>
            Select All Pending
          </button>
        )}
      </div>

      {/* Records grouped by period */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4 bg-white rounded-[2rem] border border-slate-100">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Processing Data...</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-16 text-center">
          <i className="fas fa-money-check-dollar text-4xl text-slate-200 mb-4 block"></i>
          <p className="text-slate-400 font-medium italic">No disbursement records found.</p>
        </div>
      ) : (
        grouped.map(([period, items]) => {
          const periodTotal = items.reduce((s, p) => s + p.salary, 0);
          const paidCount = items.filter(p => p.status === 'paid').length;
          const [year, month] = period.split('-');
          const periodLabel = new Date(parseInt(year), parseInt(month) - 1, 1)
            .toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

          return (
            <div key={period} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
              {/* Period header */}
              <div className="flex items-center justify-between px-6 sm:px-8 py-4 bg-slate-50/60 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <i className="fas fa-calendar-days text-xs"></i>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">{periodLabel}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{items.length} entries · {paidCount}/{items.length} paid</p>
                  </div>
                </div>
                <p className="text-sm font-black text-slate-900">{formatCurrency(periodTotal)}</p>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-extrabold uppercase tracking-[2px]">
                      <th className="px-6 py-4 w-10"></th>
                      <th className="px-6 py-4">Recipient</th>
                      <th className="px-6 py-4">Salary</th>
                      <th className="px-6 py-4">Payday</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((pr) => (
                      <tr key={pr._id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-5">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(pr._id)}
                            onChange={() => toggleSelect(pr._id)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-300">
                              <i className="fas fa-money-check-dollar text-sm"></i>
                            </div>
                            <p className="text-sm font-bold text-slate-900">{pr.staffName || 'Unnamed Staff'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-sm font-black text-slate-900">{formatCurrency(pr.salary)}</span>
                        </td>
                        <td className="px-6 py-5 text-sm font-medium text-slate-500">
                          {new Date(pr.payday).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase rounded-full ${pr.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pr.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                            {pr.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all">
                            <button
                              onClick={() => handleSharePayslip(pr._id)}
                              className="w-9 h-9 inline-flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-300 hover:text-emerald-600 hover:border-emerald-100 shadow-sm transition-all"
                              title="Copy payslip link"
                            >
                              <i className="fas fa-link text-xs"></i>
                            </button>
                            <button
                              onClick={() => handleEditClick(pr)}
                              className="w-9 h-9 inline-flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-300 hover:text-indigo-600 hover:border-indigo-100 shadow-sm transition-all"
                              title="Edit"
                            >
                              <i className="fas fa-edit text-xs"></i>
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(pr._id)}
                              className="w-9 h-9 inline-flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-300 hover:text-rose-600 hover:border-rose-100 shadow-sm transition-all"
                              title="Delete"
                            >
                              <i className="fas fa-trash text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {items.map((pr) => (
                  <div key={pr._id} className="p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(pr._id)}
                        onChange={() => toggleSelect(pr._id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                            <i className="fas fa-money-check-dollar text-sm"></i>
                          </div>
                          <p className="text-sm font-bold text-slate-900">{pr.staffName || 'Unnamed Staff'}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full ${pr.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          <span className={`w-1 h-1 rounded-full ${pr.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                          {pr.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Payday</p>
                        <p className="text-xs font-semibold text-slate-600">{new Date(pr.payday).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Amount</p>
                        <p className="text-sm font-black text-slate-900">{formatCurrency(pr.salary)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => handleSharePayslip(pr._id)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-600">
                        <i className="fas fa-link text-xs"></i> Payslip
                      </button>
                      <button onClick={() => handleEditClick(pr)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 shadow-sm">
                        <i className="fas fa-pen-to-square text-xs text-indigo-500"></i> Edit
                      </button>
                      <button onClick={() => setDeleteConfirmId(pr._id)} className="w-10 flex items-center justify-center py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-500">
                        <i className="fas fa-trash text-xs"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4 text-slate-800">
              {editingPayrollId ? 'Edit Payroll Entry' : 'Manual Payroll Entry'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Employee Full Name</label>
                <input type="text" placeholder="e.g. John Doe" className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" required value={formData.staffName} onChange={e => setFormData({ ...formData, staffName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Salary Amount</label>
                <input type="number" placeholder="0.00" className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" required value={formData.salary || ''} onChange={e => setFormData({ ...formData, salary: parseFloat(e.target.value) })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Payday Date</label>
                <input type="date" className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" required value={formData.payday} onChange={e => setFormData({ ...formData, payday: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Status</label>
                <select className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as 'pending' | 'paid' })}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={closeModal} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700 shadow-sm transition-colors">{editingPayrollId ? 'Update Entry' : 'Save Entry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-trash text-xl"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Entry?</h3>
            <p className="text-sm text-slate-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-sm hover:bg-rose-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk pay confirm */}
      {isBulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-check-double text-xl"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Mark {selectedIds.size} as Paid?</h3>
            <p className="text-sm text-slate-500 mb-6">This will update the status to "paid" for all selected entries.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsBulkConfirm(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleBulkPay} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700 transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payrolls;
