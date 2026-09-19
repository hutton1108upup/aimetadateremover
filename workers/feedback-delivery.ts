import { deliverFeedback, type FeedbackEnvironment } from "../src/lib/feedback/server";

export default {
  async scheduled(_event: ScheduledController, env: FeedbackEnvironment) {
    // Keep only the most recent 90 days. Inbox copies are managed separately by the operator.
    await env.AUTH_DB.prepare("DELETE FROM feedback_submission WHERE created_at < ?").bind(Date.now() - 90 * 86400000).run();
    const result = await deliverFeedback(env, 20);
    if (!result.configured) throw new Error("feedback_mail_not_configured");
    const failed = await env.AUTH_DB.prepare("SELECT COUNT(*) AS count FROM feedback_submission WHERE status='failed'").first<{ count: number }>();
    if (failed?.count) console.error("feedback_needs_operator_review", { count: failed.count });
  },
} satisfies ExportedHandler<FeedbackEnvironment>;
