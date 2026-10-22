// Reproducible, synthetic fixtures. No customer assets or external requests.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { build } from "esbuild";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("../", import.meta.url));
const scratch = path.join(root, "artifacts/metadata-evidence");
const destination = path.join(root, "public/samples/metadata-evidence");
await mkdir(scratch, { recursive: true });
await mkdir(destination, { recursive: true });
const coreFile = path.join(scratch, "core.mjs");
await build({
  stdin: { contents: 'export {scanImage} from "./src/lib/image-metadata-core/scan/index"; export {cleanImage,rebuildPngChunk} from "./src/lib/image-metadata-core/clean/index"; export {verifyClean} from "./src/lib/image-metadata-core/verify"; export {parsePngChunks} from "./src/lib/image-metadata-core/scan/png"; export {parseJpegSegments} from "./src/lib/image-metadata-core/scan/jpeg";', resolveDir: root },
  bundle: true, platform: "node", format: "esm", outfile: coreFile,
});
const { scanImage, cleanImage, verifyClean, rebuildPngChunk, parsePngChunks, parseJpegSegments } = await import(pathToFileURL(coreFile).href);
const encode = value => new TextEncoder().encode(value);
const concat = parts => Buffer.concat(parts.map(part => Buffer.from(part)));
const arrayBuffer = value => Uint8Array.from(value).buffer;
const hash = value => createHash("sha256").update(value).digest("hex");
const width = 32, height = 24;
const rows = Buffer.alloc((width * 4 + 1) * height);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const offset = y * (width * 4 + 1) + 1 + x * 4;
    rows.set([x * 7, y * 9, 160, x < 8 ? 0 : x < 16 ? 128 : 255], offset);
  }
}
function png(extra) {
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  return concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), rebuildPngChunk("IHDR", header), ...extra, rebuildPngChunk("IDAT", deflateSync(rows)), rebuildPngChunk("IEND", new Uint8Array())]);
}
const textChunk = (key, value) => rebuildPngChunk("tEXt", encode(`${key}\0${value}`));
const credit = textChunk("Copyright", "AI Metadata Remover synthetic test fixture");

// Structurally valid EXIF: orientation plus deliberately artificial 0N, 0E GPS.
function gpsTiff() {
  const bytes = Buffer.alloc(144);
  bytes.write("II", 0); bytes.writeUInt16LE(42, 2); bytes.writeUInt32LE(8, 4); bytes.writeUInt16LE(2, 8);
  function entry(at, tag, type, count, value) {
    bytes.writeUInt16LE(tag, at); bytes.writeUInt16LE(type, at + 2); bytes.writeUInt32LE(count, at + 4); bytes.writeUInt32LE(value, at + 8);
  }
  entry(10, 0x0112, 3, 1, 1); entry(22, 0x8825, 4, 1, 38);
  bytes.writeUInt16LE(4, 38);
  entry(40, 1, 2, 2, 78); entry(52, 2, 5, 3, 92);
  entry(64, 3, 2, 2, 69); entry(76, 4, 5, 3, 116);
  for (const offset of [96, 104, 112, 120, 128, 136]) bytes.writeUInt32LE(1, offset);
  return bytes;
}
function jpegWithGps(base) {
  const payload = concat([encode("Exif\0\0"), gpsTiff()]);
  const marker = Buffer.from([255, 225, 0, 0]); marker.writeUInt16BE(payload.length + 2, 2);
  return concat([base.subarray(0, 2), marker, payload, base.subarray(2)]);
}
function encodedPayload(bytes, format) {
  if (format === "png") return concat(parsePngChunks(bytes).filter(chunk => chunk.type === "IDAT").map(chunk => bytes.subarray(chunk.dataStart, chunk.dataStart + chunk.dataLength)));
  return bytes.subarray(parseJpegSegments(bytes).imageDataStart);
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  // A browser-encoded test drawing, not a camera photo or generator export.
  const jpeg = Buffer.from(await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 32; canvas.height = 24;
    const context = canvas.getContext("2d"); context.fillStyle = "#eb8037"; context.fillRect(0, 0, 32, 24); context.fillStyle = "#243847"; context.fillRect(4, 4, 24, 16);
    return Array.from(Uint8Array.from(atob(canvas.toDataURL("image/jpeg", 0.9).split(",")[1]), c => c.charCodeAt(0)));
  }));
  const fixtures = [
    { id: "workflow-png", title: "Static PNG with workflow and prompt fields", format: "png", bytes: png([textChunk("workflow", '{"nodes":[],"links":[],"synthetic":true}'), textChunk("prompt", '{"1":{"class_type":"SyntheticExample","inputs":{"seed":42}}}'), credit]), policy: { mode: "ai_workflow", removeC2pa: false, removeColorProfile: false }, expectedRemoved: 2, expectedReview: false },
    { id: "transparent-png", title: "Transparent PNG with compressed generation parameters", format: "png", bytes: png([rebuildPngChunk("zTXt", concat([encode("parameters\0"), Buffer.from([0]), deflateSync(encode("Synthetic test: seed=42; sampler=example"))])), credit]), policy: { mode: "publish", removeC2pa: true, removeColorProfile: false }, expectedRemoved: 1, expectedReview: false },
    { id: "gps-jpeg", title: "Browser-drawn JPEG with artificial GPS", format: "jpeg", bytes: jpegWithGps(jpeg), policy: { mode: "privacy", removeC2pa: false, removeColorProfile: false }, expectedRemoved: 1, expectedReview: false },
    { id: "review-needed-png", title: "PNG with text beyond the inspection limit", format: "png", bytes: png([textChunk("parameters", "Synthetic test: seed=42"), rebuildPngChunk("zTXt", concat([encode("Description\0"), Buffer.from([0]), deflateSync(encode("x".repeat(1024 * 1024 + 1)))])), credit]), policy: { mode: "publish", removeC2pa: true, removeColorProfile: false }, expectedRemoved: 1, expectedReview: true },
  ];
  const samples = [];
  for (const fixture of fixtures) {
    const original = arrayBuffer(fixture.bytes);
    const before = await scanImage(original);
    const result = await cleanImage(original, fixture.policy);
    assert.ok(result.ok && result.output, `${fixture.id}: cleaning failed`);
    const output = Buffer.from(result.output);
    const verification = await verifyClean(before, result.output, fixture.policy, original);
    const unresolved = verification.items.filter(item => ["unsupported", "still_present", "review_needed"].includes(item.after));
    assert.equal(verification.items.filter(item => item.after === "removed").length, fixture.expectedRemoved, `${fixture.id}: removed fields`);
    assert.equal(unresolved.length > 0, fixture.expectedReview, `${fixture.id}: review state`);
    assert.equal(verification.encodedPayloadPreserved, true);
    assert.equal(verification.dimensionsChanged, false);
    const decoded = [];
    for (const bytes of [fixture.bytes, output]) {
      const pixels = await page.evaluate(async ({ bytes, type }) => {
        const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type }));
        const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
        const context = canvas.getContext("2d"); context.drawImage(bitmap, 0, 0); bitmap.close();
        return Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data);
      }, { bytes: Array.from(bytes), type: fixture.format === "jpeg" ? "image/jpeg" : "image/png" });
      decoded.push(hash(Buffer.from(pixels)));
    }
    assert.equal(decoded[0], decoded[1], `${fixture.id}: decoded pixels`);
    const extension = fixture.format === "jpeg" ? "jpg" : "png";
    const inputName = `${fixture.id}-original.${extension}`, outputName = `${fixture.id}-cleaned.${extension}`;
    await writeFile(path.join(destination, inputName), fixture.bytes);
    await writeFile(path.join(destination, outputName), output);
    samples.push({
      id: fixture.id, title: fixture.title, synthetic: true, format: fixture.format,
      original: `/samples/metadata-evidence/${inputName}`, cleaned: `/samples/metadata-evidence/${outputName}`,
      policy: fixture.policy, width: before.properties.width, height: before.properties.height,
      inputBytes: fixture.bytes.length, outputBytes: output.length, needsReview: fixture.expectedReview,
      fields: verification.items.map((item, index) => ({ ...item, key: before.findings[index].rawKey ?? item.label })), encodedPayloadPreserved: verification.encodedPayloadPreserved,
      transparencyPreserved: verification.transparencyPreserved ?? null,
      orientationPreserved: verification.orientationPreserved ?? null,
      payloadSha256: { before: hash(encodedPayload(fixture.bytes, fixture.format)), after: hash(encodedPayload(output, fixture.format)) },
      decodedRgbaSha256: { before: decoded[0], after: decoded[1] },
    });
  }
  const report = {
    testedAt: "2026-10-22", sourceType: "Synthetic fixtures; not actual ComfyUI, ChatGPT or camera exports.",
    method: "Processed by this repository's scanImage, cleanImage and verifyClean. Encoded image payload SHA-256 and Chromium-decoded RGBA SHA-256 compared before and after. The whole-file hash is expected to change.",
    limitations: "Four small constructed files only. This is not generator coverage, a benchmark, a C2PA signature test or proof of all-file compatibility. The oversized-text sample deliberately retains unresolved data.",
    samples,
  };
  const json = `${JSON.stringify(report, null, 2)}\n`;
  await writeFile(path.join(destination, "report.json"), json);
  await writeFile(path.join(root, "src/lib/metadata-evidence.json"), json);
  console.log(JSON.stringify({ samples: samples.length, allPayloadsMatch: true, allDecodedPixelsMatch: true, expectedPartialResults: 1, output: destination }));
} finally {
  await browser.close();
}
