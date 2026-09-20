import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const schemaQuery = "SELECT name FROM pragma_table_info('feedback_submission') ORDER BY cid; SELECT name FROM sqlite_master WHERE type='index' AND name IN ('feedback_rate','feedback_created','feedback_pending');";
const columns = ["id", "payload", "payload_hash", "rate_key", "created_at", "status", "attempts", "first_attempt_at", "next_attempt_at", "provider_id", "last_error"];
export function verifySchema(result) {
  if (!Array.isArray(result) || result.some(item => item.success === false)) throw new Error("D1 schema check failed.");
  const names = new Set(result.flatMap(item => item.results ?? []).map(item => item.name));
  const missing = [...columns, "feedback_rate", "feedback_created", "feedback_pending"].filter(name => !names.has(name));
  if (missing.length) throw new Error(`Feedback database is not ready: ${missing.join(', ')}. Deployment stopped.`);
}
function runCli(args, capture = false) {
  // Invoke the installed JS entry directly: works without PowerShell/cmd quoting.
  const adapter = args[0] === "opennext-deploy";
  const cli = adapter ? "node_modules/@opennextjs/cloudflare/dist/cli/index.js" : "node_modules/wrangler/bin/wrangler.js";
  const result = spawnSync(process.execPath, [cli, ...(adapter ? ["deploy"] : args)], {
    encoding: "utf8", stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit", env: process.env,
  });
  if (result.status !== 0) throw new Error(`Wrangler ${args.slice(0, 3).join(' ')} failed. Check Cloudflare login and account access; deployment stopped.`);
  return capture ? JSON.parse(result.stdout) : undefined;
}
export async function releaseFeedback({ local = false, migrate = false, deploy = false, run = runCli, checkBuild = () => readFileSync(".open-next/worker.js", "utf8").trim() } = {}) {
  if (local && deploy) throw new Error("Local checks cannot deploy.");
  if (deploy) {
    // Require these as server-side secrets for a single consistent configuration.
    // Only names are read. Values never enter CLI logs, source control or the browser.
    const secrets = run(["secret", "list"], true);
    const names = new Set(secrets.map(secret => secret.name));
    const missing = ["RESEND_API_KEY", "FEEDBACK_FROM", "FEEDBACK_TO"].filter(name => !names.has(name));
    if (!names.has("AUTH_SECRET") && !names.has("FEEDBACK_RATE_SECRET")) missing.push("FEEDBACK_RATE_SECRET or AUTH_SECRET");
    if (missing.length) throw new Error(`Configure these website Worker secrets before release: ${missing.join(', ')}. Nothing deployed.`);
    if (!checkBuild()) throw new Error("Run npm run cf:build first.");
  }
  const target = local ? "--local" : "--remote";
  if (migrate || deploy) run(["d1", "migrations", "apply", "AUTH_DB", target]);
  verifySchema(run(["d1", "execute", "AUTH_DB", target, "--command", schemaQuery, "--json"], true));
  console.log(`PASS feedback schema (${local ? 'local' : 'production'}).`);
  if (deploy) {
    // Uses the same custom entry/config as OpenNext's build output.
    run(["opennext-deploy"]);
    console.log("Website and scheduled feedback delivery deployed together. Verify a real response AND the receiving inbox before declaring mail delivery ready.");
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const allowed = new Set(["--local", "--remote", "--migrate", "--deploy"]);
  try {
    if (args.some(arg => !allowed.has(arg)) || (args.includes("--local") && args.includes("--remote")) || (!args.includes("--local") && !args.includes("--remote") && !args.includes("--deploy"))) throw new Error("Use --local or --remote; add --migrate to apply migrations, or --deploy for the guarded production release.");
    await releaseFeedback({ local: args.includes("--local"), migrate: args.includes("--migrate"), deploy: args.includes("--deploy") });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
