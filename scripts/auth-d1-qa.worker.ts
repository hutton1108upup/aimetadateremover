// Test-only worker: never used by the Next/OpenNext application entrypoint.
import { createAuth } from "../src/lib/auth/core";
import type { AuthEnvironment } from "../src/lib/auth/config";
import { makeSignature } from "better-auth/crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { handleWorkerApi } from "../src/lib/worker-api";

// Match OpenNext's isolated binding context while testing the direct API path.
const contexts=new AsyncLocalStorage<{env:CloudflareEnv & Required<AuthEnvironment>}>();
Object.defineProperty(globalThis,Symbol.for("__cloudflare-context__"),{get:()=>contexts.getStore()});

const qaWorker = {
  async fetch(request:Request,env:CloudflareEnv & Required<AuthEnvironment>) {
    return contexts.run({env},async()=>{
    const auth=createAuth(env.AUTH_DB,env);
    const ctx=await auth.$context;
    const pathname=new URL(request.url).pathname;
    if(pathname==="/fixture" || pathname==="/fixture-bob") {
      const second=pathname==="/fixture-bob";
      const {user}=await ctx.internalAdapter.createOAuthUser({name:second?"D1 Second User":"D1 Test User",email:second?"d1-bob@example.invalid":"d1-qa@example.invalid",emailVerified:true},{providerId:"google",accountId:second?"d1-second-provider":"d1-test-provider"});
      const session=await ctx.internalAdapter.createSession(user.id);
      const signed=encodeURIComponent(`${session.token}.${await makeSignature(session.token,env.AUTH_SECRET)}`);
      return Response.json({id:user.id,cookie:`${ctx.authCookies.sessionToken.name}=${signed}`});
    }
    return await handleWorkerApi(request) ?? new Response(null,{status:404});
    });
  },
};

export default qaWorker;
