import { BaseService } from './base.service';
import { customersLocal } from '@/repositories/customers.repository';
import { pendingOperationsLocal } from '@/repositories/pending_operations.repository';
import type { Customer, CreateCustomerInput } from '@/repositories/customers.repository';

export class CustomersService extends BaseService {
  async list(_storeId: string): Promise<Customer[]> {
    return customersLocal.list(_storeId);
  }

  async get(storeId: string, id: string): Promise<Customer | null> {
    return customersLocal.get(storeId, id);
  }

  async create(storeId: string, input: CreateCustomerInput): Promise<Customer> {
    const operationId = this.generateOperationId();
    const deviceId = this.getDeviceId();
    const now = new Date().toISOString();

    return this.withLocal(['customers', 'pending_operations'], async () => {
      const customer = await customersLocal.create(storeId, {
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
        entity: 'customers',
        entityId: customer.id,
        operation: 'create',
        payload: customer,
        status: 'pending',
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
        nextRetryAt: null,
        lastError: null
      });

      return customer;
    });
  }

  async update(storeId: string, id: string, data: Partial<Customer>): Promise<Customer> {
    return customersLocal.update(storeId, id, data);
  }

  async delete(storeId: string, id: string): Promise<void> {
    await customersLocal.delete(storeId, id);
  }
}
