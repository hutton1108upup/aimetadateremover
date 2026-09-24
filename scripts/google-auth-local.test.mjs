import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnv } from "node:util";
import { prepareImport, configurationReport, localOrigin } from "./google-auth-local.mjs";

const callback = "http://localhost:3180/api/auth/callback/google";
const web = { client_id: "demo.apps.googleusercontent.com", client_secret: "test-only-secret", redirect_uris: [callback] };
const json = JSON.stringify({ web });
const env = `# Preserve this comment\r\nAUTH_BASE_URL=http://localhost:3180\r\nAUTH_SECRET=${"a".repeat(48)}\r\nGOOGLE_CLIENT_ID=\r\nGOOGLE_CLIENT_SECRET=\r\nOTHER=value\r\n`;

test("imports web credentials without rotating secret or changing unrelated settings", () => {
  const result = prepareImport(env, json);
  assert.equal(result.callback, callback);
  assert.ok(result.text.startsWith("# Preserve this comment\r\n"));
  assert.ok(result.text.includes("OTHER=value\r\n"));
  assert.equal(parseEnv(result.text).AUTH_SECRET, "a".repeat(48));
  assert.equal(parseEnv(result.text).GOOGLE_CLIENT_SECRET, web.client_secret);
  assert.equal(prepareImport(result.text, json).text, result.text);
});
test("creates a strong local secret only when absent", () => {
  const result = prepareImport("", json);
  assert.equal(parseEnv(result.text).AUTH_SECRET.length, 96);
  assert.equal(configurationReport(result.text).ready, true);
});
test("rejects incorrect client type and exact callback mismatches", () => {
  assert.throws(() => prepareImport(env, JSON.stringify({ installed: web })), /Web application/);
  assert.throws(() => prepareImport(env, JSON.stringify({ web: { ...web, redirect_uris: [callback.replace("localhost", "127.0.0.1")] } })), /exact Authorized redirect URI/);
  assert.throws(() => prepareImport(env, JSON.stringify({ web: { ...web, client_secret: "" } })), /client_secret/);
});
test("refuses to overwrite configured identities or rotate a weak secret", () => {
  assert.throws(() => prepareImport(env.replace("GOOGLE_CLIENT_ID=", "GOOGLE_CLIENT_ID=existing.apps.googleusercontent.com"), json), /not replaced/);
  assert.throws(() => prepareImport(env.replace("a".repeat(48), "short"), json), /not rotated/);
});
test("rejects duplicate and multiline assignments without changing the file", () => {
  assert.throws(() => prepareImport(env + "GOOGLE_CLIENT_ID=\n", json), /single-line/);
  assert.throws(() => prepareImport(env.replace("a".repeat(48), `'${"a".repeat(48)}\nsecond-line'`), json), /single-line/);
});
test("rejects control characters and does not echo malformed secret JSON", () => {
  assert.throws(() => prepareImport(env, JSON.stringify({ web: { ...web, client_secret: "secret\nINJECTED=true" } })), /client_secret/);
  try { prepareImport(env, '{"client_secret":"do-not-print'); assert.fail(); }
  catch (error) { assert.doesNotMatch(error.message, /do-not-print/); }
});
test("diagnostics return only readiness and local callback, never secrets", () => {
  const report = configurationReport(env);
  assert.equal(report.ready, false);
  assert.equal(report.fields.GOOGLE_CLIENT_ID, false);
  assert.doesNotMatch(JSON.stringify(report), new RegExp("a".repeat(48)));
  for (const url of ["https://example.com", "http://localhost:3180/path", "http://localhost:3180?secret=x", "http://u:p@localhost:3180", "not-a-url"]) {
    assert.throws(() => localOrigin(url));
  }
});
