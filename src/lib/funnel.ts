// Only these categories can reach the optional analytics receiver.
const eventNames = ["select_files", "scan_success", "scan_failed", "clean_success", "clean_failed", "verify_success", "verify_review", "download_initiated", "article_view", "tool_link_click", "checkout_started", "paid_checkout_return"] as const;
export type FunnelEventName = typeof eventNames[number];
export type FunnelEvent = Readonly<Record<string, string> & { event: FunnelEventName }>;
const events: FunnelEvent[] = [];
export const articlePaths = new Set([
  "remove-author-metadata-from-pdf-before-sharing", "remove-author-last-modified-by-word-document",
  "why-edited-photos-get-ai-info-labels", "chatgpt-dalle-image-metadata", "stable-diffusion-comfyui-metadata",
  "c2pa-content-credentials-explained", "exif-gps-privacy-before-sharing", "jpeg-png-webp-metadata-support",
  "image-metadata-before-publishing", "batch-remove-image-metadata-client-delivery",
].map(slug => `/blog/${slug}`));
export const toolPaths = new Set(["/", "/workspace", "/metadata-checker", "/remove-metadata-from-png", "/remove-ai-detection-from-image", "/batch-metadata-remover", "/comfyui-workflow-remover", "/stable-diffusion-metadata-remover", "/remove-metadata-from-jpeg", "/c2pa-metadata-checker", "/remove-gps-from-photo", "/pdf-metadata-remover", "/docx-metadata-remover"]);
const routes = new Set([...toolPaths, ...articlePaths, "/pricing", "/account/billing"]);
const errors = new Set(["invalid_file", "malformed_container", "malformed_exif", "unsupported_exif", "unsupported_thumbnail", "metadata_too_large", "png_crc_invalid", "processing_timeout", "pixel_limit", "verification_failed", "decode_failed"]);
const categories: Record<string, readonly string[]> = {
  format: ["jpeg", "png", "webp"], source: ["file", "sample"], mode: ["ai_workflow", "privacy", "publish"],
  result: ["verified", "review_needed"], delivery: ["single", "zip"], device: ["desktop", "mobile"], plan: ["monthly", "yearly"],
  count: ["1", "2-10", "11-30"], size: ["under_1mb", "1-10mb", "over_10mb"], duration: ["under_1s", "1-5s", "5-15s", "over_15s"],
};

// Revalidate at the transport boundary; never trust arbitrary CustomEvent details.
export function sanitizeFunnelEvent(input: unknown): FunnelEvent | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  if (!eventNames.includes(value.event as FunnelEventName)) return null;
  const result: Record<string, string> & { event: FunnelEventName } = { event: value.event as FunnelEventName };
  for (const [key, values] of Object.entries(categories)) {
    if (typeof value[key] === "string" && values.includes(value[key])) result[key] = value[key];
  }
  result.path = typeof value.path === "string" && routes.has(value.path) ? value.path : "other";
  if (typeof value.error === "string") result.error = errors.has(value.error) ? value.error : "processing_failed";
  if (typeof value.article === "string" && articlePaths.has(value.article)) result.article = value.article;
  if (typeof value.target === "string" && toolPaths.has(value.target)) result.target = value.target;
  return Object.freeze(result);
}

export function clearFunnel() { events.length = 0; if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("imagefinisher:funnel")); }
export function getFunnelEvents() { return events.map(event => ({ ...event })); }

export function trackFunnel(event: FunnelEventName, input: Record<string, unknown> = {}) {
  const value: Record<string, unknown> = { ...input, event };
  const count = Number(input.count), size = Number(input.size), duration = Number(input.duration);
  if (Number.isFinite(count) && count > 0) value.count = count === 1 ? "1" : count <= 10 ? "2-10" : "11-30";
  if (Number.isFinite(size) && size >= 0) value.size = size < 1024 * 1024 ? "under_1mb" : size <= 10 * 1024 * 1024 ? "1-10mb" : "over_10mb";
  if (Number.isFinite(duration) && duration >= 0) value.duration = duration < 1000 ? "under_1s" : duration < 5000 ? "1-5s" : duration < 15000 ? "5-15s" : "over_15s";
  value.path = typeof window !== "undefined" ? window.location.pathname : "/";
  const safe = sanitizeFunnelEvent(value);
  if (!safe) return;
  events.push(safe); if (events.length > 200) events.shift();
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("imagefinisher:funnel", { detail: safe }));
}
