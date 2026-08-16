"use client";

import { cn } from "@/lib/utils";

export function InlineLegend({
  items,
  className = "",
}: {
  items: { label: string; color: string }[];
  className?: string;
}) {
  return (
    <div className={cn("row", className)}>
      {items.map((item) => (
        <span key={item.label} className="row" style={{ gap: 4, fontSize: 12, color: "var(--text-2)" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flex: "none" }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
