"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Download, Upload, Trash2, Eye, Pencil, Package, Database, PackageOpen, PackageX } from "lucide-react";
import { Card, Badge, EmptyState, AlertBox, Button, SearchField, Field, Pagination } from "@/components/ui";
import { DataTable, ThumbCell, ActionButtons, ActionButton } from "@/components/table";
import { Modal, ConfirmDialog, useToast } from "@/components/feedback";
import { FileDrop } from "@/components/ui/FileDrop";
import { cn } from "@/lib/utils";
import { useStore } from "@/components/providers/StoreProvider";
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/app/actions/products";
import type { Product } from "@/repositories/products.repository";

const SYMBOL = "ر.س";

const STOCK_STATUS = { OK: "ok", LOW: "low", OUT: "out" };

function stockStatus(product: { quantity: number; lowStockThreshold?: number }) {
  const threshold = product.lowStockThreshold ?? 5;
  if (product.quantity === 0) return STOCK_STATUS.OUT;
  if (product.quantity <= threshold) return STOCK_STATUS.LOW;
  return STOCK_STATUS.OK;
}

const STOCK_LABEL: Record<string, string> = { ok: "متوفر", low: "منخفض", out: "نفد" };
const STOCK_TONE: Record<string, string> = { ok: "green", low: "amber", out: "red" };

function formatAmount(minor: number) {
  return (minor / 100).toFixed(2);
}

function formatInt(n: number) {
  return String(n);
}

function ltr(text: string) {
  return <span dir="ltr" style={{ unicodeBidi: "isolate", fontFamily: "var(--font-num)" }}>{text}</span>;
}

const MOCK_CATEGORIES = [
  { id: "c1", name: "مشروبات" },
  { id: "c2", name: "أغذية" },
  { id: "c3", name: "تنظيف" },
  { id: "c4", name: "مكتبية" },
];

export default function ProductsPage() {
  const router = useRouter();
  const { toasts, toastOk, toastError, dismiss } = useToast();
  const { storeId } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories] = useState(MOCK_CATEGORIES);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sort, setSort] = useState({ key: "name", dir: "asc" as "asc" | "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [loading, setLoading] = useState(true);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  useEffect(() => {
    async function load() {
      if (!storeId) return;
      setLoading(true);
      try {
        const data = await getProducts(storeId);
        setProducts(data);
      } catch (error) {
        toastError("تعذّر تحميل المنتجات");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [storeId]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    let rows = products.filter((product) => {
      if (categoryFilter !== "all" && product.categoryId !== categoryFilter) return false;
      if (stockFilter !== "all" && stockStatus(product) !== stockFilter) return false;
      if (!term) return true;
      return `${product.name} ${product.sku} ${product.barcode || ""}`
        .toLowerCase()
        .includes(term);
    });

    const { key, dir } = sort;
    const factor = dir === "asc" ? 1 : -1;
    return rows.slice().sort((a, b) => {
      const left = (a as any)[key];
      const right = (b as any)[key];
      if (key === "categoryId") {
        const leftCat = categoryById.get((a as any).categoryId)?.name || "";
        const rightCat = categoryById.get((b as any).categoryId)?.name || "";
        return leftCat.localeCompare(rightCat, "ar") * factor;
      }
      if (typeof left === "number" && typeof right === "number") return (left - right) * factor;
      return String(left ?? "").localeCompare(String(right ?? ""), "ar") * factor;
    });
  }, [products, query, categoryFilter, stockFilter, sort, categoryById]);

  const total = filtered.length;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, maxPage);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const active = products.filter((p) => p.isActive !== false);
  const low = active.filter((p) => stockStatus(p) === STOCK_STATUS.LOW).length;
  const out = active.filter((p) => stockStatus(p) === STOCK_STATUS.OUT).length;
  const stockValue = active.reduce((sum, p) => sum + p.quantity * p.costMinor, 0);

  const handleSort = (key: string) => {
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteProductId || !storeId) return;
    try {
      await deleteProduct(storeId, deleteProductId);
      setProducts((prev) => prev.filter((p) => p.id !== deleteProductId));
      toastOk("تم حذف المنتج");
    } catch {
      toastError("تعذّر حذف المنتج");
    }
    setDeleteProductId(null);
  };

  const handleExport = () => {
    toastOk("تم تصدير المنتجات إلى ملف Excel");
  };

  const handleImport = () => {
    toastOk("تم استيراد المنتجات بنجاح");
    setShowImport(false);
  };

  if (loading) {
    return <Card flush body={<div className="skeleton" style={{ height: 300 }} />} />;
  }

  return (
    <div className="stack">
      <div className="page__head">
        <span />
        <div className="page__actions">
          <Button variant="primary" onClick={() => router.push("/products/new")}>
            <span>إضافة منتج</span>
            <span className="icon"><Plus size={16} /></span>
          </Button>
        </div>
      </div>

      <div className="kpi-grid">
        {[
          { label: "إجمالي المنتجات", value: formatInt(active.length), unit: "منتج", icon: <Package size={22} />, tone: "teal" },
          { label: "قيمة المخزون", value: formatAmount(stockValue), unit: SYMBOL, icon: <Database size={22} />, tone: "blue" },
          { label: "مخزون منخفض", value: formatInt(low), unit: "منتج", icon: <PackageOpen size={22} />, tone: "amber" },
          { label: "غير متوفر", value: formatInt(out), unit: "منتج", icon: <PackageX size={22} />, tone: "red" },
        ].map((kpi, i) => (
          <div key={i} className="kpi">
            <div className="kpi__body">
              <div className="kpi__label">{kpi.label}</div>
              <div className="kpi__value">
                {kpi.value}
                {kpi.unit && <span className="kpi__unit">{kpi.unit}</span>}
              </div>
            </div>
            <div className={cn("kpi__icon", `kpi__icon--${kpi.tone}`)}>
              <span className="icon">{kpi.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <div className="filter-bar__row">
          <div className="field" style={{ flex: 1 }}>
            <label className="field__label">بحث</label>
            <SearchField
              value={query}
              onChange={(v) => { setQuery(v); setPage(1); }}
              placeholder="بحث باسم المنتج أو SKU"
            />
          </div>
          <Field label="الفئة" className="">
            <select
              className="select"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            >
              <option value="all">الكل</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="حالة المخزون" className="">
            <select
              className="select"
              value={stockFilter}
              onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}
            >
              <option value="all">الكل</option>
              <option value={STOCK_STATUS.OK}>متوفر</option>
              <option value={STOCK_STATUS.LOW}>منخفض</option>
              <option value={STOCK_STATUS.OUT}>نفد المخزون</option>
            </select>
          </Field>
          <div className="filter-bar__actions">
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <span>استيراد Excel</span>
              <span className="icon"><Upload size={16} /></span>
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <span>تصدير Excel</span>
              <span className="icon"><Download size={16} /></span>
            </Button>
          </div>
        </div>
      </div>

      <Card flush>
        <DataTable
          caption="قائمة المنتجات"
          sortState={sort}
          onSort={handleSort}
          columns={[
            {
              key: "image",
              label: "صورة",
              render: (product: any) => <ThumbCell src={(product as any).imageUrl || ""} name={product.name} />,
            },
            { key: "sku", label: "SKU", sortable: true, render: (product: any) => ltr(product.sku) },
            {
              key: "name",
              label: "اسم المنتج",
              sortable: true,
              render: (product: any) => (
                <div>
                  <div className="table__main">{product.name}</div>
                  {product.isActive === false && <div className="table__sub">غير نشط</div>}
                </div>
              ),
            },
            {
              key: "categoryId",
              label: "الفئة",
              sortable: true,
              render: (product: any) => categoryById.get(product.categoryId)?.name || "—",
            },
            {
              key: "priceMinor",
              label: "سعر البيع",
              sortable: true,
              render: (product: any) => (
                <span>{ltr(formatAmount(product.priceMinor))} {SYMBOL}</span>
              ),
            },
            {
              key: "quantity",
              label: "المخزون",
              sortable: true,
              render: (product: any) => ltr(String(product.quantity)),
            },
            {
              key: "status",
              label: "الحالة",
              render: (product: any) => {
                const status = stockStatus(product);
                return <Badge tone={STOCK_TONE[status]}>{STOCK_LABEL[status]}</Badge>;
              },
            },
            {
              key: "actions",
              label: "الإجراءات",
              className: "is-actions",
              render: (product: any) => (
                <ActionButtons>
                  <ActionButton
                    label="تعديل"
                    icon={<span className="icon"><Pencil size={16} /></span>}
                    tone="primary"
                    onClick={() => router.push(`/products/${product.id}/edit`)}
                  />
                  <ActionButton
                    label="حذف"
                    icon={<span className="icon"><Trash2 size={16} /></span>}
                    tone="danger"
                    onClick={() => setDeleteProductId(product.id)}
                  />
                  <ActionButton
                    label="عرض"
                    icon={<span className="icon"><Eye size={16} /></span>}
                    onClick={() => router.push(`/products/${product.id}`)}
                  />
                </ActionButtons>
              ),
            },
          ]}
          rows={pageRows}
          empty={
            products.length === 0
              ? { iconName: "products", title: "لا توجد منتجات", text: "ابدأ بإضافة أول منتج، أو استورد قائمتك من ملف Excel." }
              : { iconName: "search", title: "لا نتائج مطابقة", text: "جرّب تعديل البحث أو الفلاتر." }
          }
        />

        {total > 0 && (
          <Pagination
            page={safePage}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        )}
      </Card>

      <ConfirmDialog
        open={!!deleteProductId}
        onClose={() => setDeleteProductId(null)}
        onConfirm={handleDelete}
        title="حذف المنتج"
        message={`سيتم حذف "${products.find((p) => p.id === deleteProductId)?.name || ""}" نهائياً. لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        tone="danger"
      />

      <Modal open={showImport} onClose={() => setShowImport(false)} title="استيراد منتجات من Excel" size="lg" footer={
        <div className="row" style={{ gap: 8 }}>
          <Button variant="primary" onClick={handleImport} disabled>استيراد</Button>
          <Button variant="ghost">تنزيل القالب</Button>
          <Button variant="ghost" onClick={() => setShowImport(false)}>إلغاء</Button>
        </div>
      }>
        <AlertBox type="info">
          يجب أن يحتوي الملف على الأعمدة: SKU، اسم المنتج، الفئة، الوحدة، سعر الشراء، سعر البيع.
        </AlertBox>
        <FileDrop
          onFiles={(files) => {
            if (files.length > 0) {
              toastOk(`تم اختيار ${files[0].name}`);
            }
          }}
          accept=".xlsx"
        />
        <AlertBox type="info" title="معاينة">
          <p>سيتم إنشاء الفئات التالية: مشروبات، أغذية، تنظيف، مكتبية</p>
        </AlertBox>
      </Modal>
    </div>
  );
}
