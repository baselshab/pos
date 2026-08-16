"use client";

import { cn } from "@/lib/utils";

interface Point {
  label: string;
  value: number;
}

export function LineChart({
  points,
  title,
  formatValue,
  height = 250,
  className = "",
}: {
  points: Point[];
  title?: string;
  formatValue?: (v: number) => string;
  height?: number;
  className?: string;
}) {
  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = range * 0.1;
  const yMin = Math.max(0, min - pad);
  const yMax = max + pad;
  const yRange = yMax - yMin || 1;

  const width = 600;
  const chartH = height - 40;
  const chartW = width - 60;

  const toX = (i: number) => 40 + (i / (points.length - 1 || 1)) * chartW;
  const toY = (v: number) => 10 + chartH - ((v - yMin) / yRange) * chartH;

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.value)}`)
    .join(" ");

  const areaD = `${pathD} L ${toX(points.length - 1)} ${10 + chartH} L ${toX(0)} ${10 + chartH} Z`;

  return (
    <div className={cn("chart-holder", className)}>
      {title && <h3 className="card__title" style={{ marginBottom: 8 }}>{title}</h3>}
      <svg viewBox={`0 0 ${width} ${height}`} className="chart" preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = 10 + chartH - t * chartH;
          const val = yMin + t * yRange;
          return (
            <g key={t}>
              <line x1={40} y1={y} x2={width - 10} y2={y} stroke="var(--divider)" strokeWidth="1" />
              <text x={35} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-3)">
                {formatValue ? formatValue(val) : Math.round(val)}
              </text>
            </g>
          );
        })}
        <path d={areaD} fill="var(--teal-soft)" opacity="0.4" />
        <path d={pathD} fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={toX(i)} cy={toY(p.value)} r="4" fill="var(--teal)" stroke="var(--surface)" strokeWidth="2" />
        ))}
        {points.map((p, i) => (
          <text key={`l-${i}`} x={toX(i)} y={height - 4} textAnchor="middle" fontSize="10" fill="var(--text-3)">
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
