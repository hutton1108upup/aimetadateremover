export type C2paStatus = "not_present" | "valid_integrity" | "invalid_or_tampered" | "present_untrusted_or_unknown" | "unsupported" | "error";
export interface C2paVerification { status: C2paStatus; issuer?: string; time?: string; manifestLabel?: string; summary: string; failures: string[]; }
export interface ManifestStoreLike { active_manifest?: string | null; manifests?: Record<string, { signature_info?: { issuer?: string | null; time?: string | null } | null }>; validation_state?: "Invalid" | "Valid" | "Trusted" | null; validation_status?: unknown[] | null; }

function mimeFor(format: string) { return format === "jpeg" ? "image/jpeg" : format === "png" ? "image/png" : format === "webp" ? "image/webp" : format; }
export function hasC2paMarker(bytes: ArrayBuffer | Uint8Array) { const text = new TextDecoder("latin1").decode(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)); return /caBX|C2PA|JUMBF|jumb/i.test(text); }
export function mapManifestStore(store: ManifestStoreLike): C2paVerification {
  const active = store.active_manifest ? store.manifests?.[store.active_manifest] : undefined;
  const signature = active?.signature_info;
  const failures = (store.validation_status ?? []).map((item) => typeof item === "string" ? item : JSON.stringify(item));
  const common = { issuer: signature?.issuer ?? undefined, time: signature?.time ?? undefined, manifestLabel: store.active_manifest ?? undefined, failures };
  if (store.validation_state === "Invalid") return { ...common, status: "invalid_or_tampered", summary: "The manifest was found, but its integrity validation failed." };
  if (store.validation_state === "Valid" || store.validation_state === "Trusted") return { ...common, status: "valid_integrity", summary: "The C2PA manifest integrity is valid. Issuer trust was not asserted because no trust anchors are configured." };
  return { ...common, status: "present_untrusted_or_unknown", summary: "A C2PA manifest is present, but its validation state is unknown." };
}

/** Browser-only, local C2PA integrity inspection. No trust anchors are configured here. */
export async function verifyC2paLocal(buffer: ArrayBuffer, format: string, timeoutMs = 12000): Promise<C2paVerification> {
  if (!hasC2paMarker(buffer)) return { status: "not_present", summary: "No C2PA marker was found in this file.", failures: [] };
  if (typeof window === "undefined" || typeof Worker === "undefined") return { status: "unsupported", summary: "C2PA verification is available in a browser session only.", failures: [] };
  const task = (async () => {
    const [{ createC2pa }, { Reader }] = await Promise.all([import("@contentauth/c2pa-web/inline"), import("@contentauth/c2pa-web/inline")]);
    const c2pa = await createC2pa();
    let reader: Awaited<ReturnType<typeof Reader.fromBlob>> = null;
    try {
      reader = await Reader.fromBlob(c2pa, mimeFor(format), new Blob([buffer], { type: mimeFor(format) }));
      if (!reader) return { status: "not_present", summary: "No C2PA manifest was found in this file.", failures: [] } satisfies C2paVerification;
      const store = await reader.manifestStore();
      return mapManifestStore(store);
    } finally { await reader?.free(); c2pa.dispose(); }
  })();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<C2paVerification>((resolve) => { timer = setTimeout(() => resolve({ status: "error", summary: "C2PA verification timed out; the ordinary metadata scan is still available.", failures: [] }), timeoutMs); });
  task.then(() => { if (timer) clearTimeout(timer); }, () => { if (timer) clearTimeout(timer); });
  try { return await Promise.race([task, timeout]); }
  catch (error) { return { status: "error", summary: "C2PA verification could not read this file; the ordinary metadata scan is still available.", failures: [error instanceof Error ? error.message : "Unknown verifier error"] }; }
}
