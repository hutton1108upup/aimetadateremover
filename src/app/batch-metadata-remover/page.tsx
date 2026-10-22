import Link from "next/link";
import { ArrowRight, Download, Files, ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { FAQSection } from "@/components/marketing/faq-section";
import { UnifiedImageWorkspace } from "@/components/tool/unified-image-workspace";
import { EvidenceTable } from "@/components/marketing/evidence-table";
import { routeData } from "@/lib/publishing";
import { metadataFor, siteUrl } from "@/lib/site";
import { appSchema, faqSchema } from "@/lib/structured-data";

export const metadata = metadataFor("/batch-metadata-remover");

const faqs = [
  { question: "How many images can I clean in one batch?", answer: "Pro Monthly and Pro Yearly process up to 10 images per batch. Yearly can process up to 30 images per session across three batches on wider screens. Guests have 1 single-image clean/day; Google sign-in gives Free users 5/day in total. Free does not include batches or ZIP export. Device queue limits also apply: 30 files/200 MB at 768 px or wider, or 10 files/100 MB below 768 px; each file is limited to 25 MB. Built-in samples are free to try." },
  { question: "Does one failed image stop the batch?", answer: "No. Completed copies remain downloadable. The failed file is listed separately in the batch results file and is not included as an image in the ZIP." },
  { question: "Does the ZIP include files that still need review?", answer: "Yes. A processed copy with unresolved metadata can be included, but its result is marked review needed. Check each result before you deliver the ZIP." },
  { question: "Are images uploaded for batch processing?", answer: "No. The images are scanned, cleaned, verified and packaged in your browser. Your originals stay on your device." },
];

export default function BatchMetadataRemoverPage() {
  return <><PublicHeader /><main>
    <section className="tool-hero"><div className="page-container"><Breadcrumbs current="Batch Metadata Remover" /><div className="tool-hero-copy"><p className="eyebrow">Process images as a batch</p><h1>{routeData("/batch-metadata-remover").h1}</h1><p>Clean supported metadata from multiple JPEG or PNG images in your browser. Apply one rule, review each result and download the completed copies as a ZIP.</p></div><UnifiedImageWorkspace variant="full" acceptedFormats={["jpeg","png"]} sampleMode="batch" /></div></section>
    <section className="section section-alt"><div className="page-container"><div className="section-heading"><p className="eyebrow">Results for each file</p><h2>See which images are ready and which need review</h2><p>A failed file is listed separately. Completed copies remain available to download.</p></div><div className="info-grid"><article><Files aria-hidden="true" /><h3>Apply one rule</h3><p>Use the same settings for supported private details and embedded PNG Content Credentials across the selected images.</p></article><article><ShieldCheck aria-hidden="true" /><h3>Check individual outcomes</h3><p>Cleaned, unchanged, partial and failed files have separate results. A partial copy can still contain metadata.</p></article><article><Download aria-hidden="true" /><h3>Download the batch</h3><p>The ZIP contains completed copies and a batch-results.json summary. Failed files are listed in the summary but excluded from the image set.</p></article></div></div></section>
    <section className="section"><div className="page-container preserve-grid"><div><p className="eyebrow">Before delivery</p><h2>Check the result, then send the copy</h2><p>The tool verifies supported metadata changes and checks that encoded image data, dimensions and relevant color or orientation data remain intact. It does not certify that every possible field has been removed.</p><p>JPEG and PNG have different safe cleaning boundaries. WebP can be inspected in the <Link className="text-link" href="/metadata-checker">Metadata Checker</Link>, but it is not included in this cleaning batch.</p></div><div className="boundary-card"><h3>Prepare the next set</h3><p>Use the batch results file to see which originals need another review. Changing a setting rebuilds copies from the original files instead of repeatedly cleaning an earlier output.</p><Link className="text-link" href="/supported-formats">Check supported formats <ArrowRight aria-hidden="true" /></Link><Link className="text-link" href="/pricing">Compare plans <ArrowRight aria-hidden="true" /></Link></div></div></section>
    <section className="section section-alt"><div className="page-container"><div className="section-heading"><h2>Device queue limits and plan allowances</h2><p>These are browser queue capacities, not a free or paid batch entitlement. Your plan can allow fewer images. Pro batches contain up to 10 images; Yearly can split a wider-screen session into three batches.</p></div>
      <EvidenceTable caption="Device queue capacity — plan limits still apply" headers={["Workspace width", "Image count", "File and total size"]} rows={[
        ["768 px and wider", "Up to 30 JPEG or PNG files", "25 MB per file · 200 MB total"],
        ["Below 768 px", "Up to 10 JPEG or PNG files", "25 MB per file · 100 MB total"],
      ]} />
      <p className="evidence-note">HEIC and TIFF are not accepted. WebP is available for inspection in the Metadata Checker. The lower of the device capacity and your plan allowance applies. Pro is required to process your own batches and export their ZIP.</p>
    </div></section>
    <section className="section"><div className="page-container"><div className="section-heading"><p className="eyebrow">Try the three-file sample</p><h2>See a cleaned, unchanged and partial result in one ZIP</h2><p>Choose “Try a safe batch” in the tool above. The three one-pixel PNGs are synthetic test files; their actual results can be inspected and downloaded.</p></div>
      <EvidenceTable caption="Expected results for the built-in batch with default settings" headers={["Sample", "Verified result", "Inside the ZIP"]} rows={[
        ["sample-cleaned.png", "The supported generation parameters field is removed.", "A clean copy with the original image data."],
        ["sample-unchanged.png", "No supported data needs cleaning.", "An unchanged original, checked by the tool."],
        ["sample-review-needed.png", "Parameters are removed; compressed text exceeds the inspection limit and remains.", "A partial copy marked review_needed in the summary."],
      ]} />
      <h3>What batch-results.json tells you</h3><p className="section-lede">The local results file lists each original filename, format, result, field counts and whether its copy is included. It travels inside the ZIP, so review it before sending the archive to someone else.</p>
      <pre className="evidence-code" aria-label="Example batch summary"><code>{JSON.stringify({ summary: { selected: 3, included: 3, needsReview: 1, excluded: 0 } }, null, 2)}</code></pre>
      <p className="evidence-note">This summary describes the built-in three-file example. A failed or inspection-only image is listed but excluded from the ZIP. Partial results remain included and need your review.</p>
      <div className="evidence-links"><Link className="text-link" href="/blog/batch-remove-image-metadata-client-delivery">Follow the batch delivery guide</Link><Link className="text-link" href="/blog/image-metadata-before-publishing">Use the image metadata review checklist</Link><Link className="text-link" href="/metadata-checker">Recheck a downloaded copy</Link></div>
    </div></section>
    <FAQSection title="Batch cleaning questions" items={faqs} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(appSchema("Batch Metadata Remover","Clean supported metadata across a set of local JPEG and PNG images and review each result.",`${siteUrl}/batch-metadata-remover`))}} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqSchema(faqs))}} />
  </main><PublicFooter /></>;
}
