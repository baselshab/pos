"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Banknote,
  ClipboardList,
  FileText,
  ArrowUpDown,
  CalendarDays,
  CreditCard,
  CheckCircle,
  Zap,
  Database,
  CloudUpload,
  ChevronDown,
  Plus,
  Trash2,
  Eye,
  Package,
  Search,
  AlertTriangle,
  XCircle,
  History,
  Pause,
  Wallet,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Card, Badge, EmptyState, Button } from "@/components/ui";
import { DataTable } from "@/components/table/DataTable";
import { LineChart, DonutChart, ChartLegend, ChartWithLegend } from "@/components/charts";
import { Modal, ConfirmDialog, useToast } from "@/components/feedback";
import { cn } from "@/lib/utils";
import { getDashboardData, type DashboardData } from "@/lib/dashboard";
import { createClient } from "@/lib/client";

const SYMBOL = "ر.س";

function formatAmount(minor: number) {
  return (minor / 100).toFixed(2);
}

function formatInt(n: number) {
  return String(n);
}

function deltaPercent(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function ltr(text: string) {
  return <span dir="ltr" style={{ unicodeBidi: "isolate", fontFamily: "var(--font-num)" }}>{text}</span>;
}

function formatDateTime(iso: string, _format?: string) {
  const d = new Date(iso);
  return d.toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" });
}

const SALE_STATUS_LABEL: Record<string, string> = {
  completed: "مكتملة",
  pending: "معلقة",
  refunded: "مسترجعة",
  cancelled: "ملغاة",
};

const SALE_STATUS_TONE: Record<string, string> = {
  completed: "green",
  pending: "amber",
  refunded: "gray",
  cancelled: "red",
};

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  cash: "نقدي",
  credit: "آجل",
};

function DeltaIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp size={12} />;
  if (value < 0) return <TrendingDown size={12} />;
  return <Minus size={12} />;
}

function FirstRunScreen({ onSeed }: { onSeed: () => void }) {
  const { toasts, toastOk } = useToast();
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await onSeed();
      toastOk("تمت إضافة البيانات التجريبية بنجاح");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="stack">
      <Card>
        <div className="empty" style={{ padding: "48px 20px" }}>
          <div className="empty__icon" style={{ width: "72px", height: "72px", background: "var(--teal-soft)", color: "var(--teal)" }}>
            <StoreIcon size={34} />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 700 }}>مرحباً بك في نظام المبيعات</h2>
          <p className="empty__text" style={{ maxWidth: "520px" }}>
            قاعدة البيانات فارغة. ابدأ بإضافة منتجاتك، أو جرّب النظام ببيانات جاهزة. كل شيء يُحفظ على هذا الجهاز ولا يُرسل إلى أي خادم.
          </p>
          <div className="row" style={{ marginTop: 8, justifyContent: "center" }}>
            <Link href="/products/new" className="btn btn--teal">
              <span className="icon"><Plus size={16} /></span>
              <span>إضافة أول منتج</span>
            </Link>
            <Button variant="primary" onClick={handleSeed} disabled={seeding}>
              <span className="icon"><Zap size={16} /></span>
              <span>{seeding ? "جارٍ الإنشاء…" : "إضافة بيانات تجريبية"}</span>
            </Button>
            <Link href="/backup" className="btn btn--ghost">
              <span className="icon"><CloudUpload size={16} /></span>
              <span>استعادة نسخة احتياطية</span>
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid-3">
        {[
          { icon: Database, title: "بياناتك محلية", text: "كل السجلات مخزّنة في متصفح هذا الجهاز فقط. لا يوجد خادم ولا حساب ولا مزامنة." },
          { icon: CloudUpload, title: "النسخ الاحتياطي مسؤوليتك", text: "احفظ نسخة JSON خارج الجهاز بانتظام. مسح بيانات المتصفح يمسح كل شيء." },
          { icon: Zap, title: "يعمل دون اتصال", text: "بعد أول زيارة عبر HTTPS أو localhost، يعمل التطبيق كاملاً بلا إنترنت." },
        ].map((item, i) => (
          <Card key={i}>
            <div className="stack" style={{ gap: 10 }}>
              <div className="kpi__icon kpi__icon--blue" style={{ width: 40, height: 40 }}>
                <span className="icon"><item.icon size={20} /></span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>{item.title}</h3>
              <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.7 }}>{item.text}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StoreIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 7 4.5 1.5L12 4l5.5 4.5L22 7v10H2V7Z" />
      <path d="M2 13h20" />
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { toasts, toastOk, toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDashboardData();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toastError("يجب تسجيل الدخول أولاً");
        return;
      }

      const { data: membership } = await supabase
        .from("store_members")
        .select("store_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (!membership) {
        toastError("لا يوجد متجر مرتبط بحسابك");
        return;
      }

      const storeId = membership.store_id;

      const categories = [
        { name: "مشروبات", color: "#1B63E3" },
        { name: "أغذية", color: "#0E9C8A" },
        { name: "تنظيف", color: "#7C5CE0" },
        { name: "مكتبية", color: "#D97706" },
      ];

      const { data: insertedCategories } = await supabase
        .from("expense_categories")
        .insert(categories.map((c) => ({ store_id: storeId, ...c })))
        .select();

      const products = [
        { name: "قهوة عربية", sku: "BEV-001", price_minor: 1200, cost_minor: 600, quantity: 50, low_stock_threshold: 5 },
        { name: "شاي أخضر", sku: "BEV-002", price_minor: 800, cost_minor: 400, quantity: 30, low_stock_threshold: 5 },
        { name: "عصير برتقال", sku: "BEV-003", price_minor: 1500, cost_minor: 700, quantity: 20, low_stock_threshold: 5 },
        { name: "خبز أبيض", sku: "FOOD-001", price_minor: 500, cost_minor: 200, quantity: 100, low_stock_threshold: 10 },
        { name: "أرز بسمتي", sku: "FOOD-002", price_minor: 8500, cost_minor: 5000, quantity: 15, low_stock_threshold: 3 },
        { name: "زيت زيتون", sku: "FOOD-003", price_minor: 25000, cost_minor: 18000, quantity: 8, low_stock_threshold: 2 },
        { name: "صابون يد", sku: "CLN-001", price_minor: 3500, cost_minor: 1800, quantity: 40, low_stock_threshold: 5 },
        { name: "منظف أرضيات", sku: "CLN-002", price_minor: 6000, cost_minor: 3200, quantity: 0, low_stock_threshold: 2 },
        { name: "ورق طباعة", sku: "OFF-001", price_minor: 12000, cost_minor: 8000, quantity: 25, low_stock_threshold: 5 },
        { name: "قلم حبر جاف", sku: "OFF-002", price_minor: 1500, cost_minor: 600, quantity: 60, low_stock_threshold: 10 },
        { name: "ماء معدنية", sku: "BEV-004", price_minor: 300, cost_minor: 100, quantity: 200, low_stock_threshold: 20 },
        { name: "شوكولاتة", sku: "FOOD-004", price_minor: 4500, cost_minor: 2500, quantity: 35, low_stock_threshold: 5 },
      ];

      const { data: insertedProducts } = await supabase
        .from("products")
        .insert(products.map((p) => ({ store_id: storeId, ...p, unit: "قطعة", tax_rate_bp: 0, description: null, image_url: null, is_active: true })))
        .select();

      const customer = { store_id: storeId, name: "عميل نقدي", phone: null, note: null, is_active: true };
      const { data: insertedCustomer } = await supabase.from("customers").insert(customer).select().single();

      const now = new Date();
      const sales = [
        { number: "INV-001", customer_name: "أحمد محمد", total_minor: 45000, status: "completed", payment_type: "cash", subtotal_minor: 45000, discount_minor: 0, tax_rate_bp: 0, tax_inclusive: false, tax_minor: 0, paid_minor: 45000, due_minor: 0, item_count: 3, unit_count: 3, cost_minor: 2700, created_at: new Date(now.getTime() - 3600000).toISOString() },
        { number: "INV-002", customer_name: "سارة علي", total_minor: 32000, status: "completed", payment_type: "credit", subtotal_minor: 32000, discount_minor: 0, tax_rate_bp: 0, tax_inclusive: false, tax_minor: 0, paid_minor: 0, due_minor: 32000, item_count: 2, unit_count: 2, cost_minor: 2000, created_at: new Date(now.getTime() - 7200000).toISOString() },
        { number: "INV-003", customer_name: "عميل نقدي", total_minor: 18500, status: "pending", payment_type: "cash", subtotal_minor: 18500, discount_minor: 0, tax_rate_bp: 0, tax_inclusive: false, tax_minor: 0, paid_minor: 18500, due_minor: 0, item_count: 1, unit_count: 1, cost_minor: 1200, created_at: new Date(now.getTime() - 10800000).toISOString() },
        { number: "INV-004", customer_name: "خالد يوسف", total_minor: 67000, status: "completed", payment_type: "cash", subtotal_minor: 67000, discount_minor: 0, tax_rate_bp: 0, tax_inclusive: false, tax_minor: 0, paid_minor: 67000, due_minor: 0, item_count: 5, unit_count: 5, cost_minor: 4200, created_at: new Date(now.getTime() - 86400000).toISOString() },
        { number: "INV-005", customer_name: "ليلا حسن", total_minor: 21000, status: "refunded", payment_type: "credit", subtotal_minor: 21000, discount_minor: 0, tax_rate_bp: 0, tax_inclusive: false, tax_minor: 0, paid_minor: 0, due_minor: 21000, item_count: 1, unit_count: 1, cost_minor: 1400, created_at: new Date(now.getTime() - 90000000).toISOString() },
      ];

      const { data: insertedSales } = await supabase
        .from("sales")
        .insert(sales.map((s) => ({ store_id: storeId, ...s, customer_id: insertedCustomer?.id || null })))
        .select();

      if (insertedSales && insertedCategories) {
        const expenses = [
          { title: "إيجار", amount_minor: 45000, category_id: insertedCategories[0].id },
          { title: "رواتب", amount_minor: 32000, category_id: insertedCategories[1].id },
          { title: "مصروفات تشغيل", amount_minor: 18000, category_id: insertedCategories[2].id },
          { title: "أخرى", amount_minor: 8000, category_id: insertedCategories[3].id },
        ];

        await supabase.from("expenses").insert(expenses.map((e) => ({ store_id: storeId, ...e })));
      }

      toastOk("تمت إضافة 12 منتجاً و5 فواتير و1 عميل.");
      await loadData();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "تعذّر إنشاء البيانات التجريبية");
    } finally {
      setSeeding(false);
      setShowConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="stack">
        <div className="kpi-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card" style={{ padding: "var(--s4) var(--s5)", height: 120 }}>
              <div className="skeleton" style={{ width: "60%", height: 14, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: "40%", height: 28, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: "30%", height: 12 }} />
            </div>
          ))}
        </div>
        <div className="grid-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card" style={{ padding: "var(--s5)", height: 280 }}>
              <div className="skeleton" style={{ width: "50%", height: 16, marginBottom: 16 }} />
              <div className="skeleton" style={{ width: "100%", height: 200 }} />
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: "var(--s5)", height: 300 }}>
          <div className="skeleton" style={{ width: "30%", height: 16, marginBottom: 16 }} />
          <div className="skeleton" style={{ width: "100%", height: 200 }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="state-error" role="alert">
        <XCircle size={20} />
        <div>
          <p className="state-error__title">تعذّر تحميل لوحة التحكم</p>
          <p>{error}</p>
          <button className="btn btn--sm btn--ghost" style={{ marginTop: 10 }} onClick={loadData}>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.isEmpty) {
    return <FirstRunScreen onSeed={handleSeedDemo} />;
  }

  const { kpis, series, expenseSlices, lowStockProducts, lowStockCount, recentSales } = data;

  const today = {
    revenueMinor: kpis.todayRevenueMinor,
    invoiceCount: kpis.todayInvoiceCount,
    averageInvoiceMinor: kpis.todayAverageInvoiceMinor,
    netCashFlowMinor: kpis.todayNetCashFlowMinor,
  };

  const yesterday = {
    revenueMinor: kpis.yesterdayRevenueMinor,
    invoiceCount: kpis.yesterdayInvoiceCount,
    averageInvoiceMinor: kpis.yesterdayAverageInvoiceMinor,
    netCashFlowMinor: kpis.yesterdayNetCashFlowMinor,
  };

  const kpisSection = (
    <div className="kpi-grid">
      {[
        {
          label: "مبيعات اليوم",
          value: formatAmount(today.revenueMinor),
          unit: SYMBOL,
          icon: <Banknote size={22} />,
          tone: "teal" as const,
          delta: { value: deltaPercent(today.revenueMinor, yesterday.revenueMinor), label: "عن أمس" },
        },
        {
          label: "عدد الفواتير",
          value: formatInt(today.invoiceCount),
          unit: "فاتورة",
          icon: <ClipboardList size={22} />,
          tone: "violet" as const,
          delta: { value: deltaPercent(today.invoiceCount, yesterday.invoiceCount), label: "عن أمس" },
        },
        {
          label: "متوسط الفاتورة",
          value: formatAmount(today.averageInvoiceMinor),
          unit: SYMBOL,
          icon: <FileText size={22} />,
          tone: "blue" as const,
          delta: { value: deltaPercent(today.averageInvoiceMinor, yesterday.averageInvoiceMinor), label: "عن أمس" },
        },
        {
          label: "صافي الحركة",
          value: formatAmount(today.netCashFlowMinor),
          unit: SYMBOL,
          icon: <ArrowUpDown size={22} />,
          tone: "green" as const,
          delta: { value: deltaPercent(today.netCashFlowMinor, yesterday.netCashFlowMinor), label: "عن أمس" },
        },
      ].map((kpi, i) => (
        <div key={i} className="kpi">
          <div className="kpi__body">
            <div className="kpi__label">{kpi.label}</div>
            <div className="kpi__value">
              {kpi.value}
              {kpi.unit && <span className="kpi__unit">{kpi.unit}</span>}
            </div>
            <div
              className={cn(
                "kpi__delta",
                kpi.delta.value > 0 ? "kpi__delta--up" : kpi.delta.value < 0 ? "kpi__delta--down" : "kpi__delta--flat"
              )}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <DeltaIcon value={kpi.delta.value} />
                {Math.abs(kpi.delta.value)}%
              </span>
              <span>{kpi.delta.label}</span>
            </div>
          </div>
          <div className={cn("kpi__icon", `kpi__icon--${kpi.tone}`)}>
            <span className="icon">{kpi.icon}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const expensesSlicesColored = expenseSlices.map((slice, index) => ({
    ...slice,
    color: slice.color || ["#1B63E3", "#0E9C8A", "#7C5CE0", "#D97706", "#DC2626", "#0EA5E9", "#EC4899", "#94A3B8", "#65A30D"][index % 9],
  }));

  const expensesCard = (
    <Card
      title="المصروفات حسب الفئة"
      footer={
        <Button variant="outline" size="sm" onClick={() => router.push("/expenses")}>
          عرض الكل
        </Button>
      }
    >
      {expensesSlicesColored.length === 0 ? (
        <EmptyState
          iconName="expenses"
          title="لا مصروفات في آخر 7 أيام"
          text="سجّل مصروفاتك لتظهر هنا موزّعة حسب الفئة."
        />
      ) : (
        <ChartWithLegend
          chart={
            <DonutChart
              slices={expensesSlicesColored}
              title="المصروفات حسب الفئة"
              size={200}
            />
          }
          legend={
            <ChartLegend
              items={expensesSlicesColored.map((slice) => ({
                label: slice.label,
                value: formatAmount(slice.value),
                color: slice.color,
              }))}
            />
          }
        />
      )}
    </Card>
  );

  const salesCard = (
    <Card
      title="المبيعات خلال 7 أيام"
      footer={
        <Button variant="outline" size="sm" onClick={() => router.push("/reports")}>
          عرض الكل
        </Button>
      }
    >
      {series.every((s) => s.salesMinor === 0) ? (
        <EmptyState
          iconName="chart"
          title="لا مبيعات في آخر 7 أيام"
          text="ستظهر حركة المبيعات هنا بمجرد إتمام أول فاتورة."
          action={
            <Button variant="teal" size="sm" onClick={() => router.push("/pos")}>
              <span className="icon"><Package size={16} /></span>
              ابدأ البيع
            </Button>
          }
        />
      ) : (
        <LineChart
          points={series.map((point) => ({
            label: point.relativeLabel,
            value: point.salesMinor / 100,
          }))}
          title="المبيعات خلال 7 أيام"
          formatValue={(value) => (value / 1000).toFixed(0) + "k"}
          height={250}
        />
      )}
    </Card>
  );

  const lowStockCard = (
    <Card
      title="الأصناف منخفضة المخزون"
      titleIcon={lowStockCount > 0 ? <AlertTriangle size={18} /> : null}
      footer={
        <Button variant="outline" size="sm" onClick={() => router.push("/inventory?stock=low")}>
          عرض الكل
        </Button>
      }
    >
      {lowStockProducts.length === 0 ? (
        <EmptyState
          iconName="checkCircle"
          title="المخزون بحالة جيدة"
          text="لا توجد أصناف تحت الحد الأدنى حالياً."
        />
      ) : (
        <ul className="stack" style={{ gap: 14 }}>
          {lowStockProducts.map((product) => (
            <li key={product.id} className="row" style={{ gap: 12, flexWrap: "nowrap" }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 7,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--text-3)",
                  flex: "none",
                }}
              >
                <Package size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="table__main">{product.name}</div>
                <div className="table__sub">{ltr(product.sku)}</div>
              </div>
              <div style={{ textAlign: "center", flex: "none" }}>
                <div
                  style={{
                    fontWeight: 700,
                    color: product.quantity === 0 ? "var(--red)" : "var(--amber-strong)",
                  }}
                >
                  {ltr(String(product.quantity))}
                </div>
                <div className="table__sub">وحدة</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );

  const invoicesCard = (
    <Card
      title="آخر الفواتير"
      flush
      footer={
        <Button variant="outline" size="sm" onClick={() => router.push("/invoices")}>
          عرض الكل
        </Button>
      }
    >
      <DataTable
        caption="آخر خمس فواتير"
        columns={[
          {
            key: "number",
            label: "رقم الفاتورة",
            render: (sale) => (
              <button
                type="button"
                onClick={() => router.push(`/invoices/${sale.id}`)}
                style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", fontWeight: 600, fontSize: "inherit", fontFamily: "inherit" }}
              >
                {ltr(sale.number)}
              </button>
            ),
          },
          { key: "customerName", label: "العميل" },
          {
            key: "totalMinor",
            label: "الإجمالي",
            render: (sale) => (
              <span>
                {ltr(formatAmount(sale.totalMinor))} {SYMBOL}
              </span>
            ),
          },
          {
            key: "status",
            label: "الحالة",
            render: (sale) => <Badge tone={SALE_STATUS_TONE[sale.status]}>{SALE_STATUS_LABEL[sale.status]}</Badge>,
          },
          {
            key: "createdAt",
            label: "التاريخ",
            render: (sale) => (
              <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                <span className="icon"><CalendarDays size={14} /></span>
                {ltr(formatDateTime(sale.createdAt))}
              </span>
            ),
          },
          {
            key: "paymentType",
            label: "نوع الدفع",
            render: (sale) => (
              <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                <span className="icon">{sale.paymentType === "credit" ? <CreditCard size={14} /> : <Wallet size={14} />}</span>
                {PAYMENT_TYPE_LABEL[sale.paymentType]}
              </span>
            ),
          },
        ]}
        rows={recentSales.map((sale) => ({
          ...sale,
          createdAt: sale.createdAt,
        }))}
        empty={{
          iconName: "invoices",
          title: "لا فواتير بعد",
          text: "أول فاتورة تتمّها ستظهر هنا مباشرة.",
        }}
      />
    </Card>
  );

  return (
    <div className="stack">
      {kpisSection}
      <div className="grid-3">
        {expensesCard}
        {salesCard}
        {lowStockCard}
      </div>
      {invoicesCard}

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSeedDemo}
        title="إضافة بيانات تجريبية"
        message="سيتم إنشاء منتجات وعملاء ومبيعات ومصروفات للتجربة. يمكنك حذفها لاحقاً من شاشة النسخ الاحتياطي."
        confirmLabel="إضافة البيانات"
      />
    </div>
  );
}
