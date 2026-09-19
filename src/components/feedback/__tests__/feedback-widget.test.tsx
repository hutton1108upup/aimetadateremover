import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ path: "/workspace", busy: false, allowed: true, storage: new Map<string, string>() }));
vi.mock("next/navigation", () => ({ usePathname: () => state.path }));
vi.mock("@/lib/feedback/client", () => ({
  feedbackEvent: "feedback-open", processingEvent: "processing", feedbackKeys: { session: "session" },
  isFeedbackProcessing: () => state.busy, mayInvite: () => state.allowed,
  markFeedbackDismissed: () => { state.allowed = false; },
  readFeedbackStorage: (key: string) => state.storage.get(key),
  writeFeedbackStorage: (key: string, value: string) => state.storage.set(key, value),
}));
import { FeedbackWidget } from "../feedback-widget";
function advance(ms: number) { act(() => vi.advanceTimersByTime(ms)); }
function visibility(value: string) { Object.defineProperty(document, "visibilityState", { configurable: true, value }); act(() => document.dispatchEvent(new Event("visibilitychange"))); }
describe("feedback invitations", () => {
  beforeEach(() => { vi.useFakeTimers(); state.path = "/workspace"; state.busy = false; state.allowed = true; state.storage.clear(); visibility("visible"); });
  afterEach(() => vi.useRealTimers());
  it("accumulates foreground time across routes and excludes background time", () => {
    const { rerender } = render(<FeedbackWidget />);
    advance(30000); visibility("hidden"); advance(90000);
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    visibility("visible"); state.path = "/"; rerender(<FeedbackWidget />); advance(29000);
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    advance(1000); expect(screen.getByText("What brought you here today?")).toBeInTheDocument();
  });
  it("defers while processing and suppresses another invitation after dismissal", () => {
    state.busy = true; render(<FeedbackWidget />); advance(61000);
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    state.busy = false; advance(1000);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    advance(120000); expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(state.allowed).toBe(false);
  });
  it("ignores sample downloads and waits three seconds for a real download", () => {
    render(<FeedbackWidget />);
    act(() => window.dispatchEvent(new CustomEvent("imagefinisher:funnel", { detail: { event: "download", source: "sample" } })));
    advance(4000); expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    act(() => window.dispatchEvent(new CustomEvent("imagefinisher:funnel", { detail: { event: "download", source: "file" } })));
    advance(2000); expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    advance(1000); expect(screen.getByText("Did you get what you needed?")).toBeInTheDocument();
  });
  it("does not auto-invite on privacy pages or after a submission", () => {
    state.path = "/privacy";
    const { rerender } = render(<FeedbackWidget />); advance(70000);
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    state.path = "/"; state.allowed = false; rerender(<FeedbackWidget />); advance(70000);
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
});
