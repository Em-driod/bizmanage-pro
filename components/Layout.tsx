import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CurrencySelector from './CurrencySelector';
import { apiRequest } from '../services/api';
import { usePrint } from '../context/PrintContext';
import ReceiptPrint from './ReceiptPrint';
import BrandMark from './BrandMark';
import { useBranding } from '../context/BrandingContext';
import SearchModal from './SearchModal';

// Lazy: pulls in the heavy html5-qrcode camera library, only needed once someone opens the scanner.
const QrScannerModal = lazy(() => import('./QrScannerModal'));

interface Notification {
  _id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

type NavItem = { label: string; path: string; icon: string };

// Always visible — the pages people open every day.
const PRIMARY_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'fa-layer-group' },
  { label: 'Invoices', path: '/invoices', icon: 'fa-file-invoice' },
  { label: 'Receipts', path: '/receipts', icon: 'fa-money-check-dollar' },
  { label: 'Transactions', path: '/transactions', icon: 'fa-receipt' },
  { label: 'Clients', path: '/clients', icon: 'fa-address-book' },
];

// Everything else folds away; only the group you're working in opens itself.
const NAV_GROUPS: { label: string; icon: string; items: NavItem[] }[] = [
  {
    label: 'Sell',
    icon: 'fa-store',
    items: [
      { label: 'Orders', path: '/orders', icon: 'fa-bag-shopping' },
      { label: 'Catalog', path: '/products', icon: 'fa-box-open' },
      { label: 'Storefront', path: '/storefront', icon: 'fa-store' },
      { label: 'Proposals', path: '/proposals', icon: 'fa-file-signature' },
      { label: 'Profit', path: '/profit', icon: 'fa-sack-dollar' },
    ],
  },
  {
    label: 'Finance',
    icon: 'fa-chart-pie',
    items: [
      { label: 'Reports', path: '/reports', icon: 'fa-chart-pie' },
      { label: 'Budgets', path: '/budgets', icon: 'fa-wallet' },
      { label: 'Payroll', path: '/payroll', icon: 'fa-user-tie' },
      { label: 'Tax', path: '/tax', icon: 'fa-landmark' },
    ],
  },
  {
    label: 'More',
    icon: 'fa-ellipsis',
    items: [
      { label: 'Projects', path: '/projects', icon: 'fa-diagram-project' },
      { label: 'Assets', path: '/capital-assets', icon: 'fa-box-archive' },
      { label: 'Automation', path: '/automation', icon: 'fa-robot' },
      { label: 'Scanned Docs', path: '/scanned-transactions', icon: 'fa-scanner' },
    ],
  },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Team', path: '/users', icon: 'fa-fingerprint' },
  { label: 'Activity Log', path: '/activity', icon: 'fa-history' },
];

const OPEN_GROUPS_KEY = 'morniy.sidebar.open';
const readOpenGroups = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(OPEN_GROUPS_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

const BOTTOM_NAV = [
  { label: 'Home', path: '/dashboard', icon: 'fa-layer-group' },
  { label: 'Clients', path: '/clients', icon: 'fa-address-book' },
  { label: 'Invoices', path: '/invoices', icon: 'fa-file-invoice' },
  { label: 'Receipts', path: '/receipts', icon: 'fa-money-check-dollar' },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const { branding, loaded } = useBranding();
  const { printData } = usePrint();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(readOpenGroups);
  const [showFab, setShowFab] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const storefrontUrl = branding.slug ? `${window.location.origin}/biz/${branding.slug}` : null;
  const storefrontLive = !!(branding.isPublic && storefrontUrl);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const fetchNotifications = async () => {
    try {
      const { notifications, unreadCount } = await apiRequest<{ notifications: Notification[], unreadCount: number }>('/notifications');
      setNotifications(notifications);
      setUnreadCount(unreadCount);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // The group holding the current page is always open.
  const groupsWithAdmin = isAdmin
    ? NAV_GROUPS.map(g => (g.label === 'More' ? { ...g, items: [...g.items, ...ADMIN_NAV] } : g))
    : NAV_GROUPS;
  const activeGroup = groupsWithAdmin.find(g => g.items.some(i => i.path === location.pathname))?.label;

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => {
      const next = prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label];
      try { localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };

  const handleMarkAsRead = async (id: string) => {
    try { await apiRequest(`/notifications/${id}/read`, { method: 'PUT' }); fetchNotifications(); } catch {}
  };
  const handleMarkAllAsRead = async () => {
    try { await apiRequest('/notifications/read-all', { method: 'PUT' }); fetchNotifications(); } catch {}
  };
  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification._id);
    if (notification.link) navigate(notification.link);
    setIsNotificationsOpen(false);
  };
  const handleDeleteNotification = async (id: string) => {
    try { await apiRequest(`/notifications/${id}`, { method: 'DELETE' }); fetchNotifications(); } catch {}
  };
  const handleLogout = () => { logout(); navigate('/'); };

  const allNavItems = [...PRIMARY_NAV, ...groupsWithAdmin.flatMap(g => g.items)];
  const currentLabel =
    allNavItems.find(i => i.path === location.pathname)?.label ||
    (location.pathname === '/business' ? 'Settings' : 'Dashboard');

  const navLinkCls = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
      active ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
    }`;

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex">
      {/* Sidebar overlay */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* FAB overlay */}
      {showFab && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setShowFab(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 bottom-16 lg:bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-100 transition-transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <style>{`
          .sidebar-nav::-webkit-scrollbar { width: 4px; }
          .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
          .sidebar-nav::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
        `}</style>
        <div className="flex flex-col h-full">
          {/* Business brand — the user's own logo and name, linking to settings */}
          <div className="px-4 py-4 flex-shrink-0 border-b border-slate-50">
            <Link to="/business" className="flex items-center gap-3 min-w-0 group" title="Business settings">
              <BrandMark name={branding.name} logo={branding.logoImage} color={branding.accentColor} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-900 truncate leading-tight group-hover:text-indigo-600 transition-colors">
                  {branding.name}
                </p>
                {loaded && !branding.logoImage && isAdmin ? (
                  <p className="text-[10px] font-bold text-indigo-500 mt-0.5">
                    <i className="fas fa-image mr-1"></i>Add your logo
                  </p>
                ) : (
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">on Morniy</p>
                )}
              </div>
            </Link>
          </div>

          {/* Nav */}
          <div className="flex-1 overflow-y-auto min-h-0 sidebar-nav">
            <nav className="px-3 py-3">
              <div className="space-y-0.5">
                {PRIMARY_NAV.map(item => (
                  <Link key={item.path} to={item.path} onClick={() => setIsSidebarOpen(false)} className={navLinkCls(location.pathname === item.path)}>
                    <i className={`fas ${item.icon} w-4 text-[13px] flex-shrink-0`}></i>
                    <span className="text-sm tracking-tight">{item.label}</span>
                  </Link>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 space-y-0.5">
                {groupsWithAdmin.map(group => {
                  const isActive = activeGroup === group.label;
                  const isOpen = isActive || openGroups.includes(group.label);
                  return (
                    <div key={group.label}>
                      <button
                        onClick={() => toggleGroup(group.label)}
                        disabled={isActive}
                        aria-expanded={isOpen}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                          isActive ? 'text-slate-900 cursor-default' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <i className={`fas ${group.icon} w-4 text-[13px] flex-shrink-0`}></i>
                        <span className="text-sm tracking-tight flex-1 text-left">{group.label}</span>
                        {!isActive && (
                          <i className={`fas fa-chevron-down text-[9px] text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
                        )}
                      </button>

                      {isOpen && (
                        <div className="ml-[1.375rem] pl-3 border-l border-slate-100 my-0.5 space-y-0.5">
                          {group.items.map(item =>
                            item.path === '/storefront' ? (
                              <div key={item.path} className="relative">
                                <Link to={item.path} onClick={() => setIsSidebarOpen(false)} className={`${navLinkCls(location.pathname === item.path)} pr-9`}>
                                  <span className="text-[13px] tracking-tight flex-1">{item.label}</span>
                                  {!storefrontLive && (
                                    <span className="text-[9px] font-black uppercase text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full">Set up</span>
                                  )}
                                </Link>
                                {storefrontLive && (
                                  <a
                                    href={storefrontUrl!}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Open your public page"
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-indigo-50"
                                  >
                                    <i className="fas fa-arrow-up-right-from-square text-[10px]"></i>
                                  </a>
                                )}
                              </div>
                            ) : (
                              <Link key={item.path} to={item.path} onClick={() => setIsSidebarOpen(false)} className={navLinkCls(location.pathname === item.path)}>
                                <span className="text-[13px] tracking-tight">{item.label}</span>
                              </Link>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Account */}
          <div className="flex-shrink-0 border-t border-slate-100 px-3 py-3">
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black flex-shrink-0">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-slate-900 truncate leading-tight">{user?.name}</p>
                <p className="text-[10px] font-semibold text-slate-400 capitalize truncate">{user?.role}</p>
              </div>
              <Link
                to="/business"
                onClick={() => setIsSidebarOpen(false)}
                title="Settings"
                aria-label="Settings"
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                  location.pathname === '/business' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <i className="fas fa-gear text-[13px]"></i>
              </Link>
              <button
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <i className="fas fa-arrow-right-from-bracket text-[13px]"></i>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0 overflow-x-clip">
        <header className="px-4 sm:px-6 lg:px-10 py-4 flex items-center justify-between border-b border-slate-50 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <i className="fas fa-bars text-sm"></i>
            </button>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">{currentLabel}</h2>
              {user?.businessName && (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">{user.businessName}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-9 h-9 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all"
              title="Search (S)"
            >
              <i className="fas fa-magnifying-glass text-sm"></i>
            </button>
            <div className="hidden sm:block"><CurrencySelector /></div>
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setIsNotificationsOpen(prev => !prev)}
                className="w-9 h-9 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all relative"
              >
                <i className="far fa-bell text-sm"></i>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {isNotificationsOpen && (
                <div className="absolute top-11 right-0 w-[calc(100vw-2rem)] sm:w-80 bg-white border border-slate-100 rounded-2xl shadow-xl z-50">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-800">Notifications</h4>
                    <button onClick={handleMarkAllAsRead} className="text-xs text-indigo-600 font-bold hover:underline" disabled={unreadCount === 0}>
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 p-8">No notifications yet.</p>
                    ) : notifications.map(notif => (
                      <div key={notif._id} className={`p-4 border-b border-slate-50 ${notif.isRead ? 'opacity-60' : ''}`}>
                        <div className="flex items-start gap-3">
                          {!notif.isRead && <span className="w-2 h-2 mt-1.5 rounded-full bg-indigo-500 flex-shrink-0"></span>}
                          <p onClick={() => handleNotificationClick(notif)} className={`flex-1 text-xs cursor-pointer ${notif.isRead ? 'text-slate-400' : 'text-slate-600 font-semibold'}`}>
                            {notif.message}
                          </p>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteNotification(notif._id); }} className="text-slate-300 hover:text-rose-500 text-xs ml-1 flex-shrink-0">
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 ml-5">{new Date(notif.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10 max-w-7xl mx-auto w-full pb-24 lg:pb-10">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100">
        <div className="flex items-stretch h-16">
          {BOTTOM_NAV.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                location.pathname === item.path ? 'text-indigo-600' : 'text-slate-400 active:text-slate-700'
              }`}
            >
              <i className={`fas ${item.icon} text-[15px]`}></i>
              <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
            </Link>
          ))}
          {/* More */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors relative ${isSidebarOpen ? 'text-indigo-600' : 'text-indigo-500'}`}
          >
            <span className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${isSidebarOpen ? 'bg-indigo-100' : 'bg-indigo-50'}`}>
              <i className="fas fa-grid-2 text-[16px]"></i>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white"></span>
            </span>
            <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile FAB — quick actions */}
      <div className="lg:hidden fixed bottom-20 right-4 z-50">
        {showFab && (
          <div className="absolute bottom-14 right-0 flex flex-col items-end gap-2 mb-1">
            <button
              onClick={() => { setIsScannerOpen(true); setShowFab(false); }}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-800 text-white rounded-2xl shadow-lg text-sm font-bold whitespace-nowrap"
            >
              <i className="fas fa-qrcode text-xs"></i>
              Scan QR
            </button>
            {[
              { label: 'New Invoice', icon: 'fa-file-invoice', path: '/invoices', color: 'bg-indigo-600' },
              { label: 'Add Transaction', icon: 'fa-receipt', path: '/transactions', color: 'bg-emerald-600' },
              { label: 'New Receipt', icon: 'fa-money-check-dollar', path: '/receipts', color: 'bg-violet-600' },
            ].map(action => (
              <button
                key={action.label}
                onClick={() => { navigate(action.path); setShowFab(false); }}
                className={`flex items-center gap-2.5 px-4 py-2.5 ${action.color} text-white rounded-2xl shadow-lg text-sm font-bold whitespace-nowrap`}
              >
                <i className={`fas ${action.icon} text-xs`}></i>
                {action.label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setShowFab(v => !v)}
          className={`w-13 h-13 w-[52px] h-[52px] rounded-2xl shadow-xl flex items-center justify-center transition-all ${showFab ? 'bg-slate-800 rotate-45' : 'bg-indigo-600'}`}
        >
          <i className="fas fa-plus text-white text-lg"></i>
        </button>
      </div>

      {printData && (
        <ReceiptPrint
          invoice={printData.invoice}
          client={printData.client}
          businessName={branding.name}
        />
      )}
      {isSearchOpen && <SearchModal onClose={() => setIsSearchOpen(false)} />}
      {isScannerOpen && (
        <Suspense fallback={null}>
          <QrScannerModal
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onResult={(text) => {
              setIsScannerOpen(false);
              if (text.startsWith(window.location.origin)) {
                const hashPath = text.split('#')[1];
                if (hashPath) { navigate(hashPath); return; }
              }
              if (/^https?:\/\//i.test(text)) {
                window.open(text, '_blank', 'noreferrer');
              } else {
                navigator.clipboard?.writeText(text).catch(() => {});
                alert(`Scanned: ${text}\n(copied to clipboard)`);
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default Layout;
