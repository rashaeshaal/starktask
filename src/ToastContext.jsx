import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  CheckCircle2, AlertTriangle, AlertCircle, Info, X, 
  HelpCircle, ShieldAlert
} from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Show a toast message: type = 'success' | 'error' | 'warning' | 'info'
  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    const newToast = { id, message, type };

    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Premium Custom Confirm Dialog (Replaces native browser window.confirm)
  const confirm = useCallback(({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger', // 'danger' | 'warning' | 'info'
    onConfirm,
    onCancel
  }) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        title,
        message,
        confirmText,
        cancelText,
        type,
        onConfirm: () => {
          setConfirmDialog(null);
          if (onConfirm) onConfirm();
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog(null);
          if (onCancel) onCancel();
          resolve(false);
        }
      });
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, confirm }}>
      {children}

      {/* ========================================================
          GLOBAL TOAST CONTAINER (Top Right, Modern Floating Stack)
         ======================================================== */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none">
        {toasts.map(toast => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error' || toast.type === 'danger';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-3 fade-in ${
                isSuccess
                  ? 'bg-[#05331F]/95 text-emerald-100 border-emerald-500/40 shadow-emerald-950/20'
                  : isError
                  ? 'bg-[#450a0a]/95 text-rose-100 border-rose-500/40 shadow-rose-950/20'
                  : isWarning
                  ? 'bg-[#451a03]/95 text-amber-100 border-amber-500/40 shadow-amber-950/20'
                  : 'bg-[#0f172a]/95 text-slate-100 border-slate-700 shadow-slate-950/20'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {isError && <AlertCircle className="w-4 h-4 text-rose-400" />}
                {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-sky-400" />}
              </div>

              <div className="flex-1 text-xs font-semibold leading-relaxed">
                {toast.message}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-white/60 hover:text-white p-0.5 rounded-lg transition shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* ========================================================
          PREMIUM CONFIRM / PROMPT MODAL
         ======================================================== */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 space-y-4">
            
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                confirmDialog.type === 'danger'
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : confirmDialog.type === 'warning'
                  ? 'bg-amber-50 text-amber-600 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {confirmDialog.type === 'danger' && <AlertTriangle className="w-5 h-5" />}
                {confirmDialog.type === 'warning' && <AlertCircle className="w-5 h-5" />}
                {confirmDialog.type !== 'danger' && confirmDialog.type !== 'warning' && <HelpCircle className="w-5 h-5" />}
              </div>

              <div>
                <h3 className="font-bold text-base text-slate-900">{confirmDialog.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{confirmDialog.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={confirmDialog.onCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                {confirmDialog.cancelText}
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition active:scale-95 cursor-pointer ${
                  confirmDialog.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : confirmDialog.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-[#05331F] hover:bg-[#07472B] shadow-emerald-900/20'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>

          </div>
        </div>
      )}

    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback if invoked outside ToastProvider
    return {
      showToast: (msg) => console.log('Toast:', msg),
      removeToast: () => {},
      confirm: ({ onConfirm }) => onConfirm && onConfirm()
    };
  }
  return context;
}
