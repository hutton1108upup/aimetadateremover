import { readFile, writeFile, mkdir } from "node:fs/promises";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { WaffoPancake } from "@waffo/pancake-ts";
import { pricing } from "../src/lib/pricing.ts";

export const storeId = "STO_5iFEBLTOBoV0tSNB4jxOTJ";
export const merchantId = "MER_0Ca1DBngIQV3s35pRE1wcg";
export const origin = "https://aimetadataremover.pro";
export const plans = [
  { plan: "monthly", key: "WAFFO_MONTHLY_PRODUCT_ID", id: "PROD_0tKW1HnbEM0GFxGExkSdZS", period: "monthly", amount: pricing.pro.monthly.standardAmountUsd, intro: pricing.pro.monthly.firstPurchaseAmountUsd, days: pricing.pro.monthly.introDays },
  { plan: "yearly", key: "WAFFO_YEARLY_PRODUCT_ID", id: "PROD_4QLNcSMxy5OnUCSTVaw9Wn", period: "yearly", amount: pricing.pro.yearly.standardAmountUsd, intro: pricing.pro.yearly.firstYearAmountUsd, days: pricing.pro.yearly.introDays },
];
const productFields = "id storeId name status billingPeriod successUrl metadata hasProdVersion prices{currency priceInfo{amount trialAmount taxCategory}}";

export function assertCredentials(env, environment) {
  if (env.WAFFO_ENVIRONMENT !== environment || env.WAFFO_STORE_ID !== storeId || env.WAFFO_MERCHANT_ID !== merchantId || !env.WAFFO_PRIVATE_KEY) throw new Error(`Expected this project's ${environment} merchant credentials; nothing changed.`);
}
export function assertStore(store) {
  if (!store || store.id !== storeId || !store.prodEnabled || new URL(store.website).origin !== origin || store.supportEmail !== "support@aimetadataremover.pro") throw new Error("Store approval, domain or support email does not match this website.");
}
export function assertProduct(product, plan) {
  if (!product) throw new Error(`${plan.plan} product is not published in this environment; checkout cannot be activated.`);
  const metadata = typeof product?.metadata === "string" ? JSON.parse(product.metadata) : product?.metadata;
  const usd = product?.prices?.find(price => price.currency === "USD")?.priceInfo;
  if (!product || product.id !== plan.id || product.storeId !== storeId || product.name !== `AI Metadata Remover Pro ${plan.plan === "monthly" ? "Monthly" : "Yearly"}` || product.status !== "active" || product.billingPeriod !== plan.period || Number(usd?.amount) !== Number(plan.amount) || Number(usd?.trialAmount) !== Number(plan.intro) || usd?.taxCategory !== "saas" || Number(metadata?.trialDays) !== plan.days || metadata?.plan !== plan.plan || metadata?.app !== "ai-metadata-remover" || product.successUrl !== `${origin}/account/billing?checkout=return`) throw new Error(`${plan.plan} product does not match the approved price, period, offer, store or return URL.`);
}
function client(env) {
  return new WaffoPancake({ merchantId: env.WAFFO_MERCHANT_ID, privateKey: env.WAFFO_PRIVATE_KEY.replace(/\\n/g, "\n"), environment: env.WAFFO_ENVIRONMENT,
    fetch: (url, init) => fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(25000) }) });
}
async function query(api, document, variables) {
  const result = await api.graphql.query({ query: document, variables });
  if (result.errors?.length || !result.data) throw new Error("Waffo read failed; no credential or response body printed.");
  return result.data;
}
export async function inspect(api, { allowMissing = false } = {}) {
  const store = (await query(api, "query($id:String!){store(id:$id){id name prodEnabled website supportEmail storeWebhooks{id url testMode events}}}", { id: storeId })).store;
  assertStore(store);
  const products = [];
  for (const plan of plans) {
    const product = (await query(api, `query($id:String!){subscriptionProduct(id:$id){${productFields}}}`, { id: plan.id })).subscriptionProduct;
    if (!product && allowMissing) { products.push(null); continue; }
    assertProduct(product, plan);
    products.push(product);
  }
  return { store, products };
}
export async function readProduction() {
  const env = parseEnv(await readFile(".env.waffo-production.local", "utf8"));
  assertCredentials(env, "prod");
  const api = client(env);
  return { env, api, state: await inspect(api) };
}
async function run(command) {
  if (!["check", "prepare-products"].includes(command)) throw new Error("Use check or prepare-products. Neither command activates website checkout.");
  const testEnv = parseEnv(await readFile(".dev.vars", "utf8"));
  const prodEnv = parseEnv(await readFile(".env.waffo-production.local", "utf8"));
  assertCredentials(testEnv, "test"); assertCredentials(prodEnv, "prod");
  for (const plan of plans) if (testEnv[plan.key] !== plan.id) throw new Error("Unexpected test product ID.");
  const test = client(testEnv), prod = client(prodEnv);
  const testState = await inspect(test);
  let prodState = await inspect(prod, { allowMissing: true });
  if (command === "prepare-products") {
    // An existing mismatched live version is rejected by inspect before any write.
    for (let i = 0; i < plans.length; i++) if (!prodState.products[i]) {
      await test.subscriptionProducts.publish({ id: plans[i].id }, { idempotencyKey: `pro-${plans[i].plan}-publish-20261008` });
    }
    if (prodState.store.name !== "AI Metadata Remover") await prod.stores.update({ id: storeId, name: "AI Metadata Remover" });
    if (testState.store.name !== "AI Metadata Remover") await test.stores.update({ id: storeId, name: "AI Metadata Remover" });
    prodState = await inspect(prod);
    // Payment credentials stay local and checkout remains closed until deployment.
    let content = await readFile(".env.waffo-production.local", "utf8");
    for (const [key, value] of [...plans.map(plan => [plan.key, plan.id]), ["WAFFO_CHECKOUT_ENABLED", "false"], ["BILLING_METERING_ENABLED", "true"]]) {
      content = content.replace(new RegExp(`^${key}=.*(?:\\r?\\n|$)`, "gm"), "");
      content = content.trimEnd() + `\n${key}=${value}\n`;
    }
    await writeFile(".env.waffo-production.local", content, { mode: 0o600 });
  }
  const report = { checkedAt: new Date().toISOString(), store: { id: storeId, name: prodState.store.name, website: prodState.store.website, prodEnabled: prodState.store.prodEnabled },
    plans: plans.map((plan, i) => ({ plan: plan.plan, id: plan.id, firstPrice: plan.intro, renewalPrice: plan.amount, introDays: plan.days, testVerified: !!testState.products[i], productionVerified: !!prodState.products[i] })),
    productionWebhook: prodState.store.storeWebhooks.some(webhook => webhook.url === `${origin}/api/billing/webhook` && !webhook.testMode), websiteCheckoutActivated: false };
  await mkdir("artifacts/waffo-20261008", { recursive: true });
  await writeFile("artifacts/waffo-20261008/product-readiness.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await run(process.argv[2]); }
  catch (error) { console.error(error instanceof Error ? error.message.replace(/MII[A-Za-z0-9+/=]{100,}/g, "[redacted]") : "Waffo release failed."); process.exitCode = 1; }
}
