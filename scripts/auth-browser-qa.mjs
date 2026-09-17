import {chromium,expect} from "@playwright/test";
import {mkdir,writeFile} from "node:fs/promises";
const base=process.env.BASE_URL || "http://localhost:3180";
const browser=await chromium.launch({headless:true});
const checks=[],errors=[];
const pass=name=>{checks.push(name);console.log(`PASS ${name}`);};
await mkdir("artifacts/google-login",{recursive:true});
try {
  for(const width of [390,768,1440]){
    const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();
    page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
    await page.goto(base+"/workspace",{waitUntil:"networkidle"});
    await expect(page.getByRole("button",{name:"Sign in",exact:true})).toBeEnabled();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(await page.locator(".header-account-actions .header-cta svg").isVisible()).toBe(true);
    const targets=page.locator('.site-header button,.site-header .header-cta,.mobile-menu summary');
    for(const target of await targets.all()){if(await target.isVisible()){const box=await target.boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);}}
    const status=await page.request.get(base+"/api/auth/status");expect(status.headers()["cache-control"]).toContain("no-store");
    const enabled=(await status.json()).enabled;
    await page.getByRole("button",{name:"Try a safe sample"}).click();await page.getByText("AI generation parameters",{exact:true}).waitFor();
    const original=await page.locator('.image-stage img').getAttribute('src');
    if(!enabled){await page.getByRole("button",{name:"Sign in",exact:true}).click();await expect(page.getByRole("status")).toContainText("unavailable in this demo");await page.getByRole("button",{name:"Dismiss sign-in message"}).click();}
    expect(await page.locator('.image-stage img').getAttribute('src')).toBe(original);
    await page.getByRole("tab",{name:"clean",exact:true}).click();await page.getByRole("button",{name:"Create clean copy",exact:true}).click();
    await expect(page.getByRole("button",{name:"Download clean copy"})).toBeVisible();
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:`artifacts/google-login/workspace-${width}.png`,fullPage:true});
    pass(`${width}px header touch targets, overflow, optional auth and unchanged local clean workflow`);
    const account=await page.request.get(base+"/api/account");expect(account.status()).toBe(401);expect(account.headers()["cache-control"]).toContain("no-store");
    for(const route of ['/auth/start','/auth/complete?error=denied']){
      const response=await page.goto(base+route,{waitUntil:"networkidle"});expect(response.status()).toBe(200);expect(response.headers()['x-robots-tag']).toContain('noindex');expect(response.headers()['cache-control']).toContain('no-store');
      expect(await page.locator('meta[name="robots"]').getAttribute('content')).toContain('noindex');
    }
    await context.close();
  }
  // UI-only fixture: exercise popup/refresh transitions without claiming OAuth.
  const context=await browser.newContext({viewport:{width:1440,height:950}});const page=await context.newPage();let signedIn=false;
  await page.route('**/api/auth/status',r=>r.fulfill({json:{enabled:true}}));
  await page.route('**/api/auth/get-session',r=>r.fulfill({json:signedIn?{user:{id:'ui-fixture',name:'UI Fixture User',email:'ui@example.invalid'},session:{id:'fixture'}}:null}));
  await page.route('**/api/auth/sign-out',r=>{signedIn=false;return r.fulfill({json:{success:true}});});
  await page.goto(base+'/workspace',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Try a safe sample'}).click();await page.getByText('AI generation parameters',{exact:true}).waitFor();
  const src=await page.locator('.image-stage img').getAttribute('src');
  const popupPromise=page.waitForEvent('popup');await page.getByRole('button',{name:'Sign in',exact:true}).click();const popup=await popupPromise;
  expect(page.url()).toBe(base+'/workspace');expect(new URL(popup.url()).pathname).toBe('/auth/start');
  await popup.close();signedIn=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect(page.getByText('UI Fixture User')).toBeVisible();expect(await page.locator('.image-stage img').getAttribute('src')).toBe(src);
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeEnabled();
  expect(await page.locator('.image-stage img').getAttribute('src')).toBe(src);
  pass('UI fixture only: popup cancellation, server-session refresh and sign-out retain selected image');
  await context.close();expect(errors).toEqual([]);
  await writeFile('artifacts/google-login/browser-qa.json',JSON.stringify({at:new Date().toISOString(),base,checks,errors,realGoogleAuthorization:false},null,2));
}finally{await browser.close();}
