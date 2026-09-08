import { CheckCircle2 } from "lucide-react";
import type { VerificationResult } from "@/lib/image-metadata-core/types";

export function VerificationCard({ verification }: { verification: VerificationResult }) {
  const groups = [
    {label:"Removed",items:verification.items.filter(i=>i.after === "removed")},
    {label:"Preserved",items:verification.items.filter(i=>i.after === "preserved")},
    {label:"Unresolved",items:verification.items.filter(i=>!["removed","preserved"].includes(i.after))},
  ];
  return (
    <section className="verification-card" aria-label="Verification after cleaning">
      <h3><CheckCircle2 aria-hidden="true" /> Checked again after cleaning</h3>
      <div className="verification-summary">{groups.map(group=><div key={group.label}><b>{group.items.length}</b><span>{group.label}</span></div>)}</div>
      {groups[2].items.length > 0 && <p className="verification-warning">Some metadata still needs review. This copy is not metadata-free.</p>}
      {groups.map(group=>group.items.length>0 && <div key={group.label} className="verification-group" aria-label={group.label}>{group.items.map((item,index)=><div className="verification-row" key={`${item.label}-${index}`}><span>{item.label}</span><strong>{item.after.replaceAll("_"," ")}</strong></div>)}</div>)}
      {!verification.items.length && <p>No supported metadata was found. Other metadata may still exist.</p>}
      <div className="verification-facts">
        <span>Encoded image data: <b>{verification.encodedPayloadPreserved === true ? "Identical" : "Not verified"}</b></span>
        {verification.orientationPreserved !== undefined && <span>Orientation kept: <b>{verification.orientationPreserved ? "Yes" : "No"}</b></span>}
        {verification.dimensionsChanged !== undefined && <span>Image size changed: <b>{verification.dimensionsChanged ? "Yes" : "No"}</b></span>}
        {verification.iccPreserved !== undefined && <span>ICC profile kept: <b>{verification.iccPreserved ? "Yes" : "No"}</b></span>}
        {verification.transparencyPreserved !== undefined && <span>Transparency kept: <b>{verification.transparencyPreserved ? "Yes" : "No"}</b></span>}
      </div>
    </section>
  );
}
