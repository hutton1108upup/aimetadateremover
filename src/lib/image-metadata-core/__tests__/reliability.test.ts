import { describe, expect, it } from "vitest";
import { deflateSync } from "node:zlib";
import { cleanImage, rebuildPngChunk } from "../clean";
import { concatBytes, u32be } from "../bytes";
import { scanImage } from "../scan";
import { verifyClean } from "../verify";
import { cleanTiff, scanTiff } from "../tiff";

const encode = (s: string) => new TextEncoder().encode(s);
const policy = { mode: "ai_workflow" as const, removeC2pa: false, removeColorProfile: false };
export function png(extra: Uint8Array[] = []) {
  return concatBytes([new Uint8Array([137,80,78,71,13,10,26,10]), rebuildPngChunk("IHDR", new Uint8Array([0,0,0,1,0,0,0,1,8,6,0,0,0])), ...extra, rebuildPngChunk("IDAT", deflateSync(new Uint8Array([0,100,150,200,128]))), rebuildPngChunk("IEND", new Uint8Array())]).buffer as ArrayBuffer;
}

function exif(big = false, maker = false, thumbnail = false) {
  const bytes = new Uint8Array(256);
  const view = new DataView(bytes.buffer);
  bytes.set(encode(big ? "MM" : "II"));
  const w16 = (n: number,v: number) => view.setUint16(n,v,!big);
  const w32 = (n: number,v: number) => view.setUint32(n,v,!big);
  w16(2,42); w32(4,8); w16(8,4);
  function entry(at: number,tag: number,type: number,count: number,value: number) {
    w16(at,tag);w16(at+2,type);w32(at+4,count);
    if(type === 3 && count === 1) w16(at+8,value); else w32(at+8,value);
  }
  entry(10,0x0112,3,1,6);
  entry(22,0x8298,2,10,160); bytes.set(encode("COPYRIGHT\0"),160);
  entry(34,0xa431,2,10,180); bytes.set(encode("SECRET-ID\0"),180);
  entry(46, maker ? 0x927c : 0x0131,7,12,200); bytes.set(encode("MAKER-SECRET"),200);
  w32(58,thumbnail ? 80 : 0);
  if(thumbnail) { w16(80,2); entry(82,0x0201,4,1,220);entry(94,0x0202,4,1,12);w32(106,0);bytes.set(encode("THUMB-SECRET"),220); }
  return bytes;
}

describe("privacy compatibility gate", () => {
  it.each([false,true])("removes serial, MakerNote and JPEG thumbnail bytes while preserving orientation/copyright (big endian=%s)", (big) => {
    const input=exif(big,true,true);
    const result=cleanTiff(input,"privacy");
    const text=new TextDecoder().decode(result.bytes);
    expect(text).not.toContain("SECRET-ID");
    expect(text).not.toContain("MAKER-SECRET");
    expect(text).not.toContain("THUMB-SECRET");
    expect(text).toContain("COPYRIGHT");
    expect(scanTiff(result.bytes).orientation).toBe(6);
    expect(scanTiff(result.bytes).findings.some(f=>f.category === "location")).toBe(false);
    expect(new TextDecoder().decode(input)).toContain("THUMB-SECRET");
  });
  it("rejects cyclic EXIF directory links instead of silently skipping private data", () => {
    const bytes=exif(); new DataView(bytes.buffer).setUint32(58,8,true);
    expect(()=>cleanTiff(bytes,"privacy")).toThrow();
  });
  it("refuses strip thumbnails, nested SubIFDs and overlapping private fields",()=>{
    const strip=exif(false,true,true);new DataView(strip.buffer).setUint16(82,0x0111,true);
    expect(()=>cleanTiff(strip,"privacy")).toThrow();
    const nested=exif();new DataView(nested.buffer).setUint16(46,0x014a,true);
    expect(()=>cleanTiff(nested,"privacy")).toThrow();
    const overlapping=exif();new DataView(overlapping.buffer).setUint32(42,160,true);
    expect(()=>cleanTiff(overlapping,"privacy")).toThrow();
  });
});

describe("output integrity and PNG compatibility gate", () => {
  it("detects changed encoded pixels even when dimensions match", async () => {
    const input=png();
    const other=concatBytes([new Uint8Array(input).subarray(0,33), rebuildPngChunk("IDAT", deflateSync(new Uint8Array([0,0,0,0,255]))), rebuildPngChunk("IEND",new Uint8Array())]).buffer as ArrayBuffer;
    const result=await verifyClean(await scanImage(input),other,policy,input);
    expect(result.encodedPayloadPreserved).toBe(false);
  });
  it.each(["zTXt", "iTXt"])("keeps unsupported %s visible as unresolved after an earlier chunk is removed", async (type) => {
    const data=type === "zTXt" ? concatBytes([encode("notes\0\0"),deflateSync(encode("PRIVATE-MARKER"))]) : concatBytes([encode("notes\0"),new Uint8Array([1,0,0,0]),deflateSync(encode("PRIVATE-MARKER"))]);
    const input=png([rebuildPngChunk("tEXt",encode("parameters\0seed=1")),rebuildPngChunk(type,data)]);
    const clean=await cleanImage(input,policy);
    const result=await verifyClean(await scanImage(input),clean.output!,policy,input);
    expect(result.items.some(i=>i.after === "unsupported")).toBe(true);
    expect(result.encodedPayloadPreserved).toBe(true);
  });
  it("preserves alpha, ICC, animation data and unknown safe chunks byte for byte",async()=>{
    const extra=[rebuildPngChunk("iCCP",encode("test\0\0profile")),rebuildPngChunk("acTL",concatBytes([u32be(1),u32be(0)])),rebuildPngChunk("vpAg",encode("safe")),rebuildPngChunk("tEXt",encode("parameters\0seed=2"))];
    const input=png(extra); const clean=await cleanImage(input,policy);
    const verified=await verifyClean(await scanImage(input),clean.output!,policy,input);
    expect(verified.encodedPayloadPreserved).toBe(true);
    expect(verified.iccPreserved).toBe(true);
    expect(verified.transparencyPreserved).toBe(true);
    for(const chunk of extra.slice(0,3)) expect(Buffer.from(clean.output!).includes(Buffer.from(chunk))).toBe(true);
  });
});
