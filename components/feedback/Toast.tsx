"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

type ToastType = "ok" | "error" | "warn" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, title?: string) => void;
  removeToast: (id: string) => void;
  dismiss: (id: string) => void;
  toastOk: (message: string, title?: string) => void;
  toastError: (message: string, title?: string) => void;
  toastWarn: (message: string, title?: string) => void;
  toastInfo: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string, title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ type: ToastType; message: string; title?: string }>).detail;
      if (detail?.type && detail?.message) {
        addToast(detail.type, detail.message, detail.title);
      }
    };
    window.addEventListener("app-toast", handler as EventListener);
    return () => window.removeEventListener("app-toast", handler as EventListener);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, dismiss: removeToast, toastOk, toastError, toastWarn, toastInfo }}>
      {children}
      <div className="toast-region">
        {toasts.map((toast) => (
          <div key={toast.id} className={cn("toast", `toast--${toast.type}`)}>
            <span className="icon">
              {toast.type === "ok" && (
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
              {toast.type === "error" && (
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              )}
              {toast.type === "warn" && (
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              )}
              {toast.type === "info" && (
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              )}
            </span>
            <div className="toast__body">
              {toast.title && <div className="toast__title">{toast.title}</div>}
              <div>{toast.message}</div>
            </div>
            <button type="button" className="toast__close" onClick={() => removeToast(toast.id)} aria-label="إغلاق">
              <span className="icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

export function toastOk(message: string, title?: string) {
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { type: "ok" as ToastType, message, title } }));
}

export function toastError(message: string, title?: string) {
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { type: "error" as ToastType, message, title } }));
}

export function toastWarn(message: string, title?: string) {
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { type: "warn" as ToastType, message, title } }));
}

export function toastInfo(message: string, title?: string) {
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { type: "info" as ToastType, message, title } }));
}
