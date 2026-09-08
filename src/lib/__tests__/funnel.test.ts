import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearFunnel, getFunnelEvents, trackFunnel } from "../funnel";

beforeEach(()=>clearFunnel());
describe("private funnel events",()=>{
  it("drops arbitrary filenames, prompts, URLs and invalid enum values",()=>{
    trackFunnel("scan_success",{ format:"png", source:"file", count:30, size:1024, duration:240, filename:"SECRET.png", prompt:"SECRET", path:"/workspace?image=SECRET", error:"SECRET" });
    const data=JSON.stringify(getFunnelEvents());
    expect(data).not.toContain("SECRET");
    expect(getFunnelEvents()[0]).toMatchObject({event:"scan_success",format:"png",source:"file",count:"11-30"});
  });
  it("separates examples from real files and keeps bounded session storage",()=>{
    for(let i=0;i<250;i++) trackFunnel("select_files",{source:"sample",count:1});
    expect(getFunnelEvents()).toHaveLength(200);
    expect(getFunnelEvents()[0].source).toBe("sample");
    clearFunnel();expect(getFunnelEvents()).toHaveLength(0);
  });
  it("does not send network requests when no receiver is configured",()=>{
    const fetch=vi.spyOn(globalThis,"fetch");
    trackFunnel("download",{source:"file",format:"jpeg",result:"verified"});
    expect(fetch).not.toHaveBeenCalled();fetch.mockRestore();
  });
});
