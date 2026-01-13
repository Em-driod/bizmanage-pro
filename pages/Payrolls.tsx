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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Payroll Management</h2>
        <button
          onClick={handleAddClick}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors"
        >
          Add Manual Entry
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-slate-500 text-xs font-bold uppercase tracking-wider">
              <th className="px-6 py-4">Employee Name</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">Loading...</td></tr>
            ) : payrolls.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">No records found.</td></tr>
            ) : (
              payrolls.map((pr) => (
                <tr key={pr._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {pr.staffName || "Unnamed"}
                  </td>
                  <td className="px-6 py-4 text-slate-900 font-bold">
                    {formatCurrency(pr.salary)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(pr.payday).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pr.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                      {pr.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleEditClick(pr)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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