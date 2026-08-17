import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { Business } from '../types';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import type { Product } from './Products';

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

const SectionCard: React.FC<{ icon: string; title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }> = ({ icon, title, subtitle, children, action }) => (
  <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 border border-slate-100 text-slate-500 text-xs">
          <i className={`fas ${icon}`}></i>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 tracking-tight">{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const Storefront: React.FC = () => {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [catalogItems, setCatalogItems] = useState<Product[]>([]);

  useEffect(() => {
    apiRequest<Product[]>('/products').then(setCatalogItems).catch(() => {});
  }, []);

  const visibleCatalogItems = catalogItems.filter(p => p.showOnProfile !== false);

  const fetchBusiness = async () => {
    if (!user?.businessId) return;
    setIsLoading(true);
    try {
      const data = await apiRequest<any>(`/businesses/${user.businessId}`);
      setBusiness(data);
      setLoadError(null);
      if (data.profile) {
        setProfile({ ...emptyProfile, ...data.profile, services: data.profile.services || [], coverImage: data.profile.coverImage || '', logoImage: data.profile.logoImage || '', accentColor: data.profile.accentColor || '#6366f1', bankName: data.profile.bankName || '', accountNumber: data.profile.accountNumber || '', accountName: data.profile.accountName || '', bankName2: data.profile.bankName2 || '', accountNumber2: data.profile.accountNumber2 || '', accountName2: data.profile.accountName2 || '' });
      }
      if (data.slug) {
        setShareUrl(`${window.location.origin}/biz/${data.slug}`);
      }
    } catch (err: any) {
      setBusiness(null);
      setLoadError(err?.message || 'Could not load your storefront. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusiness();
  }, [user?.businessId]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const data = await apiRequest<any>(`/businesses/${user?.businessId}/profile`, { method: 'PUT', body: profile });
      if (data.slug) {
        setShareUrl(`${window.location.origin}/biz/${data.slug}`);
      }
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) { alert(err.message); }
    finally { setProfileSaving(false); }
  };

  useEffect(() => {
    if (!shareUrl) { setQrDataUrl(''); return; }
    QRCode.toDataURL(shareUrl, { width: 240, margin: 1, color: { dark: profile.accentColor || '#0f172a', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [shareUrl, profile.accentColor]);

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

  const initials = business?.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 animate-pulse">
          <i className="fas fa-store text-white text-lg"></i>
        </div>
        <p className="text-sm font-bold text-slate-400">Loading your storefront...</p>
      </div>
    </div>
  );

  if (loadError || !business) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
          <i className="fas fa-triangle-exclamation text-rose-500 text-lg"></i>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-700">Couldn't load your storefront</p>
          <p className="text-xs text-slate-400 mt-1">{loadError || 'Something went wrong.'}</p>
        </div>
        <button onClick={fetchBusiness}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all">
          <i className="fas fa-rotate-right mr-1.5"></i>Try Again
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-24 lg:pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">

      {/* Page header */}
      <div className="flex items-center justify-between gap-4 mb-7">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Storefront</p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">Public Profile</h1>
        </div>
        <Link to="/business" className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1.5">
          <i className="fas fa-building text-[10px]"></i> Business Info
        </Link>
      </div>

      <form onSubmit={handleProfileSave} className="space-y-5 max-w-3xl">

        {/* Published toggle */}
        <div className="rounded-2xl p-5 border bg-white border-slate-200/70">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${profile.isPublic ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
              <div>
                <p className="font-bold text-sm text-slate-900">
                  {profile.isPublic ? 'Profile is live' : 'Make profile public'}
                </p>
                <p className="text-xs mt-0.5 text-slate-400">
                  {profile.isPublic ? 'Anyone with the link can discover your business' : 'Anyone with the link can view your profile — no login needed'}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setProfile(p => ({ ...p, isPublic: !p.isPublic }))}
              className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${profile.isPublic ? 'bg-slate-900' : 'bg-slate-200'}`}>
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${profile.isPublic ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          {profile.isPublic && shareUrl && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <i className="fas fa-link text-slate-300 text-xs shrink-0" />
                  <span className="text-xs text-slate-600 flex-1 truncate font-mono">{shareUrl}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button type="button" onClick={copyShareUrl}
                    className="flex-1 sm:flex-none text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-all border border-slate-200 text-center">
                    {copied ? '✓ Copied' : 'Copy Link'}
                  </button>
                  <a href={shareUrl} target="_blank" rel="noreferrer"
                    className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-100 rounded-lg transition-all border border-slate-200 flex-shrink-0">
                    <i className="fas fa-external-link-alt text-slate-500 text-[10px]"></i>
                  </a>
                </div>
              </div>
              {qrDataUrl && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-4">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <img src={qrDataUrl} alt="QR code for public profile" className="w-24 h-24 rounded-lg bg-white p-1.5 border border-slate-100" />
                      <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg overflow-hidden border-2 border-white shadow-sm bg-slate-200 flex items-center justify-center"
                        style={{ background: profile.logoImage ? undefined : profile.accentColor }}>
                        {profile.logoImage
                          ? <img src={profile.logoImage} alt="logo" className="w-full h-full object-cover" />
                          : <span className="text-white text-[10px] font-black">{initials[0]}</span>}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{business?.name || 'Your Business'}</p>
                      {profile.tagline && <p className="text-[11px] text-slate-400 truncate mt-0.5">{profile.tagline}</p>}
                      <p className="text-[10px] text-slate-400 mt-1">
                        {(visibleCatalogItems.length + profile.services.length) > 0
                          ? `${visibleCatalogItems.length + profile.services.length} item${(visibleCatalogItems.length + profile.services.length) !== 1 ? 's' : ''} showing`
                          : 'Add items in Catalog to fill out the page'}
                      </p>
                      <a href={qrDataUrl} download={`${(business?.name || 'business').replace(/\s+/g, '-').toLowerCase()}-qr-code.png`}
                        className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-all border border-slate-200">
                        <i className="fas fa-download text-[10px]"></i> Download QR
                      </a>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-200 leading-relaxed">
                    <i className="fas fa-circle-info mr-1"></i>
                    This code never changes — the page it opens updates instantly the moment you save changes here, so you only ever need to print or share it once.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Brand builder card */}
        <div className="rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden bg-white">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 border border-slate-100 text-slate-500 text-xs">
              <i className="fas fa-palette"></i>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 tracking-tight">Brand Identity</p>
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
        <SectionCard icon="fa-pen-nib" title="Profile Info" subtitle="Tagline, description & location">
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
        <SectionCard icon="fa-address-book" title="Contact Details" subtitle="How customers reach you">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'WhatsApp Number', key: 'whatsapp', icon: 'fa-whatsapp fab', placeholder: 'e.g. 2348012345678', type: 'tel' },
              { label: 'Email', key: 'email', icon: 'fa-envelope', placeholder: 'hello@yourbusiness.com', type: 'email' },
              { label: 'Website', key: 'website', icon: 'fa-globe', placeholder: 'yourwebsite.com', type: 'text' },
              { label: 'Instagram', key: 'instagram', icon: 'fa-instagram fab', placeholder: '@yourhandle', type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label className={labelCls}>
                  <i className={`${f.icon.includes('fab') ? 'fab' : 'fas'} ${f.icon.replace(' fab', '')} mr-1.5 text-slate-400`}></i>
                  {f.label}
                </label>
                <input className={inputCls} type={f.type} placeholder={f.placeholder}
                  value={(profile as any)[f.key]} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Bank Details */}
        <SectionCard icon="fa-university" title="Payment Details" subtitle="Bank accounts shown on invoices">
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

        {/* Catalog preview — read-only, sourced live from Catalog so it can't go stale */}
        <SectionCard
          icon="fa-box-open" title="From Your Catalog"
          subtitle={`${visibleCatalogItems.length} item${visibleCatalogItems.length !== 1 ? 's' : ''} · shown on your public page automatically`}
          action={
            <Link to="/products"
              className="flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-800 px-3 py-2 rounded-xl transition-all">
              Edit in Catalog <i className="fas fa-arrow-right text-[10px]" />
            </Link>
          }>
          {visibleCatalogItems.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-box-open text-2xl text-slate-200"></i>
              </div>
              <p className="text-slate-400 text-sm font-semibold">No catalog items yet</p>
              <Link to="/products" className="inline-block mt-3 text-xs font-black text-indigo-600 hover:text-indigo-800">
                Add your first product in Catalog →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleCatalogItems.map(p => (
                <div key={p._id} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <i className="fas fa-box text-slate-200"></i>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                    <p className="text-xs text-indigo-600 font-black">{formatCurrency(p.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Services */}
        <SectionCard
          icon="fa-layer-group" title="Additional Items (optional)"
          subtitle={`${profile.services.length} item${profile.services.length !== 1 ? 's' : ''} listed`}
          action={
            <button type="button" onClick={addService}
              className="flex items-center gap-1.5 text-xs font-black text-white bg-slate-900 hover:bg-slate-800 px-3 py-2 rounded-xl transition-all">
              <i className="fas fa-plus text-[10px]" /> Add Item
            </button>
          }>
          <div className="flex items-start gap-3 px-4 py-3 mb-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <i className="fas fa-circle-info text-indigo-400 text-sm mt-0.5 flex-shrink-0"></i>
            <p className="text-xs text-indigo-700 leading-relaxed">
              Products from your <Link to="/products" className="font-black underline hover:text-indigo-900">Catalog</Link> already
              show up on your public page automatically — no need to re-add them here. Only use this list for something extra
              that isn't in your Catalog.
            </p>
          </div>
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
                className="flex items-center gap-2 px-6 h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60">
                {profileSaving
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                  : <><i className="fas fa-cloud-arrow-up text-xs"></i> Save Profile</>
                }
              </button>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
};

export default Storefront;
