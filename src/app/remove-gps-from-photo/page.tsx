import { ToolPage } from "@/components/marketing/tool-page";
import Link from "next/link";
import { EvidenceTable } from "@/components/marketing/evidence-table";
import { routeData } from "@/lib/publishing";
import { metadataFor } from "@/lib/site";

export const metadata = metadataFor("/remove-gps-from-photo");

const faqs = [
  {question:"Are geotags, GPS metadata and photo location the same thing?",answer:"A geotag commonly refers to embedded location information such as EXIF GPS coordinates. This tool removes supported location fields from a copy. It does not remove landmarks, signs or location text visible in the picture."},
  {question:"Can I remove geotags from an iPhone HEIC photo here?",answer:"This cleaner accepts JPEG and PNG, not HEIC. Use the iPhone Photos sharing options to turn off Location, or provide a JPEG or PNG copy and check that exact file before sharing. Converting a file can change the image or its metadata."},
  {question:"What else changes besides GPS?",answer:"The privacy task also removes supported private EXIF details such as capture dates, device identifiers, MakerNotes and embedded thumbnails. Copyright, orientation and supported image data stay."},
  {question:"Will this remove a visible location in the picture?",answer:"No. A sign, landmark or other visible clue remains in the pixels. This tool handles supported embedded metadata only."},
  {question:"Can I use a WebP photo?",answer:"WebP can be inspected in the Metadata Checker, but this tool does not create a cleaned WebP copy."},
];

export default function RemoveGpsFromPhotoPage(){return <ToolPage path="/remove-gps-from-photo" label="Geotag and GPS Remover" h1={routeData("/remove-gps-from-photo").h1} intro="Remove geotags and supported GPS metadata from JPEG or PNG photos online, without uploading them. The privacy task also clears supported private EXIF details. Download a separate copy and check what remains before sharing." acceptedFormats={["jpeg","png"]} focus="gps" sectionTitles={{coverage:"Geotags, GPS and private EXIF fields",preserved:"What stays in the photo",steps:"Remove location data and check the copy"}}
  specifics={[{title:"Detect location metadata",body:"The scanner flags supported GPS fields without displaying the coordinates."},{title:"Create a privacy copy",body:"Supported GPS, capture dates and device identifiers are removed. AI workflow, copyright and color information stay."},{title:"Check the new file",body:"The output is scanned again. Unknown XMP, IPTC or nested EXIF structures can remain unresolved or stop cleaning safely."}]}
  preserved={["Encoded image data and dimensions.","Orientation, color profile and copyright details when present.","The source JPEG or PNG file."]}
  limits={["Visible landmarks and text in the picture are not changed.","Unsupported XMP, IPTC or nested EXIF may contain location information that remains.","A clean supported-field report is not a guarantee that every location clue is gone."]}
  steps={[{title:"Choose a JPEG or PNG photo",body:"The file is checked locally for supported embedded location data."},{title:"Review the privacy task",body:"This page removes GPS and other supported private EXIF fields; it leaves AI workflow fields alone."},{title:"Read the verification details",body:"Check what was removed, preserved or left unresolved before relying on the copy."},{title:"Download a separate photo",body:"Keep the original for your records and share only the copy you have reviewed."}]}
  faqs={faqs}>
  <section className="section"><div className="page-container"><div className="section-heading"><h2>What changes when you remove geotags from a photo?</h2><p>The privacy task removes more than coordinates. Check the result against the fields your delivery copy needs.</p></div>
    <EvidenceTable caption="Location-cleaning scope for supported JPEG and PNG files" headers={["Field", "What happens", "What to review"]} rows={[
      ["Supported EXIF GPS", "Removed from the new copy.", "Reopen the downloaded copy and check for remaining location findings."],
      ["Capture dates, device IDs and MakerNotes", "Supported private fields are also removed.", "Keep an original when these records matter to you."],
      ["Copyright, orientation and color profile", "Preserved where present.", "The decoded copy must also pass the browser image check."],
      ["Unknown XMP, IPTC or nested EXIF", "Can remain unresolved or prevent safe cleaning.", "Review a partial or failed result before relying on the copy."],
      ["Landmarks or signs in the picture", "The visible image is unchanged.", "Look at the picture itself before sharing."],
    ]} />
  </div></section>
  <section className="section section-alt"><div className="page-container"><div className="section-heading"><h2>Remove photo location on mobile and check the download</h2></div><div className="info-grid">
    <article><h3>1. Choose the exact file</h3><p>Select a JPEG or PNG from your phone. If the original is HEIC, this tool will not clean it. A converted copy should be inspected separately.</p></article>
    <article><h3>2. Save the reviewed copy</h3><p>Read the verification result, tap Download clean copy and check your browser’s downloads. Use that copy rather than sharing the original from your photo library.</p></article>
    <article><h3>3. Recheck before sending</h3><p>Open the downloaded file in the Metadata Checker. Check location findings and unresolved fields; an empty supported GPS result does not rule out every location clue.</p></article>
  </div><p className="section-lede">On iPhone, you can also open a photo’s Share menu, tap Options and turn off Location before sharing. That is a sharing option, not a verification of this tool’s downloaded file. Follow <a className="text-link" href="https://support.apple.com/en-ca/guide/personal-safety/ips0d7a5df82/1.0/web/1.0">Apple’s location metadata instructions</a>.</p>
    <div className="evidence-links"><Link className="text-link" href="/metadata-checker">Check the downloaded photo</Link><Link className="text-link" href="/blog/exif-gps-privacy-before-sharing">Read the EXIF privacy checklist</Link></div>
  </div></section>
  </ToolPage>}
