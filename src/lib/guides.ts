export interface GuideSection { heading: string; paragraphs: string[] }
export interface GuideRecord {
  slug: string; title: string; description: string; h1: string; kicker: string; updated: string; updatedIso: string;
  answer: string; sections: GuideSection[]; limits: string[]; tools: Array<{ label: string; href: string }>;
  source: { label: string; href: string }; faq: { question: string; answer: string };
  additionalSources?: Array<{ label: string; href: string }>;
  extraFaqs?: Array<{ question: string; answer: string }>;
  table?: { headers: string[]; rows: string[][] };
  steps?: Array<{ title: string; body: string }>;
  stepsHeading?: string;
  evidenceIds?: string[];
  relatedGuides?: Array<{ label: string; href: string }>;
}

export const guides: GuideRecord[] = [
  {
    "updated": "October 22, 2026",
    "updatedIso": "2026-10-22",
    "slug": "batch-remove-image-metadata-client-delivery",
    "kicker": "Client delivery",
    "title": "How to Batch Remove Image Metadata Before Client Delivery",
    "description": "Prepare JPEG and PNG client copies locally, review every result, and check a ZIP summary. Understand Pro batch limits, partial copies and filename privacy.",
    "h1": "How to batch remove image metadata before client delivery",
    "answer": "Use the batch tool to process supported JPEG and PNG files locally, review each result and download completed copies in a ZIP. Pro is required for your own batches and ZIP exports. A ZIP can include partial results, so check the images and batch-results.json before handing the archive to a client. Originals remain unchanged.",
    "table": {
      "headers": [
        "Plan or limit",
        "Allowance",
        "Delivery implication"
      ],
      "rows": [
        [
          "Guest",
          "1 single-image clean per day.",
          "No personal-file batch processing or ZIP export."
        ],
        [
          "Free with Google sign-in",
          "5 single-image cleans per day in total.",
          "No personal-file batch processing or ZIP export."
        ],
        [
          "Pro Monthly and Yearly",
          "Unlimited daily image count; up to 10 images per batch.",
          "ZIP export included."
        ],
        [
          "Pro Yearly session",
          "Up to 30 images across three batches.",
          "Available within device capacity; not a 30-image single batch."
        ],
        [
          "Device queue",
          "30 files / 200 MB at 768 px or wider; 10 files / 100 MB below 768 px. 25 MB per file.",
          "The lower device or plan limit applies."
        ]
      ]
    },
    "stepsHeading": "Prepare a delivery ZIP",
    "steps": [
      {
        "title": "Try the built-in batch first",
        "body": "Open Batch Metadata Remover and choose Try a safe batch. These synthetic one-pixel files demonstrate cleaned, unchanged and partial results without using your own allowance."
      },
      {
        "title": "Prepare the client copies",
        "body": "Keep a master folder of originals. Use JPEG or PNG files within your plan and device limits. HEIC and TIFF are not accepted; WebP is inspection-only."
      },
      {
        "title": "Set one cleaning policy",
        "body": "Choose whether capture details or embedded PNG Content Credentials should be kept. The settings apply across the selected images; changing them rebuilds copies from originals."
      },
      {
        "title": "Review every result",
        "body": "Check which images are complete, unchanged, partial or failed. Remove partial files from the queue if they should not be delivered. A failed image is not included as an image in the ZIP."
      },
      {
        "title": "Download and inspect the archive",
        "body": "Choose Download completed images (ZIP). Open the archive locally, review batch-results.json, and spot-check the actual output files in Metadata Checker. Confirm which files are included before sharing."
      }
    ],
    "sections": [
      {
        "heading": "The summary is a checklist, not a clean certificate",
        "paragraphs": [
          "The ZIP contains completed images and batch-results.json. Each summary entry includes the original filename, detected format, result, counts of removed/preserved/unresolved fields and whether the image is included.",
          "The built-in batch has three files: one cleaned, one unchanged and one partially cleaned. All three can be included. Its needsReview count is 1; that is intentional. A failed or inspection-only file is listed but excluded from the image set."
        ]
      },
      {
        "heading": "Check filenames as well as image metadata",
        "paragraphs": [
          "The summary and ZIP entry names can reveal original filenames, including client or project names. Review them before sending the archive. If necessary, rename copies before selecting them or prepare a separate delivery folder from the processed images.",
          "The summary is created locally and packaged into the ZIP. Sharing the archive shares that summary too; browser-local processing does not make the document invisible to its recipient."
        ]
      },
      {
        "heading": "Do not mistake device capacity for paid entitlement",
        "paragraphs": [
          "A wide-screen queue can hold 30 images, but Pro processing uses groups of at most 10. Yearly can process a session across three groups; Monthly is limited to 10 images per processing session. On a narrow screen, the queue capacity is 10 even for Yearly.",
          "If you encounter a quota or size message, reduce the selection and check the current plan. Free allowances reset at 00:00 UTC. Unlimited daily Pro image count does not remove file-size, device-memory or per-batch limits."
        ]
      },
      {
        "heading": "Verify the actual output before delivery",
        "paragraphs": [
          "Supported encoded image data and dimensions are checked during processing. The downloadable experiment below deliberately leaves oversized compressed text unresolved while preserving image data. It explains why a successful download may still require review.",
          "There is no real client material in these examples. They do not establish compatibility with every generator export, all image sizes or all mobile browsers."
        ]
      }
    ],
    "limits": [
      "Partial copies can be included in a ZIP and may still contain private metadata.",
      "Failed files are excluded; do not assume the selected count equals the delivered count.",
      "The ZIP summary and entry names can disclose original filenames."
    ],
    "tools": [
      {
        "label": "Prepare a batch",
        "href": "/batch-metadata-remover"
      },
      {
        "label": "Recheck an output image",
        "href": "/metadata-checker"
      }
    ],
    "source": {
      "label": "AI Metadata Remover: batch results and device limits",
      "href": "https://aimetadataremover.pro/batch-metadata-remover"
    },
    "faq": {
      "question": "Will one failed file prevent every download?",
      "answer": "No. Completed copies remain available. Review the summary for excluded files and the partial results that still need attention."
    },
    "extraFaqs": [
      {
        "question": "Can I download the demo ZIP without Pro?",
        "answer": "The tool’s built-in safe batch is free to try. Processing and exporting your own batches requires Pro."
      }
    ],
    "evidenceIds": [
      "review-needed-png"
    ],
    "relatedGuides": [
      {
        "label": "Clean images without re-encoding",
        "href": "/blog/image-metadata-before-publishing"
      },
      {
        "label": "Keep ComfyUI workflow details private",
        "href": "/blog/stable-diffusion-comfyui-metadata"
      }
    ]
  },
  {
    slug: "remove-author-metadata-from-pdf-before-sharing",
    kicker: "PDF privacy",
    updated: "October 21, 2026",
    updatedIso: "2026-10-21",
    title: "How Do I Remove Author and Metadata from a PDF Before Sharing?",
    description:
      "A practical guide to checking PDF author, creator, producer, Info and XMP metadata before sharing a separate cleaned copy.",
    h1: "How Do I Remove Author and Metadata from a PDF Before Sharing?",
    answer:
      "Check the PDF first, remove only the supported document properties, then open the cleaned copy and review the verification result. This browser tool processes one supported PDF locally and does not upload it.",
    sections: [
      {
        heading: "What PDF author metadata can reveal",
        paragraphs: [
          "PDF viewers often expose title, author, subject, keywords, creator, producer and creation or modification dates in Document Properties. A document-level XMP record can repeat or extend some of that information. These fields may identify a person, an export application or an internal workflow even when the visible pages look harmless.",
          "The visible page is a separate concern. Removing supported properties does not rewrite ordinary text, erase annotations, remove attachments, clean a scanned page image or delete every possible object in a PDF. Adobe describes sanitizing as a broader review process for hidden content; use that distinction when the document is sensitive.",
        ],
      },
      {
        heading: "Inspect the PDF before cleaning it",
        paragraphs: [
          "Use the local PDF Metadata Remover and choose one PDF. The result lists supported properties found in the file, including author, creator, producer and document-level XMP when present. Encrypted, signed, damaged or unsupported PDFs are rejected because producing a seemingly clean copy would be misleading.",
          "A scanned PDF may contain a picture of a page rather than editable text. Removing document properties does not remove names, addresses or signatures visible inside that picture. Review the page content separately, especially when the PDF came from a scanner or includes attachments.",
        ],
      },
      {
        heading: "Create and review a separate copy",
        paragraphs: [
          "Select the cleaning action only after you have decided what the recipient needs. The tool rewrites a separate copy in the browser, checks the output again, and enables download only when the supported fields it targets are no longer reported. Your original file remains unchanged.",
          "Open the downloaded copy in a PDF viewer and inspect its Document Properties. Keep the original in a controlled location if it may be needed for records. Re-saving a PDF in another application can add new producer or modification information, so check the final file after any later edit.",
        ],
      },
      {
        heading: "What this does not promise",
        paragraphs: [
          "This workflow does not guarantee that a PDF is anonymous, that hidden content is gone, or that an AI detector or platform will make a different decision. It does not remove invisible watermarks, page-level metadata outside the supported fields, attachments, scripts or external records. Signed and encrypted files remain outside the local cleaner.",
          "For a broader redaction or sanitization workflow, use the document application's own review tools and keep a copy of the original. The local metadata tool is a focused check-and-clean step for supported properties, not a replacement for reviewing the document itself.",
        ],
      },
    ],
    table: {
      headers: ["Area", "Local tool", "Still requires review"],
      rows: [
        [
          "Author and creator fields",
          "Inspect and remove supported values",
          "Properties added after download",
        ],
        [
          "Document-level XMP",
          "Remove when supported",
          "Page, annotation or attachment data",
        ],
        [
          "Scanned pages",
          "Not changed",
          "Names and other visible content in the scan",
        ],
      ],
    },
    stepsHeading: "Remove PDF metadata before sharing",
    steps: [
      {
        title: "Choose the PDF",
        body: "Select the exact copy you plan to send; signed, encrypted and unsupported PDFs are rejected.",
      },
      {
        title: "Read the findings",
        body: "Check author, creator, producer, Info and XMP results before choosing the clean action.",
      },
      {
        title: "Download and recheck",
        body: "Download the separate copy and inspect its properties again after any later edit.",
      },
    ],
    limits: [
      "Scanned page content, annotations, attachments and scripts are not cleaned.",
      "Signed or encrypted PDFs are rejected.",
      "Metadata cleaning does not guarantee an AI detector or platform result.",
    ],
    tools: [
      { label: "Remove PDF metadata locally", href: "/pdf-metadata-remover" },
      { label: "Compare supported formats", href: "/supported-formats" },
    ],
    source: {
      label: "Adobe Acrobat: sanitize PDFs",
      href: "https://helpx.adobe.com/acrobat/desktop/protect-documents/redact-pdfs/sanitize.html",
    },
    faq: {
      question: "Can I remove metadata from a scanned PDF?",
      answer:
        "Yes, supported document-level properties can be cleaned. Text or names visible inside the scanned page image are not removed.",
    },
    extraFaqs: [
      {
        question: "Can I clean a signed or encrypted PDF?",
        answer:
          "No. The local tool rejects signed and encrypted PDFs rather than creating an output that could misrepresent their state.",
      },
      {
        question: "Will cleaning PDF metadata change an AI detection result?",
        answer:
          "There is no guarantee. Metadata is only one possible signal and this tool does not control a detector or platform.",
      },
    ],
  },
  {
    slug: "remove-author-last-modified-by-word-document",
    kicker: "Word privacy",
    updated: "October 21, 2026",
    updatedIso: "2026-10-21",
    title: "How Do I Remove Author and Last Modified By from a Word Document?",
    description:
      "Learn how to inspect and clean supported author, last modified by, company and custom properties in a DOCX before sharing.",
    h1: "How Do I Remove Author and Last Modified By from a Word Document?",
    answer:
      "Use a copy of the DOCX, inspect its supported properties, remove the values you do not want to share, and review the output before sending it. The browser tool handles modern DOCX files locally; it does not upload the document.",
    sections: [
      {
        heading: "Which Word properties matter",
        paragraphs: [
          "A Word file can carry creator, last modified by, company, manager, title, subject, revision and custom property values. Those fields can reveal an account name, an organization or an internal project label. They are separate from the document's visible paragraphs and from comments or tracked changes.",
          "Last modified by is the name recorded for the account that last saved the document; it is not the same as the file system's modified timestamp. Check both: the local tool handles the supported document property, while the file system date can change whenever a copy is saved.",
          "A cleaned copy can still contain personal information in the body, comments, revision history, headers, footers, embedded media or other document content. Treat property cleanup as one review step rather than a promise that the file is anonymous.",
        ],
      },
      {
        heading: "Use the browser tool with a copy",
        paragraphs: [
          "Open Word Metadata Remover and choose a modern DOCX copy. The tool checks the document structure before reading the property parts and rejects old DOC files, macro-enabled, signed, encrypted, malformed or unsafe packages. It shows the supported properties it found and the limits that remain.",
          "The tool keeps the body, media and layout files while cleaning supported properties. It does not remove comments, tracked changes or document text. Keep your original file and work on a copy because a later Word save can add a new author or modified-by value.",
        ],
      },
      {
        heading: "Windows Document Inspector and Mac review",
        paragraphs: [
          "On Windows desktop Word, open a copy, select File > Info > Check for Issues > Inspect Document, and review the categories before removing anything. Document Inspector can identify hidden personal information, comments, revisions and other content that a focused property cleaner does not cover. The exact categories depend on the document and Word version.",
          "Word for Mac does not provide the Windows Document Inspector. Use the document properties and privacy controls available in your Mac version, then reopen the saved copy and check its properties. Do not assume that a Windows menu path exists on Mac, and do not send the file until you have reviewed the final save.",
        ],
      },
      {
        heading: "What remains after property cleanup",
        paragraphs: [
          "The local tool reports supported property values before cleaning and verifies the output after rewriting. It leaves comments, tracked changes, body text, embedded media and layout in place. If the document contains a comment or revision that names a person, remove or accept it in Word and save a new copy, then inspect that copy again.",
          "The result does not guarantee an anonymous file or a different AI detector decision. It also does not support the legacy DOC format. Use a standard DOCX workflow, retain the original, and check the final copy after any application re-save.",
        ],
      },
    ],
    table: {
      headers: [
        "Property or content",
        "Local DOCX tool",
        "Needs separate review",
      ],
      rows: [
        [
          "Author and last modified by",
          "Inspect and remove supported values",
          "Values added by a later save",
        ],
        [
          "Company and custom properties",
          "Inspect and clean supported fields",
          "Unknown or application-specific data",
        ],
        [
          "Comments and revisions",
          "Preserved",
          "Review or remove in Word before sharing",
        ],
      ],
    },
    stepsHeading: "Remove Word document properties before sharing",
    steps: [
      {
        title: "Make a copy",
        body: "Keep the original and choose a modern DOCX copy, not a legacy .doc file.",
      },
      {
        title: "Inspect and clean",
        body: "Review creator, last modified by, company and custom properties, then clean supported values locally.",
      },
      {
        title: "Review the final save",
        body: "Open the downloaded copy, check comments and revisions in Word, and recheck properties after any later save.",
      },
    ],
    limits: [
      "Legacy .doc, macro-enabled, signed and encrypted packages are rejected.",
      "Comments, tracked changes, body text, media and layout are not cleaned.",
      "Cleaning does not guarantee an anonymous file or an AI detector result.",
    ],
    tools: [
      { label: "Remove Word DOCX properties", href: "/docx-metadata-remover" },
      { label: "Compare supported formats", href: "/supported-formats" },
    ],
    source: {
      label: "Microsoft: inspect documents",
      href: "https://support.microsoft.com/en-us/office/inspect-document-b0088a7a-d482-4b87-b762-7c94c7c71e23",
    },
    additionalSources: [
      {
        label: "Microsoft: remove hidden data",
        href: "https://support.microsoft.com/en-us/office/collab-files/remove-hidden-data-and-personal-information-by-inspecting-documents-presentations-or-workbooks",
      },
    ],
    faq: {
      question: "Can this clean an old .doc file?",
      answer:
        "No. The browser tool accepts modern DOCX files only. Convert a copy first and review the converted document.",
    },
    extraFaqs: [
      {
        question: "Are comments and tracked changes removed?",
        answer:
          "No. They remain for review and should be handled in Word before sharing.",
      },
      {
        question: "Does removing author data make a Word file anonymous?",
        answer:
          "No. Body text, comments, revisions, media and later application saves can still contain identifying information.",
      },
    ],
  },
  {
    slug: "why-edited-photos-get-ai-info-labels", kicker: "Photo editing and AI labels", updated: "October 12, 2026", updatedIso: "2026-10-12",
    title: "Why Edited Photos Get AI Info Labels — What You Can Check",
    description: "Learn why edited camera photos can get AI info labels, inspect embedded signals and check what metadata cleaning can change before sharing.",
    h1: "Why do edited photos get AI info labels?",
    answer: "A camera photo can pick up AI-related signals during editing, even when the original scene was photographed. Meta has documented labels triggered by minor AI retouching. Inspecting the file can help you understand its embedded records, but removing metadata does not guarantee that a platform will change a label.",
    sections: [
      { heading: "How an edit can leave a file-level signal", paragraphs: ["An export may carry software details, workflow fields or Content Credentials describing its history. Those records can travel with the photo even when an edit is visually small. A software name by itself is not proof that the whole picture was generated.", "In its labeling explanation, Meta distinguishes signals shared by the industry from an uploader's own disclosure. Its September 2024 update also described different treatment for AI-edited and AI-generated content. Read the explanation attached to the specific post rather than assuming every AI info label has the same cause."] },
      { heading: "Review the metadata in the file you plan to share", paragraphs: ["Start with the exact exported file, not a screenshot of a post or a differently saved version. The Image Metadata Checker reads supported fields in JPEG, PNG and WebP without changing them. Open workflow, software and provenance findings separately; keep prompts and location values hidden unless you need to read them.", "A prompt field may describe an AI workflow. A Content Credential can describe capture or editing history. The local C2PA checker separates a record's presence from its integrity status; it does not certify an issuer or produce an AI probability. No finding does not prove that an image is human-made."] },
      { heading: "Create a delivery copy when embedded details should stay private", paragraphs: ["The cleaner can remove recognized AI workflow fields and supported private EXIF from JPEG and PNG copies without re-encoding their image data. Embedded PNG caBX credentials are removed by default; use Keep Content Credentials when the delivery needs them. JPEG and WebP credentials cannot be removed here, and WebP is inspection-only.", "Decide whether location, capture details, prompts or provenance belong in the copy. A client handoff and a provenance-preserving archive have different needs. Keep the original export so that cleaning a delivery copy does not erase your own record.", "Read the verification result before downloading. Cleaning complete covers supported fields. A partial result contains unresolved data; an unchanged result means no supported fields needed removal. Download the copy and inspect that file again if the details matter to your handoff."] },
      { heading: "Why a platform label may remain after cleaning", paragraphs: ["Cleaning changes a local file. It does not edit an existing Instagram or Facebook post, remove a disclosure from your account, or control a platform's stored records. Pixel-based signals and invisible watermarks are also outside this cleaner.", "If a label appears on a posted photo, open the platform's explanation and follow its own review or help options where available. Compare that explanation with your local file findings. Avoid treating a metadata-free-looking report as evidence that the platform made a mistake or that an AI-generated image is a camera original."] },
    ],
    table: { headers: ["What you see", "What to check", "Useful next action"], rows: [
      ["Prompt or workflow finding", "Which supported field is embedded in this export?", "Review the value locally and clean a delivery copy when appropriate."],
      ["Content Credentials", "Was a record found, and could its integrity be checked?", "Read the separate C2PA result; provenance is not an AI score."],
      ["AI info on a post", "Does the label explanation name a shared signal or disclosure?", "Use the platform's explanation; a file tool cannot alter the post."],
    ] },
    stepsHeading: "Check an edited photo before sharing it",
    steps: [
      { title: "Inspect the exported file", body: "Choose the actual JPEG, PNG or WebP in the Metadata Checker and review supported workflow and provenance findings." },
      { title: "Clean a separate copy if needed", body: "For JPEG or PNG, decide what to keep, then let the cleaner check, clean and verify the output." },
      { title: "Review the copy and platform context", body: "Download the reviewed file, scan it again and handle a posted item's AI label through the platform's own explanation." },
    ],
    limits: ["Metadata cleaning does not guarantee a different AI info label or detector score.", "This tool does not remove pixel watermarks or rewrite a posted item.", "Unsupported fields can remain; retain the original and review partial results."],
    tools: [{ label: "Inspect the exported photo", href: "/metadata-checker" }, { label: "Clean file-level AI signals", href: "/remove-ai-detection-from-image" }, { label: "Check Content Credentials", href: "/c2pa-metadata-checker" }, { label: "Prepare a batch delivery", href: "/batch-metadata-remover" }],
    source: { label: "Meta: AI-generated and edited-content labeling", href: "https://about.fb.com/news/2024/04/metas-approach-to-labeling-ai-generated-content-and-manipulated-media/" },
    additionalSources: [{ label: "C2PA: Content Credentials FAQ", href: "https://c2pa.org/faqs/" }],
    faq: { question: "Does AI info mean the whole photo was generated?", answer: "Not necessarily. Meta has documented industry-standard signals on lightly AI-edited photos. Check the post's explanation and the export's actual metadata." },
    extraFaqs: [
      { question: "Will converting a photo to JPEG remove an AI label?", answer: "A conversion can change metadata and image data, but it does not guarantee a platform outcome. Inspect the resulting file instead of assuming a format change removed every signal." },
      { question: "Can this remove the label from a photo already posted?", answer: "No. This tool works on local image copies. Use the platform's label explanation and help options for an existing post." },
    ],
  },
  {
    "updated": "October 22, 2026",
    "updatedIso": "2026-10-22",
    "slug": "chatgpt-dalle-image-metadata",
    "kicker": "ChatGPT image privacy",
    "title": "How to Check and Remove Metadata From ChatGPT Images",
    "description": "Check the actual format of a ChatGPT or DALL·E export, understand PNG and JPEG cleaning limits, and separate Content Credentials from invisible watermarks.",
    "h1": "How to check and remove metadata from ChatGPT images",
    "answer": "Start with the file you actually downloaded. This tool can inspect JPEG, PNG and WebP, but only supported JPEG and PNG metadata can be cleaned. Supported embedded PNG Content Credentials can be removed from a copy; JPEG credentials remain and WebP is inspection-only. Metadata cleaning does not remove SynthID or prove an image is human-made.",
    "table": {
      "headers": [
        "Downloaded format",
        "Available task here",
        "Important boundary"
      ],
      "rows": [
        [
          "PNG",
          "Inspect; clean recognized workflow and supported private fields; optionally remove supported embedded caBX records.",
          "Unreadable or unsupported records can remain."
        ],
        [
          "JPEG / JPG",
          "Inspect; clean supported workflow XMP and private EXIF fields.",
          "JPEG Content Credentials and mixed XMP may remain."
        ],
        [
          "WebP",
          "Inspect supported fields.",
          "No cleaned WebP copy is produced."
        ]
      ]
    },
    "stepsHeading": "Check your own downloaded image",
    "steps": [
      {
        "title": "Keep the original export",
        "body": "Download the original file from the service when available. Keep its generation/export date in your own notes. A screenshot or a converted copy can have different metadata and image data."
      },
      {
        "title": "Inspect the actual structure",
        "body": "Choose the file in Metadata Checker. Read the detected format and the supported findings; the filename alone is not a format or origin test."
      },
      {
        "title": "Choose what belongs in the delivery copy",
        "body": "For JPEG or PNG, open the general cleaner. Use Keep capture details or Keep Content Credentials when appropriate. These keep options are off by default. Cleaning applies only to supported fields."
      },
      {
        "title": "Review and recheck",
        "body": "Read the verified or partial result before downloading. Open the downloaded copy in the checker to see what remains. If you need to preserve provenance, retain and deliver the original according to the recipient’s requirements."
      }
    ],
    "sections": [
      {
        "heading": "Do not assume every ChatGPT image has the same fields",
        "paragraphs": [
          "A file’s contents depend on the generation product, model, export path, file type and when it was created. Do not assume it contains your chat prompt, a ComfyUI graph or camera metadata simply because it came from an AI tool.",
          "This guide does not include an independently tested, original ChatGPT or DALL·E export. The linked general guide offers clearly labeled synthetic files for learning the cleaning and verification process; they do not establish coverage for a particular OpenAI export."
        ]
      },
      {
        "heading": "Content Credentials and SynthID are different signals",
        "paragraphs": [
          "OpenAI’s current help page describes Content Credentials and SynthID as distinct provenance signals, with coverage depending on the product and export. Content Credentials carry provenance information associated with the file; SynthID embeds a watermark in the content.",
          "Removing a supported embedded PNG record does not remove a watermark, erase external provenance or change a platform’s stored decision. This metadata tool does not test for or remove SynthID. A missing credential is not proof of human authorship."
        ]
      },
      {
        "heading": "Choose inspection when removal is not supported",
        "paragraphs": [
          "If your JPEG contains Content Credentials, this tool can report supported embedded records but cannot remove those credentials. For WebP, use the report as inspection only. Do not rename the extension and expect a different cleaning capability.",
          "Avoid converting an image merely to obtain a clean-looking report. Conversion can change the encoded image and metadata; inspect the actual resulting file and assess the quality separately."
        ]
      },
      {
        "heading": "Plan the number of files",
        "paragraphs": [
          "Guests have 1 single-image clean per day. Google sign-in gives Free users 5 per day in total. Batch processing and ZIP downloads require Pro. The checker does not turn an unsupported format into a supported cleaning format."
        ]
      }
    ],
    "limits": [
      "No real ChatGPT export was tested for this article; inspect your actual file.",
      "PNG credential removal is not a claim to remove every provenance signal.",
      "This tool does not remove SynthID, certify origin or guarantee a platform outcome."
    ],
    "tools": [
      {
        "label": "Inspect a ChatGPT export",
        "href": "/metadata-checker"
      },
      {
        "label": "Clean a supported image copy",
        "href": "/"
      },
      {
        "label": "Review PNG cleaning",
        "href": "/remove-metadata-from-png"
      }
    ],
    "source": {
      "label": "OpenAI: provenance signals in generated content",
      "href": "https://help.openai.com/en/articles/8912793-provenance-signals-in-openai-generated-content"
    },
    "faq": {
      "question": "Does ChatGPT always embed my prompt in the downloaded image?",
      "answer": "Do not assume so. Inspect the actual file. Provenance records, chat text and generation workflow fields are different things."
    },
    "extraFaqs": [
      {
        "question": "Will removing Content Credentials also remove SynthID?",
        "answer": "No. This cleaner changes supported file metadata; it does not remove or test invisible pixel watermarks."
      }
    ],
    "relatedGuides": [
      {
        "label": "Clean images without re-encoding",
        "href": "/blog/image-metadata-before-publishing"
      },
      {
        "label": "Prepare a batch delivery",
        "href": "/blog/batch-remove-image-metadata-client-delivery"
      },
      {
        "label": "Understand Content Credentials",
        "href": "/blog/c2pa-content-credentials-explained"
      }
    ]
  },
  {
    "updated": "October 22, 2026",
    "updatedIso": "2026-10-22",
    "slug": "stable-diffusion-comfyui-metadata",
    "kicker": "Workflow privacy",
    "title": "How to Remove ComfyUI Workflow and Prompt Metadata From PNGs",
    "description": "Inspect workflow and prompt fields, clean a static ComfyUI PNG copy without re-encoding, and check what remains. Includes downloadable synthetic test files.",
    "h1": "How to remove ComfyUI workflow and prompt metadata from PNGs",
    "answer": "For a supported static PNG, you can remove embedded workflow and prompt/execution fields locally without re-encoding the image. Keep your original, clean a delivery copy with the ComfyUI tool, then inspect the downloaded copy. Animated comf metadata and unreadable or oversized text can remain. Cleaning metadata does not remove invisible watermarks or guarantee a different platform label.",
    "table": {
      "headers": [
        "Field",
        "What it can contain",
        "What to check"
      ],
      "rows": [
        [
          "workflow",
          "The graph used to restore nodes and their layout.",
          "Check this separately from prompt."
        ],
        [
          "prompt",
          "Execution nodes and their inputs; not necessarily a sentence.",
          "Removing workflow alone may leave execution details."
        ],
        [
          "parameters",
          "Generation settings commonly associated with Stable Diffusion exports.",
          "Use the Stable Diffusion tool for this separate task."
        ]
      ]
    },
    "stepsHeading": "Clean an existing static PNG",
    "steps": [
      {
        "title": "Keep an original and inspect the export",
        "body": "Save a separate master copy. Open Metadata Checker and choose the actual exported PNG. Review the workflow and prompt findings locally; do not assume that a renamed extension changes the format."
      },
      {
        "title": "Use the ComfyUI workflow tool",
        "body": "Open the dedicated tool and choose the PNG. It automatically creates a separate copy targeting recognized workflow fields. This focused task leaves unrelated privacy fields and Content Credentials for review."
      },
      {
        "title": "Read both workflow results",
        "body": "Check Workflow data and Prompt / execution data separately. A missing field is not evidence that every possible workflow field has been inspected. Review any unresolved findings."
      },
      {
        "title": "Download and inspect the copy",
        "body": "Download only after reviewing the result, then open that downloaded file in Metadata Checker. Keep the original or a separately saved workflow JSON for your own future editing."
      }
    ],
    "sections": [
      {
        "heading": "A removed recipe cannot restore your original project",
        "paragraphs": [
          "ComfyUI can load embedded workflow information from an output file. Once those supported records have been removed from a delivery copy, do not rely on that copy to recover your original graph. Your separately saved project and original image are unchanged.",
          "The downloadable example below contains deliberately constructed workflow and prompt fields. It tests those structures only: it is not a real ComfyUI export or a runnable example workflow."
        ]
      },
      {
        "heading": "Control metadata in future ComfyUI exports",
        "paragraphs": [
          "ComfyUI documents a startup option for disabling metadata: in the terminal where you normally start ComfyUI, add --disable-metadata to the launch command, for example python main.py --disable-metadata. Save your workflow separately before using this option.",
          "For ComfyUI Desktop, the documented path is Settings > Server-Config; enable Disable saving prompt metadata in files. Check a newly exported file afterward. This changes future saves, not files already exported, and custom save nodes may have their own behavior."
        ]
      },
      {
        "heading": "When a PNG still needs review",
        "paragraphs": [
          "The cleaner supports recognized plain PNG text and supported compressed text that expands within 1 MB per block. Invalid or larger compressed text is retained and reported. Animated ComfyUI comf chunks remain unresolved.",
          "The focused tool preserves unrelated metadata. If the delivery also needs GPS or other supported private fields removed, review the general cleaner and its settings instead of assuming the workflow-only task removed them."
        ]
      },
      {
        "heading": "Free allowance and batch work",
        "paragraphs": [
          "Guests can clean 1 image per day. Google sign-in gives Free users 5 single-image cleans per day in total. Pro supports batches of up to 10 and ZIP downloads; Yearly can split up to 30 images across three batches within device limits. Built-in samples are free to try."
        ]
      }
    ],
    "limits": [
      "Only supported fields in the tested file structures are covered.",
      "Removing workflow records does not remove visible content, invisible watermarks or platform-side records.",
      "Keep the original if you need to recover the workflow later."
    ],
    "tools": [
      {
        "label": "Clean a ComfyUI PNG",
        "href": "/comfyui-workflow-remover"
      },
      {
        "label": "Inspect the downloaded copy",
        "href": "/metadata-checker"
      },
      {
        "label": "Clean Stable Diffusion parameters",
        "href": "/stable-diffusion-metadata-remover"
      }
    ],
    "source": {
      "label": "ComfyUI: workflow metadata and export settings",
      "href": "https://docs.comfy.org/development/api-development/workflow-metadata"
    },
    "faq": {
      "question": "Is removing workflow enough to remove prompt data?",
      "answer": "Not necessarily. They are separate fields. Check both results and review other recognized or unresolved text."
    },
    "extraFaqs": [
      {
        "question": "Does this alter the nodes in my saved ComfyUI project?",
        "answer": "No. The tool creates a separate image copy. It does not connect to or edit your ComfyUI project."
      }
    ],
    "evidenceIds": [
      "workflow-png"
    ],
    "relatedGuides": [
      {
        "label": "Clean images without re-encoding",
        "href": "/blog/image-metadata-before-publishing"
      },
      {
        "label": "Prepare a batch delivery",
        "href": "/blog/batch-remove-image-metadata-client-delivery"
      }
    ]
  },
  {
    slug: "c2pa-content-credentials-explained", kicker: "Provenance", updated: "October 12, 2026", updatedIso: "2026-10-12",
    title: "What Are C2PA Content Credentials? Check and Understand Them",
    description: "Learn what C2PA Content Credentials record, how to read presence and integrity results, and what removing an embedded image credential changes.",
    h1: "What are C2PA Content Credentials?",
    answer: "C2PA is a standard for recording the origin and history of media. Content Credentials are signed provenance records that can describe how an image was captured or edited. They help you inspect the recorded history; their presence alone does not mean an image was made by AI.",
    sections: [
      { heading: "What Content Credentials can tell you", paragraphs: ["Depending on the file and signer, a record can describe capture, editing actions or AI-related provenance. It is a record of claims about an asset, not a pixel-based AI probability. A camera-origin photo can carry credentials too.", "Use the C2PA Content Credentials Checker to inspect supported embedded records in a JPEG, PNG or WebP. The page is read-only: selecting a file does not remove its history or generate a replacement copy."] },
      { heading: "Separate presence, integrity and issuer trust", paragraphs: ["A found record tells you that supported provenance data is embedded. A valid integrity result tells you that the supported signed claims and asset binding passed verification. Trust asks whether the signer is one you recognize or accept.", "This checker has no configured issuer trust anchors. It shows presence and integrity states separately and does not label a valid signature as trusted, certify ownership or decide whether the scene is true."] },
      { heading: "Read failed and unverified results carefully", paragraphs: ["A validation failure and a verifier error are different outcomes. A supported record that fails verification needs review. A browser error or unsupported structure can mean verification did not finish, rather than proving that the record was altered.", "No record found in supported fields means only that this local check did not find one. It is not proof of human authorship or the absence of an external provenance history. Keep the original when you need to investigate a result."] },
      { heading: "What removing an embedded C2PA credential changes", paragraphs: ["The cleaner can remove embedded PNG caBX credentials from a separate copy. Default cleaning removes them; select Keep Content Credentials when the copy needs its provenance. JPEG and WebP credentials are inspection-only here.", "Removal changes the new file's embedded record. It does not erase external histories or platform records. The C2PA FAQ also describes durable credentials using watermarking or fingerprinting to help rediscover associated records; these mechanisms are outside this metadata cleaner.", "Before a client handoff, decide whether provenance should travel with the image. Review the cleaning report, retain the original and check the downloaded copy. File-level cleaning is not an authenticity certificate."] },
    ],
    table: { headers: ["Question", "Local result", "What it does not establish"], rows: [
      ["Is a record embedded?", "Found or not found in supported fields", "Whether an external history exists"],
      ["Did integrity validate?", "Valid, failed or unverified", "Whether the signer is trusted or the scene is true"],
      ["Who should I trust?", "Issuer trust is not assessed", "Ownership or an authenticity certificate"],
    ] },
    stepsHeading: "Check Content Credentials in an image",
    steps: [{ title: "Choose the original file", body: "Select a JPEG, PNG or WebP in the read-only C2PA checker." }, { title: "Read each result separately", body: "Check record presence, integrity and the unassessed issuer-trust state." }, { title: "Choose a delivery workflow", body: "Keep provenance when needed, or review supported PNG credential removal on a separate copy." }],
    limits: ["Issuer trust is not inferred from a valid signature.", "External provenance histories are not fetched or guaranteed.", "The feature does not detect SynthID or pixel watermarks."],
    tools: [{ label: "Check Content Credentials locally", href: "/c2pa-metadata-checker" }, { label: "Review PNG credential removal", href: "/remove-metadata-from-png" }, { label: "Understand AI info labels on edited photos", href: "/blog/why-edited-photos-get-ai-info-labels" }],
    source: { label: "C2PA Explainer", href: "https://spec.c2pa.org/specifications/2.2/explainer/Explainer.html" },
    additionalSources: [{ label: "C2PA FAQ: provenance and durable credentials", href: "https://c2pa.org/faqs/" }],
    faq: { question: "Does removing an embedded credential erase external provenance?", answer: "No. It only changes the new local copy; external records and platform-side histories are outside this tool." },
    extraFaqs: [{ question: "Does C2PA mean the image was generated by AI?", answer: "No. Content Credentials can record capture or editing history as well as AI-related claims. Read the actual record rather than treating its presence as an AI verdict." }, { question: "Does valid integrity mean the signer is trusted?", answer: "No. This checker does not assess issuer trust. A valid integrity result is different from deciding whether to trust the signer or the image's claims." }],
  },
  {
    slug: "exif-gps-privacy-before-sharing", kicker: "Privacy checklist", updated: "September 28, 2026", updatedIso: "2026-09-28",
    title: "EXIF and GPS Privacy: Check an Image Before Sharing",
    description: "A plain-language checklist for location, device, capture date and creator metadata before sending an image.",
    h1: "How do you check EXIF and GPS privacy before sharing?",
    answer: "Scan the file first, identify location and device fields, then create a separate delivery copy if those details are not needed. Keep the original because metadata can support later editing, attribution or evidence.",
    sections: [
      { heading: "Look for location and device identifiers", paragraphs: ["GPS coordinates can reveal where a photo was taken. Serial numbers, MakerNotes and capture dates can reveal equipment or timing. Treat each finding as context, not as a reason to erase every field.", "The current automatic cleaner removes supported privacy fields from JPEG and PNG. It preserves copyright and orientation, and reports unsupported structures instead of guessing."] },
      { heading: "Verify the copy before sending it", paragraphs: ["The result records the original and output scan, including dimensions, transparency, color profile, orientation and encoded payload. Remaining findings stay visible for review.", "WebP is scan-only, so use a specialist workflow if privacy cleaning is required for that format."] },
    ],
    limits: ["Not every nested or compressed field is supported.", "A clean metadata report is not a legal privacy guarantee.", "Pixels and visible backgrounds can still reveal location."],
    tools: [{ label: "Inspect an image", href: "/metadata-checker" }, { label: "Remove supported GPS data", href: "/remove-gps-from-photo" }],
    source: { label: "ExifTool tag reference", href: "https://exiftool.org/TagNames/EXIF.html" },
    faq: { question: "Should I delete copyright metadata too?", answer: "Usually review and keep it when it supports attribution or licensing. The tool does not remove it by default." },
  },
  {
    slug: "jpeg-png-webp-metadata-support", kicker: "Format guide", updated: "September 28, 2026", updatedIso: "2026-09-28",
    title: "JPEG, PNG and WebP Metadata Support: What Changes by Format",
    description: "Compare the metadata structures commonly found in JPEG, PNG and WebP images, including workflow, privacy and provenance fields.",
    h1: "Can JPEG, PNG and WebP images contain metadata?",
    answer: "Yes. JPEG files can contain EXIF, XMP, ICC, IPTC and C2PA records; PNG files can contain text chunks, EXIF, ICC and caBX Content Credentials; WebP files can contain EXIF, XMP and C2PA chunks alongside animation and transparency information. The exact fields vary by encoder and workflow, so a format name alone does not tell you what is embedded.",
    sections: [
      { heading: "JPEG", paragraphs: ["JPEG scans EXIF, XMP, ICC, confirmed C2PA markers and unsupported IPTC blocks. Mixed workflow XMP is retained and marked for review when removing it could also remove attribution."] },
      { heading: "PNG", paragraphs: ["PNG scans text chunks, EXIF, ICC, transparency, animation and caBX Content Credentials. Supported chunks are rebuilt with checksums, while compressed text that cannot be safely expanded remains unresolved."] },
      { heading: "WebP", paragraphs: ["WebP scanning reports EXIF, XMP and C2PA chunks plus dimensions, animation and transparency. Cleaning is intentionally disabled; do not treat an inspection result as a cleaned file."] },
    ],
    limits: ["Supported does not mean every field in every file.", "No format is promised to be metadata-free.", "The original file is never overwritten."],
    tools: [{ label: "Compare supported formats", href: "/supported-formats" }, { label: "Clean supported JPEG metadata", href: "/remove-metadata-from-jpeg" }, { label: "Read PNG cleaner details", href: "/remove-metadata-from-png" }],
    source: { label: "PNG specification", href: "https://www.w3.org/TR/PNG/" },
    faq: { question: "Does PNG cleaning re-encode the image?", answer: "No. It rewrites supported metadata chunks and verifies that the encoded image payload remains unchanged." },
  },
  {
    "updated": "October 22, 2026",
    "updatedIso": "2026-10-22",
    "slug": "image-metadata-before-publishing",
    "kicker": "Private image delivery",
    "title": "How to Remove Image Metadata Without Losing Quality",
    "description": "Clean supported JPEG and PNG metadata locally without re-encoding. Follow the steps, compare downloadable test files, and review what remains before sharing.",
    "h1": "How to remove image metadata without losing quality",
    "answer": "For supported JPEG and PNG files, the cleaner changes selected metadata while keeping encoded image data intact. Your image is processed in your browser, your original is preserved, and the output is checked before download. This does not mean every metadata field can be removed. Read partial results and recheck the downloaded copy.",
    "stepsHeading": "Inspect, clean, verify and download",
    "steps": [
      {
        "title": "Decide what the recipient needs",
        "body": "Keep your original. Use Metadata Checker if you only want to inspect. Before cleaning, decide whether private capture details or Content Credentials should stay in the delivery copy."
      },
      {
        "title": "Choose the supported file",
        "body": "Open the general cleaner and set Keep capture details or Keep Content Credentials if needed; both are off by default. Choose a JPEG or PNG. The tool automatically scans, cleans and verifies a separate copy."
      },
      {
        "title": "Read the result before downloading",
        "body": "Cleaning complete refers to supported checks. A partial result contains unresolved fields. No supported data needed cleaning means the tool found nothing it could remove under that setting, not that the file is metadata-free."
      },
      {
        "title": "Save and inspect the new copy",
        "body": "Download the reviewed copy, then reopen it in Metadata Checker if the handoff is important. Preserve the original as your master. A browser download action does not confirm the recipient received the file."
      }
    ],
    "table": {
      "headers": [
        "Result",
        "What it means",
        "Next action"
      ],
      "rows": [
        [
          "Cleaning complete",
          "Selected supported fields were removed and supported output checks passed.",
          "Review the report and download."
        ],
        [
          "Partially cleaned — review remaining data",
          "Some selected or unreadable information remains unresolved.",
          "Inspect remaining findings before sharing."
        ],
        [
          "No supported data needed cleaning",
          "No supported fields needed removal for the selected settings.",
          "Do not interpret this as an all-metadata or authorship certificate."
        ]
      ]
    },
    "sections": [
      {
        "heading": "What keeping image quality means here",
        "paragraphs": [
          "The cleaner does not decode and re-encode the image to remove metadata. It rewrites supported structures and checks the protected encoded image data and dimensions. Relevant orientation and color information are preserved; PNG transparency is checked.",
          "The experiments below also compare pixels decoded in Chromium before and after. They cover the named small synthetic files only, not every application or image. A smaller file is not required: a JPEG can keep the same byte count after private fields are cleared."
        ]
      },
      {
        "heading": "Keep useful information deliberately",
        "paragraphs": [
          "Prompts and node graphs may reveal how an image was made. GPS and device details may reveal private information. Copyright and creator details can provide attribution; orientation and color profiles affect how an image displays.",
          "The general cleaner removes supported private fields and supported embedded PNG credentials by default. The focused ComfyUI and GPS tools target narrower tasks. Review the selected tool and settings instead of assuming every task removes the same fields."
        ]
      },
      {
        "heading": "What does not change when metadata is removed",
        "paragraphs": [
          "The visible content, invisible watermarks, platform-side histories and published posts are outside this cleaning operation. A supported clean result does not prove human authorship or guarantee that an AI label will disappear.",
          "WebP is available for inspection only. JPEG Content Credentials, mixed XMP, animated ComfyUI comf chunks and text that cannot be safely inspected can remain. Consult Supported Formats for these boundaries."
        ]
      },
      {
        "heading": "No image upload is not the same as no website requests",
        "paragraphs": [
          "Image bytes and raw metadata stay in the local tool. The website still makes requests to serve pages and handle account or usage operations. It also uses GA4 and Clarity for website analytics, as described in the privacy policy.",
          "The approved analytics events distinguish samples, processing outcomes and download actions without including file names, prompts, GPS values or image bytes."
        ]
      },
      {
        "heading": "Single images and client batches",
        "paragraphs": [
          "Guests can clean 1 image per day; Google sign-in gives Free users 5 single-image cleans per day in total. Pro provides up to 10 images per batch and ZIP export. Yearly can process up to 30 images across three batches when device capacity permits. Daily allowances reset at 00:00 UTC.",
          "For a batch delivery, check every image and the accompanying results summary. Partial copies may be included; failed files are excluded. Follow the batch guide before sending an archive to a client."
        ]
      }
    ],
    "limits": [
      "Verification covers supported fields and file properties, not all possible metadata.",
      "No detector, watermark or platform-label outcome is promised.",
      "The downloadable examples are synthetic and do not replace testing your own exports."
    ],
    "tools": [
      {
        "label": "Clean an image locally",
        "href": "/"
      },
      {
        "label": "Inspect the downloaded copy",
        "href": "/metadata-checker"
      },
      {
        "label": "Open the batch tool",
        "href": "/batch-metadata-remover"
      }
    ],
    "source": {
      "label": "AI Metadata Remover: supported formats and cleaning boundaries",
      "href": "https://aimetadataremover.pro/supported-formats"
    },
    "faq": {
      "question": "Why are the whole-file hashes different if quality is unchanged?",
      "answer": "Metadata is part of the file. Removing or rewriting it changes the whole-file hash. Compare the encoded image payload and relevant display properties instead; the test report also includes decoded pixel hashes."
    },
    "extraFaqs": [
      {
        "question": "Does a successful download mean all metadata was removed?",
        "answer": "No. Check the verification and unresolved findings. Downloading a copy is a separate step from verifying its supported fields."
      }
    ],
    "evidenceIds": [
      "transparent-png",
      "gps-jpeg",
      "review-needed-png"
    ],
    "relatedGuides": [
      {
        "label": "ComfyUI workflow privacy",
        "href": "/blog/stable-diffusion-comfyui-metadata"
      },
      {
        "label": "Check ChatGPT image exports",
        "href": "/blog/chatgpt-dalle-image-metadata"
      },
      {
        "label": "Prepare a batch delivery",
        "href": "/blog/batch-remove-image-metadata-client-delivery"
      }
    ]
  },
];

export function guideBySlug(slug: string) { return guides.find((guide) => guide.slug === slug); }
