import Link from "next/link";
import { ArrowRight, Download, Files, ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { FAQSection } from "@/components/marketing/faq-section";
import { UnifiedImageWorkspace } from "@/components/tool/unified-image-workspace";
import { metadataFor, siteUrl } from "@/lib/site";
import { appSchema, faqSchema } from "@/lib/structured-data";

export const metadata = metadataFor("/batch-metadata-remover");

const faqs = [
  { question: "Does one failed image stop the batch?", answer: "No. Completed copies remain downloadable. The failed file is listed separately in the batch results file and is not included as an image in the ZIP." },
  { question: "Does the ZIP include files that still need review?", answer: "Yes. A processed copy with unresolved metadata can be included, but its result is marked review needed. Check each result before you deliver the ZIP." },
  { question: "Are images uploaded for batch processing?", answer: "No. The images are scanned, cleaned, verified and packaged in your browser. Your originals stay on your device." },
];

export default function BatchMetadataRemoverPage() {
  return <><PublicHeader /><main>
    <section className="tool-hero"><div className="page-container"><Breadcrumbs current="Batch Metadata Remover" /><div className="tool-hero-copy"><p className="eyebrow">Process images as a batch</p><h1>Remove Metadata From Multiple Images</h1><p>Choose JPEG or PNG images, apply one cleaning rule, and check each result before downloading the completed copies together.</p></div><UnifiedImageWorkspace variant="full" acceptedFormats={["jpeg","png"]} /></div></section>
    <section className="section section-alt"><div className="page-container"><div className="section-heading"><p className="eyebrow">Results for each file</p><h2>See which images are ready and which need review</h2><p>A failed file is listed separately. Completed copies remain available to download.</p></div><div className="info-grid"><article><Files aria-hidden="true" /><h3>Apply one rule</h3><p>Use the same settings for supported private details and embedded PNG Content Credentials across the selected images.</p></article><article><ShieldCheck aria-hidden="true" /><h3>Check individual outcomes</h3><p>Cleaned, unchanged, partial and failed files have separate results. A partial copy can still contain metadata.</p></article><article><Download aria-hidden="true" /><h3>Download the batch</h3><p>The ZIP contains completed copies and a batch-results.json summary. Failed files are listed in the summary but excluded from the image set.</p></article></div></div></section>
    <section className="section"><div className="page-container preserve-grid"><div><p className="eyebrow">Before delivery</p><h2>Check the result, then send the copy</h2><p>The tool verifies supported metadata changes and checks that encoded image data, dimensions and relevant color or orientation data remain intact. It does not certify that every possible field has been removed.</p><p>JPEG and PNG have different safe cleaning boundaries. WebP can be inspected in the <Link className="text-link" href="/metadata-checker">Metadata Checker</Link>, but it is not included in this cleaning batch.</p></div><div className="boundary-card"><h3>Prepare the next set</h3><p>Use the batch results file to see which originals need another review. Changing a setting rebuilds copies from the original files instead of repeatedly cleaning an earlier output.</p><Link className="text-link" href="/supported-formats">Check supported formats <ArrowRight aria-hidden="true" /></Link><Link className="text-link" href="/pricing">Compare plans <ArrowRight aria-hidden="true" /></Link></div></div></section>
    <FAQSection title="Batch cleaning questions" items={faqs} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(appSchema("Batch Metadata Remover","Clean supported metadata across a set of local JPEG and PNG images and review each result.",`${siteUrl}/batch-metadata-remover`))}} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqSchema(faqs))}} />
  </main><PublicFooter /></>;
}
