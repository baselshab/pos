"use client";

import { cn } from "@/lib/utils";
import { Kpi } from "./Kpi";

export function KpiGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("kpi-grid", className)}>{children}</div>;
}
