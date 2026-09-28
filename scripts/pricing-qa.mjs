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
  assert(await page.getByRole('button',{name:'Get Pro Monthly'}).isDisabled(),'monthly purchase entry without navigation');
  assert(await page.getByRole('button',{name:'Get Pro Yearly'}).isDisabled(),'yearly purchase entry without navigation');
  const cards=await page.locator('.plan-card').allInnerTexts();
  assert(cards[0].includes('5 photos / day'),'free plan allowance');
  assert(cards[1].includes('$9.90') && cards[1].includes('$4.90'),'monthly prices');
  assert(cards[2].includes('$89.90') && cards[2].includes('$49.90'),'yearly prices');
  const monthly=page.locator('.plan-card').nth(1),yearly=page.locator('.plan-card').nth(2);
  assert(await monthly.locator('.plan-price strong').innerText()==='$4.90','first-month price is primary');
  assert(await monthly.locator('.plan-price del').innerText()==='$9.90','monthly renewal price is struck through');
  assert((await monthly.locator('.plan-price > span').innerText()).includes('then $9.90/month'),'monthly renewal is explained');
  assert(await yearly.locator('.plan-price strong').innerText()==='$49.90','first-year price is primary');
  assert(await yearly.locator('.plan-price del').innerText()==='$89.90','yearly renewal price is struck through');
  assert((await yearly.locator('.plan-price > span').innerText()).includes('then $89.90/year'),'yearly renewal is explained');
  assert(cards[1].includes('Up to 10 photos per batch') && cards[2].includes('Up to 10 photos per batch'),'pro batch limits');
  assert(cards[1].includes('Batch ZIP downloads') && cards[2].includes('Batch ZIP downloads'),'deliverable pro benefit');
  assert((await page.locator('.pricing-intro').innerText()).includes('choose Pro for recurring batch work'),'final plan positioning');
  assert(!(await page.locator('main').innerText()).match(/plan preview|coming soon|not open yet|planned options|not enforced/i),'no internal launch status in pricing copy');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow '+width);
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
  if(route==='/' || route==='/privacy' || route==='/terms')assert(!(await page.locator('main').innerText()).match(/plan preview|coming soon|checkout is not open|not enforced in this version/i),'no internal launch status '+route);
 }
 await page.goto(base+'/');await page.getByRole('link',{name:'Compare plans'}).click();await page.waitForURL('**/pricing');
 const sitemap=await page.request.get(base+'/sitemap.xml');assert((await sitemap.text()).includes('/pricing'),'sitemap');
 await writeFile(out+'/checks.json',JSON.stringify({results,linkedPages:5,homeNavigation:true,sitemap:true},null,2));
 console.log(JSON.stringify({results,linkedPages:5,homeNavigation:true,sitemap:true}));
} finally {await browser.close();}
