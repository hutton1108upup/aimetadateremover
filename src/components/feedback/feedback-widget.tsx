"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X } from "lucide-react";
import { feedbackEvent, feedbackKeys, isFeedbackProcessing, markFeedbackDismissed, mayInvite, processingEvent, readFeedbackStorage, writeFeedbackStorage } from "@/lib/feedback/client";
import { type FeedbackTrigger } from "@/lib/feedback/model";
import { FeedbackForm } from "./feedback-form";

interface Session { elapsed: number; invited: boolean; downloaded: boolean }
function readSession(): Session {
  try {
    const value = JSON.parse(readFeedbackStorage(feedbackKeys.session, true) || "{}");
    return { elapsed: typeof value.elapsed === "number" && Number.isFinite(value.elapsed) ? Math.max(0, Math.min(value.elapsed, 60000)) : 0, invited: value.invited === true, downloaded: value.downloaded === true };
  } catch { return { elapsed: 0, invited: false, downloaded: false }; }
}
function eligible(path: string) { return !/^\/(auth|account|privacy|terms|feedback|api)(\/|$)/.test(path); }
export function FeedbackWidget() {
  const path = usePathname();
  const pathRef = useRef(path);
  useEffect(() => { pathRef.current = path; }, [path]);
  const [processingBusy, setProcessingBusy] = useState(false);
  const [invitation, setInvitation] = useState<FeedbackTrigger | null>(null);
  const [context, setContext] = useState<{ trigger: FeedbackTrigger; path: string } | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null), opener = useRef<HTMLElement | null>(null);
  const saved = useRef(false), session = useRef<Session>({ elapsed: 0, invited: false, downloaded: false });
  const downloadAt = useRef<number | null>(null);
  const persist = useCallback(() => writeFeedbackStorage(feedbackKeys.session, JSON.stringify(session.current), true), []);
  const showForm = useCallback((trigger: FeedbackTrigger) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    session.current.invited = true; persist(); setInvitation(null);
    if (saved.current) { setFormVersion(v => v + 1); saved.current = false; }
    // A closed, unsent form keeps its context and draft.
    setContext(current => current && !saved.current && dialog.current?.querySelector("form") ? current : { trigger, path: pathRef.current });
    dialog.current?.showModal();
  }, [persist]);
  useEffect(() => {
    session.current = readSession();
    let last = performance.now();
    const save = () => persist();
    const visibility = () => { last = performance.now(); persist(); };
    const tick = () => {
      const now = performance.now(), delta = Math.min(now - last, 2000); last = now;
      if (document.visibilityState !== "visible" || !eligible(pathRef.current)) return;
      session.current.elapsed = Math.min(60000, session.current.elapsed + delta);
      persist();
      if (session.current.invited || !mayInvite() || isFeedbackProcessing() || dialog.current?.open) return;
      // Avoid covering a form, menu, or another modal the visitor is using.
      if (document.querySelector("dialog[open]") || document.activeElement?.matches("input,textarea,select,[contenteditable=true]")) return;
      const trigger = downloadAt.current !== null ? now >= downloadAt.current ? "download" : null : session.current.elapsed >= 60000 && !session.current.downloaded ? "time" : null;
      if (trigger) { session.current.invited = true; persist(); setInvitation(trigger); }
    };
    const funnel = (event: Event) => {
      const detail = (event as CustomEvent<{ event?: string; source?: string }>).detail;
      if (detail?.event === "download" && detail.source === "file" && !session.current.downloaded) {
        session.current.downloaded = true; downloadAt.current = performance.now() + 3000; persist();
      }
    };
    const manual = (event: Event) => showForm((event as CustomEvent<FeedbackTrigger>).detail === "error" ? "error" : "manual");
    const sync = () => { if (!mayInvite()) setInvitation(null); };
    const processingChanged = () => setProcessingBusy(isFeedbackProcessing());
    const interval = window.setInterval(tick, 1000);
    window.addEventListener("imagefinisher:funnel", funnel);
    window.addEventListener(feedbackEvent, manual);
    window.addEventListener("storage", sync);
    window.addEventListener(processingEvent, processingChanged);
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", visibility);
    return () => { clearInterval(interval); persist(); window.removeEventListener("imagefinisher:funnel", funnel); window.removeEventListener(feedbackEvent, manual); window.removeEventListener("storage", sync); window.removeEventListener(processingEvent, processingChanged); window.removeEventListener("pagehide", save); document.removeEventListener("visibilitychange", visibility); };
  }, [persist, showForm]);
  function close() { if (!saved.current) markFeedbackDismissed(); dialog.current?.close(); opener.current?.focus(); }
  return <>
    {invitation && eligible(path) && !processingBusy && <aside className="feedback-invitation" aria-label="Share your experience">
      <button className="feedback-close" aria-label="Dismiss feedback invitation" onClick={() => { markFeedbackDismissed(); setInvitation(null); }}><X aria-hidden="true" /></button>
      <span className="feedback-kicker"><MessageSquare aria-hidden="true" /> A quick check-in</span>
      <h2>{invitation === "download" ? "Did you get what you needed?" : "What brought you here today?"}</h2>
      <p>Your experience can shape what we improve next. Every question is optional.</p>
      <div><button className="button primary" onClick={() => showForm(invitation)}>Share feedback</button><button className="feedback-text-button" onClick={() => { markFeedbackDismissed(); setInvitation(null); }}>Not now</button></div>
    </aside>}
    <dialog ref={dialog} className="feedback-dialog" aria-label="Share feedback" onCancel={event => { event.preventDefault(); close(); }}>
      <button className="feedback-close" aria-label="Close feedback" onClick={close}><X aria-hidden="true" /></button>
      {context && <FeedbackForm key={formVersion} trigger={context.trigger} path={context.path} onSaved={() => { saved.current = true; }} />}
    </dialog>
  </>;
}
