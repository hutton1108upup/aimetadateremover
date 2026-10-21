import { GET as authGet, POST as authPost } from "../app/api/auth/[...all]/route";
import { GET as authStatus } from "../app/api/auth/status/route";
import { GET as account } from "../app/api/account/route";
import { GET as billingStatus } from "../app/api/billing/status/route";
import { POST as checkout } from "../app/api/billing/checkout/route";
import { POST as cancel } from "../app/api/billing/cancel/route";
import { POST as usage } from "../app/api/billing/usage/route";
import { POST as webhook } from "../app/api/billing/webhook/route";

type Handler=(request:Request)=>Promise<Response>;
const routes:Record<string,Partial<Record<"GET"|"POST",Handler>>>={
  "/api/auth/status":{GET:authStatus},
  "/api/account":{GET:account},
  "/api/billing/status":{GET:billingStatus},
  "/api/billing/checkout":{POST:checkout},
  "/api/billing/cancel":{POST:cancel},
  "/api/billing/usage":{POST:usage},
  "/api/billing/webhook":{POST:webhook},
};

// The identical route handlers run inside OpenNext's request-scoped Cloudflare
// context, without initializing Next's page renderer for each private API call.
export async function handleWorkerApi(request:Request):Promise<Response|null> {
  const pathname=new URL(request.url).pathname;
  const route=routes[pathname] ?? (pathname.startsWith("/api/auth/")?{GET:authGet,POST:authPost}:null);
  if(!route)return null;
  const allowed=[...(route.GET?["GET","HEAD"]:[]),...(route.POST?["POST"]:[]),"OPTIONS"].join(", ");
  const headers={Allow:allowed,"Cache-Control":"private, no-store","X-Robots-Tag":"noindex, nofollow"};
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers});
  const method=request.method==="HEAD"?"GET":request.method;
  const handler=method==="GET"?route.GET:method==="POST"?route.POST:undefined;
  if(!handler)return new Response(null,{status:405,headers});
  const response=await handler(request);
  return request.method==="HEAD"?new Response(null,response):response;
}
