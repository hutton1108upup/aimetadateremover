"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, ChevronDown, MessageSquare, Send } from "lucide-react";
import { ages, emptyAnswers, hasAnswer, occupations, outcomes, safeFeedbackPath, SURVEY_VERSION, validEmail, type FeedbackAnswers, type FeedbackTrigger } from "@/lib/feedback/model";
import { markFeedbackSubmitted } from "@/lib/feedback/client";

export function FeedbackForm({ trigger, path, onSaved }: { trigger: FeedbackTrigger; path: string; onSaved?: () => void }) {
  const [answers, setAnswers] = useState<FeedbackAnswers>({ ...emptyAnswers });
  const [sending, setSending] = useState(false), [error, setError] = useState(""), [receipt, setReceipt] = useState("");
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const id = useRef("");
  const attempt = useRef<{ signature: string; id: string } | null>(null);
  const locked = useRef(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const isDownload = trigger === "download";
  function update<K extends keyof FeedbackAnswers>(key: K, value: FeedbackAnswers[K]) {
    setAnswers(current => ({ ...current, [key]: value }));
    setError("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    if (!hasAnswer(answers)) { setError("Please answer at least one question. Any one is enough."); return; }
    if ((answers.email && !validEmail(answers.email.trim())) || (answers.contactConsent && !answers.email.trim())) {
      setBackgroundOpen(true);
      setError(answers.email ? "Please enter a valid email address, or leave it empty." : "Add an email address so we can reply, or uncheck the contact option.");
      return;
    }
    const payload = { ...answers, version: SURVEY_VERSION, trigger, path: safeFeedbackPath(path), website: honeypot.current?.value || "" };
    const signature = JSON.stringify(payload);
    if (!attempt.current || attempt.current.signature !== signature) attempt.current = { signature, id: crypto.randomUUID() };
    id.current = attempt.current.id;
    locked.current = true; setSending(true); setError("");
    try {
      const result = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, id: id.current }), signal: AbortSignal.timeout(15000) });
      const data = await result.json() as { error?: string; received?: boolean; id?: string; reference?: string };
      if (!result.ok || !data.received || data.id !== id.current) {
        const reference = typeof data.reference === "string" && /^[0-9a-f-]{36}$/i.test(data.reference) ? ` Reference: ${data.reference}` : "";
        throw new Error((data.error || "We could not save your feedback. Please try again.") + reference);
      }
      markFeedbackSubmitted(); setReceipt(data.id); onSaved?.();
    } catch (cause) {
      setError(cause instanceof Error && !["TimeoutError", "AbortError", "TypeError"].includes(cause.name) ? cause.message : "We could not confirm your submission. Your answers are still here. Please try again.");
    } finally { locked.current = false; setSending(false); }
  }
  if (receipt) return <div className="feedback-thanks" role="status">
    <span className="feedback-icon"><Check aria-hidden="true" /></span>
    <h2>Thank you. Your feedback is received.</h2>
    <p>Your experience helps us decide what to improve next.</p>
    {answers.contactConsent && answers.email && <p>You have given us permission to reply about this feedback.</p>}
    <small>Reference: {receipt}</small>
  </div>;
  const prompt = isDownload
    ? answers.outcome === "solved" ? "What are you planning to use these images for?"
      : ["partial", "unsolved"].includes(answers.outcome) ? "What were you trying to do, and what is still unresolved?"
        : "What result were you hoping for? What are you unsure about?"
    : trigger === "error" ? "What were you trying to do, and where did you get stuck?" : "What are you hoping to do with this tool today?";
  return <form className="feedback-form" onSubmit={submit} noValidate aria-describedby="feedback-intro" data-clarity-mask="true">
    <header className="feedback-heading"><span className="feedback-icon"><MessageSquare aria-hidden="true" /></span><div><p className="feedback-kicker">Help shape AI Metadata Remover</p><h2>Tell us what you need</h2></div></header>
    <p id="feedback-intro" className="feedback-intro">Every question is optional. One answer is enough — no account needed.</p>
    <fieldset disabled={sending} className="feedback-fields">
      {isDownload && <fieldset className="feedback-outcomes"><legend>Did this tool help you solve your problem?</legend><div>
        {Object.entries(outcomes).map(([value, label]) => <label key={value} className={answers.outcome === value ? "selected" : ""}><input type="radio" name="feedback-outcome" value={value} checked={answers.outcome === value} onChange={() => update("outcome", value as FeedbackAnswers["outcome"])} />{label}</label>)}
      </div>{answers.outcome && <button type="button" className="feedback-text-button" onClick={() => update("outcome", "")}>Clear selection</button>}</fieldset>}
      <label className="feedback-label" htmlFor="feedback-need">{prompt}<span>Optional</span></label>
      <textarea id="feedback-need" rows={3} maxLength={2000} value={answers.need} onChange={event => update("need", event.target.value)} placeholder="A little context helps. Tell us about your task or what got in the way." />
      <details className="feedback-background" open={backgroundOpen} onToggle={event => setBackgroundOpen(event.currentTarget.open)}>
        <summary>More about you &amp; other suggestions <span>Optional <ChevronDown aria-hidden="true" /></span></summary>
        <div className="feedback-background-body">
          <p>This helps us understand whose needs we can serve better. Share only what you are comfortable with.</p>
          <div className="feedback-demographics"><label>Occupation or main role<select value={answers.occupation} onChange={event => update("occupation", event.target.value as FeedbackAnswers["occupation"])}><option value="">Prefer not to say</option>{Object.entries(occupations).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label>Age range<select value={answers.age} onChange={event => update("age", event.target.value as FeedbackAnswers["age"])}><option value="">Prefer not to say</option>{ages.map(age => <option key={age}>{age}</option>)}</select></label></div>
          {answers.occupation === "other" && <label>Your role<input maxLength={100} value={answers.otherOccupation} onChange={event => update("otherOccupation", event.target.value)} /></label>}
          <label>Anything else we could improve?<textarea rows={2} maxLength={2000} value={answers.suggestion} onChange={event => update("suggestion", event.target.value)} placeholder="An idea, a missing feature, or something that felt confusing." /></label>
          <label>Email for a possible follow-up<input type="email" autoComplete="email" maxLength={254} value={answers.email} onChange={event => update("email", event.target.value)} placeholder="you@example.com" /></label>
          <label className="feedback-consent"><input type="checkbox" checked={answers.contactConsent} onChange={event => update("contactConsent", event.target.checked)} /><span>You may email me to better understand this feedback. No marketing subscription.</span></label>
        </div>
      </details>
      <div className="feedback-honeypot" aria-hidden="true"><label>Leave this empty<input name="website" tabIndex={-1} autoComplete="off" ref={honeypot} /></label></div>
    </fieldset>
    <div className="feedback-submit">
      {error && <p className="feedback-error" role="alert">{error}</p>}
      <button type="submit" className="button primary wide" disabled={sending}><Send aria-hidden="true" />{sending ? "Sending feedback…" : "Submit feedback"}</button>
      <p>Only submitted answers and basic page context go to the site operator for product improvement. Images and filenames are not attached. <Link href="/privacy#feedback" target="_blank" rel="noopener">Privacy details</Link></p>
    </div>
  </form>;
}
