export interface GuideSection { heading: string; paragraphs: string[] }
export interface GuideRecord {
  slug: string; title: string; description: string; h1: string; kicker: string; updated: string; updatedIso: string;
  answer: string; sections: GuideSection[]; limits: string[]; tools: Array<{ label: string; href: string }>;
  source: { label: string; href: string }; faq: { question: string; answer: string };
  table?: { headers: string[]; rows: string[][] };
  steps?: Array<{ title: string; body: string }>;
}

export const guides: GuideRecord[] = [
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
    slug: "stable-diffusion-comfyui-metadata", kicker: "Workflow metadata", updated: "September 20, 2026", updatedIso: "2026-09-20",
    title: "Stable Diffusion and ComfyUI Metadata: Prompts, Seeds and Node Graphs",
    description: "Learn where Stable Diffusion and ComfyUI workflow details can appear and what ImageFinisher can safely remove.",
    h1: "What Stable Diffusion and ComfyUI metadata should you remove?",
    answer: "Prompts, seeds, samplers, model settings and node graphs can be stored in image metadata, especially PNG text fields. They may reveal a private workflow, but their absence does not make an image undetectable.",
    sections: [
      { heading: "Inspect before choosing a delivery copy", paragraphs: ["The checker classifies recognized generation fields as an action suggestion and keeps sensitive values hidden until you choose to reveal them.", "AI Workflow Clean removes supported fields from JPEG and PNG copies without decoding or re-encoding the image payload. Mixed XMP and unsupported compressed text may remain."] },
      { heading: "Keep useful attribution when needed", paragraphs: ["Copyright, creator, orientation and color fields can serve a legitimate publishing purpose. Review the removal impact for each finding instead of deleting every field by default.", "After cleaning, read the verification card and re-check the downloaded copy if the image is important."] },
    ],
    limits: ["Only recognized fields are removed.", "Unsupported or mixed metadata is reported for review.", "No detector or platform result is guaranteed."],
    tools: [{ label: "Try the local cleaner", href: "/" }, { label: "Read PNG limits", href: "/remove-metadata-from-png" }],
    source: { label: "ComfyUI source: PNG prompt metadata", href: "https://github.com/Comfy-Org/ComfyUI/blob/master/comfy_api/latest/_ui.py" },
    faq: { question: "Will removing a prompt remove the pixels it created?", answer: "No. Cleaning changes supported file metadata and leaves encoded image data untouched." },
  },
  {
    slug: "c2pa-content-credentials-explained", kicker: "Provenance", updated: "September 20, 2026", updatedIso: "2026-09-20",
    title: "C2PA Content Credentials Explained: Presence, Integrity and Trust",
    description: "Understand the difference between finding Content Credentials, validating a manifest and trusting its issuer.",
    h1: "C2PA Content Credentials: what does a valid signature mean?",
    answer: "C2PA is a provenance standard. A valid integrity result means the signed claims and asset binding pass the verifier; it does not automatically mean the issuer is trusted, the image is authentic in every sense, or that it was made by AI.",
    sections: [
      { heading: "Three questions to keep separate", paragraphs: ["First ask whether a C2PA manifest is present. Then ask whether its cryptographic integrity validates. Finally ask whether the issuer is trusted in your context. The checker reports these as separate states.", "Without configured trust anchors, ImageFinisher must not display a generic “trusted” label. An unknown issuer can still have a mathematically valid signature."] },
      { heading: "What a failed validation tells you", paragraphs: ["A tampered asset or invalid claim should be treated as unresolved provenance evidence. It is not proof that the image is fake or AI-generated.", "If the browser verifier cannot safely parse a format, the interface falls back to the existing embedded/unverified finding instead of blocking ordinary metadata scanning."] },
    ],
    limits: ["Issuer trust is not inferred from a valid signature.", "External provenance histories are not fetched or guaranteed.", "The feature does not detect SynthID or pixel watermarks."],
    tools: [{ label: "Check Content Credentials locally", href: "/metadata-checker" }, { label: "Review provenance before cleaning", href: "/" }],
    source: { label: "C2PA Explainer", href: "https://spec.c2pa.org/specifications/2.2/explainer/Explainer.html" },
    faq: { question: "Does removing an embedded credential erase external provenance?", answer: "No. It only changes the new local copy; external records and platform-side histories are outside this tool." },
  },
  {
    slug: "exif-gps-privacy-before-sharing", kicker: "Privacy checklist", updated: "September 20, 2026", updatedIso: "2026-09-20",
    title: "EXIF and GPS Privacy: Check an Image Before Sharing",
    description: "A plain-language checklist for location, device, capture date and creator metadata before sending an image.",
    h1: "How do you check EXIF and GPS privacy before sharing?",
    answer: "Scan the file first, identify location and device fields, then create a separate delivery copy if those details are not needed. Keep the original because metadata can support later editing, attribution or evidence.",
    sections: [
      { heading: "Look for location and device identifiers", paragraphs: ["GPS coordinates can reveal where a photo was taken. Serial numbers, MakerNotes and capture dates can reveal equipment or timing. Treat each finding as context, not as a reason to erase every field.", "The current automatic cleaner removes supported privacy fields from JPEG and PNG. It preserves copyright and orientation, and reports unsupported structures instead of guessing."] },
      { heading: "Verify the copy before sending it", paragraphs: ["The result records the original and output scan, including dimensions, transparency, color profile, orientation and encoded payload. Remaining findings stay visible for review.", "WebP is scan-only, so use a specialist workflow if privacy cleaning is required for that format."] },
    ],
    limits: ["Not every nested or compressed field is supported.", "A clean metadata report is not a legal privacy guarantee.", "Pixels and visible backgrounds can still reveal location."],
    tools: [{ label: "Inspect an image", href: "/metadata-checker" }, { label: "Open the workspace", href: "/workspace" }],
    source: { label: "ExifTool tag reference", href: "https://exiftool.org/TagNames/EXIF.html" },
    faq: { question: "Should I delete copyright metadata too?", answer: "Usually review and keep it when it supports attribution or licensing. The tool does not remove it by default." },
  },
  {
    slug: "jpeg-png-webp-metadata-support", kicker: "Format guide", updated: "September 20, 2026", updatedIso: "2026-09-20",
    title: "JPEG, PNG and WebP Metadata Support: What Changes by Format",
    description: "Understand what ImageFinisher can inspect, clean and verify in JPEG, PNG and WebP files.",
    h1: "Which JPEG, PNG and WebP metadata can you clean?",
    answer: "JPEG and PNG support the current local cleaning workflow for recognized AI and privacy fields. WebP can be inspected, but it remains scan-only until its rewrite compatibility gate passes.",
    sections: [
      { heading: "JPEG", paragraphs: ["JPEG scans EXIF, XMP, ICC, confirmed C2PA markers and unsupported IPTC blocks. Mixed workflow XMP is retained and marked for review when removing it could also remove attribution."] },
      { heading: "PNG", paragraphs: ["PNG scans text chunks, EXIF, ICC, transparency, animation and caBX Content Credentials. Supported chunks are rebuilt with checksums, while compressed text that cannot be safely expanded remains unresolved."] },
      { heading: "WebP", paragraphs: ["WebP scanning reports EXIF, XMP and C2PA chunks plus dimensions, animation and transparency. Cleaning is intentionally disabled; do not treat an inspection result as a cleaned file."] },
    ],
    limits: ["Supported does not mean every field in every file.", "No format is promised to be metadata-free.", "The original file is never overwritten."],
    tools: [{ label: "Run a format-aware check", href: "/metadata-checker" }, { label: "Read PNG cleaner details", href: "/remove-metadata-from-png" }],
    source: { label: "PNG specification", href: "https://www.w3.org/TR/PNG/" },
    faq: { question: "Does PNG cleaning re-encode the image?", answer: "No. It rewrites supported metadata chunks and verifies that the encoded image payload remains unchanged." },
  },
  {
    slug: "image-metadata-before-publishing", kicker: "Metadata basics", updated: "September 18, 2026", updatedIso: "2026-09-18",
    title: "What Image Metadata Should You Review Before Publishing?",
    description: "Learn which image metadata fields affect privacy, workflow confidentiality, attribution, color and provenance before you publish.",
    h1: "What Image Metadata Should You Review Before Publishing?",
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
