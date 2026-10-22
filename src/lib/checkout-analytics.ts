import { trackFunnel } from "./funnel";

type CheckoutStatus = {
  enabled: boolean; signedIn: boolean; environment?: string; refreshPending?: boolean; activeOrderId?: string | null;
  subscriptions?: Array<{ order_id: string; plan_id: string; paid: number; period_end: number }>;
};
const observed = new Set<string>();
const markerKey = "amr:confirmed-checkout-return";

// A verified paid return, not a purchase/revenue event or a new-customer count.
export function trackPaidCheckoutReturn(status: CheckoutStatus) {
  if (typeof window === "undefined" || !status.enabled || !status.signedIn || status.environment !== "prod" || status.refreshPending) return;
  if (window.location.pathname !== "/account/billing" || new URLSearchParams(window.location.search).get("checkout") !== "return") return;
  const current = status.subscriptions?.find(item => item.order_id === status.activeOrderId);
  if (!current || current.paid !== 1 || current.period_end <= Date.now() || !["monthly", "yearly"].includes(current.plan_id)) return;
  // Keep no order IDs in analytics or browser storage. Plan/expiry is a tab-local deduplication marker.
  const marker = `${current.plan_id}:${current.period_end}`;
  if (observed.has(marker)) return;
  try {
    if (window.sessionStorage.getItem(markerKey) === marker) return;
    window.sessionStorage.setItem(markerKey, marker);
  } catch {
    // When storage is blocked, in-memory deduplication still covers this page lifetime.
  }
  observed.add(marker);
  trackFunnel("paid_checkout_return", { plan: current.plan_id });
}
