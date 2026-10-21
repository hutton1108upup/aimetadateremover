import { PDFDocument, PDFName, PDFString, PDFRef } from "pdf-lib";
import { DOCUMENT_LIMITS, type DocumentCleanResult, type DocumentProperty, type DocumentScan } from "./types";

const infoKeys = ["Title", "Author", "Subject", "Keywords", "Creator", "Producer", "CreationDate", "ModDate"] as const;
const pdfCoverageWarning = "Only PDF Info and document-level XMP are cleaned; annotations, page metadata, embedded files, media, scripts and invisible watermarks are outside this scope.";

function textValue(value: unknown): string {
  if (value instanceof PDFString) return value.decodeText();
  return String(value ?? "");
}

function scanLoaded(doc: PDFDocument): DocumentProperty[] {
  const properties: DocumentProperty[] = [];
  for (const key of infoKeys) {
    const value = textValue(key === "Title" ? doc.getTitle() : key === "Author" ? doc.getAuthor() : key === "Subject" ? doc.getSubject() : key === "Keywords" ? doc.getKeywords() : key === "Creator" ? doc.getCreator() : key === "Producer" ? doc.getProducer() : key === "CreationDate" ? doc.getCreationDate()?.toISOString() : doc.getModificationDate()?.toISOString());
    if (value) properties.push({ key, label: `PDF ${key}`, value, source: "pdf-info" });
  }
  const metadata = doc.catalog.get(PDFName.of("Metadata"));
  if (metadata) properties.push({ key: "XMP", label: "Document-level XMP metadata", value: "Present", source: "pdf-xmp" });
  return properties;
}

function isRef(value: unknown): value is PDFRef { return value instanceof PDFRef; }
function hasSignature(doc: PDFDocument): boolean {
  const seen = new Set<string>();
  const walk = (value: unknown): boolean => {
    if (isRef(value)) { const id = value.toString(); if (seen.has(id)) return false; seen.add(id); return walk(doc.context.lookup(value)); }
    if (!value || typeof value !== "object") return false;
    const candidate = value as { entries?: () => Array<[unknown, unknown]>; dict?: unknown; size?: () => number; get?: (index: number) => unknown };
    if (candidate.entries) for (const [key, child] of candidate.entries()) { const keyText = String(key); if (/ByteRange|\/Sig\b/i.test(keyText) || (/\/FT\b/i.test(keyText) && String(child).includes("/Sig")) || (/\/Type\b/i.test(keyText) && String(child).includes("/Sig"))) return true; if (walk(child)) return true; }
    if (candidate.dict && walk(candidate.dict)) return true;
    if (typeof candidate.size === "function" && candidate.get) for (let i = 0; i < candidate.size(); i += 1) if (walk(candidate.get(i))) return true;
    return false;
  };
  return walk(doc.context.trailerInfo.Root);
}
function deleteUnreachable(doc: PDFDocument) {
  const reachable = new Set<string>();
  const walk = (value: unknown): void => {
    if (isRef(value)) { const id = value.toString(); if (reachable.has(id)) return; reachable.add(id); walk(doc.context.lookup(value)); return; }
    if (!value || typeof value !== "object") return;
    const candidate = value as { entries?: () => Array<[unknown, unknown]>; dict?: unknown; size?: () => number; get?: (index: number) => unknown };
    if (candidate.entries) for (const [, child] of candidate.entries()) walk(child);
    if (candidate.dict) walk(candidate.dict);
    if (typeof candidate.size === "function" && candidate.get) for (let i = 0; i < candidate.size(); i += 1) walk(candidate.get(i));
  };
  walk(doc.context.trailerInfo.Root);
  for (const [ref] of doc.context.enumerateIndirectObjects()) if (!reachable.has(ref.toString())) doc.context.delete(ref);
}
function rootReferenceCount(doc: PDFDocument, target: PDFRef): number {
  const seen = new Set<string>(); let count = 0;
  const walk = (value: unknown): void => { if (isRef(value)) { if (value.toString() === target.toString()) { count += 1; return; } const id = value.toString(); if (seen.has(id)) return; seen.add(id); walk(doc.context.lookup(value)); return; } if (!value || typeof value !== "object") return; const candidate = value as { entries?: () => Array<[unknown, unknown]>; dict?: unknown; size?: () => number; get?: (index: number) => unknown }; if (candidate.entries) for (const [, child] of candidate.entries()) walk(child); if (candidate.dict) walk(candidate.dict); if (typeof candidate.size === "function" && candidate.get) for (let i = 0; i < candidate.size(); i += 1) walk(candidate.get(i)); };
  walk(doc.context.trailerInfo.Root); return count;
}

export async function scanPdf(input: ArrayBuffer): Promise<DocumentScan> {
  if (input.byteLength > DOCUMENT_LIMITS.pdfBytes) throw new Error("PDF exceeds the 50 MB local processing limit.");
  try {
    const doc = await PDFDocument.load(input, { ignoreEncryption: false, updateMetadata: false });
    if (hasSignature(doc)) throw new Error("Signed PDFs are not supported because rewriting would invalidate the signature.");
    return { kind: "pdf", properties: scanLoaded(doc), warnings: [pdfCoverageWarning], canClean: true };
  } catch {
    throw new Error("This PDF is encrypted, signed, damaged, or uses a feature this local cleaner cannot safely rewrite.");
  }
}

export async function cleanPdf(input: ArrayBuffer): Promise<DocumentCleanResult> {
  if (input.byteLength > DOCUMENT_LIMITS.pdfBytes) throw new Error("PDF exceeds the 50 MB local processing limit.");
  let doc: PDFDocument;
  try { doc = await PDFDocument.load(input, { ignoreEncryption: false, updateMetadata: false }); }
  catch { throw new Error("This PDF is encrypted, signed, damaged, or uses a feature this local cleaner cannot safely rewrite."); }
  if (hasSignature(doc)) throw new Error("Signed PDFs are not supported because rewriting would invalidate the signature.");
  const before = scanLoaded(doc);
  const infoRef = doc.context.trailerInfo.Info;
  const xmpRef = doc.catalog.get(PDFName.of("Metadata"));
  if (infoRef instanceof PDFRef && rootReferenceCount(doc, infoRef) > 0) throw new Error("This PDF shares its Info object with reachable page content and cannot be safely cleaned.");
  if (xmpRef instanceof PDFRef && rootReferenceCount(doc, xmpRef) > 2) throw new Error("This PDF shares its XMP object with other reachable content and cannot be safely cleaned.");
  doc.context.trailerInfo.Info = undefined;
  doc.catalog.delete(PDFName.of("Metadata"));
  deleteUnreachable(doc);
  const bytes = await doc.save({ useObjectStreams: false, addDefaultPage: false, updateFieldAppearances: false });
  const output = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const checked = await PDFDocument.load(output, { updateMetadata: false });
  const remaining = scanLoaded(checked);
  if (remaining.length) throw new Error("The rewritten PDF still contains supported metadata, so no download was created.");
  return { output, scan: { kind: "pdf", properties: before, warnings: [pdfCoverageWarning], canClean: true }, verification: { removed: before.map(item => item.label), remaining, warnings: [pdfCoverageWarning] } };
}
