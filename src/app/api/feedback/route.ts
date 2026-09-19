import { getCloudflareContext } from "@opennextjs/cloudflare";
import { deliverFeedback, submitFeedback, type FeedbackEnvironment } from "@/lib/feedback/server";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const { env, ctx } = await getCloudflareContext({ async: true });
    const bindings = env as unknown as FeedbackEnvironment;
    const response = await submitFeedback(request, bindings);
    if (response.ok) ctx.waitUntil(deliverFeedback(bindings).catch(() => { console.error("feedback_delivery_unavailable"); }));
    return response;
  } catch {
    return Response.json({ error: "Feedback is temporarily unavailable. Please try again later." }, { status: 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  }
}
