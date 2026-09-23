import type { BillingConfig } from "./config";
import { BillingError } from "./http";
import { activeSubscription, type BillingDB } from "./store";

export const utcDay = (now=Date.now()) => new Date(now).toISOString().slice(0,10);
const encoder=new TextEncoder();
async function hmac(secret:string,value:string) {
  const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(value))),b=>b.toString(16).padStart(2,"0")).join("");
}
export async function guestIdentity(request:Request,secret:string,origin:string) {
  if (!secret) throw new Error("Usage signing secret missing");
  const raw=request.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith("if_guest="))?.slice(9);
  const [id,signature]=raw?.split(".") || [];
  if (id && /^[a-f0-9-]{36}$/.test(id) && signature === await hmac(secret,`guest:${id}`)) return {id,cookie:undefined};
  // Fresh-cookie requests from the same public IP/day receive the same identifier.
  // Only the derived identifier is stored; the source IP is not retained here.
  const ip=request.headers.get("cf-connecting-ip");
  const seed=ip ? await hmac(secret,`guest-bootstrap:${utcDay()}:${ip}`) : null;
  const fresh=seed ? `${seed.slice(0,8)}-${seed.slice(8,12)}-${seed.slice(12,16)}-${seed.slice(16,20)}-${seed.slice(20,32)}` : crypto.randomUUID(); const signed=await hmac(secret,`guest:${fresh}`);
  return {id:fresh,cookie:`if_guest=${fresh}.${signed}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${origin.startsWith("https:")?"; Secure":""}`};
}
export interface UsageIdentity { userId: string | null; guestId: string }
// Paid jobs belong only to the account. Sign-in carries over anonymous singles,
// not another signed-in account's work, even when the guest/IP bootstrap matches.
// Signed-out requests still count this browser's singles to prevent logout resets.
const usageScope="(owner_id=? OR (kind='single' AND guest_id=? AND (?=1 OR owner_id=?)))";
export async function usageSummary(db:BillingDB,config:BillingConfig,identity:UsageIdentity) {
  const now=Date.now(),day=utcDay(now),owner=identity.userId || `guest:${identity.guestId}`;
  const pro=identity.userId ? await activeSubscription(db,config,identity.userId,now) : null;
  const rows=await db.prepare(`SELECT kind,COUNT(*) AS used FROM billing_usage WHERE environment=? AND day=? AND ${usageScope} AND (state='consumed' OR (state='reserved' AND expires_at>?)) GROUP BY kind`).bind(config.environment,day,owner,identity.guestId,Number(!identity.userId),`guest:${identity.guestId}`,now).all<{kind:string;used:number}>();
  const singleLimit=identity.userId?3:1,batchLimit=pro?20:0;
  const used=(kind:string)=>rows.results.find(r=>r.kind===kind)?.used || 0;
  return {singleLimit,singleRemaining:Math.max(0,singleLimit-used("single")),batchLimit,batchRemaining:Math.max(0,batchLimit-used("batch")),resetsAt:Date.parse(`${day}T00:00:00Z`)+86400000,pro};
}
export async function reserveUsage(db:BillingDB,config:BillingConfig,identity:UsageIdentity,id:string,kind:"single"|"batch") {
  const now=Date.now(),day=utcDay(now),owner=identity.userId || `guest:${identity.guestId}`;
  const previous=await db.prepare("SELECT owner_id,kind,state,expires_at FROM billing_usage WHERE id=? AND environment=?").bind(id,config.environment).first<{owner_id:string;kind:string;state:string;expires_at:number}>();
  if (previous) {
    if (previous.owner_id!==owner || previous.kind!==kind) throw new BillingError(409,"TASK_CONFLICT","This task belongs to another session.");
    if (previous.state!=="reserved" || previous.expires_at<=now) throw new BillingError(409,"TASK_CLOSED","Start a new cleaning task.");
    return {id,expiresAt:previous.expires_at,allowZip:previous.kind==="batch" || !!(identity.userId && await activeSubscription(db,config,identity.userId))};
  }
  const summary=await usageSummary(db,config,identity);
  if(kind==="single" && summary.singleRemaining===0 && summary.pro)kind="batch";
  if (kind==="batch" && !summary.pro) throw new BillingError(403,"PRO_REQUIRED","Batch cleaning requires Batch Pro. You can inspect these files for free, or clean one image at a time with your daily allowance.");
  const limit=kind==="batch"?summary.batchLimit:summary.singleLimit;
  const expires=now+15*60000;
  const result=await db.prepare(`INSERT OR IGNORE INTO billing_usage(id,owner_id,guest_id,environment,day,kind,state,created_at,expires_at,subscription_order_id)
    SELECT ?,?,?,?,?,?,'reserved',?,?,? WHERE (SELECT COUNT(*) FROM billing_usage WHERE environment=? AND day=? AND kind=? AND ${usageScope} AND (state='consumed' OR (state='reserved' AND expires_at>?))) < ?`)
    .bind(id,owner,identity.guestId,config.environment,day,kind,now,expires,kind==="batch"?summary.pro!.order_id:null,config.environment,day,kind,owner,identity.guestId,Number(!identity.userId),`guest:${identity.guestId}`,now,limit).run();
  if (!result.meta.changes) throw new BillingError(429,"DAILY_LIMIT","Your daily allowance is used or reserved by another task. It resets at 00:00 UTC.");
  return {id,expiresAt:expires,allowZip:!!summary.pro};
}
export async function finishUsage(db:BillingDB,config:BillingConfig,identity:UsageIdentity,id:string,action:"complete"|"release") {
  const owner=identity.userId || `guest:${identity.guestId}`,now=Date.now();
  const row=await db.prepare("SELECT state,expires_at FROM billing_usage WHERE id=? AND environment=? AND owner_id=?").bind(id,config.environment,owner).first<{state:string;expires_at:number}>();
  if (!row) throw new BillingError(404,"TASK_NOT_FOUND","Cleaning reservation not found. Please try again.");
  if (action==="release") {
    await db.prepare("UPDATE billing_usage SET state='released' WHERE id=? AND state='reserved'").bind(id).run();
    return {released:row.state!=="consumed"};
  }
  if (row.state==="consumed") return {completed:true};
  const result=await db.prepare("UPDATE billing_usage SET state='consumed',completed_at=? WHERE id=? AND state='reserved' AND expires_at>?").bind(now,id,now).run();
  if (!result.meta.changes) throw new BillingError(409,"TASK_EXPIRED","This cleaning reservation expired. Please run the task again.");
  return {completed:true};
}
