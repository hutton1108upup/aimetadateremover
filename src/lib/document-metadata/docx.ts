import JSZip from "jszip";
import { DOCUMENT_LIMITS, type DocumentCleanResult, type DocumentProperty, type DocumentScan } from "./types";

const propertyTags = ["title", "subject", "creator", "keywords", "description", "lastmodifiedby", "revision", "created", "modified", "category", "contentstatus", "identifier", "language", "version", "application", "company", "manager", "hyperlinkbase", "template", "totaltime", "pages", "words", "characters"];
const nameOf = (path: string) => path.toLowerCase().replaceAll("\\", "/");
const decode = new TextDecoder();

function rejectXmlDanger(xml: string) { if (/<\!DOCTYPE|<\!ENTITY/i.test(xml)) throw new Error("This DOCX contains XML declarations that cannot be safely processed locally."); }
function preflightZip(input: ArrayBuffer) {
  const bytes = new Uint8Array(input); const view = new DataView(input); let eocd = -1;
  for (let i = Math.max(0, bytes.length - 22 - 65535); i <= bytes.length - 22; i += 1) if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("This file is not a standard ZIP package.");
  const count = view.getUint16(eocd + 10, true); const size = view.getUint32(eocd + 12, true); const offset = view.getUint32(eocd + 16, true);
  if (count === 0xffff || size === 0xffffffff || offset === 0xffffffff) throw new Error("ZIP64 DOCX packages are not supported.");
  if (count > DOCUMENT_LIMITS.docxEntries || size > input.byteLength) throw new Error("This DOCX ZIP central directory exceeds the safe local limit.");
  let cursor = offset; let expanded = 0; const names = new Set<string>();
  for (let i = 0; i < count; i += 1) { if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error("Invalid DOCX ZIP central directory."); const flags = view.getUint16(cursor + 8, true); const method = view.getUint16(cursor + 10, true); const compressed = view.getUint32(cursor + 20, true); const uncompressed = view.getUint32(cursor + 24, true); const nameLength = view.getUint16(cursor + 28, true); const extraLength = view.getUint16(cursor + 30, true); const commentLength = view.getUint16(cursor + 32, true); if (compressed === 0xffffffff || uncompressed === 0xffffffff) throw new Error("ZIP64 DOCX entries are not supported."); if (method !== 0 && method !== 8) throw new Error("This DOCX uses an unsupported ZIP compression method."); const name = new TextDecoder().decode(bytes.slice(cursor + 46, cursor + 46 + nameLength)); if (names.has(name)) throw new Error("Duplicate DOCX ZIP paths are not supported."); names.add(name); if (name.includes("..") || name.startsWith("/") || nameOf(name).includes("_xmlsignatures/")) throw new Error("Signed or unsafe DOCX packages are not supported."); expanded += uncompressed; if (expanded > DOCUMENT_LIMITS.docxExpandedBytes) throw new Error("This DOCX expands beyond the 200 MB local processing limit."); cursor += 46 + nameLength + extraLength + commentLength; if (flags & 1) throw new Error("Encrypted DOCX packages are not supported."); }
}
async function readBounded(entry: JSZip.JSZipObject, limit: number): Promise<Uint8Array> {
  type Stream = { on: (event: string, handler: (chunk?: Uint8Array | unknown) => void) => Stream; resume: () => void; pause?: () => void };
  const stream = (entry as unknown as { internalStream?: (type: string) => Stream }).internalStream?.("uint8array");
  if (!stream) { const bytes = await entry.async("uint8array"); if (bytes.byteLength > limit) throw new Error("This DOCX exceeds the safe expanded-size limit."); return bytes; }
  return await new Promise((resolve, reject) => { const chunks: Uint8Array[] = []; let total = 0; stream.on("data", (chunk) => { const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(); total += bytes.byteLength; if (total > limit) { stream.pause?.(); reject(new Error("This DOCX exceeds the safe expanded-size limit.")); return; } chunks.push(bytes); }).on("error", (error) => reject(error)).on("end", () => { const output = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; } resolve(output); }); stream.resume(); });
}
function valuesFromXml(xml: string, source: DocumentProperty["source"], path: string): DocumentProperty[] {
  rejectXmlDanger(xml);
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("This DOCX contains malformed XML.");
  const result: DocumentProperty[] = [];
  for (const element of Array.from(doc.getElementsByTagName("*"))) { const tag = element.localName?.toLowerCase(); const value = element.textContent?.trim(); if (source === "docx-custom" && tag === "property") { const customName = element.getAttribute("name") ?? "custom"; const customValue = Array.from(element.children).find((child) => child.localName?.toLowerCase() === "value")?.textContent?.trim() ?? value; if (customValue) result.push({ key: `${path}:${customName}`, label: `DOCX custom ${customName}`, value: customValue, source }); } else if (tag && propertyTags.includes(tag) && value) result.push({ key: `${path}:${tag}`, label: `DOCX ${tag}`, value, source }); }
  return result;
}
function clearXml(xml: string, source: DocumentProperty["source"]): { xml: string; removed: string[] } {
  rejectXmlDanger(xml);
  const removed: string[] = [];
  const doc = new DOMParser().parseFromString(xml, "application/xml"); if (doc.querySelector("parsererror")) throw new Error("This DOCX contains malformed XML.");
  for (const element of Array.from(doc.getElementsByTagName("*"))) { const tag = element.localName?.toLowerCase(); if (tag && propertyTags.includes(tag) && element.parentNode) { removed.push(`DOCX ${tag}`); element.parentNode.removeChild(element); } }
  if (source === "docx-custom") for (const property of Array.from(doc.getElementsByTagName("*"))) if (property.localName?.toLowerCase() === "property") { property.parentNode?.removeChild(property); removed.push("DOCX custom property"); }
  return { xml: new XMLSerializer().serializeToString(doc), removed };
}

async function loadDocx(input: ArrayBuffer): Promise<JSZip> {
  if (input.byteLength > DOCUMENT_LIMITS.docxBytes) throw new Error("DOCX exceeds the 50 MB local processing limit.");
  preflightZip(input);
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(input, { checkCRC32: false, createFolders: false }); } catch { throw new Error("This file is not a readable DOCX ZIP package."); }
  const entries = Object.values(zip.files);
  if (entries.length > DOCUMENT_LIMITS.docxEntries) throw new Error("This DOCX has too many ZIP entries for safe local processing.");
  let expanded = 0;
  for (const entry of entries) { if (entry.dir) continue; if (nameOf(entry.name).includes("_xmlsignatures/")) throw new Error("Signed DOCX packages are not supported."); if (entry.name.includes("..") || entry.name.startsWith("/")) throw new Error("This DOCX contains unsafe ZIP paths."); const bytes = await readBounded(entry, DOCUMENT_LIMITS.docxExpandedBytes - expanded); expanded += bytes.byteLength; }
  const contentTypes = zip.file("[Content_Types].xml");
  if (!contentTypes || !zip.file("word/document.xml")) throw new Error("This is not a standard DOCX document.");
  const contentXml = await contentTypes.async("string"); rejectXmlDanger(contentXml); const typesDoc = new DOMParser().parseFromString(contentXml, "application/xml"); const main = Array.from(typesDoc.getElementsByTagName("*" )).find((node) => node.localName === "Override" && node.getAttribute("PartName") === "/word/document.xml" && node.getAttribute("ContentType") === "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml");
  const relsEntry = zip.file("_rels/.rels"); if (!main || !relsEntry) throw new Error("This is not a standard DOCX document."); const relsDoc = new DOMParser().parseFromString(await relsEntry.async("string"), "application/xml"); const officeRel = Array.from(relsDoc.getElementsByTagName("*" )).find((node) => node.localName === "Relationship" && node.getAttribute("Target") === "word/document.xml" && /officeDocument/i.test(node.getAttribute("Type") ?? "")); if (!officeRel) throw new Error("DOCX root relationship does not point to word/document.xml."); const documentDoc = new DOMParser().parseFromString(await zip.file("word/document.xml")?.async("string") ?? "", "application/xml"); if (documentDoc.documentElement.localName !== "document" || !documentDoc.documentElement.namespaceURI?.includes("wordprocessingml")) throw new Error("DOCX document.xml has an unsupported root namespace.");
  if (Array.from(typesDoc.getElementsByTagName("*")).some((node) => /macroEnabled/i.test(node.getAttribute("ContentType") ?? "") || /vbaProject/i.test(node.getAttribute("PartName") ?? "")) || Array.from(relsDoc.getElementsByTagName("*")).some((node) => /digital-signature|vbaProject/i.test(node.getAttribute("Type") ?? ""))) throw new Error("Macro-enabled and signed DOCX packages are not supported.");
  return zip;
}

async function scanZip(zip: JSZip): Promise<DocumentProperty[]> {
  const found: DocumentProperty[] = [];
  const parts: Array<[string, DocumentProperty["source"]]> = [["docProps/core.xml", "docx-core"], ["docProps/app.xml", "docx-app"], ["docProps/custom.xml", "docx-custom"]];
  for (const [path, source] of parts) { const entry = zip.file(path); if (entry) found.push(...valuesFromXml(await entry.async("string"), source, path)); }
  return found;
}

export async function scanDocx(input: ArrayBuffer): Promise<DocumentScan> { const zip = await loadDocx(input); return { kind: "docx", properties: await scanZip(zip), warnings: ["Comments, tracked changes, document text, embedded media and layout are not cleaned."], canClean: true }; }

export async function cleanDocx(input: ArrayBuffer): Promise<DocumentCleanResult> {
  const zip = await loadDocx(input); const before = await scanZip(zip); const removed: string[] = [];
  for (const [path, source] of [["docProps/core.xml", "docx-core"], ["docProps/app.xml", "docx-app"], ["docProps/custom.xml", "docx-custom"]] as const) { const entry = zip.file(path); if (!entry) continue; const cleaned = clearXml(await entry.async("string"), source); zip.file(path, cleaned.xml); removed.push(...cleaned.removed); }
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const output = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer; const checked = await loadDocx(output); const remaining = await scanZip(checked);
  return { output, scan: { kind: "docx", properties: before, warnings: ["Comments, tracked changes, document text, embedded media and layout are not cleaned."], canClean: true }, verification: { removed, remaining, warnings: remaining.length ? ["Some document properties were not recognized or could not be safely removed."] : [] } };
}

export function readDocxTextPart(bytes: Uint8Array) { return decode.decode(bytes); }
