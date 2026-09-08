import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const routes = new Map([
  ["/", "AI Metadata Cleaner for Images"],
  ["/metadata-checker", "Image Metadata Checker for EXIF, XMP and AI Data"],
  ["/remove-ai-detection-from-image", "Understand and Clean File-Level AI Signals"],
  ["/remove-metadata-from-png", "Remove Metadata From PNG Images"],
  ["/guides", "Practical Image Metadata Guides"],
  ["/guides/image-metadata-before-publishing", "What Image Metadata Should You Review Before Publishing?"],
  ["/about", "How ImageFinisher Handles Your Files"],
  ["/privacy", "Your Image Stays in This Browser Session"],
  ["/terms", "Terms for Using the Metadata Tools"],
  ["/workspace", "Your image workspace"],
]);

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function crc32(bytes) {
  let checksum = 0xffffffff;
  for (const byte of bytes) {
    checksum ^= byte;
    for (let bit = 0; bit < 8; bit += 1) checksum = (checksum >>> 1) ^ ((checksum & 1) ? 0xedb88320 : 0);
  }
  return (checksum ^ 0xffffffff) >>> 0;
}

function assertCleanPng(bytes) {
  requireCondition(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "download is not a PNG");
  const imageData = [];
  let offset = 8;
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const payload = bytes.subarray(offset + 8, offset + 8 + length);
    const storedCrc = bytes.readUInt32BE(offset + 8 + length);
    requireCondition(storedCrc === crc32(bytes.subarray(offset + 4, offset + 8 + length)), `invalid ${type} CRC`);
    requireCondition(!(type === "tEXt" && payload.subarray(0, 11).toString() === "parameters\0"), "target parameters metadata remained");
    if (type === "IDAT") imageData.push(payload);
    offset += 12 + length;
  }
  requireCondition(inflateSync(Buffer.concat(imageData)).length > 0, "encoded image payload is not decodable");
}

const browser = await chromium.launch({ headless: true });
const errors = [];

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
  const unexpectedRequests = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => { if (request.method() !== "GET" || request.url().includes("/api/")) unexpectedRequests.push(request.url()); });

  for (const [path, heading] of routes) {
    const response = await page.goto(base + path, { waitUntil: "networkidle" });
    requireCondition(response?.status() === 200, `${path} did not return HTTP 200`);
    requireCondition(await page.getByRole("heading", { name: heading, exact: true }).first().isVisible(), `${path} is missing its expected H1`);
    requireCondition(await page.locator("h1").count() === 1, `${path} needs exactly one H1`);
    if (path !== "/workspace") {
      const expected = `https://aimetadateremover.pro${path}`;
      requireCondition(new URL(await page.locator('link[rel="canonical"]').getAttribute("href")).href === expected, `${path} has the wrong canonical`);
      requireCondition(new URL(await page.locator('meta[property="og:url"]').getAttribute("content")).href === expected, `${path} has the wrong OG URL`);
      requireCondition(await page.locator('meta[name="twitter:card"]').getAttribute("content") === "summary_large_image", `${path} needs a share card`);
      const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
      for (const schema of schemas) { JSON.parse(schema); requireCondition(!schema.includes("localhost"), `${path} schema contains localhost`); }
    }
    if (path === "/remove-metadata-from-png") {
      requireCondition(await page.locator('meta[name="robots"][content*="noindex"]').count() === 0, "tested PNG cleaner should be indexable");
    }

  }

  await page.goto(base + "/workspace", { waitUntil: "networkidle" });
  const robots = await page.locator('meta[name="robots"]').getAttribute("content") ?? "";
  requireCondition(robots.includes("noindex") && robots.includes("nofollow"), "workspace must be noindex, nofollow");
  const sitemap = await desktop.request.get(base + "/sitemap.xml");
  requireCondition(sitemap.status() === 200, "sitemap did not return HTTP 200");
  const sitemapText = await sitemap.text();
  requireCondition(!sitemapText.includes("localhost"), "sitemap contains localhost");
  const locations = [...sitemapText.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  requireCondition(locations.length === 9 && locations.every((url) => new URL(url).origin === "https://aimetadateremover.pro"), "sitemap origins or route count are wrong");
  const robotsResponse = await desktop.request.get(base + "/robots.txt");
  requireCondition((await robotsResponse.text()).includes("Sitemap: https://aimetadateremover.pro/sitemap.xml"), "robots sitemap origin is wrong");
  const shareImage = await desktop.request.get(base + "/images/metadata-cleaner-preview.png");
  requireCondition(shareImage.status() === 200 && shareImage.headers()["content-type"].includes("image/png"), "share preview is missing");
  requireCondition(!sitemapText.includes("/workspace") && !sitemapText.includes("/pricing") && !sitemapText.includes("/ai-image-humanizer"), "sitemap exposed private or later-phase routes");

  await page.goto(base + "/metadata-checker", { waitUntil: "networkidle" });
  const invalidRequestCount = unexpectedRequests.length;
  const startingUrl = page.url();
  await page.getByLabel("Choose JPG, PNG, or WebP images").setInputFiles({ name: "not-really.png", mimeType: "image/png", buffer: Buffer.from("not image bytes") });
  await page.locator(".error-banner").waitFor();
  requireCondition(page.url() === startingUrl, "file selection changed the public route");
  requireCondition(unexpectedRequests.length === invalidRequestCount, `invalid local scan made an unexpected write/API request: ${unexpectedRequests.slice(invalidRequestCount).join(", ")}`);
  requireCondition(await page.getByRole("button", { name: "Add images" }).isVisible(), "a failed file blocked the next selection");

  await page.goto(base + "/", { waitUntil: "networkidle" });
  requireCondition(await page.locator('script[type="application/ld+json"]').count() === 2, "homepage needs application and website schemas");
  requireCondition(await page.locator(".metadata-preview img").evaluate((img) => img.complete && img.naturalWidth === 1200), "sample screenshot failed to load");
  const embeddedAlignment = await page.evaluate(() => {
    const shell = document.querySelector(".workspace-embedded")?.getBoundingClientRect();
    const stage = document.querySelector(".workspace-embedded .tool-stage")?.getBoundingClientRect();
    if (!shell || !stage) return null;
    return Math.abs((shell.left + shell.width / 2) - (stage.left + stage.width / 2));
  });
  requireCondition(embeddedAlignment !== null && embeddedAlignment <= 1, `embedded tool content is offset from center by ${embeddedAlignment === null ? "missing" : Math.round(embeddedAlignment)}px`);

  await page.goto(base + "/metadata-checker", { waitUntil: "networkidle" });
  const primaryNav = page.getByRole("navigation", { name: "Primary navigation" });
  requireCondition(await primaryNav.getByRole("link", { name: "PNG Remover" }).count() === 1, "primary navigation is missing PNG Remover");
  requireCondition(await primaryNav.getByRole("link", { name: "Metadata Checker" }).getAttribute("aria-current") === "page", "current primary navigation link is not announced");
  await page.getByRole("button", { name: "Try a safe sample" }).click();
  await page.getByText("AI generation parameters").waitFor();
  requireCondition(await page.getByText("Scan complete").isVisible(), "sample scan did not reach the complete state");

  await page.goto(base + "/remove-metadata-from-png", { waitUntil: "networkidle" });
  const cleanRequestCount = unexpectedRequests.length;
  await page.getByRole("button", { name: "Try a safe sample" }).click();
  await page.getByRole("button", { name: "Create clean copy" }).waitFor();
  await page.getByRole("button", { name: "Create clean copy" }).click();
  await page.getByRole("button", { name: "Download clean copy" }).waitFor();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download clean copy" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  requireCondition(Boolean(downloadPath), "clean PNG download did not create a local file");
  assertCleanPng(await readFile(downloadPath));
  requireCondition(unexpectedRequests.length === cleanRequestCount, `successful local clean made an unexpected write/API request: ${unexpectedRequests.slice(cleanRequestCount).join(", ")}`);

  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true });
  const mobilePage = await mobile.newPage();
  mobilePage.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  mobilePage.on("pageerror", (error) => errors.push(error.message));

  await mobilePage.goto(base + "/", { waitUntil: "networkidle" });
  const chooseBox = await mobilePage.getByRole("button", { name: "Choose images" }).boundingBox();
  requireCondition(Boolean(chooseBox) && chooseBox.y + chooseBox.height <= 760, `mobile homepage primary action ends at ${chooseBox ? Math.round(chooseBox.y + chooseBox.height) : "missing"}px`);

  for (const locator of [mobilePage.getByRole("button", { name: "Open navigation", exact: true }), mobilePage.getByRole("link", { name: "Open Workspace", exact: true })]) {
    const box = await locator.boundingBox();
    requireCondition(Boolean(box) && box.height >= 44, `mobile header target is only ${box ? Math.round(box.height) : "missing"}px high`);
  }

  await mobilePage.goto(base + "/workspace", { waitUntil: "networkidle" });
  await mobilePage.getByRole("button", { name: "Try a safe sample" }).click();
  await mobilePage.getByText("AI generation parameters").waitFor();
  const controls = mobilePage.locator(".preview-tools button, .tool-tabs button");
  for (let index = 0; index < await controls.count(); index += 1) {
    const control = controls.nth(index);
    const box = await control.boundingBox();
    requireCondition(Boolean(box) && box.height >= 44, `workspace control ${index + 1} is only ${box ? Math.round(box.height) : "missing"}px high`);
  }
  requireCondition(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "mobile workspace overflows horizontally");

  await mobilePage.goto(base + "/guides/image-metadata-before-publishing", { waitUntil: "networkidle" });
  const unlabeledCells = await mobilePage.locator(".island tbody td:not([data-label])").count();
  requireCondition(unlabeledCells === 0, `${unlabeledCells} mobile guide cells are missing stacked labels`);

  const responsivePage = await desktop.newPage();
  for (const viewport of [
    { width: 390, height: 844, label: "390" },
    { width: 768, height: 1024, label: "768" },
    { width: 812, height: 375, label: "812-landscape" },
    { width: 1024, height: 768, label: "1024" },
    { width: 1440, height: 900, label: "1440" },
  ]) {
    await responsivePage.setViewportSize(viewport);
    for (const path of ["/", "/workspace", "/guides/image-metadata-before-publishing"]) {
      await responsivePage.goto(base + path, { waitUntil: "networkidle" });
      const overflow = await responsivePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      requireCondition(overflow <= 1, `${path} overflows by ${overflow}px at ${viewport.label}`);
    }
  }
  await responsivePage.close();

  requireCondition(errors.length === 0, `browser console errors: ${errors.join(" | ")}`);
  console.log(`PASS browser QA routes=${routes.size} responsive=375/390/768/812L/1024/1440 sample=real-local touch=44px`);
  await mobile.close();
  await desktop.close();
} finally {
  await browser.close();
}
