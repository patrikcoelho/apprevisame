"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  closing?: boolean;
};

type ToastContextValue = {
  addToast: (toast: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, { container: string; badge: string }> = {
  success: {
    container: "border-[#cfe7dc] bg-[#edf7f1] text-[#1f5b4b]",
    badge: "bg-[#1f5b4b] text-[#fffaf2]",
  },
  error: {
    container: "border-[#f0c6b9] bg-[#fbe7df] text-[#9d4b3b]",
    badge: "bg-[#d95b43] text-[#fffaf2]",
  },
  info: {
    container: "border-[#e2d6c4] bg-[#fffaf2] text-[#4b4337]",
    badge: "bg-[#6b6357] text-[#fffaf2]",
  },
};

const getToastId = () =>
  `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeouts = useRef<Map<string, number>>(new Map());
  const closingTimeouts = useRef<Map<string, number>>(new Map());
  const exitDuration = 240;

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeout = timeouts.current.get(id);
    if (timeout) {
      window.clearTimeout(timeout);
      timeouts.current.delete(id);
    }
    const closingTimeout = closingTimeouts.current.get(id);
    if (closingTimeout) {
      window.clearTimeout(closingTimeout);
      closingTimeouts.current.delete(id);
    }
  }, []);

  const startClose = useCallback(
    (id: string) => {
      setToasts((prev) =>
        prev.map((toast) =>
          toast.id === id ? { ...toast, closing: true } : toast
        )
      );
      const closingTimeout = window.setTimeout(
        () => removeToast(id),
        exitDuration
      );
      closingTimeouts.current.set(id, closingTimeout);
    },
    [exitDuration, removeToast]
  );

  const addToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = getToastId();
      setToasts((prev) => [
        ...prev,
        { id, variant: toast.variant ?? "info", ...toast },
      ]);
      const duration = toast.duration ?? 4000;
      const timeout = window.setTimeout(() => startClose(id), duration);
      timeouts.current.set(id, timeout);
    },
    [startClose]
  );

  useEffect(() => {
    return () => {
      timeouts.current.forEach((timeout) => window.clearTimeout(timeout));
      timeouts.current.clear();
      closingTimeouts.current.forEach((timeout) => window.clearTimeout(timeout));
      closingTimeouts.current.clear();
    };
  }, []);

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[360px] max-w-[90vw] flex-col gap-3 md:right-6 md:top-6">
        {toasts.map((toast) => {
          const styles = variantStyles[toast.variant ?? "info"];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-[0_20px_50px_-35px_rgba(31,91,75,0.6)] ${
                toast.closing ? "toast-exit" : "toast-enter"
              } ${styles.container}`}
              role="status"
            >
              <span
                className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold uppercase ${styles.badge}`}
              >
                {toast.variant === "success"
                  ? "OK"
                  : toast.variant === "error"
                  ? "ER"
                  : "IN"}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-xs text-[#5f574a]">
                    {toast.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Fechar notificação"
                className="text-[#6b6357]"
                onClick={() => startClose(toast.id)}
              >
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 6l12 12M18 6l-12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }
  return context;
}
