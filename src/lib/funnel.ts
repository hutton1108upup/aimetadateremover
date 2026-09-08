// A bounded, browser-session log. No image identifiers or free-form values.
export type FunnelEventName = "select_files" | "scan_success" | "scan_failed" | "clean_success" | "clean_failed" | "verify_success" | "verify_review" | "download";
export type FunnelEvent = Readonly<Record<string,string> & {event:FunnelEventName}>;
const events:FunnelEvent[]=[];
const routes=new Set(["/","/workspace","/metadata-checker","/remove-metadata-from-png","/remove-ai-detection-from-image"]);
const errors=new Set(["invalid_file","malformed_container","malformed_exif","unsupported_exif","unsupported_thumbnail","metadata_too_large","png_crc_invalid","processing_timeout","pixel_limit","verification_failed","decode_failed"]);
export function clearFunnel() { events.length=0;if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("imagefinisher:funnel")); }
export function getFunnelEvents() { return events.map(e=>({...e})); }

export function trackFunnel(event:FunnelEventName, input:Record<string,unknown>={}) {
  const result:Record<string,string> & {event:FunnelEventName}={event};
  for(const [key,values] of Object.entries({format:["jpeg","png","webp"],source:["file","sample"],mode:["ai_workflow","privacy"],result:["verified","review_needed"],delivery:["single","zip"],device:["desktop","mobile"]})) {
    if(typeof input[key]==="string" && values.includes(input[key] as string)) result[key]=input[key] as string;
  }
  const count=Number(input.count), size=Number(input.size), duration=Number(input.duration);
  if(Number.isFinite(count) && count>0) result.count=count===1?"1":count<=10?"2-10":"11-30";
  if(Number.isFinite(size) && size>=0) result.size=size<1024*1024?"under_1mb":size<=10*1024*1024?"1-10mb":"over_10mb";
  if(Number.isFinite(duration) && duration>=0) result.duration=duration<1000?"under_1s":duration<5000?"1-5s":duration<15000?"5-15s":"over_15s";
  if(typeof input.error==="string") result.error=errors.has(input.error)?input.error:"processing_failed";
  const path=typeof window!=="undefined"?window.location.pathname:"/";
  result.path=routes.has(path)?path:"other";
  const safe=Object.freeze(result);
  events.push(safe);if(events.length>200) events.shift();
  // Receiver integration must consume only this vetted payload. No third-party
  // script, cookies, persistence, replay, network transport or auto-capture.
  if(typeof window!=="undefined") window.dispatchEvent(new CustomEvent("imagefinisher:funnel",{detail:safe}));
}
