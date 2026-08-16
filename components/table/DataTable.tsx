"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export function DataTable({
  columns,
  rows,
  empty,
  caption,
  className = "",
  rowKey,
  isSelected,
  onRowClick,
  sortState,
  onSort,
}: {
  columns: {
    key: string;
    label: string;
    render?: (row: any) => React.ReactNode;
    className?: string;
    sortable?: boolean;
  }[];
  rows: any[];
  empty?: { iconName?: string; title: string; text?: string };
  caption?: string;
  className?: string;
  rowKey?: (row: any) => string;
  isSelected?: (row: any) => boolean;
  onRowClick?: (row: any) => void;
  sortState?: { key: string; dir: "asc" | "desc" };
  onSort?: (key: string) => void;
}) {
  const sortedRows = useMemo(() => {
    if (!sortState || !onSort) return rows;
    const factor = sortState.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = a[sortState.key];
      const right = b[sortState.key];
      if (typeof left === "number" && typeof right === "number") return (left - right) * factor;
      return String(left ?? "").localeCompare(String(right ?? ""), "ar") * factor;
    });
  }, [rows, sortState, onSort]);

  return (
    <div className={cn("table-wrap", className)}>
      <table className="table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={cn(col.className)}>
                {col.sortable && onSort && sortState ? (
                  <button
                    type="button"
                    className="table__sort"
                    onClick={() => onSort(col.key)}
                  >
                    {col.label}
                    {sortState.key === col.key ? (sortState.dir === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(sortedRows.length === 0 ? rows : sortedRows).length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="empty empty--center" style={{ padding: "var(--s6) var(--s4)" }}>
                  <div className="empty__icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                  </div>
                  <h3 className="empty__title">{empty?.title || "لا توجد بيانات"}</h3>
                  {empty?.text && <p className="empty__text">{empty.text}</p>}
                </div>
              </td>
            </tr>
          ) : (
            sortedRows.map((row, idx) => (
              <tr
                key={rowKey ? rowKey(row) : (row.id || idx)}
                className={cn(isSelected && isSelected(row) && "is-selected")}
                onClick={() => onRowClick?.(row)}
                style={onRowClick ? { cursor: "pointer" } : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn(col.className)}>
                    {col.render ? col.render(row) : (row[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
