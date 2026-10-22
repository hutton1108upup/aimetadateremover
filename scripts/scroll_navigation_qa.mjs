import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3002";
const widths = [1440, 390];
const routes = [
  "/",
  "/remove-metadata-from-jpeg",
  "/remove-metadata-from-png",
  "/batch-metadata-remover",
  "/remove-gps-from-photo",
  "/comfyui-workflow-remover",
  "/stable-diffusion-metadata-remover",
  "/metadata-checker",
  "/c2pa-metadata-checker",
  "/pdf-metadata-remover",
  "/docx-metadata-remover",
  "/blog",
  "/blog/remove-author-metadata-from-pdf-before-sharing",
  "/blog/remove-author-last-modified-by-word-document",
  "/pricing",
  "/about",
  "/privacy",
  "/terms",
  "/workspace",
];
const toolLinks = [
  "/remove-metadata-from-jpeg",
  "/remove-metadata-from-png",
  "/batch-metadata-remover",
  "/remove-gps-from-photo",
  "/comfyui-workflow-remover",
  "/stable-diffusion-metadata-remover",
  "/pdf-metadata-remover",
  "/docx-metadata-remover",
  "/metadata-checker",
  "/c2pa-metadata-checker",
];

async function open(page, path) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(350);
}

async function clickRoute(page, locator, target) {
  await Promise.all([
    page.waitForURL((url) => url.pathname === target, { timeout: 30000 }),
    locator.click(),
  ]);
  await page.waitForTimeout(350);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(10000);

    for (const route of routes) {
      await open(page, route);
      const state = await page.evaluate(() => ({ y: scrollY, hasMain: Boolean(document.querySelector("main")) }));
      if (state.y !== 0 || !state.hasMain) throw new Error(`${width}px direct ${route} y=${state.y}`);
    }

    for (const target of toolLinks) {
      await open(page, "/");
      await page.evaluate(() => scrollTo({ top: Math.min(2200, document.body.scrollHeight), behavior: "instant" }));
      if (width > 1024) {
        await page.getByRole("button", { name: "Tools", exact: true }).click();
        await clickRoute(page, page.locator(`#tools-panel a[href="${target}"]`), target);
      } else {
        await page.locator(".mobile-menu > summary").click();
        await page.locator(".mobile-tools-group > summary").click();
        await clickRoute(page, page.locator(`.mobile-tools-group a[href="${target}"]`), target);
      }
      await page.waitForTimeout(900);
      const result = await page.evaluate(() => ({ path: location.pathname, y: scrollY, h1Top: document.querySelector("h1")?.getBoundingClientRect().top ?? null }));
      if (result.path !== target || result.y > 2 || result.h1Top < 0) throw new Error(`${width}px Tools ${target} ${JSON.stringify(result)}`);
    }

    await open(page, "/");
    await page.evaluate(() => scrollTo({ top: Math.min(2200, document.body.scrollHeight), behavior: "instant" }));
    await clickRoute(page, page.locator('a[href="/blog/remove-author-metadata-from-pdf-before-sharing"]'), "/blog/remove-author-metadata-from-pdf-before-sharing");
    if ((await page.evaluate(() => ({ path: location.pathname, y: scrollY }))).y > 2) throw new Error(`${width}px home blog card did not reset scroll`);

    await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
    await clickRoute(page, page.locator('main a[href="/pdf-metadata-remover"]').last(), "/pdf-metadata-remover");
    const related = await page.evaluate(() => ({ path: location.pathname, y: scrollY }));
    if (related.path !== "/pdf-metadata-remover" || related.y > 2) throw new Error(`${width}px blog related tool ${JSON.stringify(related)}`);

    for (const target of ["/pricing", "/about", "/privacy", "/terms"]) {
      await open(page, "/");
      await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
      const footerStart = await page.evaluate(() => scrollY);
      await clickRoute(page, page.locator(`footer a[href="${target}"]`).first(), target);
      const footerLink = await page.evaluate(() => ({ path: location.pathname, y: scrollY }));
      if (footerLink.path !== target || footerLink.y > 2) throw new Error(`${width}px footer ${target} ${JSON.stringify(footerLink)}`);
      await page.goBack({ waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(500);
      const backY = await page.evaluate(() => scrollY);
      if (await page.evaluate(() => location.pathname) !== "/" || backY < 2) throw new Error(`${width}px back restore ${target} start=${footerStart} y=${backY}`);
      await page.goForward({ waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(500);
      if (await page.evaluate(() => ({ path: location.pathname, y: scrollY })).then((state) => state.path !== target || state.y < 0)) throw new Error(`${width}px forward ${target}`);
    }

    await open(page, "/#choose-files");
    const hash = await page.evaluate(() => ({ hash: location.hash, y: scrollY, target: Boolean(document.getElementById("choose-files")), targetTop: document.getElementById("choose-files")?.getBoundingClientRect().top ?? null }));
    if (hash.hash !== "#choose-files" || !hash.target || hash.targetTop === null || hash.targetTop < 0) throw new Error(`${width}px hash navigation ${JSON.stringify(hash)}`);
    await page.close();
  }
  console.log(`scroll navigation QA passed for ${widths.join(", ")}px and ${routes.length} routes`);
} finally {
  await browser.close();
}
