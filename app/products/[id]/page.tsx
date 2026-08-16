"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, Badge, Button, EmptyState, DetailRow } from "@/components/ui";
import { DataTable, ThumbCell } from "@/components/table";
import { formatAmount, formatInt, formatDateTime, ltr } from "@/lib/mock";
import { bpToPercent } from "@/lib/validation";
import {
  getProduct,
  listCategories,
  movementsForProduct,
  stockStatus,
  STOCK_LABEL,
  STOCK_TONE,
  MOVEMENT,
  MOVEMENT_LABEL,
  MOCK_SETTINGS,
} from "@/lib/mock-products";

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const [product, setProduct] = useState(getProduct(productId));
  const [categories] = useState(() => listCategories());
  const [movements, setMovements] = useState(() => movementsForProduct(productId, 50));

  if (!product) {
    return (
      <div className="stack">
        <Card>
          <EmptyState iconName="search" title="المنتج غير موجود" text="ربما حُذف هذا المنتج." />
        </Card>
      </div>
    );
  }

  const category = categories.find((c) => c.id === product.categoryId);
  const status = stockStatus(product);
  const marginMinor = product.priceMinor - product.costMinor;
  const marginPercent = product.costMinor > 0 ? (marginMinor / product.costMinor) * 100 : 0;
  const symbol = MOCK_SETTINGS.currencySymbol;

  return (
    <div className="stack">
      <nav className="breadcrumb" aria-label="مسار التنقل">
        <Link href="/products" className="breadcrumb__link">
          المنتجات
        </Link>
        <span className="icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </span>
        <span>{product.name}</span>
      </nav>

      <div className="page__head">
        <div className="row">
          <h2 className="page__title">{product.name}</h2>
          <Badge tone={STOCK_TONE[status]}>{STOCK_LABEL[status]}</Badge>
          {product.isActive === false && <Badge tone="gray">غير نشط</Badge>}
        </div>
        <div className="page__actions">
          <Link href={`/products/${product.id}/edit`} className="btn btn--primary">
            <span className="icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </span>
            <span>تعديل</span>
          </Link>
          <Link href="/inventory" className="btn btn--ghost">
            <span>تسوية المخزون</span>
          </Link>
        </div>
      </div>

      <div className="split-layout">
        <div className="stack">
          <Card title="سجل حركات المخزون" titleIcon="history" flush>
            <DataTable
              caption={`حركات مخزون ${product.name}`}
              columns={[
                {
                  key: "createdAt",
                  label: "التاريخ",
                  render: (movement) => ltr(formatDateTime(movement.createdAt, MOCK_SETTINGS.dateFormat)),
                },
                {
                  key: "type",
                  label: "النوع",
                  render: (movement) => (
                    <Badge tone={movement.quantity >= 0 ? "green" : "amber"}>
                      {MOVEMENT_LABEL[movement.type] || movement.type}
                    </Badge>
                  ),
                },
                {
                  key: "quantity",
                  label: "الكمية",
                  render: (movement) => (
                    <span style={{ color: movement.quantity >= 0 ? "var(--green)" : "var(--red)", fontWeight: "600" }}>
                      {ltr(`${movement.quantity >= 0 ? "+" : ""}${movement.quantity}`)}
                    </span>
                  ),
                },
                { key: "balanceAfter", label: "الرصيد بعدها", render: (movement) => ltr(movement.balanceAfter) },
                { key: "reason", label: "السبب" },
                { key: "note", label: "ملاحظة" },
              ]}
              rows={movements}
              empty={{
                iconName: "history",
                title: "لا حركات مسجّلة",
                text: "ستظهر هنا كل إضافة وسحب وبيع لهذا المنتج.",
              }}
            />
          </Card>
        </div>

        <div className="detail-panel stack">
          <Card>
            <div className="stack" style={{ gap: "4px" }}>
              {product.image && (
                <img
                  src={product.image}
                  alt=""
                  style={{ width: "100%", maxHeight: "180px", objectFit: "contain", marginBottom: "12px" }}
                />
              )}
              <DetailRow label="SKU" value={ltr(product.sku)} />
              {product.barcode && <DetailRow label="الباركود" value={ltr(product.barcode)} />}
              <DetailRow label="الفئة" value={category?.name || "—"} />
              <DetailRow label="الوحدة" value={product.unit} />
              <DetailRow label="الكمية الحالية" value={ltr(product.quantity)} />
              <DetailRow label="حد المخزون المنخفض" value={ltr(product.lowStockThreshold)} />
            </div>
          </Card>

          <Card title="التسعير">
            <div className="stack" style={{ gap: "4px" }}>
              <DetailRow
                label="سعر الشراء"
                value={
                  <span>
                    {ltr(formatAmount(product.costMinor))} {symbol}
                  </span>
                }
              />
              <DetailRow
                label="سعر البيع"
                value={
                  <span>
                    {ltr(formatAmount(product.priceMinor))} {symbol}
                  </span>
                }
              />
              <DetailRow
                label="هامش الربح"
                value={
                  <span style={{ color: marginMinor >= 0 ? "var(--green)" : "var(--red)" }}>
                    {ltr(formatAmount(marginMinor))} {symbol} ({marginPercent.toFixed(1)}%)
                  </span>
                }
              />
              <DetailRow label="الضريبة" value={`${bpToPercent(product.taxRateBp)}%`} />
              <DetailRow
                label="قيمة المخزون"
                value={
                  <span>
                    {ltr(formatAmount(product.quantity * product.costMinor))} {symbol}
                  </span>
                }
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
