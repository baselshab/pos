"use client";

import { cn } from "@/lib/utils";

export function Card({
  title,
  titleIcon,
  body,
  footer,
  flush = false,
  className = "",
  children,
  actions,
  style,
}: {
  title?: string;
  titleIcon?: React.ReactNode;
  body?: React.ReactNode;
  footer?: React.ReactNode;
  flush?: boolean;
  className?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const content = body ?? children;
  return (
    <div className={cn("card", !flush && "card--padded", className)} style={style}>
      {(title || titleIcon) && (
        <div className="card__head">
          {titleIcon && <span className="card__icon">{titleIcon}</span>}
          {title && <h3 className="card__title">{title}</h3>}
          {actions && <div className="card__actions">{actions}</div>}
        </div>
      )}
      <div className={cn("card__body", flush && "card__body--flush")}>{content}</div>
      {footer && <div className="card__footer">{footer}</div>}
    </div>
  );
}
