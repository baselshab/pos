"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, Badge, Button, EmptyState, RowMenu, AlertBox, Field, SearchField, Pagination, Kpi, KpiGrid } from "@/components/ui";
import { DataTable, ThumbCell } from "@/components/table";
import { Modal, Panel } from "@/components/feedback";
import { toastOk, toastError } from "@/components/feedback/Toast";
import { useStore } from "@/components/providers/StoreProvider";
import { getProducts } from "@/app/actions/products";
import { recordAdjustment, recordStocktake } from "@/app/actions/inventory";
import { parseQuantity, validateAdjustment } from "@/lib/validation";
import type { Product } from "@/repositories/products.repository";

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 بايت";
  const units = ["بايت", "كيلوبايت", "ميجابايت", "جيجابايت", "تيرابايت"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`;
}

export default function InventoryPage() {
  const symbol = "ر.س";
  const { storeId } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustDirection, setAdjustDirection] = useState(1);
  const [adjustQuantity, setAdjustQuantity] = useState("0");
  const [adjustReason, setAdjustReason] = useState("تسوية");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustPreview, setAdjustPreview] = useState("");

  const [stocktakeOpen, setStocktakeOpen] = useState(false);
  const [stocktakeProduct, setStocktakeProduct] = useState<Product | null>(null);
  const [stocktakeCounted, setStocktakeCounted] = useState("");
  const [stocktakeNote, setStocktakeNote] = useState("");
  const [stocktakeDiff, setStocktakeDiff] = useState("");

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historyMovements, setHistoryMovements] = useState<any[]>([]);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkInputs, setBulkInputs] = useState<Map<string, string>>(new Map());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const tableHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      if (!storeId) return;
      setLoading(true);
      try {
        const data = await getProducts(storeId);
        setProducts(data);
      } catch (error) {
        toastError("تعذّر تحميل المخزون");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [storeId]);

  const active = products.filter((p) => p.isActive !== false);

  function filtered() {
    const term = query.trim().toLowerCase();
    return active.filter((product) => {
      if (category !== "all" && product.categoryId !== category) return false;
      if (stock !== "all") {
        const threshold = product.lowStockThreshold ?? 5;
        const status = product.quantity === 0 ? "out" : product.quantity <= threshold ? "low" : "ok";
        if (stock !== status) return false;
      }
      if (!term) return true;
      return `${product.name} ${product.sku}`.includes(term);
    });
  }

  const totalUnits = active.reduce((sum, p) => sum + p.quantity, 0);
  const stockValue = active.reduce((sum, p) => sum + p.quantity * p.costMinor, 0);
  const lowCount = active.filter((p) => (p.lowStockThreshold ?? 5) > 0 && p.quantity > 0 && p.quantity <= (p.lowStockThreshold ?? 5)).length;
  const outCount = active.filter((p) => p.quantity === 0).length;

  const rows = filtered();
  const total = rows.length;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  if (page > maxPage) setPage(maxPage);
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  function openAdjustPanel(initialProduct: typeof active[0]) {
    setAdjustProduct(initialProduct);
    setAdjustDirection(1);
    setAdjustQuantity("0");
    setAdjustReason("تسوية");
    setAdjustNote("");
    updateAdjustPreview();
    setAdjustOpen(true);
  }

  function updateAdjustPreview() {
    if (!adjustProduct) return;
    const raw = parseQuantity(adjustQuantity, { allowZero: true });
    const delta = Number.isNaN(raw) ? 0 : raw * adjustDirection;
    const after = adjustProduct.quantity + delta;
    setAdjustPreview(`الرصيد بعد التسوية: ${after} ${adjustProduct.unit}`);
  }

  async function submitAdjust() {
    if (!adjustProduct || !storeId) return;
    const magnitude = parseQuantity(adjustQuantity, { allowZero: false });
    if (Number.isNaN(magnitude) || magnitude <= 0) {
      toastError("أدخل كمية أكبر من صفر");
      return;
    }
    const result = validateAdjustment({
      productId: adjustProduct.id,
      quantity: magnitude * adjustDirection,
      reason: adjustReason,
      note: adjustNote,
    });
    if (!result.ok) {
      const errors = result.errors as Record<string, string>;
      toastError(errors.quantity || errors.reason || "بيانات غير صالحة");
      return;
    }
    try {
      await recordAdjustment(storeId, {
        productId: adjustProduct.id,
        sku: adjustProduct.sku,
        productName: adjustProduct.name,
        type: adjustDirection > 0 ? 'in' : 'out',
        quantity: magnitude * adjustDirection,
        balanceAfter: adjustProduct.quantity + magnitude * adjustDirection,
        reason: adjustReason,
        note: adjustNote,
        actorId: 'current-user',
        dayKey: new Date().toISOString().slice(0, 10)
      });
      toastOk(`تمت تسوية مخزون "${adjustProduct.name}"`);
      setAdjustOpen(false);
    } catch (error) {
      toastError(error instanceof Error ? error.message : "تعذّرت التسوية");
    }
  }

  function openStocktakeModal(product: typeof active[0]) {
    setStocktakeProduct(product);
    setStocktakeCounted(String(product.quantity));
    setStocktakeNote("");
    setStocktakeDiff("");
    setStocktakeOpen(true);
  }

  function updateStocktakeDiff() {
    if (!stocktakeProduct) return;
    const counted = parseQuantity(stocktakeCounted);
    if (Number.isNaN(counted)) {
      setStocktakeDiff("أدخل عدداً صحيحاً غير سالب");
      return;
    }
    const delta = counted - stocktakeProduct.quantity;
    setStocktakeDiff(
      delta === 0
        ? "لا فرق — لن تُسجَّل حركة"
        : `الفرق: ${delta > 0 ? "+" : ""}${delta} ${stocktakeProduct.unit}`
    );
  }

  async function submitStocktake() {
    if (!stocktakeProduct || !storeId) return;
    const counted = parseQuantity(stocktakeCounted);
    if (Number.isNaN(counted)) {
      toastError("أدخل عدداً صحيحاً غير سالب");
      return;
    }
    try {
      await recordStocktake(storeId, stocktakeProduct.id, counted, stocktakeNote);
      setStocktakeOpen(false);
      toastOk("تم تسجيل الجرد");
    } catch (error) {
      toastError(error instanceof Error ? error.message : "تعذّر تسجيل الجرد");
    }
  }

  async function openHistory(product: typeof active[0]) {
    setHistoryProduct(product);
    setHistoryMovements([]);
    setHistoryOpen(true);
  }

  async function openBulkStocktake() {
    const filteredRows = filtered();
    if (filteredRows.length === 0) {
      toastError("لا توجد منتجات مطابقة للفلاتر الحالية");
      return;
    }
    const inputs = new Map<string, string>();
    filteredRows.forEach((p) => inputs.set(p.id, String(p.quantity)));
    setBulkInputs(inputs);
    setBulkOpen(true);
  }

  async function submitBulkStocktake() {
    if (!storeId) return;
    const changes: { product: Product; counted: number }[] = [];
    for (const product of active) {
      const counted = parseQuantity(bulkInputs.get(product.id) || String(product.quantity));
      if (Number.isNaN(counted) || counted === product.quantity) continue;
      changes.push({ product, counted });
    }
    if (changes.length === 0) {
      setBulkOpen(false);
      toastOk("الجرد مطابق لكل الأصناف — لا حركات مسجّلة");
      return;
    }
    setBulkSubmitting(true);
    let applied = 0;
    const failures: string[] = [];
    for (const { product, counted } of changes) {
      try {
        await recordStocktake(storeId, product.id, counted, "جرد شامل");
        applied += 1;
      } catch (error) {
        failures.push(`${product.name}: ${error instanceof Error ? error.message : "خطأ"}`);
      }
    }
    setBulkSubmitting(false);
    setBulkOpen(false);
    if (failures.length > 0) {
      toastError(`سُجّل ${applied} صنفاً، وفشل ${failures.length}. أول خطأ: ${failures[0]}`);
    } else {
      toastOk(`تم تسجيل الجرد لـ ${applied} صنفاً`);
    }
  }

  async function exportToExcel() {
    try {
      const rows = filtered().map((product) => ({
        ...product,
        status: product.quantity === 0 ? "out" : product.quantity <= (product.lowStockThreshold ?? 5) ? "low" : "ok",
        stockValueMinor: product.quantity * product.costMinor,
      }));
      console.log("Export:", rows);
      toastOk("تم تصدير المخزون إلى ملف Excel");
    } catch {
      toastError("تعذّر التصدير");
    }
  }

  return (
    <div className="stack">
      <div className="page__head">
        <span />
        <div className="page__actions">
          <Button variant="primary" onClick={() => openAdjustPanel(active[0] || null)} disabled={active.length === 0}>
            <span className="icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            </span>
            <span>تسوية مخزون</span>
          </Button>
          <Button variant="outline" onClick={openBulkStocktake}>
            <span className="icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
            </span>
            <span>جرد المخزون</span>
          </Button>
          <Button variant="ghost" onClick={exportToExcel}>
            <span className="icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </span>
            <span>تصدير Excel</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <KpiGrid>
          <Kpi variant="stacked" label="إجمالي الوحدات" value="..." unit="وحدة" iconTone="teal" />
          <Kpi variant="stacked" label="قيمة المخزون" value="..." unit={symbol} iconTone="violet" />
          <Kpi variant="stacked" label="مخزون منخفض" value="..." unit="منتجات" iconTone="amber" />
          <Kpi variant="stacked" label="نفد المخزون" value="..." unit="منتجات" iconTone="red" />
        </KpiGrid>
      ) : (
        <KpiGrid>
          <Kpi
            variant="stacked"
            label="إجمالي الوحدات"
            value={String(totalUnits)}
            unit="وحدة"
            iconTone="teal"
            icon={
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16.5 9.4 7.55 4.24" />
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.29 7 12 12 20.71 7" />
                <line x1="12" y1="22" x2="12" y2="12" />
              </svg>
            }
          />
          <Kpi
            variant="stacked"
            label="قيمة المخزون"
            value={String(stockValue)}
            unit={symbol}
            iconTone="violet"
            icon={
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            }
          />
          <Kpi
            variant="stacked"
            label="مخزون منخفض"
            value={String(lowCount)}
            unit="منتجات"
            iconTone="amber"
            icon={
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            }
          />
          <Kpi
            variant="stacked"
            label="نفد المخزون"
            value={String(outCount)}
            unit="منتجات"
            iconTone="red"
            icon={
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16.5 9.4 7.55 4.24" />
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <line x1="3" y1="3" x2="21" y2="21" />
              </svg>
            }
          />
        </KpiGrid>
      )}

      <div className="filter-bar">
        <div className="filter-bar__row">
          <div className="field" style={{ flex: "1 1 240px" }}>
            <label className="field__label">بحث</label>
            <SearchField
              value={query}
              onChange={(v) => {
                setQuery(v);
                setPage(1);
              }}
              placeholder="بحث باسم المنتج أو SKU"
            />
          </div>
          <div className="field">
            <label className="field__label">الفئة</label>
            <select
              className="select"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">الكل</option>
              {Array.from(new Set(products.map(p => p.categoryId).filter(Boolean))).map((cid) => {
                const p = products.find(pp => pp.categoryId === cid);
                return <option key={cid} value={cid}>{p?.categoryId || cid}</option>;
              })}
            </select>
          </div>
          <div className="field">
            <label className="field__label">حالة المخزون</label>
            <select
              className="select"
              value={stock}
              onChange={(e) => {
                setStock(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">الكل</option>
              <option value="ok">متوفر</option>
              <option value="low">منخفض</option>
              <option value="out">نفد المخزون</option>
            </select>
          </div>
          <div className="filter-bar__actions">
            <Button
              variant="ghost"
              onClick={() => {
                setQuery("");
                setCategory("all");
                setStock("all");
                setPage(1);
              }}
            >
              <span className="icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
              <span>مسح الفلاتر</span>
            </Button>
          </div>
        </div>
      </div>

      <Card flush>
        <DataTable
          caption="قائمة المخزون"
          columns={[
            {
              key: "image",
              label: "صورة",
              render: (product: Product) => <ThumbCell src={product.imageUrl || ""} name={product.name} />,
            },
            {
              key: "name",
              label: "اسم المنتج",
              render: (product: Product) => (
                <div>
                  <div className="table__main">{product.name}</div>
                  <div className="table__sub">{product.categoryId || ""}</div>
                </div>
              ),
            },
            { key: "sku", label: "SKU", render: (product: Product) => product.sku },
            {
              key: "quantity",
              label: "الكمية الحالية",
              render: (product: Product) => <span style={{ fontWeight: "600" }}>{String(product.quantity)}</span>,
            },
            {
              key: "lowStockThreshold",
              label: "الحد الأدنى",
              render: (product: Product) => String(product.lowStockThreshold ?? 0),
            },
            {
              key: "status",
              label: "الحالة",
              render: (product: Product) => {
                const threshold = product.lowStockThreshold ?? 5;
                const s = product.quantity === 0 ? "out" : product.quantity <= threshold ? "low" : "ok";
                return <Badge tone={s === "out" ? "red" : s === "low" ? "amber" : "green"}>{s === "out" ? "نفد المخزون" : s === "low" ? "منخفض" : "متوفر"}</Badge>;
              },
            },
            {
              key: "actions",
              label: "الإجراءات",
              className: "is-actions",
              render: (product: Product) => (
                <RowMenu
                  items={[
                    { label: "تسوية مخزون", icon: <SlidersIcon />, onClick: () => openAdjustPanel(product) },
                    { label: "جرد هذا الصنف", icon: <ClipboardIcon />, onClick: () => openStocktakeModal(product) },
                    { label: "سجل الحركات", icon: <HistoryIcon />, onClick: () => openHistory(product) },
                  ]}
                />
              ),
            },
          ]}
          rows={pageRows}
          empty={{
            iconName: "layers",
            title: active.length === 0 ? "لا توجد منتجات" : "لا نتائج مطابقة",
            text: active.length === 0 ? "أضف منتجات لتتمكّن من إدارة المخزون." : "جرّب تعديل البحث أو مسح الفلاتر.",
          }}
        />
        {total > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </Card>

      {/* Adjust Panel */}
      <Panel open={adjustOpen} onClose={() => setAdjustOpen(false)} title="تعديل المخزون">
        <div className="stack">
          <div className="field">
            <label className="field__label">المنتج</label>
            <select
              className="select"
              value={adjustProduct?.id || ""}
              onChange={(e) => {
                const found = active.find((p) => p.id === e.target.value);
                if (found) {
                  setAdjustProduct(found);
                  updateAdjustPreview();
                }
              }}
            >
              {active.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — {item.sku}
                </option>
              ))}
            </select>
          </div>
          <div className="file-preview">
            {adjustProduct?.imageUrl ? (
              <img src={adjustProduct.imageUrl} alt="" />
            ) : (
              <div className="table__thumb table__thumb--ph" style={{ width: "54px", height: "54px" }}>
                <span className="icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16.5 9.4 7.55 4.24" />
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.29 7 12 12 20.71 7" />
                    <line x1="12" y1="22" x2="12" y2="12" />
                  </svg>
                </span>
              </div>
            )}
            <div>
              <div className="file-preview__name">{adjustProduct?.name}</div>
              <div className="file-preview__meta">
                SKU: {adjustProduct && adjustProduct.sku}
              </div>
            </div>
          </div>
          <div className="field">
            <label className="field__label">المخزون الحالي</label>
            <input className="input" value={adjustProduct ? `${adjustProduct.quantity} ${adjustProduct.unit}` : ""} disabled />
          </div>
          <div className="field">
            <label className="field__label">نوع الحركة</label>
            <div className="segmented">
              <button
                type="button"
                className={cn("segmented__btn", adjustDirection === 1 && "is-pressed")}
                aria-pressed={adjustDirection === 1}
                onClick={() => {
                  setAdjustDirection(1);
                  updateAdjustPreview();
                }}
              >
                <span className="icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
                <span>إضافة</span>
              </button>
              <button
                type="button"
                className={cn("segmented__btn", adjustDirection === -1 && "is-pressed")}
                aria-pressed={adjustDirection === -1}
                onClick={() => {
                  setAdjustDirection(-1);
                  updateAdjustPreview();
                }}
              >
                <span className="icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
                <span>سحب</span>
              </button>
            </div>
          </div>
          <div className="field">
            <label className="field__label">الكمية</label>
            <input
              type="number"
              min="0"
              className="input"
              value={adjustQuantity}
              onChange={(e) => {
                setAdjustQuantity(e.target.value);
                updateAdjustPreview();
              }}
            />
            <p className="field__hint" style={{ color: adjustPreview.includes("-") ? "var(--red)" : "var(--text-3)" }}>
              {adjustPreview}
            </p>
          </div>
          <div className="field">
            <label className="field__label">السبب</label>
            <select className="select" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}>
              <option value="تسوية">تسوية</option>
              <option value="جرد">جرد</option>
              <option value="مرتجع">مرتجع</option>
              <option value="تالف">تالف</option>
            </select>
          </div>
          <div className="field">
            <label className="field__label">ملاحظة</label>
            <textarea
              className="textarea"
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
              placeholder="أدخل ملاحظة (اختياري)"
              maxLength={200}
              rows={3}
            />
          </div>
        </div>
        <div className="panel__foot">
          <Button variant="primary" block onClick={submitAdjust}>
            حفظ التسوية
          </Button>
          <Button variant="ghost" block onClick={() => setAdjustOpen(false)}>
            إلغاء
          </Button>
        </div>
      </Panel>

      {/* Stocktake Modal */}
      <Modal
        open={stocktakeOpen}
        onClose={() => setStocktakeOpen(false)}
        title={stocktakeProduct ? `جرد: ${stocktakeProduct.name}` : "جرد"}
        footer={
          <>
            <Button variant="primary" onClick={submitStocktake}>
              حفظ الجرد
            </Button>
            <Button variant="ghost" onClick={() => setStocktakeOpen(false)}>
              إلغاء
            </Button>
          </>
        }
      >
        <AlertBox type="info">
          الجرد يضبط الكمية على ما عددته فعلياً ويسجّل الفرق كحركة بسبب «جرد».
        </AlertBox>
        <div className="field">
          <label className="field__label">الكمية المعدودة فعلياً</label>
          <input
            type="number"
            min="0"
            className="input"
            value={stocktakeCounted}
            onChange={(e) => {
              setStocktakeCounted(e.target.value);
              updateStocktakeDiff();
            }}
          />
          {stocktakeProduct && (
            <p className="field__hint">
              الكمية المسجّلة في النظام: {stocktakeProduct.quantity}
            </p>
          )}
        </div>
        <p className="field__hint" style={{ color: stocktakeDiff.includes("فرق") ? "var(--green)" : stocktakeDiff.includes("لا فرق") ? "var(--text-3)" : "var(--red)" }}>
          {stocktakeDiff}
        </p>
        <div className="field">
          <label className="field__label">ملاحظة</label>
          <textarea
            className="textarea"
            value={stocktakeNote}
            onChange={(e) => setStocktakeNote(e.target.value)}
            placeholder="ملاحظة اختيارية عن الجرد"
            maxLength={200}
            rows={2}
          />
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={historyProduct ? `سجل الحركات: ${historyProduct.name}` : "سجل الحركات"}
        size="lg"
        footer={
          <Button variant="ghost" onClick={() => setHistoryOpen(false)}>
            إغلاق
          </Button>
        }
      >
        <DataTable
          caption="سجل الحركات"
          columns={[
            { key: "createdAt", label: "التاريخ", render: (m: any) => m.createdAt },
            {
              key: "type",
              label: "النوع",
              render: (m: any) => (
                <Badge tone={m.quantity >= 0 ? "green" : "amber"}>
                  {m.type}
                </Badge>
              ),
            },
            {
              key: "quantity",
              label: "الكمية",
              render: (m: any) => (
                <span style={{ color: m.quantity >= 0 ? "var(--green)" : "var(--red)", fontWeight: "600" }}>
                  {m.quantity >= 0 ? "+" : ""}{m.quantity}
                </span>
              ),
            },
            { key: "reason", label: "السبب" },
          ]}
          rows={historyMovements}
          empty={{ iconName: "history", title: "لا حركات", text: "لم تُسجَّل أي حركة لهذا المنتج بعد." }}
        />
      </Modal>

      {/* Bulk Stocktake Modal */}
      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="جرد المخزون"
        size="lg"
        footer={
          <>
            <Button variant="primary" onClick={submitBulkStocktake} disabled={bulkSubmitting}>
              حفظ الجرد
            </Button>
            <Button variant="ghost" onClick={() => setBulkOpen(false)} disabled={bulkSubmitting}>
              إلغاء
            </Button>
          </>
        }
      >
        <AlertBox type="info">
          سيتم جرد {filtered().length} صنفاً حسب الفلاتر الحالية. غيّر الكميات المعدودة ثم احفظ — تُسجَّل حركة لكل فرق فقط.
        </AlertBox>
        <div className="table-wrap" style={{ maxHeight: "52vh" }}>
          <table className="table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>المسجّل</th>
                <th>المعدود فعلياً</th>
              </tr>
            </thead>
            <tbody>
              {filtered().map((product) => (
                <tr key={product.id}>
                  <td>
                    <div>
                      <div className="table__main">{product.name}</div>
                      <div className="table__sub">{product.sku}</div>
                    </div>
                  </td>
                  <td>{String(product.quantity)}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      className="input"
                      value={bulkInputs.get(product.id) || String(product.quantity)}
                      onChange={(e) => {
                        const newInputs = new Map(bulkInputs);
                        newInputs.set(product.id, e.target.value);
                        setBulkInputs(newInputs);
                      }}
                      style={{ width: "110px" }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}

function SlidersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
