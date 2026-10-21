import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { activate } from "./billing-go-live.mjs";
function fixture({ backup = true, schema = true, opened = true } = {}) {
  const calls = [];
  let reads = 0;
  const options = {
    evidencePrefix: "mock", log: () => {},
    readiness: async () => ({ env: { WAFFO_ENVIRONMENT: "prod" }, state: { store: { storeWebhooks: [] } }, api: { webhooks: { add: async input => { assert.equal(input.testMode, false); calls.push("webhook"); } } } }),
    run: args => {
      calls.push(args.slice(0, 2).join(" "));
      if (args[1] === "export" && backup) writeFileSync(args.at(-1), "-- mock backup only; no user data\n");
      if (args[1] === "execute") return JSON.stringify([{ success: true, results: schema ? Array(6).fill({}) : [] }, { success: true, results: [{}, {}] }, { success: true, results: [{}] }]);
    },
    saveSecrets: payload => { assert.equal(payload.WAFFO_CHECKOUT_ENABLED === "true" || payload.WAFFO_CHECKOUT_ENABLED === "false", true); calls.push(`checkout ${payload.WAFFO_CHECKOUT_ENABLED}`); },
    deploy: async input => { assert.equal(input.deploy, true); calls.push("deploy"); },
    status: async () => { calls.push("status"); return { enabled: true, environment: "prod", checkoutEnabled: ++reads > 1 && opened }; },
  };
  return { calls, options };
}
test("backup, schema and closed production verification precede enabling checkout", async () => {
  const { calls, options } = fixture();
  await activate(options);
  assert.deepEqual(calls, ["d1 export", "d1 migrations", "d1 execute", "checkout false", "webhook", "deploy", "status", "checkout true", "status"]);
});
test("failed readiness cannot write secrets, migrate or deploy", async () => {
  const { calls, options } = fixture();
  options.readiness = async () => { throw new Error("wrong account"); };
  await assert.rejects(activate(options), /wrong account/);
  assert.deepEqual(calls, []);
});
test("missing database backup blocks migrations and deployment", async () => {
  const { calls, options } = fixture({ backup: false });
  await assert.rejects(activate(options));
  assert.deepEqual(calls, ["d1 export"]);
});
test("incomplete migration cannot open checkout or deploy", async () => {
  const { calls, options } = fixture({ schema: false });
  await assert.rejects(activate(options), /schema is incomplete/);
  assert.deepEqual(calls, ["d1 export", "d1 migrations", "d1 execute"]);
});
test("failed verification of opened checkout closes it again", async () => {
  const { calls, options } = fixture({ opened: false });
  await assert.rejects(activate(options), /activation verification failed/);
  assert.deepEqual(calls.slice(-4), ["status", "checkout true", "status", "checkout false"]);
});
