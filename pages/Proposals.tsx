import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import ProposalShareModal from '../components/ProposalShareModal';
import type { Product } from './Products';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Client {
  _id: string;
  name: string;
  email?: string;
}

interface Proposal {
  _id: string;
  proposalNumber: string;
  title: string;
  clientId?: Client | null;
  customClientName?: string;
  recipientEmail?: string;
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  validUntil: string;
  notes?: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'converted';
  signatureName?: string;
  signedAt?: string;
  convertedInvoiceId?: { invoiceNumber: string } | null;
  createdAt: string;
}

const EMPTY_LINE: LineItem = { description: '', quantity: 1, unitPrice: 0, total: 0 };

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-indigo-50 text-indigo-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-600',
  converted: 'bg-purple-50 text-purple-700',
};

const Proposals: React.FC = () => {
  const { formatCurrency } = useCurrency();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [showCatalog, setShowCatalog] = useState(false);
  const [sharingProposal, setSharingProposal] = useState<Proposal | null>(null);

  const [form, setForm] = useState({
    title: '',
    clientId: '',
    customClientName: '',
    recipientEmail: '',
    lineItems: [{ ...EMPTY_LINE }],
    tax: 0,
    validUntil: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; })(),
    notes: '',
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchAll = useCallback(async () => {
    try {
      const [pRes, cRes, prods] = await Promise.all([
        apiRequest<{ data: Proposal[] } | Proposal[]>('/proposals'),
        apiRequest<{ data: Client[] } | Client[]>('/clients?limit=200'),
        apiRequest<Product[]>('/products'),
      ]);
      const p = Array.isArray(pRes) ? pRes : (pRes as any).data ?? [];
      const c = Array.isArray(cRes) ? cRes : (cRes as any).data ?? [];
      setProposals(p);
      setProducts(prods);
      setClients(c);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const subtotal = form.lineItems.reduce((s, i) => s + i.total, 0);
  const total = subtotal + (subtotal * form.tax) / 100;

  const updateLine = (idx: number, field: keyof LineItem, value: string | number) => {
    setForm(f => {
      const items = [...f.lineItems];
      (items[idx] as any)[field] = value;
      items[idx].total = items[idx].quantity * items[idx].unitPrice;
      return { ...f, lineItems: items };
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      title: '',
      clientId: '',
      customClientName: '',
      recipientEmail: '',
      lineItems: [{ ...EMPTY_LINE }],
      tax: 0,
      validUntil: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; })(),
      notes: '',
    });
    setShowForm(true);
  };

  const openEdit = (p: Proposal) => {
    setEditingId(p._id);
    setForm({
      title: p.title,
      clientId: p.clientId?._id || '',
      customClientName: p.customClientName || '',
      recipientEmail: p.recipientEmail || '',
      lineItems: p.lineItems.map(l => ({ ...l })),
      tax: p.tax,
      validUntil: p.validUntil.split('T')[0],
      notes: p.notes || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showToast('Title is required'); return; }
    if (form.lineItems.some(l => !l.description.trim())) { showToast('All line items need a description'); return; }
    setSaving(true);
    try {
      const payload = { ...form, subtotal, total };
      if (editingId) {
        await apiRequest(`/proposals/${editingId}`, { method: 'PUT', body: payload });
      } else {
        await apiRequest('/proposals', { method: 'POST', body: payload });
      }
      showToast(editingId ? 'Proposal updated' : 'Proposal created');
      setShowForm(false);
      fetchAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (id: string) => {
    try {
      const res = await apiRequest<{ emailSent: boolean; recipientEmail: string | null }>(`/proposals/${id}/send`, { method: 'POST' });
      if (res.emailSent && res.recipientEmail) {
        showToast(`Sent ✓ — email delivered to ${res.recipientEmail}`);
      } else if (res.recipientEmail) {
        showToast('Marked as sent (email delivery failed — check Resend config)');
      } else {
        showToast('Marked as sent (no email — no recipient address on this proposal)');
      }
      fetchAll();
    } catch { showToast('Failed to send proposal'); }
  };

  const handleConvert = async (id: string) => {
    const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 14);
    try {
      const { invoice } = await apiRequest<{ invoice: { invoiceNumber: string } }>(
        `/proposals/${id}/convert`,
        { method: 'POST', body: JSON.stringify({ dueDate: dueDate.toISOString() }) },
      );
      showToast(`Converted to invoice ${invoice.invoiceNumber}`);
      fetchAll();
    } catch (err: any) { showToast(err.message || 'Failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this proposal?')) return;
    try {
      await apiRequest(`/proposals/${id}`, { method: 'DELETE' });
      showToast('Deleted');
      fetchAll();
    } catch { showToast('Failed to delete'); }
  };

  const copyLink = (id: string) => {
    const link = `${window.location.origin}/proposal/${id}`;
    navigator.clipboard.writeText(link);
    showToast('Link copied');
  };

  const shareWhatsApp = (p: Proposal) => {
    const link = `${window.location.origin}/proposal/${p._id}`;
    const name = clientName(p);
    const msg = `Hi ${name}, please review my proposal *${p.proposalNumber}: ${p.title}*.\n\nReview and respond here: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const clientName = (p: Proposal) =>
    p.clientId?.name || p.customClientName || 'No client';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Proposals</h1>
          <p className="text-sm text-slate-400 mt-0.5">Send quotes, get them accepted, convert to invoices</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
        >
          <i className="fas fa-plus text-xs" />
          New Proposal
        </button>
      </div>

      {/* Stats Row */}
      {proposals.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['draft', 'sent', 'accepted', 'converted'] as const).map(s => (
            <div key={s} className="bg-white border border-slate-100 rounded-2xl p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{s}</p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {proposals.filter(p => p.status === s).length}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {proposals.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-file-signature text-2xl text-indigo-400" />
          </div>
          <p className="text-base font-bold text-slate-700">No proposals yet</p>
          <p className="text-sm text-slate-400 mt-1">Create your first proposal and share a link with your client</p>
          <button onClick={openCreate} className="mt-5 bg-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
            Create Proposal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map(p => (
            <div key={p._id} className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">{p.proposalNumber}</span>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status]}`}>
                      {p.status}
                    </span>
                    {p.convertedInvoiceId && (
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                        → {p.convertedInvoiceId.invoiceNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-base font-bold text-slate-900 mt-1">{p.title}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-sm text-slate-500">{clientName(p)}</span>
                    {p.recipientEmail && <span className="text-xs text-slate-400">{p.recipientEmail}</span>}
                    <span className="text-xs text-slate-400">Valid until {new Date(p.validUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  {p.status === 'accepted' && p.signatureName && (
                    <p className="text-xs text-emerald-600 font-semibold mt-1">
                      <i className="fas fa-signature mr-1" />
                      Signed by {p.signatureName}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-black text-slate-900">{formatCurrency(p.total)}</p>
                  <p className="text-[10px] text-slate-400">{p.lineItems.length} item{p.lineItems.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {p.status === 'draft' && (
                  <button onClick={() => openEdit(p)} className="text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors">
                    <i className="fas fa-pen mr-1 text-[10px]" />Edit
                  </button>
                )}
                {p.status === 'draft' && (
                  <button onClick={() => handleSend(p._id)} className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                    <i className="fas fa-paper-plane mr-1 text-[10px]" />Mark as Sent
                  </button>
                )}
                {['sent', 'accepted'].includes(p.status) && (
                  <button onClick={() => copyLink(p._id)} className="text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors">
                    <i className="fas fa-link mr-1 text-[10px]" />Copy Link
                  </button>
                )}
                {['draft', 'sent', 'accepted'].includes(p.status) && (
                  <button onClick={() => setSharingProposal(p)} className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                    <i className="fas fa-share-nodes mr-1 text-[10px]" />Share
                  </button>
                )}
                {p.status === 'accepted' && !p.convertedInvoiceId && (
                  <button onClick={() => handleConvert(p._id)} className="text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors">
                    <i className="fas fa-file-invoice mr-1 text-[10px]" />Convert to Invoice
                  </button>
                )}
                {p.status === 'draft' && (
                  <button onClick={() => handleDelete(p._id)} className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors ml-auto">
                    <i className="fas fa-trash text-[10px]" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Modal */}
      {sharingProposal && (
        <ProposalShareModal proposal={sharingProposal} onClose={() => setSharingProposal(null)} />
      )}

      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95dvh]">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">{editingId ? 'Edit Proposal' : 'New Proposal'}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Fill in the details below</p>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <i className="fas fa-times" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Title */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Proposal Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Website Redesign — Phase 1"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Client */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Client</label>
                  <select
                    value={form.clientId}
                    onChange={e => setForm(f => ({ ...f, clientId: e.target.value, customClientName: '' }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">— Select client —</option>
                    {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                {!form.clientId && (
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Or Custom Name</label>
                    <input
                      type="text"
                      placeholder="Client name"
                      value={form.customClientName}
                      onChange={e => setForm(f => ({ ...f, customClientName: e.target.value }))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                )}
              </div>

              {/* Email + Valid Until */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Recipient Email</label>
                  <input
                    type="email"
                    placeholder="client@email.com"
                    value={form.recipientEmail}
                    onChange={e => setForm(f => ({ ...f, recipientEmail: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Valid Until *</label>
                  <input
                    type="date"
                    value={form.validUntil}
                    onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">Line Items</label>
                <div className="space-y-2">
                  {form.lineItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-xl p-3">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={e => updateLine(idx, 'description', e.target.value)}
                        className="col-span-5 border-0 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Qty"
                        value={item.quantity === 0 ? '' : item.quantity}
                        onChange={e => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="col-span-2 border-0 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Price"
                        value={item.unitPrice === 0 ? '' : item.unitPrice}
                        onChange={e => updateLine(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="col-span-3 border-0 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
                      />
                      <div className="col-span-1 text-xs text-slate-500 font-semibold text-right">
                        {item.total.toLocaleString()}
                      </div>
                      <button
                        onClick={() => setForm(f => ({ ...f, lineItems: f.lineItems.filter((_, i) => i !== idx) }))}
                        disabled={form.lineItems.length === 1}
                        className="col-span-1 text-slate-300 hover:text-red-400 disabled:opacity-20 text-center"
                      >
                        <i className="fas fa-times text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={() => setForm(f => ({ ...f, lineItems: [...f.lineItems, { ...EMPTY_LINE }] }))}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <i className="fas fa-plus text-[10px]" />Add Line
                  </button>
                  {products.length > 0 && (
                    <button
                      onClick={() => setShowCatalog(v => !v)}
                      className="text-xs font-bold text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 rounded-lg px-3 py-1 flex items-center gap-1 transition-colors"
                    >
                      <i className="fas fa-box-open text-[10px]" />Pick from Catalog
                    </button>
                  )}
                </div>
                {showCatalog && products.length > 0 && (
                  <div className="mt-2 border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-3 py-2 flex items-center justify-between">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Catalog</p>
                      <button onClick={() => setShowCatalog(false)} className="text-slate-300 hover:text-slate-500 text-xs"><i className="fas fa-times"/></button>
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                      {products.map(p => (
                        <button
                          key={p._id}
                          onClick={() => {
                            setForm(f => ({
                              ...f,
                              lineItems: [...f.lineItems, { description: p.name + (p.description ? ` — ${p.description}` : ''), quantity: 1, unitPrice: p.price, total: p.price }],
                            }));
                            setShowCatalog(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-indigo-50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            {p.image
                              ? <img src={p.image} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0"/>
                              : <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0"><i className="fas fa-box text-indigo-200 text-xs"/></div>
                            }
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                              {p.category && <p className="text-[10px] text-slate-400">{p.category}</p>}
                            </div>
                          </div>
                          <span className="text-sm font-bold text-indigo-600 flex-shrink-0 ml-3">{formatCurrency(p.price)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tax + Totals */}
              <div className="flex justify-end">
                <div className="w-56 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Tax (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.tax}
                      onChange={e => setForm(f => ({ ...f, tax: Number(e.target.value) }))}
                      className="w-20 text-right border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span><span>{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-slate-900 border-t border-slate-200 pt-2">
                    <span>Total</span><span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Notes (optional)</label>
                <textarea
                  rows={3}
                  placeholder="Any additional terms or notes for your client…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Proposals;
