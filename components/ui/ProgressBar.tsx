"use client";

import { cn } from "@/lib/utils";

export function ProgressBar({
  value = 0,
  max = 100,
  tone = "default",
}: {
  value?: number;
  max?: number;
  tone?: "default" | "warn" | "danger";
}) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={cn(
          "progress__fill",
          tone === "warn" && "is-warn",
          tone === "danger" && "is-danger"
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
