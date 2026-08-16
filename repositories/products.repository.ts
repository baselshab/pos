import type { IEntity } from '@/repositories/base.repository';
import { createLocalRepository } from '@/repositories/local.factory';
import { createRemoteRepository } from '@/repositories/remote.factory';

export type Product = IEntity & {
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
};

export type CreateProductInput = Omit<Product, 'id'>;

export const productsLocal = createLocalRepository<Product>('products');
export const productsRemote = createRemoteRepository<Product>('products');
