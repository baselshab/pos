"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Wallet,
  Receipt,
  Package,
  ArrowDown,
  History,
  Printer,
  Download,
  Filter,
  RefreshCw,
  PieChart,
  ShoppingBag,
  Tag,
} from "lucide-react";
import { Card, Badge, EmptyState, AlertBox, Button, Field, Kpi, KpiGrid } from "@/components/ui";
import { DataTable } from "@/components/table/DataTable";
import { BarChart, DonutChart, LineChart, ChartLegend, ChartWithLegend, InlineLegend } from "@/components/charts";
import { Modal, useToast } from "@/components/feedback";
import { cn } from "@/lib/utils";
import { useStore } from "@/components/providers/StoreProvider";
import { getSales } from "@/app/actions/sales";
import { getExpenses } from "@/app/actions/expenses";

const SYMBOL = "ر.س";

const REPORT_TYPES = [
  { value: "sales", label: "ملخص المبيعات" },
  { value: "salesExpenses", label: "المبيعات والمصروفات" },
  { value: "profit", label: "الربح التقديري" },
  { value: "topProducts", label: "الأكثر مبيعاً" },
  { value: "category", label: "المبيعات حسب الفئة" },
  { value: "payments", label: "طرق الدفع" },
  { value: "stock", label: "المخزون المنخفض والمنعدم" },
  { value: "movements", label: "حركات المخزون" },
];

const PRESETS = [
  { value: "today", label: "اليوم" },
  { value: "last7", label: "آخر 7 أيام" },
  { value: "last30", label: "آخر 30 يوماً" },
  { value: "month", label: "هذا الشهر" },
  { value: "prevMonth", label: "الشهر الماضي" },
  { value: "year", label: "هذه السنة" },
];

function formatAmount(minor: number) {
  return (minor / 100).toFixed(2);
}

function formatInt(n: number) {
  return n.toLocaleString("ar-SA");
}

const MOCK_SALES_SERIES = [
  { key: "2026-08-08", salesMinor: 45000, expensesMinor: 12000 },
  { key: "2026-08-09", salesMinor: 52000, expensesMinor: 15000 },
  { key: "2026-08-10", salesMinor: 38000, expensesMinor: 10000 },
  { key: "2026-08-11", salesMinor: 61000, expensesMinor: 18000 },
  { key: "2026-08-12", salesMinor: 55000, expensesMinor: 14000 },
  { key: "2026-08-13", salesMinor: 72000, expensesMinor: 20000 },
  { key: "2026-08-14", salesMinor: 48000, expensesMinor: 11000 },
];

const MOCK_TOP_PRODUCTS = [
  { name: "قهوة عربية", sku: "BEV-001", quantity: 45, revenueMinor: 540000, costMinor: 270000 },
  { name: "أرز بسمتي", sku: "FOOD-002", quantity: 28, revenueMinor: 238000, costMinor: 140000 },
  { name: "زيت زيتون", sku: "FOOD-003", quantity: 15, revenueMinor: 375000, costMinor: 270000 },
  { name: "صابون يد", sku: "CLN-001", quantity: 38, revenueMinor: 133000, costMinor: 68400 },
  { name: "خبز أبيض", sku: "FOOD-001", quantity: 62, revenueMinor: 31000, costMinor: 12400 },
];

const MOCK_CATEGORY_SLICES = [
  { label: "مشروبات", value: 850000, color: "#0E9C8A" },
  { label: "أغذية", value: 650000, color: "#1B63E3" },
  { label: "تنظيف", value: 180000, color: "#B45309" },
  { label: "مكتبية", value: 120000, color: "#7C5CE0" },
];

const MOCK_PAYMENT_SLICES = [
  { label: "نقدي", value: 1200000, color: "#12855A" },
  { label: "آجل", value: 450000, color: "#DC2626" },
];

const MOCK_STOCK_REPORT = {
  all: [],
  low: [
    { name: "منظف أرضيات", sku: "CLN-002", categoryName: "تنظيف", quantity: 0, lowStockThreshold: 5, status: "out", stockValueMinor: 0 },
    { name: "ورق طباعة", sku: "OFF-001", categoryName: "مكتبية", quantity: 3, lowStockThreshold: 10, status: "low", stockValueMinor: 240000 },
    { name: "زيت زيتون", sku: "FOOD-003", categoryName: "أغذية", quantity: 4, lowStockThreshold: 8, status: "low", stockValueMinor: 720000 },
  ],
  out: [
    { name: "منظف أرضيات", sku: "CLN-002", categoryName: "تنظيف", quantity: 0, lowStockThreshold: 5, status: "out", stockValueMinor: 0 },
  ],
  totalProducts: 120,
  totalUnits: 1500,
  stockValueMinor: 4500000,
  retailValueMinor: 6800000,
};

const MOCK_MOVEMENTS = [
  { reason: "بيع", count: 45, increases: 0, decreases: 120 },
  { reason: "جرد", count: 2, increases: 5, decreases: 3 },
  { reason: "تسوية", count: 3, increases: 20, decreases: 15 },
  { reason: "مرتجع", count: 1, increases: 2, decreases: 0 },
];

export default function ReportsPage() {
  const toast = useToast();
  const { storeId } = useStore();
  const [reportType, setReportType] = useState("sales");
  const [from, setFrom] = useState("2026-08-08");
  const [to, setTo] = useState("2026-08-14");
  const [preset, setPreset] = useState("last7");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const rangeLabel = `${from} — ${to}`;

  const load = async () => {
    setLoading(true);
    try {
      const [salesData, expensesData] = await Promise.all([
        storeId ? getSales(storeId) : Promise.resolve([]),
        storeId ? getExpenses(storeId) : Promise.resolve([])
      ]);
      setData({
        current: { revenueMinor: 361000, expensesMinor: 90000, estimatedProfitMinor: 271000, invoiceCount: salesData.length, taxMinor: 18000, netRevenueMinor: 343000, costMinor: 90000, grossProfitMinor: 253000 },
        prior: { revenueMinor: 320000, expensesMinor: 85000, estimatedProfitMinor: 235000, invoiceCount: 10 },
        categorySlices: MOCK_CATEGORY_SLICES,
        expenseSlices: MOCK_CATEGORY_SLICES,
        stock: MOCK_STOCK_REPORT,
        movements: { byReason: MOCK_MOVEMENTS },
      });
    } catch (error) {
      toast.toastError("تعذّر تحميل التقرير");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [storeId]);

  const kpis = data ? [
    { label: "إجمالي المبيعات", value: `${formatAmount(data.current.revenueMinor)} ${SYMBOL}`, iconName: "basket", tone: "green" as const, delta: { percent: 12.8, label: "مقارنة بالفترة السابقة" } },
    { label: "إجمالي المصروفات", value: `${formatAmount(data.current.expensesMinor)} ${SYMBOL}`, iconName: "wallet", tone: "amber" as const, delta: { percent: 5.9, label: "مقارنة بالفترة السابقة" } },
    { label: "الربح التقديري", value: `${formatAmount(data.current.estimatedProfitMinor)} ${SYMBOL}`, iconName: "pie", tone: "teal" as const, delta: { percent: 15.4, label: "مقارنة بالفترة السابقة" } },
    { label: "عدد الفواتير", value: formatInt(data.current.invoiceCount), unit: "فاتورة", iconName: "receipt", tone: "blue" as const },
  ] : [];

  const reportBody = () => {
    if (!data) return null;
    switch (reportType) {
      case "salesExpenses":
        return (
          <div className="stack">
            <Card title="المبيعات والمصروفات">
              <div>
                <InlineLegend items={[
                  { label: `المبيعات (${SYMBOL})`, color: "#12855A" },
                  { label: `المصروفات (${SYMBOL})`, color: "#DC2626" },
                ]} />
                <BarChart
                  title="المبيعات والمصروفات اليومية"
                  points={MOCK_SALES_SERIES.map(p => ({ label: p.key, value: p.salesMinor / 100 }))}
                />
              </div>
            </Card>
            {(data.expenseSlices as unknown as typeof MOCK_CATEGORY_SLICES).length > 0 && (
              <Card title="المصروفات حسب الفئة">
                <ChartWithLegend
                  chart={<DonutChart slices={(data.expenseSlices as unknown as typeof MOCK_CATEGORY_SLICES).map((s, i) => ({ ...s, color: s.color || ["#0E9C8A", "#1B63E3", "#B45309", "#7C5CE0"][i % 4] }))} title="المصروفات حسب الفئة" />}
                  legend={<ChartLegend items={(data.expenseSlices as unknown as typeof MOCK_CATEGORY_SLICES).map((s, i) => ({ label: s.label, value: `${formatAmount(s.value)} ${SYMBOL}`, color: s.color || ["#0E9C8A", "#1B63E3", "#B45309", "#7C5CE0"][i % 4] }))} />}
                />
              </Card>
            )}
          </div>
        );

      case "profit":
        return (
          <div className="stack">
            <Card title="مكوّنات الربح التقديري">
              <div className="stack" style={{ gap: "2px" }}>
                {[
                  { label: "إجمالي المبيعات (شامل الضريبة)", value: 361000 },
                  { label: "الضريبة المحصّلة", value: -18000 },
                  { label: "صافي الإيراد", value: 343000, strong: true },
                  { label: "تكلفة البضاعة المباعة", value: -90000 },
                  { label: "مجمل الربح", value: 253000, strong: true },
                  { label: "المصروفات التشغيلية", value: -90000 },
                  { label: "الربح التقديري", value: 271000, strong: true, highlight: true },
                ].map((row, i) => (
                  <div key={i} className={cn("invoice-totals__row", row.highlight && "bg-[var(--green-soft)]")} style={row.highlight ? { fontSize: "16px" } : undefined}>
                    <span style={row.strong ? { fontWeight: 700 } : undefined}>{row.label}</span>
                    <span style={{ fontWeight: row.strong ? 700 : 600, color: row.value < 0 ? "var(--red)" : row.highlight || row.strong ? "var(--green)" : "inherit" }}>
                      {formatAmount(Math.abs(row.value))} {SYMBOL}
                    </span>
                  </div>
                ))}
              </div>
              <p className="field__hint" style={{ marginTop: "12px" }}>
                التكلفة محسوبة من سعر شراء المنتج المحفوظ داخل كل سطر فاتورة وقت البيع.
              </p>
            </Card>
            <Card title="اتجاه المبيعات">
              <LineChart
                points={MOCK_SALES_SERIES.map(p => ({ label: p.key, value: p.salesMinor / 100 }))}
                title="اتجاه المبيعات"
              />
            </Card>
          </div>
        );

      case "topProducts":
        return (
          <Card flush title="الأكثر مبيعاً">
            <DataTable
              caption="المنتجات الأكثر مبيعاً"
              columns={[
                { key: "name", label: "المنتج", render: (row: typeof MOCK_TOP_PRODUCTS[0]) => (
                  <div>
                    <div className="table__main">{row.name}</div>
                    <div className="table__sub">{row.sku}</div>
                  </div>
                ) },
                { key: "quantity", label: "الكمية المباعة", render: (row) => formatInt(row.quantity) },
                { key: "revenueMinor", label: "الإيراد", render: (row) => `${formatAmount(row.revenueMinor)} ${SYMBOL}` },
                { key: "profit", label: "الربح", render: (row) => {
                  const profit = row.revenueMinor - row.costMinor;
                  return <span style={{ color: profit >= 0 ? "var(--green)" : "var(--red)" }}>{formatAmount(profit)} {SYMBOL}</span>;
                } },
              ]}
              rows={[...MOCK_TOP_PRODUCTS, { name: "الإجمالي", sku: "", quantity: MOCK_TOP_PRODUCTS.reduce((s, i) => s + i.quantity, 0), revenueMinor: MOCK_TOP_PRODUCTS.reduce((s, i) => s + i.revenueMinor, 0), costMinor: MOCK_TOP_PRODUCTS.reduce((s, i) => s + i.costMinor, 0) }]}
              empty={{ iconName: "products", title: "لا مبيعات في هذه الفترة", text: "لم يُبَع أي منتج بين هذين التاريخين." }}
            />
          </Card>
        );

      case "category":
        return (
          <Card title="المبيعات حسب الفئة">
            {MOCK_CATEGORY_SLICES.length === 0 ? (
              <EmptyState iconName="tag" title="لا مبيعات" text="لا توجد مبيعات في هذه الفترة." />
            ) : (
              <ChartWithLegend
                chart={<DonutChart slices={MOCK_CATEGORY_SLICES.map((s, i) => ({ ...s, color: s.color || ["#0E9C8A", "#1B63E3", "#B45309", "#7C5CE0"][i % 4] }))} title="المبيعات حسب الفئة" />}
                legend={<ChartLegend items={MOCK_CATEGORY_SLICES.map((s, i) => ({ label: s.label, value: `${((s.value / MOCK_CATEGORY_SLICES.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%`, color: s.color || ["#0E9C8A", "#1B63E3", "#B45309", "#7C5CE0"][i % 4] }))} />}
              />
            )}
          </Card>
        );

      case "payments":
        return (
          <Card title="طرق الدفع">
            {MOCK_PAYMENT_SLICES.length === 0 ? (
              <EmptyState iconName="wallet" title="لا مبيعات" text="لا توجد مبيعات في هذه الفترة." />
            ) : (
              <ChartWithLegend
                chart={<DonutChart slices={MOCK_PAYMENT_SLICES} title="طرق الدفع" />}
                legend={<ChartLegend items={MOCK_PAYMENT_SLICES.map((s) => ({ label: s.label, value: `${((s.value / MOCK_PAYMENT_SLICES.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%`, color: s.color }))} />}
              />
            )}
          </Card>
        );

      case "stock":
        return (
          <div className="stack">
            <div className="grid-3">
              <Kpi label="إجمالي الأصناف" value={formatInt(MOCK_STOCK_REPORT.totalProducts)} unit="صنف" iconName="products" tone="blue" />
              <Kpi label="مخزون منخفض" value={formatInt(MOCK_STOCK_REPORT.low.length)} unit="صنف" iconName="arrow-down" tone="amber" />
              <Kpi label="نفد المخزون" value={formatInt(MOCK_STOCK_REPORT.out.length)} unit="صنف" iconName="package-x" tone="red" />
            </div>
            <Card flush title="الأصناف التي تحتاج إعادة طلب">
              <DataTable
                caption="المخزون المنخفض والمنعدم"
                columns={[
                  { key: "name", label: "المنتج", render: (row: typeof MOCK_STOCK_REPORT.low[0]) => (
                    <div>
                      <div className="table__main">{row.name}</div>
                      <div className="table__sub">{row.sku}</div>
                    </div>
                  ) },
                  { key: "categoryName", label: "الفئة" },
                  { key: "quantity", label: "الكمية", render: (row) => <span style={{ color: row.quantity === 0 ? "var(--red)" : "var(--amber)", fontWeight: 700 }}>{row.quantity}</span> },
                  { key: "lowStockThreshold", label: "الحد الأدنى", render: (row) => row.lowStockThreshold },
                  { key: "status", label: "الحالة", render: (row) => <Badge tone={row.status === "out" ? "red" : "amber"}>{row.status === "out" ? "نفد المخزون" : "منخفض"}</Badge> },
                  { key: "stockValueMinor", label: "قيمة المخزون", render: (row) => `${formatAmount(row.stockValueMinor)} ${SYMBOL}` },
                ]}
                rows={[...MOCK_STOCK_REPORT.out, ...MOCK_STOCK_REPORT.low]}
                empty={{ iconName: "check-circle", title: "المخزون بحالة جيدة", text: "لا توجد أصناف تحت الحد الأدنى." }}
              />
            </Card>
          </div>
        );

      case "movements":
        return (
          <Card flush title="حركات المخزون مجمّعة حسب السبب">
            <DataTable
              caption="ملخص حركات المخزون"
              columns={[
                { key: "reason", label: "السبب" },
                { key: "count", label: "عدد الحركات", render: (row) => formatInt(row.count) },
                { key: "increases", label: "إجمالي الإضافة", render: (row) => <span style={{ color: "var(--green)" }}>+{row.increases}</span> },
                { key: "decreases", label: "إجمالي السحب", render: (row) => <span style={{ color: "var(--red)" }}>-{row.decreases}</span> },
              ]}
              rows={MOCK_MOVEMENTS}
              empty={{ iconName: "history", title: "لا حركات", text: "لم تُسجَّل حركات مخزون في هذه الفترة." }}
            />
          </Card>
        );

      case "sales":
      default:
        return (
          <div className="stack">
            <div className="grid-2">
              <Card title="المبيعات والمصروفات">
                <div>
                  <InlineLegend items={[
                    { label: `المبيعات (${SYMBOL})`, color: "#12855A" },
                    { label: `المصروفات (${SYMBOL})`, color: "#DC2626" },
                  ]} />
                  <BarChart
                    title="المبيعات والمصروفات"
                    points={MOCK_SALES_SERIES.map(p => ({ label: p.key, value: p.salesMinor / 100 }))}
                  />
                </div>
              </Card>
              <Card title="اتجاه المبيعات">
                <LineChart
                  points={MOCK_SALES_SERIES.map(p => ({ label: p.key, value: p.salesMinor / 100 }))}
                  title="اتجاه المبيعات"
                />
              </Card>
            </div>
            <div className="grid-3">
              <Card title="طرق الدفع">
                <ChartWithLegend
                  chart={<DonutChart slices={MOCK_PAYMENT_SLICES} title="طرق الدفع" size={180} />}
                  legend={<ChartLegend items={MOCK_PAYMENT_SLICES.map(s => ({ label: s.label, value: `${((s.value / MOCK_PAYMENT_SLICES.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%`, color: s.color }))} />}
                />
              </Card>
              <Card title="المبيعات حسب الفئة">
                <ChartWithLegend
                  chart={<DonutChart slices={MOCK_CATEGORY_SLICES.map((s, i) => ({ ...s, color: s.color || ["#0E9C8A", "#1B63E3", "#B45309", "#7C5CE0"][i % 4] }))} title="المبيعات حسب الفئة" size={180} />}
                  legend={<ChartLegend items={MOCK_CATEGORY_SLICES.map((s, i) => ({ label: s.label, value: `${((s.value / MOCK_CATEGORY_SLICES.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%`, color: s.color || ["#0E9C8A", "#1B63E3", "#B45309", "#7C5CE0"][i % 4] }))} />}
                />
              </Card>
              <Card flush title="الأكثر مبيعاً">
                <DataTable
                  caption="أكثر خمسة منتجات مبيعاً"
                  columns={[
                    { key: "name", label: "المنتج" },
                    { key: "quantity", label: "الكمية المباعة", render: (row: typeof MOCK_TOP_PRODUCTS[0]) => formatInt(row.quantity) },
                    { key: "revenueMinor", label: "الإيراد", render: (row) => `${formatAmount(row.revenueMinor)} ${SYMBOL}` },
                  ]}
                   rows={MOCK_TOP_PRODUCTS.slice(0, 5).concat([{ name: "الإجمالي", sku: "", quantity: MOCK_TOP_PRODUCTS.slice(0, 5).reduce((s, i) => s + i.quantity, 0), revenueMinor: MOCK_TOP_PRODUCTS.slice(0, 5).reduce((s, i) => s + i.revenueMinor, 0), costMinor: MOCK_TOP_PRODUCTS.slice(0, 5).reduce((s, i) => s + i.costMinor, 0) }])}
                  empty={{ iconName: "products", title: "لا مبيعات", text: "" }}
                />
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="stack">
      <div className="page__head">
        <span />
        <div className="page__actions">
          <Button variant="ghost" onClick={() => toast.toastOk("جارٍ طباعة التقرير…")}>
            <Printer size={18} />
            <span>طباعة التقرير</span>
          </Button>
          <Button variant="ghost" onClick={() => toast.toastOk("تم تصدير التقرير إلى ملف Excel")}>
            <Download size={18} />
            <span>تصدير Excel</span>
          </Button>
        </div>
      </div>

      <Card>
        <div className="report-toolbar">
          <Field
            label="نوع التقرير"
            name="type"
            value={reportType}
            options={REPORT_TYPES}
            onChange={(e) => setReportType(e.target.value)}
          />
          <Field
            label="من تاريخ"
            name="from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Field
            label="إلى تاريخ"
            name="to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Field
            label="فترة سريعة"
            name="preset"
            value={preset}
            options={PRESETS}
            onChange={(e) => {
              if (e.target.value === "custom") return;
              setPreset(e.target.value);
              const ranges: Record<string, { from: string; to: string }> = {
                today: { from: new Date().toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) },
                last7: { from: "2026-08-08", to: "2026-08-14" },
                last30: { from: "2026-07-15", to: "2026-08-14" },
                month: { from: "2026-08-01", to: "2026-08-14" },
                prevMonth: { from: "2026-07-01", to: "2026-07-31" },
                year: { from: "2026-01-01", to: "2026-08-14" },
              };
              const range = ranges[e.target.value];
              if (range) { setFrom(range.from); setTo(range.to); }
            }}
          />
          <div className="filter-bar__actions">
            <Button onClick={load} className="btn--success">
              <Filter size={16} />
              <span>تطبيق</span>
            </Button>
            <Button variant="ghost" onClick={() => {
              setReportType("sales");
              setFrom("2026-08-08");
              setTo("2026-08-14");
              setPreset("last7");
              load();
            }}>
              <RefreshCw size={16} />
              <span>إعادة تعيين</span>
            </Button>
          </div>
        </div>
      </Card>

      <p className="field__hint">الفترة: {rangeLabel}</p>

      {loading ? (
        <Card>
          <div className="card__body">
            <p className="field__hint">جارٍ حساب التقرير…</p>
          </div>
        </Card>
      ) : data ? (
        <div className="stack">
          <KpiGrid>
            {kpis.map((kpi, i) => (
              <Kpi key={i} {...kpi} />
            ))}
          </KpiGrid>
          {reportBody()}
        </div>
      ) : (
        <Card>
          <EmptyState iconName="chart" title="لا بيانات في هذه الفترة" text="لم تُسجَّل مبيعات أو مصروفات بين هذين التاريخين." />
        </Card>
      )}
    </div>
  );
}
