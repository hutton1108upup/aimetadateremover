// OpenNext's documented custom-worker entry point: preserve its fetch handler
// and exports, and ship feedback recovery with the same website deployment.
import handler from "./.open-next/worker.js";
import { runWithCloudflareRequestContext } from "./.open-next/cloudflare/init.js";
import { handleWorkerApi } from "./src/lib/worker-api.ts";
import { runFeedbackMaintenance } from "./src/lib/feedback/maintenance.ts";
import { runBillingMaintenance } from "./src/lib/billing/maintenance.ts";
export * from "./.open-next/worker.js";

const worker = {
  async fetch(request, env, ctx) {
    const direct = await runWithCloudflareRequestContext(request, env, ctx, () => handleWorkerApi(request));
    const response = direct ?? await handler.fetch(request, env, ctx);
    if (env.WAFFO_ENVIRONMENT !== "test") return response;
    const result = new Response(response.body, response);
    result.headers.set("X-Robots-Tag", "noindex, nofollow");
    return result;
  },
  async scheduled(_event, env) {
    const results = await Promise.allSettled([runFeedbackMaintenance(env), runBillingMaintenance(env)]);
    if (results.some(result => result.status === "rejected")) throw new Error("scheduled_maintenance_needs_retry");
  },
};
export default worker;
