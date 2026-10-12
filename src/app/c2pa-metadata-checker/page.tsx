import { ToolPage } from "@/components/marketing/tool-page";
import Link from "next/link";
import { EvidenceTable } from "@/components/marketing/evidence-table";
import { metadataFor } from "@/lib/site";

export const metadata = metadataFor("/c2pa-metadata-checker");

const faqs = [
  {question:"Does a C2PA record prove an image is AI-generated?",answer:"No. Content Credentials are provenance records. Their presence is not an AI probability, a copyright judgment or proof of ownership."},
  {question:"What does valid integrity mean?",answer:"It means the supported manifest and asset binding passed local verification. This checker has no configured issuer trust anchors, so it does not certify who signed the file."},
  {question:"Will checking remove the credential?",answer:"No. This page is read-only. It inspects the file in your browser and does not create a cleaned copy."},
];

export default function C2paMetadataCheckerPage(){return <ToolPage path="/c2pa-metadata-checker" label="C2PA Checker" h1="Check C2PA Content Credentials in Images" intro="Check a JPEG, PNG or WebP for supported embedded Content Credentials. The read-only result shows whether a record was found and whether its integrity could be verified. Issuer trust is not assessed." defaultMode="inspect" acceptedFormats={["jpeg","png","webp"]} focus="c2pa" sectionTitles={{coverage:"What the C2PA check reports",preserved:"The image is not changed",steps:"Read the credential result"}}
  specifics={[{title:"Was a record found?",body:"The tool looks for supported embedded credentials. No record found here does not rule out an external history."},{title:"Did integrity validate?",body:"The result distinguishes valid integrity, failed validation, unknown state and verifier errors."},{title:"Issuer trust is not assessed",body:"No trust anchors are configured. Valid integrity does not certify the signer or ownership."}]}
  preserved={["The original image bytes; this page never rewrites them.","Any embedded provenance and edit history.","The file stays on your device during the check."]}
  limits={["External provenance services and later copies are outside this local check.","A browser or verifier error is not evidence that a credential is invalid.","C2PA presence or absence is not an AI detection verdict."]}
  steps={[{title:"Choose the image to inspect",body:"Select a JPEG, PNG or WebP file. The local scanner checks supported embedded metadata."},{title:"Read the credential status",body:"Check whether a record was found and whether integrity was valid, invalid or unverified."},{title:"Review other findings",body:"This scan also lists other supported metadata fields that may matter before publishing."},{title:"Keep the original",body:"The check does not remove data or generate a replacement image."}]}
  faqs={faqs}>
  <section className="section"><div className="page-container"><div className="section-heading"><h2>How to read a Content Credentials result</h2><p>These are explanations of possible result states, not a scan of your image. Select a file above to see its actual result.</p></div>
    <EvidenceTable caption="C2PA result examples and next steps" headers={["Result", "What it means", "Next step"]} rows={[
      ["Not found in supported fields", "The local check found no supported embedded record.", "Do not infer human authorship or the absence of an external provenance history."],
      ["Found · valid integrity", "The supported signed claims and asset binding passed verification.", "Read the claims. Issuer trust is not assessed by this checker."],
      ["Found · validation failed", "The supported record did not pass the integrity check.", "Keep the original and review the verification details; this is not an AI verdict."],
      ["Found · not verified", "A record was detected, but its integrity could not be confirmed.", "Treat it as unverified. Unsupported data or verifier errors differ from proven tampering."],
    ]} />
    <p className="section-lede">C2PA describes provenance records, which can document capture or editing as well as AI generation. Its presence alone does not tell you which of those happened. Read <Link className="text-link" href="/blog/c2pa-content-credentials-explained">what C2PA Content Credentials mean</Link>.</p>
    <div className="evidence-links"><Link className="text-link" href="/remove-metadata-from-png">Review PNG credential removal</Link><Link className="text-link" href="/remove-ai-detection-from-image">Understand file signals and AI labels</Link></div>
  </div></section>
  </ToolPage>}
