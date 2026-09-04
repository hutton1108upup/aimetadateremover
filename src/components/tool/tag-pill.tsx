import type { FindingStatus } from "@/lib/image-metadata-core/types";

const labels: Record<FindingStatus, string> = { action: "Action suggested", review: "Review first", informational: "Informational" };

export function TagPill({ status }: { status: FindingStatus }) {
  return <span className={`tag-pill tag-${status}`}>{labels[status]}</span>;
}
