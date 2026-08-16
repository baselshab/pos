"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
  onPageChange,
  onPageSizeChange,
  unit,
  sizes,
  pageSizeOptions = [10, 20, 50, 100],
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage?: (page: number) => void;
  onPageSize?: (size: number) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  unit?: string;
  sizes?: number[];
  pageSizeOptions?: number[];
}) {
  const handlePage = onPageChange || onPage || (() => {});
  const handlePageSize = onPageSizeChange || onPageSize || (() => {});
  const options = sizes || pageSizeOptions;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const pages = (): (number | "...")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 3) return [1, 2, 3, 4, "...", totalPages];
    if (page >= totalPages - 2) return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  return (
    <div className="pager">
      <div className="pager__info">
        {total > 0
          ? `عرض ${start}–${end} من ${total}${unit ? ` ${unit}` : ""}`
          : "لا توجد نتائج"}
      </div>
      <div className="pager__controls">
        <button
          className="pager__btn"
          disabled={page <= 1}
          onClick={() => handlePage(page - 1)}
          aria-label="الصفحة السابقة"
        >
          <ChevronRight size={15} />
        </button>
        {pages().map((p, idx) =>
          typeof p === "number" ? (
            <button
              key={idx}
              className={cn("pager__btn", p === page && "is-current")}
              aria-current={p === page ? "page" : undefined}
                onClick={() => handlePage(p)}
            >
              {p}
            </button>
          ) : (
            <span key={idx} className="pager__gap">{p}</span>
          )
        )}
        <button
          className="pager__btn"
          disabled={page >= totalPages}
          onClick={() => handlePage(page + 1)}
          aria-label="الصفحة التالية"
        >
          <ChevronLeft size={15} />
        </button>
      </div>
      {handlePageSize && (
        <div className="pager__size">
          <span>حجم الصفحة</span>
          <select
            className="select"
            value={pageSize}
             onChange={(e) => handlePageSize(Number(e.target.value))}
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
