import { chromium, expect } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import JSZip from "jszip";


const base=process.env.BASE_URL ?? "http://127.0.0.1:3173";
const dir="artifacts/automatic-workflow-review";await mkdir(dir,{recursive:true});
const enc=s=>Buffer.from(s);
const table=Uint32Array.from({length:256},(_,i)=>{for(let b=0;b<8;b++)i=(i>>>1)^((i&1)?0xedb88320:0);return i>>>0;});
function crc(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function u32(n){const b=Buffer.alloc(4);b.writeUInt32BE(n);return b;}
function chunk(type,data){const payload=Buffer.concat([enc(type),data]);return Buffer.concat([u32(data.length),payload,u32(crc(payload))]);}
function png(extra=[],width=64,height=64) {
  const header=Buffer.concat([u32(width),u32(height),Buffer.from([8,6,0,0,0])]);
  const rows=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*(width*4+1)+1+x*4;rows[i]=x%256;rows[i+1]=y%256;rows[i+2]=100;rows[i+3]=128;}
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",header),...extra,chunk("IDAT",deflateSync(rows)),chunk("IEND",Buffer.alloc(0))]);
}
const marker="QA_PRIVATE_SENTINEL_98";
const workflow=chunk("tEXt",enc(`parameters\0${marker} seed=42`));
function parts(bytes){let at=8;const result=[];while(at<bytes.length){const n=bytes.readUInt32BE(at),type=bytes.toString("ascii",at+4,at+8);expect(bytes.readUInt32BE(at+8+n)).toBe(crc(bytes.subarray(at+4,at+8+n)));result.push({type,bytes:bytes.subarray(at,at+n+12)});at+=n+12;}return result;}
function exif(big=false){
  const b=Buffer.alloc(256),w16=(at,v)=>big?b.writeUInt16BE(v,at):b.writeUInt16LE(v,at),w32=(at,v)=>big?b.writeUInt32BE(v,at):b.writeUInt32LE(v,at);
  b.write(big?"MM":"II");w16(2,42);w32(4,8);w16(8,4);
  function entry(at,tag,type,count,value){w16(at,tag);w16(at+2,type);w32(at+4,count);if(type===3)w16(at+8,value);else w32(at+8,value);}
  entry(10,0x0112,3,1,6);entry(22,0x8298,2,10,160);b.write("COPYRIGHT\0",160);entry(34,0xa431,2,10,180);b.write("SECRET-ID\0",180);entry(46,0x927c,7,12,200);b.write("MAKER-SECRET",200);w32(58,80);w16(80,2);entry(82,0x0201,4,1,220);entry(94,0x0202,4,1,12);b.write("THUMB-SECRET",220);return b;
}
const browser=await chromium.launch({headless:true});
const report={checks:[],screenshots:[],errors:[]};
const check=name=>{report.checks.push(name);console.log(`PASS ${name}`);};
try {
  for(const mobile of [false,true]) {
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile});
    const page=await context.newPage();page.setDefaultTimeout(15_000);
    page.on('pageerror',error=>report.errors.push(error.message));
    await page.goto(base,{waitUntil:'networkidle'});
    if(mobile) { await page.screenshot({path:`${dir}/mobile-home-empty.png`}); const box=await page.getByRole('button',{name:'Choose images',exact:true}).boundingBox(); console.log(`Mobile choose bottom: ${box.y+box.height}`); }
    const combined=png([workflow,chunk('eXIf',exif()),chunk('caBX',enc('QA-CREDENTIALS'))],640,480);
    await page.getByLabel('Choose JPG, PNG, or WebP images').setInputFiles({name:'combined.png',mimeType:'image/png',buffer:combined});
    await expect(page.getByRole('button',{name:'Download clean copy',exact:true})).toBeEnabled();
    await expect(page.getByRole('tab')).toHaveCount(0);await expect(page.getByRole('radio')).toHaveCount(0);
    const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Download clean copy',exact:true}).click();
    const output=await readFile(await (await downloading).path());
    for(const value of [marker,'SECRET-ID','MAKER-SECRET','THUMB-SECRET','QA-CREDENTIALS']) expect(output.includes(enc(value))).toBe(false);
    expect(output.includes(enc('COPYRIGHT'))).toBe(true);expect(parts(output).find(c=>c.type==='IDAT').bytes.equals(parts(combined).find(c=>c.type==='IDAT').bytes)).toBe(true);
    await page.locator('.active-workspace').scrollIntoViewIfNeeded();
    const shot=`${dir}/${mobile?'mobile':'desktop'}-automatic-result.png`;await page.locator('.active-workspace').screenshot({path:shot});report.screenshots.push(shot);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    check(`${mobile?'mobile':'desktop'} upload only → combined AI/privacy/C2PA clean → verified download; copyright and pixel payload preserved`);
    await page.locator('.clean-settings summary').click();
    await page.getByRole('checkbox',{name:/Keep location/}).check();await expect(page.getByRole('button',{name:'Download clean copy',exact:true})).toBeEnabled();
    await page.getByRole('checkbox',{name:/Keep Content Credentials/}).check();await expect(page.getByRole('button',{name:'Download clean copy',exact:true})).toBeEnabled();
    const retaining=page.waitForEvent('download');await page.getByRole('button',{name:'Download clean copy',exact:true}).click();
    const retained=await readFile(await (await retaining).path());expect(retained.includes(enc('SECRET-ID'))).toBe(true);expect(retained.includes(enc('QA-CREDENTIALS'))).toBe(true);expect(retained.includes(enc(marker))).toBe(false);
    check('Optional keep settings regenerate from original without restoring AI workflow');
    await page.goto(base+'/metadata-checker',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Try a safe sample'}).click();await expect(page.getByText('Scan complete',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Download clean copy',exact:true})).toHaveCount(0);
    await page.getByRole('button',{name:'Clean and create a copy'}).click();await expect(page.getByRole('button',{name:'Download clean copy',exact:true})).toBeEnabled();
    expect(new URL(page.url()).pathname).toBe('/metadata-checker');check('Checker stays read-only until explicit cleaning, no navigation or reselection');
    await page.goto(base+'/remove-metadata-from-png',{waitUntil:'networkidle'});
    const pngInput=page.getByLabel('Choose PNG images');expect(await pngInput.getAttribute('accept')).toBe('image/png');
    const untouched=png();await pngInput.setInputFiles({name:'plain.png',mimeType:'image/png',buffer:untouched});
    await expect(page.getByRole('heading',{name:'No supported data needed cleaning'})).toBeVisible();
    const originalDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download original',exact:true}).click();expect((await readFile(await (await originalDownload).path())).equals(untouched)).toBe(true);check('No-op returns original bytes and never claims a removal');
    await page.getByRole('button',{name:'Clear queue'}).click();
    await pngInput.setInputFiles({name:'partial.png',mimeType:'image/png',buffer:png([workflow,chunk('zTXt',enc('parameters\0\0compressed'))])});
    await expect(page.getByRole('heading',{name:'Partially cleaned — review remaining data'})).toBeVisible();await expect(page.getByRole('button',{name:'Download clean copy',exact:true})).toBeEnabled();check('Unsupported metadata produces partial result, not clean success');
    await page.getByRole('button',{name:'Clear queue'}).click();
    const webp=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=32;c.height=32;return c.toDataURL('image/webp').split(',')[1];}),'base64');
    await pngInput.setInputFiles({name:'pretend.png',mimeType:'image/png',buffer:webp});await expect(page.locator('.error-banner')).toContainText('accepts PNG');await expect(page.getByRole('button',{name:'Download clean copy',exact:true})).toHaveCount(0);check('PNG page checks bytes, rejecting renamed other formats');
    await page.goto(base,{waitUntil:'networkidle'});
    await page.getByLabel('Choose JPG, PNG, or WebP images').setInputFiles([
      {name:'combined.png',mimeType:'image/png',buffer:combined},
      {name:'plain.png',mimeType:'image/png',buffer:untouched},
      {name:'scan.webp',mimeType:'image/webp',buffer:webp},
      {name:'broken.png',mimeType:'image/png',buffer:enc('invalid')},
    ]);
    await expect(page.locator('.batch-toolbar')).toContainText('2 ready to download');
    await expect(page.locator('.batch-toolbar')).toContainText('1 failed');
    await expect(page.locator('.batch-toolbar')).toContainText('1 inspection only');
    const zipDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download completed images (ZIP)'}).click();
    const zip=await JSZip.loadAsync(await readFile(await (await zipDownload).path()));expect(Object.keys(zip.files)).toHaveLength(2);
    const originalEntry=Object.values(zip.files).find(file=>file.name.includes('original-plain.png'));expect(originalEntry).toBeTruthy();expect((await originalEntry.async('nodebuffer')).equals(untouched)).toBe(true);
    check('Mixed batch ZIP includes clean output and byte-identical no-op original, excludes failed and inspection-only files');
    await context.close();
  }
  expect(report.errors).toEqual([]);
} finally { await writeFile(`${dir}/automatic-flow-qa.json`,JSON.stringify(report,null,2));await browser.close(); }
