import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { useNotification } from '../context/NotificationContext';
import { prepareLogo } from '../utils/logo';
import BrandMark from './BrandMark';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#0ea5e9', '#0f172a'];

// Logo + brand colour, with a live preview of where they appear. Saves to the
// same business profile the Storefront uses, so both stay in sync.
const BrandingSettings: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { branding, loaded, update, refresh } = useBranding();
  const { showToast } = useNotification();
  const fileRef = useRef<HTMLInputElement>(null);

  const [logo, setLogo] = useState<string | null>(branding.logoImage);
  const [color, setColor] = useState(branding.accentColor);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Pick up the server values once they arrive (or change elsewhere).
  useEffect(() => {
    setLogo(branding.logoImage);
    setColor(branding.accentColor);
  }, [branding.logoImage, branding.accentColor]);

  const dirty = logo !== branding.logoImage || color !== branding.accentColor;

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setProcessing(true);
    try {
      setLogo(await prepareLogo(file));
    } catch (err: any) {
      showToast(err?.message || 'Could not use that image', 'error');
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async () => {
    if (!user?.businessId) return;
    setSaving(true);
    try {
      await apiRequest(`/businesses/${user.businessId}/profile`, {
        method: 'PUT',
        body: { logoImage: logo || '', accentColor: color },
      });
      update({ logoImage: logo, accentColor: color });
      refresh();
      showToast('Branding saved — it now appears on your invoices and receipts', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Could not save branding', 'error');
    } finally {
      setSaving(false);
    }
  };

  const name = branding.name;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Branding</p>
          <p className="text-sm text-slate-500 mt-1">Your logo and colour on invoices, receipts, emails and the app.</p>
        </div>
        {dirty && isAdmin && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => { setLogo(branding.logoImage); setColor(branding.accentColor); }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50"
            >
              Discard
            </button>
            <button
              onClick={save}
              disabled={saving || processing}
              className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
            >
              {saving ? <><i className="fas fa-spinner fa-spin mr-1.5" />Saving</> : 'Save branding'}
            </button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-0">
        {/* Controls */}
        <div className="p-6 space-y-6 lg:border-r border-slate-100">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Logo</p>
            <div
              onDragOver={(e) => { if (isAdmin) { e.preventDefault(); setDragOver(true); } }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); if (isAdmin) handleFile(e.dataTransfer.files?.[0]); }}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed transition-colors ${
                dragOver ? 'border-indigo-400 bg-indigo-50/60' : 'border-slate-200'
              }`}
            >
              <div className="relative">
                {processing ? (
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <i className="fas fa-spinner fa-spin text-slate-400" />
                  </div>
                ) : (
                  <BrandMark name={name} logo={logo} color={color} size={80} radius={20} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {isAdmin ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                      >
                        <i className="fas fa-upload mr-1.5 text-[10px]" />
                        {logo ? 'Replace' : 'Upload logo'}
                      </button>
                      {logo && (
                        <button
                          onClick={() => setLogo(null)}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 text-xs font-bold"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      PNG, JPG or WebP. Square works best — a transparent PNG looks sharpest. Or drag it here.
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">Only admins can change the logo.</p>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>
            </div>
            {!logo && loaded && (
              <p className="text-[11px] text-slate-400 mt-2">
                Without a logo, your initials are shown on your brand colour.
              </p>
            )}
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Brand colour</p>
            <div className="flex items-center gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => setColor(c)}
                  aria-label={`Use ${c}`}
                  className={`w-8 h-8 rounded-full transition-transform disabled:cursor-not-allowed ${
                    color.toLowerCase() === c ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'hover:scale-110'
                  }`}
                  style={{ background: c }}
                />
              ))}
              <label
                className={`relative w-8 h-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden ${
                  isAdmin ? 'cursor-pointer hover:border-slate-400' : 'cursor-not-allowed'
                }`}
                title="Custom colour"
              >
                <i className="fas fa-eye-dropper text-[10px] text-slate-400" />
                <input
                  type="color"
                  value={color}
                  disabled={!isAdmin}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
              <span className="text-[11px] font-mono text-slate-400 ml-1">{color}</span>
            </div>
          </div>

          <Link to="/storefront" className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:underline">
            <i className="fas fa-building-columns text-[10px]" />
            {branding.hasBankDetails ? 'Bank details on invoices' : 'Add bank details for your invoices'} →
          </Link>
        </div>

        {/* Live preview */}
        <div className="p-6 bg-slate-50/70 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview</p>

          {/* Invoice header */}
          <div className="rounded-xl overflow-hidden bg-white border border-slate-100 shadow-sm">
            <div className="px-4 py-4 flex items-center justify-between gap-3" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
              <div className="flex items-center gap-3 min-w-0">
                <BrandMark name={name} logo={logo} color="rgba(255,255,255,0.2)" size={36} radius={10} />
                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-[2px] text-white/70">Invoice from</p>
                  <p className="text-sm font-black text-white truncate">{name}</p>
                </div>
              </div>
              <span className="text-[10px] font-black text-white bg-white/20 rounded-lg px-2 py-1 shrink-0">INV-0001</span>
            </div>
            <div className="px-4 py-3 space-y-1.5">
              <div className="h-2 rounded bg-slate-100 w-2/3" />
              <div className="h-2 rounded bg-slate-100 w-1/2" />
            </div>
          </div>

          {/* Receipt header */}
          <div className="rounded-xl overflow-hidden bg-[#0f172a] shadow-sm">
            <div className="px-4 py-4 flex items-center gap-3">
              <BrandMark name={name} logo={logo} color={color} size={36} radius={10} />
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[2px] text-slate-500">Official receipt</p>
                <p className="text-sm font-black text-white truncate">{name}</p>
              </div>
              <span className="ml-auto text-[10px] font-black text-emerald-400 font-mono shrink-0">RCP-0001</span>
            </div>
          </div>

          {/* Sidebar */}
          <div className="rounded-xl bg-white border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <BrandMark name={name} logo={logo} color={color} size={32} radius={9} />
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 truncate">{name}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">App sidebar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingSettings;
