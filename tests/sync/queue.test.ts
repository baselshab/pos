import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { SyncQueue } from '@/lib/sync/queue';

describe('SyncQueue', () => {
  beforeEach(async () => {
    await db.pending_operations.clear();
  });

  it('should create and retrieve pending operations', async () => {
    const queue = new SyncQueue();
    await queue.create({
      id: 'op-1',
      operationId: 'op-id-1',
      deviceId: 'device-1',
      storeId: 'store-1',
      entity: 'products',
      entityId: 'prod-1',
      operation: 'create',
      payload: { name: 'Test' },
      status: 'pending',
      retryCount: 0,
      lastError: null,
      nextRetryAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const pending = await queue.listByStatus('pending');
    expect(pending).toHaveLength(1);
    expect(pending[0].entityId).toBe('prod-1');
  });

  it('should update operation status', async () => {
    const queue = new SyncQueue();
    await queue.create({
      id: 'op-1',
      operationId: 'op-id-1',
      deviceId: 'device-1',
      storeId: 'store-1',
      entity: 'products',
      entityId: 'prod-1',
      operation: 'create',
      payload: { name: 'Test' },
      status: 'pending',
      retryCount: 0,
      lastError: null,
      nextRetryAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await queue.updateStatus('op-1', 'syncing');
    const ops = await queue.listByStatus('syncing');
    expect(ops).toHaveLength(1);
  });

  it('should mark failed after max retries', async () => {
    const queue = new SyncQueue();
    await queue.create({
      id: 'op-1',
      operationId: 'op-id-1',
      deviceId: 'device-1',
      storeId: 'store-1',
      entity: 'products',
      entityId: 'prod-1',
      operation: 'create',
      payload: { name: 'Test' },
      status: 'pending',
      retryCount: 0,
      lastError: null,
      nextRetryAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await queue.markFailed('op-1', 'Error', 10, null);
    const ops = await queue.listByStatus('failed');
    expect(ops).toHaveLength(1);
  });
});
