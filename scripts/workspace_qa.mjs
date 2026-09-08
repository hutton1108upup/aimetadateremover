import { chromium, expect } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import JSZip from "jszip";

const base=process.env.BASE_URL ?? "http://127.0.0.1:3173";
const dir="artifacts/phase1-review";await mkdir(dir,{recursive:true});
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
const sample=png([workflow,chunk("tEXt",enc("Software\0Test Editor"))]);
function parts(bytes){let at=8;const result=[];while(at<bytes.length){const n=bytes.readUInt32BE(at),type=bytes.toString("ascii",at+4,at+8);expect(bytes.readUInt32BE(at+8+n)).toBe(crc(bytes.subarray(at+4,at+8+n)));result.push({type,bytes:bytes.subarray(at,at+n+12)});at+=n+12;}return result;}
function exif(big=false){
  const b=Buffer.alloc(256),w16=(at,v)=>big?b.writeUInt16BE(v,at):b.writeUInt16LE(v,at),w32=(at,v)=>big?b.writeUInt32BE(v,at):b.writeUInt32LE(v,at);
  b.write(big?"MM":"II");w16(2,42);w32(4,8);w16(8,4);
  function entry(at,tag,type,count,value){w16(at,tag);w16(at+2,type);w32(at+4,count);if(type===3)w16(at+8,value);else w32(at+8,value);}
  entry(10,0x0112,3,1,6);entry(22,0x8298,2,10,160);b.write("COPYRIGHT\0",160);entry(34,0xa431,2,10,180);b.write("SECRET-ID\0",180);entry(46,0x927c,7,12,200);b.write("MAKER-SECRET",200);w32(58,80);w16(80,2);entry(82,0x0201,4,1,220);entry(94,0x0202,4,1,12);b.write("THUMB-SECRET",220);return b;
}
const browser=await chromium.launch({headless:true});
const report={base,started:new Date().toISOString(),checks:[],memory:[],network:[]};
const check=(name)=>{report.checks.push(name);console.log(`PASS ${name}`);};
try {
  for(const mobile of [false,true]) {
    const count=mobile?10:30;
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile});
    await context.addInitScript(()=>{
      window.__qa={urls:new Set(),workers:new Set(),events:[],maxWorkers:0};
      const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL),OriginalWorker=Worker;
      URL.createObjectURL=value=>{const url=create(value);window.__qa.urls.add(url);return url;};
      URL.revokeObjectURL=url=>{window.__qa.urls.delete(url);revoke(url);};
      window.Worker=class extends OriginalWorker {constructor(...args){super(...args);window.__qa.workers.add(this);window.__qa.maxWorkers=Math.max(window.__qa.maxWorkers,window.__qa.workers.size);}terminate(){window.__qa.workers.delete(this);return super.terminate();}};
      window.addEventListener("imagefinisher:funnel",e=>{if(e.detail)window.__qa.events.push(e.detail);});
    });
    const page=await context.newPage();page.setDefaultTimeout(30_000);
    const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
    let processing=false;
    context.on("request",request=>{
      if(!processing || request.url().startsWith("blob:"))return;
      const url=new URL(request.url());const body=request.postDataBuffer();
      if(url.origin!==new URL(base).origin || request.method()!=="GET" || !url.pathname.startsWith("/_next/static/") || request.url().includes(marker) || body?.length) report.network.push({url:request.url(),method:request.method()});
    });
    page.on("websocket",socket=>socket.on("framesent",frame=>report.network.push({websocket:true,length:frame.payload.length})));
    await page.goto(base+"/workspace?review=1",{waitUntil:"networkidle"});processing=true;
    const cdp=await context.newCDPSession(page);
    async function memory(label){await cdp.send("HeapProfiler.collectGarbage");const memory=await cdp.send("Runtime.getHeapUsage");report.memory.push({device:mobile?"mobile-emulation":"desktop",label,...memory});return memory;}
    const initial=await memory("baseline");
    const input=page.getByLabel("Choose JPG, PNG, or WebP images");
    for(let cycle=0;cycle<3;cycle++) {
      await input.setInputFiles(Array.from({length:count},()=>({name:`${marker}.png`,mimeType:"image/png",buffer:sample})));
      await expect(page.locator('.batch-toolbar')).toContainText(`${count} files`);
      await expect.poll(()=>page.evaluate(()=>window.__qa.workers.size)).toBe(0);
      await page.getByRole("tab",{name:"clean",exact:true}).click();
      await page.getByRole("button",{name:"Clean all supported files"}).click();
      await expect(page.locator('.batch-toolbar')).toContainText(`${count} ready to download`,{timeout:120_000});
      await expect(page.getByRole("button",{name:"Download clean copy"})).toBeVisible();
      if(cycle===0) {
        const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Download clean ZIP"}).click();
        const download=await downloading;const zip=await JSZip.loadAsync(await readFile(await download.path()));
        expect(Object.keys(zip.files)).toHaveLength(count);
        for(const file of Object.values(zip.files)){const data=await file.async("nodebuffer");expect(data.includes(enc(marker))).toBe(false);expect(parts(data).find(c=>c.type==="IDAT").bytes.equals(parts(sample).find(c=>c.type==="IDAT").bytes)).toBe(true);}
        await page.evaluate(()=>scrollTo(0,0));
        await page.screenshot({path:`${dir}/${mobile?"mobile":"desktop"}-verified.png`,fullPage:true});
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        // Reprocessing must replace an output URL, not accumulate previews.
        await expect.poll(()=>page.evaluate(()=>window.__qa.urls.size)).toBe(count*2);
        for(let repeat=0;repeat<3;repeat++){
          await page.getByRole("tab",{name:"clean",exact:true}).click();await page.getByRole("button",{name:"Create clean copy",exact:true}).click();await expect(page.getByRole("button",{name:"Download clean copy"})).toBeVisible();
          expect(await page.evaluate(()=>window.__qa.urls.size)).toBe(count*2);
        }
      }
      await page.getByRole("button",{name:"Clear queue"}).click();
      await expect.poll(()=>page.evaluate(()=>window.__qa.urls.size+window.__qa.workers.size)).toBe(0);
      const after=await memory(`after-cycle-${cycle+1}`);
      expect(after.usedSize-initial.usedSize).toBeLessThan(32*1024*1024);
    }
    expect(await page.evaluate(()=>window.__qa.maxWorkers)).toBeLessThanOrEqual(mobile?1:2);
    check(`${count} files x 3 cycles; concurrency; duplicate-name ZIP; payload identity; URL/worker release; bounded post-GC JS heap`);
    const log=await page.evaluate(()=>window.__qa.events);
    expect(JSON.stringify(log)).not.toContain(marker);
    expect(log.filter(e=>e.event==="download")).toHaveLength(count);
    check(`${mobile?"mobile":"desktop"} funnel allowlist and per-output download deduplication`);

    // Deletion while work is pending must not resurrect files or results.
    await input.setInputFiles(Array.from({length:count},(_,i)=>({name:`cancel-${i}.png`,mimeType:"image/png",buffer:sample})));
    await page.getByRole("button",{name:"Clear queue"}).click();
    await expect(page.getByRole("button",{name:"Choose images",exact:true})).toBeEnabled();
    expect(await page.locator('.file-row').count()).toBe(0);
    await expect.poll(()=>page.evaluate(()=>window.__qa.urls.size+window.__qa.workers.size)).toBe(0);
    check(`${mobile?"mobile":"desktop"} cancel and recover`);

    for(const big of [false,true]) {
      const original=png([chunk("eXIf",exif(big))]);
      await input.setInputFiles({name:"privacy.png",mimeType:"image/png",buffer:original});
      await page.getByRole("tab",{name:"clean",exact:true}).click();await page.getByRole("radio",{name:/Privacy Clean/}).check();
      await page.getByRole("button",{name:"Create clean copy",exact:true}).click();
      const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Download clean copy"}).click();
      const data=await readFile(await (await downloading).path());for(const secret of ["SECRET-ID","MAKER-SECRET","THUMB-SECRET"])expect(data.includes(enc(secret))).toBe(false);
      expect(data.includes(enc("COPYRIGHT"))).toBe(true);
      expect(parts(data).find(c=>c.type==="IDAT").bytes.equals(parts(original).find(c=>c.type==="IDAT").bytes)).toBe(true);
      await page.getByRole("button",{name:"Clear queue"}).click();
    }
    check(`${mobile?"mobile":"desktop"} PNG EXIF privacy download/decode in both byte orders`);
    // Use a real browser-encoded JPEG as the independent decode/payload fixture.
    const jpeg=Buffer.from(await page.evaluate(()=>{const c=document.createElement("canvas");c.width=32;c.height=48;const x=c.getContext("2d");x.fillStyle="#bc723f";x.fillRect(0,0,32,48);return c.toDataURL("image/jpeg").split(",")[1];}),"base64");
    const app1=Buffer.concat([enc("Exif\0\0"),exif()]);const segment=Buffer.alloc(4);segment[0]=255;segment[1]=225;segment.writeUInt16BE(app1.length+2,2);
    const privateJpeg=Buffer.concat([jpeg.subarray(0,2),segment,app1,jpeg.subarray(2)]);
    await input.setInputFiles({name:"portrait.jpg",mimeType:"image/jpeg",buffer:privateJpeg});
    await page.getByRole("tab",{name:"clean",exact:true}).click();await page.getByRole("radio",{name:/Privacy Clean/}).check();await page.getByRole("button",{name:"Create clean copy",exact:true}).click();
    const jpgDownload=page.waitForEvent("download");await page.getByRole("button",{name:"Download clean copy"}).click();
    const jpgOut=await readFile(await (await jpgDownload).path());for(const s of ["SECRET-ID","MAKER-SECRET","THUMB-SECRET"])expect(jpgOut.includes(enc(s))).toBe(false);
    expect(jpgOut.subarray(2+segment.length+app1.length).equals(jpeg.subarray(2))).toBe(true);
    await page.getByRole("button",{name:"Clear queue"}).click();
    check(`${mobile?"mobile":"desktop"} real JPEG privacy decode and encoded payload identity`);

    const webp=Buffer.from(await page.evaluate(()=>{const c=document.createElement("canvas");c.width=32;c.height=32;return c.toDataURL("image/webp").split(",")[1];}),"base64");
    await input.setInputFiles([{name:"allowed.png",mimeType:"image/png",buffer:sample},{name:"scan.webp",mimeType:"image/webp",buffer:webp}]);
    await page.getByRole("tab",{name:"clean",exact:true}).click();await page.getByRole("button",{name:"Clean all supported files"}).click();
    await expect(page.locator('.batch-toolbar')).toContainText("1 ready to download");
    await expect(page.locator('.batch-notice').first()).toContainText("1 scan-only or unreadable");
    await page.getByRole("button",{name:"Clear queue"}).click();
    check(`${mobile?"mobile":"desktop"} mixed WebP batch skips unsupported cleaning`);

    // Reject a tiny compressed PNG with an enormous decoded canvas before preview.
    const bomb=png();bomb.writeUInt32BE(100_000,16);bomb.writeUInt32BE(100_000,20);bomb.writeUInt32BE(crc(bomb.subarray(12,29)),29);
    await input.setInputFiles({name:"oversized-canvas.png",mimeType:"image/png",buffer:bomb});
    await expect(page.locator('.error-banner')).toContainText("pixel limit");
    await expect.poll(()=>page.evaluate(()=>window.__qa.urls.size)).toBe(0);
    await page.getByRole("button",{name:"Clear queue"}).click();
    check(`${mobile?"mobile":"desktop"} decoded pixel cap before preview allocation`);

    // Exercise a near-limit batch using padding that does not expand into pixels.
    const padding=chunk("vpAg",Buffer.alloc(Math.floor((mobile?9.5:6.5)*1024*1024),17));
    const large=png([workflow,padding]);const largePath=`${dir}/${mobile?"mobile":"desktop"}-large.png`;await writeFile(largePath,large);
    await input.setInputFiles(Array(count).fill(largePath));
    await page.getByRole("tab",{name:"clean",exact:true}).click();
    await expect(page.getByRole("button",{name:"Clean all supported files"})).toBeEnabled({timeout:120_000});
    await page.getByRole("radio",{name:/AI Workflow Clean/}).check();
    await page.getByRole("button",{name:"Clean all supported files"}).click();
    await expect(page.locator('.batch-toolbar')).toContainText(`${count} ready to download`,{timeout:240_000});
    await memory("large-batch-ready");
    await page.getByRole("button",{name:"Clear queue"}).click();
    await expect.poll(()=>page.evaluate(()=>window.__qa.urls.size+window.__qa.workers.size)).toBe(0);
    const largeAfter=await memory("large-batch-cleared");expect(largeAfter.backingStorageSize).toBeLessThan(32*1024*1024);
    check(`${mobile?"mobile":"desktop"} ${Math.round(large.length*count/1024/1024)} MB batch scan-clean-release`);
    expect(errors).toEqual([]);await context.close();
  }
  expect(report.network).toEqual([]);check("no image, metadata, filename, POST, API or WebSocket traffic during local processing");
} finally {report.finished=new Date().toISOString();await writeFile(`${dir}/workspace-qa.json`,JSON.stringify(report,null,2));await browser.close();}
