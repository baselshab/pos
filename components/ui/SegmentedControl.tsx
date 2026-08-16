"use client";

import { cn } from "@/lib/utils";

export function SegmentedControl({
  items,
  value,
  onChange,
  color = "blue",
}: {
  items: { value: string; label: React.ReactNode }[];
  value: string;
  onChange: (value: string) => void;
  color?: "blue" | "green";
}) {
  return (
    <div className="segmented" role="group">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className={cn(
            "segmented__btn",
            value === item.value && "is-pressed",
            value === item.value && color === "green" && "is-green"
          )}
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
