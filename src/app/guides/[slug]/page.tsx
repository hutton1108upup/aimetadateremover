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
      <p className="island-kicker">Metadata fundamentals</p>
      <h1>What Image Metadata Should You Review Before Publishing?</h1>
      <p className="island-meta">Updated September 4, 2026 · 8 minute read</p>
      <p className="island-intro">An image is more than visible pixels. Its container can carry a prompt, a node graph, a location, authorship, a color profile, or a provenance record. These fields do not all mean the same thing—and they should not all be removed by default.</p>
      <div className="island-divider" />
      <h2>Start with the reason for this copy</h2>
      <p>A private client preview, a portfolio image and an archival master need different metadata. Keep the master. Decide what the delivery copy needs, then remove only the fields that conflict with that purpose.</p>
      <table>
        <thead><tr><th>Field group</th><th>Why it matters</th><th>Safe default</th></tr></thead>
        <tbody>
          <tr><td data-label="Field group">Prompt & workflow</td><td data-label="Why it matters">May expose internal creative process</td><td data-label="Safe default">Remove from delivery copies</td></tr>
          <tr><td data-label="Field group">GPS & device IDs</td><td data-label="Why it matters">Can reveal place or equipment identity</td><td data-label="Safe default">Remove for privacy</td></tr>
          <tr><td data-label="Field group">Creator & copyright</td><td data-label="Why it matters">Supports attribution and licensing</td><td data-label="Safe default">Review, usually preserve</td></tr>
          <tr><td data-label="Field group">ICC profile</td><td data-label="Why it matters">Keeps color display consistent</td><td data-label="Safe default">Preserve</td></tr>
          <tr><td data-label="Field group">C2PA</td><td data-label="Why it matters">Records provenance and edits</td><td data-label="Safe default">Review explicitly</td></tr>
        </tbody>
      </table>
      <h2>Provenance is not a probability</h2>
      <p>C2PA can describe how a file was signed or edited. Software fields can describe an ordinary editing application. Neither should be converted into a percentage or a claim that an image is generated.</p>
      <blockquote>Good metadata tooling makes uncertainty visible. It does not hide uncertainty behind a confident-looking score.</blockquote>
      <h2>Verify the copy, not the button click</h2>
      <p>A removal function can finish without proving that every target field is gone. A trustworthy workflow scans the new bytes again and reports what is removed, preserved, still present or unsupported.</p>
      <Link className="island-cta" href="/metadata-checker">Inspect an image locally <ArrowRight /></Link>
    </article>
    <div className="next-guide"><span>Continue in the tool</span><Link href="/workspace">Open the full workspace <ArrowRight /></Link></div>
  </div></main><PublicFooter /></>;
}
