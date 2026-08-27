import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ActivityEntry {
  _id: string;
  action: string;
  resource: string;
  details?: any;
  timestamp?: string;
  createdAt?: string;
}

const ACTION_COLOR: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-600',
  LOGIN: 'bg-indigo-100 text-indigo-700',
  LOGOUT: 'bg-slate-100 text-slate-600',
  VIEW: 'bg-amber-100 text-amber-700',
};

const Users: React.FC = () => {
    const { user: currentUser, isAdmin } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userActivity, setUserActivity] = useState<ActivityEntry[]>([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: UserRole.STAFF
    });

    useEffect(() => {
        if (!isAdmin) return;
        fetchUsers();
    }, [isAdmin]);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const data = await apiRequest<User[]>('/users');
            setUsers(data);
        } catch (err: any) {
            console.error('Failed to fetch users:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            role: UserRole.STAFF
        });
        setEditingUser(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dataToSend = { 
                ...formData, 
                businessId: currentUser?.businessId 
            };
            if (!dataToSend.password) {
                delete dataToSend.password;
            }

            if (editingUser) {
                await apiRequest(`/users/${editingUser._id}`, { method: 'PUT', body: dataToSend });
            } else {
                await apiRequest('/users/staff', { method: 'POST', body: dataToSend });
            }
            
            setShowModal(false);
            resetForm();
            fetchUsers();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role
        });
        setShowModal(true);
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Delete this user? This action cannot be undone.')) return;
        
        try {
            await apiRequest(`/users/${userId}`, { method: 'DELETE' });
            fetchUsers();
        } catch (err: any) {
            alert('Error deleting user: ' + err.message);
        }
    };

    const openUserActivity = async (user: User) => {
        setSelectedUser(user);
        setActivityLoading(true);
        setUserActivity([]);
        try {
            const res = await apiRequest<{ logs: ActivityEntry[] }>(`/activity?userId=${user._id}&limit=100`);
            setUserActivity(res.logs || []);
        } catch {
            setUserActivity([]);
        } finally {
            setActivityLoading(false);
        }
    };

    const getRoleBadge = (role: UserRole) => {
        const styles = {
            [UserRole.ADMIN]: 'bg-rose-100 text-rose-700',
            [UserRole.STAFF]: 'bg-blue-100 text-blue-700'
        };
        return (
            <span className={`px-2 py-1 text-xs font-bold uppercase rounded-full ${styles[role]}`}>
                {role}
            </span>
        );
    };

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <i className="fas fa-lock text-rose-600 text-2xl"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
                    <p className="text-slate-600">You don't have permission to access user management.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">User Management</h2>
                    <p className="text-sm sm:text-base text-slate-500 font-medium">Manage team members and their access levels.</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95 text-sm font-bold"
                >
                    <i className="fas fa-user-plus text-xs"></i> Add User
                </button>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-4">
                        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading users...</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-extrabold uppercase tracking-[2px]">
                                        <th className="px-8 py-5">Name</th>
                                        <th className="px-8 py-5">Email</th>
                                        <th className="px-8 py-5">Role</th>
                                        <th className="px-8 py-5">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {users.length === 0 ? (
                                        <tr><td colSpan={4} className="text-center py-12 text-slate-400 font-medium italic">No users found.</td></tr>
                                    ) : (
                                        users.map(user => (
                                            <tr key={user._id} onClick={() => openUserActivity(user)} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                                            <i className="fas fa-user text-indigo-600 text-xs"></i>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900">{user.name}</p>
                                                            {user._id === currentUser?._id && (
                                                                <p className="text-[10px] text-indigo-500 font-medium">You</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="text-sm text-slate-600">{user.email}</p>
                                                </td>
                                                <td className="px-8 py-6">
                                                    {getRoleBadge(user.role)}
                                                </td>
                                                <td className="px-8 py-6 text-right" onClick={e => e.stopPropagation()}>
                                                    <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                                                        <button
                                                            onClick={() => handleEdit(user)}
                                                            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm hover:shadow-md transition-all"
                                                            disabled={user._id === currentUser?._id}
                                                        >
                                                            <i className="fas fa-edit text-xs"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(user._id)}
                                                            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-100 shadow-sm hover:shadow-md transition-all"
                                                            disabled={user._id === currentUser?._id || user.role === UserRole.ADMIN}
                                                        >
                                                            <i className="fas fa-trash-alt text-xs"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {users.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 font-medium italic">No users found.</div>
                            ) : (
                                users.map(user => (
                                    <div key={user._id} className="p-5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                                    <i className="fas fa-user text-indigo-600 text-sm"></i>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{user.name}</p>
                                                    {user._id === currentUser?._id && (
                                                        <p className="text-[10px] text-indigo-500 font-medium">You</p>
                                                    )}
                                                </div>
                                            </div>
                                            {getRoleBadge(user.role)}
                                        </div>

                                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email</p>
                                                <p className="text-xs font-semibold text-slate-600">{user.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-1">
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 active:bg-slate-50 transition-colors shadow-sm"
                                                disabled={user._id === currentUser?._id}
                                            >
                                                <i className="fas fa-pen-to-square text-xs text-indigo-500"></i>
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user._id)}
                                                className="w-11 flex items-center justify-center py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-rose-500 active:bg-rose-50 transition-colors shadow-sm"
                                                disabled={user._id === currentUser?._id || user.role === UserRole.ADMIN}
                                            >
                                                <i className="fas fa-trash-alt text-xs"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* User Activity Drawer */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
                    <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Drawer header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-4 flex-shrink-0">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center">
                                <i className="fas fa-user text-indigo-600 text-sm"></i>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-base font-black text-slate-900 truncate">{selectedUser.name}</p>
                                <p className="text-xs text-slate-400 truncate">{selectedUser.email}</p>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 transition-colors flex-shrink-0">
                                <i className="fas fa-times text-sm"></i>
                            </button>
                        </div>

                        {/* Activity list */}
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {activityLoading ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="w-7 h-7 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                </div>
                            ) : userActivity.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                                        <i className="fas fa-clock-rotate-left text-slate-400 text-lg"></i>
                                    </div>
                                    <p className="text-sm font-bold text-slate-600">No activity yet</p>
                                    <p className="text-xs text-slate-400 mt-1">Actions will appear here as {selectedUser.name} uses the app</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">{userActivity.length} actions recorded</p>
                                    {userActivity.map(entry => {
                                        const ts = entry.timestamp || entry.createdAt;
                                        const date = ts ? new Date(ts) : null;
                                        return (
                                            <div key={entry._id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full flex-shrink-0 mt-0.5 ${ACTION_COLOR[entry.action] || 'bg-slate-100 text-slate-600'}`}>
                                                    {entry.action}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-700">
                                                        {(entry as any).summary || entry.resource.toLowerCase()}
                                                    </p>
                                                    {!(entry as any).summary && entry.details && (
                                                        <p className="text-xs text-slate-400 truncate mt-0.5">
                                                            {Object.entries(entry.details).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                                                        </p>
                                                    )}
                                                    {Array.isArray((entry as any).changes) && (entry as any).changes.length > 0 && (
                                                        <p className="text-xs text-slate-400 truncate mt-0.5">
                                                            {(entry as any).changes.map((c: any) => c.field).join(', ')} changed
                                                        </p>
                                                    )}
                                                </div>
                                                {date && (
                                                    <div className="text-right flex-shrink-0">
                                                        <p className="text-[10px] text-slate-400">{date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                                                        <p className="text-[10px] text-slate-400">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* User Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in duration-200 my-auto">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900">
                                {editingUser ? 'Edit User' : 'Add New User'}
                            </h3>
                            <button onClick={() => { setShowModal(false); resetForm(); }} className="text-slate-400">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input
                                    type="text" required
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input
                                    type="email" required
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Password {editingUser && '(leave blank to keep current)'}
                                </label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                <select
                                    className="w-full px-4 py-2 rounded-lg border border-slate-200"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                >
                                    <option value={UserRole.STAFF}>Staff</option>
                                    <option value={UserRole.ADMIN}>Admin</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold"
                            >
                                {editingUser ? 'Update User' : 'Create User'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
