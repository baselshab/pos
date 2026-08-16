import { BaseService } from './base.service';
import { productsLocal } from '@/repositories/products.repository';
import { pendingOperationsLocal } from '@/repositories/pending_operations.repository';
import type { Product, CreateProductInput } from '@/repositories/products.repository';

export interface ProductFilters {
  categoryId?: string;
  query?: string;
}

export class ProductsService extends BaseService {
  async list(_storeId: string, _filters?: ProductFilters): Promise<Product[]> {
    return productsLocal.list(_storeId);
  }

  async get(storeId: string, id: string): Promise<Product | null> {
    return productsLocal.get(storeId, id);
  }

  async create(storeId: string, input: CreateProductInput): Promise<Product> {
    const operationId = this.generateOperationId();
    const deviceId = this.getDeviceId();
    const now = new Date().toISOString();

    return this.withLocal(['products', 'pending_operations'], async () => {
      const product = await productsLocal.create(storeId, {
        ...input,
        operationId,
        deviceId,
        createdAt: now,
        updatedAt: now
      });

      await pendingOperationsLocal.create({
        id: crypto.randomUUID(),
        operationId,
        deviceId,
        storeId,
        entity: 'products',
        entityId: product.id,
        operation: 'create',
        payload: product,
        status: 'pending',
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
        nextRetryAt: null,
        lastError: null
      });

      return product;
    });
  }

  async update(storeId: string, id: string, data: Partial<Product>): Promise<Product> {
    return productsLocal.update(storeId, id, data);
  }

  async delete(storeId: string, id: string): Promise<void> {
    await productsLocal.delete(storeId, id);
  }
}
