import type { Finding } from "@/lib/image-metadata-core/types";
import { TagPill } from "./tag-pill";

export type NextActionGroup = "clean" | "keep" | "review" | "unsupported";
export function nextActionGroup(finding: Finding): NextActionGroup {
  if (finding.id.startsWith("unsupported-")) return "unsupported";
  if (finding.status === "action" || finding.category === "ai_workflow" || finding.category === "location") return "clean";
  if (finding.status === "review" || finding.category === "provenance" || finding.category === "software") return "review";
  return "keep";
}
export function FindingNextActions({ findings }: { findings: Finding[] }) {
  const groups: Array<{ key: NextActionGroup; label: string; body: string }> = [
    { key: "clean", label: "Can be handled in a clean copy", body: "Supported workflow or privacy fields can be removed after you review the impact." },
    { key: "keep", label: "Usually preserve", body: "These fields help with display, attribution or technical consistency." },
    { key: "review", label: "Review manually", body: "Read the context before deciding; provenance and mixed metadata are not verdicts." },
    { key: "unsupported", label: "Currently unsupported", body: "The scanner found a bounded or unsupported structure and will leave it untouched." },
  ];
  return <section className="next-actions" aria-label="Suggested next steps"><h3>Suggested next steps</h3>{findings.length ? groups.map((group) => { const items = findings.filter((finding) => nextActionGroup(finding) === group.key); return items.length ? <div key={group.key}><strong>{group.label}</strong><p>{group.body}</p><small>Found fields: {[...new Set(items.map((item) => item.label))].join(", ")}</small></div> : null; }) : <div><strong>No supported fields found</strong><p>Keep the original and remember that this is not proof that every possible metadata field is absent.</p></div>}</section>;
}

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
