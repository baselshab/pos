-- Phase 2: RLS Policies
-- Migration plan §6.3

-- Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjustment_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspended_sales ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION is_store_member(target_store_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM store_members
    WHERE store_id = target_store_id AND user_id = auth.uid() AND is_active
  );
$$;

CREATE OR REPLACE FUNCTION member_role(target_store_id uuid)
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM store_members
  WHERE store_id = target_store_id AND user_id = auth.uid() AND is_active
  LIMIT 1;
$$;

-- ============================================
-- stores
-- ============================================
CREATE POLICY stores_select ON stores FOR SELECT
  USING (is_store_member(id));

CREATE POLICY stores_insert ON stores FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY stores_update ON stores FOR UPDATE
  USING (owner_id = auth.uid());

-- ============================================
-- store_members
-- ============================================
CREATE POLICY store_members_select ON store_members FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY store_members_insert ON store_members FOR INSERT
  WITH CHECK (is_store_member(store_id) AND member_role(store_id) IN ('owner', 'manager'));

CREATE POLICY store_members_update ON store_members FOR UPDATE
  USING (is_store_member(store_id) AND member_role(store_id) IN ('owner', 'manager'));

CREATE POLICY store_members_delete ON store_members FOR DELETE
  USING (is_store_member(store_id) AND member_role(store_id) IN ('owner', 'manager'));

-- ============================================
-- categories
-- ============================================
CREATE POLICY categories_select ON categories FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY categories_insert ON categories FOR INSERT
  WITH CHECK (member_role(store_id) IN ('owner', 'manager', 'stock'));

CREATE POLICY categories_update ON categories FOR UPDATE
  USING (member_role(store_id) IN ('owner', 'manager', 'stock'));

CREATE POLICY categories_delete ON categories FOR DELETE
  USING (member_role(store_id) IN ('owner', 'manager'));

-- ============================================
-- products
-- ============================================
CREATE POLICY products_select ON products FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY products_insert ON products FOR INSERT
  WITH CHECK (member_role(store_id) IN ('owner', 'manager', 'stock'));

CREATE POLICY products_update ON products FOR UPDATE
  USING (member_role(store_id) IN ('owner', 'manager', 'stock'));

-- No DELETE policy => delete blocked for all regular users (soft delete via is_active)

-- Cashier view: no cost_minor
CREATE VIEW products_cashier_view AS
  SELECT id, store_id, sku, barcode, name, category_id, unit, price_minor,
         tax_rate_bp, quantity, low_stock_threshold, image_url, is_active
  FROM products;

-- ============================================
-- customers
-- ============================================
CREATE POLICY customers_select ON customers FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY customers_insert ON customers FOR INSERT
  WITH CHECK (member_role(store_id) IN ('owner', 'manager', 'cashier', 'stock'));

CREATE POLICY customers_update ON customers FOR UPDATE
  USING (member_role(store_id) IN ('owner', 'manager', 'cashier', 'stock'));

CREATE POLICY customers_delete ON customers FOR DELETE
  USING (member_role(store_id) IN ('owner', 'manager'));

-- ============================================
-- sales
-- ============================================
CREATE POLICY sales_select ON sales FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY sales_insert ON sales FOR INSERT
  WITH CHECK (member_role(store_id) IN ('owner', 'manager', 'cashier', 'stock'));

CREATE POLICY sales_update ON sales FOR UPDATE
  USING (member_role(store_id) IN ('owner', 'manager'));

-- ============================================
-- sale_items
-- ============================================
CREATE POLICY sale_items_select ON sale_items FOR SELECT
  USING (is_store_member((SELECT store_id FROM sales WHERE id = sale_id)));

CREATE POLICY sale_items_insert ON sale_items FOR INSERT
  WITH CHECK (member_role((SELECT store_id FROM sales WHERE id = sale_id)) IN ('owner', 'manager', 'cashier', 'stock'));

-- No UPDATE/DELETE policies => append-only for regular users

-- ============================================
-- payments
-- ============================================
CREATE POLICY payments_select ON payments FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY payments_insert ON payments FOR INSERT
  WITH CHECK (member_role(store_id) IN ('owner', 'manager', 'cashier', 'stock'));

CREATE POLICY payments_update ON payments FOR UPDATE
  USING (member_role(store_id) IN ('owner', 'manager'));

CREATE POLICY payments_delete ON payments FOR DELETE
  USING (member_role(store_id) IN ('owner', 'manager'));

-- ============================================
-- expense_categories
-- ============================================
CREATE POLICY expense_categories_select ON expense_categories FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY expense_categories_insert ON expense_categories FOR INSERT
  WITH CHECK (member_role(store_id) IN ('owner', 'manager'));

CREATE POLICY expense_categories_update ON expense_categories FOR UPDATE
  USING (member_role(store_id) IN ('owner', 'manager'));

CREATE POLICY expense_categories_delete ON expense_categories FOR DELETE
  USING (member_role(store_id) IN ('owner', 'manager'));

-- ============================================
-- expenses
-- ============================================
CREATE POLICY expenses_select ON expenses FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY expenses_insert ON expenses FOR INSERT
  WITH CHECK (member_role(store_id) IN ('owner', 'manager', 'stock'));

CREATE POLICY expenses_update ON expenses FOR UPDATE
  USING (member_role(store_id) IN ('owner', 'manager'));

CREATE POLICY expenses_delete ON expenses FOR DELETE
  USING (member_role(store_id) IN ('owner', 'manager'));

-- ============================================
-- adjustment_reasons
-- ============================================
CREATE POLICY adjustment_reasons_select ON adjustment_reasons FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY adjustment_reasons_insert ON adjustment_reasons FOR INSERT
  WITH CHECK (member_role(store_id) IN ('owner', 'manager'));

CREATE POLICY adjustment_reasons_update ON adjustment_reasons FOR UPDATE
  USING (member_role(store_id) IN ('owner', 'manager'));

CREATE POLICY adjustment_reasons_delete ON adjustment_reasons FOR DELETE
  USING (member_role(store_id) IN ('owner', 'manager'));

-- ============================================
-- inventory_movements
-- ============================================
CREATE POLICY movements_select ON inventory_movements FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY movements_insert ON inventory_movements FOR INSERT
  WITH CHECK (member_role(store_id) IN ('owner', 'manager', 'stock', 'cashier'));

-- No UPDATE/DELETE policies => append-only

-- ============================================
-- settings
-- ============================================
CREATE POLICY settings_select ON settings FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY settings_insert ON settings FOR INSERT
  WITH CHECK (member_role(store_id) IN ('owner', 'manager'));

CREATE POLICY settings_update ON settings FOR UPDATE
  USING (member_role(store_id) IN ('owner', 'manager'));

-- ============================================
-- suspended_sales
-- ============================================
CREATE POLICY suspended_sales_select ON suspended_sales FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY suspended_sales_insert ON suspended_sales FOR INSERT
  WITH CHECK (member_role(store_id) IN ('owner', 'manager', 'cashier', 'stock'));

CREATE POLICY suspended_sales_update ON suspended_sales FOR UPDATE
  USING (member_role(store_id) IN ('owner', 'manager', 'cashier', 'stock'));

CREATE POLICY suspended_sales_delete ON suspended_sales FOR DELETE
  USING (member_role(store_id) IN ('owner', 'manager', 'cashier', 'stock'));
