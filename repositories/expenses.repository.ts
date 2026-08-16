import type { IEntity } from '@/repositories/base.repository';
import { createLocalRepository } from '@/repositories/local.factory';
import { createRemoteRepository } from '@/repositories/remote.factory';

export type Expense = IEntity & {
  categoryId: string;
  title: string;
  amountMinor: number;
  method?: string;
  reference?: string;
  note?: string;
  attachmentUrl?: string;
  dayKey: string;
};

export type CreateExpenseInput = Omit<Expense, 'id'>;

export const expensesLocal = createLocalRepository<Expense>('expenses');
export const expensesRemote = createRemoteRepository<Expense>('expenses');
