"use client";

import { cn } from "@/lib/utils";

export function CheckboxField({
  label,
  checked,
  onChange,
  id,
  name,
}: {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  name?: string;
}) {
  return (
    <label className="checkbox" htmlFor={id}>
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label && <span>{label}</span>}
    </label>
  );
}
