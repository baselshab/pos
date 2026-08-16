import type { IEntity } from '@/repositories/base.repository';
import { createLocalRepository } from '@/repositories/local.factory';
import { createRemoteRepository } from '@/repositories/remote.factory';

export type Category = IEntity & {
  name: string;
  color?: string;
  icon?: string;
  sortOrder: number;
};

export const categoriesLocal = createLocalRepository<Category>('categories');
export const categoriesRemote = createRemoteRepository<Category>('categories');
