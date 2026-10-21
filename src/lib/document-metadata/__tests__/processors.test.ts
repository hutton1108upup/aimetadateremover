import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { PDFDocument, PDFName } from "pdf-lib";
import { cleanDocx, scanDocx } from "../docx";
import { cleanPdf } from "../pdf";

describe("document metadata processors", () => {
  it("rewrites PDF info and verifies the result", async () => {
    const pdf = await PDFDocument.create(); const page = pdf.addPage([200, 200]); page.drawText("Author"); pdf.setTitle("Private title"); pdf.setAuthor("Author"); const xmp = pdf.context.stream("<x:xmpmeta>PRIVATE_XMP_MARKER</x:xmpmeta>", { Type: PDFName.of("Metadata"), Subtype: PDFName.of("XML") }); pdf.catalog.set(PDFName.of("Metadata"), pdf.context.register(xmp));
    const input = (await pdf.save()).buffer as ArrayBuffer;
    const result = await cleanPdf(input);
    expect(result.verification.remaining).toHaveLength(0);
    expect(new TextDecoder().decode(new Uint8Array(result.output))).not.toContain("PRIVATE_XMP_MARKER");
    const checked = await PDFDocument.load(result.output);
    expect(checked.getTitle()).toBeUndefined(); expect(checked.getAuthor()).toBeUndefined(); expect(checked.getPageCount()).toBe(1); expect(checked.getPage(0).node.get(PDFName.of("Contents"))).toBeTruthy();
  });

  it("cleans DOCX properties while retaining the document part", async () => {
    const zip = new JSZip(); zip.file("[Content_Types].xml", "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/></Types>"); zip.file("_rels/.rels", "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"/>"); zip.file("word/document.xml", "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p>Hello</w:p></w:body></w:document>"); zip.file("docProps/core.xml", "<cp:coreProperties xmlns:cp=\"http://schemas.openxmlformats.org/package/2006/metadata/core-properties\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\"><dc:title>Secret</dc:title><dc:creator>A</dc:creator></cp:coreProperties>"); zip.file("docProps/app.xml", "<Properties xmlns=\"http://schemas.openxmlformats.org/officeDocument/2006/extended-properties\"><Application>Word</Application><Company>Private Co</Company></Properties>"); zip.file("docProps/custom.xml", "<Properties xmlns=\"http://schemas.openxmlformats.org/officeDocument/2006/custom-properties\"><property name=\"Secret\"><value>Hidden</value></property></Properties>");
    zip.file("_rels/.rels", "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/></Relationships>"); const input = (await zip.generateAsync({ type: "uint8array" })).buffer as ArrayBuffer;
    expect((await scanDocx(input)).properties.length).toBeGreaterThanOrEqual(4);
    const originalDocument = await (await JSZip.loadAsync(input)).file("word/document.xml")?.async("uint8array"); const result = await cleanDocx(input); expect(result.verification.remaining).toHaveLength(0); const out = await JSZip.loadAsync(result.output); const cleanedDocument = await out.file("word/document.xml")?.async("uint8array"); expect(Array.from(cleanedDocument ?? [])).toEqual(Array.from(originalDocument ?? [])); expect(new TextDecoder().decode(cleanedDocument)).toContain("Hello");
  });

  it("rejects an invalid DOCX package", async () => { await expect(scanDocx(new TextEncoder().encode("not a docx").buffer as ArrayBuffer)).rejects.toThrow(/ZIP|DOCX/); });
  it("rejects a parsed PDF signature dictionary", async () => { const pdf = await PDFDocument.create(); pdf.addPage(); const signature = pdf.context.obj({ Type: PDFName.of("Sig"), ByteRange: pdf.context.obj([0, 1, 2, 3]) }); pdf.catalog.set(PDFName.of("Signature"), pdf.context.register(signature)); const input = (await pdf.save()).buffer as ArrayBuffer; await expect(cleanPdf(input)).rejects.toThrow(/Signed PDF/); });
  it("rejects an XMP stream shared by another reachable catalog key", async () => { const pdf = await PDFDocument.create(); pdf.addPage(); const xmp = pdf.context.register(pdf.context.stream("<x:xmpmeta>SHARED</x:xmpmeta>", { Type: PDFName.of("Metadata"), Subtype: PDFName.of("XML") })); pdf.catalog.set(PDFName.of("Metadata"), xmp); pdf.catalog.set(PDFName.of("OtherMetadata"), xmp); const input = (await pdf.save()).buffer as ArrayBuffer; await expect(cleanPdf(input)).rejects.toThrow(/shares its XMP/); });
});
