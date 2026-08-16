"use client";

import { cn } from "@/lib/utils";

export function ActionButton({
  label,
  icon,
  tone = "default",
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  tone?: "default" | "primary" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn("icon-btn", tone === "danger" && "icon-btn--danger")}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {icon && <span className="icon">{icon}</span>}
    </button>
  );
}
