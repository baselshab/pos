import type { IEntity } from '@/repositories/base.repository';
import { createLocalRepository } from '@/repositories/local.factory';
import { createRemoteRepository } from '@/repositories/remote.factory';

export type InventoryMovement = IEntity & {
  productId: string;
  sku: string;
  productName: string;
  type: string;
  quantity: number;
  balanceAfter: number;
  reason?: string;
  note?: string;
  refType?: string;
  refId?: string;
  actorId: string;
  dayKey: string;
};

export type CreateInventoryMovementInput = Omit<InventoryMovement, 'id' | 'createdAt' | 'updatedAt' | 'operationId' | 'deviceId'>;

export const inventoryMovementsLocal = createLocalRepository<InventoryMovement>('inventory_movements');
export const inventoryMovementsRemote = createRemoteRepository<InventoryMovement>('inventory_movements');
