import { scanImage } from "./scan";
import { parsePngChunks } from "./scan/png";
import { parseJpegSegments } from "./scan/jpeg";
import type { CleanPolicy, ScanResult, VerificationResult } from "./types";

function shouldRemove(category: ScanResult["findings"][number]["category"], policy: CleanPolicy) {
  if (category === "provenance") return policy.removeC2pa;
  if (category === "color") return policy.removeColorProfile;
  if (policy.mode === "ai_workflow") return category === "ai_workflow";
  if (policy.mode === "privacy") return category === "location";
  return !["structure", "camera", "color"].includes(category);
}

function equalParts(a: Uint8Array[], b: Uint8Array[]) {
  return a.length === b.length && a.every((part,index)=>part.length===b[index].length && part.every((byte,i)=>byte===b[index][i]));
}

function protectedParts(buffer: ArrayBuffer, format: ScanResult["format"], colorOnly=false) {
  const bytes=new Uint8Array(buffer);
  if(format === "png") return parsePngChunks(bytes).filter(c=>colorOnly ? c.type === "iCCP" : !["tEXt","zTXt","iTXt","eXIf","caBX","iCCP"].includes(c.type)).map(c=>bytes.subarray(c.start,c.end));
  if(format === "jpeg") {
    const {segments,imageDataStart}=parseJpegSegments(bytes);
    const parts=segments.filter(s=>colorOnly ? s.marker === 0xe2 : !(s.marker>=0xe0 && s.marker<=0xef) && s.marker!==0xfe).map(s=>bytes.subarray(s.start,s.end));
    return colorOnly ? parts : [...parts,bytes.subarray(imageDataStart)];
  }
  return [bytes];
}

export async function verifyClean(before: ScanResult, output: ArrayBuffer, policy: CleanPolicy, original?: ArrayBuffer): Promise<VerificationResult> {
  const outputScan = await scanImage(output);
  const items = before.findings.map((finding) => {
    const stillPresent = outputScan.findings.some((candidate) => candidate.id === finding.id || (candidate.label === finding.label && candidate.rawKey === finding.rawKey));
    return {
      label: finding.label,
      before: "found" as const,
      after: (finding.id.startsWith("unsupported-") || (policy.mode === "privacy" && /xmp/i.test(finding.rawKey ?? "")) ? "unsupported" : shouldRemove(finding.category, policy) ? (stillPresent ? "still_present" : "removed") : (stillPresent ? "preserved" : "review_needed")) as "removed" | "preserved" | "still_present" | "review_needed" | "unsupported",
    };
  });
  return {
    items,
    outputScan,
    encodedPayloadReencoded: false,
    encodedPayloadPreserved: original ? before.format === outputScan.format && equalParts(protectedParts(original,before.format),protectedParts(output,outputScan.format)) : undefined,
    orientationPreserved: before.properties.orientation !== undefined ? before.properties.orientation === outputScan.properties.orientation : undefined,
    dimensionsChanged: before.properties.width !== undefined && outputScan.properties.width !== undefined
      ? before.properties.width !== outputScan.properties.width || before.properties.height !== outputScan.properties.height
      : undefined,
    iccPreserved: before.properties.hasIcc === true ? outputScan.properties.hasIcc === true && (!original || equalParts(protectedParts(original,before.format,true),protectedParts(output,outputScan.format,true))) : undefined,
    transparencyPreserved: before.properties.hasTransparency === true ? outputScan.properties.hasTransparency === true : undefined,
  };
}
