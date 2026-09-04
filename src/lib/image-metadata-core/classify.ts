import type { Finding, MetadataCategory } from "./types";

const AI_KEYS = /^(parameters|prompt|negative prompt|workflow|model|seed|sampler|steps|cfg|lora)$/i;
const LOCATION_KEYS = /^(gps|location|latitude|longitude|city|country)$/i;
const CREATOR_KEYS = /^(author|artist|creator|copyright|credit)$/i;

export function classifyTextEntry(key: string, value: string): Finding {
  const normalized = key.trim();
  if (AI_KEYS.test(normalized) || /comfyui|stable diffusion|negative prompt|workflow/i.test(value)) {
    return finding(`ai:${normalized}`, "AI generation parameters", "ai_workflow", "action", normalized, value,
      "This can reveal prompts, model settings, seeds, or an internal workflow.", "Remove for a clean delivery copy.", "The generation settings will no longer travel with this copy.");
  }
  if (LOCATION_KEYS.test(normalized)) {
    return finding(`location:${normalized}`, "Location data", "location", "action", normalized, value,
      "Precise location can identify where an image was created.", "Remove for a privacy-focused copy.", "Location context will be removed from this copy.");
  }
  if (/^software$/i.test(normalized)) {
    return finding(`software:${normalized}`, "Editing software", "software", "review", normalized, value,
      "Software history can describe editing tools, but it does not prove AI generation.", "Review before removing.", "The editing-software record will be removed.");
  }
  if (CREATOR_KEYS.test(normalized)) {
    return finding(`creator:${normalized}`, "Creator or copyright", "creator", "review", normalized, value,
      "Attribution may be useful for licensing and delivery.", "Preserve unless you intentionally need a private copy.", "Attribution will no longer be embedded in this copy.");
  }
  return finding(`text:${normalized}`, normalized || "Text metadata", "structure", "review", normalized, value,
    "This text field is embedded in the image container.", "Review before removing.", "The embedded text value will be removed.");
}

export function finding(
  id: string,
  label: string,
  category: MetadataCategory,
  status: Finding["status"],
  rawKey: string,
  rawValue: string,
  description: string,
  suggestedAction: string,
  removalImpact: string,
): Finding {
  return { id, label, category, status, rawKey, rawValue: rawValue.slice(0, 4096), description, suggestedAction, removalImpact };
}
