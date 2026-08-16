export const MOCK_SETTINGS = {
  currencySymbol: "ج.م",
  storeName: "متجر السكول",
  storeAddress: "123 شارع الرئيسي، القاهرة",
  storePhone: "+201234567890",
  storeCrNumber: "123456789",
  storeTaxNumber: "987654321",
  dateFormat: "dd/MM/yyyy",
  printTemplate: "a4",
  invoiceFooter: "شكراً لزيارتكم",
};

export const SALE_STATUS = {
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const SALE_STATUS_LABEL: Record<string, string> = {
  [SALE_STATUS.COMPLETED]: "مكتملة",
  [SALE_STATUS.CANCELLED]: "ملغاة",
};

export const SALE_STATUS_TONE: Record<string, string> = {
  [SALE_STATUS.COMPLETED]: "green",
  [SALE_STATUS.CANCELLED]: "gray",
};

export const PAYMENT_TYPE_LABEL: Record<string, string> = {
  cash: "نقدي",
  credit: "آجل",
};

export const MOCK_SALES = [
  {
    id: "1",
    number: "INV-001",
    customerId: "1",
    customerName: "أحمد محمد",
    paymentType: "cash",
    totalMinor: 150000,
    paidMinor: 150000,
    dueMinor: 0,
    status: SALE_STATUS.COMPLETED,
    dayKey: "2024-01-15",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
    itemCount: 3,
    unitCount: 5,
    discountMinor: 5000,
    taxRateBp: 1500,
    taxMinor: 21750,
    subtotalMinor: 145000,
    note: "",
    cancelledAt: null,
    cancelReason: null,
  },
  {
    id: "2",
    number: "INV-002",
    customerId: "2",
    customerName: "سارة علي",
    paymentType: "credit",
    totalMinor: 250000,
    paidMinor: 100000,
    dueMinor: 150000,
    status: SALE_STATUS.COMPLETED,
    dayKey: "2024-01-16",
    createdAt: "2024-01-16T14:20:00Z",
    updatedAt: "2024-01-16T14:20:00Z",
    itemCount: 2,
    unitCount: 2,
    discountMinor: 0,
    taxRateBp: 1500,
    taxMinor: 37500,
    subtotalMinor: 250000,
    note: "عميل مميز",
    cancelledAt: null,
    cancelReason: null,
  },
  {
    id: "3",
    number: "INV-003",
    customerId: "walkin",
    customerName: "عميل نقدي",
    paymentType: "cash",
    totalMinor: 75000,
    paidMinor: 75000,
    dueMinor: 0,
    status: SALE_STATUS.CANCELLED,
    dayKey: "2024-01-17",
    createdAt: "2024-01-17T09:00:00Z",
    updatedAt: "2024-01-17T09:15:00Z",
    itemCount: 1,
    unitCount: 1,
    discountMinor: 0,
    taxRateBp: 1500,
    taxMinor: 11250,
    subtotalMinor: 75000,
    note: "",
    cancelledAt: "2024-01-17T09:15:00Z",
    cancelReason: "إلغاء من قائمة الفواتير",
  },
  {
    id: "4",
    number: "INV-004",
    customerId: "1",
    customerName: "أحمد محمد",
    paymentType: "cash",
    totalMinor: 45000,
    paidMinor: 45000,
    dueMinor: 0,
    status: SALE_STATUS.COMPLETED,
    dayKey: "2024-01-18",
    createdAt: "2024-01-18T11:45:00Z",
    updatedAt: "2024-01-18T11:45:00Z",
    itemCount: 4,
    unitCount: 12,
    discountMinor: 2000,
    taxRateBp: 1500,
    taxMinor: 6450,
    subtotalMinor: 43000,
    note: "",
    cancelledAt: null,
    cancelReason: null,
  },
  {
    id: "5",
    number: "INV-005",
    customerId: "3",
    customerName: "خالد عبدالله",
    paymentType: "credit",
    totalMinor: 180000,
    paidMinor: 50000,
    dueMinor: 130000,
    status: SALE_STATUS.COMPLETED,
    dayKey: "2024-01-19",
    createdAt: "2024-01-19T16:00:00Z",
    updatedAt: "2024-01-19T16:00:00Z",
    itemCount: 2,
    unitCount: 3,
    discountMinor: 10000,
    taxRateBp: 1500,
    taxMinor: 25500,
    subtotalMinor: 170000,
    note: "",
    cancelledAt: null,
    cancelReason: null,
  },
];

export const MOCK_SALE_ITEMS: Record<string, any[]> = {
  "1": [
    { id: "1-1", saleId: "1", name: "منتج أ", sku: "SKU-A1", quantity: 2, unitPriceMinor: 50000, lineDiscountMinor: 0, lineTotalMinor: 100000 },
    { id: "1-2", saleId: "1", name: "منتج ب", sku: "SKU-B2", quantity: 1, unitPriceMinor: 30000, lineDiscountMinor: 0, lineTotalMinor: 30000 },
    { id: "1-3", saleId: "1", name: "منتج ج", sku: "SKU-C3", quantity: 2, unitPriceMinor: 10000, lineDiscountMinor: 5000, lineTotalMinor: 15000 },
  ],
  "2": [
    { id: "2-1", saleId: "2", name: "منتج د", sku: "SKU-D4", quantity: 1, unitPriceMinor: 150000, lineDiscountMinor: 0, lineTotalMinor: 150000 },
    { id: "2-2", saleId: "2", name: "منتج هـ", sku: "SKU-E5", quantity: 1, unitPriceMinor: 100000, lineDiscountMinor: 0, lineTotalMinor: 100000 },
  ],
  "3": [
    { id: "3-1", saleId: "3", name: "منتج و", sku: "SKU-F6", quantity: 1, unitPriceMinor: 75000, lineDiscountMinor: 0, lineTotalMinor: 75000 },
  ],
  "4": [
    { id: "4-1", saleId: "4", name: "منتج ز", sku: "SKU-G7", quantity: 5, unitPriceMinor: 5000, lineDiscountMinor: 0, lineTotalMinor: 25000 },
    { id: "4-2", saleId: "4", name: "منتج ح", sku: "SKU-H8", quantity: 3, unitPriceMinor: 4000, lineDiscountMinor: 0, lineTotalMinor: 12000 },
    { id: "4-3", saleId: "4", name: "منتج ط", sku: "SKU-I9", quantity: 2, unitPriceMinor: 3000, lineDiscountMinor: 0, lineTotalMinor: 6000 },
    { id: "4-4", saleId: "4", name: "منتج ي", sku: "SKU-J0", quantity: 2, unitPriceMinor: 2000, lineDiscountMinor: 2000, lineTotalMinor: 2000 },
  ],
  "5": [
    { id: "5-1", saleId: "5", name: "منتج ك", sku: "SKU-K1", quantity: 2, unitPriceMinor: 80000, lineDiscountMinor: 10000, lineTotalMinor: 150000 },
    { id: "5-2", saleId: "5", name: "منتج ل", sku: "SKU-L2", quantity: 1, unitPriceMinor: 20000, lineDiscountMinor: 0, lineTotalMinor: 20000 },
  ],
};

export const MOCK_CUSTOMERS = [
  { id: "1", name: "أحمد محمد", phone: "01234567890", note: "", isActive: true },
  { id: "2", name: "سارة علي", phone: "01123456789", note: "عميلة مميزة", isActive: true },
  { id: "3", name: "خالد عبدالله", phone: "01098765432", note: "", isActive: true },
  { id: "4", name: "فاطمة حسن", phone: "", note: "لا يفضل الاتصال", isActive: false },
  { id: "5", name: "محمد إبراهيم", phone: "01555555555", note: "", isActive: true },
];

export const MOCK_LEDGERS = new Map([
  ["1", { customerId: "1", balanceMinor: 0, purchasesMinor: 195000, invoiceCount: 2, monthPurchasesMinor: 0, lastPurchaseAt: "2024-01-18" }],
  ["2", { customerId: "2", balanceMinor: 150000, purchasesMinor: 250000, invoiceCount: 1, monthPurchasesMinor: 250000, lastPurchaseAt: "2024-01-16" }],
  ["3", { customerId: "3", balanceMinor: 130000, purchasesMinor: 180000, invoiceCount: 1, monthPurchasesMinor: 180000, lastPurchaseAt: "2024-01-19" }],
  ["4", { customerId: "4", balanceMinor: 0, purchasesMinor: 0, invoiceCount: 0, monthPurchasesMinor: 0, lastPurchaseAt: null }],
  ["5", { customerId: "5", balanceMinor: 0, purchasesMinor: 0, invoiceCount: 0, monthPurchasesMinor: 0, lastPurchaseAt: null }],
]);

export const MOCK_STATEMENT_ENTRIES: Record<string, any[]> = {
  "1": [
    { at: "2024-01-15T10:30:00Z", kind: "invoice", label: "INV-001", ref: "1", debitMinor: 150000, creditMinor: 0, balanceMinor: 0 },
    { at: "2024-01-18T11:45:00Z", kind: "invoice", label: "INV-004", ref: "4", debitMinor: 45000, creditMinor: 0, balanceMinor: 0 },
  ],
  "2": [
    { at: "2024-01-16T14:20:00Z", kind: "invoice", label: "INV-002", ref: "2", debitMinor: 250000, creditMinor: 100000, balanceMinor: 150000 },
  ],
  "3": [
    { at: "2024-01-19T16:00:00Z", kind: "invoice", label: "INV-005", ref: "5", debitMinor: 180000, creditMinor: 50000, balanceMinor: 130000 },
  ],
  "4": [],
  "5": [],
};

export function formatAmount(minor: number): string {
  const major = minor / 100;
  return major.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatInt(num: number): string {
  return num.toLocaleString("ar-EG");
}

export function formatDate(dateStr: string | Date, _fmt?: string): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function formatDateTime(dateStr: string | Date, _fmt?: string): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return d.toLocaleString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function isDayKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function itemsLabel(count: number): string {
  return `${count} أصناف`;
}

export function bpToPercent(bp: number): number {
  return bp / 100;
}

export function toMajor(minor: number): number {
  return minor / 100;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return parts[0][0] + parts[parts.length - 1][0];
  }
  return name.slice(0, 2).toUpperCase();
}

export function ltr(text: string | number): React.ReactNode {
  return <span dir="ltr" style={{ unicodeBidi: "isolate", fontFamily: "var(--font-num)" }}>{text}</span>;
}

export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}
