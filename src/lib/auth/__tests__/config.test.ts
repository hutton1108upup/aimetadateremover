import { describe, expect, it } from "vitest";
import { resolveAuthConfig } from "../config";

const values={AUTH_BASE_URL:"http://localhost:3180",AUTH_SECRET:"a".repeat(48),GOOGLE_CLIENT_ID:"demo.apps.googleusercontent.com",GOOGLE_CLIENT_SECRET:"demo-secret"};
describe("Google auth configuration",()=>{
  it("uses an explicit local origin independent of SEO canonical",()=>{
    expect(resolveAuthConfig(values)).toMatchObject({baseURL:"http://localhost:3180",ready:true});
  });
  it("keeps unconfigured auth recoverable without inventing credentials",()=>{
    expect(resolveAuthConfig({}).ready).toBe(false);
    expect(resolveAuthConfig({...values,GOOGLE_CLIENT_SECRET:""}).ready).toBe(false);
  });
  it.each(["https://user:pass@example.com","https://example.com/path","https://example.com?next=evil","http://example.com","https://example.com#secret"])("rejects unsafe origin %s",baseURL=>{
    expect(()=>resolveAuthConfig({...values,AUTH_BASE_URL:baseURL})).toThrow();
  });
  it("requires a strong secret and only configured Google credentials",()=>{
    expect(resolveAuthConfig({...values,AUTH_SECRET:"short"}).ready).toBe(false);
  });
});
