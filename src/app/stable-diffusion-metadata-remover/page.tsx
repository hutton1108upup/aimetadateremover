import { ToolPage } from "@/components/marketing/tool-page";
import { metadataFor } from "@/lib/site";

export const metadata = metadataFor("/stable-diffusion-metadata-remover");

const faqs = [
  {question:"Which Stable Diffusion details can be removed?",answer:"Supported PNG text entries such as parameters, prompt, seed, sampler, steps, model and related workflow fields can be removed from a separate copy. The exact fields depend on the exporter."},
  {question:"What if my PNG uses compressed text?",answer:"The browser can inspect zTXt and compressed iTXt up to 1 MB of expanded text per block. Invalid or larger blocks stay unresolved; the tool does not claim they were removed."},
  {question:"Does this re-encode my PNG?",answer:"No. Supported metadata chunks are rewritten without re-encoding PNG image data, and the output is checked again before download."},
];

export default function StableDiffusionMetadataRemoverPage(){return <ToolPage path="/stable-diffusion-metadata-remover" label="Stable Diffusion Metadata Remover" h1="Remove Stable Diffusion Prompts and Generation Settings" intro="Remove supported prompts, seeds and sampler settings from a PNG copy without re-encoding its image data. The result shows which fields were found and what remains." acceptedFormats={["png"]} focus="stable-diffusion" sectionTitles={{coverage:"Generation settings found in this PNG",preserved:"What stays in the PNG copy",steps:"Remove parameters and check the output"}}
  specifics={[{title:"See detected parameters",body:"The scanner checks for supported prompt, negative prompt, seed, sampler, steps, CFG and model fields. Only fields found in your PNG appear in the result."},{title:"Remove generation text",body:"Supported workflow fields are removed; unrelated privacy, attribution, color and provenance records remain for review."},{title:"Verify the new PNG",body:"The output is scanned again to check image data, dimensions and transparency."}]}
  preserved={["Encoded PNG image data and transparency.","Color profile and unrelated attribution fields.","The original file on your device."]}
  limits={["Compressed PNG text may remain unresolved and is not counted as removed.","Different exporters and versions may write metadata in other structures.","Removing file metadata does not guarantee a detector or platform result."]}
  steps={[{title:"Choose the PNG you plan to share",body:"The file is inspected locally for supported generation parameters."},{title:"Read the generation settings result",body:"The summary reports what was found in supported fields; details remain available for review."},{title:"Check unresolved records",body:"If a compressed or unknown block remains, do not treat the file as metadata-free."},{title:"Save a separate output",body:"Download the verified copy while keeping the original untouched."}]}
  faqs={faqs}/>}
