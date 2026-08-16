export interface IEntity {
  id: string;
  storeId: string;
  operationId?: string;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ILocalRepository<T extends IEntity> {
  list(storeId: string): Promise<T[]>;
  get(storeId: string, id: string): Promise<T | null>;
  create(storeId: string, data: Omit<T, 'id'>): Promise<T>;
  update(storeId: string, id: string, data: Partial<Omit<T, 'id'>>): Promise<T>;
  delete(storeId: string, id: string): Promise<void>;
}

export interface IRemoteRepository<T extends IEntity> {
  list(storeId: string): Promise<T[]>;
  get(storeId: string, id: string): Promise<T | null>;
  create(storeId: string, data: T): Promise<T>;
  update(storeId: string, id: string, data: Partial<T>): Promise<T>;
  delete(storeId: string, id: string): Promise<void>;
}
