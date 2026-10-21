// @vitest-environment node
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { billingConfig } from "../config";
import { finishUsage,reserveUsage,usageSummary } from "../usage";
import { canReplaceSubscription,requestKey,subscriptionSnapshot,type ProviderSubscription } from "../provider";
import { sameOrigin,limitedText } from "../http";

// Execute the actual migration and SQL, rather than matching mocked SQL strings.
class TestDatabase {
  sql=new DatabaseSync(":memory:");
  constructor(){this.sql.exec(readFileSync("migrations/0001_google_auth.sql","utf8"));this.sql.exec(readFileSync("migrations/0003_subscription_billing.sql","utf8"));this.sql.exec(readFileSync("migrations/0004_pro_plans.sql","utf8"));this.sql.exec("INSERT INTO auth_user VALUES('alice','Alice','alice@example.test',1,NULL,0,0)");}
  prepare(query:string){let values:unknown[]=[];const statement={bind:(...args:unknown[])=>{values=args;return statement;},first:async()=>this.sql.prepare(query).get(...values as never[]) ?? null,all:async()=>({results:this.sql.prepare(query).all(...values as never[])}),run:async()=>({meta:{changes:Number(this.sql.prepare(query).run(...values as never[]).changes)}})};return statement;}
  get db(){return this as unknown as D1Database;}
}
const settings={WAFFO_ENVIRONMENT:"test",WAFFO_MERCHANT_ID:"merchant",WAFFO_PRIVATE_KEY:"unused",WAFFO_STORE_ID:"store",WAFFO_SUBSCRIPTION_PRODUCT_ID:"product",AUTH_SECRET:"x".repeat(32),WAFFO_CHECKOUT_ENABLED:"true",BILLING_METERING_ENABLED:"true"};
const now=Date.parse("2026-09-23T10:00:00Z");
function order():ProviderSubscription{return {id:"order",storeId:"store",buyerEmail:"alice@example.test",status:"active",testMode:true,orderMerchantExternalId:"checkout",merchantProvidedBuyerIdentity:"alice",isInTrial:false,willRenew:true,currentPeriodStart:"2026-09-23T09:00:00Z",currentPeriodEnd:"2026-10-23T09:00:00Z",currentPeriodNumber:1,currency:"USD",billingPeriod:"monthly",subscriptionProduct:{id:"product"},priceSnapshot:{regularPhase:{subtotal:"4.99"}},payments:[{id:"payment",status:"succeeded",testMode:true,periodNumber:1,isFullyRefunded:false,snapshotAmountDetails:{currency:"USD",subtotal:"4.99"}}]};}
describe("subscription authority and billing boundaries",()=>{
  beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(now);});afterEach(()=>vi.useRealTimers());
  const config=billingConfig({...settings,AUTH_DB:{} as D1Database});
  it("keeps the provider calendar-month end instead of adding 30 days",()=>{const source=order();source.currentPeriodStart="2026-01-31T09:00:00Z";source.currentPeriodEnd="2026-02-28T09:00:00Z";const result=subscriptionSnapshot(source,config,Date.parse("2026-02-20"));expect(result.active).toBe(true);expect(result.end).toBe(Date.parse("2026-02-28T09:00:00Z"));});
  it("requires a successful unrefunded payment for the current period",()=>{const source=order();source.payments[0].periodNumber=0;expect(subscriptionSnapshot(source,config,now).active).toBe(false);source.payments[0].periodNumber=1;source.payments[0].isFullyRefunded=true;expect(subscriptionSnapshot(source,config,now).active).toBe(false);});
  it("retains canceled renewal access until the paid period ends",()=>{const source=order();source.status="canceling";source.willRenew=false;expect(subscriptionSnapshot(source,config,now).active).toBe(true);expect(subscriptionSnapshot(source,config,Date.parse(source.currentPeriodEnd!)).active).toBe(false);source.status="past_due";expect(subscriptionSnapshot(source,config,now).active).toBe(false);});
  it.each(["environment","product","price","trial"])("rejects a mismatched %s",field=>{const source=order();if(field==="environment")source.testMode=false;if(field==="product")source.subscriptionProduct.id="other";if(field==="price")source.priceSnapshot.regularPhase.subtotal="0";if(field==="trial")source.isInTrial=true;expect(()=>subscriptionSnapshot(source,config,now)).toThrow();});
  it("rejects cross-origin financial mutations and oversized chunked bodies",async()=>{expect(()=>sameOrigin(new Request("https://example.test",{headers:{origin:"https://other.test"}}),"https://example.test")).toThrow();await expect(limitedText(new Request("https://example.test",{method:"POST",body:"0123456789"}),5)).rejects.toMatchObject({status:413});});
  it("never opens checkout without both the credentials and usage gate",()=>{expect(billingConfig({...settings,AUTH_DB:{} as D1Database,BILLING_METERING_ENABLED:"false"}).checkoutEnabled).toBe(false);});
  it("rejects idempotency keys that the payment gateway would refuse",()=>{expect(()=>requestKey("checkout","invalid:key")).toThrow("Invalid local idempotency key");});
});
describe("atomic daily usage with real SQLite",()=>{
  let fixture:TestDatabase;const guest={userId:null,guestId:"browser"};const account={userId:"alice",guestId:"browser"};
  beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(now);fixture=new TestDatabase();});
  afterEach(()=>{fixture.sql.close();vi.useRealTimers();});
  const config=billingConfig({...settings,AUTH_DB:{} as D1Database});
  it("admits only one of two simultaneous guest reservations",async()=>{const results=await Promise.allSettled([reserveUsage(fixture.db,config,guest,"one","single"),reserveUsage(fixture.db,config,guest,"two","single")]);expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);expect((await usageSummary(fixture.db,config,guest)).singleRemaining).toBe(0);});
  it("sign-in increases the daily total to five rather than adding five",async()=>{await reserveUsage(fixture.db,config,guest,"guest","single");await finishUsage(fixture.db,config,guest,"guest","complete");expect((await usageSummary(fixture.db,config,account)).singleRemaining).toBe(4);await reserveUsage(fixture.db,config,account,"a","single");await reserveUsage(fixture.db,config,account,"b","single");await reserveUsage(fixture.db,config,account,"c","single");await reserveUsage(fixture.db,config,account,"d","single");await expect(reserveUsage(fixture.db,config,account,"e","single")).rejects.toMatchObject({status:429});});
  it("restores failed tasks and makes completion idempotent",async()=>{await reserveUsage(fixture.db,config,guest,"fail","single");await finishUsage(fixture.db,config,guest,"fail","release");await reserveUsage(fixture.db,config,guest,"ok","single");await finishUsage(fixture.db,config,guest,"ok","complete");await finishUsage(fixture.db,config,guest,"ok","complete");await finishUsage(fixture.db,config,guest,"ok","release");expect((await usageSummary(fixture.db,config,guest)).singleRemaining).toBe(0);});
  it("expires abandoned reservations, but refuses late confirmation",async()=>{await reserveUsage(fixture.db,config,guest,"stale","single");vi.setSystemTime(now+16*60000);expect((await usageSummary(fixture.db,config,guest)).singleRemaining).toBe(1);await expect(finishUsage(fixture.db,config,guest,"stale","complete")).rejects.toMatchObject({status:409});});
  it("resets at UTC midnight and forbids another user's confirmation",async()=>{await reserveUsage(fixture.db,config,guest,"old","single");await expect(finishUsage(fixture.db,config,account,"old","complete")).rejects.toMatchObject({status:404});await finishUsage(fixture.db,config,guest,"old","complete");vi.setSystemTime(Date.parse("2026-09-24T00:00:00Z"));expect((await usageSummary(fixture.db,config,guest)).singleRemaining).toBe(1);});
  it("grants exactly 20 paid tasks separately from the free allowance",async()=>{fixture.sql.exec(`INSERT INTO billing_checkout(id,user_id,environment,product_id,buyer_email,created_at,expires_at,consent_version) VALUES('checkout','alice','test','product','alice@example.test',0,0,'monthly');INSERT INTO billing_subscription(order_id,environment,user_id,checkout_id,status,period_start,period_end,will_renew,paid,checked_at) VALUES('order','test','alice','checkout','active',${now-1000},${now+86400000},1,1,${now});`);for(let i=0;i<20;i++)await reserveUsage(fixture.db,config,account,`batch-${i}`,"batch");await expect(reserveUsage(fixture.db,config,account,"extra","batch")).rejects.toMatchObject({status:429});expect((await usageSummary(fixture.db,config,account)).singleRemaining).toBe(5);});
  it("denies batch cleaning without a verified subscription",async()=>{await expect(reserveUsage(fixture.db,config,account,"no-paid","batch")).rejects.toMatchObject({status:403});});
  it("keeps two paid accounts independent when their guest identity matches",async()=>{
    fixture.sql.exec("INSERT INTO auth_user VALUES('bob','Bob','bob@example.test',1,NULL,0,0)");
    for(const id of ["alice","bob"])fixture.sql.prepare(`INSERT INTO billing_checkout(id,user_id,environment,product_id,buyer_email,created_at,expires_at,consent_version) VALUES(?,?,'test','product',?,0,0,'monthly')`).run(`checkout-${id}`,id,`${id}@example.test`);
    for(const id of ["alice","bob"])fixture.sql.prepare("INSERT INTO billing_subscription(order_id,environment,user_id,checkout_id,status,period_start,period_end,will_renew,paid,checked_at) VALUES(?,'test',?,?,'active',?,?,1,1,?)").run(`order-${id}`,id,`checkout-${id}`,now-1000,now+86400000,now);
    const bob={userId:"bob",guestId:account.guestId};
    for(let i=0;i<20;i++)await reserveUsage(fixture.db,config,account,`alice-${i}`,"batch");
    expect((await usageSummary(fixture.db,config,bob)).batchRemaining).toBe(20);
    for(let i=0;i<20;i++)await reserveUsage(fixture.db,config,bob,`bob-${i}`,"batch");
    await expect(reserveUsage(fixture.db,config,bob,"bob-over-limit","batch")).rejects.toMatchObject({status:429});
    expect((await usageSummary(fixture.db,config,{...bob,guestId:"another-device"})).batchRemaining).toBe(0);
  });
  it("carries anonymous singles over without charging another signed-in account",async()=>{
    await reserveUsage(fixture.db,config,guest,"anonymous","single");
    await finishUsage(fixture.db,config,guest,"anonymous","complete");
    await reserveUsage(fixture.db,config,account,"alice-single","single");
    const bob={userId:"bob",guestId:account.guestId};
    expect((await usageSummary(fixture.db,config,bob)).singleRemaining).toBe(4);
    await reserveUsage(fixture.db,config,bob,"bob-one","single");
    await reserveUsage(fixture.db,config,bob,"bob-two","single");
    await reserveUsage(fixture.db,config,bob,"bob-three","single");await reserveUsage(fixture.db,config,bob,"bob-four","single");await expect(reserveUsage(fixture.db,config,bob,"bob-five","single")).rejects.toMatchObject({status:429});
    expect((await usageSummary(fixture.db,config,account)).singleRemaining).toBe(3);
  });
  it("does not replenish the guest allowance after signing out",async()=>{
    await reserveUsage(fixture.db,config,account,"signed-in-single","single");
    await finishUsage(fixture.db,config,account,"signed-in-single","complete");
    await expect(reserveUsage(fixture.db,config,guest,"signed-out-single","single")).rejects.toMatchObject({status:429});
  });
});


describe("October Pro plans",()=>{
  const config=billingConfig({...settings,WAFFO_MONTHLY_PRODUCT_ID:"monthly-product",WAFFO_YEARLY_PRODUCT_ID:"yearly-product",AUTH_DB:{} as D1Database});
  function pro(plan:"monthly"|"yearly",intro:boolean):ProviderSubscription {
    const source=order();source.subscriptionProduct.id=plan+"-product";source.billingPeriod=plan;
    const amount=plan==="monthly"?"9.90":"89.90",offer=plan==="monthly"?"4.90":"49.90";
    source.priceSnapshot={regularPhase:{subtotal:amount},specialPhase:intro?{subtotal:offer}:null,specialPhaseDays:intro?(plan==="monthly"?30:365):null};
    source.status=intro?"trialing":"active";source.isInTrial=intro;source.payments[0].snapshotAmountDetails.subtotal=intro?offer:amount;return source;
  }
  it.each(["monthly","yearly"] as const)("verifies %s paid introductory and standard periods",plan=>{
    expect(subscriptionSnapshot(pro(plan,true),config,now).active).toBe(true);
    expect(subscriptionSnapshot(pro(plan,false),config,now).active).toBe(true);
    const source=pro(plan,true);source.payments[0].snapshotAmountDetails.subtotal="0";
    expect(subscriptionSnapshot(source,config,now).active).toBe(false);
  });
  it("rejects incorrect offer length and recurring price",()=>{
    const source=pro("yearly",true);source.priceSnapshot.specialPhaseDays=30;
    expect(()=>subscriptionSnapshot(source,config,now)).toThrow();
    source.priceSnapshot.specialPhaseDays=365;source.priceSnapshot.regularPhase.subtotal="49.90";
    expect(()=>subscriptionSnapshot(source,config,now)).toThrow();
  });
  it("retains paid introductory access when cancellation clears the trial flag",()=>{const source=pro("monthly",true);source.status="canceling";source.isInTrial=false;source.willRenew=false;expect(subscriptionSnapshot(source,config,now).active).toBe(true);});
  it("requires full renewal payment after the introductory phase",()=>{
    const source=pro("monthly",true);source.isInTrial=false;source.currentPeriodNumber=2;
    expect(subscriptionSnapshot(source,config,now).active).toBe(false);
    source.payments.push({...source.payments[0],id:"renewal",periodNumber:2,snapshotAmountDetails:{currency:"USD",subtotal:"9.90"}});
    expect(subscriptionSnapshot(source,config,now).active).toBe(true);
    source.payments[1].isFullyRefunded=true;expect(subscriptionSnapshot(source,config,now).active).toBe(false);
  });
  it("has no daily Pro cap, enforces ten per batch and reverts after expiry",async()=>{
    vi.useFakeTimers();vi.setSystemTime(now);const fixture=new TestDatabase();
    try {
      fixture.sql.exec(`INSERT INTO billing_checkout(id,user_id,environment,product_id,buyer_email,created_at,expires_at,consent_version,plan_id) VALUES('checkout','alice','test','yearly-product','alice@example.test',0,0,'pro','yearly');INSERT INTO billing_subscription VALUES('order','test','alice','checkout','active',${now-1000},${now+86400000},1,1,${now},'yearly');`);
      const identity={userId:"alice",guestId:"browser"};
      for(let i=0;i<25;i++)await reserveUsage(fixture.db,config,identity,`pro-${i}`,"batch",10);
      const summary=await usageSummary(fixture.db,config,identity);expect(summary.unlimited).toBe(true);expect(summary.batchRemaining).toBeNull();expect(summary.sessionMaxImages).toBe(30);
      await expect(reserveUsage(fixture.db,config,identity,"too-many","batch",11)).rejects.toMatchObject({status:400});
      vi.setSystemTime(now+86400001);await expect(reserveUsage(fixture.db,config,identity,"expired","batch",2)).rejects.toMatchObject({status:403});expect((await usageSummary(fixture.db,config,identity)).singleLimit).toBe(5);
    }finally{fixture.sql.close();vi.useRealTimers();}
  });
  it("allows replacing a fully refunded canceled order without allowing duplicate active billing",()=>{const source=pro("monthly",true);expect(canReplaceSubscription(source)).toBe(false);source.payments[0].isFullyRefunded=true;expect(canReplaceSubscription(source)).toBe(false);source.willRenew=false;source.status="canceling";expect(canReplaceSubscription(source)).toBe(true);});
  it("stores offer eligibility independently and only once per plan and account",()=>{
    const fixture=new TestDatabase();try {
      const insert=fixture.sql.prepare("INSERT OR IGNORE INTO billing_offer_redemption VALUES('test','alice',?,?,?)");
      insert.run("monthly","first-month",now);insert.run("monthly","second-month",now);insert.run("yearly","first-year",now);
      const rows=fixture.sql.prepare("SELECT plan_id,order_id FROM billing_offer_redemption ORDER BY plan_id").all();
      expect(rows).toEqual([{plan_id:"monthly",order_id:"first-month"},{plan_id:"yearly",order_id:"first-year"}]);
    }finally{fixture.sql.close();}
  });
});
