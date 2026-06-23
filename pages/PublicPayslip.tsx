import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../constants';

interface PayslipData {
  staffName: string;
  salary: number;
  deductions: number;
  bonus: number;
  netPay: number;
  payday: string;
  status: 'pending' | 'paid';
  note?: string;
  business: {
    name: string;
    currency: string;
    logoImage?: string;
    accentColor?: string;
  };
}

const fmt = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: currency || 'NGN', minimumFractionDigits: 0 }).format(amount);

const PublicPayslip: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PayslipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/payrolls/payslip/${token}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center text-center px-6">
        <div>
          <p className="text-5xl mb-4">📄</p>
          <h1 className="text-xl font-bold text-white mb-2">Payslip not found</h1>
          <p className="text-white/40 text-sm">This link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  const accent = data.business.accentColor || '#6366f1';
  const currency = data.business.currency || 'NGN';
  const month = new Date(data.payday).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const rows = [
    { label: 'Basic Salary', amount: data.salary, color: 'text-white' },
    ...(data.bonus > 0 ? [{ label: 'Bonus', amount: data.bonus, color: 'text-emerald-400' }] : []),
    ...(data.deductions > 0 ? [{ label: 'Deductions', amount: -data.deductions, color: 'text-red-400' }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center px-4 py-12">

      {/* Card */}
      <div className="w-full max-w-sm">

        {/* Header */}
        <div
          className="rounded-t-3xl p-6 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${accent}cc, ${accent}55)` }}
        >
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative">
            {data.business.logoImage ? (
              <img src={data.business.logoImage} alt="" className="w-12 h-12 rounded-xl object-cover mb-4 ring-2 ring-white/20" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-xl font-black mb-4">
                {data.business.name.charAt(0)}
              </div>
            )}
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest">{data.business.name}</p>
            <h1 className="text-2xl font-black text-white mt-1">Payslip</h1>
            <p className="text-white/70 text-sm mt-0.5">{month}</p>
          </div>
        </div>

        {/* Employee */}
        <div className="bg-white/5 border-x border-white/8 px-6 py-5">
          <p className="text-[10px] font-extrabold text-white/30 uppercase tracking-[3px] mb-1">Employee</p>
          <p className="text-xl font-black text-white">{data.staffName}</p>
          <p className="text-xs text-white/30 mt-1">
            Pay date: {new Date(data.payday).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Breakdown */}
        <div className="bg-white/5 border-x border-white/8 px-6 py-5 space-y-3">
          <p className="text-[10px] font-extrabold text-white/30 uppercase tracking-[3px] mb-3">Breakdown</p>
          {rows.map((row, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-white/60">{row.label}</span>
              <span className={`text-sm font-bold ${row.color}`}>
                {row.amount < 0 ? `− ${fmt(Math.abs(row.amount), currency)}` : fmt(row.amount, currency)}
              </span>
            </div>
          ))}
        </div>

        {/* Net Pay */}
        <div
          className="border-x border-white/8 px-6 py-5 flex items-center justify-between"
          style={{ background: `${accent}18` }}
        >
          <div>
            <p className="text-[10px] font-extrabold text-white/30 uppercase tracking-[3px]">Net Pay</p>
            <p className="text-3xl font-black mt-1" style={{ color: accent }}>{fmt(data.netPay, currency)}</p>
          </div>
          <div className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider ${
            data.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            {data.status === 'paid' ? '✓ Paid' : 'Pending'}
          </div>
        </div>

        {/* Note */}
        {data.note && (
          <div className="bg-white/5 border-x border-white/8 px-6 py-4">
            <p className="text-[10px] font-extrabold text-white/30 uppercase tracking-[3px] mb-1">Note</p>
            <p className="text-sm text-white/50 leading-relaxed">{data.note}</p>
          </div>
        )}

        {/* Footer */}
        <div className="bg-white/3 border border-white/8 rounded-b-3xl px-6 py-4 text-center">
          <p className="text-[10px] text-white/20">This payslip was generated by</p>
          <a
            href="https://Morniy-d0nw.onrender.com/#/register"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-1.5 text-xs font-bold text-white/40 hover:text-white/70 transition-colors"
          >
            <span className="w-3.5 h-3.5 bg-white/15 rounded flex items-center justify-center flex-shrink-0">
              <span className="w-1.5 h-1.5 bg-white rotate-45 block" />
            </span>
            Morniy — Run your business free
          </a>
        </div>

      </div>
    </div>
  );
};

export default PublicPayslip;
