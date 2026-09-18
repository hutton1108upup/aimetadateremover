import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.BASE_URL ?? 'http://localhost:3107';
const out='outputs/pricing-review';await mkdir(out,{recursive:true});
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const browser=await chromium.launch({headless:true});
const results=[];
try {
 for(const width of [390,768,1100,1440]) {
  const page=await browser.newPage({viewport:{width,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(base+'/pricing');await page.waitForLoadState('networkidle');
  assert(response.status()===200,'pricing status');
  assert(await page.locator('h1').count()===1,'one h1');
  assert(await page.locator('.plan-card').count()===3,'three plans');
  assert(await page.getByRole('button',{name:'Subscriptions coming soon'}).isDisabled(),'not an active checkout');
  assert((await page.locator('.plan-card-featured').innerText()).includes('$4.99'),'price');
  assert((await page.locator('.plan-card-featured').innerText()).includes('30 days'),'billing term');
  assert((await page.locator('.plan-card-featured').innerText()).includes('20 batch tasks / day'),'quota');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow '+width);
  assert(await page.locator('a[href="/auth/start"][target="_blank"]').count()===1,'sign-in destination');
  for(const summary of await page.locator('.faq-list summary').all()){await summary.click();assert(await summary.locator('..').getAttribute('open')!==null,'faq opens');await summary.click();}
  const header=await page.locator('.site-header').evaluate(el=>{const visible=[...el.children].filter(e=>getComputedStyle(e).display!=='none');return visible.map(e=>({x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right}));});
  for(let i=1;i<header.length;i++)assert(header[i].x>=header[i-1].right-1,'header overlap '+width);
  if(width===390){await page.getByRole('button',{name:'Open navigation'}).click();await page.locator('.mobile-menu').getByRole('link',{name:'Pricing',exact:true}).click();assert(await page.locator('.mobile-menu').getAttribute('open')===null,'menu closes');}
  await page.evaluate(()=>scrollTo(0,0));
  if(width===390||width===1440)await page.screenshot({path:`${out}/pricing-${width}.png`,fullPage:true});
  results.push({width,status:response.status(),cards:3,overflow:false});
  assert(errors.length===0,JSON.stringify(errors));await page.close();
 }
 const page=await browser.newPage();
 for(const route of ['/','/metadata-checker','/workspace','/privacy','/terms']) {
  await page.goto(base+route);await page.waitForLoadState('networkidle');
  assert(await page.locator('a[href="/pricing"]').count()>=2,'pricing links '+route);
 }
 await page.goto(base+'/');await page.getByRole('link',{name:'Compare plans'}).click();await page.waitForURL('**/pricing');
 const sitemap=await page.request.get(base+'/sitemap.xml');assert((await sitemap.text()).includes('/pricing'),'sitemap');
 await writeFile(out+'/checks.json',JSON.stringify({results,linkedPages:5,homeNavigation:true,sitemap:true},null,2));
 console.log(JSON.stringify({results,linkedPages:5,homeNavigation:true,sitemap:true}));
} finally {await browser.close();}
