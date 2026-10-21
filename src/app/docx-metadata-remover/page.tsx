import { metadataFor } from "@/lib/site";
import { ToolPage } from "@/components/marketing/tool-page";

export const metadata = metadataFor("/docx-metadata-remover");
export default function DocxMetadataRemoverPage() {
  return (
    <ToolPage
      documentKind="docx"
      path="/docx-metadata-remover"
      label="Word metadata remover"
      h1="Remove Metadata from Word Documents"
      intro="Clean supported Word document properties locally. The original stays unchanged, the copy is checked again, and you download a separate file."
      specifics={[
        {
          title: "Core properties",
          body: "Removes supported title, subject, creator, keywords, description, dates and revision fields.",
        },
        {
          title: "Application and custom properties",
          body: "Cleans supported app and custom property values while retaining the document package.",
        },
        {
          title: "Document structure",
          body: "Keeps the body, media and layout files unchanged while processing one DOCX locally.",
        },
      ]}
      preserved={[
        "Body text, embedded media and layout are retained in the DOCX package.",
        "The original file is never overwritten.",
        "The output ZIP package is reopened and its supported properties are scanned again.",
      ]}
      limits={[
        "Signed, unsafe, malformed, encrypted or oversized ZIP packages are rejected.",
        "Comments, tracked changes, document text, embedded media and layout are not cleaned.",
        "The report covers supported OOXML property parts and does not claim complete anonymity.",
      ]}
      steps={[
        { title: "Choose one DOCX", body: "Select a standard Word DOCX file." },
        {
          title: "Clean locally",
          body: "The browser removes supported core, app and custom property values.",
        },
        {
          title: "Review and download",
          body: "Confirm the verification report and download a separate copy.",
        },
      ]}
      faqs={[
        {
          question: "Does the document leave my browser?",
          answer:
            "No. The DOCX ZIP is inspected, rewritten and verified locally.",
        },
        {
          question: "Are comments and tracked changes removed?",
          answer:
            "No. They are outside this first supported property scope and remain for review.",
        },
        { question: "Can I clean an old .doc file?", answer: "No. This tool accepts modern DOCX files only; convert the file first and review the result." },
        { question: "Are comments and revisions anonymized?", answer: "No. Comments, tracked changes and document text remain outside the supported property cleanup." },
        { question: "Does this guarantee an anonymous Word file?", answer: "No. It removes supported properties only and does not guarantee an AI detector or platform result." },
      ]}
    />
  );
}
