
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { apiRequest } from '../services/api';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<User[]>('/users');
      setUsers(data);
    } catch (err: any) {
      // Fallback
      setUsers([
        { _id: 'u1', name: 'Alice Admin', email: 'alice@biz.com', role: UserRole.ADMIN, businessId: 'b1' },
        { _id: 'u2', name: 'Bob Staff', email: 'bob@biz.com', role: UserRole.STAFF, businessId: 'b1' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const deleteUser = async (id: string) => {
    if (!confirm('Delete user account?')) return;
    try {
      await apiRequest(`/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Team Management</h2>
          <p className="text-sm sm:text-base text-slate-500 font-medium">Manage your organization's members and their permissions.</p>
        </div>
      </div>

      <div className="bg-indigo-50/50 border border-indigo-100/50 p-4 sm:p-5 rounded-2xl flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
          <i className="fas fa-shield-halved"></i>
        </div>
        <div>
          <p className="text-sm font-bold text-indigo-900 mb-0.5">Administrator Access Required</p>
          <p className="text-xs text-indigo-700 font-medium leading-relaxed">Only users with Administrative privileges can access this section to manage team members and assign roles.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading team...</p>
          </div>
        ) : (
          <div>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-extrabold uppercase tracking-[2px]">
                    <th className="px-8 py-5">Team Member</th>
                    <th className="px-8 py-5">Email Address</th>
                    <th className="px-8 py-5">Access Role</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-300">
                            <i className="fas fa-user-tie"></i>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{u.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{u.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm font-medium text-slate-500">{u.email}</td>
                      <td className="px-8 py-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase rounded-full ${u.role === UserRole.ADMIN
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-slate-50 text-slate-600'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.role === UserRole.ADMIN ? 'bg-indigo-500' : 'bg-slate-400'}`}></span>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button
                          onClick={() => deleteUser(u._id)}
                          className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-300 hover:text-rose-600 hover:border-rose-100 shadow-sm transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                        >
                          <i className="fas fa-trash-can text-xs"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-slate-100">
              {users.map((u) => (
                <div key={u._id} className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                        <i className="fas fa-user-tie text-sm"></i>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate leading-tight">{u.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{u.role}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full ${u.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-600'
                      }`}>
                      <span className={`w-1 h-1 rounded-full ${u.role === UserRole.ADMIN ? 'bg-indigo-500' : 'bg-slate-400'}`}></span>
                      {u.role}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Contact Email</p>
                    <p className="text-xs font-semibold text-slate-600 truncate">{u.email}</p>
                  </div>

                  <button
                    onClick={() => deleteUser(u._id)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-rose-500 active:bg-rose-50 transition-colors shadow-sm"
                  >
                    <i className="fas fa-trash-can text-xs"></i>
                    Remove Team Member
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

  );
};

export default Users;
