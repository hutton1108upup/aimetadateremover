import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "./core";
import { resolveAuthConfig, type AuthEnvironment } from "./config";

export async function authRuntime() {
  const {env}=await getCloudflareContext({async:true});
  const bindings=env as CloudflareEnv & AuthEnvironment;
  const config=resolveAuthConfig(bindings);
  return {config,getAuth:()=>createAuth(bindings.AUTH_DB,bindings)};
}

export function privateResponse(response:Response) {
  const headers=new Headers(response.headers);
  headers.set("Cache-Control","private, no-store, max-age=0");
  headers.set("Pragma","no-cache");
  headers.set("X-Robots-Tag","noindex, nofollow");
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
