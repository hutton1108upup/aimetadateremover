import { CheckCircle2 } from "lucide-react";
import type { VerificationResult } from "@/lib/image-metadata-core/types";

export function VerificationCard({ verification }: { verification: VerificationResult }) {
  const groups = [
    { label: "Removed", items: verification.items.filter(item => item.after === "removed") },
    { label: "Preserved", items: verification.items.filter(item => item.after === "preserved") },
    { label: "Unresolved", items: verification.items.filter(item => !["removed", "preserved"].includes(item.after)) },
  ];
  const preservedImage = [
    verification.encodedPayloadPreserved === true && "Encoded image data",
    verification.dimensionsChanged === false && "dimensions",
    verification.transparencyPreserved === true && "transparency",
    verification.iccPreserved === true && "color profile",
    verification.orientationPreserved === true && "orientation",
  ].filter(Boolean).join(", ");
  const byteChange = verification.inputBytes !== undefined && verification.outputBytes !== undefined ? `${verification.inputBytes.toLocaleString()} → ${verification.outputBytes.toLocaleString()} bytes (${verification.outputBytes - verification.inputBytes >= 0 ? "+" : ""}${verification.outputBytes - verification.inputBytes})` : undefined;
  return <section className="verification-card" aria-label="Verification after cleaning">
    <h3><CheckCircle2 aria-hidden="true" /> Checked again after processing</h3>
    <dl className="result-summary">
      {groups.map(group => <div key={group.label}><dt>{group.label}</dt><dd>{group.items.length ? [...new Set(group.items.map(item => item.label))].join(", ") : group.label === "Removed" ? "None — no supported fields were removed" : group.label === "Preserved" ? "No metadata fields retained by the selected policy" : "No unresolved findings in this scan"}</dd></div>)}
      {preservedImage && <div><dt>Verified</dt><dd>{preservedImage} unchanged. The copy opens successfully.</dd></div>}
      {byteChange && <div><dt>File size</dt><dd>{byteChange}. Size can change when metadata chunks are removed; this is not a pixel-quality score.</dd></div>}
    </dl>
    {groups[2].items.length > 0 && <p className="verification-warning">Some data remains or could not be verified. Open the details below to review it.</p>}
    {!verification.items.length && <p>No supported metadata was detected. This does not prove that all metadata is absent.</p>}
  </section>;
}
