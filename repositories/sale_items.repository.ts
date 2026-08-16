import type { IEntity } from '@/repositories/base.repository';
import { createLocalRepository } from '@/repositories/local.factory';
import { createRemoteRepository } from '@/repositories/remote.factory';

export type SaleItem = IEntity & {
  saleId: string;
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
};

export const saleItemsLocal = createLocalRepository<SaleItem>('sale_items');
export const saleItemsRemote = createRemoteRepository<SaleItem>('sale_items');
