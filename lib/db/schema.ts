import Dexie from 'dexie';

export interface PendingOperation {
  id: string;
  operationId: string;
  deviceId: string;
  storeId: string;
  entity: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: Record<string, any>;
  status: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
  retryCount: number;
  lastError: string | null;
  nextRetryAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncChange {
  id: number;
  storeId: string;
  entity: string;
  entityId: string;
  operation: string;
  payload: Record<string, any>;
  createdAt: string;
}

export interface SyncMeta {
  id: string;
  storeId: string;
  lastSyncId: number;
  lastSyncedAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  storeId: string;
  sku: string;
  barcode?: string;
  name: string;
  categoryId?: string;
  unit: string;
  costMinor: number;
  priceMinor: number;
  taxRateBp: number;
  quantity: number;
  lowStockThreshold: number;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  operationId?: string;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  storeId: string;
  name: string;
  phone?: string;
  note?: string;
  isActive: boolean;
  operationId?: string;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  storeId: string;
  number: string;
  status: string;
  paymentType: string;
  customerId?: string;
  customerName: string;
  subtotalMinor: number;
  discountType?: string;
  discountValue?: number;
  discountMinor: number;
  taxRateBp: number;
  taxInclusive: boolean;
  taxMinor: number;
  totalMinor: number;
  paidMinor: number;
  dueMinor: number;
  itemCount: number;
  unitCount: number;
  costMinor: number;
  note?: string;
  dayKey: string;
  cancelledAt?: string;
  cancelReason?: string;
  operationId?: string;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  storeId: string;
  productId: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  unitPriceMinor: number;
  unitCostMinor: number;
  lineDiscountMinor: number;
  lineTotalMinor: number;
  dayKey: string;
  operationId?: string;
  deviceId?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  storeId: string;
  categoryId: string;
  title: string;
  amountMinor: number;
  method?: string;
  reference?: string;
  note?: string;
  attachmentUrl?: string;
  dayKey: string;
  operationId?: string;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  storeId: string;
  productId: string;
  sku: string;
  productName: string;
  type: string;
  quantity: number;
  balanceAfter: number;
  reason?: string;
  note?: string;
  refType?: string;
  refId?: string;
  actorId: string;
  dayKey: string;
  operationId?: string;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  storeId: string;
  name: string;
  color?: string;
  icon?: string;
  sortOrder: number;
  operationId?: string;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Setting {
  id: string;
  storeId: string;
  values: Record<string, any>;
  operationId?: string;
  deviceId?: string;
  updatedAt: string;
}

class PosDatabase extends Dexie {
  products!: Dexie.Table<Product, string>;
  customers!: Dexie.Table<Customer, string>;
  sales!: Dexie.Table<Sale, string>;
  sale_items!: Dexie.Table<SaleItem, string>;
  expenses!: Dexie.Table<Expense, string>;
  inventory_movements!: Dexie.Table<InventoryMovement, string>;
  categories!: Dexie.Table<Category, string>;
  settings!: Dexie.Table<Setting, string>;
  pending_operations!: Dexie.Table<PendingOperation, string>;
  sync_meta!: Dexie.Table<SyncMeta, string>;

  constructor() {
    super('pos-offline');
    this.version(1).stores({
      products: 'id, storeId, sku, barcode, name, categoryId, isActive, updatedAt',
      customers: 'id, storeId, name, phone, isActive, updatedAt',
      sales: 'id, storeId, number, status, customerId, dayKey, createdAt, updatedAt',
      sale_items: 'id, saleId, productId, dayKey',
      expenses: 'id, storeId, categoryId, dayKey, createdAt, updatedAt',
      inventory_movements: 'id, storeId, productId, type, dayKey, createdAt',
      categories: 'id, storeId, name, sortOrder',
      settings: 'storeId, id',
      pending_operations: 'id, storeId, operationId, entity, entityId, operation, status, createdAt, nextRetryAt',
      sync_meta: 'storeId, id'
    });
  }
}

export const db = new PosDatabase();

export type Db = typeof db;
