import report from "@/lib/metadata-evidence.json";
import { EvidenceTable } from "./evidence-table";

export function MetadataEvidence({ ids }: { ids: string[] }) {
  const samples = report.samples.filter(sample => ids.includes(sample.id));
  return <section className="metadata-evidence" aria-label="Reproducible metadata examples">
    <h2>Download the files and check the results</h2>
    <p>Tested {report.testedAt}. These are small synthetic fixtures created for this test, not actual ComfyUI, ChatGPT or camera exports. They demonstrate specific file structures, not compatibility with every export.</p>
    {samples.map(sample => <section key={sample.id}>
      <h3>{sample.title}</h3>
      <p>{sample.width} × {sample.height} pixels · {sample.inputBytes.toLocaleString("en-US")} bytes before → {sample.outputBytes.toLocaleString("en-US")} after. {sample.needsReview ? "Partial result: unresolved text remains. Do not treat this copy as fully cleaned." : "The selected supported fields were removed in this test."}</p>
      <EvidenceTable caption="Actual field results for this synthetic file" headers={["Field", "Before", "After"]} rows={sample.fields.map(field => [field.key, field.before === "found" ? "Found" : "Not found", field.after === "unsupported" ? "Remains — needs review" : field.after])} />
      <p>Encoded image data: unchanged. Decoded pixels: identical in Chromium. {sample.transparencyPreserved ? "PNG transparency: preserved." : ""} {sample.orientationPreserved ? "EXIF orientation: preserved." : ""}</p>
      <p className="evidence-links"><a className="text-link" href={sample.original} download>Download original test file</a><a className="text-link" href={sample.cleaned} download>Download processed test copy</a></p>
    </section>)}
    <p>We compared SHA-256 hashes of the encoded image data and Chromium-decoded pixels, not the whole file. Metadata edits can change the file without changing its image. The JSON report lists the cleaning settings, retained fields and before/after hashes. Downloaded test files use the normal file allowance if you process them yourself; the tool’s built-in samples remain free.</p>
    <p><a className="text-link" href="/samples/metadata-evidence/report.json" download>Download the full test report</a></p>
  </section>;
}
