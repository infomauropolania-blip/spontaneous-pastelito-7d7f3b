CREATE TABLE IF NOT EXISTS academy_access_grants (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  plan text NOT NULL CHECK (plan IN ('home', 'professional')),
  source text NOT NULL CHECK (source IN ('paid', 'gift')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  external_reference text UNIQUE NOT NULL,
  created_by text NOT NULL,
  CHECK (source = 'gift' OR expires_at IS NOT NULL),
  CHECK (expires_at IS NULL OR expires_at > starts_at)
);
CREATE INDEX IF NOT EXISTS academy_access_user ON academy_access_grants(user_id);
CREATE TABLE IF NOT EXISTS academy_private_recipes (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  day text NOT NULL,
  record jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS academy_recipes_owner ON academy_private_recipes(user_id, day);
CREATE TABLE IF NOT EXISTS academy_access_audit (
  id uuid PRIMARY KEY,
  grant_id uuid NOT NULL REFERENCES academy_access_grants(id),
  action text NOT NULL CHECK (action IN ('grant', 'revoke')),
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
