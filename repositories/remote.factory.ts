export function createRemoteRepository<T extends { id: string }>(
  _tableName: string
): { list(_storeId: string): Promise<T[]>; get(_storeId: string, _id: string): Promise<T | null>; create(_storeId: string, data: T): Promise<T>; update(_storeId: string, _id: string, _data: Partial<T>): Promise<T>; delete(_storeId: string, _id: string): Promise<void> } {
  return {
    async list() {
      return [];
    },

    async get() {
      return null as any;
    },

    async create(_storeId: string, data: T) {
      return data;
    },

    async update(_storeId: string, _id: string, _data: Partial<T>) {
      return {} as T;
    },

    async delete(_storeId: string, _id: string) {
      // handled via sync
    }
  };
}
