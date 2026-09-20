import test from "node:test";
import assert from "node:assert/strict";
import { releaseFeedback } from "./feedback-release.mjs";

const schema = [{ success: true, results: ["id","payload","payload_hash","rate_key","created_at","status","attempts","first_attempt_at","next_attempt_at","provider_id","last_error","feedback_rate","feedback_created","feedback_pending"].map(name => ({ name })) }];
const secrets = ["RESEND_API_KEY", "FEEDBACK_FROM", "FEEDBACK_TO", "AUTH_SECRET"].map(name => ({ name }));
test("missing mail settings block before migration or deployment", async () => {
  const calls = [];
  await assert.rejects(releaseFeedback({ deploy: true, run: args => { calls.push(args); return []; }, checkBuild: () => "build" }), /RESEND_API_KEY/);
  assert.deepEqual(calls, [["secret", "list"]]);
});
test("schema mismatch stops release even after migration command succeeds", async () => {
  const calls = [];
  await assert.rejects(releaseFeedback({ deploy: true, checkBuild: () => "build", run: args => {
    calls.push(args); if (args[0] === "secret") return secrets;
    if (args[1] === "execute") return [{ success: true, results: [] }];
  } }), /database is not ready/);
  assert.ok(calls.some(args => args[1] === "migrations"));
  assert.ok(!calls.some(args => args[0] === "opennext-deploy"));
});
test("successful release applies remote migrations, verifies schema, then uses OpenNext deploy", async () => {
  const calls = [];
  await releaseFeedback({ deploy: true, checkBuild: () => "build", run: args => {
    calls.push(args); if (args[0] === "secret") return secrets; if (args[1] === "execute") return schema;
  } });
  assert.deepEqual(calls.map(args => args.slice(0, 2).join(" ")), ["secret list", "d1 migrations", "d1 execute", "opennext-deploy"]);
  assert.ok(calls[1].includes("--remote"));
});
test("Cloudflare permission error cannot fall through to deploy", async () => {
  const calls = [];
  await assert.rejects(releaseFeedback({ deploy: true, run: args => { calls.push(args); throw new Error("Unauthorized"); } }), /Unauthorized/);
  assert.equal(calls.length, 1);
});
test("local checks are read-only and never use the remote database", async () => {
  const calls = [];
  await releaseFeedback({ local: true, run: args => { calls.push(args); return schema; } });
  assert.equal(calls.length, 1); assert.ok(calls[0].includes("--local")); assert.ok(!calls[0].includes("--remote"));
});
