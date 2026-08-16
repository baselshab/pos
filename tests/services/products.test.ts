import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { ProductsService } from '@/services/products.service';

describe('ProductsService', () => {
  beforeEach(async () => {
    await db.products.clear();
    await db.pending_operations.clear();
  });

  it('should create a product with operationId and deviceId', async () => {
    const service = new ProductsService();
    const product = await service.create('store-1', {
      sku: 'SKU-001',
      name: 'Test Product',
      unit: 'pcs',
      costMinor: 1000,
      priceMinor: 2000,
      taxRateBp: 1500,
      quantity: 10,
      lowStockThreshold: 5,
      isActive: true
    });

    expect(product.id).toBeDefined();
    expect(product.operationId).toBeDefined();
    expect(product.deviceId).toBeDefined();

    const pendingOps = await db.pending_operations.where('entity').equals('products').toArray();
    expect(pendingOps).toHaveLength(1);
    expect(pendingOps[0].entityId).toBe(product.id);
  });

  it('should list products', async () => {
    const service = new ProductsService();
    await service.create('store-1', {
      sku: 'SKU-001', name: 'Product 1', unit: 'pcs', costMinor: 1000, priceMinor: 2000, taxRateBp: 1500, quantity: 10, lowStockThreshold: 5, isActive: true
    });

    const products = await service.list('store-1');
    expect(products).toHaveLength(1);
  });
});
