import { describe, expect, it } from "vitest";
import { passesPolicyChecks, type LocalImage } from "../use-local-workspace";
import type { VerificationResult } from "@/lib/image-metadata-core/types";

const verification = (after: "removed" | "preserved" | "unsupported" | "still_present" | "review_needed"): VerificationResult => ({
  items: [{ label: "field", before: "found", after }],
  outputScan: { format: "png", findings: [], properties: {}, warnings: [], cleanSupport: "supported" },
  encodedPayloadReencoded: false,
});
const image = (after: Parameters<typeof verification>[0]): LocalImage => ({
  id: "id", file: new File([], "sample.png"), source: "sample", status: "ready", cleaned: new ArrayBuffer(1), verification: verification(after),
});

describe("ZIP eligibility", () => {
  it("includes removed or intentionally preserved fields, but excludes unresolved states", () => {
    expect(passesPolicyChecks(image("removed"))).toBe(true);
    expect(passesPolicyChecks(image("preserved"))).toBe(true);
    for (const state of ["unsupported", "still_present", "review_needed"] as const) expect(passesPolicyChecks(image(state))).toBe(false);
  });
  it("excludes missing output, missing verification and unconfirmed results", () => {
    const file = image("removed");
    expect(passesPolicyChecks({ ...file, cleaned: undefined })).toBe(false);
    expect(passesPolicyChecks({ ...file, verification: undefined })).toBe(false);
    expect(passesPolicyChecks({ ...file, status: "verifying" })).toBe(false);
  });
});
