import { WaffoPancake } from "@waffo/pancake-ts";
import type { BillingConfig } from "./config";

export function requestKey(action:string,id:string) {
  const key=`${action}-${id}`;
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(key)) throw new Error("Invalid local idempotency key");
  return {idempotencyKey:key};
}
export function provider(config: BillingConfig) {
  return new WaffoPancake({ merchantId: config.merchantId, privateKey: config.privateKey, environment: config.environment,
    fetch: async (url, init) => {
      const headers = new Headers(init?.headers);
      // workerd supports manual/follow, but not the browser's redirect:"error".
      // Reject redirects ourselves so signed credentials never follow another host.
      const response=await fetch(url, { ...init, headers, redirect: "manual", signal: AbortSignal.timeout(20000) });
      if(response.status>=300 && response.status<400)throw new Error("Payment API redirect rejected");
      return response;
    },
  });
}
export interface ProviderSubscription {
  id: string; storeId: string; buyerEmail: string; status: string; testMode: boolean;
  orderMerchantExternalId: string | null; merchantProvidedBuyerIdentity:string|null; isInTrial: boolean; willRenew: boolean;
  currentPeriodStart: string | null; currentPeriodEnd: string | null; currentPeriodNumber: number;
  currency: string; billingPeriod: string; subscriptionProduct: { id: string };
  priceSnapshot: { regularPhase: { subtotal: string } };
  payments: { id: string; status: string; testMode: boolean; periodNumber: number | null; isFullyRefunded: boolean; snapshotAmountDetails: { currency: string; subtotal: string } }[];
}
export async function fetchSubscription(config: BillingConfig, id: string) {
  const result = await provider(config).graphql.query<{ subscriptionOrder: ProviderSubscription | null }>({
    query: `query($id:String!){subscriptionOrder(id:$id){id storeId buyerEmail status testMode orderMerchantExternalId merchantProvidedBuyerIdentity isInTrial willRenew currency billingPeriod currentPeriodStart currentPeriodEnd currentPeriodNumber subscriptionProduct{id} priceSnapshot{regularPhase{subtotal}} payments{id status testMode periodNumber isFullyRefunded snapshotAmountDetails{currency subtotal}}}}`, variables: { id },
  });
  if (result.errors?.length || !result.data?.subscriptionOrder) throw new Error("Provider verification unavailable");
  return result.data.subscriptionOrder;
}
export function subscriptionSnapshot(order: ProviderSubscription, config: Pick<BillingConfig,"environment"|"storeId"|"productId">, now = Date.now()) {
  if (order.storeId !== config.storeId || order.testMode !== (config.environment === "test") || order.subscriptionProduct.id !== config.productId || order.currency !== "USD" || order.billingPeriod !== "monthly" || Number(order.priceSnapshot.regularPhase.subtotal) !== 4.99 || order.isInTrial) throw new Error("Subscription does not match this plan");
  const start = Date.parse(order.currentPeriodStart || ""), end = Date.parse(order.currentPeriodEnd || "");
  const paid = order.payments.some(payment => payment.periodNumber === order.currentPeriodNumber && payment.status === "succeeded" && payment.testMode === order.testMode && !payment.isFullyRefunded && payment.snapshotAmountDetails.currency === "USD" && Number(payment.snapshotAmountDetails.subtotal) === 4.99);
  const validPeriod = Number.isFinite(start) && Number.isFinite(end) && end > start;
  return { status: order.status, start: validPeriod ? start : 0, end: validPeriod ? end : 0, paid,
    active: paid && validPeriod && start <= now && now < end && ["active","canceling"].includes(order.status), willRenew: order.willRenew };
}
