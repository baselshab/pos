'use server';

import { ExpensesService } from '@/services/expenses.service';

const service = new ExpensesService();

export async function getExpenses(storeId: string) {
  return service.list(storeId);
}

export async function createExpense(storeId: string, data: any) {
  return service.create(storeId, data);
}

export async function updateExpense(storeId: string, id: string, data: any) {
  return service.update(storeId, id, data);
}

export async function deleteExpense(storeId: string, id: string) {
  return service.delete(storeId, id);
}
