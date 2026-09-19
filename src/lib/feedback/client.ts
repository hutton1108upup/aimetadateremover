import { SURVEY_VERSION, type FeedbackTrigger } from "./model";

export const feedbackEvent = "imagefinisher:feedback-open";
export const processingEvent = "imagefinisher:processing";
export const feedbackKeys = {
  submitted: `imagefinisher:feedback:${SURVEY_VERSION}:submitted`,
  dismissed: `imagefinisher:feedback:${SURVEY_VERSION}:dismissed`,
  session: `imagefinisher:feedback:${SURVEY_VERSION}:session`,
};
const processing = new Set<symbol>();
// All of this state is local. Storage failure must never stop the image tools.
const fallback = new Map<string, string>();
export function readFeedbackStorage(key: string, session = false): string | null {
  try { return (session ? sessionStorage : localStorage).getItem(key) ?? fallback.get(key) ?? null; }
  catch { return fallback.get(key) ?? null; }
}
export function writeFeedbackStorage(key: string, value: string, session = false) {
  fallback.set(key, value);
  try { (session ? sessionStorage : localStorage).setItem(key, value); } catch { /* In-memory cooldown remains available. */ }
}
export function mayInvite(now = Date.now()): boolean {
  const dismissed = Number(readFeedbackStorage(feedbackKeys.dismissed));
  return !readFeedbackStorage(feedbackKeys.submitted) && (!dismissed || now - dismissed >= 7 * 86400000);
}
export function markFeedbackSubmitted() { writeFeedbackStorage(feedbackKeys.submitted, "1"); }
export function markFeedbackDismissed() { writeFeedbackStorage(feedbackKeys.dismissed, String(Date.now())); }
export function setFeedbackProcessing(id: symbol, busy: boolean) {
  if (busy) processing.add(id); else processing.delete(id);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(processingEvent));
}
export function isFeedbackProcessing() { return processing.size > 0; }
export function openFeedback(trigger: FeedbackTrigger = "manual") {
  window.dispatchEvent(new CustomEvent(feedbackEvent, { detail: trigger }));
}
