import {act,renderHook} from "@testing-library/react";
import {beforeEach,describe,expect,it,vi} from "vitest";
import {useLocalWorkspace} from "../use-local-workspace";
const mocks=vi.hoisted(()=>({usage:vi.fn(),clean:vi.fn()}));
vi.mock("@/lib/billing/client",()=>({usageRequest:mocks.usage}));
vi.mock("@/lib/local-processor",()=>({
  scanLocally:async()=>({format:"png",cleanSupport:"supported",properties:{width:1,height:1},findings:[]}),
  validateBrowserImage:async()=>{},
  cleanLocally:mocks.clean,
}));
const policy={mode:"publish" as const,removeC2pa:true,removeColorProfile:false};
function file(name:string){const value=new File([new Uint8Array([1,2,3])],name,{type:"image/png"});Object.defineProperty(value,"arrayBuffer",{value:async()=>new Uint8Array([1,2,3]).buffer});return value;}
describe("cleaning and billing coordination",()=>{
  beforeEach(()=>{mocks.usage.mockReset().mockResolvedValue({allowZip:true});mocks.clean.mockReset().mockImplementation(async()=>({clean:{output:new ArrayBuffer(8)},verification:{items:[],encodedPayloadPreserved:true,orientationPreserved:true,dimensionsChanged:false,iccPreserved:true,transparencyPreserved:true}}));});
  it("reserves one batch for multiple images and confirms only after every output passes",async()=>{const {result}=renderHook(()=>useLocalWorkspace());await act(()=>result.current.addFiles([file("a.png"),file("b.png")],"file",policy));expect(mocks.usage.mock.calls.map(c=>[c[1],c[2]])).toEqual([["reserve","batch"],["complete",undefined]]);expect(mocks.clean).toHaveBeenCalledTimes(2);expect(result.current.files.every(f=>f.status==="ready")).toBe(true);});
  it("restores allowance and withholds partial results when one image fails",async()=>{mocks.clean.mockRejectedValueOnce(new Error("test processing failure"));const {result}=renderHook(()=>useLocalWorkspace());await act(()=>result.current.addFiles([file("a.png"),file("b.png")],"file",policy));expect(mocks.usage.mock.calls.map(c=>c[1])).toEqual(["reserve","release"]);expect(result.current.files.some(f=>f.cleaned)).toBe(false);expect(result.current.notice).toContain("did not finish");});
  it("does not process or offer paid output when the server rejects a reservation",async()=>{mocks.usage.mockRejectedValueOnce(new Error("Daily allowance exhausted"));const {result}=renderHook(()=>useLocalWorkspace());await act(()=>result.current.addFiles([file("a.png")],"file",policy));expect(mocks.clean).not.toHaveBeenCalled();expect(result.current.files[0].scan).toBeDefined();expect(result.current.files[0].cleaned).toBeUndefined();expect(result.current.notice).toContain("Daily allowance exhausted");});
  it("keeps local results through a lost confirmation response and retries the same task",async()=>{mocks.usage.mockResolvedValueOnce({allowZip:false}).mockRejectedValueOnce(new Error("Network unavailable")).mockResolvedValueOnce({});const {result}=renderHook(()=>useLocalWorkspace());await act(()=>result.current.addFiles([file("a.png")],"file",policy));expect(result.current.confirmationPending).toBe(true);expect(result.current.files[0].status).toBe("verifying");expect(result.current.files[0].cleaned).toBeDefined();await act(()=>result.current.retryConfirmation());expect(result.current.files[0].status).toBe("ready");expect(mocks.clean).toHaveBeenCalledOnce();expect(mocks.usage.mock.calls[1][0]).toBe(mocks.usage.mock.calls[2][0]);expect(result.current.confirmationPending).toBe(false);});
  it("keeps inspection free",async()=>{const {result}=renderHook(()=>useLocalWorkspace());await act(()=>result.current.addFiles([file("inspect.png")],"file"));expect(result.current.files[0].scan).toBeDefined();expect(mocks.usage).not.toHaveBeenCalled();expect(mocks.clean).not.toHaveBeenCalled();});
});
