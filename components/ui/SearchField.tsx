"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SearchX } from "lucide-react";

export function SearchField({
  value,
  onChange,
  onSearch,
  placeholder = "بحث...",
  className = "",
}: {
  value: string;
  onChange?: (v: string) => void;
  onSearch?: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className={cn("search", focused && "is-focused", className)}>
      <span className="search__icon">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </span>
      <input
        type="text"
        className="input"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && onSearch) onSearch(value); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
      />
      {value && onChange && (
        <button
          type="button"
          className="search__clear"
          onClick={() => onChange("")}
          aria-label="مسح البحث"
        >
          <SearchX size={15} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
