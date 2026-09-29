import { assertRange, crc32, MetadataError, readU32BE, text } from "../bytes";
import { classifyTextEntry, finding } from "../classify";
import { scanTiff } from "../tiff";
import type { Finding, ScanResult } from "../types";

export interface PngChunk { type: string; start: number; end: number; dataStart: number; dataLength: number }

export function parsePngChunks(bytes: Uint8Array) {
  const chunks: PngChunk[] = [];
  let offset = 8;
  let sawIend = false;
  while (offset < bytes.length) {
    assertRange(bytes, offset, 12);
    const dataLength = readU32BE(bytes, offset);
    const typeName = text(bytes, offset + 4, 4);
    if(!/^[A-Za-z]{4}$/.test(typeName) || (typeName[0] === typeName[0].toUpperCase() && !["IHDR","PLTE","IDAT","IEND"].includes(typeName))) throw new MetadataError("malformed_container", "The PNG has an invalid or unsupported critical chunk.");
    if((chunks.length===0 && typeName!=="IHDR") || (typeName==="IHDR" && (chunks.length>0 || dataLength!==13))) throw new MetadataError("malformed_container", "The PNG must start with one valid IHDR chunk.");
    if (["tEXt", "zTXt", "iTXt", "eXIf", "caBX", "iCCP"].includes(typeName) && dataLength > 16 * 1024 * 1024) throw new MetadataError("metadata_too_large", "An embedded metadata block is too large to inspect safely.");
    const end = offset + 12 + dataLength;
    assertRange(bytes, offset, end - offset);
    const storedCrc = readU32BE(bytes, offset + 8 + dataLength);
    const actualCrc = crc32(bytes.subarray(offset + 4, offset + 8 + dataLength));
    if (storedCrc !== actualCrc) throw new MetadataError("png_crc_invalid", `The ${typeName} PNG chunk has an invalid checksum.`);
    chunks.push({ type: typeName, start: offset, end, dataStart: offset + 8, dataLength });
    offset = end;
    if (typeName === "IEND") { sawIend = true; break; }
  }
  if (!sawIend) throw new MetadataError("malformed_container", "The PNG is missing its end marker.");
  if(offset!==bytes.length || chunks.at(-1)?.dataLength!==0 || !chunks.some(c=>c.type==="IDAT")) throw new MetadataError("malformed_container", "The PNG is missing image data or contains trailing bytes.");
  return chunks;
}

const maxExpandedTextBytes = 1024 * 1024;

async function expandText(bytes: Uint8Array, maxBytes: number) {
  if (typeof DecompressionStream === "undefined") return null;
  try {
    const stream = new ReadableStream<BufferSource>({ start(controller) { controller.enqueue(bytes.slice()); controller.close(); } });
    const reader = stream.pipeThrough(new DecompressionStream("deflate")).getReader();
    const parts: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > maxBytes) { await reader.cancel(); return null; }
      parts.push(value);
    }
    const expanded = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) { expanded.set(part, offset); offset += part.length; }
    return { value: new TextDecoder("utf-8", { fatal: true }).decode(expanded), expandedBytes: length };
  } catch { return null; }
}

async function parseTextChunk(bytes: Uint8Array, chunk: PngChunk, remainingBytes = maxExpandedTextBytes) {
  const data = bytes.subarray(chunk.dataStart, chunk.dataStart + chunk.dataLength);
  const zero = data.indexOf(0);
  if (zero < 1 || zero > 79) return null;
  const key = text(data, 0, zero);
  if (chunk.type === "tEXt") return { key, value: text(data, zero + 1), expandedBytes: 0 };
  if (chunk.type === "zTXt") {
    if (data[zero + 1] !== 0 || data.length <= zero + 2) return null;
    const expanded = await expandText(data.subarray(zero + 2), Math.min(maxExpandedTextBytes, remainingBytes));
    return expanded === null ? null : { key, ...expanded };
  }
  if (chunk.type === "iTXt") {
    const rest = data.subarray(zero + 1);
    if (rest.length < 5 || ![0, 1].includes(rest[0]) || rest[1] !== 0) return null;
    let cursor = 2;
    for (let separators = 0; separators < 2; separators += 1) {
      const next = rest.indexOf(0, cursor);
      if (next < 0) return null;
      cursor = next + 1;
    }
    if (rest[0] === 0) return { key, value: text(rest, cursor), expandedBytes: 0 };
    const expanded = await expandText(rest.subarray(cursor), Math.min(maxExpandedTextBytes, remainingBytes));
    return expanded === null ? null : { key, ...expanded };
  }
  return null;
}

export async function scanPng(bytes: Uint8Array): Promise<ScanResult> {
  const chunks = parsePngChunks(bytes);
  const findings: Finding[] = [];
  let width: number | undefined;
  let height: number | undefined;
  let hasTransparency = false;
  let hasAnimation = false;
  let hasIcc = false;
  let orientation: number | undefined;
  const warnings: string[] = [];
  let expandedBudget = 4 * maxExpandedTextBytes;
  for (const chunk of chunks) {
    if (chunk.type === "IHDR") {
      width = readU32BE(bytes, chunk.dataStart);
      height = readU32BE(bytes, chunk.dataStart + 4);
      assertRange(bytes, chunk.dataStart + 9, 1);
      hasTransparency = bytes[chunk.dataStart + 9] === 4 || bytes[chunk.dataStart + 9] === 6;
    } else if (["tEXt", "zTXt", "iTXt"].includes(chunk.type)) {
      const entry = await parseTextChunk(bytes, chunk, expandedBudget);
      if (entry) { expandedBudget -= entry.expandedBytes; findings.push(classifyTextEntry(entry.key, entry.value)); }
      else {
        warnings.push(`A ${chunk.type} text block could not be read within the 1 MB expanded-text limit.`);
        findings.push(finding(`unsupported-${chunk.start}`, "Unreadable text metadata", "structure", "review", chunk.type, "hidden", "This text block could not be safely expanded or parsed within the size limit.", "Review with a specialist tool if it must be removed.", "This release leaves the block untouched."));
      }
    } else if (chunk.type === "comf") {
      warnings.push("An animated ComfyUI metadata block was left untouched.");
      findings.push(finding(`unsupported-comf-${chunk.start}`, "Animated ComfyUI metadata", "structure", "review", "comf", "hidden", "ComfyUI can place workflow or prompt data in this APNG chunk.", "Review the file with a tool that supports animated ComfyUI metadata.", "This block remains in the output copy."));
    } else if (chunk.type === "caBX") {
      findings.push(finding("c2pa", "Content Credentials", "provenance", "review", "caBX", "present", "A provenance manifest is embedded. Its presence does not prove AI generation.", "Review its origin before choosing removal.", "The provenance and edit history will no longer travel with this copy."));
    } else if (chunk.type === "iCCP") {
      hasIcc = true;
      findings.push(finding("icc", "Color profile", "color", "informational", "iCCP", "present", "The color profile helps applications display color consistently.", "Preserve by default.", "Colors may display differently in other applications."));
    } else if (chunk.type === "eXIf") {
      const tiff = scanTiff(bytes.subarray(chunk.dataStart, chunk.dataStart + chunk.dataLength));
      findings.push(...tiff.findings);
      orientation = tiff.orientation;
    } else if (chunk.type === "tRNS") hasTransparency = true;
    else if (chunk.type === "acTL") hasAnimation = true;
  }
  return { format: "png", findings, properties: { width, height, hasTransparency, hasAnimation, hasIcc, orientation }, warnings, cleanSupport: "supported" };
}

export function pngTextEntry(bytes: Uint8Array, chunk: PngChunk, remainingBytes?: number) { return parseTextChunk(bytes, chunk, remainingBytes); }
