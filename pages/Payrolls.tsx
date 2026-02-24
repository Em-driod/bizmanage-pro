import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { Payroll } from '../types'; // Import Payroll type

const Payrolls: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPayrollId, setEditingPayrollId] = useState<string | null>(null);

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
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  return (
    <div className="min-h-screen space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-8">
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

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Processing Data...</p>
          </div>
        ) : (
          <div>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-extrabold uppercase tracking-[2px]">
                    <th className="px-8 py-5">Recipient Member</th>
                    <th className="px-8 py-5">Salary Component</th>
                    <th className="px-8 py-5">Effective Date</th>
                    <th className="px-8 py-5">Payment Status</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {payrolls.length === 0 ? (
                    <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-medium italic">No disbursements found.</td></tr>
                  ) : (
                    payrolls.map((pr) => (
                      <tr key={pr._id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-300">
                              <i className="fas fa-money-check-dollar"></i>
                            </div>
                            <p className="text-sm font-bold text-slate-900 truncate">{pr.staffName || "Unnamed Staff"}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-sm font-black text-slate-900">{formatCurrency(pr.salary)}</span>
                        </td>
                        <td className="px-8 py-6 text-sm font-medium text-slate-500">
                          {new Date(pr.payday).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-8 py-6">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase rounded-full ${pr.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pr.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                            {pr.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button
                            onClick={() => handleEditClick(pr)}
                            className="w-9 h-9 inline-flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-300 hover:text-indigo-600 hover:border-indigo-100 shadow-sm transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                          >
                            <i className="fas fa-edit text-xs"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-slate-100">
              {payrolls.length === 0 ? (
                <div className="p-12 text-center text-slate-400 font-medium italic">No disbursement records found.</div>
              ) : (
                payrolls.map((pr) => (
                  <div key={pr._id} className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                          <i className="fas fa-money-check-dollar text-sm"></i>
                        </div>
                        <p className="text-sm font-bold text-slate-900 leading-tight">{pr.staffName || "Unnamed Staff"}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full ${pr.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                        <span className={`w-1 h-1 rounded-full ${pr.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        {pr.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Disbursement Date</p>
                        <p className="text-xs font-semibold text-slate-600">{new Date(pr.payday).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Amount</p>
                        <p className="text-sm font-black text-slate-900">{formatCurrency(pr.salary)}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleEditClick(pr)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 active:bg-slate-50 transition-colors shadow-sm"
                    >
                      <i className="fas fa-pen-to-square text-xs text-indigo-500"></i>
                      Modify Details
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>


      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4 text-slate-800">
              {editingPayrollId ? 'Edit Payroll Entry' : 'Manual Payroll Entry'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Employee Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                  value={formData.staffName}
                  onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Salary Amount</label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                  value={formData.salary || ''}
                  onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Payday Date</label>
                <input
                  type="date"
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                  value={formData.payday}
                  onChange={(e) => setFormData({ ...formData, payday: e.target.value })}
                />
              </div>

              {/* Status Select Field */}
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Status</label>
                <select
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'paid' })}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                >
                  {editingPayrollId ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payrolls;