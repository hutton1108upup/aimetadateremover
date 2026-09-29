import Link from "next/link";
import { ArrowRight, FileArchive, FileCheck2, ImageIcon, MapPin, ScanSearch, Workflow } from "lucide-react";
const tools = [
  { href: "/", icon: ImageIcon, title: "AI Metadata Cleaner", body: "Automatically clean supported AI and privacy metadata from JPEG and PNG copies.", note: "WebP inspection only" },
  { href: "/metadata-checker", icon: ScanSearch, title: "Metadata Checker", body: "Inspect EXIF, XMP, GPS, workflow, ICC and embedded provenance locally.", note: "Read-only until you choose to clean" },
  { href: "/remove-metadata-from-png", icon: FileCheck2, title: "PNG Metadata Remover", body: "Clean supported PNG chunks while checking dimensions, transparency and encoded data.", note: "PNG only · no re-encoding" },
  { href: "/batch-metadata-remover", icon: FileArchive, title: "Batch Metadata Remover", body: "Apply one rule across multiple images, review each result and download a ZIP with a batch summary.", note: "JPEG & PNG cleaning" },
  { href: "/comfyui-workflow-remover", icon: Workflow, title: "ComfyUI Workflow Remover", body: "Check embedded workflow and prompt fields separately before sharing a PNG copy.", note: "PNG workflow fields" },
  { href: "/remove-gps-from-photo", icon: MapPin, title: "GPS Metadata Remover", body: "Review location fields and create a local copy with supported private EXIF removed.", note: "JPEG & PNG" },
];
export function ToolDirectory() { return <section className="section section-alt"><div className="page-container"><div className="section-heading"><p className="eyebrow">Use what is ready</p><h2>Tools with clear boundaries</h2><p>Each entry links to a real workflow available today. Scan-only and format limits stay visible.</p></div><div className="tool-directory-grid">{tools.map(({ href, icon: Icon, title, body, note }) => <Link href={href} className="tool-directory-card" key={href}><Icon aria-hidden="true" /><span><h3>{title}</h3><p>{body}</p><small>{note}</small><b>Open tool <ArrowRight aria-hidden="true" /></b></span></Link>)}</div></div></section>; }
