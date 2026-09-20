import { occupations, outcomes, parseSubmission, validEmail, type FeedbackSubmission } from "./model";
import { supportEmail } from "../contact";
import { classifyStorageFailure, feedbackFailure } from "./diagnostics";

export interface FeedbackEnvironment {
  AUTH_DB: D1Database;
  AUTH_SECRET?: string;
  FEEDBACK_RATE_SECRET?: string;
  RESEND_API_KEY?: string;
  FEEDBACK_FROM?: string;
  FEEDBACK_TO?: string;
}
interface FeedbackRow {
  id: string; payload: string; payload_hash: string; created_at: number;
  status: "pending" | "sending" | "sent" | "failed";
  attempts: number; first_attempt_at: number | null; next_attempt_at: number;
}
function response(data: object, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
async function digest(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), b => b.toString(16).padStart(2, "0")).join("");
}
async function readLimitedJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Empty body");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 16000) { await reader.cancel(); throw new Error("Body too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

// Only explicit submissions reach the network. The input schema rejects extra fields.
export async function submitFeedback(request: Request, env: FeedbackEnvironment) {
  const url = new URL(request.url);
  const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
  let originAllowed = request.headers.get("origin") === url.origin;
  // Next dev can normalize 127.0.0.1 to localhost internally. Only permit this
  // alias on loopback, with the same protocol and port; never trust forwarded hosts.
  try {
    const origin = new URL(request.headers.get("origin") || "");
    originAllowed ||= loopback.has(url.hostname) && loopback.has(origin.hostname) && origin.port === url.port && origin.protocol === url.protocol;
  } catch { /* A missing or invalid Origin is rejected below. */ }
  if (!originAllowed || request.headers.get("sec-fetch-site") === "cross-site") return response({ error: "Please submit from this website." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return response({ error: "Please use the feedback form." }, 415);
  if (Number(request.headers.get("content-length")) > 16000) return response({ error: "Your feedback is too long." }, 413);
  let submission: FeedbackSubmission;
  try { submission = parseSubmission(await readLimitedJson(request)); }
  catch (error) {
    if (error instanceof Error && error.message === "Body too large") return response({ error: "Your feedback is too long." }, 413);
    return response({ error: error instanceof SyntaxError ? "Please check your answers." : error instanceof Error ? error.message : "Please check your answers." }, 400);
  }
  const local = loopback.has(url.hostname);
  const secret = env.FEEDBACK_RATE_SECRET || env.AUTH_SECRET || (local ? "local-feedback-only" : "");
  if (!env.AUTH_DB || !secret) return feedbackFailure("FEEDBACK_RUNTIME_UNAVAILABLE", request);
  try {
    const db = env.AUTH_DB.withSession("first-primary");
    const now = Date.now(), payload = JSON.stringify(submission), hash = await digest(payload);
    // Daily rotating pseudonymous anti-abuse key; no IP address is stored in feedback.
    const rateKey = await digest(`${secret}:${Math.floor(now / 86400000)}:${request.headers.get("cf-connecting-ip") || "local-or-unknown"}`);
    const existing = await db.prepare("SELECT payload_hash FROM feedback_submission WHERE id = ?").bind(submission.id).first<{ payload_hash: string }>();
    if (existing) return existing.payload_hash === hash ? response({ id: submission.id, received: true }) : response({ error: "This submission has already been saved. Reopen the form to send new feedback." }, 409);
    // A single conditional INSERT makes the rate limit atomic under concurrent requests.
    const saved = await db.prepare(`INSERT OR IGNORE INTO feedback_submission (id,payload,payload_hash,rate_key,created_at,next_attempt_at)
      SELECT ?,?,?,?,?,? WHERE
      (SELECT COUNT(*) FROM feedback_submission WHERE rate_key = ? AND created_at > ?) < 5
      AND (SELECT COUNT(*) FROM feedback_submission WHERE created_at > ?) < 100`)
      .bind(submission.id, payload, hash, rateKey, now, now, rateKey, now - 3600000, now - 3600000).run();
    if (!saved.meta.changes) {
      const duplicate = await db.prepare("SELECT payload_hash FROM feedback_submission WHERE id = ?").bind(submission.id).first<{ payload_hash: string }>();
      if (duplicate) return duplicate.payload_hash === hash ? response({ id: submission.id, received: true }) : response({ error: "This submission has already been saved. Reopen the form to send new feedback." }, 409);
      return response({ error: "We have received several responses recently. Please try again in an hour." }, 429);
    }
    return response({ id: submission.id, received: true }, 201);
  } catch (error) {
    return feedbackFailure(classifyStorageFailure(error), request);
  }
}

export function feedbackEmail(submission: FeedbackSubmission, createdAt: number) {
  const outcome = submission.outcome ? outcomes[submission.outcome] : "Not answered";
  const occupation = submission.occupation ? occupations[submission.occupation] : "Not answered";
  const lines = [
    "New ImageFinisher feedback", "",
    `Result: ${outcome}`, `Need / obstacle: ${submission.need || "Not answered"}`,
    `Occupation: ${occupation}`, `Other occupation: ${submission.otherOccupation || "Not answered"}`,
    `Age range: ${submission.age || "Not answered"}`, `Suggestion: ${submission.suggestion || "Not answered"}`,
    `Email: ${submission.email || "Not provided"}`, `Permission to reply about this feedback: ${submission.contactConsent ? "Yes" : "No"}`,
    "", `Page: ${submission.path}`, `Trigger: ${submission.trigger}`, `Survey: ${submission.version}`,
    `Submitted (UTC): ${new Date(createdAt).toISOString()}`, `Reference: ${submission.id}`,
    "", "Only the visitor's submitted answers are included. No image data or filenames are attached.",
  ];
  return { subject: `[Website feedback][${outcome}][${occupation}]${submission.contactConsent ? " Follow-up welcome" : ""}`, text: lines.join("\n") };
}

// Also called by a scheduled Worker: retries do not depend on the visitor staying online.
export function feedbackMailConfigured(env: FeedbackEnvironment): boolean {
  return Boolean(env.RESEND_API_KEY?.trim() && env.FEEDBACK_FROM && validEmail(env.FEEDBACK_FROM) && validEmail(env.FEEDBACK_TO || supportEmail));
}
export async function deliverFeedback(env: FeedbackEnvironment, max = 1, send: typeof fetch = fetch) {
  if (!feedbackMailConfigured(env)) return { sent: 0, configured: false };
  let sent = 0;
  for (let i = 0; i < max; i++) {
    const now = Date.now();
    const row = await env.AUTH_DB.prepare(`UPDATE feedback_submission SET status='sending', attempts=attempts+1,
      first_attempt_at=COALESCE(first_attempt_at, ?), next_attempt_at=?
      WHERE id=(SELECT id FROM feedback_submission WHERE status IN ('pending','sending') AND next_attempt_at<=? ORDER BY created_at LIMIT 1)
      RETURNING *`).bind(now, now + 60000, now).first<FeedbackRow>();
    if (!row) break;
    if (row.attempts > 5 || now - (row.first_attempt_at ?? now) >= 23 * 3600000) {
      await env.AUTH_DB.prepare("UPDATE feedback_submission SET status='failed', last_error='retry_window_exhausted' WHERE id=?").bind(row.id).run();
      continue;
    }
    let providerId: string | undefined, errorCode = "mail_network_error", retryable = true;
    try {
      const submission = parseSubmission(JSON.parse(row.payload));
      const mail = feedbackEmail(submission, row.created_at);
      const result = await send("https://api.resend.com/emails", {
        method: "POST", signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `feedback/${row.id}` },
        body: JSON.stringify({ from: env.FEEDBACK_FROM, to: [env.FEEDBACK_TO || supportEmail], ...mail,
          ...(submission.contactConsent && submission.email ? { reply_to: submission.email } : {}) }),
      });
      if (result.ok) {
        const data = await result.json() as { id?: unknown };
        if (typeof data.id === "string" && data.id) providerId = data.id;
        else errorCode = "mail_invalid_response";
      } else {
        errorCode = `mail_http_${result.status}`;
        retryable = result.status >= 500 || [408, 409, 429].includes(result.status);
      }
    } catch { /* The durable row is retained and retried; never log answers or credentials. */ }
    if (providerId) {
      await env.AUTH_DB.prepare("UPDATE feedback_submission SET status='sent', provider_id=?, last_error=NULL WHERE id=?").bind(providerId, row.id).run();
      sent++;
    } else {
      const delay = [60000, 300000, 1800000, 7200000][Math.min(row.attempts - 1, 3)];
      await env.AUTH_DB.prepare("UPDATE feedback_submission SET status=?, next_attempt_at=?, last_error=? WHERE id=?")
        .bind(retryable && row.attempts < 5 ? "pending" : "failed", Date.now() + delay, errorCode, row.id).run();
      console.error("feedback_delivery_deferred", { code: errorCode });
    }
  }
  return { sent, configured: true };
}
