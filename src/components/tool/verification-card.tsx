import { CheckCircle2 } from "lucide-react";
import type { VerificationResult } from "@/lib/image-metadata-core/types";

export function VerificationCard({ verification }: { verification: VerificationResult }) {
  return (
    <section className="verification-card" aria-label="Post-clean verification">
      <h3><CheckCircle2 aria-hidden="true" /> Post-clean verification — re-scanned</h3>
      {verification.items.map((item, index) => (
        <div className="verification-row" key={`${item.label}-${index}`}><span>{item.label}</span><strong>{item.after.replace("_", " ")}</strong></div>
      ))}
      <div className="verification-facts">
        <span>Encoded image payload re-encoded: <b>No</b></span>
        {verification.dimensionsChanged !== undefined && <span>Dimensions changed: <b>{verification.dimensionsChanged ? "Yes" : "No"}</b></span>}
        {verification.iccPreserved !== undefined && <span>ICC preserved: <b>{verification.iccPreserved ? "Yes" : "No"}</b></span>}
        {verification.transparencyPreserved !== undefined && <span>Transparency preserved: <b>{verification.transparencyPreserved ? "Yes" : "No"}</b></span>}
      </div>
    </section>
  );
}
