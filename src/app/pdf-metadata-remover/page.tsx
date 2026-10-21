import { metadataFor } from "@/lib/site";
import { ToolPage } from "@/components/marketing/tool-page";

export const metadata = metadataFor("/pdf-metadata-remover");
export default function PdfMetadataRemoverPage() {
  return (
    <ToolPage
      documentKind="pdf"
      path="/pdf-metadata-remover"
      label="PDF metadata remover"
      h1="Remove Metadata from PDF Files"
      intro="Clean supported PDF Info properties and document-level XMP locally. Your file stays in this browser, the rewritten PDF is checked again, and you download a separate copy."
      specifics={[
        {
          title: "Info properties",
          body: "Removes supported title, author, subject, keywords, creator, producer and date fields.",
        },
        {
          title: "Document XMP",
          body: "Removes the document-level XMP metadata stream while rebuilding the PDF.",
        },
        {
          title: "One file",
          body: "Process one PDF per session with a 50 MB local size limit.",
        },
      ]}
      preserved={[
        "Page content, text and layout are preserved by the PDF rewrite when the file is supported.",
        "The original file is never overwritten.",
        "The output is loaded again before download.",
      ]}
      limits={[
        "Encrypted, signed, damaged or unsupported PDFs are rejected.",
        "This does not remove invisible watermarks, content inside page streams or external records.",
        "A PDF can contain metadata outside the supported fields; the report does not claim complete anonymity.",
      ]}
      steps={[
        { title: "Choose a PDF", body: "Select one PDF from your device." },
        {
          title: "Clean locally",
          body: "The browser removes supported Info and document-level XMP properties.",
        },
        {
          title: "Review and download",
          body: "Check the verification report before downloading a new copy.",
        },
      ]}
      faqs={[
        {
          question: "Is my PDF uploaded?",
          answer:
            "No. Checking, rewriting and verification happen in your browser.",
        },
        {
          question: "Does this remove every PDF trace?",
          answer:
            "No. It covers supported Info properties and document-level XMP only. Other content or external records can remain.",
        },
        { question: "Can it clean a scanned PDF?", answer: "No. This tool handles supported document properties; scanned page pixels are not OCR-cleaned." },
        { question: "Are signed or encrypted PDFs supported?", answer: "No. Signed and encrypted PDFs are rejected so the original is not damaged or misrepresented." },
        { question: "Does this change an AI detector result?", answer: "No. Metadata cleaning does not guarantee an AI detection or platform decision." },
      ]}
    />
  );
}
