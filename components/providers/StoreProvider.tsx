'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '@/lib/db';
import { SyncEngine } from '@/lib/sync/engine';
import { syncService } from '@/lib/sync/service';

interface StoreContextValue {
  storeId: string | null;
  loading: boolean;
  syncEngine: SyncEngine | null;
}

const StoreContext = createContext<StoreContextValue>({
  storeId: null,
  loading: true,
  syncEngine: null
});

export function useStore() {
  return useContext(StoreContext);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncEngine, setSyncEngine] = useState<SyncEngine | null>(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        const engine = new SyncEngine(storeId);
        engine.start();
        setSyncEngine(engine);

        const meta = await db.sync_meta.toCollection().first();
        if (meta?.storeId) {
          setStoreId(meta.storeId);
        }
      } catch (error) {
        console.error('Store bootstrap failed:', error);
      } finally {
        setLoading(false);
      }
    }

    bootstrap();

    return () => {
      // cleanup sync engine
    };
  }, [storeId]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <StoreContext.Provider value={{ storeId, loading, syncEngine }}>
      {children}
    </StoreContext.Provider>
  );
}
