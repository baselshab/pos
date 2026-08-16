import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { productsLocal } from '@/repositories/products.repository';

describe('ProductsRepository', () => {
  beforeEach(async () => {
    await db.products.clear();
  });

  it('should create and retrieve a product', async () => {
    const product = await productsLocal.create('store-1', {
      sku: 'SKU-001',
      name: 'Test Product',
      unit: 'pcs',
      costMinor: 1000,
      priceMinor: 2000,
      taxRateBp: 1500,
      quantity: 10,
      lowStockThreshold: 5,
      isActive: true,
      storeId: 'store-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    expect(product.id).toBeDefined();
    expect(product.name).toBe('Test Product');

    const retrieved = await productsLocal.get('store-1', product.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Test Product');
  });

  it('should list products by store', async () => {
    await productsLocal.create('store-1', {
      sku: 'SKU-001', name: 'Product 1', unit: 'pcs', costMinor: 1000, priceMinor: 2000, taxRateBp: 1500, quantity: 10, lowStockThreshold: 5, isActive: true, storeId: 'store-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
    await productsLocal.create('store-2', {
      sku: 'SKU-002', name: 'Product 2', unit: 'pcs', costMinor: 1000, priceMinor: 2000, taxRateBp: 1500, quantity: 10, lowStockThreshold: 5, isActive: true, storeId: 'store-2', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });

    const store1Products = await productsLocal.list('store-1');
    expect(store1Products).toHaveLength(1);
    expect(store1Products[0].name).toBe('Product 1');
  });

  it('should update a product', async () => {
    const product = await productsLocal.create('store-1', {
      sku: 'SKU-001', name: 'Test Product', unit: 'pcs', costMinor: 1000, priceMinor: 2000, taxRateBp: 1500, quantity: 10, lowStockThreshold: 5, isActive: true, storeId: 'store-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });

    const updated = await productsLocal.update('store-1', product.id, { name: 'Updated Product' });
    expect(updated.name).toBe('Updated Product');
  });

  it('should delete a product', async () => {
    const product = await productsLocal.create('store-1', {
      sku: 'SKU-001', name: 'Test Product', unit: 'pcs', costMinor: 1000, priceMinor: 2000, taxRateBp: 1500, quantity: 10, lowStockThreshold: 5, isActive: true, storeId: 'store-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });

    await productsLocal.delete('store-1', product.id);
    const retrieved = await productsLocal.get('store-1', product.id);
    expect(retrieved).toBeUndefined();
  });
});
