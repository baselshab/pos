'use server';

import { SalesService } from '@/services/sales.service';

const service = new SalesService();

export async function getSales(storeId: string) {
  return service.list(storeId);
}

export async function createSale(storeId: string, data: any) {
  return service.create(storeId, data);
}

export async function cancelSale(storeId: string, id: string, reason: string) {
  return service.cancel(storeId, id, reason);
}
