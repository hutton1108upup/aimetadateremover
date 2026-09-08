import { MetadataError } from "./bytes";
import { finding } from "./classify";
import type { CleanMode, Finding, MutationRecord } from "./types";

type Endian = "little" | "big";
type IfdKind = "main" | "exif" | "gps" | "thumbnail";
interface TiffEntry { kind: IfdKind; offset: number; tag: number; type: number; count: number; valueOffset: number; valueLength: number; inline: boolean }

const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8, 12: 8 };
const PRIVACY_TAGS = new Set([0x0132, 0x9003, 0x9004, 0x9010, 0x9011, 0x9012, 0xa430, 0xa431, 0xa435, 0x927c]);
const CREATOR_TAGS = new Set([0x013b, 0x8298, 0xa430]);
const SOFTWARE_TAGS = new Set([0x0131]);
const CAMERA_TAGS = new Set([0x010f, 0x0110, 0x829a, 0x829d, 0x920a]);

function read16(bytes: Uint8Array, offset: number, endian: Endian) {
  if (offset < 0 || offset + 2 > bytes.length) throw new MetadataError("malformed_exif", "The EXIF directory is incomplete.");
  return endian === "little" ? bytes[offset] | (bytes[offset + 1] << 8) : (bytes[offset] << 8) | bytes[offset + 1];
}
function read32(bytes: Uint8Array, offset: number, endian: Endian) {
  if (offset < 0 || offset + 4 > bytes.length) throw new MetadataError("malformed_exif", "The EXIF directory is incomplete.");
  return endian === "little"
    ? (bytes[offset] + (bytes[offset + 1] << 8) + (bytes[offset + 2] << 16) + ((bytes[offset + 3] << 24) >>> 0)) >>> 0
    : (((bytes[offset] << 24) >>> 0) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3]) >>> 0;
}
function write16(bytes: Uint8Array, offset: number, value: number, endian: Endian) {
  if (endian === "little") { bytes[offset] = value & 255; bytes[offset + 1] = (value >>> 8) & 255; }
  else { bytes[offset] = (value >>> 8) & 255; bytes[offset + 1] = value & 255; }
}

function parseTiff(bytes: Uint8Array) {
  if (bytes.length < 8) throw new MetadataError("malformed_exif", "The EXIF header is incomplete.");
  const endian: Endian = bytes[0] === 0x49 && bytes[1] === 0x49 ? "little" : bytes[0] === 0x4d && bytes[1] === 0x4d ? "big" : (() => { throw new MetadataError("malformed_exif", "The EXIF byte order is invalid."); })();
  if (read16(bytes, 2, endian) !== 42) throw new MetadataError("malformed_exif", "The EXIF TIFF marker is invalid.");
  const entries: TiffEntry[] = [];
  const directories: Array<{ start: number; end: number; nextOffset: number; kind: IfdKind }> = [];
  const visited = new Set<number>();
  function walk(ifdOffset: number, kind: IfdKind) {
    if (!ifdOffset) return;
    if (ifdOffset < 8 || visited.has(ifdOffset) || visited.size >= 16) throw new MetadataError("malformed_exif", "The EXIF directories contain an invalid or repeated link.");
    visited.add(ifdOffset);
    const count = read16(bytes, ifdOffset, endian);
    if (count > 512) throw new MetadataError("metadata_too_large", "The EXIF directory has too many fields.");
    const nextOffset = ifdOffset + 2 + count * 12;
    const next = read32(bytes, nextOffset, endian);
    directories.push({ start: ifdOffset, end: nextOffset + 4, nextOffset, kind });
    for (let index = 0; index < count; index += 1) {
      const offset = ifdOffset + 2 + index * 12;
      const tag = read16(bytes, offset, endian);
      const type = read16(bytes, offset + 2, endian);
      const itemCount = read32(bytes, offset + 4, endian);
      if (!TYPE_SIZE[type]) throw new MetadataError("unsupported_exif", "An EXIF field has an unsupported value type.");
      const valueLength = TYPE_SIZE[type] * itemCount;
      if (!Number.isSafeInteger(valueLength) || valueLength > 4 * 1024 * 1024) throw new MetadataError("metadata_too_large", "An EXIF field is too large to inspect safely.");
      const inline = valueLength <= 4;
      const valueOffset = inline ? offset + 8 : read32(bytes, offset + 8, endian);
      if (valueOffset < 0 || valueOffset + valueLength > bytes.length) throw new MetadataError("malformed_exif", "An EXIF field points outside the file.");
      const entry = { kind, offset, tag, type, count: itemCount, valueOffset, valueLength, inline };
      entries.push(entry);
      if ([0x8769,0x8825].includes(tag)) {
        if (type !== 4 || itemCount !== 1) throw new MetadataError("malformed_exif", "An EXIF directory pointer has an invalid type.");
        walk(read32(bytes, offset + 8, endian), tag === 0x8769 ? "exif" : "gps");
      }
    }
    if (next) walk(next, "thumbnail");
  }
  walk(read32(bytes, 4, endian), "main");
  // Reject aliasing before a scrub can erase preserved fields or directory bytes.
  const ranges = [{ start: 0, end: 8 }, ...directories, ...entries.filter(e=>!e.inline && e.valueLength).map(e=>({ start:e.valueOffset,end:e.valueOffset+e.valueLength }))].sort((a,b)=>a.start-b.start);
  for(let i=1;i<ranges.length;i++) if(ranges[i].start < ranges[i-1].end) throw new MetadataError("malformed_exif", "EXIF fields overlap and cannot be safely rewritten.");
  return { endian, entries, directories, ranges };
}

function asciiValue(bytes: Uint8Array, entry: TiffEntry) {
  return new TextDecoder().decode(bytes.subarray(entry.valueOffset, entry.valueOffset + Math.min(entry.valueLength, 1024))).replace(/\0+$/g, "");
}

export function scanTiff(bytes: Uint8Array) {
  const { endian, entries } = parseTiff(bytes);
  const findings: Finding[] = [];
  let orientation: number | undefined;
  const categories = new Set<string>();
  for (const entry of entries) {
    if (entry.kind === "main" && entry.tag === 0x0112 && entry.type === 3) orientation = read16(bytes, entry.valueOffset, endian);
    if ((entry.kind === "main" && entry.tag === 0x8825) || entry.kind === "gps") categories.add("gps");
    if (PRIVACY_TAGS.has(entry.tag)) categories.add("private");
    if (entry.kind === "thumbnail") categories.add("private");
    if (CREATOR_TAGS.has(entry.tag)) categories.add("creator");
    if (SOFTWARE_TAGS.has(entry.tag)) categories.add("software");
    if (CAMERA_TAGS.has(entry.tag)) categories.add("camera");
    if (entry.tag === 0x9286 && /prompt|workflow|seed|stable diffusion|comfyui/i.test(asciiValue(bytes, entry))) categories.add("ai");
  }
  if (categories.has("gps")) findings.push(finding("exif-gps", "GPS location", "location", "action", "EXIF GPS IFD", "hidden", "Coordinates can reveal where an image was created.", "Remove in Privacy Clean.", "The embedded location will be erased from this copy."));
  if (categories.has("private")) findings.push(finding("exif-private", "Capture date or device identity", "location", "action", "EXIF privacy fields", "hidden", "Dates, owner names or serial numbers can identify a person or device.", "Remove in Privacy Clean.", "The supported private values will be erased."));
  if (categories.has("ai")) findings.push(finding("exif-ai", "AI workflow in EXIF", "ai_workflow", "action", "EXIF UserComment", "hidden", "A supported EXIF comment contains generation workflow data.", "Remove in AI Workflow Clean.", "The workflow comment will be erased."));
  if (categories.has("creator")) findings.push(finding("exif-creator", "Creator or copyright", "creator", "review", "EXIF attribution", "present", "Attribution may be useful for licensing.", "Preserve unless you intentionally need a private copy.", "Attribution will be erased."));
  if (categories.has("software")) findings.push(finding("exif-software", "Editing software", "software", "review", "EXIF Software", "present", "Software history does not prove AI generation.", "Review before removal.", "The editing-software record will be erased."));
  if (categories.has("camera")) findings.push(finding("exif-camera", "Camera and exposure data", "camera", "informational", "EXIF camera fields", "present", "Camera and exposure settings can support a photography workflow.", "Preserve in AI Workflow Clean.", "Camera context will be erased."));
  return { findings, orientation };
}

export function cleanTiff(input: Uint8Array, mode: CleanMode) {
  const bytes = input.slice();
  const { endian, entries, directories, ranges } = parseTiff(bytes);
  const mutations: MutationRecord[] = [];
  if (mode === "privacy" || mode === "full") {
    if (entries.some(e=>[0x014a,0xa005].includes(e.tag))) throw new MetadataError("unsupported_exif", "This EXIF uses nested directories that Privacy Clean cannot safely scrub yet.");
    for (const directory of directories.filter(d=>d.kind === "thumbnail")) {
      const fields=entries.filter(e=>e.offset > directory.start && e.offset < directory.end);
      if(fields.some(e=>[0x0111,0x0117,0x0144,0x0145].includes(e.tag))) throw new MetadataError("unsupported_thumbnail", "Strip or tiled EXIF thumbnails are not supported by Privacy Clean yet.");
      const start=fields.find(e=>e.tag === 0x0201), length=fields.find(e=>e.tag === 0x0202);
      if(Boolean(start)!==Boolean(length)) throw new MetadataError("malformed_exif", "The EXIF thumbnail range is incomplete.");
      if(start && length) {
        if(start.type!==4 || length.type!==4 || start.count!==1 || length.count!==1) throw new MetadataError("malformed_exif", "The EXIF thumbnail pointers are invalid.");
        const at=read32(bytes,start.valueOffset,endian), size=read32(bytes,length.valueOffset,endian);
        if(at<8 || at+size>bytes.length || ranges.some(r=>at<r.end && at+size>r.start)) throw new MetadataError("malformed_exif", "The EXIF thumbnail overlaps other fields or exceeds its container.");
        bytes.fill(0,at,at+size);
      }
    }
    for(const directory of directories) bytes.fill(0,directory.nextOffset,directory.nextOffset+4);
  }
  let removedGps = false;
  for (const entry of entries) {
    const isOrientation = entry.kind === "main" && entry.tag === 0x0112;
    const isGpsPointer = entry.tag === 0x8825;
    const isGpsValue = entry.kind === "gps";
    const isAi = entry.tag === 0x9286 && /prompt|workflow|seed|stable diffusion|comfyui/i.test(asciiValue(bytes, entry));
    const isPrivacy = isGpsPointer || isGpsValue || PRIVACY_TAGS.has(entry.tag) || entry.kind === "thumbnail";
    const remove = !isOrientation && (mode === "full" ? true : mode === "privacy" ? isPrivacy : isAi);
    if (!remove) continue;
    bytes.fill(0, entry.valueOffset, entry.valueOffset + entry.valueLength);
    write16(bytes, entry.offset, 0xc7fe, endian);
    if (isGpsPointer || isGpsValue) removedGps = true;
  }
  if (removedGps) mutations.push({ kind: "removed", category: "location", label: "GPS location" });
  if (mode === "privacy" || mode === "full") mutations.push({ kind: "removed", category: "location", label: "Supported private EXIF fields" });
  if (mode === "full") mutations.push({ kind: "removed", category: "creator", label: "Supported EXIF attribution and camera fields" });
  if (mode === "ai_workflow") mutations.push({ kind: "removed", category: "ai_workflow", label: "Supported EXIF workflow fields" });
  return { bytes, mutations };
}
