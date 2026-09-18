export const supportEmail = "support@aimetadateremover.pro";

export function supportMailto(subject?: string): string {
  return `mailto:${supportEmail}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
}
