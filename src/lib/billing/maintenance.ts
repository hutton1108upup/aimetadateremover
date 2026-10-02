import { billingConfig,type BillingEnvironment } from "./config";
import { checkoutOrders,synchronizeOrder } from "./store";
export async function runBillingMaintenance(env:BillingEnvironment) {
  // Existing deployments remain safe until the billing migration and rollout are ready.
  if(env.BILLING_METERING_ENABLED!=="true")return;
  const config=billingConfig(env),db=env.AUTH_DB.withSession("first-primary"),now=Date.now();
  await db.batch([
    db.prepare("UPDATE billing_usage SET state='released' WHERE state='reserved' AND expires_at<?").bind(now),
    db.prepare("DELETE FROM billing_usage WHERE created_at<?").bind(now-90*86400000),
    db.prepare("DELETE FROM billing_event WHERE received_at<?").bind(now-90*86400000),
    db.prepare("DELETE FROM billing_lock WHERE expires_at<?").bind(now-86400000),
    db.prepare("UPDATE billing_checkout SET checkout_url=NULL WHERE expires_at<? AND checkout_url IS NOT NULL").bind(now),
    db.prepare("DELETE FROM billing_subscription WHERE status IN ('canceled','closed','expired') AND period_end<? AND checkout_id IN (SELECT id FROM billing_checkout WHERE retention_hold=0 AND created_at<?)").bind(now-730*86400000,now-730*86400000),
    db.prepare("DELETE FROM billing_checkout WHERE retention_hold=0 AND created_at<? AND id NOT IN (SELECT checkout_id FROM billing_subscription)").bind(now-730*86400000),
  ]);
  if(!config.ready)return;
  const pending=await db.prepare("SELECT id FROM billing_checkout WHERE environment=? AND provider_order_id IS NULL AND created_at>? ORDER BY created_at LIMIT 5").bind(config.environment,now-86400000).all<{id:string}>();
  for(const checkout of pending.results){for(const order of await checkoutOrders(config,checkout.id))await synchronizeOrder(db,config,order.id);}
  const rows=await db.prepare("SELECT order_id FROM billing_subscription WHERE environment=? AND status NOT IN ('canceled','closed','expired') AND checked_at<? ORDER BY checked_at LIMIT 20").bind(config.environment,now-5*60000).all<{order_id:string}>();
  let failed=0;
  for(const row of rows.results){try{await synchronizeOrder(db,config,row.order_id);}catch{failed++;}}
  console.info(JSON.stringify({event:"billing_reconciliation",checked:rows.results.length,failed}));
  if(failed)throw new Error("billing_reconciliation_needs_retry");
}
