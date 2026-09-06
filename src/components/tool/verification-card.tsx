import { CheckCircle2 } from "lucide-react";
import type { VerificationResult } from "@/lib/image-metadata-core/types";

export function VerificationCard({ verification }: { verification: VerificationResult }) {
  return (
    <section className="verification-card" aria-label="Verification after cleaning">
      <h3><CheckCircle2 aria-hidden="true" /> Checked again after cleaning</h3>
      {verification.items.map((item, index) => (
        <div className="verification-row" key={`${item.label}-${index}`}><span>{item.label}</span><strong>{item.after.replace("_", " ")}</strong></div>
      ))}
      <div className="verification-facts">
        <span>Image data re-encoded: <b>No</b></span>
        {verification.dimensionsChanged !== undefined && <span>Image size changed: <b>{verification.dimensionsChanged ? "Yes" : "No"}</b></span>}
        {verification.iccPreserved !== undefined && <span>ICC profile kept: <b>{verification.iccPreserved ? "Yes" : "No"}</b></span>}
        {verification.transparencyPreserved !== undefined && <span>Transparency kept: <b>{verification.transparencyPreserved ? "Yes" : "No"}</b></span>}
      </div>
    </section>
  );
}
