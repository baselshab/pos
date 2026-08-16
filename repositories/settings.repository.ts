import type { IEntity } from '@/repositories/base.repository';
import { createLocalRepository } from '@/repositories/local.factory';
import { createRemoteRepository } from '@/repositories/remote.factory';

export type Setting = IEntity & {
  values: Record<string, any>;
};

export const settingsLocal = createLocalRepository<Setting>('settings');
export const settingsRemote = createRemoteRepository<Setting>('settings');
