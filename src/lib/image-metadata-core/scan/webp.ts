import { assertRange, readU32LE, text } from "../bytes";
import { finding } from "../classify";
import type { ScanResult } from "../types";

export function scanWebp(bytes: Uint8Array): ScanResult {
  const riffSize = readU32LE(bytes, 4);
  if (riffSize + 8 > bytes.length) throw Object.assign(new Error("The WebP RIFF size is invalid."), { code: "malformed_container" });
  const findings = [] as ScanResult["findings"];
  let offset = 12;
  let hasIcc = false;
  let hasTransparency = false;
  let hasAnimation = false;
  let width: number | undefined, height: number | undefined;
  while (offset + 8 <= Math.min(bytes.length, riffSize + 8)) {
    const type = text(bytes, offset, 4);
    const size = readU32LE(bytes, offset + 4);
    const dataStart = offset + 8;
    assertRange(bytes, dataStart, size);
    if(type === "VP8X" && size>=10) {width=1+bytes[dataStart+4]+(bytes[dataStart+5]<<8)+(bytes[dataStart+6]<<16);height=1+bytes[dataStart+7]+(bytes[dataStart+8]<<8)+(bytes[dataStart+9]<<16);}
    if(type === "VP8 " && size>=10 && width===undefined) {width=(bytes[dataStart+6]|bytes[dataStart+7]<<8)&0x3fff;height=(bytes[dataStart+8]|bytes[dataStart+9]<<8)&0x3fff;}
    if(type === "VP8L" && size>=5 && width===undefined) {const bits=readU32LE(bytes,dataStart+1);width=1+(bits&0x3fff);height=1+((bits>>>14)&0x3fff);}
    if (type === "EXIF") findings.push(finding("webp-exif", "EXIF metadata", "camera", "informational", "EXIF", "present", "Capture information is embedded in this WebP.", "WebP cleaning is disabled until the full fixture matrix passes.", "Not available in this release."));
    if (type === "XMP ") findings.push(finding("webp-xmp", "XMP metadata", "software", "review", "XMP", text(bytes, dataStart, Math.min(size, 4096)), "Editing metadata is embedded in this WebP.", "Review it; this release scans WebP without rewriting it.", "Not available in this release."));
    if (type === "C2PA") findings.push(finding("c2pa", "Content Credentials", "provenance", "review", "C2PA", "present", "A provenance record is embedded.", "Review it; this release scans WebP without rewriting it.", "Not available in this release."));
    if (type === "ICCP") hasIcc = true;
    if (type === "ALPH") hasTransparency = true;
    if (type === "ANIM" || type === "ANMF") hasAnimation = true;
    offset = dataStart + size + (size % 2);
  }
  return { format: "webp", findings, properties: { width, height, hasIcc, hasTransparency, hasAnimation }, warnings: ["WebP cleaning is in scan-only Beta."], cleanSupport: "scan_only" };
}
