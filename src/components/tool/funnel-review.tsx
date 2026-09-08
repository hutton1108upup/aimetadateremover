"use client";
import { useSyncExternalStore } from "react";
import { clearFunnel, getFunnelEvents, type FunnelEvent } from "@/lib/funnel";

function subscribe(callback:()=>void) {window.addEventListener("imagefinisher:funnel",callback);return ()=>window.removeEventListener("imagefinisher:funnel",callback);}
function snapshot() {
  return ["localhost","127.0.0.1","[::1]"].includes(window.location.hostname) && new URLSearchParams(window.location.search).get("review")==="1" ? JSON.stringify(getFunnelEvents()) : "";
}
export function FunnelReview() {
  const json=useSyncExternalStore(subscribe,snapshot,()=>"");
  if(!json)return null;
  const events=JSON.parse(json) as FunnelEvent[];
  return <aside className="funnel-review" aria-label="Local funnel review"><h2>Local funnel review</h2><p>Review build only · last 200 events in this page session · no remote receiver configured.</p><button className="button secondary" onClick={clearFunnel}>Clear event log</button><p>{events.length} events · {events.filter(e=>e.event==="download" && e.result==="verified" && e.source==="file").length} verified file download actions</p><pre>{JSON.stringify(events,null,2)}</pre></aside>;
}
