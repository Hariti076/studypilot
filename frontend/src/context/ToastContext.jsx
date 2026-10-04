import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, Info, X } from 'lucide-react';

export const ToastContext = createContext(null);

const TYPES = {
  success: { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
  error: { icon: AlertTriangle, cls: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300' },
  info: { icon: Info, cls: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300' },
  reminder: { icon: Bell, cls: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
};

function ToastItem({ toast, onClose }) {
  const t = TYPES[toast.type] || TYPES.info;
  const Icon = t.icon;
  useEffect(() => {
    const id = setTimeout(() => onClose(toast.id), toast.duration);
    return () => clearTimeout(id);
  }, [toast.id, toast.duration, onClose]);

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className="flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${t.cls}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        {toast.title && <p className="text-sm font-semibold text-slate-900 dark:text-white">{toast.title}</p>}
        <p className={`text-sm text-slate-600 dark:text-slate-300 ${toast.title ? 'mt-0.5' : 'pt-1.5'}`}>{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        aria-label="Dismiss notification"
        className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((type, message, opts = {}) => {
    counter.current += 1;
    const toast = { id: counter.current, type, message, title: opts.title, duration: opts.duration ?? 4500 };
    setToasts((t) => [...t.slice(-3), toast]);
  }, []);

  const api = useMemo(
    () => ({
      success: (m, o) => push('success', m, o),
      error: (m, o) => push('error', m, { duration: 6000, ...o }),
      info: (m, o) => push('info', m, o),
      reminder: (m, o) => push('reminder', m, { title: 'Study reminder', duration: 7000, ...o }),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-20 right-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col items-end gap-2 md:bottom-4" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full">
            <ToastItem toast={t} onClose={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
