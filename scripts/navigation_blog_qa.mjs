import { chromium } from "@playwright/test";
import fs from "node:fs";
const out = "artifacts/navigation-blog-qa";
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE_URL ?? "http://127.0.0.1:3002";
const articles = [
  "remove-author-metadata-from-pdf-before-sharing",
  "remove-author-last-modified-by-word-document",
];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  for (const width of [1440, 1280, 1024]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
    if (width > 1024) {
      await page.getByRole("button", { name: "Tools", exact: true }).click();
      for (const label of ["PDF Remover", "Word Remover"])
        if (
          !(await page.getByRole("link", { name: label }).first().isVisible())
        )
          throw new Error(`${label} hidden at ${width}`);
      const panelBox = await page.locator(".tools-panel").boundingBox();
      if (!panelBox || panelBox.x < 0 || panelBox.x + panelBox.width > width) throw new Error(`Tools panel overflows at ${width}`);
      await page.getByRole("button", { name: "Tools", exact: true }).click();
    } else {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page.locator(".mobile-tools-group > summary").click();
      for (const label of ["PDF Remover", "Word Remover"])
        if (!(await page.getByRole("link", { name: label }).last().isVisible()))
          throw new Error(`${label} hidden in menu at ${width}`);
    }
    await page.screenshot({ path: `${out}/home-${width}.png` });
  }
  for (const width of [390, 320]) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator(".mobile-tools-group > summary").click();
  for (const label of ["PDF Remover", "Word Remover"])
    if (!(await page.getByRole("link", { name: label }).last().isVisible()))
      throw new Error(`${label} missing mobile`);
  await Promise.all([page.waitForURL("**/pdf-metadata-remover"), page.getByRole("link", { name: "PDF Remover" }).last().click()]);
  if ((await page.locator(".mobile-menu").getAttribute("open")) !== null)
    throw new Error("Mobile menu did not close");
  if (!page.url().endsWith("/pdf-metadata-remover"))
    throw new Error("PDF navigation path failed");
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator(".mobile-tools-group > summary").click();
  await Promise.all([page.waitForURL("**/docx-metadata-remover"), page.getByRole("link", { name: "Word Remover" }).last().click()]);
  if (!page.url().endsWith("/docx-metadata-remover"))
    throw new Error("Word navigation path failed");
  if ((await page.evaluate(() => document.documentElement.scrollWidth)) > width) throw new Error(`Mobile overflow at ${width}`);
  }
  for (const slug of articles) {
    await page.goto(`${base}/blog/${slug}`, { waitUntil: "domcontentloaded" });
    if ((await page.evaluate(() => document.documentElement.scrollWidth)) > 320)
      throw new Error(`Mobile overflow ${slug}`);
    const meta = await page.evaluate(() => ({
      title: document.title,
      description: document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content"),
      canonical: document
        .querySelector('link[rel="canonical"]')
        ?.getAttribute("href"),
      h1: document.querySelector("h1")?.textContent,
      words: (document.querySelector("main")?.textContent ?? "")
        .trim()
        .split(/\s+/).length,
    }));
    if (
      !meta.title ||
      !meta.description ||
      !meta.canonical?.endsWith(`/blog/${slug}`) ||
      meta.words < 550
    )
      throw new Error(`Article metadata or length failed ${slug}`);
    if (
      !(await page
        .locator(
          `a[href="/${slug.includes("pdf") ? "pdf-metadata-remover" : "docx-metadata-remover"}"]`,
        )
        .count())
    )
      throw new Error(`Tool link missing ${slug}`);
    if (
      (await page.locator("h1").count()) !== 1 ||
      !(await page.locator("script[type='application/ld+json']").count())
    )
      throw new Error(`Article render failed ${slug}`);
    await page.screenshot({ path: `${out}/${slug}.png`, fullPage: true });
  }
  await page.goto(`${base}/blog`, { waitUntil: "domcontentloaded" });
  for (const slug of articles)
    if (!(await page.locator(`a[href="/blog/${slug}"]`).count()))
      throw new Error(`Blog cards missing ${slug}`);
  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  for (const slug of articles)
    if (!sitemap.includes(`/blog/${slug}`))
      throw new Error(`Sitemap missing ${slug}`);
  console.log("navigation and blog QA passed");
} finally {
  await browser.close();
}
