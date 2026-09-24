// OpenNext's documented custom-worker entry point: preserve its fetch handler
// and exports, and ship feedback recovery with the same website deployment.
import handler from "./.open-next/worker.js";
import { runFeedbackMaintenance } from "./src/lib/feedback/maintenance.ts";
export * from "./.open-next/worker.js";

const worker = {
  fetch: handler.fetch,
  async scheduled(_event, env) {
    await runFeedbackMaintenance(env);
  },
};
export default worker;
