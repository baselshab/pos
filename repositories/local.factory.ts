import { db } from '@/lib/db';

export function createLocalRepository<T extends { id: string }>(
  _tableName: string
): { list(storeId: string): Promise<T[]>; get(storeId: string, id: string): Promise<T | null>; create(storeId: string, data: any): Promise<T>; update(storeId: string, id: string, data: Partial<Omit<T, 'id'>>): Promise<T>; delete(storeId: string, id: string): Promise<void> } {
  const table = db.table(_tableName);

  return {
    async list(storeId: string) {
      return table.where('storeId').equals(storeId).toArray();
    },

    async get(_storeId: string, id: string) {
      return table.get(id);
    },

    async create(storeId: string, data: any) {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const record = { ...data, id, storeId, createdAt: now, updatedAt: now } as unknown as T;
      await table.put(record);
      return record;
    },

    async update(_storeId: string, id: string, data: Partial<Omit<T, 'id'>>) {
      const now = new Date().toISOString();
      const record = await table.get(id);
      if (!record) throw new Error(`${_tableName} not found: ${id}`);
      const updated = { ...record, ...data, updatedAt: now } as T;
      await table.put(updated);
      return updated;
    },

    async delete(_storeId: string, id: string) {
      await table.delete(id);
    }
  };
}
