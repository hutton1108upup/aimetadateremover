export type FeedbackFailure = "FEEDBACK_SCHEMA_MISSING" | "FEEDBACK_STORAGE_UNAVAILABLE" | "FEEDBACK_RUNTIME_UNAVAILABLE";

export function classifyStorageFailure(error: unknown): FeedbackFailure {
  // Inspect messages only to classify them. Never log raw database errors: they
  // may contain SQL values, user answers or connection details.
  const messages: string[] = [];
  let current = error;
  for (let i = 0; i < 3 && current instanceof Error; i++) {
    messages.push(current.message);
    current = current.cause;
  }
  return /no such (table|column)|has no column named/i.test(messages.join(" ")) ? "FEEDBACK_SCHEMA_MISSING" : "FEEDBACK_STORAGE_UNAVAILABLE";
}

export function feedbackFailure(code: FeedbackFailure, request: Request): Response {
  const reference = crypto.randomUUID();
  const environment = ["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname) ? "local" : "production";
  console.error(JSON.stringify({ event: "feedback_failure", code, reference, environment }));
  return Response.json({
    error: "We could not save your feedback right now. Your answers are still here. Please try again later.",
    code, reference,
  }, { status: 503, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
