"use client";

import { cn } from "@/lib/utils";

export function Avatar({
  initials,
  src,
  alt = "",
  size = "md",
  className = "",
}: {
  initials?: string;
  src?: string;
  alt?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn("avatar", size === "sm" && "avatar--sm", className)}
      />
    );
  }

  return (
    <div className={cn("avatar", size === "sm" && "avatar--sm", className)} aria-hidden="true">
      {initials || "?"}
    </div>
  );
}
