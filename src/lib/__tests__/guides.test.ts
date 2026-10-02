import { describe, expect, it } from "vitest";
import { guides, guideBySlug } from "../guides";
import { routeData } from "../publishing";
import { nextActionGroup } from "@/components/tool/finding-row";
import type { Finding } from "@/lib/image-metadata-core/types";

describe("technical guides and next actions", () => {
  it("contains the five new guides plus the existing publishing guide", () => {
    expect(guides.map((guide) => guide.slug)).toEqual([
      "chatgpt-dalle-image-metadata", "stable-diffusion-comfyui-metadata", "c2pa-content-credentials-explained", "exif-gps-privacy-before-sharing", "jpeg-png-webp-metadata-support",
      "image-metadata-before-publishing",
    ]);
    expect(guideBySlug("missing-guide")).toBeUndefined();
    expect(new Set(guides.map((guide) => guide.title)).size).toBe(6);
  });
  it.each([
    ["ai_workflow", "action", "clean"], ["location", "review", "clean"], ["provenance", "review", "review"], ["color", "informational", "keep"], ["structure", "review", "review"],
  ] as const)("maps %s to an evidence-bounded next action", (category, status, expected) => {
    const finding = { id: category, label: category, category, status, description: "", suggestedAction: "", removalImpact: "" } as Finding;
    expect(nextActionGroup(finding)).toBe(expected);
  });
  it("only marks explicit unsupported findings as unsupported", () => {
    const finding = { id: "unsupported-123", label: "Compressed text", category: "structure", status: "review", description: "", suggestedAction: "", removalImpact: "" } as Finding;
    expect(nextActionGroup(finding)).toBe("unsupported");
  });
  it("keeps article intent informational and distinct from transactional tool pages", () => {
    expect(guideBySlug("stable-diffusion-comfyui-metadata")?.h1).toBe("What metadata do Stable Diffusion and ComfyUI images contain?");
    expect(guideBySlug("jpeg-png-webp-metadata-support")?.h1).toBe("Can JPEG, PNG and WebP images contain metadata?");
    expect(guideBySlug("jpeg-png-webp-metadata-support")?.description).toContain("metadata structures");
    expect(guideBySlug("stable-diffusion-comfyui-metadata")?.updatedIso).toBe("2026-09-28");
    expect(guideBySlug("jpeg-png-webp-metadata-support")?.updatedIso).toBe("2026-09-28");
    expect(guideBySlug("image-metadata-before-publishing")?.updatedIso).toBe("2026-09-28");
    expect(routeData("/metadata-checker").h1).toContain("Checker");
    expect(routeData("/remove-metadata-from-png").h1).toContain("Remove Metadata");
    expect(guideBySlug("jpeg-png-webp-metadata-support")?.h1).not.toMatch(/clean/i);
  });
});
