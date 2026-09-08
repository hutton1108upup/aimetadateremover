import { assertRange, readU16BE, text } from "../bytes";
import { finding } from "../classify";
import { scanTiff } from "../tiff";
import type { Finding, ScanResult } from "../types";

export interface JpegSegment { marker: number; start: number; end: number; payloadStart: number; payloadLength: number }

export function parseJpegSegments(bytes: Uint8Array) {
  const segments: JpegSegment[] = [];
  let offset = 2;
  while (offset < bytes.length) {
    assertRange(bytes, offset, 2);
    if (bytes[offset] !== 0xff) throw Object.assign(new Error("Invalid JPEG marker."), { code: "malformed_container" });
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) return { segments, imageDataStart: offset };
    const size = readU16BE(bytes, offset + 2);
    if (size < 2) throw Object.assign(new Error("Invalid JPEG segment."), { code: "malformed_container" });
    const end = offset + 2 + size;
    assertRange(bytes, offset, end - offset);
    segments.push({ marker, start: offset, end, payloadStart: offset + 4, payloadLength: size - 2 });
    offset = end;
  }
  throw Object.assign(new Error("The JPEG has no image payload."), { code: "malformed_container" });
}

export function scanJpeg(bytes: Uint8Array): ScanResult {
  const { segments } = parseJpegSegments(bytes);
  const findings: Finding[] = [];
  let hasIcc = false;
  let orientation: number | undefined;
  let width: number | undefined, height: number | undefined;
  for (const segment of segments) {
    const value = text(bytes, segment.payloadStart, Math.min(segment.payloadLength, 4096));
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(segment.marker)) {
      if(segment.payloadLength<6) throw Object.assign(new Error("Invalid JPEG dimensions."),{code:"malformed_container"});
      height=readU16BE(bytes,segment.payloadStart+1);width=readU16BE(bytes,segment.payloadStart+3);
    }
    if (segment.marker === 0xe1 && value.startsWith("Exif\0\0")) {
      const tiff = scanTiff(bytes.subarray(segment.payloadStart + 6, segment.payloadStart + segment.payloadLength));
      findings.push(...tiff.findings);
      orientation = tiff.orientation;
    } else if (segment.marker === 0xe1 && /xap\/1\.0|xmpmeta/i.test(value)) {
      if (/workflow|prompt|seed|sampler|stable diffusion|comfyui/i.test(value)) {
        findings.push(finding("jpeg-ai-xmp", "AI workflow XMP", "ai_workflow", "action", "APP1 XMP", value, "This XMP packet contains generation workflow data.", "Remove for a delivery copy.", "The workflow information will no longer be embedded."));
      } else {
        findings.push(finding("jpeg-xmp", "XMP metadata", "software", "review", "APP1 XMP", value, "XMP can contain editing and attribution history.", "Review before removing.", "The XMP history will be removed."));
      }
    } else if (segment.marker === 0xe2 && value.startsWith("ICC_PROFILE\0")) {
      hasIcc = true;
      findings.push(finding("icc", "Color profile", "color", "informational", "APP2 ICC", "present", "The color profile supports consistent display.", "Preserve by default.", "Colors may display differently."));
    } else if (segment.marker === 0xeb && isConfirmedC2paApp11(bytes.subarray(segment.payloadStart, segment.payloadStart + segment.payloadLength))) {
      findings.push(finding("c2pa", "Content Credentials", "provenance", "review", "APP11 C2PA", "present", "A provenance record may be embedded. It does not prove AI generation.", "Review before removal.", "The provenance record will no longer travel with this copy."));
    } else if (segment.marker === 0xed) {
      findings.push(finding("unsupported-iptc", "Photoshop / IPTC metadata", "structure", "review", "APP13", "hidden", "This block may contain location, attribution or preview data that this cleaner does not rewrite.", "Review with a specialist tool.", "This block remains in the copy."));
    }
  }
  return { format: "jpeg", findings, properties: { width, height, hasIcc, orientation }, warnings: [], cleanSupport: "limited" };
}

export function isConfirmedC2paApp11(payload: Uint8Array) {
  if (payload.length < 12 || payload[0] !== 0x4a || payload[1] !== 0x50) return false;
  const value = text(payload, 0, Math.min(payload.length, 4096));
  return /jumb/i.test(value) && /c2pa/i.test(value);
}
