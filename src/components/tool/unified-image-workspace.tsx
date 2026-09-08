"use client";
/* eslint-disable @next/next/no-img-element -- local blob previews cannot use the Next image optimizer */

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Download, FileImage, FolderOpen, LockKeyhole, Plus, ScanSearch, ShieldCheck, Sparkles, Trash2, UploadCloud, ZoomIn, ZoomOut } from "lucide-react";
import type { CleanMode } from "@/lib/image-metadata-core/types";
import { downloadLocal as download, useLocalWorkspace, type LocalImage, unresolvedCount } from "./use-local-workspace";
import { FindingRow } from "./finding-row";
import { VerificationCard } from "./verification-card";
import { FunnelReview } from "./funnel-review";

type ToolTab = "inspect" | "clean" | "humanize" | "export";
const toolTabs: ToolTab[] = ["inspect", "clean", "humanize", "export"];
const safeSampleBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAApdEVYdHBhcmFtZXRlcnMAc3RlcHM9MzAgc2VlZD00MiBzYW1wbGVyPWV1bGVyj/t2VgAAAABJRU5ErkJggg==";

function createSafeSampleFile() {
  const binary = atob(safeSampleBase64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new File([bytes], "imagefinisher-safe-sample.png", { type: "image/png" });
}
export function UnifiedImageWorkspace({ variant = "embedded", defaultMode = "clean", acceptedFormats }: { variant?: "embedded" | "full"; defaultMode?: "inspect" | "clean"; acceptedFormats?: Array<"jpeg" | "png" | "webp"> }) {
  const { files, filesRef, busy, notice, addFiles: queueFiles, cleanFiles, removeFile, clearFiles, downloadOne, downloadZip } = useLocalWorkspace(acceptedFormats);
  const [activeId, setActiveId] = useState<string>();
  const [tab, setTab] = useState<ToolTab>(defaultMode);
  const [cleanMode, setCleanMode] = useState<CleanMode>("ai_workflow");
  const [removeC2pa, setRemoveC2pa] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [expanded, setExpanded] = useState<string>();
  const [previewView, setPreviewView] = useState<"original" | "cleaned">("original");
  const [zoom, setZoom] = useState(100);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<LocalImage | undefined>(undefined);
  const active = files.find((item) => item.id === activeId) ?? files[0];
  const showingCleaned = previewView === "cleaned" && Boolean(active?.cleanPreview);
  const previewSrc = active ? (showingCleaned ? active.cleanPreview : active.preview) : undefined;
  const isSafeSample = active?.source === "sample";

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const registrations = [
      context.registerTool({
        name: "select_metadata_step",
        title: "Select metadata step",
        description: "Show one existing local workspace step: inspect, clean, humanize information, or export.",
        inputSchema: { type: "object", properties: { step: { type: "string", enum: ["inspect", "clean", "humanize", "export"] } }, required: ["step"], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          const step = typeof input === "object" && input !== null && "step" in input ? (input as { step: unknown }).step : undefined;
          if (!(["inspect", "clean", "humanize", "export"] as unknown[]).includes(step)) throw new Error("step must be inspect, clean, humanize, or export");
          setTab(step as ToolTab);
          return { selectedStep: step };
        },
      }, { signal: lifecycle.signal }),
      context.registerTool({
        name: "read_local_workspace_status",
        title: "Read local workspace status",
        description: "Read non-sensitive queue and verification state without returning filenames, image data, or metadata values.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute() { return { fileCount: filesRef.current.length, activeStage: activeRef.current?.status ?? "empty", hasVerifiedCopy: Boolean(activeRef.current?.verification) }; },
      }, { signal: lifecycle.signal }),
    ];
    for (const registration of registrations) void Promise.resolve(registration).catch(() => undefined);
    return () => lifecycle.abort();
  }, [filesRef]);

  async function addFiles(list: File[], source: "file" | "sample" = "file") {
    if (!busy && !filesRef.current.length) { setTab(defaultMode); setPreviewView("original"); setZoom(100); setActiveId(undefined); }
    await queueFiles(list, source);
  }

  async function cleanSelection(all = false) {
    const ids = all ? filesRef.current.map(f => f.id) : active ? [active.id] : [];
    if (await cleanFiles(ids, { mode: cleanMode, removeC2pa, removeColorProfile: false })) {
      setPreviewView("cleaned"); setTab("export");
    }
  }

  return (
    <section className={`workspace-shell ${variant === "full" ? "workspace-full" : "workspace-embedded"}`} aria-label="Local image metadata workspace">
      <div className="local-notice"><span><ShieldCheck aria-hidden="true" /> Your files stay in this browser</span><span>Nothing gets uploaded</span></div>
      {notice && <p className="batch-notice" role="status">{notice}</p>}
      {files.length > 0 && <div className="batch-toolbar"><span>{files.length} files · {files.filter(f=>f.status === "ready").length} ready to download</span><button className="button secondary" onClick={clearFiles}>Clear queue</button></div>}
      <div className="workspace-grid">
        {variant === "full" && (
          <aside className="file-rail" aria-label="File queue">
            <div className="rail-heading"><span>File queue</span><button disabled={busy} onClick={() => inputRef.current?.click()} aria-label="Add more images">+</button></div>
            {files.map((item) => <button key={item.id} className={`file-row ${item.id === active?.id ? "active" : ""}`} onClick={() => setActiveId(item.id)}><FileImage aria-hidden="true" /><span><b>{item.file.name}</b><small>{fileStatus(item)}</small></span></button>)}
          </aside>
        )}
        <div className="tool-stage">
          {files.length > 0 && <select className="queue-file-select" value={active?.id} onChange={(event) => setActiveId(event.target.value)} aria-label="Active image">{files.map((item) => <option value={item.id} key={item.id}>{item.file.name} · {fileStatus(item)}</option>)}</select>}
          {!active ? (
            <div className="dropzone" role="button" aria-label="Open file picker" onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); inputRef.current?.click(); } }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void addFiles(Array.from(event.dataTransfer.files)); }} onPaste={(event) => void addFiles(Array.from(event.clipboardData.files))} tabIndex={0}>
              <span className="upload-icon"><UploadCloud aria-hidden="true" /></span>
              <h2>Drop, paste, or choose your images</h2>
              <p>JPG, PNG, or WebP · No account needed</p>
              <div className="drop-actions"><button className="button primary" onClick={() => inputRef.current?.click()} disabled={busy}><FolderOpen aria-hidden="true" /> Choose images</button><button className="button secondary" onClick={() => void addFiles([createSafeSampleFile()], "sample")} disabled={busy}><ScanSearch aria-hidden="true" /> Try a safe sample</button></div>
              <div className="trust-row"><span><Check aria-hidden="true" /> Free to use</span><span><LockKeyhole aria-hidden="true" /> Runs locally</span><span><Check aria-hidden="true" /> Original file preserved</span><span><Check aria-hidden="true" /> No subscription required</span></div>
            </div>
          ) : (
            <div className="active-workspace">
              <div className="preview-panel">
                <div className="preview-toolbar">
                  <span className="preview-name" title={active.file.name}>{active.file.name}</span>
                  <span className="preview-tools">
                    <span className="preview-view-toggle" aria-label="Preview version"><button className={!showingCleaned ? "selected" : ""} onClick={() => setPreviewView("original")} aria-label="Show original">Original</button><button className={showingCleaned ? "selected" : ""} onClick={() => setPreviewView("cleaned")} disabled={!active.cleanPreview} aria-label="Show cleaned">Cleaned</button></span>
                    <span className="preview-zoom-controls" aria-label="Preview zoom"><button onClick={() => setZoom((value) => Math.max(50, value - 25))} aria-label="Zoom out"><ZoomOut aria-hidden="true" /></button><b>{zoom}%</b><button onClick={() => setZoom((value) => Math.min(200, value + 25))} aria-label="Zoom in"><ZoomIn aria-hidden="true" /></button></span>
                    <span className="preview-file-controls" aria-label="File actions"><button disabled={busy} onClick={() => inputRef.current?.click()} aria-label="Add images"><Plus aria-hidden="true" /></button><button className="remove-action" onClick={() => removeFile(active.id)} aria-label={`Remove ${active.file.name}`}><Trash2 aria-hidden="true" /></button></span>
                  </span>
                </div>
                <div className={`image-stage ${isSafeSample ? "safe-sample-stage" : ""}`}>{previewSrc ? <img style={{ transform: `scale(${zoom / 100})` }} src={previewSrc} alt={`${showingCleaned ? "Cleaned" : "Original"} file preview`} /> : <FileImage aria-hidden="true" />}{isSafeSample && <span className="safe-sample-card"><ShieldCheck aria-hidden="true" /><b>Safe sample</b><small>Built-in test PNG · one sample workflow field</small></span>}</div>
                <p>{active.scan ? `${active.scan.format.toUpperCase()} · ${formatBytes(active.file.size)} · ${active.scan.findings.length} finding${active.scan.findings.length === 1 ? "" : "s"}` : active.status.replaceAll("_", " ")}</p>
              </div>
              <div className="action-panel">
                <div className="tool-tabs" role="tablist" aria-label="Workspace steps">{toolTabs.map((item) => <button id={`tab-${item}`} aria-controls={`panel-${item}`} role="tab" aria-selected={tab === item} key={item} onClick={() => setTab(item)}>{item}</button>)}</div>
                <div aria-live="polite" className="sr-status">{busy ? "Processing locally" : active.error ?? active.status.replaceAll("_", " ")}</div>
                {active.error && <div className="error-banner">{active.error}</div>}
                {tab === "inspect" && active.scan && <div className="panel-stack" role="tabpanel" id="panel-inspect" aria-labelledby="tab-inspect"><div className="result-strip"><span>{active.scan.findings.length} metadata finding{active.scan.findings.length === 1 ? "" : "s"}</span><b>{active.scan.cleanSupport === "scan_only" ? "Scan only" : "Scan complete"}</b></div><button className="advanced-toggle" onClick={() => setAdvanced((value) => !value)}> {advanced ? "Back to summary" : "Show technical details"}<ChevronDown /></button>{active.scan.findings.length ? active.scan.findings.map((finding) => <FindingRow key={finding.id + finding.rawKey} finding={finding} expanded={expanded === finding.id} onToggle={() => setExpanded(expanded === finding.id ? undefined : finding.id)} />) : <div className="empty-result"><ShieldCheck /><h3>We did not find supported metadata</h3><p>The file may still contain data this tool cannot read or signals stored in the pixels. This is not an AI detection result.</p><button className="button secondary" onClick={() => inputRef.current?.click()}>Inspect another image</button></div>}{advanced && <div className="advanced-table"><table><thead><tr><th>Field</th><th>Category</th><th>Value</th><th /></tr></thead><tbody>{active.scan.findings.map((finding)=><tr key={finding.id}><td>{finding.rawKey ?? finding.label}</td><td>{finding.category.replaceAll("_"," ")}</td><td>{finding.category === "location" || finding.category === "ai_workflow" ? "Hidden" : finding.rawValue ?? "Present"}</td><td><button onClick={() => void navigator.clipboard?.writeText(`${finding.rawKey ?? finding.label}: ${finding.rawValue ?? "present"}`)}>Copy</button></td></tr>)}</tbody></table><button className="button secondary wide" onClick={() => download(new TextEncoder().encode(JSON.stringify(active.scan, null, 2)).buffer, `${active.file.name}.metadata.json`, "application/json")}><Download/> Export scan JSON</button></div>}</div>}
                {tab === "clean" && <div className="panel-stack" role="tabpanel" id="panel-clean" aria-labelledby="tab-clean"><p className="panel-intro">Choose what to remove from the new copy. We will not touch your original.</p>{(["ai_workflow", "privacy", "full"] as CleanMode[]).map((mode) => <label className={`mode-card ${cleanMode === mode ? "selected" : ""} ${mode === "full" ? "gated" : ""}`} key={mode}><input type="radio" name="clean-mode" disabled={busy || mode === "full"} checked={cleanMode === mode} onChange={() => setCleanMode(mode)} /><span><b>{mode === "ai_workflow" ? "AI Workflow Clean" : mode === "privacy" ? "Privacy Clean" : "Full Clean · coming later"}</b><small>{mode === "ai_workflow" ? "Removes supported prompts, workflows, model settings, and seeds" : mode === "privacy" ? "Removes supported GPS, capture dates, device IDs, EXIF MakerNotes and JPEG thumbnails. Keeps copyright and orientation. Other metadata may remain." : "Not available yet. Broad removal needs more compatibility testing."}</small></span></label>)}<label className="check-row"><input type="checkbox" disabled={busy || active.scan?.format !== "png" || !active.scan.findings.some((finding) => finding.id === "c2pa")} checked={removeC2pa} onChange={(event) => setRemoveC2pa(event.target.checked)} /><span><b>Remove Content Credentials</b><small>Off by default. When found, PNG caBX records can be removed; JPEG and WebP are still scan-only.</small></span></label><button className="button primary wide" onClick={() => void cleanSelection()} disabled={busy || !active.scan || active.scan.cleanSupport === "scan_only"}>{busy ? "Processing locally…" : "Create clean copy"}</button><button className="button secondary wide" onClick={() => void cleanSelection(true)} disabled={busy || !files.some(f => f.scan && f.scan.cleanSupport !== "scan_only")}>Clean all supported files</button><p className="panel-intro">Uses the selected mode for every supported file. WebP stays scan-only. Review unresolved metadata before sharing.</p>{active.scan?.cleanSupport === "scan_only" && <p className="batch-notice">This format can be inspected, but cleaning is not available.</p>}</div>}
                {tab === "humanize" && <div className="unavailable-panel" role="tabpanel" id="panel-humanize" aria-labelledby="tab-humanize"><Sparkles /><p className="eyebrow">Coming later</p><h3>Visual repair is not ready yet</h3><p>Cleaning metadata changes information stored in the file. It does not fix visible artifacts, remove watermarks stored in the pixels, or control a third-party detector. We will add visual repair after the provider results pass our quality tests.</p></div>}
                {tab === "export" && <div className="panel-stack" role="tabpanel" id="panel-export" aria-labelledby="tab-export">{active.verification ? <VerificationCard verification={active.verification} /> : <div className="empty-result"><Download /><h3>No clean copy to download yet</h3><p>Run a supported cleaning option first. The download will appear after the tool scans the new file again.</p></div>}{active.cleaned && <><button className="button primary wide" disabled={busy} onClick={() => downloadOne(active)}><Download /> Download clean copy</button><button className="button secondary wide" onClick={() => download(new TextEncoder().encode(JSON.stringify(active.verification, null, 2)).buffer, `${active.file.name}.metadata-report.json`, "application/json")}><Download /> Export verification JSON</button>{files.filter((item) => item.cleaned).length > 1 && <button className="button secondary wide" disabled={busy} onClick={() => void downloadZip()}>Download clean ZIP</button>}</>}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
      <input ref={inputRef} className="visually-hidden" type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Choose JPG, PNG, or WebP images" onChange={(event) => { const list = Array.from(event.target.files ?? []); event.target.value = ""; void addFiles(list); }} />
      <FunnelReview />
    </section>
  );
}

function formatBytes(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

function fileStatus(file: LocalImage) {
  if (file.status === "ready") return file.verification && unresolvedCount(file.verification) ? "Ready · review needed" : "Verified · ready to download";
  if (file.status === "ready_for_action") return file.scan?.cleanSupport === "scan_only" ? "Scanned · inspection only" : "Scanned · ready to clean";
  return file.status.replaceAll("_", " ");
}
