import { chromium } from "@playwright/test";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import fs from "node:fs/promises";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3002";
const artifactDir = "artifacts/mobile-flow-audit";
await fs.mkdir(artifactDir, { recursive: true });

const pdf = await PDFDocument.create();
pdf.addPage([300, 200]);
pdf.setTitle("MobileQATitle_" + "x".repeat(96));
pdf.setAuthor("MobileQAAuthor_" + "y".repeat(96));
const pdfBytes = Buffer.from(await pdf.save());
const zip = new JSZip();
zip.file("[Content_Types].xml", `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
zip.file("_rels/.rels", `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
zip.file("word/document.xml", `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Keep mobile body text.</w:t></w:r></w:p></w:body></w:document>`);
zip.file("word/media/image1.bin", Buffer.from("KEEP MEDIA"));
zip.file("docProps/core.xml", `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Mobile QA title</dc:title><dc:creator>Mobile QA author</dc:creator></cp:coreProperties>`);
zip.file("docProps/app.xml", `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Mobile QA</Application><Company>Mobile QA company</Company></Properties>`);
zip.file("docProps/custom.xml", `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties"><property name="CustomName_${"n".repeat(72)}"><value>${"v".repeat(180)}</value></property></Properties>`);
const docxBytes = await zip.generateAsync({ type: "nodebuffer" });

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [320, 375, 390, 430]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, acceptDownloads: true });
    page.setDefaultTimeout(15000);
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(500);
    await page.locator(".mobile-menu > summary").click();
    await page.locator(".mobile-tools-group > summary").click();
    const menuBox = await page.locator(".mobile-menu-panel").boundingBox();
    if (!menuBox || menuBox.x < 8 || menuBox.x + menuBox.width > width - 8) throw new Error(`Mobile menu clipped at ${width}px: ${JSON.stringify(menuBox)}`);
    await page.screenshot({ path: `${artifactDir}/menu-tools-${width}.png` });
    await page.locator('.mobile-tools-group a[href="/pdf-metadata-remover"]').click();
    await page.waitForURL((url) => url.pathname === "/pdf-metadata-remover", { timeout: 30000 });
    if (await page.locator(".mobile-menu").getAttribute("open") !== null) throw new Error(`Mobile menu stayed open at ${width}px`);
    await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(500);
    await page.locator("#tab-pdf").click();
    await page.locator("#panel-pdf input[type=file]").setInputFiles({ name: "mobile-qa.pdf", mimeType: "application/pdf", buffer: pdfBytes });
    await page.getByRole("heading", { name: "Found properties" }).waitFor();
    const pdfTable = await page.locator(".document-workspace .verification-card").evaluate((card) => ({ cardWidth: card.clientWidth, scrollWidth: card.scrollWidth, rows: [...card.querySelectorAll("tr")].map((row) => [...row.children].map((cell) => { const box = cell.getBoundingClientRect(); return { right: box.right, cardRight: card.getBoundingClientRect().right }; })) }));
    if (pdfTable.scrollWidth > pdfTable.cardWidth + 1 || pdfTable.rows.flat().some((cell) => cell.right > cell.cardRight + 1)) throw new Error(`PDF metadata table overflow at ${width}px`);
    await page.screenshot({ path: `${artifactDir}/pdf-found-${width}.png` });
    await page.getByRole("button", { name: "Clean PDF properties" }).click();
    await page.getByRole("heading", { name: "Output verified" }).waitFor();
    const pdfDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download clean copy/ }).click();
    const pdfFile = `${artifactDir}/mobile-${width}.pdf`;
    await (await pdfDownload).saveAs(pdfFile);
    const checkedPdf = await PDFDocument.load(await fs.readFile(pdfFile));
    if (checkedPdf.getTitle() || checkedPdf.getAuthor() || checkedPdf.getPageCount() !== 1) throw new Error(`PDF output failed at ${width}px`);
    await page.screenshot({ path: `${artifactDir}/pdf-result-${width}.png` });
    await page.locator("#tab-docx").click();
    await page.locator("#panel-docx input[type=file]").setInputFiles({ name: "mobile-qa.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: docxBytes });
    await page.getByRole("heading", { name: "Found properties" }).waitFor();
    const docxTable = await page.locator(".document-workspace .verification-card").evaluate((card) => ({ cardWidth: card.clientWidth, scrollWidth: card.scrollWidth, rows: [...card.querySelectorAll("tr")].map((row) => [...row.children].map((cell) => { const box = cell.getBoundingClientRect(); return { right: box.right, cardRight: card.getBoundingClientRect().right }; })) }));
    if (docxTable.scrollWidth > docxTable.cardWidth + 1 || docxTable.rows.flat().some((cell) => cell.right > cell.cardRight + 1)) throw new Error(`DOCX metadata table overflow at ${width}px`);
    await page.getByRole("button", { name: "Clean Word DOCX properties" }).click();
    await page.getByRole("heading", { name: "Output verified" }).waitFor();
    const docxDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download clean copy/ }).click();
    const docxFile = `${artifactDir}/mobile-${width}.docx`;
    await (await docxDownload).saveAs(docxFile);
    const checkedZip = await JSZip.loadAsync(await fs.readFile(docxFile));
    const body = await checkedZip.file("word/document.xml").async("string");
    const media = await checkedZip.file("word/media/image1.bin").async("string");
    const core = await checkedZip.file("docProps/core.xml").async("string");
    const custom = await checkedZip.file("docProps/custom.xml").async("string");
    if (!body.includes("Keep mobile body text.") || media !== "KEEP MEDIA" || core.includes("Mobile QA title") || core.includes("Mobile QA author") || custom.includes("CustomName_") || custom.includes("v".repeat(40))) throw new Error(`DOCX output failed at ${width}px`);
    await page.screenshot({ path: `${artifactDir}/docx-result-${width}.png` });
    const layout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, width: innerWidth, path: location.pathname, y: scrollY }));
    if (layout.scrollWidth > width) throw new Error(`Mobile layout overflow at ${width}px: ${JSON.stringify(layout)}`);
    if (width === 390) {
      await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.locator("button").filter({ hasText: "Try a safe sample" }).first().click();
      await page.waitForTimeout(2500);
      if (!(await page.locator("h3").allTextContents()).some((text) => text.trim() === "Cleaning complete")) throw new Error(`Safe sample did not complete at ${width}px`);
      const sampleDownload = page.waitForEvent("download");
      await page.getByRole("button", { name: /Download (clean copy|original)/ }).click();
      const sampleFile = `${artifactDir}/image-safe-sample-${width}.png`;
      await (await sampleDownload).saveAs(sampleFile);
      const signature = Array.from((await fs.readFile(sampleFile)).subarray(0, 8));
      if (signature.join(",") !== "137,80,78,71,13,10,26,10") throw new Error(`Safe sample download was not PNG at ${width}px`);
      await page.screenshot({ path: `${artifactDir}/image-safe-sample-result-${width}.png` });
    }
    await page.close();
  }
  console.log("mobile document flow QA passed for 320, 375, 390 and 430px");
} finally {
  await browser.close();
}
