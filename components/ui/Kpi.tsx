"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function Kpi({
  label,
  value,
  unit,
  subtext,
  delta,
  icon,
  iconName,
  tone,
  iconTone = "teal",
  href,
  variant = "default",
  link,
}: {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  delta?: { percent?: number; value?: number; label?: string };
  icon?: React.ReactNode;
  iconName?: string;
  tone?: "teal" | "blue" | "green" | "amber" | "red" | "violet";
  iconTone?: "teal" | "blue" | "green" | "amber" | "red" | "violet";
  href?: string;
  variant?: "default" | "stacked" | "tinted";
  link?: { label: string; href: string };
}) {
  const effectiveIconTone = tone || iconTone;

  const DeltaIcon = delta
    ? delta.percent !== undefined
      ? delta.percent > 0
        ? TrendingUp
        : delta.percent < 0
          ? TrendingDown
          : Minus
      : delta.value !== undefined
        ? delta.value > 0
          ? TrendingUp
          : delta.value < 0
            ? TrendingDown
            : Minus
        : null
    : null;

  const deltaClass = delta
    ? delta.percent !== undefined
      ? delta.percent > 0
        ? "kpi__delta--up"
        : delta.percent < 0
          ? "kpi__delta--down"
          : "kpi__delta--flat"
      : delta.value !== undefined
        ? delta.value > 0
          ? "kpi__delta--up"
          : delta.value < 0
            ? "kpi__delta--down"
            : "kpi__delta--flat"
        : undefined
    : undefined;

  const displayIcon = icon || (iconName ? <span className="icon">{iconName}</span> : null);

  const content = (
    <div className={cn("kpi", variant === "stacked" && "kpi--stacked")}>
      {variant === "stacked" && displayIcon && (
        <div className="kpi__top">
          <div className={cn("kpi__icon", `kpi__icon--${iconTone}`)}>
            <span className="icon">{displayIcon}</span>
          </div>
          {link && (
            <a href={link.href} className="kpi__link">
              {link.label}
            </a>
          )}
        </div>
      )}
      <div className="kpi__body">
        <div className="kpi__label">{label}</div>
        <div className="kpi__value">
          {value}
          {unit && <span className="kpi__unit">{unit}</span>}
          {subtext && <span className="kpi__unit">{subtext}</span>}
        </div>
        {delta && (
          <div className={cn("kpi__delta", deltaClass)}>
            {DeltaIcon && <DeltaIcon size={12} />}
            <span>
              {delta.percent !== undefined ? `${Math.abs(delta.percent)}%` : delta.value !== undefined ? Math.abs(delta.value) : ""}
              {delta.label && ` ${delta.label}`}
            </span>
          </div>
        )}
        {variant !== "stacked" && link && (
          <a href={link.href} className="kpi__link" style={{ fontSize: "12.5px", color: "var(--blue)", marginTop: "6px", display: "inline-block" }}>
            {link.label}
          </a>
        )}
      </div>
      {variant !== "stacked" && displayIcon && (
        <div className={cn("kpi__icon", `kpi__icon--${iconTone}`)}>
          <span className="icon">{displayIcon}</span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="kpi-grid__item" style={{ textDecoration: "none", color: "inherit" }}>
        {content}
      </a>
    );
  }

  return content;
}
