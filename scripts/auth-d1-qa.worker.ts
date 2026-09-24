// Test-only worker: never used by the Next/OpenNext application entrypoint.
import { createAuth } from "../src/lib/auth/core";
import type { AuthEnvironment } from "../src/lib/auth/config";
import { makeSignature } from "better-auth/crypto";

const qaWorker = {
  async fetch(request:Request,env:CloudflareEnv & Required<AuthEnvironment>) {
    const auth=createAuth(env.AUTH_DB,env);
    const ctx=await auth.$context;
    if(new URL(request.url).pathname==="/fixture") {
      const {user}=await ctx.internalAdapter.createOAuthUser({name:"D1 Test User",email:"d1-qa@example.invalid",emailVerified:true},{providerId:"google",accountId:"d1-test-provider"});
      const session=await ctx.internalAdapter.createSession(user.id);
      const signed=encodeURIComponent(`${session.token}.${await makeSignature(session.token,env.AUTH_SECRET)}`);
      return Response.json({id:user.id,cookie:`${ctx.authCookies.sessionToken.name}=${signed}`});
    }
    return auth.handler(request);
  },
};

export default qaWorker;
