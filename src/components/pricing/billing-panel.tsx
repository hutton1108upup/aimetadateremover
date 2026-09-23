"use client";
import Link from "next/link";
import { useCallback,useEffect,useRef,useState } from "react";
import { consentVersion } from "@/lib/billing/config";
import { SupportContact } from "@/components/layout/support-contact";
type Subscription={order_id:string;status:string;period_end:number;will_renew:number;paid:number};
type Status={enabled:boolean;checkoutEnabled:boolean;signedIn:boolean;environment?:string;plan?:string;singleRemaining?:number;singleLimit?:number;batchRemaining?:number;batchLimit?:number;resetsAt?:number;refreshPending?:boolean;activeOrderId?:string|null;subscriptions?:Subscription[]};
const date=(value:number)=>new Date(value).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"});
export function BillingPanel({compact=false}:{compact?:boolean}) {
  const [status,setStatus]=useState<Status|null>(null),[error,setError]=useState("");
  const [busy,setBusy]=useState(false),[consent,setConsent]=useState(false),[cancelId,setCancelId]=useState<string|null>(null);
  const refreshVersion=useRef<symbol|null>(null);
  const refresh=useCallback(async()=>{
    const version=Symbol("billing-refresh");refreshVersion.current=version;
    try {const response=await fetch("/api/billing/status",{cache:"no-store"});if(!response.ok)throw new Error("Billing is temporarily unavailable. Please retry.");const data=await response.json() as Status;if(version!==refreshVersion.current)return;setStatus(data);setError("");}
    catch(error){if(version===refreshVersion.current)setError(error instanceof Error?error.message:"Billing is unavailable.");}
  },[]);
  useEffect(()=>{queueMicrotask(()=>void refresh());const listener=()=>void refresh();window.addEventListener("focus",listener);window.addEventListener("imagefinisher:usage-changed",listener);const timer=setInterval(listener,30000);return()=>{refreshVersion.current=null;clearInterval(timer);window.removeEventListener("focus",listener);window.removeEventListener("imagefinisher:usage-changed",listener);};},[refresh]);
  async function checkout(){
    if(!consent || busy)return;setBusy(true);setError("");
    try {const response=await fetch("/api/billing/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({consent:consentVersion})});const result=await response.json() as {error?:string;url:string};if(!response.ok)throw new Error(result.error);window.location.assign(result.url);}
    catch(error){setError(error instanceof Error?error.message:"Checkout is unavailable.");setBusy(false);}
  }
  async function cancel(){
    if(!cancelId || busy)return;setBusy(true);setError("");
    try {const response=await fetch("/api/billing/cancel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:cancelId,confirm:true})});const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error);setCancelId(null);await refresh();}
    catch(error){setError(error instanceof Error?error.message:"Cancellation could not be confirmed. Please retry.");}
    finally{setBusy(false);}
  }
  const current=status?.subscriptions?.find(s=>s.order_id===status.activeOrderId);
  return <div className="billing-panel" aria-label="Subscription and daily allowance">
    {status?.environment==="test" && <p className="batch-notice"><strong>Test checkout.</strong> No real payment is collected in this environment.</p>}
    {!status && !error && <p role="status">Checking plan availability…</p>}
    {status && !status.enabled && <p>Subscriptions and daily quotas are not active yet. Checkout is closed; the current workspace remains free.</p>}
    {status?.enabled && <>
      {!compact && <><h2>{status.plan}</h2><p>{status.singleRemaining} / {status.singleLimit} free single-image cleans remaining today{status.batchLimit?` · ${status.batchRemaining} / ${status.batchLimit} batch tasks remaining`:""}.</p><p>Daily reset: {date(status.resetsAt!)} (00:00 UTC). The bundled safe sample is free to try.</p></>}
      {status.refreshPending && <p role="status">Payment verification is still in progress. We will check again automatically. Do not make another purchase.</p>}
      {current ? <><p>{current.will_renew?"Renews":"Access ends"} {date(current.period_end)}. {current.will_renew?"USD $4.99 per calendar month, plus applicable tax.":"Future renewal is canceled."}</p>{compact?<Link prefetch={false} className="button secondary" href="/account/billing">Manage subscription</Link>:<>{current.will_renew>0 && <button className="button secondary" disabled={busy} onClick={()=>setCancelId(current.order_id)}>Cancel auto-renewal</button>}</>}</> : <>
        {!status.checkoutEnabled?<p>New subscriptions are not open yet.</p>:!status.signedIn?<a className="button secondary" href="/auth/start" target="_blank" rel="noopener noreferrer">Sign in with Google to subscribe</a>:<>
          <label className="billing-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={busy}/><span>I agree to the <Link prefetch={false} href="/terms#fees">billing and refund terms</Link> and authorize USD $4.99 per calendar month, plus applicable tax shown at checkout, until I cancel.</span></label>
          <button className="button primary" disabled={!consent || busy || status.refreshPending} onClick={()=>void checkout()}>{busy?"Opening checkout…":"Subscribe to Batch Pro"}</button>
        </>}
      </>}
      {!compact && status.subscriptions?.map(s=><div key={s.order_id}><p>Order {s.order_id}: {s.status}{s.period_end>0?` · period ends ${date(s.period_end)}`:""}</p>{s.will_renew>0 && current?.order_id!==s.order_id && !["canceled","expired","closed"].includes(s.status) && <button className="button secondary" disabled={busy} onClick={()=>setCancelId(s.order_id)}>Cancel auto-renewal</button>}</div>)}
    </>}
    {cancelId && <div className="billing-confirm" role="group" aria-label="Confirm cancellation"><p>Stop future renewals? Your paid access continues until the end of the current paid period. This does not refund the current payment.</p><button className="button secondary" disabled={busy} onClick={()=>setCancelId(null)}>Keep subscription</button><button className="button primary" disabled={busy} onClick={()=>void cancel()}>Confirm cancellation</button></div>}
    {error && <p role="alert">{error} <button className="text-link" onClick={()=>void refresh()} disabled={busy}>Refresh status</button></p>}
    {!compact && <p>Need a refund or billing help? <SupportContact subject="ImageFinisher billing support" />. Include your purchase email and order ID; never send card details.</p>}
  </div>;
}
