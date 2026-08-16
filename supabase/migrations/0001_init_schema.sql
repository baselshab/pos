-- Phase 2: Database Schema
-- 14 tables as defined in migration plan §4

-- ============================================
-- 1. stores (المستأجر / المتجر)
-- ============================================
CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  currency_code text DEFAULT 'SAR' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_stores_owner_id ON stores(owner_id);

-- ============================================
-- 2. store_members (ربط المستخدمين بالمتاجر + الأدوار)
-- ============================================
CREATE TABLE store_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'cashier', 'stock')),
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(store_id, user_id)
);

CREATE INDEX idx_store_members_user_id ON store_members(user_id);
CREATE INDEX idx_store_members_store_id ON store_members(store_id);

-- ============================================
-- 3. categories
-- ============================================
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  icon text,
  sort_order int DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(store_id, name)
);

CREATE INDEX idx_categories_store_id ON categories(store_id);

-- ============================================
-- 4. products
-- ============================================
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sku text NOT NULL,
  barcode text,
  name text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE RESTRICT,
  unit text DEFAULT 'قطعة' NOT NULL,
  cost_minor bigint DEFAULT 0 NOT NULL CHECK (cost_minor >= 0),
  price_minor bigint DEFAULT 0 NOT NULL CHECK (price_minor >= 0),
  tax_rate_bp int DEFAULT 0 NOT NULL CHECK (tax_rate_bp BETWEEN 0 AND 10000),
  quantity bigint DEFAULT 0 NOT NULL,
  low_stock_threshold int DEFAULT 0 NOT NULL,
  description text CHECK (char_length(description) <= 500),
  image_url text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(store_id, sku),
  UNIQUE(store_id, barcode) WHERE barcode IS NOT NULL
);

CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_store_is_active ON products(store_id, is_active);
CREATE INDEX idx_products_name_gin ON products USING gin (to_tsvector('arabic', name));

-- ============================================
-- 5. customers
-- ============================================
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  note text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_customers_store_id ON customers(store_id);
CREATE INDEX idx_customers_store_phone ON customers(store_id, phone);

-- ============================================
-- 6. sales (الفواتير)
-- ============================================
CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  number text NOT NULL,
  status text DEFAULT 'completed' NOT NULL CHECK (status IN ('completed', 'cancelled')),
  payment_type text NOT NULL CHECK (payment_type IN ('cash', 'credit')),
  customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT,
  customer_name text NOT NULL,
  subtotal_minor bigint NOT NULL,
  discount_type text CHECK (discount_type IN ('percent', 'amount')),
  discount_value int,
  discount_minor bigint DEFAULT 0 NOT NULL,
  tax_rate_bp int NOT NULL,
  tax_inclusive boolean NOT NULL,
  tax_minor bigint DEFAULT 0 NOT NULL,
  total_minor bigint NOT NULL,
  paid_minor bigint DEFAULT 0 NOT NULL,
  due_minor bigint DEFAULT 0 NOT NULL,
  item_count int,
  unit_count int,
  cost_minor bigint NOT NULL,
  note text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  day_key date NOT NULL,
  cancelled_at timestamptz,
  cancel_reason text,
  UNIQUE(store_id, number)
);

CREATE INDEX idx_sales_store_day_key ON sales(store_id, day_key);
CREATE INDEX idx_sales_store_customer_id ON sales(store_id, customer_id);
CREATE INDEX idx_sales_store_status ON sales(store_id, status);
CREATE INDEX idx_sales_store_created_at ON sales(store_id, created_at DESC);

-- ============================================
-- 7. sale_items
-- ============================================
CREATE TABLE sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sku text NOT NULL,
  name text NOT NULL,
  unit text NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price_minor bigint NOT NULL,
  unit_cost_minor bigint NOT NULL,
  line_discount_minor bigint DEFAULT 0 NOT NULL,
  line_total_minor bigint NOT NULL,
  day_key date NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX idx_sale_items_day_key ON sale_items(day_key);

-- ============================================
-- 8. payments
-- ============================================
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  method text NOT NULL CHECK (method IN ('cash', 'bank', 'card', 'cheque')),
  reference text,
  note text,
  created_at timestamptz DEFAULT now() NOT NULL,
  day_key date NOT NULL
);

CREATE INDEX idx_payments_store_customer_id ON payments(store_id, customer_id);
CREATE INDEX idx_payments_store_day_key ON payments(store_id, day_key);

-- ============================================
-- 9. expense_categories
-- ============================================
CREATE TABLE expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(store_id, name)
);

CREATE INDEX idx_expense_categories_store_id ON expense_categories(store_id);

-- ============================================
-- 10. expenses
-- ============================================
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  title text NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  method text,
  reference text,
  note text,
  attachment_url text,
  day_key date NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_expenses_store_day_key ON expenses(store_id, day_key);
CREATE INDEX idx_expenses_store_category_id ON expenses(store_id, category_id);

-- ============================================
-- 11. adjustment_reasons
-- ============================================
CREATE TABLE adjustment_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  is_system boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(store_id, name)
);

CREATE INDEX idx_adjustment_reasons_store_id ON adjustment_reasons(store_id);

-- ============================================
-- 12. inventory_movements (السجل المرجعي — Append-Only)
-- ============================================
CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sku text NOT NULL,
  product_name text NOT NULL,
  type text NOT NULL CHECK (type IN ('initial', 'in', 'out', 'sale', 'cancel', 'count', 'damage', 'return')),
  quantity int NOT NULL,
  balance_after bigint NOT NULL,
  reason text,
  note text CHECK (char_length(note) <= 200),
  ref_type text,
  ref_id uuid,
  actor_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  day_key date NOT NULL
);

CREATE INDEX idx_inventory_movements_store_product_created ON inventory_movements(store_id, product_id, created_at DESC);
CREATE INDEX idx_inventory_movements_store_day_key ON inventory_movements(store_id, day_key);
CREATE INDEX idx_inventory_movements_store_type ON inventory_movements(store_id, type);
CREATE INDEX idx_inventory_movements_ref_type_ref_id ON inventory_movements(ref_type, ref_id);

-- ============================================
-- 13. settings (jsonb model)
-- ============================================
CREATE TABLE settings (
  store_id uuid PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  values jsonb DEFAULT '{}' NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================
-- 14. suspended_sales (بيوع معلّقة)
-- ============================================
CREATE TABLE suspended_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_suspended_sales_store_id ON suspended_sales(store_id);
