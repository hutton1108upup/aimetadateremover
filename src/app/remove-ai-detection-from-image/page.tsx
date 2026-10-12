import Link from "next/link";
import { ToolPage } from "@/components/marketing/tool-page";
import { EvidenceTable } from "@/components/marketing/evidence-table";
import { routeData } from "@/lib/publishing";
import { metadataFor } from "@/lib/site";

const path = "/remove-ai-detection-from-image";
export const metadata = metadataFor(path);

const faqs = [
  { question: "Can I remove AI detection from a photo by cleaning metadata?", answer: "You can remove supported AI fields embedded in a JPEG or PNG copy. A platform may also use pixels, watermarks, its own records or a disclosure you made, so a clean file does not guarantee a different AI label or detector score." },
  { question: "What does this cleaner remove by default?", answer: "It removes supported AI prompts and workflows, supported private EXIF fields such as GPS and device identifiers, and embedded PNG caBX Content Credentials. Use Keep capture details or Keep Content Credentials when the copy needs those records. JPEG and WebP credentials cannot be removed here." },
  { question: "Why can an edited camera photo get an AI info label?", answer: "AI editing tools can attach industry-standard signals even when the source is a camera photo. Meta has documented labels on lightly retouched images. Check the file and the platform's label explanation rather than assuming the whole photo was generated." },
  { question: "Can this change invisible watermarks or visible AI artifacts?", answer: "No. This cleaner changes supported file metadata. It preserves encoded image data and does not edit pixel watermarks, anatomy, textures or other visible content." },
  { question: "How do I check the downloaded copy?", answer: "Read the verification result, then select the downloaded copy in the Metadata Checker. Review unresolved findings before sharing; a successful download only means the browser download was initiated." },
];

export default function Page() {
  return <ToolPage path={path} label="AI detection and metadata" h1={routeData(path).h1}
    intro="Inspect and remove supported AI prompts, workflows and private file data from JPEG or PNG copies. Review the changes before downloading. Platform labels and pixel-based detector results are separate from file metadata."
    defaultMode="clean" sectionTitles={{ coverage: "Which AI signals can metadata cleaning change?", preserved: "Keep the image and download a separate copy", steps: "Clean the file metadata and verify the result" }}
    specifics={[
      { title: "Embedded AI fields", body: "Recognized prompts, seeds, samplers and workflow fields can be removed from supported JPEG and PNG structures." },
      { title: "Privacy and provenance", body: "Supported private EXIF fields and embedded PNG credentials are removed by default. The keep options let you retain these groups when needed." },
      { title: "Pixels and platform labels", body: "The image content stays intact. A file cleaner cannot change a platform's records, your disclosure or its detector decision." },
    ]}
    preserved={["The original JPEG or PNG file.", "Encoded image data, dimensions and supported transparency.", "Copyright, orientation and color profile where present."]}
    limits={["Mixed or unsupported XMP, IPTC and other fields can remain; check partial results.", "JPEG and WebP Content Credentials are inspection-only.", "Metadata removal does not guarantee detector bypass or platform approval."]}
    steps={[
      { title: "Choose what the copy needs", body: "Use the settings above to keep capture details or PNG Content Credentials when needed. Both keep options are off by default." },
      { title: "Select your images", body: "JPEG and PNG copies are checked, cleaned and verified automatically. WebP is inspection-only." },
      { title: "Read what changed", body: "Review removed, preserved and unresolved fields. A partial result can still contain information you wanted to remove." },
      { title: "Download and check the copy", body: "Download the separate copy, then reopen it in the Metadata Checker if you need an additional check. Review the platform's label explanation separately." },
    ]} faqs={faqs}>
    <section className="section"><div className="page-container"><div className="section-heading"><h2>File metadata, pixel detection and AI info labels</h2><p>Identify which problem you are trying to solve before changing the file.</p></div>
      <EvidenceTable caption="What each signal means for your photo" headers={["Signal", "What you can do here", "What to check separately"]} rows={[
        ["Prompt or workflow metadata", "Inspect recognized fields, clean a copy and review the output scan.", "Unreadable or mixed fields may remain."],
        ["C2PA Content Credentials", "Inspect supported records; remove embedded PNG caBX through default cleaning.", "An external history or a platform record can still exist."],
        ["AI info on an existing post", "Check the local file for supported embedded signals.", "Open the platform's label explanation. This tool cannot edit the posted item."],
        ["Pixel detector score or watermark", "Keep the image data unchanged while cleaning metadata.", "Pixel-based signals are outside this tool's coverage."],
      ]} />
      <p className="evidence-note">Meta describes labels based on industry-shared signals or user disclosure, including signals left by some AI editing tools. See <a className="text-link" href="https://about.fb.com/news/2024/04/metas-approach-to-labeling-ai-generated-content-and-manipulated-media/">Meta’s labeling explanation</a>.</p>
      <div className="evidence-links"><Link className="text-link" href="/blog/why-edited-photos-get-ai-info-labels">Why edited photos get AI info labels</Link><Link className="text-link" href="/c2pa-metadata-checker">Check Content Credentials</Link></div>
    </div></section>
  </ToolPage>;
}
