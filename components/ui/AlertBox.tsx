"use client";

import { cn } from "@/lib/utils";
import { Info, AlertTriangle, XCircle, CheckCircle } from "lucide-react";

const STYLES: Record<string, { className: string; icon: React.ReactNode }> = {
  info: { className: "alert--info", icon: <Info size={18} /> },
  warn: { className: "alert--warn", icon: <AlertTriangle size={18} /> },
  error: { className: "alert--error", icon: <XCircle size={18} /> },
  ok: { className: "alert--ok", icon: <CheckCircle size={18} /> },
};

export function AlertBox({
  type = "info",
  tone,
  title,
  children,
}: {
  type?: "info" | "warn" | "error" | "ok";
  tone?: "info" | "warn" | "error" | "ok";
  title?: string;
  children: React.ReactNode;
}) {
  const effectiveType = tone || type;
  const style = STYLES[effectiveType];

  return (
    <div className={cn("alert", style.className)} role="alert">
      <span className="icon">{style.icon}</span>
      <div>
        {title && <div style={{ fontWeight: 700, marginBottom: 2 }}>{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}
