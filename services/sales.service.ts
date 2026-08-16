import { BaseService } from './base.service';
import { salesLocal } from '@/repositories/sales.repository';
import { saleItemsLocal } from '@/repositories/sale_items.repository';
import { inventoryMovementsLocal } from '@/repositories/inventory_movements.repository';
import { pendingOperationsLocal } from '@/repositories/pending_operations.repository';
import type { Sale, CreateSaleInput } from '@/repositories/sales.repository';

export class SalesService extends BaseService {
  async list(_storeId: string): Promise<Sale[]> {
    return salesLocal.list(_storeId);
  }

  async get(storeId: string, id: string): Promise<Sale | null> {
    return salesLocal.get(storeId, id);
  }

  async create(storeId: string, input: CreateSaleInput): Promise<Sale> {
    const operationId = this.generateOperationId();
    const deviceId = this.getDeviceId();
    const now = new Date().toISOString();

    return this.withLocal(['sales', 'sale_items', 'inventory_movements', 'pending_operations'], async () => {
      const sale = await salesLocal.create(storeId, {
        ...input.sale,
        operationId,
        deviceId,
        createdAt: now,
        updatedAt: now
      });

      for (const item of input.items) {
        await saleItemsLocal.create(storeId, {
          saleId: sale.id,
          storeId,
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          unit: 'قطعة',
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
          unitCostMinor: item.unitPriceMinor,
          lineDiscountMinor: 0,
          lineTotalMinor: item.unitPriceMinor * item.quantity,
          dayKey: new Date().toISOString().slice(0, 10),
          operationId,
          deviceId,
          createdAt: now,
          updatedAt: now
        });

        await inventoryMovementsLocal.create(storeId, {
          storeId,
          productId: item.productId,
          sku: item.sku,
          productName: item.name,
          type: 'sale',
          quantity: -item.quantity,
          balanceAfter: 0,
          reason: 'بيع',
          refType: 'sale',
          refId: sale.id,
          actorId: deviceId,
          dayKey: new Date().toISOString().slice(0, 10),
          operationId,
          deviceId,
          createdAt: now,
          updatedAt: now
        });
      }

      await pendingOperationsLocal.create({
        id: crypto.randomUUID(),
        operationId,
        deviceId,
        storeId,
        entity: 'sales',
        entityId: sale.id,
        operation: 'create',
        payload: { sale, items: input.items },
        status: 'pending',
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
        nextRetryAt: null,
        lastError: null
      });

      return sale;
    });
  }

  async cancel(storeId: string, id: string, reason: string): Promise<Sale> {
    const sale = await salesLocal.get(storeId, id);
    if (!sale) throw new Error('Sale not found');

    return salesLocal.update(storeId, id, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelReason: reason
    });
  }
}
