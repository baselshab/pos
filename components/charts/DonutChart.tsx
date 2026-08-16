"use client";

import { cn } from "@/lib/utils";

interface Slice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  slices,
  title,
  size = 200,
  className = "",
}: {
  slices: Slice[];
  title?: string;
  size?: number;
  className?: string;
}) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) - 16;
  const innerR = r * 0.6;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const paths = slices.map((slice) => {
    const pct = total > 0 ? slice.value / total : 0;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const path = (
      <circle
        key={slice.label}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={slice.color}
        strokeWidth={16}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={-offset}
        strokeLinecap="butt"
      />
    );
    offset += dash;
    return path;
  });

  return (
    <div className={cn("chart-holder", className)}>
      {title && <h3 className="card__title" style={{ marginBottom: 8 }}>{title}</h3>}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--divider)" strokeWidth={16} />
          {paths}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--text)">
            {total}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="var(--text-3)">
            إجمالي
          </text>
        </svg>
      </div>
    </div>
  );
}
