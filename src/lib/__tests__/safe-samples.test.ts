// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createBatchSampleFiles } from "../safe-samples";
import { scanImage } from "../image-metadata-core/scan";
import { cleanImage } from "../image-metadata-core/clean";
import { verifyClean } from "../image-metadata-core/verify";

describe("synthetic batch results", () => {
  it("produces the advertised cleaned, unchanged and review-needed copies without changing image data", async () => {
    const policy = { mode: "publish" as const, removeC2pa: true, removeColorProfile: false };
    const outcomes: string[] = [];
    for (const file of createBatchSampleFiles()) {
      const original = await file.arrayBuffer();
      const scan = await scanImage(original);
      const cleaned = await cleanImage(original, policy);
      expect(cleaned.output).toBeDefined();
      const result = await verifyClean(scan, cleaned.output!, policy, original);
      expect(result.encodedPayloadPreserved).toBe(true);
      expect(result.dimensionsChanged).toBe(false);
      const unresolved = result.items.some(item => !["removed", "preserved"].includes(item.after));
      const removed = result.items.some(item => item.after === "removed");
      outcomes.push(unresolved ? "review_needed" : removed ? "cleaned" : "unchanged");
      if (!removed) expect(Buffer.from(cleaned.output!)).toEqual(Buffer.from(original));
      if (unresolved) {
        expect(removed).toBe(true);
        expect(result.outputScan.findings.some(finding => finding.id.startsWith("unsupported-"))).toBe(true);
      }
    }
    expect(outcomes).toEqual(["cleaned", "unchanged", "review_needed"]);
  });
});
