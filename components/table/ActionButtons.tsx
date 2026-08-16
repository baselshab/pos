"use client";

import { cn } from "@/lib/utils";
import { ActionButton } from "./ActionButton";

export function ActionButtons({
  children,
  className = "",
}: {
  children: React.ReactNode[];
  className?: string;
}) {
  return (
    <div className={cn("table__actions", className)}>
      {children}
    </div>
  );
}
