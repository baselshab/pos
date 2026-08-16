"use client";

import { cn } from "@/lib/utils";

export function ChipGroup({
  items,
  value,
  onChange,
  label,
}: {
  items: { value: string; label: React.ReactNode }[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <div className="field">
      {label && <span className="field__label">{label}</span>}
      <div className="chips" role="group">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            className={cn("chip", value === item.value && "is-pressed")}
            aria-pressed={value === item.value}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
