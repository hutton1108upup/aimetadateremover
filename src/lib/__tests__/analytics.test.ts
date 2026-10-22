import { describe, expect, it, vi } from "vitest";
import { analyticsAllowed, subscribeToFunnelAnalytics } from "../analytics";
import { articlePaths, trackFunnel } from "../funnel";
import { guides } from "../guides";

describe("analytics transport privacy boundary", () => {
  it("forwards coarse outcomes without raw file data or arbitrary event details", () => {
    const send = vi.fn();
    const stop = subscribeToFunnelAnalytics(send);
    try {
      trackFunnel("verify_review", { source: "file", result: "review_needed", format: "png", filename: "PRIVATE.png", prompt: "PRIVATE", gps: "PRIVATE" });
      window.dispatchEvent(new CustomEvent("imagefinisher:funnel", { detail: { event: "download_initiated", source: "sample", path: "/?private=PRIVATE", target: "https://PRIVATE", count: "PRIVATE", email: "PRIVATE", order_id: "PRIVATE" } }));
      window.dispatchEvent(new CustomEvent("imagefinisher:funnel", { detail: { event: "PRIVATE" } }));
      expect(send).toHaveBeenCalledTimes(2);
      expect(send.mock.calls[0][0]).toBe("metadata_verify_review");
      expect(send.mock.calls[0][1]).toMatchObject({ source: "file", result: "review_needed" });
      expect(send.mock.calls[1][1]).toMatchObject({ source: "sample", path: "other", page_location: "https://aimetadataremover.pro/" });
      expect(JSON.stringify(send.mock.calls)).not.toContain("PRIVATE");
    } finally { stop(); }
    trackFunnel("clean_success");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("only enables remote analytics on the production hostname", () => {
    expect(analyticsAllowed("aimetadataremover.pro")).toBe(true);
    for (const host of ["localhost", "127.0.0.1", "preview.workers.dev", "aimetadataremover.pro.example.com"]) expect(analyticsAllowed(host)).toBe(false);
  });

  it("limits article attribution to published routes", () => {
    expect([...articlePaths].sort()).toEqual(guides.map(guide => `/blog/${guide.slug}`).sort());
  });
});
