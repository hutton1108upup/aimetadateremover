import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { metadataFor } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return slug === "image-metadata-before-publishing" ? metadataFor("/guides/image-metadata-before-publishing") : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "image-metadata-before-publishing") notFound();

  return <><PublicHeader /><main className="guide-page"><div className="page-container">
    <Link className="back-link" href="/guides"><ArrowLeft /> All guides</Link>
    <article className="editorial-island island">
      <p className="island-kicker">Metadata basics</p>
      <h1>What Image Metadata Should You Review Before Publishing?</h1>
      <p className="island-meta">Updated September 18, 2026</p>
      <p className="island-intro">An image file can carry much more than the pixels you see. Prompts, node graphs, locations, creator details, color profiles, and provenance records may all be tucked inside. Each serves a different purpose, so deleting everything by default is rarely the best move.</p>
      <div className="island-divider" />
      <h2>Start with what this copy is for</h2>
      <p>A private client preview does not need the same metadata as a portfolio image or an archive. Keep the master file, decide what the copy needs, and remove only the details you do not want to send with it.</p>
      <table>
        <thead><tr><th>Field group</th><th>Why it matters</th><th>Safe default</th></tr></thead>
        <tbody>
          <tr><td data-label="Field group">Prompt & workflow</td><td data-label="Why it matters">May reveal how the image was made</td><td data-label="Safe default">Remove from delivery copies</td></tr>
          <tr><td data-label="Field group">GPS & device IDs</td><td data-label="Why it matters">Can reveal a location or identify equipment</td><td data-label="Safe default">Remove for privacy</td></tr>
          <tr><td data-label="Field group">Creator & copyright</td><td data-label="Why it matters">Helps with credit and licensing</td><td data-label="Safe default">Review and usually keep</td></tr>
          <tr><td data-label="Field group">ICC profile</td><td data-label="Why it matters">Keeps colors looking consistent</td><td data-label="Safe default">Keep</td></tr>
          <tr><td data-label="Field group">C2PA</td><td data-label="Why it matters">Records where a file came from and how it changed</td><td data-label="Safe default">Review before deciding</td></tr>
        </tbody>
      </table>
      <p>The cleaner automatically removes supported AI generation fields and private EXIF fields from JPEG and PNG files, including supported GPS, capture dates, device IDs, MakerNotes and JPEG thumbnails. It also removes supported embedded PNG Content Credentials by default. Copyright, orientation, color profiles and encoded image data are preserved. Unsupported nested or strip-thumbnail structures may be rejected. XMP, IPTC and compressed text can still contain private information: review any unresolved findings. WebP is inspection-only.</p>
      <h2>Use the automatic cleaner step by step</h2>
      <h3>1. Decide what to keep before choosing files</h3>
      <p>Open the <Link href="/workspace">image workspace</Link>. If you want to keep private capture details or embedded credentials, use <strong>Cleaning settings</strong> at the top of the tool. Select <strong>Keep capture details</strong> or <strong>Keep Content Credentials</strong> as needed. These options are off by default.</p>
      <h3>2. Choose your images and wait for the result</h3>
      <p>Select JPEG or PNG files. The cleaner checks, cleans and verifies a separate copy automatically; you do not need to choose a cleaning mode or move through tabs. Your original is never overwritten. If you only want to inspect a file, open the <Link href="/metadata-checker">Metadata Checker</Link> instead; it does not clean until you choose <strong>Clean and create a copy</strong> when that action is available.</p>
      <h3>3. Read the result before downloading</h3>
      <p>Check whether the result says <strong>Cleaning complete</strong>, <strong>Partially cleaned — review remaining data</strong>, or <strong>No supported data needed cleaning</strong>. A partial result may still contain private information. Expand <strong>View processing details</strong> to inspect the findings and, after cleaning, download a verification report. Reports can contain private metadata; keep them private too.</p>
      <h3>4. Save the copy you have reviewed</h3>
      <p>Use <strong>Download clean copy</strong> for a cleaned result. If no supported data needed cleaning, the button is <strong>Download original</strong>. For a batch, <strong>Download completed images (ZIP)</strong> includes completed files, including partial results, and leaves out failed or inspection-only files. Review each result instead of assuming every selected image is in the ZIP.</p>
      <p>You can change the keep options after processing; existing cleaned copies are rebuilt from the original, and new files use the updated settings. Download the new result again if you change a setting.</p>
      <h2>Provenance is not a probability</h2>
      <p>C2PA can tell you how a file was signed or edited. A software field might simply name an everyday editing app. Neither belongs in a percentage score or proves that an image was generated by AI.</p>
      <p>The <a href="https://spec.c2pa.org/specifications/2.2/explainer/Explainer.html">official C2PA explainer</a> describes Content Credentials as provenance records. This metadata checker identifies supported embedded records; it does not validate signatures or retrieve an external edit history.</p>
      <blockquote>If the evidence is uncertain, the result should say so. A confident-looking score does not make the evidence stronger.</blockquote>
      <h2>Check the new copy, not just the button</h2>
      <p>Automatic verification covers supported fields only. For an additional check, open the downloaded copy in the Metadata Checker and review what remains. Neither a successful download nor a clean result proves that every possible metadata field has been removed.</p>
      <p>Ready to prepare a publishing copy? Open the <Link href="/">AI Metadata Cleaner</Link> and keep your original file for comparison.</p>
      <Link className="island-cta" href="/metadata-checker">Inspect an image locally <ArrowRight /></Link>
    </article>
    <div className="next-guide"><span>Ready to try it?</span><Link href="/workspace">Open the full workspace <ArrowRight /></Link></div>
  </div></main><PublicFooter /></>;
}
