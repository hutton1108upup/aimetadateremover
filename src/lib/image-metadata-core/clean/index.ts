import { asBytes, concatBytes, crc32, text, u32be } from "../bytes";
import { classifyTextEntry } from "../classify";
import { scanImage } from "../scan";
import { isConfirmedC2paApp11, parseJpegSegments } from "../scan/jpeg";
import { parsePngChunks, pngTextEntry } from "../scan/png";
import { cleanTiff } from "../tiff";
import type { CleanPolicy, CleanResult, Finding, MutationRecord } from "../types";

function selected(finding: Finding, policy: CleanPolicy) {
  if (finding.category === "provenance") return policy.removeC2pa;
  if (finding.category === "color") return policy.removeColorProfile;
  if (finding.category === "structure" || finding.category === "camera") return false;
  if (policy.mode === "ai_workflow") return finding.category === "ai_workflow";
  if (policy.mode === "privacy") return finding.category === "location";
  return true;
}

function result(output: Uint8Array, mutations: MutationRecord[]): CleanResult {
  return { ok: true, output: output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer, mutations, encodedPayloadReencoded: false };
}

async function cleanPng(bytes: Uint8Array, policy: CleanPolicy) {
  const chunks = parsePngChunks(bytes);
  const parts: Uint8Array[] = [bytes.slice(0, 8)];
  const mutations: MutationRecord[] = [];
  for (const chunk of chunks) {
    let remove = false;
    let replacement: Uint8Array | undefined;
    if (["tEXt", "zTXt", "iTXt"].includes(chunk.type)) {
      const entry = pngTextEntry(bytes, chunk);
      if (entry) {
        const finding = classifyTextEntry(entry.key, entry.value);
        remove = selected(finding, policy);
        mutations.push({ kind: remove ? "removed" : "preserved", category: finding.category, label: finding.label });
      }
    } else if (chunk.type === "caBX") {
      remove = policy.removeC2pa;
      mutations.push({ kind: remove ? "removed" : "preserved", category: "provenance", label: "Content Credentials" });
    } else if (chunk.type === "iCCP") {
      remove = policy.removeColorProfile;
      mutations.push({ kind: remove ? "removed" : "preserved", category: "color", label: "Color profile" });
    } else if (chunk.type === "eXIf") {
      const changed = cleanTiff(bytes.subarray(chunk.dataStart, chunk.dataStart + chunk.dataLength), policy.mode);
      replacement = rebuildPngChunk("eXIf", changed.bytes);
      mutations.push(...changed.mutations);
    }
    if (!remove) parts.push(replacement ?? bytes.slice(chunk.start, chunk.end));
  }
  return result(concatBytes(parts), mutations);
}

async function cleanJpeg(bytes: Uint8Array, policy: CleanPolicy) {
  const { segments, imageDataStart } = parseJpegSegments(bytes);
  const parts: Uint8Array[] = [bytes.slice(0, 2)];
  const mutations: MutationRecord[] = [];
  for (const segment of segments) {
    const value = text(bytes, segment.payloadStart, Math.min(segment.payloadLength, 4096));
    let remove = false;
    let replacement: Uint8Array | undefined;
    if (segment.marker === 0xe1 && value.startsWith("Exif\0\0")) {
      const changed = cleanTiff(bytes.subarray(segment.payloadStart + 6, segment.payloadStart + segment.payloadLength), policy.mode);
      replacement = bytes.slice(segment.start, segment.end);
      replacement.set(changed.bytes, 10);
      mutations.push(...changed.mutations);
    } else if (segment.marker === 0xe1 && /xap\/1\.0|xmpmeta/i.test(value) && /workflow|prompt|seed|sampler|stable diffusion|comfyui/i.test(value)) {
      const mixed = /copyright|creator|photoshop:credit|exif:/i.test(value);
      remove = policy.mode !== "privacy" && !mixed;
      mutations.push({ kind: mixed ? "unsupported" : remove ? "removed" : "preserved", category: "ai_workflow", label: "AI workflow XMP" });
    } else if (segment.marker === 0xeb && isConfirmedC2paApp11(bytes.subarray(segment.payloadStart, segment.payloadStart + segment.payloadLength))) {
      mutations.push({ kind: policy.removeC2pa ? "unsupported" : "preserved", category: "provenance", label: "Content Credentials" });
    } else if (segment.marker === 0xe2 && value.startsWith("ICC_PROFILE\0")) {
      remove = policy.removeColorProfile;
      mutations.push({ kind: remove ? "removed" : "preserved", category: "color", label: "Color profile" });
    }
    if (!remove) parts.push(replacement ?? bytes.slice(segment.start, segment.end));
  }
  parts.push(bytes.slice(imageDataStart));
  return result(concatBytes(parts), mutations);
}

export async function cleanImage(buffer: ArrayBuffer, policy: CleanPolicy): Promise<CleanResult> {
  const scan = await scanImage(buffer);
  if (scan.format === "webp") return { ok: false, mutations: [], errorCode: "webp_clean_disabled", safeMessage: "WebP cleaning is disabled until the full compatibility suite passes.", encodedPayloadReencoded: false };
  return scan.format === "png" ? cleanPng(asBytes(buffer), policy) : cleanJpeg(asBytes(buffer), policy);
}

export function rebuildPngChunk(type: string, data: Uint8Array) {
  const name = new TextEncoder().encode(type);
  return concatBytes([u32be(data.length), name, data, u32be(crc32(concatBytes([name, data])))]);
}
