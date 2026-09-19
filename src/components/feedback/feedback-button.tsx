"use client";
import { openFeedback } from "@/lib/feedback/client";
export function FeedbackButton() {
  return <button type="button" className="feedback-text-button" onClick={() => openFeedback("error")}>Tell us what went wrong</button>;
}
