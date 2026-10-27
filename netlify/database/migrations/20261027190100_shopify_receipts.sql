CREATE TABLE IF NOT EXISTS academy_purchase_receipts (
  external_reference text PRIMARY KEY,
  customer_hash text NOT NULL,
  plan text NOT NULL CHECK (plan IN ('home', 'professional')),
  source text NOT NULL CHECK (source IN ('paid', 'gift')),
  starts_at timestamptz NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (source = 'gift' OR expires_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS academy_receipts_customer ON academy_purchase_receipts(customer_hash);
CREATE TABLE IF NOT EXISTS academy_customer_bindings (
  customer_hash text PRIMARY KEY,
  user_id text UNIQUE NOT NULL,
  bound_at timestamptz NOT NULL DEFAULT now()
);
