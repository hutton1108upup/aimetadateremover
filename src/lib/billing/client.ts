export async function usageRequest(id:string,action:"reserve"|"complete"|"release",kind?:"single"|"batch",imageCount?:number) {
  const response=await fetch("/api/billing/usage",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,action,...(kind?{kind,imageCount}:{})}),cache:"no-store",keepalive:action==="release"});
  const data=await response.json() as {error?:string;bypass?:boolean;allowZip?:boolean};
  if (!response.ok) throw new Error(data.error || "Usage could not be confirmed. Please retry.");
  window.dispatchEvent(new Event("imagefinisher:usage-changed"));
  return data;
}
