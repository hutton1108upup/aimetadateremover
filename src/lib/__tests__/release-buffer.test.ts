import { describe, expect, it } from "vitest";
import { releaseBuffer } from "../release-buffer";
describe("output lifetime",()=>{
  it("detaches discarded output even if a previous React render still references it",()=>{
    const buffer=new ArrayBuffer(1024*1024);const previousRender={cleaned:buffer};
    releaseBuffer(buffer);
    expect(previousRender.cleaned.byteLength).toBe(0);
    expect(()=>releaseBuffer(buffer)).not.toThrow();
  });
});
