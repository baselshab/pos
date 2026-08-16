'use server';

import { SettingsService } from '@/services/settings.service';

const service = new SettingsService();

export async function getSettings(storeId: string) {
  return service.get(storeId);
}

export async function updateSettings(storeId: string, values: Record<string, any>) {
  return service.update(storeId, values);
}
