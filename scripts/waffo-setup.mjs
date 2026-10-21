import { readFile, writeFile, mkdir } from "node:fs/promises";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
import { WaffoPancake, BillingPeriod, TaxCategory } from "@waffo/pancake-ts";

const production = process.argv.includes("--production");
const command = process.argv[2];
const filename = production ? ".env.waffo-production.local" : ".dev.vars";
const env = parseEnv(await readFile(filename, "utf8"));
const client = new WaffoPancake({ merchantId: env.WAFFO_MERCHANT_ID, privateKey: env.WAFFO_PRIVATE_KEY.replace(/\\n/g, "\n"), environment: env.WAFFO_ENVIRONMENT,
  fetch: (url, init) => fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(25000) }) });

try {
  if (command === "check") {
    const result = await client.graphql.query({ query: `query($id:String!){store(id:$id){id name prodEnabled website supportEmail}}`, variables: { id: env.WAFFO_STORE_ID } });
    if (result.errors?.length) throw new Error(result.errors.map(e => e.message).join("; "));
    console.log(JSON.stringify({ environment: env.WAFFO_ENVIRONMENT, ...result.data }));
  } else if (command === "create-product") {
    if (production) throw new Error("Create the test product first; publish only after verification.");
    if (env.WAFFO_SUBSCRIPTION_PRODUCT_ID) throw new Error("Product already configured; inspect it instead of creating another.");
    const { product } = await client.subscriptionProducts.create({
      storeId: env.WAFFO_STORE_ID, name: "ImageFinisher Batch Pro", billingPeriod: BillingPeriod.Monthly,
      description: "20 batch cleaning tasks per day, plus 3 free single-image cleans. Images are processed locally in your browser. Daily allowances reset at 00:00 UTC. USD 4.99 per calendar month, automatically renewed until canceled.",
      prices: { USD: { amount: "4.99", taxCategory: TaxCategory.SaaS } },
      successUrl: "https://aimetadataremover.pro/account/billing?checkout=return",
      metadata: { app: "imagefinisher", plan: "batch-pro-monthly", contract: "2026-09-23" },
    });
    await writeFile(filename, (await readFile(filename, "utf8")).trimEnd() + `\nWAFFO_SUBSCRIPTION_PRODUCT_ID=${product.id}\n`);
    console.log(JSON.stringify({ id: product.id, name: product.name, billingPeriod: product.billingPeriod, prices: product.prices, status: product.status }));
  } else if (command === "store-secrets") {
    if (!production) throw new Error("Production secret storage requires --production.");
    const payload = Object.fromEntries(["WAFFO_MERCHANT_ID", "WAFFO_PRIVATE_KEY", "WAFFO_STORE_ID", "WAFFO_ENVIRONMENT"].map(key => [key, env[key]]));
    payload.WAFFO_CHECKOUT_ENABLED = "false";
    await mkdir("artifacts/secrets", { recursive: true });
    const path = "artifacts/secrets/waffo-cloudflare.json";
    await writeFile(path, JSON.stringify(payload), { mode: 0o600 });
    const result = spawnSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "secret", "bulk", path, "--name", "aimetadateremover"], { encoding: "utf8", env: process.env });
    if (result.status !== 0) throw new Error("Cloudflare secret storage failed. Inspect Wrangler logs locally without sharing secret values.");
    console.log("Five Waffo settings saved in Cloudflare; checkout remains disabled.");
  } else throw new Error("Use check, create-product, or store-secrets.");
} catch (error) {
  // SDK errors can contain request context. Never print the object or stack.
  console.error(error instanceof Error ? error.message.replace(/MII[A-Za-z0-9+/=]{100,}/g, "[redacted]") : "Waffo setup failed");
  process.exitCode = 1;
}
