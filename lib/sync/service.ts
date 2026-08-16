import { db } from '@/lib/db';
import { createClient } from '@/lib/client';

export interface SyncCursor {
  storeId: string;
  lastSyncId: number;
}

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

export interface SyncService {
  push(op: PendingOperation): Promise<any>;
  pull(storeId: string, lastSyncId: number): Promise<any[]>;
  getCursor(storeId: string): Promise<SyncCursor>;
}

export class DefaultSyncService implements SyncService {
  async push(op: PendingOperation) {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('process_mutation', {
      p_operation_id: op.operationId,
      p_device_id: op.deviceId,
      p_store_id: op.storeId,
      p_entity: op.entity,
      p_entity_id: op.entityId,
      p_operation: op.operation,
      p_payload: op.payload
    });

    if (error) throw error;
    return data;
  }

  async pull(storeId: string, lastSyncId: number) {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('pull_changes', {
      p_store_id: storeId,
      p_last_sync_id: lastSyncId,
      p_limit: 100
    });

    if (error) throw error;
    return (data as any[]) || [];
  }

  async getCursor(storeId: string) {
    const meta = await db.sync_meta.get(storeId);
    return {
      storeId,
      lastSyncId: meta?.lastSyncId || 0
    };
  }
}

export const syncService = new DefaultSyncService();
