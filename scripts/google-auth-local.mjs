import { readFile, writeFile, rename, unlink } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const envFile = resolve(root, ".dev.vars");
const defaultOrigin = "http://localhost:3180";

export function localOrigin(value = defaultOrigin) {
  let url;
  try { url = new URL(value); } catch { throw new Error("AUTH_BASE_URL must be a local HTTP origin."); }
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("This helper supports local HTTP origins only.");
  }
  return url.origin;
}

export function prepareImport(envText, jsonText) {
  const env = parseEnv(envText);
  const origin = localOrigin(env.AUTH_BASE_URL || defaultOrigin);
  const callback = `${origin}/api/auth/callback/google`;
  let document;
  try { document = JSON.parse(jsonText); } catch { throw new Error("The selected file is not valid OAuth JSON."); }
  const web = document?.web;
  if (!web || typeof web !== "object") throw new Error("Create a Web application OAuth client, not Desktop or a service account.");
  const clientId = web.client_id;
  const clientSecret = web.client_secret;
  if (typeof clientId !== "string" || !/^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(clientId) ||
      typeof clientSecret !== "string" || !clientSecret.trim() || /[\r\n\0]/.test(clientSecret)) {
    throw new Error("The OAuth JSON must contain a valid client_id and client_secret.");
  }
  if (!Array.isArray(web.redirect_uris) || !web.redirect_uris.includes(callback)) {
    throw new Error(`Add this exact Authorized redirect URI in Google, then download JSON again: ${callback}`);
  }
  for (const [key, value] of [["GOOGLE_CLIENT_ID", clientId], ["GOOGLE_CLIENT_SECRET", clientSecret]]) {
    if (env[key] && env[key] !== value) throw new Error(`${key} is already configured differently; existing credentials were not replaced.`);
  }
  if (env.AUTH_SECRET && env.AUTH_SECRET.trim().length < 32) {
    throw new Error("Existing AUTH_SECRET is too short; it was not rotated automatically.");
  }
  const updates = {
    AUTH_BASE_URL: origin,
    AUTH_SECRET: env.AUTH_SECRET || randomBytes(48).toString("hex"),
    GOOGLE_CLIENT_ID: clientId,
    GOOGLE_CLIENT_SECRET: clientSecret,
  };
  // Preserve unrelated values/comments; refuse ambiguous multiline or duplicate assignments.
  let output = envText;
  const newline = envText.includes("\r\n") ? "\r\n" : "\n";
  for (const [key, value] of Object.entries(updates)) {
    const pattern = new RegExp(`^[ \\t]*(?:export[ \\t]+)?${key}[ \\t]*=[^\\r\\n]*`, "gm");
    const matches = [...output.matchAll(pattern)];
    if (matches.length > 1 || (matches.length && parseEnv(matches[0][0])[key] !== env[key])) {
      throw new Error(`${key} must have one single-line assignment.`);
    }
    const line = `${key}=${JSON.stringify(value)}`;
    output = matches.length ? output.replace(pattern, () => line) : `${output}${output && !output.endsWith("\n") ? newline : ""}${line}${newline}`;
  }
  const parsed = parseEnv(output);
  if (Object.entries(updates).some(([key, value]) => parsed[key] !== value)) {
    throw new Error("Credentials cannot be safely represented in .dev.vars.");
  }
  return { text: output, origin, callback };
}

export function configurationReport(envText) {
  const env = parseEnv(envText);
  const origin = localOrigin(env.AUTH_BASE_URL || defaultOrigin);
  const fields = {
    AUTH_BASE_URL: Boolean(env.AUTH_BASE_URL),
    AUTH_SECRET: (env.AUTH_SECRET?.trim().length || 0) >= 32,
    GOOGLE_CLIENT_ID: /^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(env.GOOGLE_CLIENT_ID || ""),
    GOOGLE_CLIENT_SECRET: Boolean(env.GOOGLE_CLIENT_SECRET?.trim()),
  };
  return { fields, ready: Object.values(fields).every(Boolean), origin, callback: `${origin}/api/auth/callback/google` };
}

async function run() {
  const [command, input, ...extra] = process.argv.slice(2);
  if (!(["check", "import"].includes(command)) || extra.length || (command === "import" ? !input : input && input !== "--live")) {
    throw new Error('Usage: npm run auth:check [-- --live] OR npm run auth:import -- "C:/path/client_secret.json"');
  }
  let envText = "";
  try { envText = await readFile(envFile, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw new Error("Cannot read the local .dev.vars file."); }
  // Check Git protection before any write. Never print credential values or source JSON.
  const ignored = spawnSync("git", ["check-ignore", "-q", ".dev.vars"], { cwd: root, stdio: "ignore" }).status === 0;
  if (!ignored) throw new Error(".dev.vars is not safely ignored by Git; no credentials were written.");
  if (command === "import") {
    let jsonText;
    try { jsonText = await readFile(resolve(input), "utf8"); } catch { throw new Error("Cannot read the selected OAuth JSON file."); }
    const result = prepareImport(envText, jsonText);
    const temporary = `${envFile}.${randomBytes(8).toString("hex")}.tmp`;
    try {
      await writeFile(temporary, result.text, { flag: "wx", mode: 0o600 });
      await rename(temporary, envFile);
    } finally {
      await unlink(temporary).catch(error => { if (error.code !== "ENOENT") throw new Error("Could not remove the local temporary config file."); });
    }
    console.log("Imported into ignored .dev.vars. Existing AUTH_SECRET preserved. Restart the local preview.");
    console.log(`Callback: ${result.callback}`);
    return;
  }
  const report = configurationReport(envText);
  for (const [key, valid] of Object.entries(report.fields)) console.log(`${valid ? "OK" : "MISSING/INVALID"} ${key}`);
  console.log("OK .dev.vars excluded from Git");
  console.log(`Callback: ${report.callback}`);
  let liveReady = true;
  if (input === "--live") {
    try {
      const response = await fetch(`${report.origin}/api/auth/status`, { redirect: "error", signal: AbortSignal.timeout(5000) });
      const status = await response.json();
      liveReady = response.ok && status.enabled === true && (response.headers.get("cache-control") || "").includes("no-store");
      console.log(liveReady ? "OK preview enabled, no-store" : "NOT READY preview authentication; configure credentials and restart");
    } catch { liveReady = false; console.log("NOT READY local preview; start it on the configured port"); }
  }
  console.log("Real Google consent is a separate manual acceptance check.");
  if (!report.ready || !liveReady) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run().catch(error => {
    // Do not serialize system errors, request bodies, JSON, or credential values.
    console.error(error instanceof Error && !error.code ? error.message : "Local configuration operation failed; credentials were not displayed.");
    process.exitCode = 1;
  });
}
