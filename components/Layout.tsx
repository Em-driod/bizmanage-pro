import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import CurrencySelector from './CurrencySelector';
import { apiRequest } from '../services/api';

interface Notification {
  _id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const { notifications, unreadCount } = await apiRequest<{ notifications: Notification[], unreadCount: number }>('/notifications');
      setNotifications(notifications);
      setUnreadCount(unreadCount);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  useEffect(() => {
    fetchNotifications(); // Fetch initially
    const interval = setInterval(fetchNotifications, 30000); // And then every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
      fetchNotifications(); // Re-fetch to update UI
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };
  
  const handleMarkAllAsRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'PUT' });
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification._id);
    if (notification.link) {
      navigate(notification.link);
    }
    setIsNotificationsOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: 'fa-layer-group' },
    { label: 'Clients', path: '/clients', icon: 'fa-address-book' },
    { label: 'Finances', path: '/transactions', icon: 'fa-receipt' },
    { label: 'Personnel', path: '/payroll', icon: 'fa-user-tie' },
    { label: 'Reports', path: '/reports', icon: 'fa-chart-pie' },
    { label: 'Invoices', path: '/invoices', icon: 'fa-file-invoice' },
    { label: 'Entities', path: '/business', icon: 'fa-building' },
  ];

  if (isAdmin) {
    navItems.push({ label: 'Administration', path: '/users', icon: 'fa-fingerprint' });
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex">
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-6 right-6 z-50 bg-slate-900 text-white w-12 h-12 rounded-xl flex items-center justify-center"
      >
        <i className={`fas ${isSidebarOpen ? 'fa-times' : 'fa-bars-staggered'}`}></i>
      </button>

      {/* Side Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-100 transition-transform lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-8">
             <Link to="/" className="flex items-center gap-2">
                <div className="w-7 h-7 bg-slate-900 rounded flex items-center justify-center">
                  <div className="w-2.5 h-2.5 bg-white rotate-45"></div>
                </div>
                <span className="text-sm font-[800] tracking-tighter text-slate-900">BIZMANAGE</span>
             </Link>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            <p className="px-4 pb-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Organization</p>
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${location.pathname === item.path 
                    ? 'bg-indigo-50 text-indigo-700 font-bold' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}
                `}
              >
                <i className={`fas ${item.icon} w-4 text-[13px]`}></i>
                <span className="text-sm tracking-tight">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-6">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                    {user?.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-[9px] font-extrabold text-slate-400 uppercase truncate">{user?.role}</p>
                  </div>
               </div>
               <button 
                 onClick={handleLogout}
                 className="w-full py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
               >
                 LOGOUT
               </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="px-10 py-6 flex items-center justify-between border-b border-slate-50 bg-white/50 backdrop-blur-sm sticky top-0 z-30">
           <div>
             <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
               {navItems.find(i => i.path === location.pathname)?.label || 'Overview'}
             </h2>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Session: {user?.businessId}</p>
           </div>
           
           <div className="flex items-center gap-4">
             <CurrencySelector />
             <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
               <span className="text-[10px] font-bold uppercase tracking-wider">Live System</span>
             </div>
            <div className="relative" ref={notificationRef}>
              <button onClick={() => setIsNotificationsOpen(prev => !prev)} className="w-10 h-10 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all relative">
                <i className="far fa-bell text-sm"></i>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {isNotificationsOpen && (
                <div className="absolute top-12 right-0 w-80 bg-white border border-slate-100 rounded-2xl shadow-lg z-10">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-800">Notifications</h4>
                    <button onClick={handleMarkAllAsRead} className="text-xs text-indigo-600 font-bold hover:underline" disabled={unreadCount === 0}>Mark all as read</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 p-8">No notifications yet.</p>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif._id} onClick={() => handleNotificationClick(notif)} className={`p-4 border-b border-slate-50 cursor-pointer ${notif.isRead ? 'opacity-60' : 'hover:bg-slate-50'}`}>
                          <div className="flex items-start gap-3">
                            {!notif.isRead && <span className="w-2 h-2 mt-1.5 rounded-full bg-indigo-500"></span>}
                            <p className={`text-xs ${notif.isRead ? 'text-slate-400' : 'text-slate-600 font-semibold'}`}>{notif.message}</p>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 ml-5">{new Date(notif.createdAt).toLocaleString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
           </div>
        </header>

        <div className="flex-1 px-10 py-10 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;