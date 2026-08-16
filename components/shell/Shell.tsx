"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Receipt,
  Users,
  Wallet,
  BarChart3,
  CloudUpload,
  Settings,
  Home,
  Search,
  Bell,
  Menu,
  ChevronDown,
  User,

  CheckCircle,
  
  MoreHorizontal,
} from "lucide-react";
import { useAppState } from "@/lib/store";

const NAV_ITEMS = [
  { path: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/pos", label: "نقطة البيع", icon: ShoppingCart },
  { path: "/products", label: "المنتجات", icon: Package },
  { path: "/inventory", label: "المخزون", icon: Warehouse },
  { path: "/invoices", label: "الفواتير", icon: Receipt },
  { path: "/customers", label: "العملاء", icon: Users },
  { path: "/expenses", label: "المصروفات", icon: Wallet },
  { path: "/reports", label: "التقارير", icon: BarChart3 },
  { path: "/backup", label: "النسخ الاحتياطي", icon: CloudUpload },
  { path: "/settings", label: "الإعدادات", icon: Settings },
];

const TAB_ITEMS = [
  { path: "/dashboard", label: "الرئيسية", icon: Home },
  { path: "/pos", label: "البيع", icon: ShoppingCart },
  { path: "/products", label: "المنتجات", icon: Package },
  { path: "/invoices", label: "الفواتير", icon: Receipt },
  { path: "__more", label: "المزيد", icon: MoreHorizontal },
];

function BrandMark() {
  return (
    <svg
      className="brand__mark"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <rect x="6" y="20" width="8" height="20" rx="2" fill="currentColor" />
      <rect x="19" y="12" width="8" height="28" rx="2" fill="#ffffff" />
      <rect x="32" y="4" width="8" height="36" rx="2" fill="currentColor" />
      <path
        d="M6 30 L20 18 L28 24 L42 8"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.9"
      />
    </svg>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, setState } = useAppState();

  const basePath = "/" + pathname.split("/").filter(Boolean)[0] || "/dashboard";

  return (
    <div className="app-shell">
      <aside className="sidebar" id="app-sidebar">
        <div className="brand">
          <BrandMark />
          <span className="brand__name">نظام المبيعات</span>
        </div>
        <nav className="nav" aria-label="التنقل الرئيسي">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = basePath === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`nav__item${isActive ? " nav__item--active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={20} />
                <span className="nav__label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="storage-widget">
          <DatabaseIcon />
          <div className="storage-widget__body">
            <div className="storage-widget__label">التخزين المحلي</div>
            <div className="storage-widget__bar">
              <div
                className="storage-widget__fill"
                style={{ width: "0%" }}
              />
            </div>
            <div className="storage-widget__text">جارٍ الحساب…</div>
          </div>
        </div>
      </aside>

      <header className="topbar">
        <button
          className="topbar__burger"
          type="button"
          aria-label="إظهار القائمة"
          aria-controls="app-sidebar"
          aria-expanded="false"
          onClick={() => setState((s) => ({ ...s, sidebarOpen: !s.sidebarOpen }))}
        >
          <Menu size={22} />
        </button>
        <h1 className="topbar__title">
          {NAV_ITEMS.find((item) => item.path === basePath)?.label || "نظام المبيعات"}
        </h1>
        <div className="topbar__search">
          <div className="search">
            <Search size={18} className="search__icon" />
            <input
              type="search"
              className="input"
              placeholder="بحث"
              aria-label="بحث عام في المنتجات والفواتير والعملاء"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                  console.log("Search:", e.currentTarget.value.trim());
                }
              }}
            />
          </div>
        </div>
        <div className="topbar__actions">
          <div className="conn-status" data-online="true" role="status" title="حالة الاتصال">
            <CheckCircle size={18} />
            <span>جاهز دون اتصال</span>
          </div>
          <button className="icon-btn" type="button" aria-label="التنبيهات">
            <Bell size={20} />
            <span className="icon-btn__badge" hidden>0</span>
          </button>
          <Link href="/settings" className="icon-btn" aria-label="الإعدادات">
            <Settings size={20} />
          </Link>
          <button className="user-chip" type="button" aria-label="حساب المستخدم">
            <span className="user-chip__avatar">
              <User size={18} />
            </span>
            <span className="user-chip__name">المستخدم</span>
            <ChevronDown size={16} className="icon-chev" />
          </button>
        </div>
      </header>

      <main className="main" id="main-content" tabIndex={-1}>
        {children}
      </main>

      <nav className="tabbar" aria-label="التنقل السريع">
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon;
          if (item.path === "__more") {
            return (
              <button
                key={item.path}
                className="tabbar__item"
                type="button"
                onClick={() => setState((s) => ({ ...s, sidebarOpen: true }))}
              >
                <Icon size={22} />
                <span>{item.label}</span>
              </button>
            );
          }
          const isActive = basePath === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`tabbar__item${isActive ? " tabbar__item--active" : ""}`}
            >
              <Icon size={22} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function DatabaseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </svg>
  );
}
