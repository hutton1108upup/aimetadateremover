import { afterEach, describe, expect, it, vi } from "vitest";
import { scanLocally } from "../local-processor";

afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
describe("worker lifetime",()=>{
  it("terminates an in-flight worker when its file is removed",async()=>{
    const terminate=vi.fn();
    vi.stubGlobal("Worker",class { onmessage=null;onerror=null;postMessage(){} terminate=terminate; });
    const controller=new AbortController();
    const pending=scanLocally(new ArrayBuffer(8),controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({name:"AbortError"});
    expect(terminate).toHaveBeenCalledOnce();
  });
  it("terminates a worker that never answers",async()=>{
    vi.useFakeTimers();const terminate=vi.fn();
    vi.stubGlobal("Worker",class { onmessage=null;onerror=null;postMessage(){} terminate=terminate; });
    const pending=scanLocally(new ArrayBuffer(8));
    const assertion=expect(pending).rejects.toMatchObject({code:"processing_timeout"});
    await vi.advanceTimersByTimeAsync(60_001);await assertion;
    expect(terminate).toHaveBeenCalledOnce();
  });
});
