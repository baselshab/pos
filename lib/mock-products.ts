export type MockProduct = {
  id: string;
  name: string;
  nameLower: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  unit: string;
  costMinor: number;
  priceMinor: number;
  taxRateBp: number;
  quantity: number;
  lowStockThreshold: number;
  description?: string;
  image?: string;
  isActive?: boolean;
  createdAt: string;
};

export type MockCategory = {
  id: string;
  name: string;
  sortOrder: number;
};

export type MockMovement = {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  type: string;
  quantity: number;
  balanceAfter: number;
  reason: string;
  note: string;
  refType: string;
  refId: string;
  actor: string;
  createdAt: string;
  dayKey: string;
};

export type MockReason = {
  name: string;
};

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
  defaultTaxRateBp: 1500,
  lowStockDefault: 10,
  allowNegativeStock: false,
};

export const MOCK_CATEGORIES: MockCategory[] = [
  { id: "cat-1", name: "مشروبات", sortOrder: 1 },
  { id: "cat-2", name: "وجبات خفيفة", sortOrder: 2 },
  { id: "cat-3", name: "منظفات", sortOrder: 3 },
  { id: "cat-4", name: "أدوات منزلية", sortOrder: 4 },
];

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    id: "prod-1",
    name: "عصير برتقال طازج",
    nameLower: "عصير برتقال طازج",
    sku: "JUI-001",
    barcode: "6221001234567",
    categoryId: "cat-1",
    unit: "قطعة",
    costMinor: 1500,
    priceMinor: 3000,
    taxRateBp: 1500,
    quantity: 50,
    lowStockThreshold: 10,
    description: "عصير برتقال طازج 100%",
    isActive: true,
    createdAt: "2024-01-10T08:00:00Z",
  },
  {
    id: "prod-2",
    name: "شيبس مالح",
    nameLower: "شيبس مالح",
    sku: "SNK-001",
    barcode: "6221001234568",
    categoryId: "cat-2",
    unit: "عبوة",
    costMinor: 800,
    priceMinor: 1800,
    taxRateBp: 1500,
    quantity: 120,
    lowStockThreshold: 20,
    description: "شيبس مالح مقرمش",
    isActive: true,
    createdAt: "2024-01-11T09:00:00Z",
  },
  {
    id: "prod-3",
    name: "صابون غسيل",
    nameLower: "صابون غسيل",
    sku: "CLN-001",
    barcode: "6221001234569",
    categoryId: "cat-3",
    unit: "علبة",
    costMinor: 2500,
    priceMinor: 4500,
    taxRateBp: 1500,
    quantity: 5,
    lowStockThreshold: 10,
    description: "صابون غسيل للأطباق",
    isActive: true,
    createdAt: "2024-01-12T10:00:00Z",
  },
  {
    id: "prod-4",
    name: "مناديل ورقية",
    nameLower: "مناديل ورقية",
    sku: "HOM-001",
    barcode: "6221001234570",
    categoryId: "cat-4",
    unit: "كرتون",
    costMinor: 1200,
    priceMinor: 2200,
    taxRateBp: 1500,
    quantity: 0,
    lowStockThreshold: 5,
    description: "مناديل ورقية للاستخدام العام",
    isActive: true,
    createdAt: "2024-01-13T11:00:00Z",
  },
  {
    id: "prod-5",
    name: "قهوة تركية",
    nameLower: "قهوة تركية",
    sku: "COF-001",
    barcode: "6221001234571",
    categoryId: "cat-1",
    unit: "كيس",
    costMinor: 3500,
    priceMinor: 6000,
    taxRateBp: 1500,
    quantity: 30,
    lowStockThreshold: 8,
    description: "قهوة تركية محمصة",
    isActive: true,
    createdAt: "2024-01-14T12:00:00Z",
  },
  {
    id: "prod-6",
    name: "شوكولاتة داكنة",
    nameLower: "شوكولاتة داكنة",
    sku: "SNK-002",
    barcode: "6221001234572",
    categoryId: "cat-2",
    unit: "علبة",
    costMinor: 2000,
    priceMinor: 3500,
    taxRateBp: 1500,
    quantity: 3,
    lowStockThreshold: 5,
    description: "شوكولاتة داكنة 70% كاكاو",
    isActive: true,
    createdAt: "2024-01-15T13:00:00Z",
  },
  {
    id: "prod-7",
    name: "معطر جو",
    nameLower: "معطر جو",
    sku: "CLN-002",
    barcode: "6221001234573",
    categoryId: "cat-3",
    unit: "عبوة",
    costMinor: 1800,
    priceMinor: 3200,
    taxRateBp: 1500,
    quantity: 15,
    lowStockThreshold: 5,
    description: "معطر جو برائحة اللافندر",
    isActive: false,
    createdAt: "2024-01-16T14:00:00Z",
  },
  {
    id: "prod-8",
    name: "ماء معدني",
    nameLower: "ماء معدني",
    sku: "WAT-001",
    barcode: "6221001234574",
    categoryId: "cat-1",
    unit: "قطعة",
    costMinor: 500,
    priceMinor: 1000,
    taxRateBp: 0,
    quantity: 200,
    lowStockThreshold: 50,
    description: "ماء معدني 500 مل",
    isActive: true,
    createdAt: "2024-01-17T15:00:00Z",
  },
];

let nextId = 9;
export function createMockProduct(data: Partial<MockProduct>): MockProduct {
  const id = `prod-${nextId++}`;
  const now = new Date().toISOString();
  return {
    name: data.name || "",
    nameLower: (data.name || "").toLowerCase(),
    sku: data.sku || "",
    barcode: data.barcode,
    categoryId: data.categoryId || "",
    unit: data.unit || "",
    costMinor: data.costMinor || 0,
    priceMinor: data.priceMinor || 0,
    taxRateBp: data.taxRateBp ?? 1500,
    quantity: data.quantity ?? 0,
    lowStockThreshold: data.lowStockThreshold ?? 0,
    description: data.description,
    image: data.image,
    isActive: data.isActive ?? true,
    createdAt: now,
    ...data,
    id,
  };
}

export function updateMockProduct(id: string, data: Partial<MockProduct>): MockProduct | undefined {
  const idx = MOCK_PRODUCTS.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  MOCK_PRODUCTS[idx] = { ...MOCK_PRODUCTS[idx], ...data, nameLower: (data.name || MOCK_PRODUCTS[idx].name).toLowerCase() };
  return MOCK_PRODUCTS[idx];
}

export const MOCK_MOVEMENTS: MockMovement[] = [
  {
    id: "mov-1",
    productId: "prod-1",
    sku: "JUI-001",
    productName: "عصير برتقال طازج",
    type: "initial",
    quantity: 50,
    balanceAfter: 50,
    reason: "رصيد افتتاحي",
    note: "",
    refType: "product-create",
    refId: "prod-1",
    actor: "المستخدم",
    createdAt: "2024-01-10T08:00:00Z",
    dayKey: "2024-01-10",
  },
  {
    id: "mov-2",
    productId: "prod-1",
    sku: "JUI-001",
    productName: "عصير برتقال طازج",
    type: "in",
    quantity: 20,
    balanceAfter: 70,
    reason: "استلام من مورد",
    note: "",
    refType: "adjustment",
    refId: "adj-1",
    actor: "المستخدم",
    createdAt: "2024-01-12T10:00:00Z",
    dayKey: "2024-01-12",
  },
  {
    id: "mov-3",
    productId: "prod-2",
    sku: "SNK-001",
    productName: "شيبس مالح",
    type: "initial",
    quantity: 120,
    balanceAfter: 120,
    reason: "رصيد افتتاحي",
    note: "",
    refType: "product-create",
    refId: "prod-2",
    actor: "المستخدم",
    createdAt: "2024-01-11T09:00:00Z",
    dayKey: "2024-01-11",
  },
  {
    id: "mov-4",
    productId: "prod-3",
    sku: "CLN-001",
    productName: "صابون غسيل",
    type: "initial",
    quantity: 10,
    balanceAfter: 10,
    reason: "رصيد افتتاحي",
    note: "",
    refType: "product-create",
    refId: "prod-3",
    actor: "المستخدم",
    createdAt: "2024-01-12T10:00:00Z",
    dayKey: "2024-01-12",
  },
  {
    id: "mov-5",
    productId: "prod-3",
    sku: "CLN-001",
    productName: "صابون غسيل",
    type: "out",
    quantity: -5,
    balanceAfter: 5,
    reason: "مبيعات",
    note: "",
    refType: "sale",
    refId: "sale-1",
    actor: "المستخدم",
    createdAt: "2024-01-13T14:00:00Z",
    dayKey: "2024-01-13",
  },
  {
    id: "mov-6",
    productId: "prod-4",
    sku: "HOM-001",
    productName: "مناديل ورقية",
    type: "initial",
    quantity: 8,
    balanceAfter: 8,
    reason: "رصيد افتتاحي",
    note: "",
    refType: "product-create",
    refId: "prod-4",
    actor: "المستخدم",
    createdAt: "2024-01-13T11:00:00Z",
    dayKey: "2024-01-13",
  },
  {
    id: "mov-7",
    productId: "prod-4",
    sku: "HOM-001",
    productName: "مناديل ورقية",
    type: "out",
    quantity: -8,
    balanceAfter: 0,
    reason: "مبيعات",
    note: "",
    refType: "sale",
    refId: "sale-2",
    actor: "المستخدم",
    createdAt: "2024-01-14T16:00:00Z",
    dayKey: "2024-01-14",
  },
];

export const MOCK_REASONS: MockReason[] = [
  { name: "استلام من مورد" },
  { name: "مبيعات" },
  { name: "مرتجع عميل" },
  { name: "تالف" },
  { name: "خطأ إدخال" },
  { name: "جرد" },
  { name: "أخرى" },
];

export const MOVEMENT = {
  INITIAL: "initial",
  IN: "in",
  OUT: "out",
  ADJUSTMENT: "adjustment",
  STOCKTAKE: "stocktake",
  SALE: "sale",
  RETURN: "return",
} as const;

export const MOVEMENT_LABEL: Record<string, string> = {
  [MOVEMENT.INITIAL]: "رصيد افتتاحي",
  [MOVEMENT.IN]: "إضافة",
  [MOVEMENT.OUT]: "سحب",
  [MOVEMENT.ADJUSTMENT]: "تسوية",
  [MOVEMENT.STOCKTAKE]: "جرد",
  [MOVEMENT.SALE]: "بيع",
  [MOVEMENT.RETURN]: "مرتجع",
};

export const STOCK_STATUS = {
  OK: "ok",
  LOW: "low",
  OUT: "out",
} as const;

export const STOCK_LABEL: Record<string, string> = {
  [STOCK_STATUS.OK]: "متوفر",
  [STOCK_STATUS.LOW]: "منخفض",
  [STOCK_STATUS.OUT]: "نفد المخزون",
};

export const STOCK_TONE: Record<string, string> = {
  [STOCK_STATUS.OK]: "green",
  [STOCK_STATUS.LOW]: "amber",
  [STOCK_STATUS.OUT]: "red",
};

export function stockStatus(product: MockProduct): string {
  if (product.quantity <= 0) return STOCK_STATUS.OUT;
  if (product.quantity <= product.lowStockThreshold) return STOCK_STATUS.LOW;
  return STOCK_STATUS.OK;
}

export function listProducts(): MockProduct[] {
  return [...MOCK_PRODUCTS];
}

export function getProduct(id: string): MockProduct | undefined {
  return MOCK_PRODUCTS.find((p) => p.id === id);
}

export function createProduct(data: MockProduct): MockProduct {
  const product = createMockProduct(data);
  MOCK_PRODUCTS.push(product);
  return product;
}

export function updateProduct(id: string, data: Partial<MockProduct>): MockProduct | undefined {
  return updateMockProduct(id, data);
}

export function listCategories(): MockCategory[] {
  return [...MOCK_CATEGORIES];
}

export function createCategory(data: MockCategory): MockCategory {
  const category = { ...data, id: `cat-${Date.now()}`, sortOrder: data.sortOrder ?? MOCK_CATEGORIES.length + 1 };
  MOCK_CATEGORIES.push(category);
  return category;
}

export function applyMovement(productId: string, delta: number): MockMovement {
  const product = getProduct(productId);
  if (!product) throw new Error("المنتج غير موجود");
  const movement: MockMovement = {
    id: `mov-${Date.now()}`,
    productId,
    sku: product.sku,
    productName: product.name,
    type: delta > 0 ? MOVEMENT.IN : MOVEMENT.OUT,
    quantity: delta,
    balanceAfter: product.quantity + delta,
    reason: "تعديل كمية",
    note: "",
    refType: "adjustment",
    refId: `adj-${Date.now()}`,
    actor: "المستخدم",
    createdAt: new Date().toISOString(),
    dayKey: new Date().toISOString().slice(0, 10),
  };
  MOCK_MOVEMENTS.push(movement);
  product.quantity = movement.balanceAfter;
  return movement;
}

export function recordAdjustment(data: {
  productId: string;
  quantity: number;
  reason: string;
  note: string;
  allowNegative?: boolean;
}): MockMovement {
  const product = getProduct(data.productId);
  if (!product) throw new Error("المنتج غير موجود");
  const newQuantity = product.quantity + data.quantity;
  if (newQuantity < 0 && !data.allowNegative) {
    throw new Error("الكمية لا يمكن أن تكون سالبة");
  }
  const movement: MockMovement = {
    id: `mov-${Date.now()}`,
    productId: data.productId,
    sku: product.sku,
    productName: product.name,
    type: data.quantity > 0 ? MOVEMENT.IN : MOVEMENT.OUT,
    quantity: data.quantity,
    balanceAfter: newQuantity,
    reason: data.reason,
    note: data.note,
    refType: "adjustment",
    refId: `adj-${Date.now()}`,
    actor: "المستخدم",
    createdAt: new Date().toISOString(),
    dayKey: new Date().toISOString().slice(0, 10),
  };
  MOCK_MOVEMENTS.push(movement);
  product.quantity = newQuantity;
  return movement;
}

export function recordStocktake(data: {
  productId: string;
  countedQuantity: number;
  note: string;
}): { delta: number } & MockMovement {
  const product = getProduct(data.productId);
  if (!product) throw new Error("المنتج غير موجود");
  const delta = data.countedQuantity - product.quantity;
  const movement: MockMovement = {
    id: `mov-${Date.now()}`,
    productId: data.productId,
    sku: product.sku,
    productName: product.name,
    type: MOVEMENT.STOCKTAKE,
    quantity: delta,
    balanceAfter: data.countedQuantity,
    reason: "جرد",
    note: data.note,
    refType: "stocktake",
    refId: `stk-${Date.now()}`,
    actor: "المستخدم",
    createdAt: new Date().toISOString(),
    dayKey: new Date().toISOString().slice(0, 10),
  };
  MOCK_MOVEMENTS.push(movement);
  product.quantity = data.countedQuantity;
  return { delta, ...movement };
}

export function listReasons(): MockReason[] {
  return [...MOCK_REASONS];
}

export function lastMovementByProduct(): Map<string, MockMovement> {
  const map = new Map<string, MockMovement>();
  for (const m of MOCK_MOVEMENTS) {
    if (!map.has(m.productId) || new Date(m.createdAt) > new Date(map.get(m.productId)!.createdAt)) {
      map.set(m.productId, m);
    }
  }
  return map;
}

export function movementsForProduct(productId: string, limit = 50): MockMovement[] {
  return MOCK_MOVEMENTS.filter((m) => m.productId === productId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function exportInventory(rows: (MockProduct & { status: string; categoryName: string; stockValueMinor: number })[]): void {
  console.log("Exporting inventory:", rows);
}
