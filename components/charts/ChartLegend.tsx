"use client";

import { cn } from "@/lib/utils";

export function ChartLegend({
  items,
  className = "",
}: {
  items: { label: string; value: string; color: string }[];
  className?: string;
}) {
  return (
    <div className={cn("chart-legend", className)}>
      {items.map((item) => (
        <div key={item.label} className="chart-legend__item">
          <span className="chart-legend__dot" style={{ background: item.color }} />
          <span className="chart-legend__label">{item.label}</span>
          <span className="chart-legend__value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
