import * as React from 'react';
import { X, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = React.createContext<ToastContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const addToast = React.useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toast: {
        success: (message: string) => addToast('success', message),
        error: (message: string) => addToast('error', message),
      },
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast stack */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Individual toast card ─────────────────────────────────────────────────────

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastItem;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 shadow-lg animate-in slide-in-from-top-2 fade-in duration-200',
        toast.type === 'success'
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-red-50 border-red-200 text-red-800'
      )}
      role="alert"
    >
      {toast.type === 'success' ? (
        <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
      ) : (
        <XCircle className="h-5 w-5 shrink-0 text-red-600" />
      )}
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="shrink-0 rounded p-0.5 hover:bg-black/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}
