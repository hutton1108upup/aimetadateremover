import { billingRuntime } from "@/lib/billing/runtime";
import { BillingError, bodyJson, failure, json, sameOrigin } from "@/lib/billing/http";
import { finishUsage, guestIdentity, reserveUsage } from "@/lib/billing/usage";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
  try {
    const {env,config,db,user}=await billingRuntime(request);sameOrigin(request,config.baseURL);
    if (!config.meteringEnabled) return json({bypass:true});
    const body=await bodyJson(request);
    if(Object.keys(body).some(key=>!["id","action","kind"].includes(key)))throw new BillingError(400,"INVALID_TASK","Only a task reference and usage action are accepted.");
    if (typeof body.id!=="string" || !/^[a-f0-9-]{36}$/.test(body.id)) throw new BillingError(400,"INVALID_TASK","Invalid task reference.");
    const guest=await guestIdentity(request,env.AUTH_SECRET || "",config.baseURL);
    const identity={userId:user?.id || null,guestId:guest.id};
    let result;
    if (body.action==="reserve" && (body.kind==="single" || body.kind==="batch")) result=await reserveUsage(db,config,identity,body.id,body.kind);
    else if (body.action==="complete" || body.action==="release") result=await finishUsage(db,config,identity,body.id,body.action);
    else throw new BillingError(400,"INVALID_TASK","Invalid task action.");
    return json(result,200,guest.cookie?{"Set-Cookie":guest.cookie}:undefined);
  } catch(error) {return failure(error);}
}
