ALTER TABLE academy_purchase_receipts ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0);
ALTER TABLE academy_shopify_stops ADD COLUMN IF NOT EXISTS refunded_quantity integer NOT NULL DEFAULT 1 CHECK (refunded_quantity > 0);
