import { createClient } from "@/lib/client";

export interface DashboardKpis {
  todayRevenueMinor: number;
  todayInvoiceCount: number;
  todayAverageInvoiceMinor: number;
  todayNetCashFlowMinor: number;
  yesterdayRevenueMinor: number;
  yesterdayInvoiceCount: number;
  yesterdayAverageInvoiceMinor: number;
  yesterdayNetCashFlowMinor: number;
}

export interface DashboardSeries {
  label: string;
  relativeLabel: string;
  salesMinor: number;
}

export interface ExpenseSlice {
  label: string;
  value: number;
  color: string;
}

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  imageUrl: string | null;
  lowStockThreshold: number;
}

export interface RecentSale {
  id: string;
  number: string;
  customerName: string;
  totalMinor: number;
  status: string;
  createdAt: string;
  paymentType: string;
}

export interface DashboardData {
  kpis: DashboardKpis;
  series: DashboardSeries[];
  expenseSlices: ExpenseSlice[];
  lowStockProducts: LowStockProduct[];
  lowStockCount: number;
  recentSales: RecentSale[];
  isEmpty: boolean;
}

function startOfToday() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

function startOfYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

function startOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

function dayKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function relativeDayLabel(key: string): string {
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  if (key === today) return "اليوم";
  if (key === yesterday) return "أمس";
  const d = new Date(key + "T00:00:00");
  return d.toLocaleDateString("ar-SA", { weekday: "short" });
}

async function getStoreId(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("store_members")
    .select("store_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  return membership?.store_id || null;
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createClient();
  const storeId = await getStoreId(supabase);

  if (!storeId) {
    return {
      kpis: {
        todayRevenueMinor: 0,
        todayInvoiceCount: 0,
        todayAverageInvoiceMinor: 0,
        todayNetCashFlowMinor: 0,
        yesterdayRevenueMinor: 0,
        yesterdayInvoiceCount: 0,
        yesterdayAverageInvoiceMinor: 0,
        yesterdayNetCashFlowMinor: 0,
      },
      series: [],
      expenseSlices: [],
      lowStockProducts: [],
      lowStockCount: 0,
      recentSales: [],
      isEmpty: true,
    };
  }

  const todayStart = startOfToday();
  const yesterdayStart = startOfYesterday();
  const weekStart = startOfWeek();

  const [todayResult, yesterdayResult, weekSalesResult, weekExpensesResult, productsResult, recentSalesResult, expenseCategoriesResult] = await Promise.all([
    supabase
      .from("sales")
      .select("total_minor, status, payment_type, due_minor")
      .eq("store_id", storeId)
      .gte("created_at", todayStart),

    supabase
      .from("sales")
      .select("total_minor, status, payment_type, due_minor")
      .eq("store_id", storeId)
      .gte("created_at", yesterdayStart)
      .lt("created_at", todayStart),

    supabase
      .from("sales")
      .select("total_minor, status, created_at")
      .eq("store_id", storeId)
      .gte("created_at", weekStart),

    supabase
      .from("expenses")
      .select("amount_minor, category_id")
      .eq("store_id", storeId)
      .gte("created_at", weekStart),

    supabase
      .from("products")
      .select("id, name, sku, quantity, low_stock_threshold, image_url")
      .eq("store_id", storeId)
      .eq("is_active", true),

    supabase
      .from("sales")
      .select("id, number, customer_name, total_minor, status, created_at, payment_type")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(5),

    supabase
      .from("expense_categories")
      .select("id, name, color")
      .eq("store_id", storeId),
  ]);

  const todaySales = todayResult.data?.filter((s) => s.status !== "cancelled") || [];
  const yesterdaySales = yesterdayResult.data?.filter((s) => s.status !== "cancelled") || [];
  const weekSales = weekSalesResult.data?.filter((s) => s.status !== "cancelled") || [];

  const todayRevenueMinor = todaySales.reduce((s, v) => s + v.total_minor, 0);
  const todayInvoiceCount = todaySales.length;
  const todayAverageInvoiceMinor = todayInvoiceCount > 0 ? Math.round(todayRevenueMinor / todayInvoiceCount) : 0;
  const todayNetCashFlowMinor = todayRevenueMinor - (todayResult.data?.reduce((s, e) => s + (e as any).amount_minor || 0, 0) || 0);

  const yesterdayRevenueMinor = yesterdaySales.reduce((s, v) => s + v.total_minor, 0);
  const yesterdayInvoiceCount = yesterdaySales.length;
  const yesterdayAverageInvoiceMinor = yesterdayInvoiceCount > 0 ? Math.round(yesterdayRevenueMinor / yesterdayInvoiceCount) : 0;
  const yesterdayNetCashFlowMinor = yesterdayRevenueMinor;

  const isEmpty = todayInvoiceCount === 0 && yesterdayInvoiceCount === 0 && (productsResult.data?.length || 0) === 0;

  // 7-day series
  const salesByDay = new Map<string, number>();
  for (const sale of weekSales) {
    const key = sale.created_at.split("T")[0];
    salesByDay.set(key, (salesByDay.get(key) || 0) + sale.total_minor);
  }

  const series: DashboardSeries[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    series.push({
      label: key,
      relativeLabel: relativeDayLabel(key),
      salesMinor: salesByDay.get(key) || 0,
    });
  }

  // Expense slices by category
  const categories = expenseCategoriesResult.data || [];
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const expenseTotals = new Map<string, number>();
  for (const expense of weekExpensesResult.data || []) {
    const cat = categoryMap.get(expense.category_id);
    const name = cat?.name || "أخرى";
    expenseTotals.set(name, (expenseTotals.get(name) || 0) + expense.amount_minor);
  }

  const expenseColors = ["#1B63E3", "#0E9C8A", "#7C5CE0", "#D97706", "#DC2626", "#0EA5E9", "#EC4899", "#94A3B8", "#65A30D"];
  const expenseSlices: ExpenseSlice[] = [...expenseTotals.entries()]
    .map(([label, value], i) => ({ label, value, color: expenseColors[i % expenseColors.length] }))
    .sort((a, b) => b.value - a.value);

  // Low stock
  const products = productsResult.data || [];
  const lowStockProducts: LowStockProduct[] = products
    .filter((p) => p.quantity <= p.low_stock_threshold)
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      quantity: p.quantity,
      imageUrl: p.image_url,
      lowStockThreshold: p.low_stock_threshold,
    }));

  const lowStockCount = products.filter((p) => p.quantity <= p.low_stock_threshold).length;

  // Recent sales
  const recentSales: RecentSale[] = (recentSalesResult.data || []).map((s) => ({
    id: s.id,
    number: s.number,
    customerName: s.customer_name,
    totalMinor: s.total_minor,
    status: s.status,
    createdAt: s.created_at,
    paymentType: s.payment_type,
  }));

  return {
    kpis: {
      todayRevenueMinor,
      todayInvoiceCount,
      todayAverageInvoiceMinor,
      todayNetCashFlowMinor,
      yesterdayRevenueMinor,
      yesterdayInvoiceCount,
      yesterdayAverageInvoiceMinor,
      yesterdayNetCashFlowMinor,
    },
    series,
    expenseSlices,
    lowStockProducts,
    lowStockCount,
    recentSales,
    isEmpty,
  };
}
