import type { IEntity } from '@/repositories/base.repository';
import { createLocalRepository } from '@/repositories/local.factory';
import { createRemoteRepository } from '@/repositories/remote.factory';

export type Customer = IEntity & {
  name: string;
  phone?: string;
  note?: string;
  isActive: boolean;
};

export type CreateCustomerInput = Omit<Customer, 'id'>;

export const customersLocal = createLocalRepository<Customer>('customers');
export const customersRemote = createRemoteRepository<Customer>('customers');
