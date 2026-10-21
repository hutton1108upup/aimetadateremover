-- Keep historical orders intact; offers are consumed by verified payment only.
ALTER TABLE billing_checkout ADD COLUMN plan_id TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE billing_checkout ADD COLUMN intro_offer INTEGER NOT NULL DEFAULT 0;
ALTER TABLE billing_subscription ADD COLUMN plan_id TEXT NOT NULL DEFAULT 'legacy';
CREATE TABLE billing_offer_redemption (
 environment TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES auth_user(id),
 plan_id TEXT NOT NULL CHECK(plan_id IN ('monthly','yearly')), order_id TEXT NOT NULL,
 redeemed_at INTEGER NOT NULL, PRIMARY KEY(environment,user_id,plan_id)
);
