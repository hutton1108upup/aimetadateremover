import { ToolPage } from "@/components/marketing/tool-page";
import { metadataFor } from "@/lib/site";

export const metadata = metadataFor("/comfyui-workflow-remover");

const faqs = [
  {question:"Will this remove the nodes from my ComfyUI project?",answer:"No. It changes a separate image copy, not your saved ComfyUI project. Supported embedded workflow and prompt records are removed from the copy when verification succeeds."},
  {question:"Are animated ComfyUI PNGs supported?",answer:"Animated PNGs can contain a comf metadata chunk. This tool reports that block as unresolved rather than claiming to clean it. Use a static PNG for this workflow."},
  {question:"Does a clean result hide that the image was AI-generated?",answer:"No. Metadata cleaning does not change the pixels, invisible watermarks, platform records or detector behavior."},
];

export default function ComfyuiWorkflowRemoverPage(){return <ToolPage path="/comfyui-workflow-remover" label="ComfyUI Workflow Remover" h1="Remove Embedded ComfyUI Workflow Data" intro="Find and remove supported workflow and prompt fields from a static ComfyUI PNG. Check the new copy for any fields that remain." acceptedFormats={["png"]} focus="comfyui" sectionTitles={{coverage:"Workflow and prompt data in the PNG",preserved:"What stays in the new PNG",steps:"Remove the embedded workflow data"}}
  specifics={[{title:"Workflow and prompt are separate",body:"The result shows workflow and prompt/execution fields separately. A ComfyUI prompt field can hold a serialized graph rather than a sentence."},{title:"Target supported workflow text",body:"Capture details, copyright, color data and Content Credentials are left for your review."},{title:"Check what remains",body:"The new copy is scanned again. Animated or unreadable metadata is flagged rather than counted as removed."}]}
  preserved={["Encoded PNG image data and dimensions.","Transparency and color profile when present.","Your original PNG and unrelated metadata fields."]}
  limits={["The workflow is designed for tested static PNG text fields. Animated ComfyUI comf chunks remain unresolved.","Compressed text that cannot be safely expanded is preserved and reported.","A removed embedded workflow is not proof of origin or a promise about detector results."]}
  steps={[{title:"Choose a static ComfyUI PNG",body:"Select an exported PNG. The file is read in your browser and checked for supported embedded workflow fields."},{title:"Review the separate field results",body:"Look for Workflow data and Prompt / execution data in the task summary. Not found only describes fields this scanner supports."},{title:"Check what remains",body:"Read the verification card and any unresolved findings before using the copy."},{title:"Download the verified copy",body:"The original stays untouched. Download the separate file only after reviewing its result."}]}
  faqs={faqs}/>}
