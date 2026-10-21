export class BillingError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}
export function json(data: unknown, status = 200, headers?: HeadersInit) {
  const result = new Headers(headers);
  result.set("Cache-Control", "private, no-store"); result.set("X-Robots-Tag", "noindex, nofollow");
  return Response.json(data, { status, headers: result });
}
export function sameOrigin(request: Request, origin: string) {
  if (request.headers.get("origin") !== origin || request.headers.get("sec-fetch-site") === "cross-site") throw new BillingError(403,"ORIGIN_REJECTED","Please use this website to manage billing.");
}
export async function limitedText(request: Request, max: number) {
  if (Number(request.headers.get("content-length")) > max) throw new BillingError(413,"BODY_TOO_LARGE","Request too large.");
  const reader = request.body?.getReader(); if (!reader) return "";
  const chunks: Uint8Array[] = []; let total = 0;
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; total += value.length; if (total > max) { await reader.cancel(); throw new BillingError(413,"BODY_TOO_LARGE","Request too large."); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}
export async function bodyJson(request: Request): Promise<Record<string,unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new BillingError(415,"INVALID_BODY","Please use the billing form.");
  try { const body: unknown = JSON.parse(await limitedText(request,4096)); if (!body || Array.isArray(body) || typeof body !== "object") throw new Error(); return body as Record<string,unknown>; }
  catch (error) { if (error instanceof BillingError) throw error; throw new BillingError(400,"INVALID_BODY","Invalid request."); }
}
export function failure(error: unknown) {
  if (error instanceof BillingError) return json({ code: error.code, error: error.message }, error.status);
  // Never serialize provider exceptions, request payloads, email addresses, or credentials.
  const diagnostic=error instanceof Error ? error.message.replace(/-----BEGIN[\s\S]*?-----END[^-]+-----/g,"[redacted]").replace(/[A-Za-z0-9_+\/-]{24,}={0,2}/g,"[redacted]").replace(/[^\s]+@[^\s]+/g,"[email redacted]").slice(0,300) : "unknown";
  console.error("billing_request_failed",diagnostic);
  return json({ code: "BILLING_UNAVAILABLE", error: "Billing could not be verified. Please retry shortly; no additional purchase is needed." },503);
}
