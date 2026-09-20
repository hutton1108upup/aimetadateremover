import { describe, expect, it } from "vitest";
import { hasC2paMarker, mapManifestStore, verifyC2paLocal } from "./verify";
describe("C2PA browser boundary", () => {
  it("returns not_present for an empty buffer", async () => {
    const result = await verifyC2paLocal(new ArrayBuffer(0), "png");
    expect(result.status).toBe("not_present");
    expect(result.summary).toMatch(/marker/i);
  });
  it("returns unsupported for a marked asset outside a browser", async () => {
    const result = await verifyC2paLocal(new TextEncoder().encode("JUMBF c2pa").buffer, "png");
    expect(result.status).toBe("unsupported");
  });
  it("preflights supported marker bytes without loading WASM for ordinary files", () => {
    expect(hasC2paMarker(new TextEncoder().encode("plain png bytes"))).toBe(false);
    expect(hasC2paMarker(new TextEncoder().encode("JUMBF c2pa"))).toBe(true);
    expect(mapManifestStore({ validation_state: "Valid", active_manifest: "m", manifests: { m: { signature_info: { issuer: "Example", time: "2026-09-20" } } } }).status).toBe("valid_integrity");
    expect(mapManifestStore({ validation_state: "Trusted" }).status).toBe("valid_integrity");
    expect(mapManifestStore({ validation_state: "Invalid", validation_status: ["claim invalid"] }).status).toBe("invalid_or_tampered");
    expect(mapManifestStore({}).status).toBe("present_untrusted_or_unknown");
  });
});
