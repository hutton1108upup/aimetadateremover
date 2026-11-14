import Link from "next/link";
import { InfoPage } from "@/components/marketing/info-page";
import { SupportContact } from "@/components/layout/support-contact";
import { legalDetails } from "@/lib/legal";
import { metadataFor } from "@/lib/site";

export const metadata = metadataFor("/about");

export default function Page() {
  return <InfoPage label="About" h1="How AI Metadata Remover Handles Your Files" lede="AI Metadata Remover helps people inspect supported file metadata, create a separate cleaned copy and check what remains.">
    <h2>Who maintains this service</h2>
    <p>AI Metadata Remover is operated by {legalDetails.operatorNameLatin} (<span lang="zh-Hans">{legalDetails.operatorName}</span>), an individual based in {legalDetails.operatorLocation}. It is a service name, not a separate incorporated company. The same operator details appear in our <Link href="/terms">terms</Link> and <Link href="/privacy">privacy policy</Link>.</p>
    <p>For questions, feedback, privacy requests or account support, contact <SupportContact />. Please do not send private images, prompts or payment card details in a support message.</p>
    <h2>Why the tool starts in your browser</h2>
    <p>Designers, AI image creators and photographers may need to inspect embedded prompts or location data before sharing a file. Image inspection and supported cleaning run in the browser, and a new copy is created without replacing the original. Account, usage and service data are handled as described in the <Link href="/privacy">privacy policy</Link>.</p>
    <h2>How we test and what can still fail</h2>
    <p>Our <Link href="/metadata-test-report">real-file compatibility report</Link> records the files, settings, date and independent ExifTool checks behind individual results. It includes a Nikon JPEG with nested EXIF that the cleaner could not safely process. The <Link href="/supported-formats">format support page</Link> lists other known boundaries, including WebP inspection only and JPEG Content Credentials that cannot currently be removed by this cleaner.</p>
    <p>Those tests are examples, not proof that all exports work. Unsupported or mixed metadata can remain or prevent a clean copy. Check the result and keep the original. Metadata alone does not provide a reliable AI probability or predict how a platform will classify an image.</p>
    <h2>Recent changes and source</h2>
    <ul><li><time dateTime="2026-11-14">November 14, 2026</time>: published the three-file compatibility report, including a failed camera JPEG test.</li><li><time dateTime="2026-11-14">November 14, 2026</time>: aligned free allowance information and changed the default batch ZIP to exclude files needing review.</li><li><time dateTime="2026-11-09">November 9, 2026</time>: updated the free daily allowances to 5 guest and 10 signed-in single-image cleans.</li></ul>
    <p>The <a href="https://github.com/hutton1108upup/aimetadateremover">public source repository</a> includes the change history and test instructions. These are dated changes rather than a claim of a numbered product release.</p>
  </InfoPage>;
}
