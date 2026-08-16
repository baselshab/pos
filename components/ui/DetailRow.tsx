"use client";

import { cn } from "@/lib/utils";

export function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="detail-row">
      <div className="detail-row__label">
        {icon && <span className="icon">{icon}</span>}
        {label}
      </div>
      <div className="detail-row__value">{value}</div>
    </div>
  );
}
