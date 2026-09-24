import { authRuntime, privateResponse } from "@/lib/auth/server";
export const dynamic="force-dynamic";
export async function GET(request:Request) {
  try {
    const {config,getAuth}=await authRuntime();
    if(!config.ready) return privateResponse(Response.json({code:"UNAUTHORIZED"},{status:401}));
    const session=await getAuth().api.getSession({headers:request.headers});
    if(!session) return privateResponse(Response.json({code:"UNAUTHORIZED"},{status:401}));
    return privateResponse(Response.json({user:{id:session.user.id,name:session.user.name,email:session.user.email}}));
  }catch{return privateResponse(Response.json({code:"AUTH_UNAVAILABLE"},{status:503}));}
}
