import { authRuntime, privateResponse } from "@/lib/auth/server";
export const dynamic="force-dynamic";

async function handle(request:Request) {
  try {
    const {config,getAuth}=await authRuntime();
    if(!config.ready) return privateResponse(Response.json({code:"AUTH_NOT_CONFIGURED",message:"Google sign-in is not configured yet."},{status:503}));
    return privateResponse(await getAuth().handler(request));
  }catch{
    return privateResponse(Response.json({code:"AUTH_UNAVAILABLE",message:"Sign-in is temporarily unavailable. Please try again."},{status:503}));
  }
}
export {handle as GET,handle as POST};
