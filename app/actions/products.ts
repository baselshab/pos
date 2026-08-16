'use server';

import { ProductsService } from '@/services/products.service';

const service = new ProductsService();

export async function getProducts(storeId: string) {
  return service.list(storeId);
}

export async function createProduct(storeId: string, data: any) {
  return service.create(storeId, data);
}

export async function updateProduct(storeId: string, id: string, data: any) {
  return service.update(storeId, id, data);
}

export async function deleteProduct(storeId: string, id: string) {
  return service.delete(storeId, id);
}
