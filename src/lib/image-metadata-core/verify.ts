import { scanImage } from "./scan";
import type { CleanPolicy, ScanResult, VerificationResult } from "./types";

function shouldRemove(category: ScanResult["findings"][number]["category"], policy: CleanPolicy) {
  if (category === "provenance") return policy.removeC2pa;
  if (category === "color") return policy.removeColorProfile;
  if (policy.mode === "ai_workflow") return category === "ai_workflow";
  if (policy.mode === "privacy") return category === "location";
  return !["structure", "camera", "color"].includes(category);
}

export async function verifyClean(before: ScanResult, output: ArrayBuffer, policy: CleanPolicy): Promise<VerificationResult> {
  const outputScan = await scanImage(output);
  const items = before.findings.map((finding) => {
    const stillPresent = outputScan.findings.some((candidate) => candidate.id === finding.id || (candidate.label === finding.label && candidate.rawKey === finding.rawKey));
    return {
      label: finding.label,
      before: "found" as const,
      after: (shouldRemove(finding.category, policy) ? (stillPresent ? "still_present" : "removed") : (stillPresent ? "preserved" : "review_needed")) as "removed" | "preserved" | "still_present" | "review_needed",
    };
  });
  return {
    items,
    outputScan,
    encodedPayloadReencoded: false,
    dimensionsChanged: before.properties.width !== undefined && outputScan.properties.width !== undefined
      ? before.properties.width !== outputScan.properties.width || before.properties.height !== outputScan.properties.height
      : undefined,
    iccPreserved: before.properties.hasIcc === true ? outputScan.properties.hasIcc === true : undefined,
    transparencyPreserved: before.properties.hasTransparency === true ? outputScan.properties.hasTransparency === true : undefined,
  };
}
