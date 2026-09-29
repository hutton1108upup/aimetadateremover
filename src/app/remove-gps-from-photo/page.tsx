import { ToolPage } from "@/components/marketing/tool-page";
import { metadataFor } from "@/lib/site";

export const metadata = metadataFor("/remove-gps-from-photo");

const faqs = [
  {question:"What else changes besides GPS?",answer:"The privacy task also removes supported private EXIF details such as capture dates, device identifiers, MakerNotes and embedded thumbnails. Copyright, orientation and supported image data stay."},
  {question:"Will this remove a visible location in the picture?",answer:"No. A sign, landmark or other visible clue remains in the pixels. This tool handles supported embedded metadata only."},
  {question:"Can I use a WebP photo?",answer:"WebP can be inspected in the Metadata Checker, but this tool does not create a cleaned WebP copy."},
];

export default function RemoveGpsFromPhotoPage(){return <ToolPage path="/remove-gps-from-photo" label="GPS Metadata Remover" h1="Remove GPS Metadata From Photos" intro="Remove supported GPS and private EXIF fields from a JPEG or PNG copy. Check the result for anything this tool could not safely remove." acceptedFormats={["jpeg","png"]} focus="gps" sectionTitles={{coverage:"GPS and private EXIF fields",preserved:"What stays in the photo",steps:"Remove location data and check the copy"}}
  specifics={[{title:"Detect location metadata",body:"The scanner flags supported GPS fields without displaying the coordinates."},{title:"Create a privacy copy",body:"Supported GPS, capture dates and device identifiers are removed. AI workflow, copyright and color information stay."},{title:"Check the new file",body:"The output is scanned again. Unknown XMP, IPTC or nested EXIF structures can remain unresolved or stop cleaning safely."}]}
  preserved={["Encoded image data and dimensions.","Orientation, color profile and copyright details when present.","The source JPEG or PNG file."]}
  limits={["Visible landmarks and text in the picture are not changed.","Unsupported XMP, IPTC or nested EXIF may contain location information that remains.","A clean supported-field report is not a guarantee that every location clue is gone."]}
  steps={[{title:"Choose a JPEG or PNG photo",body:"The file is checked locally for supported embedded location data."},{title:"Review the privacy task",body:"This page removes GPS and other supported private EXIF fields; it leaves AI workflow fields alone."},{title:"Read the verification details",body:"Check what was removed, preserved or left unresolved before relying on the copy."},{title:"Download a separate photo",body:"Keep the original for your records and share only the copy you have reviewed."}]}
  faqs={faqs}/>}
