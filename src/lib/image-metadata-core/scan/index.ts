import { asBytes, MetadataError, text } from "../bytes";
import type { ScanResult } from "../types";
import { scanJpeg } from "./jpeg";
import { scanPng } from "./png";
import { scanWebp } from "./webp";

export async function scanImage(buffer: ArrayBuffer): Promise<ScanResult> {
  const bytes = asBytes(buffer);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return scanJpeg(bytes);
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return scanPng(bytes);
  if (bytes.length >= 12 && text(bytes, 0, 4) === "RIFF" && text(bytes, 8, 4) === "WEBP") return scanWebp(bytes);
  throw new MetadataError("invalid_file", "This file is not a supported JPEG, PNG, or WebP image.");
}
