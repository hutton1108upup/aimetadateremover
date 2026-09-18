import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.BASE_URL ?? 'http://localhost:3107';
const out = 'outputs/legal-pages';
await mkdir(out, {recursive:true});
const browser = await chromium.launch({headless:true});
const results=[];
const check=(value,message)=>{if(!value)throw new Error(message);};
try {
 for(const width of [1440,390]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['/privacy','/terms']) {
   const response=await page.goto(base+route);await page.waitForLoadState('networkidle');
   check(response.status()===200,route+' status');
   check(await page.locator('h1').count()===1,route+' h1');
   check(await page.locator('#contact').count()===1,route+' support region');
   if(route==='/privacy')check((await page.locator('#rights').innerText()).includes('30 calendar days'),'request response deadline');
   if(route==='/terms'){check((await page.locator('#fees').innerText()).includes('USD $4.99 every 30 days'),'subscription billing explanation');check((await page.locator('#breach').innerText()).includes('suspend or terminate'),'breach consequences');}
   check(await page.locator('.legal-section').count()===12,route+' sections');
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' overflow '+width);
   check(await page.locator('.support-pending').count()===0,route+' stale contact placeholder');
   const mailLinks=await page.locator('a.support-email').evaluateAll(els=>els.map(e=>e.getAttribute('href')));
   check(mailLinks.every(href=>href.startsWith('mailto:support@aimetadateremover.pro')),route+' email destination');
   if(route==='/privacy')for(const subject of ['Data access request','Delete my personal data','Close my account'])check(mailLinks.includes('mailto:support@aimetadateremover.pro?subject='+encodeURIComponent(subject)),'email subject '+subject);
   await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:`${out}/${route.slice(1)}-${width}.png`});
   results.push({route,width,status:response.status(),sections:12,overflow:false,});
  }
  for(const route of ['/','/workspace','/metadata-checker','/remove-metadata-from-png','/remove-ai-detection-from-image','/about','/guides/image-metadata-before-publishing']) {
   await page.goto(base+route);await page.waitForLoadState('networkidle');
   const email=page.locator('#contact a[href="mailto:support@aimetadateremover.pro"]');
   check(await email.count()===1,route+' support email');
   check(await email.locator('svg').count()===1,route+' mail icon');
   check(await email.isVisible(),route+' visible support link');
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' email overflow');
   for(const policy of ['/privacy','/terms']) check(await page.locator(`a[href="${policy}"]`).count()>0,route+' missing '+policy);
   if(await page.locator('.workspace-legal').count())check(await page.locator('.workspace-legal a[target="_blank"]').count()===3,route+' session-safe links');
  }
  check(errors.length===0,JSON.stringify(errors));await page.close();
 }
 await writeFile(`${out}/checks.json`,JSON.stringify({results,linkedRoutes:7,consoleErrors:0},null,2));
 console.log(JSON.stringify({results,linkedRoutes:7,consoleErrors:0}));
} finally {await browser.close();}
