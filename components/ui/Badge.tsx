"use client";

import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  teal: "badge--teal",
  blue: "badge--blue",
  green: "badge--green",
  amber: "badge--amber",
  red: "badge--red",
  violet: "badge--violet",
  gray: "badge--gray",
};

export function Badge({
  children,
  tone = "gray",
  className = "",
}: {
  children: React.ReactNode;
  tone?: string;
  className?: string;
}) {
  return (
    <span className={cn("badge", TONES[tone] || TONES.gray, className)}>
      {children}
    </span>
  );
}
