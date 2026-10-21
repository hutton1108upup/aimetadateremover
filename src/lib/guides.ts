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
}

export const guides: GuideRecord[] = [
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
    slug: "chatgpt-dalle-image-metadata", kicker: "AI image metadata", updated: "September 20, 2026", updatedIso: "2026-09-20",
    title: "ChatGPT and DALL·E Image Metadata: What to Check Before Sharing",
    description: "A practical guide to checking provenance, workflow fields and privacy metadata in images made with ChatGPT or DALL·E.",
    h1: "What metadata can ChatGPT and DALL·E images carry?",
    answer: "An image may carry provenance records, editing history, prompts, camera fields or other file metadata. Those fields describe what is embedded in the file; they do not by themselves prove who made an image or how a platform will classify it.",
    sections: [
      { heading: "Start with the file, not the filename", paragraphs: ["Use the Metadata Checker to read the actual JPEG, PNG or WebP structure. A file extension and a software name are clues, not an AI score.", "If you plan to send a delivery copy, keep the original and decide whether prompts, workflow details, location and device fields belong in the copy."] },
      { heading: "Read provenance separately from workflow", paragraphs: ["C2PA Content Credentials are provenance records. They can describe signing or editing history, while prompt and node-graph fields are workflow metadata. One does not substitute for the other.", "This product reports embedded records and validation states when available. It does not certify ownership, authorship, or platform treatment."] },
    ],
    limits: ["C2PA coverage varies by file and issuer.", "SynthID and pixel-level signals are outside metadata cleaning.", "WebP remains inspection-only."],
    tools: [{ label: "Open Metadata Checker", href: "/metadata-checker" }, { label: "Prepare a clean copy", href: "/" }],
    source: { label: "OpenAI: C2PA in DALL·E 3", href: "https://help.openai.com/en/articles/8912793-c2pa-in-dall-e-3" },
    faq: { question: "Does a C2PA record prove an image is AI-generated?", answer: "No. It is provenance evidence, not an AI probability or ownership verdict." },
  },
  {
    slug: "stable-diffusion-comfyui-metadata", kicker: "Workflow metadata", updated: "September 28, 2026", updatedIso: "2026-09-28",
    title: "Stable Diffusion and ComfyUI Metadata: Prompts, Seeds and Node Graphs",
    description: "Learn where Stable Diffusion and ComfyUI prompts, seeds, samplers and node graphs can appear in image files.",
    h1: "What metadata do Stable Diffusion and ComfyUI images contain?",
    answer: "Prompts, seeds, samplers, model settings and node graphs can be stored in image metadata, especially PNG text fields. They may reveal a private workflow, but their absence does not make an image undetectable.",
    sections: [
      { heading: "Inspect before choosing a delivery copy", paragraphs: ["The checker classifies recognized generation fields as an action suggestion and keeps sensitive values hidden until you choose to reveal them.", "AI Workflow Clean removes supported fields from JPEG and PNG copies without decoding or re-encoding the image payload. Mixed XMP and unreadable compressed text may remain."] },
      { heading: "Keep useful attribution when needed", paragraphs: ["Copyright, creator, orientation and color fields can serve a legitimate publishing purpose. Review the removal impact for each finding instead of deleting every field by default.", "After cleaning, read the verification card and re-check the downloaded copy if the image is important."] },
      { heading: "Try the two workflow tasks separately", paragraphs: ["For a static ComfyUI PNG, the dedicated tool shows workflow and prompt/execute fields as separate results. In ComfyUI exports, a prompt field can contain a serialized execution graph, not just a text prompt.", "For Stable Diffusion PNGs, generation parameters such as a seed or sampler are presented as a separate task. Both pages verify the output copy. Compressed text is expanded only within a 1 MB limit; animated ComfyUI comf chunks remain for review."] },
    ],
    limits: ["Only recognized fields are removed.", "Unsupported or mixed metadata is reported for review.", "No detector or platform result is guaranteed."],
    tools: [{ label: "Remove a ComfyUI workflow", href: "/comfyui-workflow-remover" }, { label: "Remove Stable Diffusion parameters", href: "/stable-diffusion-metadata-remover" }, { label: "Read PNG limits", href: "/remove-metadata-from-png" }],
    source: { label: "ComfyUI source: PNG prompt metadata", href: "https://github.com/Comfy-Org/ComfyUI/blob/master/comfy_api/latest/_ui.py" },
    faq: { question: "Will removing a prompt remove the pixels it created?", answer: "No. Cleaning changes supported file metadata and leaves encoded image data untouched." },
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
    slug: "image-metadata-before-publishing", kicker: "Metadata basics", updated: "September 28, 2026", updatedIso: "2026-09-28",
    title: "What Image Metadata Should You Review Before Publishing?",
    description: "Learn which image metadata fields affect privacy, workflow confidentiality, attribution, color and provenance before you publish.",
    h1: "Image Metadata Before Publishing: A Practical Review Checklist",
    answer: "An image file can carry much more than the pixels you see. Prompts, node graphs, locations, creator details, color profiles and provenance records may all be tucked inside, and deleting everything by default is rarely the best move.",
    sections: [
      { heading: "Start with what this copy is for", paragraphs: ["A private client preview does not need the same metadata as a portfolio image or an archive. Keep the master file, decide what the copy needs, and remove only the details you do not want to send with it.", "Prompt and workflow fields may reveal how an image was made. GPS and device IDs can reveal a location or identify equipment. Creator and copyright details help with credit and licensing. An ICC profile keeps colors looking consistent. C2PA records provenance and edit history. Review each group before deciding."] },
      { heading: "Use the automatic cleaner step by step", paragraphs: ["Open the image workspace. If you want to keep private capture details or embedded credentials, use Cleaning settings at the top of the tool. Select Keep capture details or Keep Content Credentials as needed; these options are off by default.", "Choose JPEG or PNG files. The cleaner checks, cleans and verifies a separate copy automatically; you do not need to move through tabs. Your original is never overwritten. If you only want to inspect a file, open the Metadata Checker instead.", "Read whether the result says Cleaning complete, Partially cleaned — review remaining data, or No supported data needed cleaning. A partial result may still contain private information. Expand the processing details and download a verification report only when you have reviewed it.", "For a batch, completed images include partial results while failed or inspection-only files are left out. Review each result instead of assuming every selected image is in the ZIP. Changing the keep options rebuilds existing copies from the original."] },
      { heading: "Provenance is not a probability", paragraphs: ["C2PA can describe how a file was signed or edited. A software field might simply name an everyday editing app. Neither belongs in a percentage score or proves that an image was generated by AI.", "The official C2PA explainer describes Content Credentials as provenance records. This metadata checker identifies supported embedded records and validates supported signatures locally; it does not retrieve an external edit history or certify ownership."] },
      { heading: "Check the new copy, not just the button", paragraphs: ["Automatic verification covers supported fields only. For an additional check, open the downloaded copy in the Metadata Checker and review what remains. Neither a successful download nor a clean result proves that every possible metadata field has been removed."] },
    ],
    limits: ["Automatic verification covers supported fields only.", "XMP, IPTC and compressed text can still contain unresolved information.", "WebP is inspection-only."],
    tools: [{ label: "Open the AI Metadata Cleaner", href: "/" }, { label: "Inspect an image locally", href: "/metadata-checker" }, { label: "Open the full workspace", href: "/workspace" }],
    source: { label: "C2PA Explainer", href: "https://spec.c2pa.org/specifications/2.2/explainer/Explainer.html" },
    faq: { question: "Does a successful download prove every field was removed?", answer: "No. Reopen the downloaded copy in the Metadata Checker and review any unresolved findings." },
    table: { headers: ["Field group", "Why it matters", "Safe default"], rows: [["Prompt & workflow", "May reveal how the image was made", "Remove from delivery copies"], ["GPS & device IDs", "Can reveal a location or identify equipment", "Remove for privacy"], ["Creator & copyright", "Helps with credit and licensing", "Review and usually keep"], ["ICC profile", "Keeps colors looking consistent", "Keep"], ["C2PA", "Records where a file came from and how it changed", "Review before deciding"]] },
    steps: [{ title: "Decide what to keep before choosing files", body: "Open the image workspace and choose Cleaning settings. Keep capture details or Content Credentials only when the delivery copy needs them." }, { title: "Choose images and wait for the result", body: "Select JPEG or PNG files. The cleaner checks, cleans and verifies a separate copy automatically; the original is never overwritten." }, { title: "Read the result before downloading", body: "Check whether the result is complete, partial or unchanged. Expand processing details and review unresolved findings." }, { title: "Save the copy you have reviewed", body: "Download a clean copy or a completed ZIP after reviewing each result. If settings change, copies are rebuilt from the original." }],
  },
];

export function guideBySlug(slug: string) { return guides.find((guide) => guide.slug === slug); }
