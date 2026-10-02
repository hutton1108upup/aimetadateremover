import { ToolPage } from "@/components/marketing/tool-page";
import { metadataFor } from "@/lib/site";

export const metadata = metadataFor("/remove-metadata-from-jpeg");

const faqs = [
  {question:"Are JPG and JPEG different here?",answer:"No. Both extensions use the JPEG format and the same inspection and cleaning workflow."},
  {question:"Does JPEG cleaning change image quality?",answer:"For supported files, the cleaner rewrites selected metadata without re-encoding the image payload. It checks the output again before offering a download."},
  {question:"Can this remove all JPEG metadata?",answer:"No. Mixed attribution and workflow XMP, IPTC blocks and JPEG Content Credentials can remain for review. Use the verification details before sharing."},
];

export default function JpegMetadataRemoverPage(){return <ToolPage path="/remove-metadata-from-jpeg" label="JPEG Metadata Remover" h1="Remove Metadata From JPEG and JPG Images" intro="Remove supported workflow and private EXIF fields from a JPEG copy. The tool checks that encoded image data remains unchanged and shows any metadata left for review." acceptedFormats={["jpeg"]} sectionTitles={{coverage:"JPEG fields this cleaner can change",preserved:"What stays in the JPEG",steps:"Clean and check a JPEG copy"}}
  specifics={[{title:"Inspect JPEG metadata",body:"The scanner checks supported EXIF, XMP, ICC and Content Credentials markers. IPTC blocks are flagged for review."},{title:"Remove selected fields",body:"Cleaning targets supported workflow XMP and private EXIF details. Mixed packets that may contain attribution are kept."},{title:"Keep the image data",body:"The output check compares encoded image data, dimensions, orientation and color profile where present."}]}
  preserved={["JPEG encoded image data and dimensions.","Orientation, ICC color profile and supported attribution fields.","The source image on your device."]}
  limits={["JPEG Content Credentials in APP11 are inspection-only here.","IPTC and mixed XMP can retain information the cleaner does not rewrite.","Malformed or unusual EXIF structures may be rejected instead of creating an unsafe copy."]}
  steps={[{title:"Choose a JPG or JPEG",body:"The file is checked by its bytes, not only by its extension."},{title:"Review capture details",body:"Choose whether to keep supported private EXIF fields. JPEG Content Credentials can be inspected here but cannot be removed."},{title:"Inspect the verified result",body:"Read the removed, preserved and unresolved groups. A partial result can still contain metadata."},{title:"Download your copy",body:"Save a separate JPEG after reviewing the result. The original is unchanged."}]}
  faqs={faqs}/>}
