import { chromium, expect } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import JSZip from "jszip";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3173";
const output = "artifacts/task-pages-review";
const routes = [
  ["/batch-metadata-remover", "Remove Metadata From Multiple Images", "Batch Metadata Remover for JPEG & PNG Images"],
  ["/supported-formats", "JPEG, PNG and WebP Metadata Support", "JPEG, PNG & WebP Metadata Support"],
  ["/comfyui-workflow-remover", "Remove Embedded ComfyUI Workflow Data", "Remove ComfyUI Workflow From PNG — Local and Private"],
  ["/stable-diffusion-metadata-remover", "Remove Stable Diffusion Prompts and Generation Settings", "Stable Diffusion Metadata Remover for PNG Images"],
  ["/remove-metadata-from-jpeg", "Remove Metadata From JPEG and JPG Images", "Remove Metadata From JPEG and JPG Without Re-encoding"],
  ["/c2pa-metadata-checker", "Check C2PA Content Credentials in Images", "C2PA Content Credentials Checker for Images"],
  ["/remove-gps-from-photo", "Remove GPS Metadata From Photos", "Remove GPS Metadata From Photos | JPEG & PNG"],
];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { base, routes: [], checks: [], errors: [] };
function pngChunk(type, value) {
  const body = Buffer.concat([Buffer.from(type), Buffer.from(value)]);
  let crc = 0xffffffff;
  for (const byte of body) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  const size = Buffer.alloc(4), checksum = Buffer.alloc(4);
  size.writeUInt32BE(value.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([size, body, checksum]);
}
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, acceptDownloads: true });
    const page = await context.newPage();
    page.on("pageerror", error => report.errors.push(error.message));
    for (const [path, h1, title] of routes) {
      const response = await page.goto(base + path, { waitUntil: "networkidle" });
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: h1 })).toHaveCount(1);
      expect(await page.title()).toBe(title);
      expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
      expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toContain(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      report.routes.push({ path, device: mobile ? "mobile" : "desktop", status: 200 });
    }
    if (!mobile) {
      await page.goto(base + "/comfyui-workflow-remover");
      await page.getByRole("button", { name: "Try a safe sample" }).click();
      await expect(page.getByRole("region", { name: "comfyui task result" })).toContainText("Workflow data");
      await expect(page.getByRole("region", { name: "comfyui task result" })).toContainText("Removed from verified copy");
      await expect(page.getByRole("button", { name: "Download clean copy" })).toBeEnabled();
      await page.screenshot({ path: `${output}/comfyui-desktop.png`, fullPage: true });
      report.checks.push("ComfyUI synthetic workflow and prompt verified");

      await page.goto(base + "/stable-diffusion-metadata-remover");
      await page.getByRole("button", { name: "Try a safe sample" }).click();
      await expect(page.getByRole("region", { name: "stable-diffusion task result" })).toContainText("Generation parameters");
      await expect(page.getByRole("region", { name: "stable-diffusion task result" })).toContainText("Removed from verified copy");
      report.checks.push("Stable Diffusion parameters verified");
      const basePng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAApdEVYdHBhcmFtZXRlcnMAc3RlcHM9MzAgc2VlZD00MiBzYW1wbGVyPWV1bGVyj/t2VgAAAABJRU5ErkJggg==", "base64");
      const compressed = pngChunk("zTXt", Buffer.concat([Buffer.from("parameters\0\0"), deflateSync(Buffer.from("secret seed=84"))]));
      const compressedPng = Buffer.concat([basePng.subarray(0, basePng.length - 12), compressed, basePng.subarray(basePng.length - 12)]);
      await page.getByRole("button", { name: "Clear queue" }).click();
      await page.getByLabel("Choose PNG images").setInputFiles({ name: "compressed.png", mimeType: "image/png", buffer: compressedPng });
      await expect(page.getByRole("button", { name: "Download clean copy" })).toBeEnabled();
      const compressedDownload = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download clean copy" }).click();
      const compressedCopy = await readFile(await (await compressedDownload).path());
      expect(compressedCopy.includes(compressed)).toBe(false);
      report.checks.push("Bounded compressed PNG parameters removed in a browser");

      await page.goto(base + "/c2pa-metadata-checker");
      await expect(page.getByRole("button", { name: "Download clean copy" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Clean and create a copy" })).toHaveCount(0);
      await page.getByLabel("Choose JPEG, PNG, WEBP images").setInputFiles({ name: "no-credential.png", mimeType: "image/png", buffer: basePng });
      await expect(page.getByRole("region", { name: "Content Credentials result" })).toContainText(/Issuer trust\s*Not assessed/);
      report.checks.push("C2PA specialist is read-only");

      await page.goto(base + "/remove-gps-from-photo");
      const photo = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAApdEVYdHBhcmFtZXRlcnMAc3RlcHM9MzAgc2VlZD00MiBzYW1wbGVyPWV1bGVyj/t2VgAAAABJRU5ErkJggg==", "base64");
      const gps = Buffer.concat([photo.subarray(0, photo.length - 12), pngChunk("tEXt", "GPS\0TEST_LOCATION"), photo.subarray(photo.length - 12)]);
      await page.getByLabel("Choose JPEG, PNG images").setInputFiles({ name: "gps.png", mimeType: "image/png", buffer: gps });
      await expect(page.getByRole("region", { name: "gps task result" })).toContainText("Removed from verified copy");
      const gpsDownload = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download clean copy" }).click();
      const gpsCopy = await readFile(await (await gpsDownload).path());
      expect(gpsCopy.includes(Buffer.from("TEST_LOCATION"))).toBe(false);
      expect(gpsCopy.includes(Buffer.from("steps=30"))).toBe(true);
      report.checks.push("GPS task removes location and retains workflow metadata");

      await page.goto(base + "/remove-metadata-from-jpeg");
      const jpeg = Buffer.from(await page.evaluate(() => { const canvas = document.createElement("canvas"); canvas.width = 2; canvas.height = 2; return canvas.toDataURL("image/jpeg").split(",")[1]; }), "base64");
      const exif = Buffer.from("Exif\0\0II*\0\b\0\0\0\0\0\0\0\0\0", "binary");
      const marker = Buffer.from([0xff, 0xe1, 0, exif.length + 2]);
      await page.getByLabel("Choose JPEG images").setInputFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.concat([jpeg.subarray(0, 2), marker, exif, jpeg.subarray(2)]) });
      await expect(page.getByRole("heading", { name: /No supported data needed cleaning|Cleaning complete/ })).toBeVisible();
      report.checks.push("JPEG specialist accepts and verifies a JPEG copy");

      await page.goto(base + "/batch-metadata-remover");
      const sample = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAApdEVYdHBhcmFtZXRlcnMAc3RlcHM9MzAgc2VlZD00MiBzYW1wbGVyPWV1bGVyj/t2VgAAAABJRU5ErkJggg==", "base64");
      await page.getByLabel("Choose JPEG, PNG images").setInputFiles([
        { name: "first.png", mimeType: "image/png", buffer: sample },
        { name: "second.png", mimeType: "image/png", buffer: sample },
        { name: "broken.png", mimeType: "image/png", buffer: Buffer.from("broken") },
      ]);
      await expect(page.locator(".batch-toolbar")).toContainText("2 ready to download");
      await expect(page.locator(".batch-toolbar")).toContainText("1 failed");
      const pending = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download completed images (ZIP)" }).click();
      const zip = await JSZip.loadAsync(await readFile(await (await pending).path()));
      const manifest = JSON.parse(await zip.file("batch-results.json").async("string"));
      expect(manifest.summary).toMatchObject({ selected: 3, included: 2, excluded: 1 });
      expect(manifest.files.find(file => file.fileName === "broken.png")).toMatchObject({ result: "failed", includedInZip: false });
      expect(Object.keys(zip.files)).toHaveLength(3);
      await page.screenshot({ path: `${output}/batch-desktop.png`, fullPage: true });
      report.checks.push("Batch ZIP and per-image manifest exclude failed input");
    }
    await context.close();
  }
  expect(report.errors).toEqual([]);
  console.log(`PASS ${report.routes.length} desktop/mobile route checks`);
  for (const check of report.checks) console.log(`PASS ${check}`);
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
