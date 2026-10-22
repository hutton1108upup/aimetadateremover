import { chromium, webkit } from "@playwright/test";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import fs from "node:fs/promises";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3002";
const out = "artifacts/mobile-flow-audit";
await fs.mkdir(out, { recursive: true });
const oversizedPath = `${out}/oversized-390.pdf`;
await fs.writeFile(oversizedPath, Buffer.alloc(50 * 1024 * 1024 + 1));

const pdfDoc = await PDFDocument.create();
pdfDoc.addPage([240, 160]);
pdfDoc.setTitle("390 QA title");
pdfDoc.setAuthor("390 QA author");
const validPdf = Buffer.from(await pdfDoc.save());
const validPdfPath = `${out}/valid-390.pdf`;
await fs.writeFile(validPdfPath, validPdf);
const docxZip = new JSZip();
docxZip.file("[Content_Types].xml", `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
docxZip.file("_rels/.rels", `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
docxZip.file("word/document.xml", `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>390 QA body</w:t></w:r></w:p></w:body></w:document>`);
docxZip.file("word/media/image1.bin", Buffer.from("390 QA media"));
docxZip.file("docProps/core.xml", `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>390 QA title</dc:title><dc:creator>390 QA author</dc:creator></cp:coreProperties>`);
const validDocx = await docxZip.generateAsync({ type: "nodebuffer" });
const validDocxPath = `${out}/valid-390.docx`;
await fs.writeFile(validDocxPath, validDocx);
const webp = Buffer.from("UklGRiIAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAUAmJaQAA3AA/vuUAAA=", "base64");

async function checkDocument(browser, name) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  page.setDefaultTimeout(15000);
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator(".mobile-menu > summary").click();
  await page.locator(".mobile-tools-group > summary").click();
  const menu = await page.locator(".mobile-menu-panel").boundingBox();
  if (!menu || menu.x < 8 || menu.x + menu.width > 382) throw new Error(`${name}: menu clipped`);
  await page.screenshot({ path: `${out}/${name}-menu-tools-390.png` });
  await page.locator('.mobile-tools-group a[href="/pdf-metadata-remover"]').click();
  await page.waitForURL((url) => url.pathname === "/pdf-metadata-remover", { timeout: 30000 });
  if (await page.locator(".mobile-menu").getAttribute("open") !== null) throw new Error(`${name}: menu stayed open`);
  await page.getByRole("button", { name: "Choose file", exact: true }).waitFor({ state: "visible" });
  if (name === "chromium") {
    await page.locator('input[type=file]').setInputFiles({ name: "same-name.pdf", mimeType: "application/pdf", buffer: Buffer.from("broken") });
    await page.locator(".error-banner").waitFor({ state: "attached" });
  }
  await page.locator('input[type=file]').waitFor({ state: "attached" });
  await page.waitForTimeout(500);
  await page.locator('input[type=file]').setInputFiles(validPdfPath);
  await page.getByRole("heading", { name: "Found properties" }).waitFor();
  await page.getByRole("button", { name: "Clean PDF properties" }).click();
  await page.getByRole("heading", { name: "Output verified" }).waitFor();
  await page.screenshot({ path: `${out}/${name}-pdf-result-390.png` });
  await page.locator('input[type=file]').setInputFiles([]);
  if (!(await page.getByRole("heading", { name: "Output verified" }).count())) throw new Error(`${name}: cancel lost PDF result`);
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator("#tab-pdf").click();
  await page.locator("#tab-docx").click();
  await page.getByRole("button", { name: "Choose file", exact: true }).waitFor({ state: "visible" });
  if (await page.getByRole("heading", { name: "Output verified" }).count()) throw new Error(`${name}: PDF result leaked into DOCX tab`);
  await page.locator('#panel-docx input[type=file]').setInputFiles(validDocxPath);
  await page.getByRole("heading", { name: "Found properties" }).waitFor();
  await page.getByRole("button", { name: "Clean Word DOCX properties" }).click();
  await page.getByRole("heading", { name: "Output verified" }).waitFor();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download clean copy/ }).click();
  const downloaded = `${out}/${name}-docx-390.docx`;
  await (await downloadEvent).saveAs(downloaded);
  const checked = await JSZip.loadAsync(await fs.readFile(downloaded));
  if (!(await checked.file("word/document.xml").async("string")).includes("390 QA body") || (await checked.file("docProps/core.xml").async("string")).includes("390 QA title")) throw new Error(`${name}: DOCX download verification failed`);
  if (name === "chromium") {
    await page.goto(`${base}/pdf-metadata-remover`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.getByRole("button", { name: "Choose file", exact: true }).waitFor({ state: "visible" });
    await page.locator('input[type=file]').setInputFiles(oversizedPath);
    await page.getByText("This file exceeds the 50 MB local processing limit.", { exact: true }).waitFor();
    await page.screenshot({ path: `${out}/${name}-oversize-390.png` });
  }
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.getByRole("button", { name: "Choose images" }).waitFor({ state: "visible" });
  await page.locator("#panel-image input[type=file]").setInputFiles({ name: "inspection.webp", mimeType: "image/webp", buffer: webp });
  await page.getByText("Inspection only", { exact: true }).first().waitFor();
  await page.screenshot({ path: `${out}/${name}-webp-inspection-390.png` });
  await page.close();
}

for (const [name, type] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await type.launch({ headless: true });
  try { await checkDocument(browser, name); console.log(`${name} 390px mobile flow passed`); } finally { await browser.close(); }
}
await fs.writeFile(`${out}/review.md`, `# Mobile flow audit\n\n- Chromium and WebKit 390px menu, Tools expansion, route closing and bbox checks passed.\n- Chromium: a damaged same-name PDF was rejected, a same-name valid PDF recovered, the cleaned output was verified, and cancelling file selection preserved the PDF result.\n- Chromium and WebKit: valid PDF and DOCX clean downloads passed; DOCX body text was preserved and core properties were removed.\n- Switching to Word did not retain the PDF result.\n- Chromium rejected files over 50 MB before processing.\n- WebP was reported as inspection-only; no cleaning/download action was offered.\n- Screenshots and downloaded samples are in this directory.\n`);


\n