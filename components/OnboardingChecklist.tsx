import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';

interface ChecklistStatus {
  hasClient: boolean;
  hasTransaction: boolean;
  hasInvoice: boolean;
  hasScannedDoc: boolean;
}

const DISMISSED_KEY = 'opsflow_onboarding_dismissed';

const OnboardingChecklist: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ChecklistStatus | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === 'true');

  useEffect(() => {
    if (dismissed) return;
    apiRequest<ChecklistStatus>('/dashboard/onboarding-status')
      .then(setStatus)
      .catch(() => {});
  }, [dismissed]);

  if (dismissed || !status) return null;

  const steps = [
    { key: 'hasClient',      label: 'Add your first client',      sub: 'Start tracking who you do business with.',  icon: 'fa-user-plus',    path: '/clients',               done: status.hasClient },
    { key: 'hasTransaction', label: 'Log a transaction',           sub: 'Record income or an expense.',              icon: 'fa-receipt',       path: '/transactions',          done: status.hasTransaction },
    { key: 'hasInvoice',     label: 'Create an invoice',           sub: 'Bill a client and send it by email.',       icon: 'fa-file-invoice',  path: '/invoices',              done: status.hasInvoice },
    { key: 'hasScannedDoc',  label: 'Scan a receipt or document',  sub: 'Let AI extract the data for you.',          icon: 'fa-camera',        path: '/scanned-transactions',  done: status.hasScannedDoc },
  ];

  const doneCount = steps.filter(s => s.done).length;
  const allDone = doneCount === steps.length;
  const progressPct = Math.round((doneCount / steps.length) * 100);

  if (allDone) {
    localStorage.setItem(DISMISSED_KEY, 'true');
    return null;
  }

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm mb-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[3px] text-indigo-500 mb-1">Getting started</p>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Set up your workspace</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{doneCount} of {steps.length} steps complete</p>
          </div>
          <button
            onClick={() => { localStorage.setItem(DISMISSED_KEY, 'true'); setDismissed(true); }}
            className="text-slate-300 hover:text-slate-500 transition-colors p-1"
            title="Dismiss"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {steps.map(step => (
            <button
              key={step.key}
              onClick={() => !step.done && navigate(step.path)}
              disabled={step.done}
              className={`flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                step.done
                  ? 'bg-emerald-50 border-emerald-100 cursor-default'
                  : 'bg-slate-50 border-slate-100 hover:bg-indigo-50 hover:border-indigo-200 active:scale-[0.98]'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${step.done ? 'bg-emerald-500' : 'bg-white border border-slate-200'}`}>
                {step.done
                  ? <i className="fas fa-check text-white text-sm"></i>
                  : <i className={`fas ${step.icon} text-slate-400 text-sm`}></i>
                }
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-bold truncate ${step.done ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>{step.label}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">{step.sub}</p>
              </div>
              {!step.done && <i className="fas fa-chevron-right text-[10px] text-slate-300 ml-auto shrink-0"></i>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OnboardingChecklist;
