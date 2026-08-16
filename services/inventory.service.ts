import { BaseService } from './base.service';
import { inventoryMovementsLocal } from '@/repositories/inventory_movements.repository';
import { pendingOperationsLocal } from '@/repositories/pending_operations.repository';
import type { InventoryMovement, CreateInventoryMovementInput } from '@/repositories/inventory_movements.repository';

export class InventoryService extends BaseService {
  async listMovements(_storeId: string): Promise<InventoryMovement[]> {
    return inventoryMovementsLocal.list(_storeId);
  }

  async recordAdjustment(storeId: string, input: CreateInventoryMovementInput): Promise<InventoryMovement> {
    const operationId = this.generateOperationId();
    const deviceId = this.getDeviceId();
    const now = new Date().toISOString();

    return this.withLocal(['inventory_movements', 'pending_operations'], async () => {
      const { storeId: _storeId, ...rest } = input as any;
      const movement = await inventoryMovementsLocal.create(storeId, {
        ...rest,
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
        entity: 'inventory_movements',
        entityId: movement.id,
        operation: 'create',
        payload: movement,
        status: 'pending',
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
        nextRetryAt: null,
        lastError: null
      });

      return movement;
    });
  }

  async recordStocktake(storeId: string, productId: string, countedQuantity: number, note?: string): Promise<InventoryMovement> {
    const movements = await inventoryMovementsLocal.list(storeId);
    const currentStock = movements.reduce((sum: number, m: any) => sum + m.quantity, 0);
    const delta = countedQuantity - currentStock;

    return this.recordAdjustment(storeId, {
      storeId,
      productId,
      sku: '',
      productName: '',
      type: 'count',
      quantity: delta,
      balanceAfter: countedQuantity,
      reason: 'جرد',
      note,
      refType: 'stocktake',
      refId: productId,
      actorId: this.getDeviceId(),
      dayKey: new Date().toISOString().slice(0, 10)
    });
  }
}
