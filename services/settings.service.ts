import { BaseService } from './base.service';
import { settingsLocal } from '@/repositories/settings.repository';
import { pendingOperationsLocal } from '@/repositories/pending_operations.repository';

export class SettingsService extends BaseService {
  async get(storeId: string): Promise<Record<string, any>> {
    const setting = await settingsLocal.get(storeId, storeId);
    return setting?.values || {};
  }

  async update(storeId: string, values: Record<string, any>): Promise<Record<string, any>> {
    const operationId = this.generateOperationId();
    const deviceId = this.getDeviceId();
    const now = new Date().toISOString();

    return this.withLocal(['settings', 'pending_operations'], async () => {
      const existing = await settingsLocal.get(storeId, storeId);
      const merged = { ...existing?.values, ...values };

      const setting = await settingsLocal.update(storeId, storeId, {
        values: merged,
        updatedAt: now
      });

      await pendingOperationsLocal.create({
        id: crypto.randomUUID(),
        operationId,
        deviceId,
        storeId,
        entity: 'settings',
        entityId: storeId,
        operation: 'update',
        payload: setting,
        status: 'pending',
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
        nextRetryAt: null,
        lastError: null
      });

      return setting.values;
    });
  }
}
