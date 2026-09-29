import Link from "next/link";
import { InfoPage } from "@/components/marketing/info-page";
import { metadataFor } from "@/lib/site";

export const metadata = metadataFor("/supported-formats");

const rows = [
  ["JPEG / JPG", "EXIF, some XMP, ICC, confirmed C2PA markers and IPTC presence", "Supported AI workflow XMP and EXIF privacy fields", "Mixed XMP, IPTC and JPEG Content Credentials removal"],
  ["PNG", "Text chunks, EXIF, ICC, transparency, animation and embedded caBX", "Supported plain or bounded compressed AI text, EXIF privacy fields and selected caBX records", "Unreadable or oversized compressed text and animated ComfyUI comf chunks"],
  ["WebP", "Supported EXIF, XMP and C2PA chunks, dimensions and animation", "Inspection only", "All cleaning; use a compatible tool if removal is required"],
];

export default function SupportedFormatsPage() {
  return <InfoPage label="Supported Formats" h1="JPEG, PNG and WebP Metadata Support" lede="See what can be checked or cleaned in each format before you choose a file.">
    <h2>Inspection and cleaning are different capabilities</h2>
    <p>JPEG and PNG can produce a separate cleaned copy when the relevant structure is supported. WebP is inspection only. A detected field is not necessarily removable, and an unresolved result is not a clean result.</p>
    <div className="pricing-table-wrap" role="region" aria-label="Supported image formats, scroll horizontally on small screens" tabIndex={0}><table className="pricing-table"><caption>Current format support for browser-local inspection and cleaning.</caption><thead><tr><th scope="col">Format</th><th scope="col">Inspect</th><th scope="col">Clean a copy</th><th scope="col">Review separately</th></tr></thead><tbody>{rows.map(([format,inspect,clean,review])=><tr key={format}><th scope="row">{format}</th><td>{inspect}</td><td>{clean}</td><td>{review}</td></tr>)}</tbody></table></div>
    <h2>What remains unchanged in supported copies</h2>
    <p>The cleaner checks that the encoded image payload and dimensions stay intact. It also checks transparency for PNG and preserves relevant color profile and orientation information when present. The original file is never overwritten.</p>
    <p>Some JPEG XMP packets mix workflow details with attribution. Removing the whole packet could erase useful ownership information, so those cases remain for review. PNG zTXt and compressed iTXt can be expanded up to 1 MB per text block; invalid or larger blocks stay unresolved. Animated ComfyUI <code>comf</code> metadata also remains unresolved.</p>
    <h2>Choose the right task</h2>
    <ul><li><Link href="/remove-metadata-from-jpeg">Remove supported metadata from JPEG or JPG</Link></li><li><Link href="/remove-metadata-from-png">Remove supported metadata from PNG</Link></li><li><Link href="/metadata-checker">Inspect a WebP or compare an output copy</Link></li><li><Link href="/batch-metadata-remover">Review a batch of JPEG and PNG files</Link></li></ul>
    <p>A successful verification report covers the supported fields and image properties listed here. It is not a claim that every possible metadata field, visible watermark or outside provenance record is gone.</p>
  </InfoPage>;
}
