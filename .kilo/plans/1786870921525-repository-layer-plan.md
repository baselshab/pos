# POS Architecture Plan — Repository Layer + Supabase Integration

## 1. Current State Analysis

### Project Profile
- **Language**: TypeScript (strict mode)
- **Framework**: Next.js 16.3.0 (App Router) + React 19
- **Package Manager**: pnpm
- **Database**: Supabase / PostgreSQL (schema fully defined in `supabase/migrations/`)
- **Auth**: Supabase Auth via middleware (`lib/middleware.ts`) → redirects to `/auth/login`
- **RLS**: Fully enabled with role-based policies in `supabase/migrations/0002_rls_policies.sql`

### What Exists Today
| Layer | Status |
|---|---|
| Supabase server client | ✅ `lib/server.ts` (configured, unused by pages) |
| Supabase browser client | ✅ `lib/client.ts` (configured, unused) |
| Auth middleware | ✅ `lib/middleware.ts` |
| UI components | ✅ `components/ui/`, `components/table/`, `components/charts/` |
| App pages | ✅ All pages in `app/` use **mock data** from `lib/mock.tsx` and `lib/mock-products.ts` |
| Repository layer | ❌ Does not exist |
| Services layer | ❌ Does not exist |
| IndexedDB | ❌ Not used |
| Real Supabase queries in pages | ❌ None — all data is in-memory mock |

### Database Schema (14 tables)
`stores`, `store_members`, `categories`, `products`, `customers`, `sales`, `sale_items`, `payments`, `expense_categories`, `expenses`, `adjustment_reasons`, `inventory_movements`, `settings`, `suspended_sales`

### Key Observation
The project has a complete Supabase backend schema and RLS policies, but the frontend is still entirely mock-driven. The Supabase clients are configured but never called from pages. The goal is to wire the frontend to the real database through a clean Repository → Service → UI architecture.

---

## 2. Proposed Architecture

### Primary Data Flow (Normal Mode)
```
UI (Server Components)
  ↓
Server Actions / Service Functions
  ↓
Repository (one per entity)
  ↓
Supabase Client (server-side)
  ↓
PostgreSQL (with RLS)
```

### Client Components
- Use only for interactive UI (search, filters, modals, cart)
- Call Server Actions for mutations
- Read data passed as props from Server Components
- Avoid direct Supabase calls unless absolutely necessary

### IndexedDB (Deferred)
- Not implemented now
- Architecture should allow adding a cache layer between Service and Repository later
- Candidate data for future cache: products list, categories, settings (reference data that changes rarely)

---

## 3. Directory Structure

```
lib/
  server.ts          ← keep, add typed helper
  client.ts          ← keep for future browser use
  middleware.ts      ← keep unchanged
  store.tsx          ← keep (app state: sidebar, online)
  utils.ts           ← keep
  validation.ts      ← keep

repositories/
  index.ts
  base.repository.ts
  products.repository.ts
  customers.repository.ts
  sales.repository.ts
  inventory.repository.ts
  expenses.repository.ts
  settings.repository.ts

services/
  index.ts
  products.service.ts
  customers.service.ts
  sales.service.ts
  inventory.service.ts
  expenses.service.ts
  settings.service.ts
```

---

## 4. Repository Pattern

Each repository:
- Accepts a Supabase client in constructor (or uses a factory)
- Exposes CRUD methods for one entity
- Returns plain objects / arrays (not Supabase response wrappers)
- Throws typed errors on failure
- Does NOT contain business logic
- Does NOT know about UI

Example shape:
```ts
// repositories/products.repository.ts
export type Product = { id: string; store_id: string; name: string; ... }

export class ProductsRepository {
  constructor(private supabase: SupabaseClient) {}

  async list(storeId: string, filters?: { categoryId?: string; query?: string }): Promise<Product[]> { ... }
  async get(storeId: string, id: string): Promise<Product | null> { ... }
  async create(storeId: string, data: InsertProduct): Promise<Product> { ... }
  async update(storeId: string, id: string, data: Partial<InsertProduct>): Promise<Product> { ... }
  async delete(storeId: string, id: string): Promise<void> { ... }
}
```

---

## 5. Service Layer

Each service:
- Uses repositories
- Contains business logic (validation, calculations, orchestration)
- Is callable from Server Actions and Server Components
- Keeps UI completely unaware of data source

Example shape:
```ts
// services/products.service.ts
export class ProductsService {
  constructor(private productsRepo: ProductsRepository) {}

  async listProducts(storeId: string, filters?: ProductFilters) {
    return this.productsRepo.list(storeId, filters);
  }

  async createProduct(storeId: string, data: CreateProductInput) {
    // business logic: validate SKU uniqueness, check category exists
    const existing = await this.productsRepo.findBySku(storeId, data.sku);
    if (existing) throw new Error('SKU already exists');
    return this.productsRepo.create(storeId, data);
  }
}
```

---

## 6. Server Actions Strategy

- Create `app/actions/` directory for Server Actions
- Each page's mutations go in a dedicated actions file or inline in the page (if small)
- Server Actions call Services, not Repositories directly
- Server Actions validate input using `lib/validation.ts` (already exists)

Example:
```ts
// app/products/actions.ts
'use server'
import { createClient } from '@/lib/server'
import { ProductsService } from '@/services/products.service'
import { ProductsRepository } from '@/repositories/products.repository'

export async function createProduct(formData: FormData) {
  const supabase = await createClient()
  const repo = new ProductsRepository(supabase)
  const service = new ProductsService(repo)
  // ... validate, call service, return result
}
```

---

## 7. Migration Strategy

### Phase A: Foundation (No UI changes)
1. Create `repositories/` with all entity repositories
2. Create `services/` with all services
3. Add type definitions matching the database schema
4. Write unit tests for repositories (mock Supabase client)

### Phase B: Server-Side Data Fetching (Read)
1. Convert read-heavy pages to Server Components where possible
2. Replace mock data with real repository calls in Server Components
3. Pass data to Client Components as props

### Phase C: Mutations via Server Actions
1. Replace in-memory mutations with Server Actions
2. Wire POS checkout, customer creation, inventory adjustments to real data
3. Keep optimistic UI updates in Client Components

### Phase D: IndexedDB Cache (Later, only if needed)
1. Add `lib/db/` for IndexedDB wrapper
2. Add cache strategy in Services layer
3. Cache reference data: products, categories, settings
4. Transactional data (sales, invoices) stays Supabase-only

---

## 8. Files to Create

| File | Purpose |
|---|---|
| `repositories/base.repository.ts` | Base repository with common helpers |
| `repositories/products.repository.ts` | Products CRUD |
| `repositories/customers.repository.ts` | Customers CRUD |
| `repositories/sales.repository.ts` | Sales + sale_items |
| `repositories/inventory.repository.ts` | Inventory movements, adjustments |
| `repositories/expenses.repository.ts` | Expenses CRUD |
| `repositories/settings.repository.ts` | Settings (jsonb) |
| `repositories/index.ts` | Re-export all repos |
| `services/products.service.ts` | Product business logic |
| `services/customers.service.ts` | Customer business logic |
| `services/sales.service.ts` | Sale creation, cancellation logic |
| `services/inventory.service.ts` | Stock adjustment, stocktake logic |
| `services/expenses.service.ts` | Expense business logic |
| `services/settings.service.ts` | Settings get/update |

## 9. Files to Modify

| File | Change |
|---|---|
| `lib/server.ts` | Add typed Supabase client helper (`getSupabaseServer()`) |
| `app/layout.tsx` | No change needed |
| `app/products/page.tsx` | Replace mock data with Server Component data fetching |
| `app/customers/page.tsx` | Replace mock data |
| `app/pos/page.tsx` | Replace mock data + add Server Actions for checkout |
| `app/inventory/page.tsx` | Replace mock data + add Server Actions |
| `app/expenses/page.tsx` | Replace mock data + add Server Actions |
| `app/invoices/page.tsx` | Replace mock data |
| `app/reports/page.tsx` | Replace mock data with aggregated queries |
| `app/settings/page.tsx` | Replace mock data + add Server Actions |
| `lib/mock.tsx` | Keep for now, deprecate gradually |
| `lib/mock-products.ts` | Keep for now, deprecate gradually |

---

## 10. Environment & Secrets

- `.env.local` already contains `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- These are public keys (publishable), safe for client-side use
- No service_role key needed on client
- Keep `.env.local` out of Git (already in `.gitignore`)

---

## 11. RLS Considerations

- All repositories run queries through the user's Supabase session (via `createServerClient` + middleware cookies)
- RLS policies enforce store membership and role checks at the database level
- Repositories do NOT bypass RLS
- No `service_role` key in server-side code unless for specific admin operations

---

## 12. What This Plan Does NOT Include

- Full IndexedDB implementation (deferred)
- Offline sync mechanism (deferred)
- Real auth UI (login/signup pages — middleware redirects to `/auth/login` which doesn't exist yet)
- Migration of mock data to real database seed
- Changing framework or project structure
- TypeScript → JavaScript conversion

---

## 13. Validation Plan

1. `pnpm lint` passes
2. `pnpm build` succeeds (no TypeScript errors)
3. Server Components render with real data from Supabase
4. Server Actions mutations work through RLS
5. No Supabase queries leak into Client Components
6. No business logic in components

---

## 14. Open Questions

1. **Auth pages**: The middleware redirects to `/auth/login` but no auth pages exist. Do you want to create them now, or keep using Supabase's default auth UI?
2. **Store selection**: The schema supports multi-store via `store_members`. Should we add a store switcher, or assume single-store for now?
3. **IndexedDB priority**: Do you want to add IndexedDB cache for products/categories now, or strictly defer it?
