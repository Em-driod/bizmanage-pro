import React from 'react';
import { useNotification, ToastType } from '../context/NotificationContext';

const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useNotification();

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success': return 'fa-circle-check text-emerald-500';
            case 'error': return 'fa-circle-exclamation text-rose-500';
            case 'info': return 'fa-circle-info text-indigo-500';
            default: return 'fa-bell text-slate-500';
        }
    };

    const getBg = (type: ToastType) => {
        switch (type) {
            case 'success': return 'border-emerald-500/20 bg-emerald-50/10';
            case 'error': return 'border-rose-500/20 bg-rose-50/10';
            case 'info': return 'border-indigo-500/20 bg-indigo-50/10';
            default: return 'border-slate-500/20 bg-slate-50/10';
        }
    };

    return (
        <div className="fixed top-8 right-8 z-[9999] flex flex-col gap-3 pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`
            pointer-events-auto min-w-[320px] max-w-[400px] p-5 rounded-[1.5rem] 
            backdrop-blur-2xl border shadow-2xl animate-in fade-in slide-in-from-right-10 duration-500
            ${getBg(toast.type)}
          `}
                >
                    <div className="flex items-start gap-4">
                        <div className="mt-0.5">
                            <i className={`fas ${getIcon(toast.type)} text-xl`}></i>
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                                {toast.type} notification
                            </p>
                            <p className="text-sm font-bold text-slate-900 leading-relaxed">
                                {toast.message}
                            </p>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-slate-400 hover:text-slate-900 transition-colors mt-0.5"
                        >
                            <i className="fas fa-times text-xs"></i>
                        </button>
                    </div>
                    {/* Progress Bar */}
                    <div className="absolute bottom-1 left-4 right-4 h-[2px] bg-slate-200/20 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-400/50 animate-toast-progress origin-left"></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
