"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MoreVertical, Trash2, Edit, Copy, Eye } from "lucide-react";

export function RowMenu({
  items,
  align = "start",
}: {
  items: {
    label: string;
    icon?: React.ReactNode;
    danger?: boolean;
    onClick: () => void;
  }[];
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="row-menu" ref={ref}>
      <button
        type="button"
        className="row-menu__btn"
        onClick={() => setOpen(!open)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="icon"><MoreVertical size={17} /></span>
      </button>
      <div className="row-menu__list" hidden={!open} role="menu">
        {items.map((item, idx) => (
          <button
            key={idx}
            type="button"
            className={cn("row-menu__item", item.danger && "row-menu__item--danger")}
            role="menuitem"
            onClick={() => {
              item.onClick();
              setOpen(false);
            }}
          >
            {item.icon && <span className="icon">{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
