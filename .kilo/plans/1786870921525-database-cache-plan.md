# POS Offline-First Architecture Plan — v4

## Core Decisions
1. **Auth**: Custom login/signup pages at `/auth/login` and `/auth/signup`
2. **Store**: Single-store UX; schema remains multi-store-ready via `store_members`
3. **Offline-first**: IndexedDB (Dexie) is the local source of truth. Supabase syncs in background.

---

## 1. Schema Changes Required

Add to `supabase/migrations/0005_offline_sync.sql`:

```sql
-- operation_id + device_id for idempotency
ALTER TABLE sales ADD COLUMN operation_id uuid UNIQUE;
ALTER TABLE sales ADD COLUMN device_id text NOT NULL DEFAULT '';
ALTER TABLE sale_items ADD COLUMN operation_id uuid;
ALTER TABLE sale_items ADD COLUMN device_id text NOT NULL DEFAULT '';
ALTER TABLE inventory_movements ADD COLUMN operation_id uuid UNIQUE;
ALTER TABLE inventory_movements ADD COLUMN device_id text NOT NULL DEFAULT '';
ALTER TABLE expenses ADD COLUMN operation_id uuid UNIQUE;
ALTER TABLE expenses ADD COLUMN device_id text NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN operation_id uuid;
ALTER TABLE products ADD COLUMN device_id text;
ALTER TABLE customers ADD COLUMN operation_id uuid;
ALTER TABLE customers ADD COLUMN device_id text;
ALTER TABLE categories ADD COLUMN operation_id uuid;
ALTER TABLE categories ADD COLUMN device_id text;
ALTER TABLE settings ADD COLUMN operation_id uuid;
ALTER TABLE settings ADD COLUMN device_id text;

-- server-side idempotency registry
CREATE TABLE processed_operations (
  operation_id uuid PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL,
  operation text NOT NULL,
  processed_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(store_id, operation_id)
);

-- global sync change log per store
CREATE TABLE sync_changes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  entity text NOT NULL,
  entity_id text NOT NULL,
  operation text NOT NULL,
  operation_id uuid,
  changed_at timestamptz DEFAULT now() NOT NULL,
  payload jsonb
);

CREATE INDEX idx_sync_changes_store_id_id
ON sync_changes(store_id, id);

-- simplified sync_meta: one cursor per store, using last_sync_id
CREATE TABLE sync_meta (
  store_id uuid PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  last_sync_id bigint DEFAULT 0 NOT NULL,
  last_synced_at timestamptz,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

**Note**: Do NOT add per-row `version` columns or version triggers. The global `sync_changes.id` is the sole synchronization cursor. `updated_at` may remain for UI sorting and LWW conflict comparison, but must NOT be used as the sync cursor.

```sql
-- Helper function to advance sync cursor atomically after applying changes
CREATE OR REPLACE FUNCTION advance_sync_cursor(p_store_id uuid, p_last_sync_id bigint)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO sync_meta (store_id, last_sync_id, last_synced_at)
  VALUES (p_store_id, p_last_sync_id, now())
  ON CONFLICT (store_id) DO UPDATE
  SET last_sync_id = EXCLUDED.last_sync_id,
      last_synced_at = EXCLUDED.last_synced_at;
END;
$$;
```
```

---

## 2. Critical Architecture Constraints

- **IndexedDB is browser-only.** Never read Dexie from Server Components, Server Actions, or any server-side code.
- **Server Components** may only be used for auth/bootstrap (e.g., reading session cookies, redirecting).
- **All data-access components must be Client Components** (`"use client"`).
- The client loads local store data from IndexedDB immediately after auth/store initialization.

---

## 3. Directory Structure

```
lib/
  db/
    index.ts              ← Dexie instance + schema
    schema.ts             ← table definitions
    device-id.ts          ← persistent device UUID
  sync/
    engine.ts             ← background sync orchestrator
    queue.ts              ← durable queue CRUD
    cursor.ts             ← sync cursor read/write
  server.ts               ← keep, add getSupabaseServer()
  client.ts               ← keep for browser auth
  store.tsx               ← keep (AppStateProvider)

repositories/
  base.repository.ts      ← interfaces
  products/
    local.repository.ts   ← Dexie
    remote.repository.ts  ← Supabase
  customers/
    local.repository.ts
    remote.repository.ts
  sales/
    local.repository.ts
    remote.repository.ts
  sale_items/
    local.repository.ts
    remote.repository.ts
  expenses/
    local.repository.ts
    remote.repository.ts
  inventory_movements/
    local.repository.ts
    remote.repository.ts
  categories/
    local.repository.ts
    remote.repository.ts
  settings/
    local.repository.ts
    remote.repository.ts
  pending_operations/
    local.repository.ts  ← Dexie queue
    remote.repository.ts ← Supabase (for audit/debug)
  index.ts

services/
  base.service.ts         ← generateOperationId(), validate*, common sync helpers
  products.service.ts
  customers.service.ts
  sales.service.ts
  sale_items.service.ts
  inventory.service.ts
  expenses.service.ts
  settings.service.ts
  sync.service.ts         ← orchestrates push/pull
  index.ts

app/
  auth/
    login/
      page.tsx
    signup/
      page.tsx
    callback/
      route.ts
  actions/
    auth/
      login.ts
      signup.ts
    sales/
      create.ts

components/
  providers/
    StoreProvider.tsx      ← client component, bootstraps store + loads IndexedDB
    SyncStatusProvider.tsx ← exposes sync state to UI
```

---

## 4. IndexedDB Schema (Dexie)

```ts
// lib/db/schema.ts
export const db = new Dexie('pos-offline') as DexieInstance;

db.version(1).stores({
  products: 'storeId, id, sku, barcode, name, categoryId, isActive, updatedAt',
  customers: 'storeId, id, name, phone, isActive, updatedAt',
  sales: 'storeId, id, number, status, customerId, dayKey, createdAt, updatedAt',
  sale_items: 'saleId, id, productId, dayKey',
  expenses: 'storeId, id, categoryId, dayKey, createdAt, updatedAt',
  inventory_movements: 'storeId, id, productId, type, dayKey, createdAt',
  categories: 'storeId, id, name, sortOrder',
  settings: 'storeId',
  pending_operations: 'storeId, id, operationId, entity, entityId, operation, status, createdAt, nextRetryAt',
  sync_meta: 'storeId'
});
```

**Notes**:
- Removed `version` indexes from all tables. The global sync cursor (`sync_meta.lastSyncId`) replaces per-row versioning.
- `updatedAt` remains in entity tables for UI sorting and LWW conflict comparison only.
- `pending_operations` indexes by `storeId`, `status`, and `nextRetryAt` for efficient queue processing.
- `sync_meta` has one record per store (primary key: `storeId`). The stored object contains `{ storeId, lastSyncId, lastSyncedAt }`.

---

## 5. Repository Pattern

### Interfaces
```ts
// repositories/base.repository.ts
export interface IEntity {
  id: string;
  storeId: string;
  operationId?: string;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ILocalRepository<T extends IEntity> {
  list(storeId: string): Promise<T[]>;
  get(storeId: string, id: string): Promise<T | null>;
  create(storeId: string, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(storeId: string, id: string, data: Partial<Omit<T, 'id'>>): Promise<T>;
  delete(storeId: string, id: string): Promise<void>;
}

export interface IRemoteRepository<T extends IEntity> {
  list(storeId: string, cursor?: { lastSyncId?: number }): Promise<T[]>;
  get(storeId: string, id: string): Promise<T | null>;
  create(storeId: string, data: T): Promise<T>;
  update(storeId: string, id: string, data: Partial<T>): Promise<T>;
  delete(storeId: string, id: string): Promise<void>;
}
```

### Split
Each entity has `LocalRepository` (Dexie) and `RemoteRepository` (Supabase). `Service` orchestrates both.

---

## 6. Service Layer

```ts
// services/base.service.ts
export class BaseService {
  protected generateOperationId(): string {
    return crypto.randomUUID();
  }
  
  protected getDeviceId(): string {
    // read from localStorage, generate once if missing
  }
  
  protected async withLocal<T>(
    tables: string[],
    work: (tx: Transaction) => Promise<T>
  ): Promise<T> {
    const tableRefs = tables.map(t => (db as any)[t]);
    return db.transaction('rw', tableRefs, async () => {
      const result = await work(tx);
      return result;
    });
  }
}
```

```ts
// services/products.service.ts
export class ProductsService {
  async create(storeId: string, input: CreateProductInput): Promise<Product> {
    const operationId = this.generateOperationId();
    const deviceId = this.getDeviceId();
    const now = new Date().toISOString();

    return this.withLocal(['products', 'pending_operations'], async () => {
      const product = await this.productsLocal.create(storeId, {
        ...input,
        operationId,
        deviceId,
        createdAt: now,
        updatedAt: now,
      });

      await this.queue.create(storeId, {
        id: crypto.randomUUID(),
        operationId,
        deviceId,
        storeId,
        entity: 'products',
        entityId: product.id,
        operation: 'create',
        payload: product,
        status: 'pending',
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      this.sync.enqueue();
      return product;
    });
  }
}
```

```ts
// services/sales.service.ts
export class SalesService {
  async create(storeId: string, input: CreateSaleInput): Promise<Sale> {
    const operationId = this.generateOperationId();
    const deviceId = this.getDeviceId();
    const now = new Date().toISOString();

    return this.withLocal(['sales', 'sale_items', 'inventory_movements', 'pending_operations'], async () => {
      const sale = await this.salesLocal.create(storeId, {
        ...input,
        operationId,
        deviceId,
        createdAt: now,
        updatedAt: now,
      });

      for (const item of input.items) {
        await this.saleItemsLocal.create(storeId, {
          saleId: sale.id,
          operationId,
          deviceId,
          ...item,
        });
        
        await this.inventoryLocal.create(storeId, {
          productId: item.productId,
          operationId,
          deviceId,
          type: 'sale',
          quantity: -item.quantity,
          referenceType: 'sale',
          referenceId: sale.id,
        });
      }

      await this.queue.create(storeId, {
        id: crypto.randomUUID(),
        operationId,
        deviceId,
        storeId,
        entity: 'sales',
        entityId: sale.id,
        operation: 'create',
        payload: { sale, items: input.items },
        status: 'pending',
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      this.sync.enqueue();
      return sale;
    });
  }
}
```

---

## 7. Write Path (Atomic)

```
UI calls Service.create()
  ↓
Service generates operationId + deviceId
  ↓
Dexie transaction (service-specific tables):
  ├── Save entity to local table
  ├── Save related entities (if any)
  └── Save pending_operation atomically
  ↓
UI updates immediately from local state
  ↓
Sync Engine picks up pending_operation
  ↓
Push to Supabase RPC with operationId as idempotency key
  ↓
Server transaction:
  ├── INSERT processed_operations ON CONFLICT DO NOTHING RETURNING operation_id
  ├── If new: execute mutation + insert sync_changes
  ├── If duplicate: fetch and return original entity
  └── COMMIT
  ↓
Server returns result
  ↓
Mark local operation as synced
  ↓
Pull sync_changes WHERE id > lastSyncId
  ↓
Dexie transaction:
  ├── Apply remote changes to local tables
  └── Update sync_meta.lastSyncId
  ↓
UI reacts to updated IndexedDB
```

**Critical rules**:
1. All related local entities and the pending operation must be saved in the same Dexie transaction.
2. `lastSyncId` only advances after remote changes are successfully written to IndexedDB.
3. If applying remote changes fails, the cursor remains unchanged and sync retries.
4. The server uses `INSERT ... ON CONFLICT DO NOTHING RETURNING` to guarantee atomic idempotency.

---

## 8. Read Path

```
UI calls Service.list()
  ↓
Return IndexedDB data instantly
  ↓
If online: trigger background sync (pull + update IndexedDB)
  ↓
UI reacts to Dexie live query changes
```

Never make UI wait for Supabase before showing data.

---

## 9. Pending Operations Queue (Durable)

```ts
interface PendingOperation {
  id: string;              // local UUID for the queue entry
  operationId: string;     // globally unique idempotency key
  deviceId: string;        // persistent device UUID
  storeId: string;
  entity: string;          // 'sales' | 'expenses' | 'inventory_movements'
  entityId: string;        // local ID of the created entity
  operation: 'create' | 'update' | 'delete';
  payload: Record<string, any>;
  status: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
  retryCount: number;
  lastError: string | null;
  nextRetryAt: string | null;  // ISO timestamp
  createdAt: string;
  updatedAt: string;
}
```

**Idempotency**: Server must check `operation_id` before creating. If exists, return existing record.

**Retention**: Do NOT permanently delete operations immediately after sync. Keep them with `status: 'synced'` for audit. Delete only after a retention period (e.g., 7 days) or explicit cleanup.

---

## 10. Sync Engine

```ts
// lib/sync/engine.ts
export class SyncEngine {
  private running = false;
  private timer: number | null = null;

  constructor(
    private queue: PendingOperationsLocalRepository,
    private syncService: SyncService,
    private online: boolean
  ) {}

  start() {
    if (this.online) this.run();
    window.addEventListener('online', () => { this.online = true; this.run(); });
    window.addEventListener('offline', () => { this.online = false; });
    this.timer = window.setInterval(() => { if (this.online) this.run(); }, 30000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  async run() {
    if (this.running) return;
    this.running = true;
    try {
      await this.processQueue();
      if (this.online) await this.pullRemoteChanges();
    } finally {
      this.running = false;
    }
  }

  private async processQueue() {
    const pending = await this.queue.listByStatus('pending', 'failed');
    for (const op of pending) {
      if (op.nextRetryAt && new Date(op.nextRetryAt) > new Date()) continue;
      
      await this.queue.updateStatus(op.id, 'syncing');
      try {
        await this.syncService.push(op);
        await this.queue.updateStatus(op.id, 'synced');
      } catch (error) {
        if (this.isNonRetryable(error)) {
          await this.queue.markFailed(op.id, error.message, op.retryCount + 1, null);
        } else {
          const retryCount = op.retryCount + 1;
          const nextRetryAt = this.calculateBackoff(retryCount);
          await this.queue.markFailed(op.id, error.message, retryCount, nextRetryAt);
        }
      }
    }
  }

  private isNonRetryable(error: any): boolean {
    const status = error.status || error.code;
    return [401, 403, 400, 409].includes(status);
  }

  private calculateBackoff(retryCount: number): string {
    const baseDelays = [2000, 5000, 15000, 30000, 60000];
    const delay = baseDelays[Math.min(retryCount - 1, baseDelays.length - 1)];
    const jitter = Math.random() * 1000;
    return new Date(Date.now() + delay + jitter).toISOString();
  }
}
```

### Error Classification
- **Retryable**: Network errors, 5xx, timeouts
- **Non-retryable**: 401/403 (auth/RLS), 400 validation, 409 conflict
- For non-retryable: mark as `failed` immediately, do not retry

---

## 11. Conflict Resolution

| Entity | Rule |
|--------|------|
| Products | LWW for ordinary fields. Never overwrite `operation_id`. |
| Customers | LWW for ordinary fields. |
| Settings | LWW. |
| Sales | **Immutable after creation**. Never overwrite. If duplicate `operation_id` detected, return existing. |
| Sale Items | Append-only. |
| Inventory | **Event/movement-based**. Never blind stock overwrite. Each movement is immutable. Stock is derived. |
| Expenses | **Immutable transactions**. Updates/deletes use explicit operations with conflict detection. |

If conflict detected: mark operation as `conflict`, preserve local data, alert UI.

---

## 12. Sync Cursor

```ts
interface SyncCursor {
  storeId: string;
  lastSyncId: number;
}
```

Do not maintain separate entity cursors. The main pull query:

```sql
SELECT *
FROM sync_changes
WHERE store_id = ?
  AND id > ?
ORDER BY id ASC
LIMIT 100
```

Support batching/pagination for large sync sets.

Example:
```
lastSyncId = 1500
Server changes: 1501, 1502, 1503, 1507, 1510
Client receives: 1501, 1502, 1503, 1507, 1510
After applying: lastSyncId = 1510
```

**Important**: The client must advance the cursor to the highest successfully applied change ID, not simply increment by 1. Gaps in IDs are normal and must not cause synchronization problems.

---

## 13. Sync Failure Safety

The Sync Engine must guarantee:

- **App crashes during push**: pending operation remains recoverable in IndexedDB.
- **Server committed but response lost**: retry uses `operationId` and does not duplicate.
- **App crashes while pulling**: cursor does not advance until local IndexedDB transaction succeeds.
- **IndexedDB write fails**: cursor remains unchanged and sync retries later.
- **Network disappears**: queue remains intact; no data loss.

Atomicity rule:
```
Dexie transaction:
  - apply sync_changes to local tables
  - update sync_meta.lastSyncId
```
If either fails, neither commits. The cursor only advances after both succeed.

## 14. Remove Unnecessary Version Complexity

Since global `sync_changes` + `sync_changes.id` is now the synchronization mechanism:

- **Remove** per-row `version` columns and version triggers from the database schema.
- **Do not** maintain two competing synchronization systems.
- **Do not** use `updated_at` as the primary sync cursor.
- `updated_at` may remain for UI sorting, auditing, and LWW conflict comparison.

For Products/Customers/Settings where LWW is still used:
- `updated_at` may be used for conflict comparison.
- It must NOT be used as the global sync cursor.

```sql
-- If version columns were already added in a prior migration, remove them:
ALTER TABLE products DROP COLUMN IF EXISTS version;
ALTER TABLE customers DROP COLUMN IF EXISTS version;
ALTER TABLE categories DROP COLUMN IF EXISTS version;
ALTER TABLE expenses DROP COLUMN IF EXISTS version;
ALTER TABLE settings DROP COLUMN IF EXISTS version;
ALTER TABLE inventory_movements DROP COLUMN IF EXISTS version;

-- Drop version triggers if they exist:
DROP TRIGGER IF EXISTS products_version_trigger ON products;
DROP TRIGGER IF EXISTS customers_version_trigger ON customers;
DROP TRIGGER IF EXISTS categories_version_trigger ON categories;
DROP TRIGGER IF EXISTS expenses_version_trigger ON expenses;
DROP TRIGGER IF EXISTS settings_version_trigger ON settings;
DROP TRIGGER IF EXISTS inventory_movements_version_trigger ON inventory_movements;

DROP FUNCTION IF EXISTS increment_sync_cursor();
```

---

## 15. Server-Side Idempotency Must Be Transaction-Safe

The architecture must prevent this race condition:

```
Request A: SELECT processed_operations → not found
Request B: SELECT processed_operations → not found
Both create the same sale → duplicate
```

Do NOT implement idempotency as a separate SELECT followed by INSERT.

Use a single PostgreSQL transaction with `INSERT ... ON CONFLICT DO NOTHING RETURNING`:

```sql
BEGIN;

INSERT INTO processed_operations (
  operation_id,
  store_id,
  device_id,
  entity,
  entity_id,
  operation
)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (operation_id) DO NOTHING
RETURNING operation_id;

-- If RETURNING produced a row:
--   → this is a new operation
--   → perform the mutation
--   → insert sync_changes
--   → commit

-- If RETURNING produced no row:
--   → operation was already processed
--   → fetch the original entity by entity_id
--   → return it
--   → DO NOT create another entity
--   → DO NOT create another sync_changes entry

COMMIT;
```

For sales specifically, the entire operation must be in one PostgreSQL transaction:
```
BEGIN
  idempotency check (processed_operations INSERT ... ON CONFLICT)
  create sale
  create sale_items
  create inventory_movements
  create processed_operations record
  create sync_changes records
COMMIT
```

If any step fails, everything rolls back.

---

## 16. Idempotency Result Information

The `processed_operations` table must allow the server to return the original result when a duplicate operation is retried.

**Chosen approach**: Store `entity_id` in `processed_operations` and fetch the current entity from the main table when a duplicate is detected.

```sql
CREATE TABLE processed_operations (
  operation_id uuid PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL,
  operation text NOT NULL,
  processed_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(store_id, operation_id)
);
```

**Flow**:
1. Client sends operation with `operationId`
2. Server attempts `INSERT INTO processed_operations ... ON CONFLICT DO NOTHING RETURNING operation_id`
3. If a row is returned:
   - New operation → execute mutation → return result
4. If no row is returned:
   - Duplicate → `SELECT * FROM <entity_table> WHERE id = processed_operations.entity_id`
   - Return the existing entity
   - No new mutation, no new sync_changes entry

This guarantees exactly-once semantics even when the network fails after the server commits but before the response reaches the client.

---

## 17. Full Resync When Cursor Is Too Old

The Sync Engine must detect when the local cursor is older than the oldest available `sync_changes` record for the store.

**Mechanism**:
1. During each sync pull, the server includes the minimum available `sync_changes.id` for the store (or a separate endpoint returns it).
2. The client compares `lastSyncId` against this boundary.
3. If `lastSyncId < oldestAvailableSyncId - 1`, incremental sync is unsafe.

**Full resync flow**:
1. Client requests full store snapshot
2. Server returns current state of all entities (products, customers, categories, settings, sales, inventory, etc.)
3. Client writes snapshot into IndexedDB in one or more Dexie transactions
4. Client queries the current maximum `sync_changes.id` for the store
5. Client sets `sync_meta.lastSyncId` to that maximum value
6. Client resumes normal incremental synchronization

**Important**: The architecture must explicitly state that old `sync_changes` cannot be deleted without a recovery/full-resync strategy. Any cleanup job must ensure all clients have synced beyond the retention boundary before deleting old records.

---

## 18. Sync Change Retention

Add a retention policy for `sync_changes`:

- Default retention: 90 days (configurable)
- Delete old changes only after ensuring all clients have synced beyond the retention boundary
- The system must expose the oldest available `sync_changes.id` per store for clients to evaluate before cleanup

**Retention rule**:
```
oldestAvailableSyncId = MIN(sync_changes.id) per store

If client.lastSyncId < oldestAvailableSyncId:
  → full resync required
```

---

## 19. Fix Base Service Local Transaction

The current `withLocal()` hardcodes `db.products` and `db.pending_operations`. This is insufficient for atomic operations involving multiple entity tables.

**New design**: Each service specifies the exact Dexie tables required for its atomic operation.

```ts
// services/base.service.ts
export class BaseService {
  protected async withLocal<T>(
    tables: string[],
    work: (tx: Transaction) => Promise<T>
  ): Promise<T> {
    const tableRefs = tables.map(t => (db as any)[t]);
    return db.transaction('rw', tableRefs, async () => {
      const result = await work(tx);
      return result;
    });
  }
}
```

**Examples**:
- Product create: `['products', 'pending_operations']`
- Customer create: `['customers', 'pending_operations']`
- Sale create: `['sales', 'sale_items', 'inventory_movements', 'pending_operations']`
- Inventory adjustment: `['inventory_movements', 'pending_operations']`
- Expense create: `['expenses', 'pending_operations']`

The entity write and pending operation MUST always be committed in the same Dexie transaction.

---

## 20. Sale Atomicity

For an offline sale, the local Dexie transaction must be:

```ts
db.transaction('rw', [
  db.sales,
  db.sale_items,
  db.inventory_movements,
  db.pending_operations
], async () => {
  // 1. Create sale
  // 2. Create sale_items
  // 3. Create inventory_movements
  // 4. Create pending_operation
});
```

If any step fails, everything rolls back. A sale can never exist without its required items and inventory movements.

On the server, the PostgreSQL transaction must be:

```sql
BEGIN;
  -- 1. Idempotency check
  INSERT INTO processed_operations (...) VALUES (...) ON CONFLICT DO NOTHING RETURNING operation_id;
  
  -- 2. If new operation:
  INSERT INTO sales (...) VALUES (...) RETURNING id INTO sale_id;
  INSERT INTO sale_items (sale_id, ...) VALUES (...), (...), (...);
  INSERT INTO inventory_movements (store_id, ...) VALUES (...), (...), (...);
  INSERT INTO sync_changes (store_id, entity, entity_id, operation, ...) VALUES (...), (...), (...);
  
  -- 3. If duplicate:
  --   SELECT existing sale + items + movements
  --   RETURN existing data
  
COMMIT;
```

---

## 21. Sync Changes for Multiple Records

A single business operation may generate multiple `sync_changes` records.

Example: Sale #123 creates:
```
sync_changes.id 5001 → sales / sale-123 / create
sync_changes.id 5002 → sale_items / item-1 / create
sync_changes.id 5003 → sale_items / item-2 / create
sync_changes.id 5004 → inventory_movements / movement-1 / create
```

The client processes them in ascending `id` order.

All changes returned by a pull are applied in one or more safe Dexie transactions, and the cursor advances only after successful application of the batch.

---

## 22. Update Sync Flow

Final synchronization architecture:

```
LOCAL WRITE

UI
↓
Service
↓
Generate operationId + deviceId
↓
Dexie transaction (service-specific tables)
  ├── entity
  ├── related entities
  └── pending_operation
↓
UI immediately updates
↓
Sync Engine
↓
PostgreSQL RPC
↓
BEGIN
  ├── idempotency check (INSERT ... ON CONFLICT DO NOTHING RETURNING)
  ├── mutation
  ├── processed_operations
  └── sync_changes (id = global sync cursor)
COMMIT
↓
Mark local operation synced
↓
Pull sync_changes WHERE id > lastSyncId
↓
Dexie transaction
  ├── apply changes
  └── update lastSyncId atomically
↓
UI reacts
```

---

## 23. Final Guarantees

The v4 architecture guarantees:

- Offline-first operation
- Durable local writes
- No loss of pending operations
- No duplicate sales after retries
- Idempotent mutations via `processed_operations`
- Global ordered sync via `sync_changes.id`
- Safe sync gaps (IDs are globally ordered, gaps are normal)
- Safe full resync when cursor is too old
- Crash-safe pull (cursor only advances after confirmed local apply)
- Crash-safe push (pending operations survive in IndexedDB)
- Inventory movement preservation (event-based, never blind overwrite)
- Store isolation via `store_id` scoping
- RLS enforcement on Supabase
- Atomic sale creation (sale + items + inventory in one transaction)
- Atomic local entity + queue writes
- Atomic remote mutation + idempotency + sync_changes
- UI never waits for Supabase when local data exists

---

## 24. Component Architecture

- **All data-access pages are Client Components** (`"use client"`).
- Server Components may wrap them for auth checks only.
- Example: `app/products/page.tsx` stays `"use client"`, reads from `ProductsService` which reads from IndexedDB.
- `StoreProvider` and `SyncStatusProvider` wrap the app in `app/layout.tsx`.

---

## 25. Retry Strategy

| Retry # | Delay |
|---------|-------|
| 1 | 2s |
| 2 | 5s |
| 3 | 15s |
| 4 | 30s |
| 5+ | 60s (max) |

- Max retries: 10 before marking `failed`.
- Exponential backoff with jitter.
- Never retry auth/RLS/validation errors.

---

## 26. Tests

Use Vitest + @testing-library/react + fake-indexeddb.

### Unit Tests
- Repository CRUD (Dexie in-memory)
- Service layer (mock repositories)
- Sync engine (mock queue, mock network)
- Idempotency: duplicate operationId returns existing entity

### Integration Tests (critical paths)
1. Create sale offline → verify in IndexedDB
2. Refresh browser → verify sale persists
3. Close browser → reopen → verify sale still pending
4. Go online → verify sync completes
5. Network timeout during sync → verify retry with backoff
6. Same operationId retried 10 times → exactly one server mutation
7. Network timeout after server commit → retry returns existing entity
8. Delete creates sync_changes entry
9. Pull applies changes before advancing cursor
10. Crash during pull → cursor remains unchanged
11. sync_changes IDs are globally increasing across stores
12. Store A IDs 100,103,107; Store B IDs 101,102,104
13. Store A cursor correctly pulls 103 and 107 after cursor 100
14. Gaps in IDs never cause skipped changes
15. Two devices create sales offline → both synchronize
16. Two devices create inventory movements offline → both synchronize
17. Store A cannot replay Store B operationId
18. Failed operation remains in queue after crash
19. Conflict is preserved, not silently overwritten
20. Sync resumes after app restart
21. Local data remains available while completely offline
22. Cursor older than retention boundary triggers full resync
23. Full resync restores correct local snapshot
24. Old sync_changes can be safely pruned after full resync
25. Local sale transaction rolls back completely if any local step fails
26. Server sale transaction rolls back completely if any step fails
27. Multiple sync_changes from one sale applied atomically

---

## 27. Sales and Sale Items

Keep sales and sale_items append-only where possible.

A sale must have:
- id
- operation_id (UUID UNIQUE)
- device_id
- store_id
- created_at
- status
- total

Sale items must have:
- stable IDs
- reference to parent sale ID
- operation_id (for idempotency)

Atomicity guarantee:
The server must create the sale and all sale_items in a single PostgreSQL transaction. If any item fails, the entire sale rolls back. The `processed_operations` and `sync_changes` records are created in the same transaction.

```sql
-- Example server-side mutation
BEGIN;
  INSERT INTO processed_operations (operation_id, ...) VALUES (...)
  ON CONFLICT DO NOTHING RETURNING operation_id;
  
  -- If new:
  INSERT INTO sales (...) VALUES (...) RETURNING id INTO sale_id;
  INSERT INTO sale_items (sale_id, ...) VALUES (...), (...);
  INSERT INTO inventory_movements (store_id, ...) VALUES (...), (...);
  INSERT INTO sync_changes (store_id, entity, entity_id, operation, ...) VALUES (...), (...);
  
  -- If duplicate:
  --   RETURN existing sale + items via entity_id
  
COMMIT;
```

---

## 28. Inventory

Keep inventory movement-based.

Never synchronize inventory by `SET stock = localStock`.

Instead:
```
Sale / adjustment / purchase
  ↓
Inventory movement (immutable)
  ↓
unique operationId
  ↓
server transaction
  ↓
sync_changes (id = global cursor)
  ↓
other devices receive the movement
  ↓
local inventory is recalculated/applied
```

Each inventory movement must be immutable. Two devices performing offline inventory changes must both survive synchronization.

---

## 29. Dependencies

```json
{
  "dexie": "^4.0.0",
  "@supabase/ssr": "^0.12.4",
  "@supabase/supabase-js": "^2.112.3"
}
```

---

## 30. Migration Order

### Phase 1: Foundation
1. Add Dexie, create `lib/db/`, `lib/sync/`
2. Create all Local/Remote repositories
3. Create base service layer with parameterized `withLocal()`
4. Add schema migrations:
   - operation_id, device_id columns
   - processed_operations table
   - sync_changes table (using `id` as cursor, no `seq`)
   - sync_meta table (using `last_sync_id`)
   - Remove version columns and triggers if previously added
5. Write repository unit tests

### Phase 2: Sync & Auth
6. Create sync engine with queue + backoff
7. Build custom auth pages (`/auth/login`, `/auth/signup`)
8. Add `StoreProvider` and `SyncStatusProvider`
9. Implement device ID persistence

### Phase 3: Data Layer Migration
10. Migrate products page (read + write via service)
11. Migrate customers page
12. Migrate sales/checkout (POS)
13. Migrate inventory (movement-based)
14. Migrate expenses
15. Migrate reports, settings

### Phase 4: Polish
16. Add online/offline/sync UI indicators
17. Add conflict resolution UI
18. Remove mock data files
19. Add integration tests
20. Performance tuning

---

## 31. Risks

| Risk | Mitigation |
|------|-----------|
| Data loss during sync | Atomic local write + durable queue; cursor only advances after local apply succeeds |
| Duplicate transactions | operationId idempotency enforced client + server via `processed_operations` `INSERT ... ON CONFLICT` |
| Inventory conflicts | Movement-based, never blind overwrite; server is authority |
| Browser storage limits | Quota monitoring; prune old synced operations |
| Dexie migration issues | Pin version; test migration paths thoroughly |
| Server Component tries to use IndexedDB | Strict code review; all data-access components are Client Components |
| Sync cursor desync | Cursor only advances after confirmed local apply; retry preserves previous cursor |
| Old cursor requires full resync | Retention policy + full resync mechanism |
| sync_changes growth | Retention policy + periodic cleanup after full resync verification |

---

## 32. Final Architecture

```
CLIENT
↓
Dexie local database (IndexedDB)
↓
Durable pending_operations queue
↓
Sync Engine
↓
Supabase RPC / server-side mutation
↓
PostgreSQL transaction
  ├── idempotency check (processed_operations INSERT ... ON CONFLICT DO NOTHING RETURNING)
  ├── entity mutation
  ├── processed_operations record
  └── sync_changes (id = global sync cursor)
↓
Client pulls sync_changes (WHERE id > lastSyncId)
↓
Dexie transaction
  ├── apply changes
  └── update lastSyncId atomically
↓
UI
```

**Guarantees**:
- Offline-first operation
- Durable local writes
- Exactly-once effect for retried mutations through idempotency
- Global ordered synchronization per store via `sync_changes.id`
- Safe sync gaps (IDs are globally ordered, gaps are normal)
- Safe full resync when cursor is too old
- Crash-safe pull (cursor only advances after confirmed local apply)
- Crash-safe push (pending operations survive in IndexedDB)
- No duplicate sales
- No lost inventory movements
- No skipped remote changes
- Store isolation via `store_id` scoping
- RLS enforcement on Supabase

---

## 33. Validation

- `pnpm lint` passes
- `pnpm build` succeeds
- App creates sales with zero internet
- App reads products/customers from IndexedDB offline
- Every offline mutation creates durable pending operation
- Reconnecting auto-starts sync
- Retrying failed request never creates duplicates
- Inventory sync is movement-based
- Sync survives refresh/restart/crash
- No Server Component accesses IndexedDB
- RLS enforced on Supabase
- Store isolation preserved
- All integration tests pass
