import Link from "next/link";
import { ArrowRight, FileCheck2, ImageIcon, ScanSearch } from "lucide-react";
const tools = [
  { href: "/", icon: ImageIcon, title: "AI Metadata Cleaner", body: "Automatically clean supported AI and privacy metadata from JPEG and PNG copies.", note: "WebP inspection only" },
  { href: "/metadata-checker", icon: ScanSearch, title: "Metadata Checker", body: "Inspect EXIF, XMP, GPS, workflow, ICC and embedded provenance locally.", note: "Read-only until you choose to clean" },
  { href: "/remove-metadata-from-png", icon: FileCheck2, title: "PNG Metadata Remover", body: "Clean supported PNG chunks while checking dimensions, transparency and encoded data.", note: "PNG only · no re-encoding" },
];
export function ToolDirectory() { return <section className="section section-alt"><div className="page-container"><div className="section-heading"><p className="eyebrow">Use what is ready</p><h2>Tools with clear boundaries</h2><p>Each entry links to a real workflow available today. Scan-only and format limits stay visible.</p></div><div className="tool-directory-grid">{tools.map(({ href, icon: Icon, title, body, note }) => <Link href={href} className="tool-directory-card" key={href}><Icon aria-hidden="true" /><span><h3>{title}</h3><p>{body}</p><small>{note}</small><b>Open tool <ArrowRight aria-hidden="true" /></b></span></Link>)}</div></div></section>; }
