-- Phase 2: Views
-- Migration plan §4.13

-- ============================================
-- View: customer_ledgers
-- Calculated customer balances (replaces customerLedgers in-memory logic)
-- ============================================
CREATE VIEW customer_ledgers AS
SELECT
  c.id AS customer_id,
  c.store_id,
  COALESCE(SUM(s.due_minor) FILTER (WHERE s.status <> 'cancelled'), 0)
    - COALESCE((SELECT SUM(p.amount_minor) FROM payments p WHERE p.customer_id = c.id), 0)
    AS balance_minor,
  COALESCE(SUM(s.total_minor) FILTER (WHERE s.status <> 'cancelled'), 0) AS purchases_minor,
  COUNT(s.id) FILTER (WHERE s.status <> 'cancelled') AS invoice_count,
  MAX(s.created_at) AS last_purchase_at
FROM customers c
LEFT JOIN sales s ON s.customer_id = c.id
GROUP BY c.id, c.store_id;

-- ============================================
-- View: product_stock_status
-- Stock status for each active product
-- ============================================
CREATE VIEW product_stock_status AS
SELECT id, store_id, quantity, low_stock_threshold,
  CASE
    WHEN quantity <= 0 THEN 'out'
    WHEN quantity <= low_stock_threshold THEN 'low'
    ELSE 'ok'
  END AS stock_status
FROM products WHERE is_active;
