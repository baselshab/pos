import { db } from '@/lib/db';
import { queue } from '@/lib/sync/queue';
import { syncService } from '@/lib/sync/service';
import type { SyncCursor } from '@/lib/sync/cursor';

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

export class SyncEngine {
  private running = false;
  private timer: number | null = null;
  private online: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor(
    private storeId: string | null
  ) {}

  start() {
    if (this.online) this.run();
    window.addEventListener('online', () => { this.online = true; this.run(); });
    window.addEventListener('offline', () => { this.online = false; });
    this.timer = window.setInterval(() => { if (this.online) this.run(); }, 30000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  async run() {
    if (this.running || !this.storeId) return;
    this.running = true;
    try {
      await this.processQueue();
      if (this.online) await this.pullRemoteChanges();
    } finally {
      this.running = false;
    }
  }

  private async processQueue() {
    const pending = await queue.listByStatus('pending');
    const failed = await queue.listByStatus('failed');
    const all = [...pending, ...failed];

    for (const op of all) {
      if (op.nextRetryAt && new Date(op.nextRetryAt) > new Date()) continue;

      await queue.updateStatus(op.id, 'syncing');
      try {
        await syncService.push(op);
        await queue.updateStatus(op.id, 'synced');
      } catch (error: unknown) {
        const status = (error as any)?.status || (error as any)?.code;
        const isNonRetryable = [401, 403, 400, 409].includes(status);
        if (isNonRetryable) {
          await queue.markFailed(op.id, (error as Error)?.message || 'Non-retryable error', op.retryCount + 1, null);
        } else {
          const retryCount = op.retryCount + 1;
          const baseDelays = [2000, 5000, 15000, 30000, 60000];
          const delay = baseDelays[Math.min(retryCount - 1, baseDelays.length - 1)];
          const jitter = Math.random() * 1000;
          const nextRetryAt = new Date(Date.now() + delay + jitter).toISOString();
          await queue.markFailed(op.id, (error as Error)?.message || 'Retryable error', retryCount, nextRetryAt);
        }
      }
    }
  }

  private async pullRemoteChanges() {
    if (!this.storeId) return;
    const cursor = await syncService.getCursor(this.storeId);
    const changes = await syncService.pull(this.storeId, cursor.lastSyncId);

    if (changes.length === 0) return;

    await db.transaction('rw', [
      db.sync_meta,
      db.products as any,
      db.customers as any,
      db.sales as any,
      db.sale_items as any,
      db.expenses as any,
      db.inventory_movements as any,
      db.categories as any,
      db.settings as any
    ], async () => {
      for (const change of changes) {
        await this.applyChange(change);
      }
      const maxId = Math.max(...changes.map(c => c.id));
      await db.sync_meta.put({
        id: this.storeId!,
        storeId: this.storeId!,
        lastSyncId: maxId,
        lastSyncedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
  }

  private async applyChange(change: { entity: string; entity_id: string; operation: string; payload: Record<string, any> }) {
    const table = (db as any)[change.entity];
    if (!table) return;

    if (change.operation === 'delete') {
      await table.delete(change.entity_id);
    } else {
      await table.put(change.payload);
    }
  }
}
