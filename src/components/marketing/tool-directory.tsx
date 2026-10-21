import Link from "next/link";
import { ArrowRight, FileArchive, FileCheck2, FileText, ImageIcon, MapPin, ScanSearch, ShieldCheck, Workflow } from "lucide-react";
const tools = [
  { href: "/", icon: ImageIcon, title: "AI Metadata Cleaner", body: "Automatically clean supported AI and privacy metadata from JPEG and PNG copies.", note: "WebP inspection only" },
  { href: "/metadata-checker", icon: ScanSearch, title: "Metadata Checker", body: "Inspect EXIF, XMP, GPS, workflow, ICC and embedded provenance locally.", note: "Read-only until you choose to clean" },
  { href: "/remove-metadata-from-png", icon: FileCheck2, title: "PNG Metadata Remover", body: "Clean supported PNG chunks while checking dimensions, transparency and encoded data.", note: "PNG only · no re-encoding" },
  { href: "/batch-metadata-remover", icon: FileArchive, title: "Batch Metadata Remover", body: "Apply one rule across multiple images, review each result and download a ZIP with a batch summary.", note: "JPEG & PNG cleaning" },
  { href: "/comfyui-workflow-remover", icon: Workflow, title: "ComfyUI Workflow Remover", body: "Check embedded workflow and prompt fields separately before sharing a PNG copy.", note: "PNG workflow fields" },
  { href: "/remove-gps-from-photo", icon: MapPin, title: "GPS Metadata Remover", body: "Review location fields and create a local copy with supported private EXIF removed.", note: "JPEG & PNG" },
  { href: "/c2pa-metadata-checker", icon: ShieldCheck, title: "C2PA Content Credentials Checker", body: "Inspect embedded provenance and integrity status before deciding what a record means.", note: "Read-only · issuer trust not assessed" },
  { href: "/pdf-metadata-remover", icon: FileText, title: "PDF Metadata Remover", body: "Clean supported PDF Info and document-level XMP locally, then recheck the rewritten copy.", note: "PDF · no upload" },
  { href: "/docx-metadata-remover", icon: FileText, title: "Word Metadata Remover", body: "Clean supported DOCX core, app and custom properties while retaining document content.", note: "DOCX · no upload" },
];
export function ToolDirectory() { return <section className="section section-alt"><div className="page-container"><div className="section-heading"><p className="eyebrow">Choose your task</p><h2>Find the right image metadata tool</h2><p>Clean a batch, remove geotags, check Content Credentials or keep an AI workflow private.</p></div><div className="tool-directory-grid">{tools.map(({ href, icon: Icon, title, body, note }) => <Link href={href} className="tool-directory-card" key={href}><Icon aria-hidden="true" /><span><h3>{title}</h3><p>{body}</p><small>{note}</small><b>Open tool <ArrowRight aria-hidden="true" /></b></span></Link>)}</div></div></section>; }
