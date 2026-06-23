import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

type AssetClass =
  | 'industrial_building'
  | 'non_industrial_building'
  | 'plant_machinery'
  | 'furniture_fittings'
  | 'motor_vehicle'
  | 'office_equipment'
  | 'computer_equipment';

const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  industrial_building: 'Industrial Building',
  non_industrial_building: 'Non-Industrial Building',
  plant_machinery: 'Plant & Machinery',
  furniture_fittings: 'Furniture & Fittings',
  motor_vehicle: 'Motor Vehicle',
  office_equipment: 'Office Equipment',
  computer_equipment: 'Computer & IT Equipment',
};

const ASSET_CLASS_ICONS: Record<AssetClass, string> = {
  industrial_building: 'fa-industry',
  non_industrial_building: 'fa-building',
  plant_machinery: 'fa-gears',
  furniture_fittings: 'fa-couch',
  motor_vehicle: 'fa-car',
  office_equipment: 'fa-print',
  computer_equipment: 'fa-laptop',
};

const INITIAL_RATES: Record<AssetClass, number> = {
  industrial_building: 0.15,
  non_industrial_building: 0.05,
  plant_machinery: 0.50,
  furniture_fittings: 0.25,
  motor_vehicle: 0.50,
  office_equipment: 0.50,
  computer_equipment: 0.50,
};

const ANNUAL_RATES: Record<AssetClass, number> = {
  industrial_building: 0.10,
  non_industrial_building: 0.10,
  plant_machinery: 0.25,
  furniture_fittings: 0.20,
  motor_vehicle: 0.25,
  office_equipment: 0.25,
  computer_equipment: 0.25,
};

interface CapitalAsset {
  _id: string;
  name: string;
  assetClass: AssetClass;
  assetClassLabel: string;
  cost: number;
  acquiredOn: string;
  disposedOn?: string | null;
  notes?: string;
  currentYearAllowance: number;
}

const EMPTY_FORM = {
  name: '',
  assetClass: 'computer_equipment' as AssetClass,
  cost: '',
  acquiredOn: '',
  disposedOn: '',
  notes: '',
};

const CapitalAssets: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [assets, setAssets] = useState<CapitalAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<CapitalAsset | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [filterClass, setFilterClass] = useState<AssetClass | 'all'>('all');
  const [showDisposed, setShowDisposed] = useState(false);
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  const [showTaxInForm, setShowTaxInForm] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchAssets = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<CapitalAsset[]>('/capital-assets');
      setAssets(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAssets(); }, []);

  const openCreate = () => {
    setEditingAsset(null);
    setForm({ ...EMPTY_FORM });
    setError('');
    setShowModal(true);
  };

  const openEdit = (asset: CapitalAsset) => {
    setEditingAsset(asset);
    setForm({
      name: asset.name,
      assetClass: asset.assetClass,
      cost: String(asset.cost),
      acquiredOn: asset.acquiredOn.slice(0, 10),
      disposedOn: asset.disposedOn ? asset.disposedOn.slice(0, 10) : '',
      notes: asset.notes || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(form.cost);
    if (!form.name.trim() || !form.acquiredOn || isNaN(cost) || cost < 0) {
      setError('Name, acquisition date, and a valid cost are required.');
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        assetClass: form.assetClass,
        cost,
        acquiredOn: form.acquiredOn,
        disposedOn: form.disposedOn || null,
        notes: form.notes.trim() || undefined,
      };
      if (editingAsset) {
        await apiRequest(`/capital-assets/${editingAsset._id}`, { method: 'PUT', body: payload });
        showToast('Asset updated');
      } else {
        await apiRequest('/capital-assets', { method: 'POST', body: payload });
        showToast('Asset added');
      }
      setShowModal(false);
      fetchAssets();
    } catch (err: any) {
      setError(err.message || 'Failed to save asset');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (asset: CapitalAsset) => {
    if (!window.confirm(`Delete "${asset.name}"? This cannot be undone.`)) return;
    try {
      await apiRequest(`/capital-assets/${asset._id}`, { method: 'DELETE' });
      showToast('Asset deleted');
      fetchAssets();
    } catch (err: any) {
      showToast('Failed to delete: ' + err.message);
    }
  };

  const visible = assets.filter(a => {
    if (!showDisposed && a.disposedOn) return false;
    if (filterClass !== 'all' && a.assetClass !== filterClass) return false;
    return true;
  });

  const totalCost = visible.reduce((s, a) => s + a.cost, 0);
  const totalAllowance = visible.reduce((s, a) => s + a.currentYearAllowance, 0);
  const activeCount = visible.filter(a => !a.disposedOn).length;
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-8">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Assets</h2>
          <p className="text-sm sm:text-base text-slate-500 font-medium">Track equipment, vehicles, and other business assets.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTaxDetails(v => !v)}
            className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${showTaxDetails ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
          >
            <i className="fas fa-receipt text-[10px]"></i>
            {showTaxDetails ? 'Hide tax' : 'Tax view'}
          </button>
          <button
            onClick={openCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95 text-sm font-bold"
          >
            <i className="fas fa-plus text-xs"></i> Add Asset
          </button>
        </div>
      </div>

      {/* KPI strip */}
      {!isLoading && assets.length > 0 && (
        <div className={`grid gap-3 sm:gap-4 ${showTaxDetails ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Total Assets</p>
            <p className="text-2xl font-black text-slate-900">{assets.filter(a => !a.disposedOn).length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">active</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Total Cost</p>
            <p className="text-2xl font-black text-slate-900 truncate">{formatCurrency(assets.reduce((s, a) => s + a.cost, 0))}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">acquisition value</p>
          </div>
          {showTaxDetails && (
            <div className="bg-violet-50 rounded-2xl border border-violet-100 p-4 shadow-sm">
              <p className="text-[10px] font-extrabold text-violet-400 uppercase tracking-widest mb-1">{currentYear} Allowance</p>
              <p className="text-2xl font-black text-violet-700 truncate">{formatCurrency(assets.filter(a => !a.disposedOn).reduce((s, a) => s + a.currentYearAllowance, 0))}</p>
              <p className="text-[11px] text-violet-400 mt-0.5">claimable this year</p>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Disposed</p>
            <p className="text-2xl font-black text-slate-400">{assets.filter(a => !!a.disposedOn).length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">retired assets</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterClass('all')}
          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${filterClass === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
        >
          All types
        </button>
        {(Object.keys(ASSET_CLASS_LABELS) as AssetClass[]).map(cls => (
          <button
            key={cls}
            onClick={() => setFilterClass(cls === filterClass ? 'all' : cls)}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${filterClass === cls ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'}`}
          >
            <i className={`fas ${ASSET_CLASS_ICONS[cls]} mr-1.5 text-[10px]`} />{ASSET_CLASS_LABELS[cls]}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer select-none">
          <input type="checkbox" checked={showDisposed} onChange={e => setShowDisposed(e.target.checked)} className="accent-indigo-600" />
          Show disposed
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading assets...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center">
              <i className="fas fa-box-archive text-slate-300 text-2xl"></i>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500">{assets.length === 0 ? 'No assets yet' : 'No assets match the filter'}</p>
              <p className="text-xs text-slate-400 mt-1">{assets.length === 0 ? 'Start adding equipment, vehicles, and other business assets.' : 'Try changing the filter above.'}</p>
            </div>
            {assets.length === 0 && (
              <button onClick={openCreate} className="mt-2 text-sm font-bold text-indigo-600 hover:text-indigo-700">
                <i className="fas fa-plus mr-1" /> Add your first asset
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-extrabold uppercase tracking-[2px]">
                    <th className="px-6 py-5">Asset</th>
                    <th className="px-6 py-5">Type</th>
                    <th className="px-6 py-5">Cost</th>
                    <th className="px-6 py-5">Acquired</th>
                    {showTaxDetails && <th className="px-6 py-5 text-violet-400">{currentYear} Allowance</th>}
                    <th className="px-6 py-5">Status</th>
                    <th className="px-6 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visible.map(asset => (
                    <tr key={asset._id} className={`hover:bg-slate-50/50 transition-colors group ${asset.disposedOn ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                            <i className={`fas ${ASSET_CLASS_ICONS[asset.assetClass]} text-indigo-500 text-sm`}></i>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{asset.name}</p>
                            {asset.notes && <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{asset.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-bold text-slate-600">{asset.assetClassLabel || ASSET_CLASS_LABELS[asset.assetClass]}</span>
                        {showTaxDetails && (
                          <p className="text-[10px] text-violet-400 mt-0.5">
                            {(INITIAL_RATES[asset.assetClass] * 100).toFixed(0)}% initial · {(ANNUAL_RATES[asset.assetClass] * 100).toFixed(0)}% annual
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-black text-slate-900">{formatCurrency(asset.cost)}</span>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-600">
                        {new Date(asset.acquiredOn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      {showTaxDetails && (
                        <td className="px-6 py-5">
                          {asset.disposedOn ? (
                            <span className="text-xs text-slate-400 font-semibold">Disposed</span>
                          ) : (
                            <div>
                              <span className="text-sm font-black text-violet-600">{formatCurrency(asset.currentYearAllowance)}</span>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {asset.cost > 0 ? ((asset.currentYearAllowance / asset.cost) * 100).toFixed(1) : 0}% of cost
                              </p>
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-5">
                        {asset.disposedOn ? (
                          <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                            Disposed {new Date(asset.disposedOn).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">Active</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                          <button onClick={() => openEdit(asset)} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm transition-all">
                            <i className="fas fa-pen-to-square text-xs"></i>
                          </button>
                          <button onClick={() => handleDelete(asset)} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-100 shadow-sm transition-all">
                            <i className="fas fa-trash-can text-xs"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50/80 border-t-2 border-slate-100">
                    <td colSpan={2} className="px-6 py-4 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      {activeCount} active asset{activeCount !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-slate-900">{formatCurrency(totalCost)}</td>
                    <td className="px-6 py-4"></td>
                    {showTaxDetails && <td className="px-6 py-4 text-sm font-black text-violet-700">{formatCurrency(totalAllowance)}</td>}
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {visible.map(asset => (
                <div key={asset._id} className={`p-5 space-y-3 ${asset.disposedOn ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                        <i className={`fas ${ASSET_CLASS_ICONS[asset.assetClass]} text-indigo-500 text-sm`}></i>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{asset.name}</p>
                        <p className="text-[11px] text-slate-400">{asset.assetClassLabel || ASSET_CLASS_LABELS[asset.assetClass]}</p>
                      </div>
                    </div>
                    {asset.disposedOn
                      ? <span className="text-[9px] font-black uppercase px-2 py-1 rounded-full bg-slate-100 text-slate-500">Disposed</span>
                      : <span className="text-[9px] font-black uppercase px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">Active</span>
                    }
                  </div>
                  <div className={`grid gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100/50 ${showTaxDetails ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Cost</p>
                      <p className="text-xs font-black text-slate-900">{formatCurrency(asset.cost)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Acquired</p>
                      <p className="text-xs font-semibold text-slate-600">
                        {new Date(asset.acquiredOn).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    {showTaxDetails && (
                      <div>
                        <p className="text-[9px] font-bold text-violet-400 uppercase tracking-wider mb-0.5">{currentYear} Allow.</p>
                        <p className="text-xs font-black text-violet-600">
                          {asset.disposedOn ? '—' : formatCurrency(asset.currentYearAllowance)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(asset)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 shadow-sm">
                      <i className="fas fa-pen-to-square text-indigo-500 text-xs"></i> Edit
                    </button>
                    <button onClick={() => handleDelete(asset)} className="w-11 flex items-center justify-center py-2.5 bg-white border border-slate-100 rounded-xl text-xs text-rose-500 shadow-sm">
                      <i className="fas fa-trash-can text-xs"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">{editingAsset ? 'Edit Asset' : 'Add Asset'}</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <p className="text-sm text-rose-600 font-medium bg-rose-50 rounded-xl px-4 py-3"><i className="fas fa-exclamation-circle mr-2" />{error}</p>}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Asset Name</label>
                <input
                  type="text" required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Toyota Hilux 2023, MacBook Pro M3..."
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Asset Type</label>
                <select
                  value={form.assetClass}
                  onChange={e => setForm(f => ({ ...f, assetClass: e.target.value as AssetClass }))}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {(Object.keys(ASSET_CLASS_LABELS) as AssetClass[]).map(cls => (
                    <option key={cls} value={cls}>{ASSET_CLASS_LABELS[cls]}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cost</label>
                  <input
                    type="number" required min="0" step="0.01"
                    value={form.cost}
                    onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                    placeholder="0.00"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Acquisition Date</label>
                  <input
                    type="date" required
                    value={form.acquiredOn}
                    onChange={e => setForm(f => ({ ...f, acquiredOn: e.target.value }))}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Tax allowance preview — opt-in */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowTaxInForm(v => !v)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-violet-600 transition-colors"
                >
                  <i className={`fas fa-chevron-${showTaxInForm ? 'up' : 'down'} text-[10px]`}></i>
                  {showTaxInForm ? 'Hide tax allowance estimate' : 'Show tax allowance estimate (CITA)'}
                </button>
                {showTaxInForm && form.cost && parseFloat(form.cost) > 0 && (
                  <div className="mt-2 bg-violet-50 border border-violet-100 rounded-xl p-3 flex items-start gap-3">
                    <i className="fas fa-calculator text-violet-400 text-sm shrink-0 mt-0.5"></i>
                    <div className="text-xs text-violet-700">
                      <p className="font-bold mb-0.5">Estimated {currentYear} capital allowance (CITA)</p>
                      {(() => {
                        const cost = parseFloat(form.cost) || 0;
                        const acquired = form.acquiredOn ? new Date(form.acquiredOn) : null;
                        const isFirstYear = acquired && acquired.getFullYear() === currentYear;
                        const allowance = isFirstYear
                          ? cost * INITIAL_RATES[form.assetClass]
                          : cost * (1 - INITIAL_RATES[form.assetClass]) * ANNUAL_RATES[form.assetClass];
                        return (
                          <p>
                            <span className="font-black">₦{allowance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                            {' '}<span className="text-violet-500">({isFirstYear ? 'initial year' : 'annual'} rate — {(INITIAL_RATES[form.assetClass] * 100).toFixed(0)}% initial / {(ANNUAL_RATES[form.assetClass] * 100).toFixed(0)}% annual)</span>
                          </p>
                        );
                      })()}
                      <p className="text-violet-400 mt-1">Verify with a licensed accountant before filing.</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Disposal Date <span className="font-normal text-slate-400 normal-case">(leave blank if still active)</span>
                </label>
                <input
                  type="date"
                  value={form.disposedOn}
                  onChange={e => setForm(f => ({ ...f, disposedOn: e.target.value }))}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes <span className="font-normal text-slate-400 normal-case">(optional)</span></label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Serial number, location, purchase reference..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 h-11 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  {isSaving ? 'Saving...' : editingAsset ? 'Update Asset' : 'Add Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CapitalAssets;
