import { WaffoPancake } from "@waffo/pancake-ts";
import { planForProduct,planDetails } from "./plans";
import type { BillingConfig } from "./config";

export function requestKey(action:string,id:string) {
  const key=`${action}-${id}`;
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(key)) throw new Error("Invalid local idempotency key");
  return {idempotencyKey:key};
}
let clientCache:{merchantId:string;privateKey:string;environment:string;client:WaffoPancake}|undefined;
export function provider(config: BillingConfig) {
  if(clientCache?.merchantId===config.merchantId && clientCache.privateKey===config.privateKey && clientCache.environment===config.environment)return clientCache.client;
  const client=new WaffoPancake({ merchantId: config.merchantId, privateKey: config.privateKey, environment: config.environment,
    fetch: async (url, init) => {
      const headers = new Headers(init?.headers);
      // workerd supports manual/follow, but not the browser's redirect:"error".
      // Reject redirects ourselves so signed credentials never follow another host.
      const response=await fetch(url, { ...init, headers, redirect: "manual", signal: AbortSignal.timeout(20000) });
      if(response.status>=300 && response.status<400)throw new Error("Payment API redirect rejected");
      return response;
    },
  });
  // Cache the stateless merchant SDK, never a buyer token, order or response.
  // Rotation or environment changes invalidate it; the SDK still signs each call.
  clientCache={merchantId:config.merchantId,privateKey:config.privateKey,environment:config.environment,client};
  return client;
}
export interface ProviderSubscription {
  id: string; storeId: string; buyerEmail: string; status: string; testMode: boolean;
  orderMerchantExternalId: string | null; merchantProvidedBuyerIdentity:string|null; isInTrial: boolean; willRenew: boolean;
  currentPeriodStart: string | null; currentPeriodEnd: string | null; currentPeriodNumber: number;
  currency: string; billingPeriod: string; subscriptionProduct: { id: string };
  priceSnapshot: { specialPhaseDays?:number|null; specialPhase?:{subtotal:string}|null; regularPhase: { subtotal: string } };
  payments: { id: string; status: string; testMode: boolean; periodNumber: number | null; isFullyRefunded: boolean; snapshotAmountDetails: { currency: string; subtotal: string } }[];
}
export async function fetchSubscription(config: BillingConfig, id: string) {
  const result = await provider(config).graphql.query<{ subscriptionOrder: ProviderSubscription | null }>({
    query: `query($id:String!){subscriptionOrder(id:$id){id storeId buyerEmail status testMode orderMerchantExternalId merchantProvidedBuyerIdentity isInTrial willRenew currency billingPeriod currentPeriodStart currentPeriodEnd currentPeriodNumber subscriptionProduct{id} priceSnapshot{regularPhase{subtotal} specialPhase{subtotal} specialPhaseDays} payments{id status testMode periodNumber isFullyRefunded snapshotAmountDetails{currency subtotal}}}}`, variables: { id },
  });
  if (result.errors?.length || !result.data?.subscriptionOrder) throw new Error("Provider verification unavailable");
  return result.data.subscriptionOrder;
}
export function subscriptionSnapshot(order: ProviderSubscription, config: Pick<BillingConfig,"environment"|"storeId"|"productId"|"monthlyProductId"|"yearlyProductId">, now = Date.now()) {
  const planId=planForProduct(config,order.subscriptionProduct.id);
  const plan=planId && planId!=="legacy" ? planDetails(planId) : null;
  const amount=plan?.amount ?? "4.99";
  const hasIntro=!!order.priceSnapshot.specialPhase;
  if(hasIntro && (!plan || order.priceSnapshot.specialPhaseDays!==plan.introDays || Number(order.priceSnapshot.specialPhase!.subtotal)!==Number(plan.introAmount)))throw new Error("Invalid introductory price");
  if(order.isInTrial && !hasIntro)throw new Error("Unverified trial price");
  if (order.storeId !== config.storeId || order.testMode !== (config.environment === "test") || !planId || order.currency !== "USD" || order.billingPeriod !== (planId==="yearly"?"yearly":"monthly") || Number(order.priceSnapshot.regularPhase.subtotal) !== Number(amount)) throw new Error("Subscription does not match this plan");
  const start = Date.parse(order.currentPeriodStart || ""), end = Date.parse(order.currentPeriodEnd || "");
  // Waffo clears isInTrial on cancellation although the paid introductory period continues.
  const introductoryPeriod=hasIntro && order.currentPeriodNumber===1;
  const paid = order.payments.some(payment => payment.periodNumber === order.currentPeriodNumber && payment.status === "succeeded" && payment.testMode === order.testMode && !payment.isFullyRefunded && payment.snapshotAmountDetails.currency === "USD" && Number(payment.snapshotAmountDetails.subtotal) === Number(introductoryPeriod ? plan!.introAmount : amount));
  const validPeriod = Number.isFinite(start) && Number.isFinite(end) && end > start;
  return { planId:planId!, hasIntro, status: order.status, start: validPeriod ? start : 0, end: validPeriod ? end : 0, paid,
    active: paid && validPeriod && start <= now && now < end && ["active","trialing","canceling"].includes(order.status), willRenew: order.willRenew };
}

export function canReplaceSubscription(order:ProviderSubscription) {
  if(["canceled","closed","expired"].includes(order.status))return true;
  const payments=order.payments.filter(p=>p.status==="succeeded");
  return !order.willRenew && payments.length>0 && payments.every(p=>p.isFullyRefunded);
}
