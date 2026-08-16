"use client";

import { useState, useCallback, createContext, useContext, useRef } from "react";
import { Modal } from "./Modal";
import { Button } from "@/components/ui/Button";

type DialogType = "confirm" | "prompt";

interface DialogState {
  type: DialogType;
  title: string;
  message?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  resolve: (value: boolean | string | null) => void;
}

const DialogContext = createContext<{
  openConfirm: (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }) => Promise<boolean>;
  openPrompt: (opts: {
    title: string;
    label?: string;
    placeholder?: string;
    defaultValue?: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }) => Promise<string | null>;
} | null>(null);

export function ConfirmDialog({
  open,
  onClose,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  tone = "default",
  extra,
}: {
  open: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  extra?: React.ReactNode;
}) {
  const handleClose = onClose || onCancel || (() => {});
  if (!open) return null;

  return (
    <Modal open={open} onClose={handleClose} title={title} footer={
      <>
        <Button variant="ghost" onClick={onClose}>{cancelLabel}</Button>
        <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
      </>
    }>
      <div className="stack" style={{ gap: "12px" }}>
        {message && <p>{message}</p>}
        {extra}
      </div>
    </Modal>
  );
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const [inputValue, setInputValue] = useState("");

  const openConfirm = useCallback(
    (opts: {
      title: string;
      message: string;
      confirmLabel?: string;
      cancelLabel?: string;
    }): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          type: "confirm",
          title: opts.title,
          message: opts.message,
          confirmLabel: opts.confirmLabel || "تأكيد",
          cancelLabel: opts.cancelLabel || "إلغاء",
          resolve: resolve as (value: boolean | string | null) => void,
        });
      });
    },
    []
  );

  const openPrompt = useCallback(
    (opts: {
      title: string;
      label?: string;
      placeholder?: string;
      defaultValue?: string;
      confirmLabel?: string;
      cancelLabel?: string;
    }): Promise<string | null> => {
      return new Promise((resolve) => {
        setInputValue(opts.defaultValue || "");
        setState({
          type: "prompt",
          title: opts.title,
          label: opts.label,
          placeholder: opts.placeholder,
          confirmLabel: opts.confirmLabel || "موافق",
          cancelLabel: opts.cancelLabel || "إلغاء",
          resolve: resolve as (value: boolean | string | null) => void,
        });
      });
    },
    []
  );

  const handleClose = () => {
    if (!state) return;
    if (state.type === "prompt") {
      state.resolve(null);
    } else {
      state.resolve(false);
    }
    setState(null);
  };

  const handleConfirm = () => {
    if (!state) return;
    if (state.type === "prompt") {
      state.resolve(inputValue);
    } else {
      state.resolve(true);
    }
    setState(null);
  };

  return (
    <DialogContext.Provider value={{ openConfirm, openPrompt }}>
      {children}
      {state && (
        <Modal
          open={true}
          onClose={handleClose}
          title={state.title}
          footer={
            <>
              <Button variant="ghost" onClick={handleClose}>
                {state.cancelLabel || "إلغاء"}
              </Button>
              <Button variant="primary" onClick={handleConfirm}>
                {state.confirmLabel || "تأكيد"}
              </Button>
            </>
          }
        >
          {state.type === "confirm" && <p>{state.message}</p>}
          {state.type === "prompt" && (
            <div className="field">
              {state.label && (
                <label className="field__label">
                  {state.label}
                </label>
              )}
              <input
                className="input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={state.placeholder}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirm();
                }}
                autoFocus
              />
            </div>
          )}
        </Modal>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) throw new Error("useDialog must be used within DialogProvider");
  return context;
}

export function confirmDialog(opts: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type === "confirm-dialog") {
        window.removeEventListener("app-dialog-response", handler as EventListener);
        resolve(detail.value as boolean);
      }
    };
    window.addEventListener("app-dialog-response", handler as EventListener);
    window.dispatchEvent(
      new CustomEvent("app-dialog-request", {
        detail: { ...opts, type: "confirm" },
      })
    );
  });
}

export function promptDialog(opts: {
  title: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type === "prompt-dialog-response") {
        window.removeEventListener("app-dialog-response", handler as EventListener);
        resolve(detail.value as string | null);
      }
    };
    window.addEventListener("app-dialog-response", handler as EventListener);
    window.dispatchEvent(
      new CustomEvent("app-dialog-request", {
        detail: { ...opts, type: "prompt" },
      })
    );
  });
}
