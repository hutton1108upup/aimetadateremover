import type { Finding } from "@/lib/image-metadata-core/types";
import { TagPill } from "./tag-pill";

export function FindingRow({ finding, expanded, onToggle }: { finding: Finding; expanded: boolean; onToggle: () => void }) {
  const sensitive = finding.category === "location" || finding.category === "ai_workflow";
  return (
    <article className="finding-row">
      <button className="finding-summary" onClick={onToggle} aria-expanded={expanded}>
        <span><strong>{finding.label}</strong><small>{finding.description}</small></span>
        <TagPill status={finding.status} />
      </button>
      {expanded && (
        <div className="finding-detail">
          <p><b>What to do</b>{finding.suggestedAction}</p>
          <p><b>If you remove it</b>{finding.removalImpact}</p>
          {finding.rawKey && <p><b>Raw field</b><code>{finding.rawKey}: {sensitive ? "Hidden until you choose to reveal it" : finding.rawValue}</code></p>}
        </div>
      )}
    </article>
  );
}
