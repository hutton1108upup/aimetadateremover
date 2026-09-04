"use client";
/* eslint-disable @next/next/no-img-element -- local blob previews cannot use the Next image optimizer */

import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import { Check, ChevronDown, Download, FileImage, FolderOpen, LockKeyhole, Plus, ScanSearch, ShieldCheck, Sparkles, Trash2, UploadCloud, ZoomIn, ZoomOut } from "lucide-react";
import { getBatchLimits } from "@/lib/image-metadata-core/limits";
import { mapWithConcurrency } from "@/lib/concurrency";
import type { CleanMode, CleanPolicy, FileStage, ScanResult, VerificationResult } from "@/lib/image-metadata-core/types";
import { cleanLocally, scanLocally, validateBrowserImage } from "@/lib/local-processor";
import { FindingRow } from "./finding-row";
import { VerificationCard } from "./verification-card";

type ToolTab = "inspect" | "clean" | "humanize" | "export";
const toolTabs: ToolTab[] = ["inspect", "clean", "humanize", "export"];
const safeSampleBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAApdEVYdHBhcmFtZXRlcnMAc3RlcHM9MzAgc2VlZD00MiBzYW1wbGVyPWV1bGVyj/t2VgAAAABJRU5ErkJggg==";

function createSafeSampleFile() {
  const binary = atob(safeSampleBase64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new File([bytes], "imagefinisher-safe-sample.png", { type: "image/png" });
}
interface LocalImage {
  id: string;
  file: File;
  preview?: string;
  status: FileStage;
  scan?: ScanResult;
  error?: string;
  cleaned?: ArrayBuffer;
  verification?: VerificationResult;
  cleanPreview?: string;
}

export function UnifiedImageWorkspace({ variant = "embedded", defaultMode = "clean", acceptedFormats }: { variant?: "embedded" | "full"; defaultMode?: "inspect" | "clean"; acceptedFormats?: Array<"jpeg" | "png" | "webp"> }) {
  const [files, setFiles] = useState<LocalImage[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [tab, setTab] = useState<ToolTab>(defaultMode);
  const [cleanMode, setCleanMode] = useState<CleanMode>("ai_workflow");
  const [removeC2pa, setRemoveC2pa] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [expanded, setExpanded] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [previewView, setPreviewView] = useState<"original" | "cleaned">("original");
  const [zoom, setZoom] = useState(100);
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<LocalImage[]>([]);
  const activeRef = useRef<LocalImage | undefined>(undefined);
  const active = files.find((item) => item.id === activeId) ?? files[0];
  const previewSrc = active ? (previewView === "cleaned" ? active.cleanPreview : active.preview) : undefined;
  const isSafeSample = active?.file.name === "imagefinisher-safe-sample.png";

  filesRef.current = files;
  activeRef.current = active;
  useEffect(() => () => filesRef.current.forEach((item) => { if (item.preview) URL.revokeObjectURL?.(item.preview); if (item.cleanPreview) URL.revokeObjectURL?.(item.cleanPreview); }), []);
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
  }, []);

  async function addFiles(list: File[]) {
    const limits = getBatchLimits(typeof window === "undefined" ? 1440 : window.innerWidth);
    const available = limits.maxFiles - files.length;
    const selected = list.slice(0, Math.max(0, available));
    const batchBytes = files.reduce((sum, item) => sum + item.file.size, 0) + selected.reduce((sum, item) => sum + item.size, 0);
    if (batchBytes > limits.maxBatchBytes) {
      const issue: LocalImage = { id: `limit-${Date.now()}`, file: selected[0], status: "failed", error: `This batch exceeds the ${limits.maxBatchBytes / 1024 / 1024} MB local memory limit.` };
      setFiles((current) => [...current, issue]); setActiveId(issue.id); return;
    }
    const queued = selected.map((file) => ({ id: `${file.name}-${file.size}-${Math.random()}`, file, status: "queued" as const, preview: file.type.startsWith("image/") && typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : undefined }));
    setFiles((current) => [...current, ...queued]);
    if (!activeId && queued[0]) setActiveId(queued[0].id);
    setBusy(true);
    await mapWithConcurrency(queued, limits.concurrency, async (item) => {
      if (item.file.size > limits.maxFileBytes) {
        setFiles((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "failed", error: "This file exceeds the 25 MB local limit." } : entry)); return;
      }
      setFiles((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "scanning" } : entry));
      try {
        const buffer = await item.file.arrayBuffer();
        const scan = await scanLocally(buffer);
        if (acceptedFormats && !acceptedFormats.includes(scan.format)) throw new Error(`This page accepts ${acceptedFormats.join(", ").toUpperCase()} images.`);
        setFiles((current) => current.map((entry) => entry.id === item.id ? { ...entry, scan, status: "ready_for_action" } : entry));
      } catch (error) {
        const issue = error as Error & { code?: string };
        const safeMessage = issue.code ? issue.message : "This file could not be decoded as a supported JPEG, PNG, or WebP image.";
        setFiles((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: "unsupported", error: safeMessage } : entry));
      }
    });
    setBusy(false);
  }

  async function cleanActive() {
    if (!active?.scan) return;
    if (cleanMode !== "ai_workflow") {
      setFiles((current) => current.map((entry) => entry.id === active.id ? { ...entry, error: "Privacy Clean and Full Clean remain gated until the extended EXIF fixture matrix is complete." } : entry));
      return;
    }
    const policy: CleanPolicy = { mode: cleanMode, removeC2pa, removeColorProfile: false };
    setBusy(true);
    setFiles((current) => current.map((entry) => entry.id === active.id ? { ...entry, status: "cleaning", error: undefined } : entry));
    try {
      const { clean, verification } = await cleanLocally(await active.file.arrayBuffer(), policy);
      if (clean.output) await validateBrowserImage(clean.output.slice(0), active.file.type);
      const cleanPreview = clean.output && typeof URL.createObjectURL === "function" ? URL.createObjectURL(new Blob([clean.output], { type: active.file.type })) : undefined;
      setFiles((current) => current.map((entry) => entry.id === active.id ? { ...entry, cleaned: clean.output, cleanPreview, verification, status: "ready" } : entry));
      setPreviewView("cleaned");
      setTab("export");
    } catch (error) {
      setFiles((current) => current.map((entry) => entry.id === active.id ? { ...entry, status: "unsupported", error: (error as Error).message } : entry));
    } finally { setBusy(false); }
  }

  function removeFile(id: string) {
    const target = files.find((item) => item.id === id);
    if (target?.preview) URL.revokeObjectURL?.(target.preview);
    if (target?.cleanPreview) URL.revokeObjectURL?.(target.cleanPreview);
    const remaining = files.filter((item) => item.id !== id);
    setFiles(remaining); if (activeId === id) setActiveId(remaining[0]?.id);
  }

  function download(buffer: ArrayBuffer, name: string, type: string) {
    const url = URL.createObjectURL(new Blob([buffer], { type }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
  }

  async function downloadZip() {
    const zip = new JSZip();
    files.filter((item) => item.cleaned).forEach((item) => zip.file(`clean-${item.file.name}`, item.cleaned!));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "clean-images.zip"; anchor.click(); URL.revokeObjectURL(url);
  }

  return (
    <section className={`workspace-shell ${variant === "full" ? "workspace-full" : "workspace-embedded"}`} aria-label="Local image metadata workspace">
      <div className="local-notice"><span><ShieldCheck aria-hidden="true" /> Files stay in this browser session</span><span>Nothing is uploaded</span></div>
      <div className="workspace-grid">
        {variant === "full" && (
          <aside className="file-rail" aria-label="File queue">
            <div className="rail-heading"><span>File queue</span><button onClick={() => inputRef.current?.click()} aria-label="Add more images">+</button></div>
            {files.map((item) => <button key={item.id} className={`file-row ${item.id === active?.id ? "active" : ""}`} onClick={() => setActiveId(item.id)}><FileImage aria-hidden="true" /><span><b>{item.file.name}</b><small>{item.status.replaceAll("_", " ")}</small></span></button>)}
          </aside>
        )}
        <div className="tool-stage">
          {variant === "full" && files.length > 0 && <select className="mobile-file-select" value={active?.id} onChange={(event) => setActiveId(event.target.value)} aria-label="Active image">{files.map((item) => <option value={item.id} key={item.id}>{item.file.name}</option>)}</select>}
          {!active ? (
            <div className="dropzone" role="button" aria-label="Open file picker" onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); inputRef.current?.click(); } }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void addFiles(Array.from(event.dataTransfer.files)); }} onPaste={(event) => void addFiles(Array.from(event.clipboardData.files))} tabIndex={0}>
              <span className="upload-icon"><UploadCloud aria-hidden="true" /></span>
              <h2>Drop images here, paste from clipboard, or choose files</h2>
              <p>JPG, PNG, WebP · No account for local tools</p>
              <div className="drop-actions"><button className="button primary" onClick={() => inputRef.current?.click()} disabled={busy}><FolderOpen aria-hidden="true" /> Choose images</button><button className="button secondary" onClick={() => void addFiles([createSafeSampleFile()])} disabled={busy}><ScanSearch aria-hidden="true" /> Try a safe sample</button></div>
              <div className="trust-row"><span><Check aria-hidden="true" /> Free metadata tools</span><span><LockKeyhole aria-hidden="true" /> Local processing</span><span><Check aria-hidden="true" /> Original file preserved</span><span><Check aria-hidden="true" /> No forced subscription</span></div>
            </div>
          ) : (
            <div className="active-workspace">
              <div className="preview-panel">
                <div className="preview-toolbar">
                  <span className="preview-name" title={active.file.name}>{active.file.name}</span>
                  <span className="preview-tools">
                    <span className="preview-view-toggle" aria-label="Preview version"><button className={previewView === "original" ? "selected" : ""} onClick={() => setPreviewView("original")} aria-label="Show original">Original</button><button className={previewView === "cleaned" ? "selected" : ""} onClick={() => setPreviewView("cleaned")} disabled={!active.cleanPreview} aria-label="Show cleaned">Cleaned</button></span>
                    <span className="preview-zoom-controls" aria-label="Preview zoom"><button onClick={() => setZoom((value) => Math.max(50, value - 25))} aria-label="Zoom out"><ZoomOut aria-hidden="true" /></button><b>{zoom}%</b><button onClick={() => setZoom((value) => Math.min(200, value + 25))} aria-label="Zoom in"><ZoomIn aria-hidden="true" /></button></span>
                    <span className="preview-file-controls" aria-label="File actions"><button onClick={() => inputRef.current?.click()} aria-label="Add images"><Plus aria-hidden="true" /></button><button className="remove-action" onClick={() => removeFile(active.id)} aria-label={`Remove ${active.file.name}`}><Trash2 aria-hidden="true" /></button></span>
                  </span>
                </div>
                <div className={`image-stage ${isSafeSample ? "safe-sample-stage" : ""}`}>{previewSrc ? <img style={{ transform: `scale(${zoom / 100})` }} src={previewSrc} alt={`${previewView === "cleaned" ? "Cleaned" : "Original"} file preview`} /> : <FileImage aria-hidden="true" />}{isSafeSample && <span className="safe-sample-card"><ShieldCheck aria-hidden="true" /><b>Safe sample</b><small>Embedded test PNG · one synthetic workflow field</small></span>}</div>
                <p>{active.scan ? `${active.scan.format.toUpperCase()} · ${formatBytes(active.file.size)} · ${active.scan.findings.length} finding${active.scan.findings.length === 1 ? "" : "s"}` : active.status.replaceAll("_", " ")}</p>
              </div>
              <div className="action-panel">
                <div className="tool-tabs" role="tablist" aria-label="Workspace steps">{toolTabs.map((item) => <button id={`tab-${item}`} aria-controls={`panel-${item}`} role="tab" aria-selected={tab === item} key={item} onClick={() => setTab(item)}>{item}</button>)}</div>
                <div aria-live="polite" className="sr-status">{busy ? "Processing locally" : active.error ?? active.status.replaceAll("_", " ")}</div>
                {active.error && <div className="error-banner">{active.error}</div>}
                {tab === "inspect" && active.scan && <div className="panel-stack" role="tabpanel" id="panel-inspect" aria-labelledby="tab-inspect"><div className="result-strip"><span>{active.scan.findings.length} metadata finding{active.scan.findings.length === 1 ? "" : "s"}</span><b>{active.scan.cleanSupport === "scan_only" ? "Scan only" : "Scan complete"}</b></div><button className="advanced-toggle" onClick={() => setAdvanced((value) => !value)}> {advanced ? "Summary view" : "Advanced view"}<ChevronDown /></button>{active.scan.findings.length ? active.scan.findings.map((finding) => <FindingRow key={finding.id + finding.rawKey} finding={finding} expanded={expanded === finding.id} onToggle={() => setExpanded(expanded === finding.id ? undefined : finding.id)} />) : <div className="empty-result"><ShieldCheck /><h3>No supported metadata found</h3><p>The file can still contain unsupported or pixel-level signals. This is not an AI detection result.</p><button className="button secondary" onClick={() => inputRef.current?.click()}>Inspect another image</button></div>}{advanced && <div className="advanced-table"><table><thead><tr><th>Field</th><th>Category</th><th>Value</th><th /></tr></thead><tbody>{active.scan.findings.map((finding)=><tr key={finding.id}><td>{finding.rawKey ?? finding.label}</td><td>{finding.category.replaceAll("_"," ")}</td><td>{finding.category === "location" || finding.category === "ai_workflow" ? "Hidden" : finding.rawValue ?? "Present"}</td><td><button onClick={() => void navigator.clipboard?.writeText(`${finding.rawKey ?? finding.label}: ${finding.rawValue ?? "present"}`)}>Copy</button></td></tr>)}</tbody></table><button className="button secondary wide" onClick={() => download(new TextEncoder().encode(JSON.stringify(active.scan, null, 2)).buffer, `${active.file.name}.metadata.json`, "application/json")}><Download/> Export scan JSON</button></div>}</div>}
                {tab === "clean" && <div className="panel-stack" role="tabpanel" id="panel-clean" aria-labelledby="tab-clean"><p className="panel-intro">Choose what this new copy should remove. Your original stays untouched.</p>{(["ai_workflow", "privacy", "full"] as CleanMode[]).map((mode) => <label className={`mode-card ${cleanMode === mode ? "selected" : ""} ${mode !== "ai_workflow" ? "gated" : ""}`} key={mode}><input type="radio" name="clean-mode" disabled={mode !== "ai_workflow"} checked={cleanMode === mode} onChange={() => setCleanMode(mode)} /><span><b>{mode === "ai_workflow" ? "AI Workflow Clean" : mode === "privacy" ? "Privacy Clean · compatibility gate" : "Full Clean · compatibility gate"}</b><small>{mode === "ai_workflow" ? "Prompts, workflows, model settings and seeds" : "Visible for review, but disabled until extended EXIF, thumbnail and MakerNote fixtures pass."}</small></span></label>)}<label className="check-row"><input type="checkbox" disabled={active.scan?.format !== "png" || !active.scan.findings.some((finding) => finding.id === "c2pa")} checked={removeC2pa} onChange={(event) => setRemoveC2pa(event.target.checked)} /><span><b>Remove Content Credentials</b><small>Off by default. PNG caBX removal is available when detected; JPEG and WebP remain scan-only.</small></span></label><button className="button primary wide" onClick={() => void cleanActive()} disabled={busy || !active.scan}>{busy ? "Processing locally…" : "Create clean copy"}</button></div>}
                {tab === "humanize" && <div className="unavailable-panel" role="tabpanel" id="panel-humanize" aria-labelledby="tab-humanize"><Sparkles /><p className="eyebrow">Cloud feature</p><h3>Visual repair is not available yet</h3><p>Metadata cleaning changes file-level information. It cannot control pixel watermarks, third-party classifiers, or visible artifacts. A real AI workflow will appear only after provider quality testing.</p></div>}
                {tab === "export" && <div className="panel-stack" role="tabpanel" id="panel-export" aria-labelledby="tab-export">{active.verification ? <VerificationCard verification={active.verification} /> : <div className="empty-result"><Download /><h3>No verified clean copy yet</h3><p>Run a supported clean mode first. Downloads only appear after the output bytes are scanned again.</p></div>}{active.cleaned && <><button className="button primary wide" onClick={() => download(active.cleaned!, `clean-${active.file.name}`, active.file.type)}><Download /> Download clean copy</button><button className="button secondary wide" onClick={() => download(new TextEncoder().encode(JSON.stringify(active.verification, null, 2)).buffer, `${active.file.name}.metadata-report.json`, "application/json")}><Download /> Export verification JSON</button>{files.filter((item) => item.cleaned).length > 1 && <button className="button secondary wide" onClick={() => void downloadZip()}>Download clean ZIP</button>}</>}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
      <input ref={inputRef} className="visually-hidden" type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Choose JPG, PNG, or WebP images" onChange={(event) => void addFiles(Array.from(event.target.files ?? []))} />
    </section>
  );
}

function formatBytes(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
