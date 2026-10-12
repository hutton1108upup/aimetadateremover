import { chromium, webkit, expect } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import JSZip from "jszip";

const base = process.env.BASE_URL ?? "http://127.0.0.1:4320";
const origin = "https://aimetadataremover.pro";
const article = "/blog/why-edited-photos-get-ai-info-labels";
const paths = ["/", "/remove-ai-detection-from-image", "/batch-metadata-remover", "/remove-gps-from-photo", "/c2pa-metadata-checker", "/blog/c2pa-content-credentials-explained", article];
const directory = "artifacts/gsc-mvp-review";
await mkdir(directory, { recursive: true });
const report = { base, checkedAt: new Date().toISOString(), analytics: "Third-party analytics scripts are stubbed in this local tool-flow QA; product analytics are unchanged and not tested here.", seo: [], browsers: [] };

// The fixture is a synthetic one-pixel PNG with a small EXIF GPS directory.
const unchanged = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});
function chunk(type, data) {
  const payload = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of payload) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  const bytes = Buffer.alloc(data.length + 12);
  bytes.writeUInt32BE(data.length); payload.copy(bytes, 4);
  bytes.writeUInt32BE((crc ^ 0xffffffff) >>> 0, bytes.length - 4);
  return bytes;
}
function gpsSample() {
  const tiff = Buffer.alloc(160);
  tiff.write("II"); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4); tiff.writeUInt16LE(3, 8);
  function entry(at, tag, type, count, value) {
    tiff.writeUInt16LE(tag, at); tiff.writeUInt16LE(type, at + 2); tiff.writeUInt32LE(count, at + 4);
    tiff.writeUInt32LE(value, at + 8);
  }
  entry(10, 0x0112, 3, 1, 1); entry(22, 0x8298, 2, 7, 144); entry(34, 0x8825, 4, 1, 60);
  tiff.writeUInt16LE(2, 60); entry(62, 1, 2, 2, 78); entry(74, 2, 5, 3, 112);
  for (const [index, numerator] of [37, 46, 30].entries()) { tiff.writeUInt32LE(numerator, 112 + index * 8); tiff.writeUInt32LE(1, 116 + index * 8); }
  tiff.write("AUTHOR\0", 144);
  return Buffer.concat([unchanged.subarray(0, -12), chunk("eXIf", tiff), unchanged.subarray(-12)]);
}

async function download(page, name) {
  const promised = page.waitForEvent("download");
  await page.getByRole("button", { name, exact: true }).click();
  const file = await promised;
  return { name: file.suggestedFilename(), bytes: await readFile(await file.path()) };
}

for (const [device, engine, viewport] of [
  ["desktop", chromium, { width: 1440, height: 1000 }],
  ["mobile-chromium", chromium, { width: 390, height: 844 }],
  ["mobile-webkit", webkit, { width: 390, height: 664 }],
].filter(([device]) => !process.env.GSC_QA_DEVICE || process.env.GSC_QA_DEVICE === device)) {
  const browser = await engine.launch({ headless: true });
  try {
    console.log(`CHECK ${device}`);
    const context = await browser.newContext({ viewport, isMobile: device !== "desktop", hasTouch: device !== "desktop", acceptDownloads: true });
    // Keep collector/network availability separate from the browser-local tool checks.
    await context.route("**/*", route => {
      const host = new URL(route.request().url()).hostname;
      return /(^|\.)clarity\.ms$|(^|\.)googletagmanager\.com$/.test(host)
        ? route.fulfill({ status: 200, body: "", contentType: "application/javascript" })
        : route.continue();
    });
    let page;
    const errors = [];
    const failedRequests = [];
    context.on("requestfailed", request => failedRequests.push({ url: request.url(), reason: request.failure()?.errorText }));
    async function visit(path) {
      if (page) {
        // A closed document cancels its prefetches. Keep unrelated route checks isolated.
        page.removeAllListeners("pageerror");
        await page.close();
      }
      page = await context.newPage(); page.setDefaultTimeout(30_000);
      page.on("pageerror", error => errors.push(error.message));
      return page.goto(base + path, { waitUntil: "networkidle" });
    }
    const titles = [];
    for (const path of paths) {
      const response = await visit(path);
      expect(response.status()).toBe(200);
      expect(await page.locator("h1").count()).toBe(1);
      const title = await page.title(); titles.push(title);
      const description = await page.locator('meta[name="description"]').getAttribute("content");
      expect(description.length).toBeGreaterThan(50); expect(description.length).toBeLessThanOrEqual(160);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(new URL(canonical).href).toBe(new URL(path, origin).href);
      const robots = await page.locator('meta[name="robots"]').count() ? await page.locator('meta[name="robots"]').getAttribute("content") : "";
      expect(robots).not.toContain("noindex");
      for (const schema of await page.locator('script[type="application/ld+json"]').allTextContents()) JSON.parse(schema);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const table of await page.locator(".evidence-table").all()) {
        await table.scrollIntoViewIfNeeded();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      const text = await page.locator("main").innerText();
      expect(text).not.toContain("Privacy Clean is not available yet");
      expect(text).not.toContain("Removing PNG caBX Content Credentials takes a separate choice");
      if (!report.seo.some(entry => entry.path === path)) report.seo.push({ path, title, description, canonical, h1: await page.locator("h1").innerText() });
    }
    expect(new Set(titles).size).toBe(paths.length);

    // The detector-intent page must finish automatic cleaning with no extra clean button.
    await visit("/remove-ai-detection-from-image");
    await page.getByRole("button", { name: "Try a safe sample", exact: true }).click();
    await expect(page.getByRole("button", { name: "Download clean copy", exact: true })).toBeEnabled();
    const single = await download(page, "Download clean copy");
    expect(single.bytes.includes(Buffer.from("steps=30"))).toBe(false);
    await expect(page.getByRole("status").filter({ hasText: "Download started" })).toBeVisible();

    // Validate the ZIP and every advertised sample outcome using actual browser output.
    await visit("/batch-metadata-remover");
    await page.getByRole("button", { name: "Try a safe batch", exact: true }).click();
    await expect(page.locator(".batch-toolbar")).toContainText("3 ready to download");
    await expect(page.locator(".batch-toolbar")).toContainText("1 partial");
    await expect(page.getByRole("button", { name: "Download completed images (ZIP)", exact: true })).toBeEnabled();
    const zipped = await download(page, "Download completed images (ZIP)");
    const zip = await JSZip.loadAsync(zipped.bytes);
    const manifest = JSON.parse(await zip.file("batch-results.json").async("string"));
    expect(manifest.summary).toEqual({ selected: 3, included: 3, needsReview: 1, excluded: 0 });
    expect(manifest.files.map(file => file.result)).toEqual(["cleaned", "unchanged", "review_needed"]);
    expect(await zip.file("02-original-sample-unchanged.png").async("nodebuffer")).toEqual(unchanged);
    expect((await zip.file("01-clean-sample-cleaned.png").async("nodebuffer")).includes(Buffer.from("steps=30"))).toBe(false);
    if (device === "desktop") await page.locator(".file-rail .file-row").nth(2).click();
    else await page.getByLabel("Active image", { exact: true }).selectOption({ index: 2 });
    await expect(page.getByRole("heading", { name: "Partially cleaned — review remaining data", exact: true })).toBeVisible();
    await page.locator(".result-heading").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${directory}/${device}-batch-result.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    // Verify GPS removal, attribution preservation and reinspection of the downloaded file.
    await visit("/remove-gps-from-photo");
    await page.locator('input[type="file"]').setInputFiles({ name: "synthetic-gps.png", mimeType: "image/png", buffer: gpsSample() });
    await expect(page.getByRole("button", { name: "Download clean copy", exact: true })).toBeEnabled();
    const gps = await download(page, "Download clean copy");
    expect(gps.bytes.includes(Buffer.from("AUTHOR"))).toBe(true);
    await page.getByRole("link", { name: "Check the downloaded photo", exact: true }).click();
    await page.waitForURL("**/metadata-checker");
    await expect(page.locator('input[type="file"]')).toBeAttached();
    await page.locator('input[type="file"]').setInputFiles({ name: gps.name, mimeType: "image/png", buffer: gps.bytes });
    await expect(page.getByText("Scan complete", { exact: true })).toBeVisible();
    expect(await page.getByText("GPS location", { exact: true }).count()).toBe(0);
    await expect(page.getByText("Creator or copyright", { exact: true })).toBeVisible();

    await visit("/c2pa-metadata-checker");
    await page.locator('input[type="file"]').setInputFiles({ name: "synthetic-plain.png", mimeType: "image/png", buffer: unchanged });
    await expect(page.locator(".task-focus-summary")).toContainText("Not found in supported fields");
    expect(await page.getByRole("button", { name: "Download clean copy", exact: true }).count()).toBe(0);
    if (errors.length) console.log(JSON.stringify({ device, errors, failedRequests }));
    expect(errors).toEqual([]);
    report.browsers.push({ device, viewport, automaticSampleDownload: single.name, batch: manifest.summary, gpsReinspection: "actual internal-link navigation; no supported GPS finding; copyright preserved", c2pa: "read-only", errors, cancelledPrefetchCount: failedRequests.filter(request => request.url.includes("_rsc=") && /cancel/i.test(request.reason ?? "")).length });
    console.log(`PASS ${device}: SEO, layout, automatic clean, three-file ZIP, GPS reinspection and read-only C2PA`);
  } finally { await browser.close(); }
}

const sitemap = await (await fetch(base + "/sitemap.xml")).text();
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
expect(new Set(urls).size).toBe(urls.length);
expect(urls).toContain(origin + article);
expect(urls).not.toContain(origin + "/workspace");
expect(urls.some(url => new URL(url).pathname.startsWith("/guides"))).toBe(false);
for (const entry of report.seo) {
  expect(urls.map(url => new URL(url).href)).toContain(new URL(entry.canonical).href);
  const html = await (await fetch(base + entry.path)).text();
  const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? html;
  const links = [...new Set([...main.matchAll(/href="(\/[^"]*)"/g)].map(match => match[1]))];
  for (const path of links) {
    const response = await fetch(base + path);
    expect(response.status, `Internal link ${entry.path} -> ${path}`).toBe(200);
  }
}
const privateHtml = await (await fetch(base + "/workspace")).text();
expect(privateHtml).toMatch(/name="robots" content="[^"]*noindex/);
await writeFile(`${directory}/qa-report.json`, JSON.stringify({ ...report, sitemapCount: urls.length }, null, 2));
console.log(`PASS public SEO: ${urls.length} unique sitemap URLs, linked article and workspace noindex`);
