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
import { AlertTriangle, BellOff, Check, Info, X } from "lucide-react";

type ToastVariant = "neutral" | "info" | "success" | "warning" | "error";

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

const variantStyles: Record<
  ToastVariant,
  {
    containerBg: string;
    iconBg: string;
    icon: string;
    closeBg: string;
    close: string;
  }
> = {
  neutral: {
    containerBg: "var(--toast-neutral-bg)",
    iconBg: "var(--toast-neutral-icon-bg)",
    icon: "text-[var(--toast-neutral-icon)]",
    closeBg: "var(--toast-neutral-close-bg)",
    close: "text-[var(--text-muted)]",
  },
  info: {
    containerBg: "var(--toast-info-bg)",
    iconBg: "var(--toast-info-icon-bg)",
    icon: "text-[var(--toast-info-icon)]",
    closeBg: "var(--toast-info-close-bg)",
    close: "text-[var(--toast-info-icon)]",
  },
  success: {
    containerBg: "var(--toast-success-bg)",
    iconBg: "var(--toast-success-icon-bg)",
    icon: "text-[var(--toast-success-icon)]",
    closeBg: "var(--toast-success-close-bg)",
    close: "text-[var(--text-muted)]",
  },
  warning: {
    containerBg: "var(--toast-warning-bg)",
    iconBg: "var(--toast-warning-icon-bg)",
    icon: "text-[var(--toast-warning-icon)]",
    closeBg: "var(--toast-warning-close-bg)",
    close: "text-[var(--text-muted)]",
  },
  error: {
    containerBg: "var(--toast-error-bg)",
    iconBg: "var(--toast-error-icon-bg)",
    icon: "text-[var(--toast-error-icon)]",
    closeBg: "var(--toast-error-close-bg)",
    close: "text-[var(--text-muted)]",
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
        { id, variant: toast.variant ?? "neutral", ...toast },
      ]);
      const duration = toast.duration ?? 4000;
      const timeout = window.setTimeout(() => startClose(id), duration);
      timeouts.current.set(id, timeout);
    },
    [startClose]
  );

  useEffect(() => {
    const timeoutsRef = timeouts.current;
    const closingTimeoutsRef = closingTimeouts.current;
    return () => {
      timeoutsRef.forEach((timeout) => window.clearTimeout(timeout));
      timeoutsRef.clear();
      closingTimeoutsRef.forEach((timeout) => window.clearTimeout(timeout));
      closingTimeoutsRef.clear();
    };
  }, []);

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-[72px] z-50 flex w-[360px] max-w-[90vw] flex-col gap-3 sm:top-4 md:right-6 md:top-6">
        {toasts.map((toast) => {
          const variant = toast.variant ?? "neutral";
          const styles = variantStyles[variant];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3 shadow-[var(--shadow-accent-toast)] ${
                toast.closing ? "toast-exit" : "toast-enter"
              }`}
              style={{ backgroundColor: styles.containerBg }}
              role="status"
            >
              <span
                className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: styles.iconBg }}
              >
                {variant === "success" ? (
                  <Check className={`h-5 w-5 ${styles.icon}`} aria-hidden="true" />
                ) : variant === "warning" ? (
                  <AlertTriangle
                    className={`h-5 w-5 ${styles.icon}`}
                    aria-hidden="true"
                  />
                ) : variant === "error" ? (
                  <X className={`h-5 w-5 ${styles.icon}`} aria-hidden="true" />
                ) : variant === "info" ? (
                  <BellOff className={`h-5 w-5 ${styles.icon}`} aria-hidden="true" />
                ) : (
                  <Info className={`h-5 w-5 ${styles.icon}`} aria-hidden="true" />
                )}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--text-strong)]">
                  {toast.title}
                </p>
                {toast.description ? (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {toast.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Fechar notificação"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${styles.close}`}
                style={{ backgroundColor: styles.closeBg }}
                onClick={() => startClose(toast.id)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
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
