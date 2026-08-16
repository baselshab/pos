-- Seed data for development/testing
-- This file is optional and can be run after migrations

-- Note: This assumes a user already exists in auth.users
-- Replace '00000000-0000-0000-0000-000000000000' with an actual user ID for testing

-- Insert a demo store
INSERT INTO stores (id, name, owner_id, currency_code)
VALUES ('00000000-0000-0000-0000-000000000000', 'متجر تجريبي', '00000000-0000-0000-0000-000000000000', 'SAR')
ON CONFLICT (id) DO NOTHING;

-- Insert store member
INSERT INTO store_members (store_id, user_id, role, is_active)
VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'owner', true)
ON CONFLICT (store_id, user_id) DO NOTHING;

-- Insert default categories
INSERT INTO categories (id, store_id, name, color, sort_order)
VALUES
  ('10000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'عام', '#6B7280', 0),
  ('20000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'أطعمة', '#10B981', 1),
  ('30000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'مشروبات', '#3B82F6', 2)
ON CONFLICT (store_id, name) DO NOTHING;

-- Insert default adjustment reasons
INSERT INTO adjustment_reasons (store_id, name, is_active, is_system)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'جرد', true, true),
  ('00000000-0000-0000-0000-000000000000', 'تالف', true, true),
  ('00000000-0000-0000-0000-000000000000', 'مرتجع', true, true)
ON CONFLICT (store_id, name) DO NOTHING;

-- Insert default expense categories
INSERT INTO expense_categories (store_id, name, color)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'إيجار', '#EF4444'),
  ('00000000-0000-0000-0000-000000000000', 'رواتب', '#F59E0B'),
  ('00000000-0000-0000-0000-000000000000', 'مصروفات عامة', '#8B5CF6')
ON CONFLICT (store_id, name) DO NOTHING;

-- Insert default settings
INSERT INTO settings (store_id, values)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '{
    "storeName": "متجر تجريبي",
    "currency": "SAR",
    "currencySymbol": "ر.س",
    "taxRate": 15,
    "taxInclusive": true,
    "invoicePrefix": "INV",
    "lowStockThreshold": 5,
    "receiptFooter": "شكراً لزيارتكم",
    "posMode": "retail"
  }'::jsonb
)
ON CONFLICT (store_id) DO NOTHING;
