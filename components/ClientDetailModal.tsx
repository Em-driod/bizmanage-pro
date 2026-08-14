
import React, { useState, useEffect } from 'react';
import { Client, Transaction } from '../types';
import { apiRequest } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: string;
  createdAt: string;
  lineItems: { description: string }[];
}

interface ClientDetailModalProps {
  client: Client;
  onClose: () => void;
  onTransactionAdded: () => void;
  onSendInvoice?: (client: Client) => void;
}

type Tab = 'overview' | 'invoices' | 'transactions';

const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  client,
  onClose,
  onTransactionAdded,
  onSendInvoice,
}) => {
  const { formatCurrency } = useCurrency();
  const [tab, setTab] = useState<Tab>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [txData, invData] = await Promise.all([
          apiRequest<{ data: Transaction[] }>(`/transactions?clientId=${client._id}&limit=100`),
          apiRequest<{ data: Invoice[] }>(`/invoices?clientId=${client._id}&limit=100`),
        ]);
        setTransactions(txData.data);
        setInvoices(invData.data);
      } catch {
        setTransactions([]);
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [client._id]);

  const totalPaid = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((s, inv) => s + inv.total, 0);

  const totalOwed = invoices
    .filter((inv) => inv.status !== 'paid' && inv.status !== 'draft')
    .reduce((s, inv) => s + inv.total, 0);

  const overdueCount = invoices.filter((inv) => inv.status === 'overdue').length;

  const handleMarkPaid = async (invoiceId: string) => {
    setMarkingPaid(invoiceId);
    try {
      await apiRequest(`/invoices/${invoiceId}`, { method: 'PUT', body: { status: 'paid' } });
      setInvoices((prev) =>
        prev.map((inv) => (inv._id === invoiceId ? { ...inv, status: 'paid' } : inv))
      );
      onTransactionAdded();
    } catch {
      // silent
    } finally {
      setMarkingPaid(null);
    }
  };

  const statusBadge = (status: Invoice['status']) => {
    const map: Record<string, string> = {
      paid: 'bg-emerald-100 text-emerald-700',
      sent: 'bg-blue-100 text-blue-700',
      overdue: 'bg-rose-100 text-rose-700',
      draft: 'bg-slate-100 text-slate-500',
    };
    return (
      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${map[status]}`}>
        {status}
      </span>
    );
  };

  const initials = client.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white w-full sm:max-w-xl sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="relative bg-gradient-to-br from-indigo-600 to-violet-700 px-6 pt-6 pb-10 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <i className="fas fa-times text-sm"></i>
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-lg">
              {initials}
            </div>
            <div>
              <p className="font-black text-xl leading-tight">{client.name}</p>
              <p className="text-indigo-200 text-sm">{client.email}</p>
              {client.phone && <p className="text-indigo-200 text-sm">{client.phone}</p>}
            </div>
          </div>

          {/* KPI row */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold uppercase text-indigo-200 mb-0.5">Total Paid</p>
              <p className="font-black text-base">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold uppercase text-indigo-200 mb-0.5">Outstanding</p>
              <p className={`font-black text-base ${totalOwed > 0 ? 'text-amber-300' : ''}`}>
                {formatCurrency(totalOwed)}
              </p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold uppercase text-indigo-200 mb-0.5">Invoices</p>
              <p className="font-black text-base">{invoices.length}</p>
            </div>
          </div>

          {/* Quick send invoice button */}
          {onSendInvoice && (
            <button
              onClick={() => { onClose(); onSendInvoice(client); }}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-white text-indigo-700 font-bold text-sm py-2.5 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              <i className="fas fa-file-invoice"></i>
              Send Invoice to {client.name.split(' ')[0]}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-white">
          {(['overview', 'invoices', 'transactions'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors relative ${
                tab === t
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              {t}
              {t === 'invoices' && overdueCount > 0 && (
                <span className="ml-1 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {overdueCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
              <i className="fas fa-circle-notch fa-spin mr-2"></i> Loading…
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {tab === 'overview' && (
                <div className="p-5 space-y-4">
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                    <p className="text-xs font-bold uppercase text-slate-400 mb-2">Contact Details</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Email</span>
                      <span className="font-semibold text-slate-800">{client.email || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Phone</span>
                      <span className="font-semibold text-slate-800">{client.phone || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Status</span>
                      <span className={`font-bold capitalize ${client.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {client.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Contact Base</span>
                      <span className="font-semibold text-slate-800">{client.businessValue}%</span>
                    </div>
                  </div>

                  {/* Summary cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 rounded-xl p-4">
                      <p className="text-[10px] font-bold uppercase text-emerald-600 mb-1">Revenue from client</p>
                      <p className="font-black text-emerald-800 text-lg">{formatCurrency(totalPaid)}</p>
                    </div>
                    <div className={`rounded-xl p-4 ${totalOwed > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                      <p className={`text-[10px] font-bold uppercase mb-1 ${totalOwed > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        They owe you
                      </p>
                      <p className={`font-black text-lg ${totalOwed > 0 ? 'text-amber-800' : 'text-slate-400'}`}>
                        {formatCurrency(totalOwed)}
                      </p>
                    </div>
                  </div>

                  {/* Recent invoices preview */}
                  {invoices.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400 mb-2">Recent Invoices</p>
                      <div className="space-y-2">
                        {invoices.slice(0, 3).map((inv) => (
                          <div key={inv._id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                            <div>
                              <p className="text-sm font-bold text-slate-800">#{inv.invoiceNumber}</p>
                              <p className="text-xs text-slate-400">
                                {new Date(inv.dueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                              <p className="font-bold text-slate-800 text-sm">{formatCurrency(inv.total)}</p>
                              {statusBadge(inv.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                      {invoices.length > 3 && (
                        <button
                          onClick={() => setTab('invoices')}
                          className="mt-2 text-indigo-600 text-xs font-bold"
                        >
                          View all {invoices.length} invoices →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* INVOICES TAB */}
              {tab === 'invoices' && (
                <div className="p-5">
                  {invoices.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <i className="fas fa-file-invoice text-3xl mb-3 block"></i>
                      <p className="text-sm">No invoices yet</p>
                      {onSendInvoice && (
                        <button
                          onClick={() => { onClose(); onSendInvoice(client); }}
                          className="mt-3 text-indigo-600 text-sm font-bold"
                        >
                          Create first invoice →
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invoices.map((inv) => (
                        <div key={inv._id} className="bg-slate-50 rounded-2xl p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-slate-800">#{inv.invoiceNumber}</p>
                              <p className="text-xs text-slate-400">
                                Due {new Date(inv.dueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                              <p className="font-black text-slate-900">{formatCurrency(inv.total)}</p>
                              {statusBadge(inv.status)}
                            </div>
                          </div>
                          {inv.lineItems?.[0]?.description && (
                            <p className="text-xs text-slate-500 truncate">{inv.lineItems[0].description}</p>
                          )}
                          {(inv.status === 'sent' || inv.status === 'overdue') && (
                            <button
                              onClick={() => handleMarkPaid(inv._id)}
                              disabled={markingPaid === inv._id}
                              className="mt-3 w-full py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60"
                            >
                              {markingPaid === inv._id ? (
                                <><i className="fas fa-circle-notch fa-spin mr-1"></i> Marking…</>
                              ) : (
                                <><i className="fas fa-check mr-1"></i> Mark as Paid</>
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TRANSACTIONS TAB */}
              {tab === 'transactions' && (
                <div className="p-5">
                  {transactions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <i className="fas fa-receipt text-3xl mb-3 block"></i>
                      <p className="text-sm">No transactions recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {transactions.map((tx) => (
                        <div key={tx._id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{tx.description || 'No description'}</p>
                            <p className="text-xs text-slate-400">
                              {tx.category} · {new Date(tx.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                          <p className={`font-bold text-sm ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDetailModal;
