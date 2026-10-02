-- Billing is isolated by provider environment; image contents never enter these tables.
CREATE TABLE billing_checkout (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES auth_user(id), environment TEXT NOT NULL CHECK(environment IN ('test','prod')),
  product_id TEXT NOT NULL, buyer_email TEXT NOT NULL, created_at INTEGER NOT NULL,
  checkout_url TEXT, expires_at INTEGER NOT NULL, consent_version TEXT NOT NULL,
  provider_order_id TEXT, state TEXT NOT NULL DEFAULT 'pending', retention_hold INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX billing_checkout_owner ON billing_checkout(user_id,environment,created_at);
CREATE UNIQUE INDEX billing_checkout_order ON billing_checkout(environment,provider_order_id);
CREATE TABLE billing_subscription (
  order_id TEXT NOT NULL, environment TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES auth_user(id), checkout_id TEXT NOT NULL REFERENCES billing_checkout(id),
  status TEXT NOT NULL, period_start INTEGER NOT NULL, period_end INTEGER NOT NULL,
  will_renew INTEGER NOT NULL, paid INTEGER NOT NULL, checked_at INTEGER NOT NULL,
  PRIMARY KEY(environment,order_id)
);
CREATE INDEX billing_subscription_owner ON billing_subscription(user_id,environment,period_end);
CREATE TABLE billing_lock (name TEXT PRIMARY KEY, token TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE billing_event (
  environment TEXT NOT NULL, event_id TEXT NOT NULL, event_type TEXT NOT NULL,
  order_id TEXT NOT NULL, received_at INTEGER NOT NULL, PRIMARY KEY(environment,event_id)
);
CREATE TABLE billing_usage (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, guest_id TEXT NOT NULL,
  environment TEXT NOT NULL, day TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('single','batch')),
  state TEXT NOT NULL CHECK(state IN ('reserved','consumed','released')),
  created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, completed_at INTEGER,
  subscription_order_id TEXT
);
CREATE INDEX billing_usage_quota ON billing_usage(environment,owner_id,day,kind,state);
CREATE INDEX billing_usage_guest ON billing_usage(environment,guest_id,day,kind,state);
