import { describe, expect, it } from "vitest";
import { deflateSync } from "node:zlib";
import { cleanImage, rebuildPngChunk } from "../clean";
import { concatBytes } from "../bytes";
import { scanImage } from "../scan";
import { verifyClean } from "../verify";
import type { CleanPolicy } from "../types";

const encode = (text: string) => new TextEncoder().encode(text);
const policy: CleanPolicy = { mode: "publish", removeC2pa: true, removeColorProfile: false };
function tiff(big = false) {
  const bytes = new Uint8Array(300), view = new DataView(bytes.buffer);
  bytes.set(encode(big ? "MM" : "II"));
  const w16 = (at:number, value:number) => view.setUint16(at,value,!big);
  const w32 = (at:number, value:number) => view.setUint32(at,value,!big);
  w16(2,42);w32(4,8);w16(8,4);
  function entry(at:number,tag:number,type:number,count:number,value:number) {
    w16(at,tag);w16(at+2,type);w32(at+4,count);
    if(type===3) w16(at+8,value);else w32(at+8,value);
  }
  entry(10,0x0112,3,1,6);
  entry(22,0x8298,2,10,160);bytes.set(encode("COPYRIGHT\0"),160);
  entry(34,0xa431,2,10,180);bytes.set(encode("SECRET-ID\0"),180);
  entry(46,0x9286,7,14,200);bytes.set(encode("prompt=PRIVATE"),200);
  return bytes;
}
function png(extra:Uint8Array[] = []) {
  return concatBytes([new Uint8Array([137,80,78,71,13,10,26,10]),rebuildPngChunk("IHDR",new Uint8Array([0,0,0,1,0,0,0,1,8,6,0,0,0])),...extra,rebuildPngChunk("IDAT",deflateSync(new Uint8Array([0,100,150,200,128]))),rebuildPngChunk("IEND",new Uint8Array())]).buffer as ArrayBuffer;
}
function jpeg(tiffBytes:Uint8Array) {
  const payload=concatBytes([encode("Exif\0\0"),tiffBytes]);
  const size=payload.length+2;
  return concatBytes([new Uint8Array([255,216,255,225,size>>8,size&255]),payload,new Uint8Array([255,218,0,2,17,34,255,217])]).buffer as ArrayBuffer;
}
describe("automatic combined cleaning", () => {
  it.each([false,true])("removes AI and private EXIF together, keeping copyright and orientation (big=%s)", async big => {
    for(const original of [png([rebuildPngChunk("eXIf",tiff(big))]),jpeg(tiff(big))]) {
      const before=await scanImage(original);
      const cleaned=await cleanImage(original,policy);
      const text=new TextDecoder().decode(cleaned.output);
      expect(text).not.toContain("SECRET-ID");expect(text).not.toContain("prompt=PRIVATE");expect(text).toContain("COPYRIGHT");
      const report=await verifyClean(before,cleaned.output!,policy,original);
      expect(report.encodedPayloadPreserved).toBe(true);expect(report.orientationPreserved).toBe(true);
      expect(report.outputScan.findings.some(f=>["location","ai_workflow"].includes(f.category))).toBe(false);
      expect(report.items.filter(i=>i.after==="removed")).toHaveLength(2);
    }
  });
  it("removes PNG workflow, location and credentials in one output, preserving attribution even when it mentions AI", async () => {
    const original=png([rebuildPngChunk("tEXt",encode("parameters\0seed=42")),rebuildPngChunk("tEXt",encode("GPS\0PRIVATE")),rebuildPngChunk("tEXt",encode("Copyright\0ComfyUI artist")),rebuildPngChunk("caBX",encode("provenance"))]);
    const cleaned=await cleanImage(original,policy);
    const report=await verifyClean(await scanImage(original),cleaned.output!,policy,original);
    expect(report.items.filter(i=>i.after==="removed")).toHaveLength(3);
    expect(report.items.filter(i=>i.after==="preserved")).toHaveLength(1);
    expect(report.transparencyPreserved).toBe(true);expect(report.encodedPayloadPreserved).toBe(true);
    expect(new TextDecoder().decode(cleaned.output)).toContain("ComfyUI artist");
  });
  it("keeps privacy and provenance when opted out, without restoring AI fields", async () => {
    const original=png([rebuildPngChunk("eXIf",tiff()),rebuildPngChunk("caBX",encode("provenance"))]);
    const selected={...policy,mode:"ai_workflow" as const,removeC2pa:false};
    const cleaned=await cleanImage(original,selected);
    const text=new TextDecoder().decode(cleaned.output);
    expect(text).toContain("SECRET-ID");expect(text).toContain("provenance");expect(text).not.toContain("prompt=PRIVATE");
  });
  it("reports JPEG credentials and unhandled XMP as remaining instead of promising full removal", async () => {
    function segment(marker:number,value:string) {
      const bytes=encode(value),size=bytes.length+2;
      return concatBytes([new Uint8Array([255,marker,size>>8,size&255]),bytes]);
    }
    const original=concatBytes([new Uint8Array([255,216]),segment(0xeb,"JP00jumb c2pa"),segment(0xe1,"http://ns.adobe.com/xap/1.0/ GPS private location"),new Uint8Array([255,218,0,2,17,34,255,217])]).buffer as ArrayBuffer;
    const cleaned=await cleanImage(original,policy);
    const report=await verifyClean(await scanImage(original),cleaned.output!,policy,original);
    expect(report.items.find(item=>item.label==="Content Credentials")?.after).toBe("still_present");
    expect(report.items.find(item=>item.label==="XMP metadata")?.after).toBe("unsupported");
  });
  it("does not claim nonexistent fields were removed and reports unsupported compressed text", async () => {
    const original=png([rebuildPngChunk("zTXt",encode("parameters\0\0compressed"))]);
    const cleaned=await cleanImage(original,policy);
    const report=await verifyClean(await scanImage(original),cleaned.output!,policy,original);
    expect(report.items.some(i=>i.after==="removed")).toBe(false);
    expect(report.items[0].after).toBe("unsupported");
    const empty=png();const untouched=await cleanImage(empty,policy);
    expect((await verifyClean(await scanImage(empty),untouched.output!,policy,empty)).items).toEqual([]);
  });
});
