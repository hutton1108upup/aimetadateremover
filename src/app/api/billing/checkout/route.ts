import { billingRuntime, requireUser } from "@/lib/billing/runtime";
import { consentVersion } from "@/lib/billing/config";
import { BillingError, bodyJson, failure, json, sameOrigin } from "@/lib/billing/http";
import { activeSubscription, checkoutOrders, lock, refreshAccount, synchronizeOrder, type CheckoutRow } from "@/lib/billing/store";
import { provider,requestKey,canReplaceSubscription } from "@/lib/billing/provider";
import { isPlanId,productForPlan } from "@/lib/billing/plans";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
  try {
    const {config,db,user:sessionUser}=await billingRuntime(request);
    sameOrigin(request,config.baseURL); const user=requireUser(sessionUser);
    if (!config.checkoutEnabled) throw new BillingError(503,"CHECKOUT_DISABLED","Subscriptions are not open yet.");
    const body=await bodyJson(request);
    if (body.consent !== consentVersion || !isPlanId(body.plan) || Object.keys(body).length !== 2) throw new BillingError(400,"CONSENT_REQUIRED","Please confirm the selected plan and renewal terms before continuing.");
    const productId=productForPlan(config,body.plan);
    const lease=await lock(db,`${config.environment}:checkout:${user.id}`);
    try {
      await refreshAccount(db,config,user.id);
      if (await activeSubscription(db,config,user.id)) throw new BillingError(409,"ALREADY_SUBSCRIBED","You already have Pro. Manage it in account billing.");
      const previous=await db.prepare("SELECT * FROM billing_checkout WHERE user_id=? AND environment=? ORDER BY created_at DESC LIMIT 1").bind(user.id,config.environment).first<CheckoutRow>();
      let checkout=previous;
      if (previous && (previous.provider_order_id || previous.product_id !== productId || previous.expires_at <= Date.now() || ["canceled","closed","expired"].includes(previous.state))) {
        // Close any unresolved provider order before allowing another checkout.
        for (const order of await checkoutOrders(config,previous.id)) {
          if (order.status === "pending") await provider(config).orders.cancelSubscription({orderId:order.id},requestKey("close",order.id));
          const verified=await synchronizeOrder(db,config,order.id);
          if (verified && !canReplaceSubscription(verified.order)) throw new BillingError(409,"EXISTING_SUBSCRIPTION","An existing subscription still needs attention. Open account billing before purchasing again.");
        }
        checkout=null;
      }
      if (checkout?.checkout_url) return json({url:checkout.checkout_url});
      if (!checkout) {
        const redemption=await db.prepare("SELECT 1 FROM billing_offer_redemption WHERE environment=? AND user_id=? AND plan_id=?").bind(config.environment,user.id,body.plan).first();
        const now=Date.now(); const id=crypto.randomUUID();
        const inserted=await db.prepare("INSERT INTO billing_checkout(id,user_id,environment,product_id,buyer_email,created_at,expires_at,consent_version,plan_id,intro_offer) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM billing_lock WHERE name=? AND token=? AND expires_at>?)").bind(id,user.id,config.environment,productId,user.email,now,now+30*60000,consentVersion,body.plan,Number(!redemption),lease.name,lease.token,now+25000).run();
        if(!inserted.meta.changes)throw new BillingError(409,"BILLING_BUSY","Billing verification took longer than expected. Please retry; no new checkout was created.");
        checkout=await db.prepare("SELECT * FROM billing_checkout WHERE id=?").bind(id).first<CheckoutRow>();
      }
      if (!checkout) throw new Error("Checkout storage unavailable");
      const result=await provider(config).checkout.authenticated.create({productId:checkout.product_id,currency:"USD",withTrial:!!checkout.intro_offer,buyerIdentity:user.id,buyerEmail:checkout.buyer_email,orderMerchantExternalId:checkout.id,metadata:{app:"ai-metadata-remover",checkoutId:checkout.id},successUrl:`${config.baseURL}/account/billing?checkout=return`,expiresInSeconds:900},requestKey("checkout",checkout.id));
      const url=new URL(result.checkoutUrl);
      if (url.protocol!=="https:" || !(url.hostname==="waffo.ai" || url.hostname.endsWith(".waffo.ai"))) throw new Error("Invalid checkout destination");
      const expiresAt=Math.min(Date.parse(result.expiresAt),Date.parse(result.tokenExpiresAt));
      if(!Number.isFinite(expiresAt) || expiresAt<=Date.now())throw new Error("Checkout session already expired");
      await db.prepare("UPDATE billing_checkout SET checkout_url=?,expires_at=? WHERE id=?").bind(url.href,expiresAt,checkout.id).run();
      return json({url:url.href});
    } finally {await lease.release();}
  } catch(error) {return failure(error);}
}
