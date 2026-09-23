import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifyWebhook, type WebhookEventData } from "@waffo/pancake-ts";
import { billingConfig, type BillingEnvironment } from "@/lib/billing/config";
import { failure, json, limitedText } from "@/lib/billing/http";
import { synchronizeOrder } from "@/lib/billing/store";
import { webhookReceiptKey } from "@/lib/billing/events";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
  try {
    const {env}=await getCloudflareContext({async:true}); const bindings=env as CloudflareEnv & BillingEnvironment;
    const config=billingConfig(bindings); if (!config.ready) return json({error:"Webhook unavailable"},503);
    const raw=await limitedText(request,65536);
    let event;
    try { event=verifyWebhook<WebhookEventData>(raw,request.headers.get("x-waffo-signature"),{environment:config.environment}); }
    catch {return json({error:"Invalid signature"},401);}
    if (event.mode!==config.environment || event.storeId!==config.storeId) return json({error:"Wrong webhook environment or store"},403);
    const db=bindings.AUTH_DB.withSession("first-primary");
    const receiptKey=await webhookReceiptKey(raw);
    if (await db.prepare("SELECT event_id FROM billing_event WHERE environment=? AND event_id=?").bind(config.environment,receiptKey).first()) return json({received:true});
    if (!event.eventType.startsWith("subscription.") && !event.eventType.startsWith("refund.")) return json({received:true,ignored:true});
    if (typeof event.data.orderId!=="string") return json({error:"Order ID required"},400);
    const reference=event.data.orderMerchantExternalId || event.data.orderMetadata?.checkoutId || "";
    const known=await db.prepare("SELECT id FROM billing_checkout WHERE environment=? AND (id=? OR provider_order_id=?)").bind(config.environment,reference,event.data.orderId).first();
    if(!known)return json({received:true,ignored:true});
    await synchronizeOrder(db,config,event.data.orderId);
    await db.prepare("INSERT OR IGNORE INTO billing_event(environment,event_id,event_type,order_id,received_at) VALUES(?,?,?,?,?)").bind(config.environment,receiptKey,event.eventType,event.data.orderId,Date.now()).run();
    return json({received:true});
  } catch(error) {return failure(error);}
}
