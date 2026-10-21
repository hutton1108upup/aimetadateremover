import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.BASE_URL || 'https://imagefinisher-billing-test.duckweed1014.workers.dev';
const browser=await chromium.launch({headless:true});
const results=[];
try {
 for(const width of [390,1440]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(base+'/pricing'); assert.equal(response.status(),200);
  await page.getByRole('link',{name:'Sign in with Google to subscribe'}).first().waitFor();
  assert.equal(await page.locator('.plan-card').count(),3);
  const text=await page.locator('main').innerText();
  for(const price of ['$4.90','$9.90','$49.90','$89.90'])assert.ok(text.includes(price));
  await expect(page.getByRole('link',{name:'Sign in with Google to subscribe'})).toHaveCount(2,{timeout:20000});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  results.push({width,pricing:true,prices:true,signIn:true,noOverflow:true}); await page.close();
 }
 const page=await browser.newPage();
 for(const route of ['/','/terms','/privacy','/pdf-metadata-remover','/docx-metadata-remover']){
  const r=await page.goto(base+route); assert.equal(r.status(),200,route);
  assert.ok(await page.locator('a[href^="mailto:support@aimetadataremover.pro"]').count(),route+' support');
  results.push({route,status:200,support:true});
 }
 await mkdir('artifacts/payment-release-20261021',{recursive:true});
 await writeFile('artifacts/payment-release-20261021/browser-'+new URL(base).hostname+'.json',JSON.stringify({at:new Date().toISOString(),base,results},null,2));
 console.log(JSON.stringify({base,results}));
} finally {await browser.close();}
