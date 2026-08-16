import { db } from '@/lib/db';

export const pendingOperationsLocal = {
  async listByStatus(status: string) {
    return db.table('pending_operations').where('status').equals(status as any).toArray();
  },

  async get(id: string) {
    return db.table('pending_operations').get(id);
  },

  async create(op: any) {
    await db.table('pending_operations').put(op);
  },

  async update(id: string, data: any) {
    await db.table('pending_operations').update(id, { ...data, updatedAt: new Date().toISOString() });
  },

  async delete(id: string) {
    await db.table('pending_operations').delete(id);
  }
};
