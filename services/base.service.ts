import { db } from '@/lib/db';
import { syncService } from '@/lib/sync/service';
import type { SyncCursor } from '@/lib/sync/cursor';

export class BaseService {
  protected generateOperationId(): string {
    return crypto.randomUUID();
  }

  protected getDeviceId(): string {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('pos_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('pos_device_id', id);
    }
    return id;
  }

  protected async withLocal<T>(
    tables: string[],
    work: (tx: unknown) => Promise<T>
  ): Promise<T> {
    const tableRefs = tables.map(t => (db as any)[t]);
    return db.transaction('rw', tableRefs, async () => {
      const result = await work({});
      return result;
    });
  }

  protected async enqueueSync(op: any) {
    const { queue } = await import('@/lib/sync/queue');
    await queue.create(op);
    if (navigator.onLine) {
      setTimeout(() => syncService.pull('', 0), 0);
    }
  }

  protected async getCursor(storeId: string): Promise<SyncCursor> {
    const meta = await db.sync_meta.get(storeId);
    return {
      storeId,
      lastSyncId: meta?.lastSyncId || 0
    };
  }
}
