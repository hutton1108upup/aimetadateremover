// Adapted from the licensed MkSaaS Google auth configuration. Deliberately
// excludes its admin, password, newsletter, billing and signup-credit hooks.
import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { resolveAuthConfig, type AuthEnvironment } from "./config";

function buildAuth(database:D1Database,config:ReturnType<typeof resolveAuthConfig>) {
  return betterAuth({
    appName:"ImageFinisher",baseURL:config.baseURL,secret:config.secret,
    trustedOrigins:[config.baseURL],
    database:drizzleAdapter(drizzle(database,{schema}),{provider:"sqlite",schema,transaction:false}),
    emailAndPassword:{enabled:false},
    socialProviders:{google:{clientId:config.clientId,clientSecret:config.clientSecret,scope:["openid","email","profile"]}},
    account:{accountLinking:{enabled:false}},
    rateLimit:{enabled:true},
    session:{expiresIn:60*60*24*7,updateAge:60*60*24,cookieCache:{enabled:false}},
    advanced:{database:{generateId:()=>crypto.randomUUID()},ipAddress:{disableIpTracking:true}},
    logger:{disabled:true},
    onAPIError:{errorURL:`${config.baseURL}/auth/complete?error=auth_failed`},
  });
}

type AuthInstance=ReturnType<typeof buildAuth>;
const instances=new WeakMap<D1Database,{config:ReturnType<typeof resolveAuthConfig>;auth:AuthInstance}>();

export function createAuth(database:D1Database,env:AuthEnvironment) {
  const config=resolveAuthConfig(env);
  if(!config.ready)throw new Error("Google sign-in is not configured.");
  const previous=instances.get(database);
  if(previous && previous.config.baseURL===config.baseURL && previous.config.secret===config.secret && previous.config.clientId===config.clientId && previous.config.clientSecret===config.clientSecret)return previous.auth;
  // Reuse only the configured adapter/router. Better Auth creates the endpoint
  // context per call; cookies, sessions and users are never cached here.
  // A different D1 binding or changed credentials always creates a new instance.
  const auth=buildAuth(database,config);
  instances.set(database,{config,auth});
  void auth.$context.catch(()=>{if(instances.get(database)?.auth===auth)instances.delete(database);});
  return auth;
}
