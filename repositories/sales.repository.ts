import type { IEntity } from '@/repositories/base.repository';
import { createLocalRepository } from '@/repositories/local.factory';
import { createRemoteRepository } from '@/repositories/remote.factory';

export type Sale = IEntity & {
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
};

export type CartLine = {
  productId: string;
  name: string;
  sku: string;
  unitPriceMinor: number;
  quantity: number;
};

export type CreateSaleInput = {
  sale: Omit<Sale, 'id'>;
  items: CartLine[];
};

export const salesLocal = createLocalRepository<Sale>('sales');
export const salesRemote = createRemoteRepository<Sale>('sales');
