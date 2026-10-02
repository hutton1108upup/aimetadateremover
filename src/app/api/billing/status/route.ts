import { billingRuntime } from "@/lib/billing/runtime";
import { failure, json } from "@/lib/billing/http";
import { refreshAccount, type SubscriptionRow } from "@/lib/billing/store";
import { guestIdentity, usageSummary } from "@/lib/billing/usage";
export const dynamic="force-dynamic";
export async function GET(request:Request) {
  try {
    const {env,config,db,user}=await billingRuntime(request);
    if (!config.meteringEnabled) return json({enabled:false,checkoutEnabled:false,signedIn:!!user});
    let refreshPending=false;
    if (user && config.ready) {try {await refreshAccount(db,config,user.id);} catch {refreshPending=true;}}
    const guest=await guestIdentity(request,env.AUTH_SECRET || "",config.baseURL);
    const summary=await usageSummary(db,config,{userId:user?.id || null,guestId:guest.id});
    const rows=user ? await db.prepare("SELECT order_id,status,period_start,period_end,will_renew,paid,checked_at,plan_id FROM billing_subscription WHERE user_id=? AND environment=? ORDER BY period_end DESC LIMIT 5").bind(user.id,config.environment).all<SubscriptionRow>() : null;
    const offers=user?await db.prepare("SELECT plan_id FROM billing_offer_redemption WHERE environment=? AND user_id=?").bind(config.environment,user.id).all<{plan_id:string}>():null;
    return json({introEligible:{monthly:!offers?.results.some(o=>o.plan_id==="monthly"),yearly:!offers?.results.some(o=>o.plan_id==="yearly")},enabled:true,checkoutEnabled:config.checkoutEnabled,environment:config.environment,signedIn:!!user,refreshPending,activeOrderId:summary.pro?.order_id ?? null,plan:summary.pro?(summary.pro.plan_id==="yearly"?"Pro Yearly":summary.pro.plan_id==="monthly"?"Pro Monthly":"Batch Pro"):user?"Free account":"Guest",planId:summary.pro?.plan_id ?? null,unlimited:summary.unlimited,batchMaxPhotos:summary.batchMaxPhotos,sessionMaxImages:summary.sessionMaxImages,singleRemaining:summary.singleRemaining,singleLimit:summary.singleLimit,batchRemaining:summary.batchRemaining,batchLimit:summary.batchLimit,resetsAt:summary.resetsAt,subscriptions:rows?.results ?? []},200,guest.cookie?{"Set-Cookie":guest.cookie}:undefined);
  } catch(error) {return failure(error);}
}
