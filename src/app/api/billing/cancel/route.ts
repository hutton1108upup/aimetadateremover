import { billingRuntime, requireUser } from "@/lib/billing/runtime";
import { BillingError, bodyJson, failure, json, sameOrigin } from "@/lib/billing/http";
import { provider,requestKey } from "@/lib/billing/provider";
import { lock, synchronizeOrder } from "@/lib/billing/store";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
  try {
    const {config,db,user:sessionUser}=await billingRuntime(request);
    sameOrigin(request,config.baseURL);const user=requireUser(sessionUser); const body=await bodyJson(request);
    if (body.confirm!==true || typeof body.orderId!=="string") throw new BillingError(400,"CONFIRM_REQUIRED","Confirm cancellation in account billing.");
    const own=await db.prepare("SELECT order_id FROM billing_subscription WHERE environment=? AND user_id=? AND order_id=?").bind(config.environment,user.id,body.orderId).first<{order_id:string}>();
    if (!own) throw new BillingError(404,"NOT_FOUND","Subscription not found.");
    const lease=await lock(db,`${config.environment}:checkout:${user.id}`);
    try {
      let verified=await synchronizeOrder(db,config,own.order_id);
      if(verified?.order.willRenew) {
        // A customer may resume and cancel again on the same day. Reusing an
        // order-level key would replay the previous cancellation for 24 hours.
        await provider(config).orders.cancelSubscription({orderId:own.order_id},requestKey("cancel",crypto.randomUUID()));
        verified=await synchronizeOrder(db,config,own.order_id);
      }
      if (!verified || verified.order.willRenew) throw new Error("Cancellation is not yet confirmed");
      return json({canceled:true,periodEnd:verified.snapshot.end});
    } finally {await lease.release();}
  } catch(error) {return failure(error);}
}
