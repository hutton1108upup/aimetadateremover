// Run from this project's subscription-live worktree. check is read-only;
// activate requires an explicit flag and is the user's final production step.
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { WebhookEventType } from "@waffo/pancake-ts";
import { readProduction, storeId, origin, plans } from "./waffo-release.mjs";
import { releaseFeedback } from "./feedback-release.mjs";

const accountId = "7fd7ed1128ca3d125feaa279f4d4c547";
const databaseId = "25630523-1dae-4032-b45b-f539622320f2";
const workerName = "aimetadateremover";
function cli(args, { input, capture = false } = {}) {
  const result = spawnSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", ...args], { encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"], env: process.env });
  if (result.status !== 0) throw new Error(`Cloudflare ${args.slice(0, 2).join(" ")} failed. No credentials printed; activation stopped.`);
  if (!capture) console.log(`PASS Cloudflare ${args.slice(0, 2).join(" ")}.`);
  return result.stdout;
}
function secrets(payload) { cli(["secret", "bulk", "--config", "wrangler.jsonc"], { input: JSON.stringify(payload) }); }
async function readStatus() {
  const response = await fetch(`${origin}/api/billing/status`, { redirect: "error", signal: AbortSignal.timeout(20000) });
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw new Error("Production billing status is unavailable; checkout must remain closed.");
  return response.json();
}
async function preflight() {
  // Use this project's existing login, never the global CLI account.
  // Other projects on this computer use a different Cloudflare account.
  const authHome = path.resolve("artifacts/cloudflare-auth");
  await stat(path.join(authHome, ".wrangler/config/default.toml"));
  process.env.XDG_CONFIG_HOME = authHome;
  const config = await readFile("wrangler.jsonc", "utf8");
  for (const [key, value] of [["account_id", accountId], ["database_id", databaseId], ["name", workerName], ["AUTH_BASE_URL", origin]]) if (!config.includes(`"${key}": "${value}"`)) throw new Error(`Unexpected production ${key}.`);
  const who = cli(["whoami"], { capture: true });
  if (!who.includes(accountId) || !/duckweed1014@gmail\.com/i.test(who)) throw new Error("Cloudflare identity does not match the approved account.");
  const production = await readProduction();
  if (production.state.store.name !== "AI Metadata Remover") throw new Error("Prepare the production products and store name first.");
  const names = new Set(JSON.parse(cli(["secret", "list", "--config", "wrangler.jsonc"], { capture: true })).map(secret => secret.name));
  for (const name of ["AUTH_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "RESEND_API_KEY", "FEEDBACK_FROM", "FEEDBACK_TO"]) if (!names.has(name)) throw new Error(`Existing website secret ${name} is missing; nothing changed.`);
  const build = await stat(".open-next/worker.js");
  if (!build.size) throw new Error("Build the Cloudflare Worker first.");
  // Feedback schema must exist before billing migrations or a website release.
  await releaseFeedback();
  return production;
}
export async function activate({ readiness = preflight, run = cli, saveSecrets = secrets, deploy = releaseFeedback, status = readStatus, evidencePrefix = "production", log = console.log } = {}) {
  const { env, api, state } = await readiness();
  const directory = `artifacts/waffo-20261008/${evidencePrefix}-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`;
  await mkdir(directory, { recursive: true });
  run(["d1", "export", "AUTH_DB", "--remote", "--config", "wrangler.jsonc", "--output", `${directory}/database-before-billing.sql`]);
  if (!(await stat(`${directory}/database-before-billing.sql`)).size) throw new Error("Production backup is empty; deployment stopped.");
  run(["d1", "migrations", "apply", "AUTH_DB", "--remote", "--config", "wrangler.jsonc"]);
  const schema = JSON.parse(run(["d1", "execute", "AUTH_DB", "--remote", "--config", "wrangler.jsonc", "--json", "--command", "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('billing_checkout','billing_subscription','billing_event','billing_lock','billing_usage','billing_offer_redemption'); SELECT name FROM pragma_table_info('billing_checkout') WHERE name IN ('plan_id','intro_offer'); SELECT name FROM pragma_table_info('billing_subscription') WHERE name='plan_id';"], { capture: true }));
  if (schema.some(row => row.success === false) || schema[0]?.results.length !== 6 || schema[1]?.results.length !== 2 || schema[2]?.results.length !== 1) throw new Error("Production billing schema is incomplete; checkout was not opened.");
  const payload = Object.fromEntries(["WAFFO_MERCHANT_ID", "WAFFO_PRIVATE_KEY", "WAFFO_STORE_ID", "WAFFO_ENVIRONMENT"].map(key => [key, env[key]]));
  for (const plan of plans) payload[plan.key] = plan.id;
  payload.WAFFO_CHECKOUT_ENABLED = "false";
  payload.BILLING_METERING_ENABLED = "true";
  saveSecrets(payload);
  const url = `${origin}/api/billing/webhook`;
  const events = Object.values(WebhookEventType).filter(event => event.startsWith("subscription.") || event.startsWith("refund."));
  const webhook = state.store.storeWebhooks.find(item => item.url === url && !item.testMode);
  if (!webhook) await api.webhooks.add({ storeId, channel: "http", url, testMode: false, events });
  else if (events.some(event => !webhook.events.includes(event))) throw new Error("Existing production webhook events differ; inspect before changing them. Checkout remains closed.");
  await deploy({ deploy: true });
  const closed = await status();
  if (!closed.enabled || closed.checkoutEnabled || closed.environment !== "prod") throw new Error("Closed production checkout verification failed; no activation attempted.");
  // The enabling write is last. On a failed check, close checkout again.
  try {
    saveSecrets({ WAFFO_CHECKOUT_ENABLED: "true" });
    const opened = await status();
    if (!opened.enabled || !opened.checkoutEnabled || opened.environment !== "prod") throw new Error("Production activation verification failed.");
  } catch (error) {
    try { saveSecrets({ WAFFO_CHECKOUT_ENABLED: "false" }); }
    catch { throw new Error("Activation verification and automatic checkout closure both failed. Immediately set WAFFO_CHECKOUT_ENABLED=false in this Worker dashboard."); }
    throw error;
  }
  await writeFile(`${directory}/deployment-result.json`, JSON.stringify({ at: new Date().toISOString(), workerName, storeId, origin, checkoutEnabled: true, realPaymentVerified: false }, null, 2));
  log("PASS production checkout enabled. No real payment was initiated. Verify a real authorized purchase and signed webhook before claiming payment acceptance.");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const command = process.argv[2];
 try {
  if (command === "check" && process.argv.length === 3) {
    const production = await preflight();
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), accountId, workerName, databaseId, storeId, productsVerified: true, productionWebhookConfigured: production.state.store.storeWebhooks.some(item => item.url === `${origin}/api/billing/webhook` && !item.testMode), checkoutChanged: false }));
  } else if (command === "activate" && process.argv.length === 4 && process.argv[3] === "--confirm-production") await activate();
  else throw new Error("Use check (read-only), or activate --confirm-production (backs up, migrates, configures and deploys the real website). Changing the Waffo dashboard test toggle alone does not deploy this website.");
 } catch (error) {
  console.error(error instanceof Error ? error.message.replace(/MII[A-Za-z0-9+/=]{100,}/g, "[redacted]") : "Production activation failed.");
  process.exitCode = 1;
 }
}
