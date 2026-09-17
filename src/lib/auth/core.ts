// Adapted from the licensed MkSaaS Google auth configuration. Deliberately
// excludes its admin, password, newsletter, billing and signup-credit hooks.
import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { resolveAuthConfig, type AuthEnvironment } from "./config";

export function createAuth(database: D1Database, env: AuthEnvironment) {
  const config=resolveAuthConfig(env);
  if(!config.ready) throw new Error("Google sign-in is not configured.");
  return betterAuth({
    appName:"ImageFinisher",baseURL:config.baseURL,secret:config.secret,
    trustedOrigins:[config.baseURL],
    database:drizzleAdapter(drizzle(database,{schema}),{provider:"sqlite",schema,transaction:false}),
    emailAndPassword:{enabled:false},
    socialProviders:{google:{clientId:config.clientId,clientSecret:config.clientSecret,scope:["openid","email","profile"]}},
    account:{accountLinking:{enabled:false}},
    session:{expiresIn:60*60*24*7,updateAge:60*60*24,cookieCache:{enabled:false}},
    advanced:{database:{generateId:()=>crypto.randomUUID()},ipAddress:{disableIpTracking:true}},
    logger:{disabled:true},
    onAPIError:{errorURL:`${config.baseURL}/auth/complete?error=auth_failed`},
  });
}
