import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-950 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-100 dark:border-emerald-800/80 shadow-emerald-500/5'
              : toast.type === 'error'
              ? 'bg-rose-50 text-rose-950 border-rose-200 dark:bg-rose-950/90 dark:text-rose-100 dark:border-rose-800/80 shadow-rose-500/5'
              : 'bg-white text-slate-900 border-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:border-slate-800 shadow-slate-500/5'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />}
          
          <div className="flex-1 text-xs font-medium leading-relaxed">{toast.message}</div>
          
          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
