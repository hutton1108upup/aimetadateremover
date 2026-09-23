import type { BillingConfig } from "./config";
import { BillingError } from "./http";
import { fetchSubscription, provider, subscriptionSnapshot } from "./provider";

export type BillingDB = D1Database | D1DatabaseSession;
export interface CheckoutRow { id: string; user_id: string; environment: string; buyer_email: string; product_id: string; checkout_url: string | null; expires_at: number; provider_order_id: string | null; created_at: number; state: string }
export interface SubscriptionRow { order_id: string; user_id: string; status: string; period_start: number; period_end: number; will_renew: number; paid: number; checked_at: number }
export async function lock(db: BillingDB, name: string) {
  const token = crypto.randomUUID(), now = Date.now();
  const result = await db.prepare(`INSERT INTO billing_lock(name,token,expires_at) VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at WHERE billing_lock.expires_at < ?`).bind(name,token,now+60000,now).run();
  if (!result.meta.changes) throw new BillingError(409,"BILLING_BUSY","Another billing update is in progress. Please retry shortly.");
  return { name, token, release: () => db.prepare("DELETE FROM billing_lock WHERE name=? AND token=?").bind(name,token).run() };
}
export async function activeSubscription(db: BillingDB, config: BillingConfig, userId: string, now=Date.now()) {
  return db.prepare(`SELECT * FROM billing_subscription WHERE user_id=? AND environment=? AND paid=1 AND status IN ('active','canceling') AND period_start<=? AND period_end>? ORDER BY period_end DESC LIMIT 1`).bind(userId,config.environment,now,now).first<SubscriptionRow>();
}
export async function synchronizeOrder(db: BillingDB, config: BillingConfig, orderId: string) {
  const lease = await lock(db,`${config.environment}:order:${orderId}`);
  try {
    const order = await fetchSubscription(config,orderId);
    // Other products in the same merchant store have separate integrations.
    if (order.subscriptionProduct.id !== config.productId) return null;
    const snapshot = subscriptionSnapshot(order,config);
    const checkout = await db.prepare("SELECT * FROM billing_checkout WHERE id=? AND environment=? AND product_id=?").bind(order.orderMerchantExternalId,config.environment,config.productId).first<CheckoutRow>();
    if (!checkout || order.merchantProvidedBuyerIdentity !== checkout.user_id || (checkout.provider_order_id && checkout.provider_order_id !== order.id)) throw new Error("Order ownership verification failed");
    const now = Date.now();
    const result = await db.batch([
      db.prepare(`UPDATE billing_checkout SET provider_order_id=?,state=? WHERE id=? AND EXISTS(SELECT 1 FROM billing_lock WHERE name=? AND token=? AND expires_at>?)`).bind(order.id,order.status,checkout.id,lease.name,lease.token,now),
      db.prepare(`INSERT INTO billing_subscription(environment,order_id,user_id,checkout_id,status,period_start,period_end,will_renew,paid,checked_at)
        SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM billing_lock WHERE name=? AND token=? AND expires_at>?)
        ON CONFLICT(environment,order_id) DO UPDATE SET status=excluded.status,period_start=excluded.period_start,period_end=excluded.period_end,will_renew=excluded.will_renew,paid=excluded.paid,checked_at=excluded.checked_at`)
        .bind(config.environment,order.id,checkout.user_id,checkout.id,snapshot.status,snapshot.start,snapshot.end,Number(snapshot.willRenew),Number(snapshot.paid),now,lease.name,lease.token,now),
    ]);
    if (!result[1].meta.changes) throw new Error("Order verification lease expired");
    return { order, snapshot, userId: checkout.user_id };
  } finally { await lease.release(); }
}
export async function checkoutOrders(config: BillingConfig, checkoutId: string) {
  const result = await provider(config).graphql.query<{subscriptionOrders: {id:string;status:string}[]}>({ query: `query($store:String!,$external:String!){subscriptionOrders(storeId:$store,filter:{orderMerchantExternalId:{eq:$external}},limit:10){id status}}`, variables: {store:config.storeId,external:checkoutId} });
  if (result.errors?.length || !result.data) throw new Error("Order lookup unavailable");
  return result.data.subscriptionOrders;
}
export async function refreshAccount(db: BillingDB, config: BillingConfig, userId: string) {
  const rows = await db.prepare("SELECT * FROM billing_checkout WHERE user_id=? AND environment=? ORDER BY created_at DESC LIMIT 5").bind(userId,config.environment).all<CheckoutRow>();
  for (const row of rows.results) {
    if (row.provider_order_id) {
      const stored = await db.prepare("SELECT checked_at,status FROM billing_subscription WHERE environment=? AND order_id=?").bind(config.environment,row.provider_order_id).first<{checked_at:number;status:string}>();
      if (stored && Date.now()-stored.checked_at<30000) continue;
      if (stored && ["canceled","expired","closed"].includes(stored.status)) continue;
      await synchronizeOrder(db,config,row.provider_order_id);
    } else if (Date.now()-row.created_at<86400000) {
      for (const order of await checkoutOrders(config,row.id)) await synchronizeOrder(db,config,order.id);
    }
  }
}
