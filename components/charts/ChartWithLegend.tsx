"use client";

import { cn } from "@/lib/utils";

export function ChartWithLegend({
  chart,
  legend,
  className = "",
}: {
  chart: React.ReactNode;
  legend: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("chart-layout", className)}>
      <div>{chart}</div>
      <div>{legend}</div>
    </div>
  );
}
