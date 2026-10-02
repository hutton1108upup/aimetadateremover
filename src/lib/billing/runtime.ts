import { getCloudflareContext } from "@opennextjs/cloudflare";
import { authRuntime } from "@/lib/auth/server";
import { billingConfig, type BillingEnvironment } from "./config";
import { BillingError } from "./http";
export async function billingRuntime(request: Request) {
  const {env:bindings}=await getCloudflareContext({async:true});
  const env=bindings as CloudflareEnv & BillingEnvironment;
  const config=billingConfig(env);
  const auth=await authRuntime();
  const session=auth.config.ready ? await auth.getAuth().api.getSession({headers:request.headers}) : null;
  return {env,config,db:env.AUTH_DB.withSession("first-primary"),user:session?.user ?? null};
}
export function requireUser(user: Awaited<ReturnType<typeof billingRuntime>>["user"]) {
  if (!user || !user.emailVerified) throw new BillingError(401,"SIGN_IN_REQUIRED","Sign in with Google to manage your subscription.");
  return user;
}
