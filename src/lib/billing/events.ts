// Actual Waffo sandbox deliveries reuse payload.id (an order/payment ID)
// across lifecycle events. Hash the verified message, not that business ID.
// Retries of the same message deduplicate; later lifecycle transitions do not.
export async function webhookReceiptKey(raw:string) {
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
  return `sha256:${Array.from(new Uint8Array(digest),value=>value.toString(16).padStart(2,"0")).join("")}`;
}
