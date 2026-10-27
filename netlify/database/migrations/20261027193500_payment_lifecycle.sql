ALTER TABLE academy_purchase_receipts ADD COLUMN IF NOT EXISTS order_id text;
ALTER TABLE academy_purchase_receipts ADD COLUMN IF NOT EXISTS variant_id text;
ALTER TABLE academy_purchase_receipts ADD COLUMN IF NOT EXISTS contract_id text;
ALTER TABLE academy_purchase_receipts ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
CREATE INDEX IF NOT EXISTS academy_receipts_contract ON academy_purchase_receipts(contract_id);
CREATE INDEX IF NOT EXISTS academy_receipts_order ON academy_purchase_receipts(order_id, variant_id);
CREATE TABLE IF NOT EXISTS academy_shopify_stops (
  reference text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('contract_cancel', 'refund')),
  created_at timestamptz NOT NULL DEFAULT now()
);
