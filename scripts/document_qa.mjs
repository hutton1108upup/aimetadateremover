import { chromium } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import fs from "node:fs";
const out = "artifacts/document-qa";
fs.mkdirSync(out, { recursive: true });
const pdf = await PDFDocument.create();
pdf.addPage([200, 200]);
pdf.setTitle("QA secret");
fs.writeFileSync(`${out}/qa.pdf`, await pdf.save());
const zip = new JSZip();
zip.file(
  "[Content_Types].xml",
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
);
zip.file(
  "_rels/.rels",
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
);
zip.file(
  "word/document.xml",
  `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>QA body</w:t></w:r></w:p></w:body></w:document>`,
);
zip.file("word/media/image1.bin", Buffer.from("QA MEDIA"));
zip.file(
  "docProps/core.xml",
  `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>QA secret</dc:title></cp:coreProperties>`,
);
fs.writeFileSync(
  `${out}/qa.docx`,
  await zip.generateAsync({ type: "nodebuffer" }),
);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const base = process.env.BASE_URL ?? "http://127.0.0.1:3001";
  for (const [path, title] of [
    [
      "/pdf-metadata-remover",
      "PDF Metadata Remover — Free & Private, No Upload",
    ],
    [
      "/docx-metadata-remover",
      "Word Metadata Remover — Clean DOCX Properties Locally",
    ],
  ]) {
    await page.goto(base + path, { waitUntil: "domcontentloaded" });
    if (
      (await page.title()) !== title ||
      (await page.locator("h1").count()) !== 1
    )
      throw new Error(`SEO failed ${path}`);
    await page.screenshot({
      path: `${out}${path}-desktop.png`,
      fullPage: true,
    });
  }
  const originalZip = await JSZip.loadAsync(fs.readFileSync(`${out}/qa.docx`));
  const originalBody = await originalZip
    .file("word/document.xml")
    .async("uint8array");
  const originalMedia = await originalZip
    .file("word/media/image1.bin")
    .async("uint8array");
  for (const [path, file, button] of [
    ["/pdf-metadata-remover", `${out}/qa.pdf`, "Clean PDF properties"],
    ["/docx-metadata-remover", `${out}/qa.docx`, "Clean Word DOCX properties"],
  ]) {
    await page.goto(base + path, { waitUntil: "domcontentloaded" });
    await page.locator('input[type="file"]').setInputFiles(file);
    await page.getByRole("heading", { name: "Found properties" }).waitFor();
    await page.getByRole("button", { name: button }).click();
    await page.getByRole("heading", { name: "Output verified" }).waitFor();
    const waitDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download clean copy/ }).click();
    const download = await waitDownload;
    const output = `${out}${path}-download.${path.includes("pdf") ? "pdf" : "docx"}`;
    await download.saveAs(output);
    if (path.includes("pdf")) {
      const checked = await PDFDocument.load(fs.readFileSync(output));
      if (
        checked.getTitle() ||
        checked.getAuthor() ||
        checked.getPageCount() !== 1
      )
        throw new Error("PDF output verification failed");
    } else {
      const cleaned = await JSZip.loadAsync(fs.readFileSync(output));
      if (
        Buffer.compare(
          Buffer.from(originalBody),
          Buffer.from(
            await cleaned.file("word/document.xml").async("uint8array"),
          ),
        ) !== 0 ||
        Buffer.compare(
          Buffer.from(originalMedia),
          Buffer.from(
            await cleaned.file("word/media/image1.bin").async("uint8array"),
          ),
        ) !== 0 ||
        (await cleaned.file("docProps/core.xml").async("string")).includes(
          "QA secret",
        )
      )
        throw new Error("DOCX output verification failed");
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "PDF" }).click();
  await page.screenshot({
    path: `${out}/home-pdf-desktop.png`,
    fullPage: false,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [path, file, button] of [
    ["/pdf-metadata-remover", `${out}/qa.pdf`, "Clean PDF properties"],
    ["/docx-metadata-remover", `${out}/qa.docx`, "Clean Word DOCX properties"],
  ]) {
    await page.goto(base + path, { waitUntil: "domcontentloaded" });
    if ((await page.evaluate(() => document.documentElement.scrollWidth)) > 390)
      throw new Error(`Horizontal overflow ${path}`);
    await page.locator('input[type="file"]').setInputFiles(file);
    await page.getByRole("heading", { name: /Found properties/ }).waitFor();
    await page.getByRole("button", { name: button }).click();
    await page.getByRole("heading", { name: "Output verified" }).waitFor();
    await page.screenshot({
      path: `${out}${path}-mobile-390.png`,
      fullPage: true,
    });
    if ((await page.evaluate(() => document.documentElement.scrollWidth)) > 390)
      throw new Error(`Result overflow ${path}`);
  }
  console.log("document upload QA passed; mobile viewport 390x844");
} finally {
  await browser.close();
}
