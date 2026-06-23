import React, { useState, useEffect } from 'react';
import { Business } from '../types';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

interface ServiceItem { name: string; description?: string; price?: number; image?: string; }
interface ProfileForm {
  tagline: string; description: string; whatsapp: string;
  email: string; website: string; instagram: string; location: string;
  services: ServiceItem[]; isPublic: boolean;
  coverImage: string; logoImage: string; accentColor: string;
  bankName: string; accountNumber: string; accountName: string;
  bankName2: string; accountNumber2: string; accountName2: string;
}

const emptyProfile: ProfileForm = {
  tagline: '', description: '', whatsapp: '', email: '',
  website: '', instagram: '', location: '', services: [], isPublic: false,
  coverImage: '', logoImage: '', accentColor: '#6366f1',
  bankName: '', accountNumber: '', accountName: '',
  bankName2: '', accountNumber2: '', accountName2: '',
};

const ACCENT_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#000000'];

const toBase64 = (file: File): Promise<string> => new Promise((res, rej) => {
  const reader = new FileReader();
  reader.onload = () => res(reader.result as string);
  reader.onerror = rej;
  reader.readAsDataURL(file);
});

const inputCls = 'w-full h-11 px-4 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 outline-none transition-all text-sm placeholder:text-slate-300';
const labelCls = 'block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5';

const SectionCard: React.FC<{ icon: string; title: string; subtitle?: string; accent?: string; children: React.ReactNode; action?: React.ReactNode }> = ({ icon, title, subtitle, accent = '#6366f1', children, action }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs" style={{ background: accent }}>
          <i className={`fas ${icon}`}></i>
        </div>
        <div>
          <p className="text-sm font-black text-slate-800">{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const BusinessPage: React.FC = () => {
  const { user } = useAuth();
  const { availableCurrencies } = useCurrency();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'profile'>('info');
  const [formData, setFormData] = useState({ name: '', address: '', email: '', phone: '', currency: '' });
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!user?.businessId) return;
      try {
        const data = await apiRequest<any>(`/businesses/${user.businessId}`);
        setBusiness(data);
        setFormData({ name: data.name, address: data.address || '', email: data.email || '', phone: data.phone || '', currency: data.currency });
        if (data.profile) {
          setProfile({ ...emptyProfile, ...data.profile, services: data.profile.services || [], coverImage: data.profile.coverImage || '', logoImage: data.profile.logoImage || '', accentColor: data.profile.accentColor || '#6366f1', bankName: data.profile.bankName || '', accountNumber: data.profile.accountNumber || '', accountName: data.profile.accountName || '', bankName2: data.profile.bankName2 || '', accountNumber2: data.profile.accountNumber2 || '', accountName2: data.profile.accountName2 || '' });
        }
        if (data.slug) {
          const base = window.location.origin + window.location.pathname;
          setShareUrl(`${base}#/biz/${data.slug}`);
        }
      } catch {
        setBusiness({ _id: user.businessId, name: 'Sample Business', address: '', email: '', phone: '', currency: 'USD' } as any);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBusiness();
  }, [user?.businessId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest(`/businesses/${user?.businessId}`, { method: 'PUT', body: formData });
      setBusiness({ ...business!, ...formData });
      setIsEditing(false);
    } catch (err: any) { alert(err.message); }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const data = await apiRequest<any>(`/businesses/${user?.businessId}/profile`, { method: 'PUT', body: profile });
      if (data.slug) {
        const base = window.location.origin + window.location.pathname;
        setShareUrl(`${base}#/biz/${data.slug}`);
      }
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) { alert(err.message); }
    finally { setProfileSaving(false); }
  };

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addService = () => setProfile(p => ({ ...p, services: [...p.services, { name: '', description: '', price: undefined, image: '' }] }));
  const removeService = (i: number) => setProfile(p => ({ ...p, services: p.services.filter((_, idx) => idx !== i) }));
  const updateService = (i: number, field: keyof ServiceItem, value: any) =>
    setProfile(p => ({ ...p, services: p.services.map((s, idx) => idx === i ? { ...s, [field]: value } : s) }));
  const moveService = (i: number, dir: -1 | 1) => setProfile((p: ProfileForm) => {
    const s = [...p.services];
    const j = i + dir;
    if (j < 0 || j >= s.length) return p;
    [s[i], s[j]] = [s[j], s[i]];
    return { ...p, services: s };
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 animate-pulse">
          <i className="fas fa-briefcase text-white text-lg"></i>
        </div>
        <p className="text-sm font-bold text-slate-400">Loading your workspace...</p>
      </div>
    </div>
  );

  const initials = business?.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';

  return (
    <div className="min-h-screen pb-24 lg:pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">

      {/* ── Page Hero ── */}
      <div className="relative overflow-hidden rounded-3xl mb-8 bg-[#0c0c1d]" style={{ minHeight: 200 }}>
        {/* Background orbs */}
        <div className="absolute top-[-60px] left-[-60px] w-72 h-72 rounded-full blur-[100px] opacity-50 bg-indigo-600 pointer-events-none" />
        <div className="absolute bottom-[-40px] right-[10%] w-56 h-56 rounded-full blur-[80px] opacity-30 bg-violet-500 pointer-events-none" />
        <div className="absolute top-[20%] right-[-20px] w-40 h-40 rounded-full blur-[60px] opacity-20 bg-blue-400 pointer-events-none" />

        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />

        <div className="relative z-10 px-5 sm:px-10 py-7 flex flex-row items-center gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-900/60 border border-white/10" style={{ width: 56, height: 56 }}>
              <span className="text-white font-black text-xl tracking-tight">{initials}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#0c0c1d]"></div>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300/50">Workspace</span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight truncate">{business?.name || 'Your Business'}</h1>
            <p className="text-xs text-white/35 font-medium truncate">{(business as any)?.email || 'No email set'}</p>
          </div>

          {/* Status pill — compact on mobile */}
          <div className="flex-shrink-0">
            {profile.isPublic
              ? <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[11px] font-black text-emerald-300 hidden sm:inline">Profile Live</span>
                  <span className="text-[11px] font-black text-emerald-300 sm:hidden">Live</span>
                </div>
              : <button onClick={() => setActiveTab('profile')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all">
                  <i className="fas fa-globe text-white/60 text-[11px]"></i>
                  <span className="text-[11px] font-black text-white/60 hidden sm:inline">Set Up Profile</span>
                  <span className="text-[11px] font-black text-white/60 sm:hidden">Profile</span>
                </button>
            }
          </div>
        </div>

        {/* Tab bar inside hero */}
        <div className="relative z-10 px-6 sm:px-10 flex gap-1 pb-0">
          {([
            { key: 'info', label: 'Business Info', icon: 'fa-building' },
            { key: 'profile', label: 'Public Profile', icon: 'fa-globe' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-black rounded-t-xl transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-indigo-600 shadow-lg'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}>
              <i className={`fas ${tab.icon} text-[10px]`}></i>
              {tab.label}
              {tab.key === 'profile' && !profile.isPublic && (
                <span className="px-1.5 py-0.5 bg-amber-400/20 text-amber-300 text-[9px] font-black rounded-full border border-amber-400/20">OFF</span>
              )}
              {tab.key === 'profile' && profile.isPublic && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Business Info ── */}
      {activeTab === 'info' && (
        <div className="space-y-5 max-w-4xl">

          {/* Public profile promo */}
          {!profile.isPublic && (
            <button type="button" onClick={() => setActiveTab('profile')}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-left group transition-all"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)', boxShadow: '0 8px 32px rgba(99,102,241,0.35)' }}>
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 border border-white/10">
                <i className="fas fa-rocket text-white text-sm"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white leading-tight">Launch Your Public Business Page</p>
                <p className="text-xs text-indigo-200/70 mt-0.5 hidden sm:block">Showcase services, logo & social links — share with anyone free</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="px-3 py-1.5 bg-white text-indigo-700 text-xs font-black rounded-xl shadow whitespace-nowrap">Get Started</span>
                <i className="fas fa-arrow-right text-white/50 text-xs group-hover:translate-x-1 transition-transform"></i>
              </div>
            </button>
          )}

          {/* Info card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Card top strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500"></div>

            <div className="p-6">
              {!isEditing ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Business Details</p>
                    <button onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-black transition-all">
                      <i className="fas fa-pen text-[10px]"></i> Edit
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: 'Business Name', val: business?.name, icon: 'fa-id-card', color: '#6366f1' },
                      { label: 'Email Address', val: (business as any)?.email, icon: 'fa-envelope', color: '#8b5cf6' },
                      { label: 'Phone Number', val: (business as any)?.phone, icon: 'fa-phone', color: '#ec4899' },
                      { label: 'Address', val: (business as any)?.address, icon: 'fa-location-dot', color: '#f59e0b' },
                      { label: 'Currency', val: business?.currency || 'USD', icon: 'fa-coins', color: '#10b981' },
                    ].map((f, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100/70 transition-colors group">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs transition-transform group-hover:scale-110"
                          style={{ background: f.color }}>
                          <i className={`fas ${f.icon}`}></i>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{f.label}</p>
                          <p className="font-bold text-slate-800 truncate mt-0.5">{f.val || <span className="text-slate-300 font-medium">Not set</span>}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <form onSubmit={handleUpdate} className="space-y-5 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Edit Business Details</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: 'Business Name', key: 'name', icon: 'fa-id-card' },
                      { label: 'Email Address', key: 'email', icon: 'fa-envelope' },
                      { label: 'Phone Number', key: 'phone', icon: 'fa-phone' },
                      { label: 'Address', key: 'address', icon: 'fa-location-dot' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className={labelCls}><i className={`fas ${f.icon} mr-1.5 text-indigo-400`}></i>{f.label}</label>
                        <input className={inputCls} value={(formData as any)[f.key]}
                          onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} />
                      </div>
                    ))}
                    <div>
                      <label className={labelCls}><i className="fas fa-coins mr-1.5 text-indigo-400"></i>Currency</label>
                      <select className={inputCls} value={formData.currency}
                        onChange={e => setFormData({ ...formData, currency: e.target.value })}>
                        {availableCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-slate-50">
                    <button type="button" onClick={() => setIsEditing(false)}
                      className="flex-1 h-11 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 text-sm transition-all">
                      Cancel
                    </button>
                    <button type="submit"
                      className="flex-1 h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-200 transition-all">
                      Save Changes
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: 'Currency', val: business?.currency || 'USD', icon: 'fa-coins', bg: 'from-emerald-500 to-teal-500' },
              { label: 'Profile', val: profile.isPublic ? 'Live' : 'Hidden', icon: 'fa-globe', bg: profile.isPublic ? 'from-emerald-500 to-green-500' : 'from-slate-400 to-slate-500' },
              { label: 'Services', val: `${profile.services.length}`, icon: 'fa-layer-group', bg: 'from-indigo-500 to-violet-500' },
            ].map((s, i) => (
              <div key={i} className="relative overflow-hidden rounded-xl sm:rounded-2xl p-3 sm:p-4 text-white">
                <div className={`absolute inset-0 bg-gradient-to-br ${s.bg}`}></div>
                <div className="absolute -bottom-3 -right-3 w-12 h-12 rounded-full bg-white/10"></div>
                <div className="relative z-10">
                  <i className={`fas ${s.icon} text-white/60 text-xs mb-1.5 block`}></i>
                  <p className="text-base sm:text-lg font-black leading-none">{s.val}</p>
                  <p className="text-[9px] sm:text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Public Profile ── */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSave} className="space-y-5 max-w-3xl">

          {/* Published toggle */}
          <div className={`relative overflow-hidden rounded-2xl p-5 transition-all ${profile.isPublic ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-white border border-slate-100 shadow-sm'}`}>
            {profile.isPublic && (
              <>
                <div className="absolute top-[-30px] right-[-30px] w-40 h-40 rounded-full bg-white/10 pointer-events-none"></div>
                <div className="absolute bottom-[-20px] left-[30%] w-24 h-24 rounded-full bg-white/5 pointer-events-none"></div>
              </>
            )}
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <p className={`font-black text-sm ${profile.isPublic ? 'text-white' : 'text-slate-800'}`}>
                  {profile.isPublic ? '🟢 Profile is Live' : 'Make Profile Public'}
                </p>
                <p className={`text-xs mt-0.5 ${profile.isPublic ? 'text-emerald-100/80' : 'text-slate-400'}`}>
                  {profile.isPublic ? 'Anyone with the link can discover your business' : 'Anyone with the link can view your profile — no login needed'}
                </p>
              </div>
              <button type="button" onClick={() => setProfile(p => ({ ...p, isPublic: !p.isPublic }))}
                className={`relative w-14 h-7 rounded-full flex-shrink-0 transition-colors ${profile.isPublic ? 'bg-white/30 border border-white/20' : 'bg-slate-200'}`}>
                <span className={`absolute top-1 left-1 w-5 h-5 rounded-full shadow-md transition-transform ${profile.isPublic ? 'translate-x-7 bg-white' : 'bg-white'}`} />
              </button>
            </div>
            {profile.isPublic && shareUrl && (
              <div className="relative z-10 mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white/15 border border-white/20 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <i className="fas fa-link text-white/60 text-xs shrink-0" />
                  <span className="text-xs text-white/90 flex-1 truncate font-mono">{shareUrl}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button type="button" onClick={copyShareUrl}
                    className="flex-1 sm:flex-none text-xs font-black text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-all border border-white/10 text-center">
                    {copied ? '✓ Copied' : 'Copy Link'}
                  </button>
                  <a href={shareUrl} target="_blank" rel="noreferrer"
                    className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-lg transition-all border border-white/10 flex-shrink-0">
                    <i className="fas fa-external-link-alt text-white text-[10px]"></i>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Brand builder card */}
          <div className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden bg-white">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-50">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs">
                <i className="fas fa-palette"></i>
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">Brand Identity</p>
                <p className="text-xs text-slate-400">Cover photo, logo & brand colour</p>
              </div>
            </div>

            {/* Live preview hero */}
            <div className="relative h-52 overflow-hidden bg-[#0a0a0a]">
              {profile.coverImage ? (
                <img src={profile.coverImage} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <>
                  <div className="absolute top-[-40%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[80px] opacity-50 transition-all duration-500" style={{ background: profile.accentColor }} />
                  <div className="absolute bottom-[-30%] right-[-5%] w-[250px] h-[250px] rounded-full blur-[60px] opacity-25" style={{ background: profile.accentColor }} />
                  <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.03) 39px,rgba(255,255,255,0.03) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,0.03) 39px,rgba(255,255,255,0.03) 40px)' }} />
                </>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-white font-black text-xl tracking-tight leading-none">{business?.name || 'Your Business'}</p>
                {profile.tagline && <p className="text-sm font-medium mt-1 truncate" style={{ color: `${profile.accentColor}ee` }}>{profile.tagline}</p>}
              </div>
              {/* Buttons */}
              <label className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer transition-all border border-white/10">
                <i className="fas fa-camera text-[10px]" />
                {profile.coverImage ? 'Change' : 'Add Cover'}
                <input type="file" accept="image/*" className="hidden" onChange={async e => {
                  const f = e.target.files?.[0]; if (!f) return;
                  setProfile(p => ({ ...p, coverImage: '' }));
                  const b64 = await toBase64(f);
                  setProfile(p => ({ ...p, coverImage: b64 }));
                }} />
              </label>
              {profile.coverImage && (
                <button type="button" onClick={() => setProfile(p => ({ ...p, coverImage: '' }))}
                  className="absolute top-3 left-3 w-7 h-7 bg-black/50 hover:bg-red-500/80 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all border border-white/10">
                  <i className="fas fa-times text-xs" />
                </button>
              )}
            </div>

            {/* Logo + colours */}
            <div className="bg-[#0a0a0a] px-6 pb-6 flex items-end gap-5">
              <div className="relative shrink-0 -mt-10">
                <div className="w-20 h-20 rounded-2xl border-4 border-[#0a0a0a] shadow-2xl overflow-hidden"
                  style={{ background: profile.logoImage ? undefined : `${profile.accentColor}44` }}>
                  {profile.logoImage
                    ? <img src={profile.logoImage} alt="logo" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-white/50 text-2xl font-black">{initials[0]}</div>
                  }
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                  <i className="fas fa-camera text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={async e => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const b64 = await toBase64(f);
                    setProfile(p => ({ ...p, logoImage: b64 }));
                  }} />
                </label>
                {profile.logoImage && (
                  <button type="button" onClick={() => setProfile(p => ({ ...p, logoImage: '' }))}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] shadow-lg">
                    <i className="fas fa-times" />
                  </button>
                )}
              </div>
              <div className="flex-1 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2.5">Brand Colour</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {ACCENT_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setProfile(p => ({ ...p, accentColor: c }))}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${profile.accentColor === c ? 'border-white scale-125 shadow-xl' : 'border-transparent hover:scale-110 hover:border-white/40'}`}
                      style={{ background: c, boxShadow: profile.accentColor === c ? `0 0 16px ${c}99` : undefined }} />
                  ))}
                  <label className="w-8 h-8 rounded-full border-2 border-white/20 cursor-pointer overflow-hidden hover:scale-110 transition-transform">
                    <input type="color" value={profile.accentColor}
                      onChange={e => setProfile(p => ({ ...p, accentColor: e.target.value }))}
                      className="w-full h-full cursor-pointer p-0 border-0" title="Custom colour" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Basic info */}
          <SectionCard icon="fa-pen-nib" title="Profile Info" subtitle="Tagline, description & location" accent="#6366f1">
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Tagline <span className="text-slate-300 normal-case font-normal tracking-normal">— one punchy line</span></label>
                <input className={inputCls} placeholder='e.g. "We make the best jollof in Lagos"'
                  value={profile.tagline} onChange={e => setProfile(p => ({ ...p, tagline: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>About / Description</label>
                <textarea rows={3} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 outline-none resize-none transition-all placeholder:text-slate-300"
                  placeholder="What you do, how long you've been running, what makes you different..."
                  value={profile.description} onChange={e => setProfile(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Location</label>
                <input className={inputCls} placeholder="e.g. Lagos, Nigeria"
                  value={profile.location} onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} />
              </div>
            </div>
          </SectionCard>

          {/* Contact */}
          <SectionCard icon="fa-address-book" title="Contact Details" subtitle="How customers reach you" accent="#8b5cf6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'WhatsApp Number', key: 'whatsapp', icon: 'fa-whatsapp fab', placeholder: 'e.g. 2348012345678', type: 'tel' },
                { label: 'Email', key: 'email', icon: 'fa-envelope', placeholder: 'hello@yourbusiness.com', type: 'email' },
                { label: 'Website', key: 'website', icon: 'fa-globe', placeholder: 'yourwebsite.com', type: 'text' },
                { label: 'Instagram', key: 'instagram', icon: 'fa-instagram fab', placeholder: '@yourhandle', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label className={labelCls}>
                    <i className={`${f.icon.includes('fab') ? 'fab' : 'fas'} ${f.icon.replace(' fab', '')} mr-1.5 text-violet-400`}></i>
                    {f.label}
                  </label>
                  <input className={inputCls} type={f.type} placeholder={f.placeholder}
                    value={(profile as any)[f.key]} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Bank Details */}
          <SectionCard icon="fa-university" title="Payment Details" subtitle="Bank accounts shown on invoices" accent="#10b981">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Primary Account</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Bank Name</label>
                    <input className={inputCls} type="text" placeholder="e.g. GTBank" value={profile.bankName} onChange={e => setProfile(p => ({ ...p, bankName: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Account Number</label>
                    <input className={inputCls} type="text" placeholder="0123456789" value={profile.accountNumber} onChange={e => setProfile(p => ({ ...p, accountNumber: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Account Name</label>
                    <input className={inputCls} type="text" placeholder="Your Business Name" value={profile.accountName} onChange={e => setProfile(p => ({ ...p, accountName: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Secondary Account (Optional)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Bank Name</label>
                    <input className={inputCls} type="text" placeholder="e.g. Access Bank" value={profile.bankName2} onChange={e => setProfile(p => ({ ...p, bankName2: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Account Number</label>
                    <input className={inputCls} type="text" placeholder="0123456789" value={profile.accountNumber2} onChange={e => setProfile(p => ({ ...p, accountNumber2: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Account Name</label>
                    <input className={inputCls} type="text" placeholder="Your Business Name" value={profile.accountName2} onChange={e => setProfile(p => ({ ...p, accountName2: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Services */}
          <SectionCard
            icon="fa-layer-group" title="Services / Products"
            subtitle={`${profile.services.length} item${profile.services.length !== 1 ? 's' : ''} listed`}
            accent="#ec4899"
            action={
              <button type="button" onClick={addService}
                className="flex items-center gap-1.5 text-xs font-black text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 px-3 py-2 rounded-xl transition-all shadow-sm">
                <i className="fas fa-plus text-[10px]" /> Add Item
              </button>
            }>
            {profile.services.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-layer-group text-2xl text-slate-200"></i>
                </div>
                <p className="text-slate-400 text-sm font-semibold">No items yet</p>
                <p className="text-slate-300 text-xs mt-1">Add what you sell or offer to showcase on your profile</p>
                <button type="button" onClick={addService}
                  className="mt-4 px-5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-black rounded-xl transition-all">
                  <i className="fas fa-plus mr-1.5 text-[10px]"></i>Add First Item
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {profile.services.map((svc, i) => (
                  <div key={i} className="bg-slate-50 hover:bg-slate-100/70 rounded-2xl p-4 space-y-3 border border-slate-100 transition-colors">
                    {/* Top row: image + name/price + controls */}
                    <div className="flex items-start gap-3">
                      {/* Image */}
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 border border-slate-200 shadow-sm">
                          {svc.image
                            ? <img src={svc.image} alt={svc.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-slate-300 text-xl"><i className="fas fa-image" /></div>
                          }
                        </div>
                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                          <i className="fas fa-camera text-white text-xs" />
                          <input type="file" accept="image/*" className="hidden" onChange={async e => {
                            const f = e.target.files?.[0]; if (!f) return;
                            const b64 = await toBase64(f);
                            updateService(i, 'image', b64);
                          }} />
                        </label>
                      </div>

                      {/* Name + price stack on mobile, side by side on sm+ */}
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <div className="flex-1 min-w-0">
                          <label className={labelCls}>Name</label>
                          <input className={inputCls} placeholder='e.g. "Logo Design"'
                            value={svc.name} onChange={e => updateService(i, 'name', e.target.value)} />
                        </div>
                        <div className="w-full sm:w-24 shrink-0">
                          <label className={labelCls}>Price</label>
                          <input className={inputCls} type="number" placeholder="0"
                            value={svc.price ?? ''} onChange={e => updateService(i, 'price', e.target.value === '' ? undefined : Number(e.target.value))} />
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex flex-col gap-1 shrink-0 mt-5">
                        <button type="button" onClick={() => moveService(i, -1)} disabled={i === 0}
                          className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-20">
                          <i className="fas fa-chevron-up text-xs" />
                        </button>
                        <button type="button" onClick={() => moveService(i, 1)} disabled={i === profile.services.length - 1}
                          className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-20">
                          <i className="fas fa-chevron-down text-xs" />
                        </button>
                        <button type="button" onClick={() => removeService(i)}
                          className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                          <i className="fas fa-trash text-xs" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Short Description</label>
                      <input className={inputCls} placeholder='e.g. "Custom logo with 3 revisions, delivered in 3 days"'
                        value={svc.description || ''} onChange={e => updateService(i, 'description', e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Save bar */}
          <div className="sticky bottom-24 lg:bottom-6 z-20">
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-xl border border-slate-200 shadow-xl shadow-slate-200/60 rounded-2xl p-3">
              <div className="flex-1 hidden sm:block">
                <p className="text-xs font-black text-slate-600">Public Profile</p>
                <p className="text-[11px] text-slate-400">
                  {profile.isPublic ? 'Changes will be visible on your live page' : 'Profile is currently hidden from the public'}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-1 sm:flex-none justify-end">
                {profileSaved && (
                  <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-black animate-in fade-in duration-300">
                    <i className="fas fa-check-circle"></i> Saved!
                  </span>
                )}
                <button type="submit" disabled={profileSaving}
                  className="flex items-center gap-2 px-6 h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-200 transition-all disabled:opacity-60">
                  {profileSaving
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                    : <><i className="fas fa-cloud-arrow-up text-xs"></i> Save Profile</>
                  }
                </button>
              </div>
            </div>
          </div>

        </form>
      )}
    </div>
  );
};

export default BusinessPage;
