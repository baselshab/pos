import { db } from '@/lib/db';

export interface PendingOperation {
  id: string;
  operationId: string;
  deviceId: string;
  storeId: string;
  entity: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: Record<string, any>;
  status: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
  retryCount: number;
  lastError: string | null;
  nextRetryAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export class SyncQueue {
  async listByStatus(status: string) {
    return db.table('pending_operations').where('status').equals(status as any).toArray();
  }

  async updateStatus(id: string, status: string) {
    await db.table('pending_operations').update(id, { status: status as any, updatedAt: new Date().toISOString() });
  }

  async markFailed(id: string, error: string, retryCount: number, nextRetryAt: string | null) {
    await db.table('pending_operations').update(id, {
      status: retryCount >= 10 ? 'failed' : 'pending',
      lastError: error,
      retryCount,
      nextRetryAt,
      updatedAt: new Date().toISOString()
    });
  }

  async create(op: Omit<PendingOperation, 'id'> & { id: string }) {
    await db.table('pending_operations').put(op);
  }
}

export const queue = new SyncQueue();
