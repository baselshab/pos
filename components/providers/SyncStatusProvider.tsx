'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

interface SyncContextValue {
  status: SyncStatus;
  pendingCount: number;
  failedCount: number;
  lastSyncError: string | null;
}

const SyncContext = createContext<SyncContextValue>({
  status: 'idle',
  pendingCount: 0,
  failedCount: 0,
  lastSyncError: null
});

export function useSync() {
  return useContext(SyncContext);
}

export function SyncStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [pendingCount, _setPendingCount] = useState(0);
  const [failedCount, _setFailedCount] = useState(0);
  const [lastSyncError, _setLastSyncError] = useState<string | null>(null);

  return (
    <SyncContext.Provider value={{ status, pendingCount, failedCount, lastSyncError }}>
      {children}
    </SyncContext.Provider>
  );
}
