import test from "node:test";
import assert from "node:assert/strict";
import { assertCredentials, assertStore, assertProduct, plans, storeId, merchantId, origin } from "./waffo-release.mjs";
const product = plan => ({ id: plan.id, storeId, name: `AI Metadata Remover Pro ${plan.plan === "monthly" ? "Monthly" : "Yearly"}`, status: "active", billingPeriod: plan.period,
  successUrl: `${origin}/account/billing?checkout=return`, metadata: JSON.stringify({ app: "ai-metadata-remover", plan: plan.plan, trialDays: plan.days }), prices: [{ currency: "USD", priceInfo: { amount: plan.amount, trialAmount: plan.intro, taxCategory: "saas" } }] });
test("only the approved merchant, store and environment can be prepared", () => {
  const env = { WAFFO_ENVIRONMENT: "test", WAFFO_STORE_ID: storeId, WAFFO_MERCHANT_ID: merchantId, WAFFO_PRIVATE_KEY: "fixture" };
  assertCredentials(env, "test");
  for (const patch of [{ WAFFO_ENVIRONMENT: "prod" }, { WAFFO_STORE_ID: "other-store" }, { WAFFO_MERCHANT_ID: "other-merchant" }, { WAFFO_PRIVATE_KEY: "" }]) assert.throws(() => assertCredentials({ ...env, ...patch }, "test"));
});
test("old domain, unapproved store and mismatched support email block release", () => {
  const store = { id: storeId, prodEnabled: true, website: origin, supportEmail: "support@aimetadataremover.pro" };
  assertStore(store);
  for (const patch of [{ website: "https://aimetadateremover.pro" }, { prodEnabled: false }, { supportEmail: "support@example.com" }]) assert.throws(() => assertStore({ ...store, ...patch }));
});
for (const plan of plans) {
  test(`${plan.plan}: first price, renewal price, period and offer days must match`, () => {
    assertProduct(product(plan), plan);
    for (const change of [p => p.prices[0].priceInfo.amount = "0.01", p => p.prices[0].priceInfo.trialAmount = "0", p => p.billingPeriod = "weekly", p => p.metadata = JSON.stringify({ app: "ai-metadata-remover", plan: plan.plan, trialDays: 7 })]) {
      const p = product(plan); change(p); assert.throws(() => assertProduct(p, plan));
    }
  });
  test(`${plan.plan}: another store, product, currency or return URL cannot be published`, () => {
    for (const patch of [{ id: plans.find(other => other !== plan).id }, { storeId: "wrong" }, { status: "inactive" }, { successUrl: "https://another.example/return" }, { prices: [{ currency: "EUR", priceInfo: { amount: plan.amount, trialAmount: plan.intro, taxCategory: "saas" } }] }]) assert.throws(() => assertProduct({ ...product(plan), ...patch }, plan));
  });
}
