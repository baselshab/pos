'use server';

import { CustomersService } from '@/services/customers.service';

const service = new CustomersService();

export async function getCustomers(storeId: string) {
  return service.list(storeId);
}

export async function createCustomer(storeId: string, data: any) {
  return service.create(storeId, data);
}

export async function updateCustomer(storeId: string, id: string, data: any) {
  return service.update(storeId, id, data);
}

export async function deleteCustomer(storeId: string, id: string) {
  return service.delete(storeId, id);
}
