// Read-only evidence check. Never changes a provider order, a clock, or D1 data.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { parseEnv } from "node:util";
import { pathToFileURL } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { assertCredentials, plans, storeId } from "./waffo-release.mjs";

const plan = process.argv.includes("--yearly") ? "yearly" : "monthly";
const env = parseEnv(await readFile(".dev.vars", "utf8"));
assertCredentials(env, "test");
const fixture = JSON.parse(await readFile(`artifacts/secrets/billing-test-release-20261008-${plan}-fixture.json`, "utf8"));
const auth = await readFile("artifacts/cloudflare-auth/.wrangler/config/default.toml", "utf8");
const token = auth.match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
assert.ok(token, "This project's Cloudflare login is missing");
async function sql(query, params) {
  const response = await fetch("https://api.cloudflare.com/client/v4/accounts/7fd7ed1128ca3d125feaa279f4d4c547/d1/database/6eb11432-20ce-4b28-a9c3-a78f7192a6a0/query", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ sql: query, params }), signal: AbortSignal.timeout(20000) });
  const result = await response.json();
  if (!result.success) throw new Error("Isolated test D1 read failed");
  return result.result[0].results;
}
const rows = await sql("SELECT * FROM billing_subscription WHERE environment='test' AND user_id=? ORDER BY checked_at DESC LIMIT 1", [fixture.id]);
assert.equal(rows.length, 1, "A signed test payment must have reached D1 first");
const events = await sql("SELECT event_type, COUNT(*) AS count FROM billing_event WHERE environment='test' AND order_id=? GROUP BY event_type", [rows[0].order_id]);
assert.ok(events.some(event => event.event_type === "subscription.payment_succeeded"), "Signed successful payment receipt must exist");
const config = { environment: "test", storeId, merchantId: env.WAFFO_MERCHANT_ID, privateKey: env.WAFFO_PRIVATE_KEY.replace(/\\n/g, "\n"), productId: env.WAFFO_SUBSCRIPTION_PRODUCT_ID || "", monthlyProductId: plans[0].id, yearlyProductId: plans[1].id };
const bundle = await build({ entryPoints: ["src/lib/billing/provider.ts"], bundle: true, write: false, platform: "node", format: "esm", packages: "external" });
await mkdir("artifacts/waffo-20261008", { recursive: true });
const compiledPath = "artifacts/waffo-20261008/provider-for-evidence.mjs";
await writeFile(compiledPath, bundle.outputFiles[0].text);
const { fetchSubscription, subscriptionSnapshot } = await import(pathToFileURL(path.resolve(compiledPath)).href);
const order = await fetchSubscription(config, rows[0].order_id);
assert.equal(order.testMode, true);
assert.equal(order.merchantProvidedBuyerIdentity, fixture.id);
assert.ok(order.currentPeriodNumber >= (plan === "monthly" ? 4 : 2), "Wait for the actual sandbox renewal, not only initial activation");
assert.ok(events.some(event => event.event_type === "subscription.renewed"), "Signed renewal receipt must exist");
const virtualNow = Date.parse(order.currentPeriodStart) + 1;
const snapshot = subscriptionSnapshot(order, config, virtualNow);
assert.equal(snapshot.paid, true);
assert.equal(snapshot.active, true, "Verified successful period must grant Pro within that period");
assert.equal(rows[0].paid, 1);
assert.equal(rows[0].period_start, snapshot.start);
assert.equal(rows[0].period_end, snapshot.end);
assert.equal(subscriptionSnapshot(order, config, snapshot.end).active, false, "Paid access must end at periodEnd");
const checks = ["signed payment reached test D1", "provider ownership and test environment match", "paid period grants Pro at its own time", "expiry denies access at periodEnd"];
if (plan === "monthly") {
  for (const [phase, expectedPaid] of [["success", true], ["failure", false]]) {
    const previous = JSON.parse(await readFile(`artifacts/waffo-20261008/monthly-renewal-${phase}-provider.json`, "utf8")).subscriptionOrders[0];
    assert.equal(previous.id, order.id);
    // Replay the archived provider status/period/payments against the same signed
    // order's immutable price snapshot. This does not modify the remote order.
    const replay = { ...order, ...previous, payments: previous.payments.map(payment => ({ ...payment, testMode: true, snapshotAmountDetails: { currency: payment.amount.currency, subtotal: payment.amount.display } })) };
    const result = subscriptionSnapshot(replay, config, Date.parse(previous.currentPeriodStart) + 1);
    assert.equal(result.paid, expectedPaid);
    assert.equal(result.active, expectedPaid);
    const database = JSON.parse(await readFile(`artifacts/waffo-20261008/monthly-renewal-${phase}-db.json`, "utf8")).subscriptions[0];
    assert.equal(database.paid, Number(expectedPaid));
    checks.push(`archived sandbox renewal ${phase} and signed D1 state match`);
  }
  assert.ok(events.some(event => event.event_type === "subscription.past_due"));
  assert.ok(events.some(event => event.event_type === "subscription.recovered"));
  checks.push("sandbox past_due and recovered signed receipts received");
}
const report = { checkedAt: new Date().toISOString(), plan, orderId: order.id, testMode: true, providerStatus: order.status, periodNumber: order.currentPeriodNumber,
  realClock: new Date().toISOString(), virtualClock: new Date(virtualNow).toISOString(), virtualClockOnlyUsedForReadOnlyReplay: true,
  events, checks, realPaymentVerified: false };
await writeFile(`artifacts/waffo-20261008/${plan}-lifecycle-check.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
