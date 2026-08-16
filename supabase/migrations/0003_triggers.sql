-- Phase 2: Triggers
-- Migration plan §4.7.1

-- ============================================
-- Trigger: apply_inventory_movement
-- Updates products.quantity atomically from inventory_movements
-- ============================================
CREATE OR REPLACE FUNCTION apply_inventory_movement()
RETURNS trigger AS $$
DECLARE
  current_qty bigint;
  new_qty bigint;
BEGIN
  SELECT quantity INTO current_qty FROM products WHERE id = NEW.product_id FOR UPDATE;
  new_qty := current_qty + NEW.quantity;

  IF new_qty < 0 AND NEW.type NOT IN ('count', 'cancel') THEN
    RAISE EXCEPTION 'الكمية المتاحة غير كافية (المتاح %)', current_qty;
  END IF;

  NEW.balance_after := new_qty;
  UPDATE products SET quantity = new_qty, updated_at = now() WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_apply_inventory_movement
  BEFORE INSERT ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION apply_inventory_movement();

-- Prevent direct UPDATE of quantity on products from application role
REVOKE UPDATE (quantity) ON products FROM authenticated;

-- ============================================
-- Trigger: updated_at for products
-- ============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- Trigger: updated_at for customers
-- ============================================
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- Trigger: updated_at for expenses
-- ============================================
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- Trigger: updated_at for settings
-- ============================================
CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- Trigger: updated_at for suspended_sales
-- ============================================
CREATE TRIGGER trg_suspended_sales_updated_at
  BEFORE UPDATE ON suspended_sales
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
