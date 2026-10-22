import { sanitizeFunnelEvent } from "./funnel";

export type AnalyticsSender = (name: string, parameters: Record<string, string>) => void;

export function subscribeToFunnelAnalytics(send: AnalyticsSender) {
  function receive(event: Event) {
    const safe = sanitizeFunnelEvent((event as CustomEvent<unknown>).detail);
    if (!safe) return;
    const { event: name, ...parameters } = safe;
    // Query strings and fragment identifiers are not event data.
    send(`metadata_${name}`, {
      ...parameters,
      page_location: `https://aimetadataremover.pro${safe.path === "other" ? "/" : safe.path}`,
    });
  }
  window.addEventListener("imagefinisher:funnel", receive);
  return () => window.removeEventListener("imagefinisher:funnel", receive);
}

export function analyticsAllowed(hostname: string) {
  return hostname === "aimetadataremover.pro" || hostname === "www.aimetadataremover.pro";
}
