import { authRuntime, privateResponse } from "@/lib/auth/server";
export const dynamic="force-dynamic";
export async function GET() {
  try {const {config}=await authRuntime();return privateResponse(Response.json({enabled:config.ready}));}
  catch {return privateResponse(Response.json({enabled:false}));}
}
