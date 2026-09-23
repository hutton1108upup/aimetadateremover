// Isolated Waffo TEST acceptance helper. It cannot target the production DB or origin.
import { readFile,writeFile,mkdir } from "node:fs/promises";
import { parseEnv } from "node:util";
import { randomBytes,randomUUID } from "node:crypto";
import { serializeSignedCookie } from "better-call";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { WaffoPancake,WebhookEventType } from "@waffo/pancake-ts";
const origin="https://imagefinisher-billing-test.duckweed1014.workers.dev";
const account="7fd7ed1128ca3d125feaa279f4d4c547",database="6eb11432-20ce-4b28-a9c3-a78f7192a6a0";
const command=process.argv[2];
const scenario=process.argv.includes("--renewal")?"renewal":"default";
const env=parseEnv(await readFile(".dev.vars","utf8"));
if(env.WAFFO_ENVIRONMENT!=="test")throw new Error("This script requires test credentials.");
const client=new WaffoPancake({merchantId:env.WAFFO_MERCHANT_ID,privateKey:env.WAFFO_PRIVATE_KEY,environment:"test"});
await mkdir("artifacts/secrets",{recursive:true});
const secretPath="artifacts/secrets/billing-test.json",fixturePath=`artifacts/secrets/billing-test-${scenario==="default"?"":`${scenario}-`}fixture.json`;
const exists=async p=>readFile(p,"utf8").then(JSON.parse).catch(e=>{if(e.code==="ENOENT")return null;throw e;});
const secrets=await exists(secretPath) || {AUTH_SECRET:randomBytes(48).toString("hex"),GOOGLE_CLIENT_ID:env.GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET:env.GOOGLE_CLIENT_SECRET,WAFFO_MERCHANT_ID:env.WAFFO_MERCHANT_ID,WAFFO_PRIVATE_KEY:env.WAFFO_PRIVATE_KEY};
await writeFile(secretPath,JSON.stringify(secrets),{mode:0o600});
async function sql(query,params=[]){
  const config=await readFile("artifacts/cloudflare-auth/.wrangler/config/default.toml","utf8");const token=config.match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];if(!token)throw new Error("Task-specific Cloudflare login is missing");
  const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database}/query`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({sql:query,params})});
  const result=await response.json();if(!result.success)throw new Error("Test database query failed");return result.result;
}
let fixture=await exists(fixturePath);
async function call(path,body){
  if(!fixture)throw new Error("Run configure first");
  const response=await fetch(origin+path,{method:body?"POST":"GET",headers:{cookie:fixture.cookie+(fixture.guestCookie?`; ${fixture.guestCookie}`:""),Origin:origin,...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});
  const cookie=response.headers.getSetCookie().find(c=>c.startsWith("if_guest="));if(cookie){fixture.guestCookie=cookie.split(";")[0];await writeFile(fixturePath,JSON.stringify(fixture));}
  const data=await response.json();return {status:response.status,data};
}
if(command==="configure" || command==="fixture"){
  if(command==="configure"){const stored=spawnSync(process.execPath,["node_modules/wrangler/bin/wrangler.js","secret","bulk",secretPath,"--config","wrangler.billing-test.jsonc"],{encoding:"utf8",env:process.env});if(stored.status!==0)throw new Error("Test secret storage failed; inspect local Wrangler logs.");}
  if(!fixture){const token=randomBytes(32).toString("hex"),id=randomUUID(),now=Date.now();await sql("INSERT INTO auth_user(id,name,email,email_verified,created_at,updated_at) VALUES(?,?,?,?,?,?)",[id,"ImageFinisher Test Buyer",scenario==="default"?"billing-test@example.test":"billing-renewal@example.test",1,now,now]);await sql("INSERT INTO auth_session(id,token,user_id,expires_at,created_at,updated_at) VALUES(?,?,?,?,?,?)",[randomUUID(),token,id,now+86400000,now,now]);const cookie=(await serializeSignedCookie("__Secure-better-auth.session_token",token,secrets.AUTH_SECRET,{secure:true,path:"/",httpOnly:true})).split(";")[0];fixture={id,cookie};await writeFile(fixturePath,JSON.stringify(fixture),{mode:0o600});}
  if(command==="fixture"){console.log("Isolated synthetic test buyer ready.");}else{
  const url=origin+"/api/billing/webhook";
  const existing=await client.graphql.query({query:`query($id:String!){store(id:$id){storeWebhooks{id url testMode}}}`,variables:{id:env.WAFFO_STORE_ID}});if(existing.errors?.length)throw new Error("Test webhook lookup failed");
  const matching=existing.data.store.storeWebhooks.find(w=>w.url===url && w.testMode);
  if(!matching)await client.webhooks.add({storeId:env.WAFFO_STORE_ID,channel:"http",url,testMode:true,events:Object.values(WebhookEventType).filter(e=>e.startsWith("subscription.") || e.startsWith("refund."))});
  console.log("Isolated test secrets, synthetic buyer session, and signed webhook configured.");
  }
}else if(command==="diagnose"){
  const result=await sql("SELECT id,buyer_email,checkout_url,created_at FROM billing_checkout ORDER BY created_at DESC LIMIT 1");
  const row=result[0]?.results?.[0];if(!row)throw new Error("No checkout row was saved");
  console.log(JSON.stringify({checkoutSaved:true,hasUrl:!!row.checkout_url}));
  const orders=await client.graphql.query({query:`query($store:String!,$external:String!){subscriptionOrders(storeId:$store,filter:{orderMerchantExternalId:{eq:$external}},limit:10){id status}}`,variables:{store:env.WAFFO_STORE_ID,external:row.id}});console.log(JSON.stringify({orderLookup:orders}));
  try {const session=await client.checkout.createSession({productId:env.WAFFO_SUBSCRIPTION_PRODUCT_ID,currency:"USD",priceSnapshot:{amount:"4.99",taxCategory:"saas"},withTrial:false,buyerEmail:row.buyer_email,orderMerchantExternalId:row.id,metadata:{app:"imagefinisher",checkoutId:row.id},successUrl:`${origin}/account/billing?checkout=return`,expiresInSeconds:900},{idempotencyKey:`checkout-${row.id}`});console.log(JSON.stringify({providerSessionCreated:true,host:new URL(session.checkoutUrl).hostname,expiresAt:session.expiresAt,expiresParsed:Date.parse(session.expiresAt)}));}
  catch(error){console.log(JSON.stringify({name:error.name,code:error.code,message:error.message?.slice(0,400)}));}
}else if(command==="expire-old-fixture-checkout"){
  await sql("UPDATE billing_checkout SET expires_at=? WHERE user_id=? AND environment='test' AND provider_order_id IS NULL",[Date.now()-1,fixture.id]);console.log("Expired only the synthetic buyer pending checkout.");
}else if(command==="status"){
  console.log(JSON.stringify(await call("/api/billing/status"),null,2));
}else if(command==="status-repeat"){
  const results=[];
  for(let i=0;i<20;i++){const result=await call("/api/billing/status");assert.equal(result.status,200);assert.equal(result.data.signedIn,true);results.push({status:result.status,plan:result.data.plan,refreshPending:result.data.refreshPending});}
  await writeFile(`artifacts/waffo-reference/status-repeat-${scenario}.json`,JSON.stringify({at:new Date().toISOString(),results},null,2));console.log(JSON.stringify({requests:results.length,allSucceeded:true,plans:[...new Set(results.map(r=>r.plan))]}));
}else if(command==="checkout"){
  const result=await call("/api/billing/checkout",{consent:"batch-pro-monthly-2026-09-23"});await writeFile("artifacts/waffo-reference/test-checkout.json",JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,data:result.data?.url?{checkoutCreated:true,host:new URL(result.data.url).hostname}:result.data}));
}else if(command==="cancel"){
  const {data}=await call("/api/billing/status");const subscription=data.subscriptions?.find(s=>s.will_renew);if(!subscription)throw new Error("No test subscription to cancel");console.log(JSON.stringify(await call("/api/billing/cancel",{orderId:subscription.order_id,confirm:true})));
}else if(command==="reactivate"){
  const {data}=await call("/api/billing/status");const subscription=data.subscriptions?.find(s=>s.status==="canceling" && s.paid);if(!subscription)throw new Error("No paid test cancellation to reverse");
  const {token}=await client.auth.issueSessionToken({storeId:env.WAFFO_STORE_ID,buyerIdentity:fixture.id});const result=await client.customer(token).reactivateSubscription({orderId:subscription.order_id});console.log(JSON.stringify({orderId:result.orderId,status:result.status}));
}else if(command==="checks"){
  const checks=[];const check=(name,actual,expected)=>{assert.equal(actual,expected,name);checks.push(name);};
  check("unknown renewal consent rejected",(await call("/api/billing/checkout",{consent:"old-30-day-contract"})).status,400);
  check("client price injection rejected",(await call("/api/billing/checkout",{consent:"batch-pro-monthly-2026-09-23",amount:"0.01"})).status,400);
  check("another account order cannot be canceled",(await call("/api/billing/cancel",{orderId:"ORD_not-owned",confirm:true})).status,404);
  const cross=await fetch(origin+"/api/billing/checkout",{method:"POST",headers:{cookie:fixture.cookie,Origin:"https://untrusted.example","Content-Type":"application/json"},body:JSON.stringify({consent:"batch-pro-monthly-2026-09-23"})});check("cross-origin checkout rejected",cross.status,403);
  const unsigned=await fetch(origin+"/api/billing/webhook",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventType:"subscription.activated",data:{orderId:"fake"}})});check("unsigned payment notification rejected",unsigned.status,401);
  const guest=await fetch(origin+"/api/billing/checkout",{method:"POST",headers:{Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({consent:"batch-pro-monthly-2026-09-23"})});check("unauthenticated checkout rejected",guest.status,401);
  const accountPage=await fetch(origin+"/account/billing?checkout=return");check("test account page is noindex",accountPage.headers.get("X-Robots-Tag"),"noindex, nofollow");
  await writeFile("artifacts/waffo-reference/live-negative-checks.json",JSON.stringify({at:new Date().toISOString(),checks},null,2));console.log(JSON.stringify({passed:checks.length,checks},null,2));
}else if(command==="evidence"){
  console.log(JSON.stringify(await sql("SELECT event_type,COUNT(*) AS count FROM billing_event GROUP BY event_type;"),null,2));
}else if(command==="snapshot"){
  const result=await sql("SELECT order_id,status,period_start,period_end,will_renew,paid,checked_at FROM billing_subscription WHERE user_id=? AND environment='test' ORDER BY checked_at DESC",[fixture.id]);
  const data={at:new Date().toISOString(),subscriptions:result[0].results};await writeFile("artifacts/waffo-reference/subscription-db-snapshot.json",JSON.stringify(data,null,2));console.log(JSON.stringify(data,null,2));
}else if(command==="provider-snapshot"){
  const result=await client.graphql.query({query:`query($store:String!,$buyer:String!,$product:String!){subscriptionOrders(storeId:$store,filter:{merchantProvidedBuyerIdentity:{eq:$buyer},productId:{eq:$product}},limit:10){id status testMode currentPeriodStart currentPeriodEnd currentPeriodNumber willRenew payments{id status periodNumber isFullyRefunded amount{display currency} refundedAmount{display currency} refunds{id status amount{display currency}}}}}`,variables:{store:env.WAFFO_STORE_ID,buyer:fixture.id,product:env.WAFFO_SUBSCRIPTION_PRODUCT_ID}});
  if(result.errors?.length)throw new Error(result.errors.map(e=>e.message).join("; "));
  await writeFile("artifacts/waffo-reference/provider-subscriptions.json",JSON.stringify(result.data,null,2));console.log(JSON.stringify(result.data,null,2));
}else if(command==="delivery-status"){
  const result=await client.graphql.query({query:`query($store:String!){webhookDeliveries(storeId:$store,limit:20){id eventType status httpStatus attemptCount webhookUrl createdAt payload responseBody} refundTickets(filter:{subjectId:{eq:"PAY_0q7pyLOe7vjAIjrWMsXgFG"}},limit:5){id status subjectId executedAt updatedAt}}`,variables:{store:env.WAFFO_STORE_ID}});
  if(result.errors?.length)throw new Error(result.errors.map(e=>e.message).join("; "));
  result.data.webhookDeliveries=result.data.webhookDeliveries.map(({payload,...delivery})=>{const p=JSON.parse(payload);return {...delivery,eventDeliveryId:p.id,orderId:p.data?.orderId,externalId:p.data?.orderMerchantExternalId,checkoutId:p.data?.orderMetadata?.checkoutId};});
  await writeFile("artifacts/waffo-reference/delivery-status.json",JSON.stringify(result.data,null,2));console.log(JSON.stringify(result.data,null,2));
}else if(command==="usage"){
  const id=randomUUID();const kind=process.argv[3]==="batch"?"batch":"single";
  const reserve=await call("/api/billing/usage",{id,action:"reserve",kind});console.log(JSON.stringify({reserve}));if(reserve.status===200){console.log(JSON.stringify({complete:await call("/api/billing/usage",{id,action:"complete"}),duplicate:await call("/api/billing/usage",{id,action:"complete"})}));}
}else throw new Error("Use configure, status, checkout, usage, cancel, or evidence.");
