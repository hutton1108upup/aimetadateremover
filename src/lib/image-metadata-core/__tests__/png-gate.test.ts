import { describe, expect, it } from "vitest";
import { deflateSync } from "node:zlib";
import { cleanImage, rebuildPngChunk } from "../clean";
import { concatBytes, u32be } from "../bytes";
import { scanImage } from "../scan";
import { verifyClean } from "../verify";

const enc=(s:string)=>new TextEncoder().encode(s);
const sig=new Uint8Array([137,80,78,71,13,10,26,10]);
const header=(color=6)=>rebuildPngChunk("IHDR",new Uint8Array([0,0,0,1,0,0,0,1,8,color,0,0,0]));
const end=()=>rebuildPngChunk("IEND",new Uint8Array());
const policy={mode:"ai_workflow" as const,removeC2pa:false,removeColorProfile:false};
const wrap=(chunks:Uint8Array[])=>concatBytes([sig,...chunks]).buffer as ArrayBuffer;

describe("PNG publication gate",()=>{
  it.each(["missing header","duplicate header","missing pixels","trailing bytes","unknown critical"])("rejects %s",async reason=>{
    const image=rebuildPngChunk("IDAT",deflateSync(new Uint8Array([0,0,0,0,255])));
    const chunks= reason === "missing header" ? [image,end()] : reason === "duplicate header" ? [header(),header(),image,end()] : reason === "missing pixels" ? [header(),end()] : reason === "trailing bytes" ? [header(),image,end(),enc("SECRET")] : [header(),rebuildPngChunk("ABCD",enc("data")),image,end()];
    await expect(scanImage(wrap(chunks))).rejects.toMatchObject({code:"malformed_container"});
  });
  it("preserves palette transparency and APNG frame bytes with selective text and C2PA removal",async()=>{
    const frame=new Uint8Array(26);frame.set(u32be(1),4);frame.set(u32be(1),8);frame[21]=1;frame[23]=10;
    const protectedChunks=[header(3),rebuildPngChunk("PLTE",new Uint8Array([255,0,0])),rebuildPngChunk("tRNS",new Uint8Array([128])),rebuildPngChunk("acTL",concatBytes([u32be(1),u32be(0)])),rebuildPngChunk("fcTL",frame),rebuildPngChunk("IDAT",deflateSync(new Uint8Array([0,0])))];
    const input=wrap([...protectedChunks,rebuildPngChunk("iTXt",enc("workflow\0\0\0\0\0seed=4")),rebuildPngChunk("caBX",enc("JUMBF sample")),end()]);
    const options={...policy,removeC2pa:true};const clean=await cleanImage(input,options);
    for(const chunk of protectedChunks)expect(Buffer.from(clean.output!).includes(Buffer.from(chunk))).toBe(true);
    const result=await verifyClean(await scanImage(input),clean.output!,options,input);
    expect(result.encodedPayloadPreserved).toBe(true);
    expect(result.outputScan.properties).toMatchObject({hasTransparency:true,hasAnimation:true});
    expect(result.items.filter(i=>i.after==="removed")).toHaveLength(2);
  });
  it("rejects bad checksums",async()=>{
    const broken=header();broken[broken.length-1]^=1;
    await expect(scanImage(wrap([broken,end()]))).rejects.toMatchObject({code:"png_crc_invalid"});
  });
});
