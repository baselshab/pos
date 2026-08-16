"use client";

import { cn } from "@/lib/utils";

export function BarChart({
  points,
  title,
  formatValue,
  height = 250,
  className = "",
}: {
  points: { label: string; value: number }[];
  title?: string;
  formatValue?: (v: number) => string;
  height?: number;
  className?: string;
}) {
  if (points.length === 0) return null;

  const max = Math.max(...points.map((p) => p.value)) || 1;
  const width = 600;
  const chartH = height - 40;
  const chartW = width - 60;
  const barW = Math.min(40, (chartW / points.length) * 0.7);
  const gap = (chartW - barW * points.length) / (points.length + 1);

  return (
    <div className={cn("chart-holder", className)}>
      {title && <h3 className="card__title" style={{ marginBottom: 8 }}>{title}</h3>}
      <svg viewBox={`0 0 ${width} ${height}`} className="chart" preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = 10 + chartH - t * chartH;
          const val = t * max;
          return (
            <g key={t}>
              <line x1={40} y1={y} x2={width - 10} y2={y} stroke="var(--divider)" strokeWidth="1" />
              <text x={35} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-3)">
                {formatValue ? formatValue(val) : Math.round(val)}
              </text>
            </g>
          );
        })}
        {points.map((p, i) => {
          const barH = (p.value / max) * chartH;
          const x = 40 + gap + i * (barW + gap);
          const y = 10 + chartH - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx="4" fill="var(--blue)" />
              <text x={x + barW / 2} y={height - 4} textAnchor="middle" fontSize="10" fill="var(--text-3)">
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
