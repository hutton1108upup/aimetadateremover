import { getCloudflareContext } from "@opennextjs/cloudflare";
import { deliverFeedback, submitFeedback, type FeedbackEnvironment } from "@/lib/feedback/server";
import { feedbackFailure } from "@/lib/feedback/diagnostics";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const { env, ctx } = await getCloudflareContext({ async: true });
    const bindings = env as unknown as FeedbackEnvironment;
    const response = await submitFeedback(request, bindings);
    // Failure to schedule a notification must not turn a durably saved response
    // into an error. The scheduled handler will drain pending rows independently.
    if (response.ok) {
      try { ctx.waitUntil(deliverFeedback(bindings).catch(() => { console.error("feedback_delivery_unavailable"); })); }
      catch { console.error("feedback_schedule_unavailable"); }
    }
    return response;
  } catch {
    return feedbackFailure("FEEDBACK_RUNTIME_UNAVAILABLE", request);
  }
}
