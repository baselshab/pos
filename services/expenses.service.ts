import { BaseService } from './base.service';
import { expensesLocal } from '@/repositories/expenses.repository';
import { pendingOperationsLocal } from '@/repositories/pending_operations.repository';
import type { Expense, CreateExpenseInput } from '@/repositories/expenses.repository';

export class ExpensesService extends BaseService {
  async list(_storeId: string): Promise<Expense[]> {
    return expensesLocal.list(_storeId);
  }

  async get(storeId: string, id: string): Promise<Expense | null> {
    return expensesLocal.get(storeId, id);
  }

  async create(storeId: string, input: CreateExpenseInput): Promise<Expense> {
    const operationId = this.generateOperationId();
    const deviceId = this.getDeviceId();
    const now = new Date().toISOString();

    return this.withLocal(['expenses', 'pending_operations'], async () => {
      const expense = await expensesLocal.create(storeId, {
        ...input,
        operationId,
        deviceId,
        createdAt: now,
        updatedAt: now
      });

      await pendingOperationsLocal.create({
        id: crypto.randomUUID(),
        operationId,
        deviceId,
        storeId,
        entity: 'expenses',
        entityId: expense.id,
        operation: 'create',
        payload: expense,
        status: 'pending',
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
        nextRetryAt: null,
        lastError: null
      });

      return expense;
    });
  }

  async update(storeId: string, id: string, data: Partial<Expense>): Promise<Expense> {
    return expensesLocal.update(storeId, id, data);
  }

  async delete(storeId: string, id: string): Promise<void> {
    await expensesLocal.delete(storeId, id);
  }
}
