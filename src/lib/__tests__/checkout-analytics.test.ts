import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/account/billing?checkout=return");
});
const status = () => ({ enabled: true, signedIn: true, environment: "prod", refreshPending: false, activeOrderId: "PRIVATE_ORDER", subscriptions: [{ order_id: "PRIVATE_ORDER", plan_id: "monthly", paid: 1, period_end: Date.now() + 86400000 }] });

describe("verified paid checkout returns", () => {
  it("requires the matching paid active subscription and excludes pending or test results", async () => {
    const { trackPaidCheckoutReturn } = await import("../checkout-analytics");
    const { getFunnelEvents } = await import("../funnel");
    for (const change of [{ environment: "test" }, { refreshPending: true }, { activeOrderId: null }, { signedIn: false }, { enabled: false }, { subscriptions: [] }]) trackPaidCheckoutReturn({ ...status(), ...change });
    trackPaidCheckoutReturn({ ...status(), subscriptions: [{ ...status().subscriptions[0], paid: 0 }] });
    trackPaidCheckoutReturn({ ...status(), subscriptions: [{ ...status().subscriptions[0], period_end: Date.now() - 1 }] });
    expect(getFunnelEvents()).toEqual([]);
    trackPaidCheckoutReturn(status());
    expect(getFunnelEvents()).toHaveLength(1);
    expect(getFunnelEvents()[0]).toMatchObject({ event: "paid_checkout_return", plan: "monthly" });
    expect(JSON.stringify(getFunnelEvents())).not.toContain("PRIVATE_ORDER");
  });

  it("deduplicates refreshes and reloads within the same tab without storing order IDs", async () => {
    const value = status();
    const first = await import("../checkout-analytics");
    const events = await import("../funnel");
    first.trackPaidCheckoutReturn(value); first.trackPaidCheckoutReturn(value);
    expect(events.getFunnelEvents()).toHaveLength(1);
    expect(window.sessionStorage.getItem("amr:confirmed-checkout-return")).not.toContain("PRIVATE_ORDER");
    vi.resetModules();
    const second = await import("../checkout-analytics");
    const secondEvents = await import("../funnel");
    second.trackPaidCheckoutReturn(value);
    expect(secondEvents.getFunnelEvents()).toEqual([]);
  });

  it("does not turn an ordinary billing visit into a paid-return event", async () => {
    const { trackPaidCheckoutReturn } = await import("../checkout-analytics");
    const { getFunnelEvents } = await import("../funnel");
    window.history.replaceState(null, "", "/account/billing");
    trackPaidCheckoutReturn(status());
    expect(getFunnelEvents()).toEqual([]);
  });
});
