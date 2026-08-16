'use server';

import { InventoryService } from '@/services/inventory.service';

const service = new InventoryService();

export async function getInventoryMovements(storeId: string) {
  return service.listMovements(storeId);
}

export async function recordAdjustment(storeId: string, data: any) {
  return service.recordAdjustment(storeId, data);
}

export async function recordStocktake(storeId: string, productId: string, countedQuantity: number, note?: string) {
  return service.recordStocktake(storeId, productId, countedQuantity, note);
}
