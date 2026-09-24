export const supportEmail = "support@aimetadataremover.pro";

export function supportMailto(subject?: string): string {
  return `mailto:${supportEmail}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}
