import { deliverFeedback, feedbackMailConfigured, type FeedbackEnvironment } from "./server";

export async function runFeedbackMaintenance(env: FeedbackEnvironment) {
  await env.AUTH_DB.prepare("DELETE FROM feedback_submission WHERE created_at < ?").bind(Date.now() - 90 * 86400000).run();
  if (!feedbackMailConfigured(env)) throw new Error("feedback_mail_not_configured");
  const result = await deliverFeedback(env, 20);
  const pending = await env.AUTH_DB.prepare("SELECT COUNT(*) AS count FROM feedback_submission WHERE status IN ('pending','sending')").first<{ count: number }>();
  const failed = await env.AUTH_DB.prepare("SELECT COUNT(*) AS count FROM feedback_submission WHERE status='failed'").first<{ count: number }>();
  console.info(JSON.stringify({ event: "feedback_delivery_summary", accepted: result.sent, pending: pending?.count ?? 0, failed: failed?.count ?? 0 }));
  if (failed?.count) console.error("feedback_needs_operator_review", { count: failed.count });
}
