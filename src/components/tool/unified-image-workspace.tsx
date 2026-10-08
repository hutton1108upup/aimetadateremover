"use client";
/* eslint-disable @next/next/no-img-element -- local blob previews cannot use the Next image optimizer */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Download, FileImage, FolderOpen, LockKeyhole, Plus, ScanSearch, ShieldCheck, Trash2, UploadCloud, ZoomIn, ZoomOut } from "lucide-react";
import type { CleanPolicy, Finding } from "@/lib/image-metadata-core/types";
import { downloadLocal as download, useLocalWorkspace, type LocalImage, unresolvedCount } from "./use-local-workspace";
import { FindingNextActions, FindingRow } from "./finding-row";
import { VerificationCard } from "./verification-card";
import { FunnelReview } from "./funnel-review";
import { FeedbackButton } from "@/components/feedback/feedback-button";


const safeSampleBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAApdEVYdHBhcmFtZXRlcnMAc3RlcHM9MzAgc2VlZD00MiBzYW1wbGVyPWV1bGVyj/t2VgAAAABJRU5ErkJggg==";
const comfyuiSampleBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAApdEVYdHBhcmFtZXRlcnMAc3RlcHM9MzAgc2VlZD00MiBzYW1wbGVyPWV1bGVyj/t2VgAAACh0RVh0d29ya2Zsb3cAeyIxIjp7ImNsYXNzX3R5cGUiOiJLU2FtcGxlciJ9ff8hepAAAAAjdEVYdHByb21wdAB7IjEiOnsiaW5wdXRzIjp7InNlZWQiOjQyfX192O5bewAAAABJRU5ErkJggg==";

function createSafeSampleFile(focus?: ToolFocus) {
  const binary = atob(focus === "comfyui" ? comfyuiSampleBase64 : safeSampleBase64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new File([bytes], focus === "comfyui" ? "synthetic-comfyui-workflow.png" : focus === "stable-diffusion" ? "synthetic-generation-parameters.png" : "ai-metadata-remover-safe-sample.png", { type: "image/png" });
}
export type ToolFocus = "comfyui" | "stable-diffusion" | "gps" | "c2pa";

export function UnifiedImageWorkspace({ variant = "embedded", defaultMode = "clean", acceptedFormats, focus }: { variant?: "embedded" | "full"; defaultMode?: "inspect" | "clean"; acceptedFormats?: Array<"jpeg" | "png" | "webp">; focus?: ToolFocus }) {
  const { files, filesRef, busy, notice, addFiles: queueFiles, cleanFiles, removeFile, clearFiles, downloadOne, downloadZip } = useLocalWorkspace(acceptedFormats);
  const [activeId, setActiveId] = useState<string>();
  const [keepPrivacy, setKeepPrivacy] = useState(false);
  const [keepCredentials, setKeepCredentials] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [expanded, setExpanded] = useState<string>();
  const [previewView, setPreviewView] = useState<"original" | "cleaned">("cleaned");
  const [zoom, setZoom] = useState(100);
  const [downloadFeedback, setDownloadFeedback] = useState<{ id: string; message: string }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<LocalImage | undefined>(undefined);
  const active = files.find((item) => item.id === activeId) ?? files[0];
  const showingCleaned = previewView === "cleaned" && Boolean(active?.cleanPreview);
  const previewSrc = active ? (showingCleaned ? active.cleanPreview : active.preview) : undefined;
  const isSafeSample = active?.source === "sample";

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => {
    if (active?.source !== "sample" || window.innerWidth > 720) return;
    const frame = requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [active?.id, active?.source]);
  useEffect(() => {
    if (active?.source !== "sample" || !active.verification || window.innerWidth > 720) return;
    const frame = requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [active?.id, active?.source, active?.verification]);
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const registrations = [
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

  const policy: CleanPolicy = focus === "gps" ? { mode: "privacy", removeC2pa: false, removeColorProfile: false } : focus === "comfyui" || focus === "stable-diffusion" ? { mode: "ai_workflow", removeC2pa: false, removeColorProfile: false } : { mode: keepPrivacy ? "ai_workflow" : "publish", removeC2pa: !keepCredentials, removeColorProfile: false };
  const acceptedMime = acceptedFormats?.map(format=>format === "jpeg" ? "image/jpeg" : `image/${format}`).join(",") ?? "image/jpeg,image/png,image/webp";
  const acceptedLabel = acceptedFormats?.map(format=>format.toUpperCase()).join(", ") ?? "JPG, PNG, or WebP";
  const completed = files.filter(file => file.status === "ready");
  const partial = completed.filter(file => file.verification && unresolvedCount(file.verification));
  const failed = files.filter(file => file.error);
  const retryable = failed.filter(file => file.scan && file.scan.cleanSupport !== "scan_only");
  const scanOnly = files.filter(file => file.scan?.cleanSupport === "scan_only");
  const activeProcessing = active && ["queued", "validating", "scanning", "cleaning", "verifying"].includes(active.status);
  const removed = active?.verification?.items.filter(item => item.after === "removed").length ?? 0;
  const unchanged = Boolean(active?.verification && !removed && !unresolvedCount(active.verification));

  async function addFiles(list: File[], source: "file" | "sample" = "file") {
    setDownloadFeedback(undefined);
    if (!busy && !filesRef.current.length) { setPreviewView("cleaned"); setZoom(100); setActiveId(undefined); }
    await queueFiles(list, source, defaultMode === "clean" ? policy : undefined);
  }

  function startDownload(file: LocalImage) {
    try {
      if (downloadOne(file)) setDownloadFeedback({ id: file.id, message: "Download started. Check your browser downloads." });
    } catch {
      setDownloadFeedback({ id: file.id, message: "The download could not start. Please try again." });
    }
  }

  async function updateSettings(nextPrivacy: boolean, nextCredentials: boolean) {
    if (busy) return;
    setKeepPrivacy(nextPrivacy); setKeepCredentials(nextCredentials);
    const ids = filesRef.current.filter(file => defaultMode === "clean" || file.verification).map(file => file.id);
    if (ids.length) {
      setSettingsMessage("Reprocessing with your new settings…");
      try {
        await cleanFiles(ids, { mode: nextPrivacy ? "ai_workflow" : "publish", removeC2pa: !nextCredentials, removeColorProfile: false });
        setSettingsMessage("Settings applied. Review each image’s result below.");
      } catch {
        setSettingsMessage("Reprocessing did not finish. Check the results before downloading.");
      }
    } else setSettingsMessage("Settings saved for the next images you clean.");
  }

  return (
    <section className={`workspace-shell ${variant === "full" ? "workspace-full" : "workspace-embedded"}`} aria-label="Local image metadata workspace">
      <div className="local-notice"><span><ShieldCheck aria-hidden="true" /> Your files stay in this browser</span><span>Nothing gets uploaded</span></div>
      {!focus && <fieldset className="clean-settings" disabled={busy}>
        <legend>Cleaning settings</legend>
        <div className="clean-settings-heading"><span>Applies to all images</span><span>Original files stay unchanged</span></div>
        <div className="clean-settings-options">
          <label className={`clean-setting-option${keepPrivacy ? " is-selected" : ""}`}>
            <input type="checkbox" checked={keepPrivacy} onChange={event => void updateSettings(event.target.checked, keepCredentials)} />
            <span><strong>Keep capture details</strong><small>Location, dates &amp; device</small></span>
          </label>
          <label className={`clean-setting-option${keepCredentials ? " is-selected" : ""}`}>
            <input type="checkbox" checked={keepCredentials} onChange={event => void updateSettings(keepPrivacy, event.target.checked)} />
            <span><strong>Keep Content Credentials</strong><small>Source &amp; edit history</small></span>
          </label>
        </div>
        <p>{defaultMode === "inspect" ? "These settings apply when you choose to clean a copy. Inspection never changes your file." : "Unchecked fields are removed where supported. Changes rebuild existing copies from your originals."} <span className="desktop-boundary-copy">Only embedded PNG credentials can be removed; JPEG credentials and other unsupported fields may remain.</span><span className="mobile-boundary-copy">Unsupported fields may remain.</span></p>
        <p className="settings-status" role="status">{settingsMessage}</p>
      </fieldset>}
      {notice && <p className="batch-notice" role="status">{notice}</p>}
      {files.length > 0 && <div className="batch-toolbar"><span>{files.length} files · {completed.length} ready to download · {partial.length} partial · {failed.length} failed{scanOnly.length > 0 ? ` · ${scanOnly.length} inspection only` : ""}</span><div className="batch-toolbar-actions">{active && <button className="button secondary result-jump" onClick={() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>{activeProcessing ? "View progress" : active.verification ? "View result & download" : active.error ? "View error" : "View result"}</button>}{retryable.length > 0 && <button className="button secondary" disabled={busy} onClick={() => void cleanFiles(retryable.map(file=>file.id),policy)}>Retry failed cleans ({retryable.length})</button>}<button className="button secondary" disabled={busy} onClick={clearFiles}>Clear queue</button></div></div>}
      {files.length > 1 && completed.length > 0 && <div className="batch-download"><button className="button primary" disabled={busy} onClick={() => void downloadZip()}><Download aria-hidden="true" />Download completed images (ZIP)</button><p>{completed.length} of {files.length} files included · {partial.length} need review. ZIP includes a local batch results file; files without a completed copy are excluded.</p></div>}
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
            <div id="choose-images" className="dropzone" role="button" aria-label="Open file picker" onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); inputRef.current?.click(); } }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void addFiles(Array.from(event.dataTransfer.files)); }} onPaste={(event) => void addFiles(Array.from(event.clipboardData.files))} tabIndex={0}>
              <span className="upload-icon"><UploadCloud aria-hidden="true" /></span>
              <h2>Drop, paste, or choose your images</h2>
              <p>{acceptedFormats ? `${acceptedLabel} images` : "JPG and PNG · WebP inspection only"} · No account needed</p>
              <p className="drop-policy">{defaultMode === "inspect" ? "Read-only check. Your file stays unchanged." : focus === "gps" ? "Creates a copy with supported location and private EXIF fields removed." : focus ? "Creates a copy with supported workflow fields removed." : "Automatically cleans images using the settings above."}</p>
              <div className="drop-actions"><button className="button primary" onClick={() => inputRef.current?.click()} disabled={busy}><FolderOpen aria-hidden="true" /> Choose images</button>{(!focus || focus === "comfyui" || focus === "stable-diffusion") && <button className="button secondary" onClick={() => void addFiles([createSafeSampleFile(focus)], "sample")} disabled={busy}><ScanSearch aria-hidden="true" /> Try a safe sample</button>}</div>
              <div className="trust-row">{variant === "full" && acceptedFormats ? <><span><LockKeyhole aria-hidden="true" /> Runs locally</span><span><Check aria-hidden="true" /> Original files preserved</span><span><Check aria-hidden="true" /> Per-file results</span><span><Check aria-hidden="true" /> ZIP summary</span></> : <><span><Check aria-hidden="true" /> Free to use</span><span><LockKeyhole aria-hidden="true" /> Runs locally</span><span><Check aria-hidden="true" /> Original file preserved</span><span><Check aria-hidden="true" /> No subscription required</span></>}</div>
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
                <div className={`image-stage ${isSafeSample ? "safe-sample-stage" : ""}`}>{previewSrc ? <img style={{ transform: `scale(${zoom / 100})` }} src={previewSrc} alt={`${showingCleaned ? "Cleaned" : "Original"} file preview`} /> : <FileImage aria-hidden="true" />}{isSafeSample && <span className="safe-sample-card"><ShieldCheck aria-hidden="true" /><b>Safe sample</b><small>{focus === "comfyui" ? "Synthetic PNG · workflow and prompt graph" : "Synthetic PNG · generation parameters"}</small></span>}</div>
                <p>{active.scan ? `${active.scan.format.toUpperCase()} · ${formatBytes(active.file.size)} · ${active.scan.findings.length} finding${active.scan.findings.length === 1 ? "" : "s"}` : active.status.replaceAll("_", " ")}</p>
              </div>
              <div ref={resultRef} className="action-panel" tabIndex={-1}>
                <div aria-live="polite" className="sr-status">{active.error ?? fileStatus(active)}</div>
                {downloadFeedback?.id === active.id && <p className="download-feedback" role="status">{downloadFeedback.message}</p>}
                {activeProcessing && <div className="processing-result" role="status"><ScanSearch aria-hidden="true" /><h3>{active.status === "cleaning" ? "Cleaning your copy…" : active.status === "verifying" ? "Verifying your copy…" : "Checking your image…"}</h3><p>{defaultMode === "clean" ? "Check → Clean → Verify. Your download will appear automatically." : "Reading supported metadata locally. Your file stays unchanged."}</p></div>}
                {active.error && <div className="error-banner" role="alert"><b>Could not process this image</b><p>{active.error}</p><FeedbackButton /></div>}
                {!activeProcessing && active.scan && !active.error && <div className="panel-stack">
                  {focus && <TaskFocusSummary focus={focus} file={active} />}
                  {active.verification ? <>
                    <div className="result-heading"><ShieldCheck aria-hidden="true" /><h3>{unresolvedCount(active.verification) ? "Partially cleaned — review remaining data" : unchanged ? "No supported data needed cleaning" : "Cleaning complete"}</h3></div>
                    {unchanged && <p className="panel-intro">No supported fields were removed. Download your unchanged original, or inspect another image.</p>}
                    <button className="button primary wide download-result" disabled={busy} onClick={() => startDownload(active)}><Download aria-hidden="true" />{unchanged ? "Download original" : "Download clean copy"}</button>
                    <VerificationCard verification={active.verification} />
                  </> : <>
                    <div className="result-strip"><span>{active.scan.findings.length} metadata finding{active.scan.findings.length === 1 ? "" : "s"}</span><b>{active.scan.cleanSupport === "scan_only" ? "Inspection only" : "Scan complete"}</b></div>
                    {active.scan.cleanSupport === "scan_only" ? <p className="batch-notice">This format can only be inspected. No cleaned copy was created.</p> : <>
                      <h3>{active.scan.findings.length ? "Here is what your image contains" : "No supported metadata detected"}</h3>
                      <p className="panel-intro">Your original is unchanged. {active.scan.findings.length ? "You can clean a copy here without selecting the image again." : "Other data may still exist outside this scanner’s coverage."}</p>
                      <FindingNextActions findings={active.scan.findings} />
                      {focus !== "c2pa" && active.scan.c2pa && <div className="c2pa-status" role="status"><strong>Content Credentials</strong><span>{active.scan.c2pa.status.replaceAll("_", " ")}</span><p>{active.scan.c2pa.summary}</p>{active.scan.c2pa.issuer && <small>Issuer: {active.scan.c2pa.issuer}{active.scan.c2pa.time ? ` · ${active.scan.c2pa.time}` : ""}</small>}</div>}
                      {focus !== "c2pa" && active.scan.findings.some(finding => ["ai_workflow", "location", "provenance"].includes(finding.category)) && <button className="button primary wide" disabled={busy} onClick={() => void cleanFiles([active.id], policy)}>Clean and create a copy</button>}
                    </>}
                    {active.scan.findings.map((finding, index) => <FindingRow key={`${finding.id}-${index}`} finding={finding} expanded={expanded === `${finding.id}-${index}`} onToggle={() => setExpanded(expanded === `${finding.id}-${index}` ? undefined : `${finding.id}-${index}`)} />)}
                  </>}
                  <details className="processing-details"><summary>View processing details</summary><div>
                    {active.verification && <button className="button secondary wide" onClick={() => download(new TextEncoder().encode(JSON.stringify(active.verification, null, 2)).buffer, `${active.file.name}.metadata-report.json`, "application/json")}>Download verification report</button>}
                    <p>Original scan · {active.scan.findings.length} findings. Reports can contain private metadata; they stay on your device.</p>
                    {active.verification && active.scan.findings.map((finding, index) => <FindingRow key={`${finding.id}-${index}`} finding={finding} expanded={expanded === `${finding.id}-${index}`} onToggle={() => setExpanded(expanded === `${finding.id}-${index}` ? undefined : `${finding.id}-${index}`)} />)}
                    <button className="button secondary wide" onClick={() => download(new TextEncoder().encode(JSON.stringify(active.scan, null, 2)).buffer, `${active.file.name}.metadata.json`, "application/json")}>Download original scan report</button>
                  </div></details>
                  <p className="result-limit">Checks cover supported metadata only, not invisible watermarks or a platform’s AI verdict.</p>
                </div>}
                {!activeProcessing && <button className="button secondary wide next-image" disabled={busy} onClick={() => inputRef.current?.click()}>Process other images</button>}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="workspace-legal">Before choosing files, read our <Link href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy<span className="sr-only"> (opens in a new tab)</span></Link> and <Link href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service<span className="sr-only"> (opens in a new tab)</span></Link>. <Link href="/pricing" target="_blank" rel="noopener noreferrer">View plans<span className="sr-only"> (opens in a new tab)</span></Link>.</p>
      <div className="automatic-policy">
        <p>{focus === "c2pa" ? "This is a read-only Content Credentials check. No copy is changed here." : focus === "gps" ? "This task removes supported GPS and other private EXIF fields from a copy. Copyright, orientation and AI workflow fields stay for review." : focus === "comfyui" || focus === "stable-diffusion" ? "This task removes supported workflow fields from a copy. Other metadata stays for review." : defaultMode === "inspect" ? "Check what is inside your image. Nothing is changed unless you choose to clean a copy." : "Choose images to clean automatically. We remove supported AI metadata and apply your choices above for private details and PNG Content Credentials. Image data and copyright stay intact."}</p>

      </div>
      <input ref={inputRef} className="visually-hidden" type="file" multiple accept={acceptedMime} aria-label={`Choose ${acceptedLabel} images`} onChange={(event) => { const list = Array.from(event.target.files ?? []); event.target.value = ""; void addFiles(list); }} />
      <FunnelReview />
    </section>
  );
}

function formatBytes(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

function fileStatus(file: LocalImage) {
  if (file.status === "ready") return file.verification && unresolvedCount(file.verification) ? "Partial · review remaining data" : file.verification?.items.some(item => item.after === "removed") ? "Verified · ready to download" : "Unchanged · checked";
  if (file.status === "ready_for_action") return file.scan?.cleanSupport === "scan_only" ? "Scanned · inspection only" : "Scanned · ready to clean";
  return file.status.replaceAll("_", " ");
}

function TaskFocusSummary({ focus, file }: { focus: ToolFocus; file: LocalImage }) {
  const scan=file.scan;
  if(!scan)return null;
  if(focus==="c2pa"){
    const credential=scan.c2pa;
    const presence=credential?.status === "not_present" ? "Not found in supported fields" : credential?.status === "error" || credential?.status === "unsupported" || !credential ? "Could not confirm" : "Found";
    const integrity=credential?.status === "valid_integrity" ? "Valid integrity" : credential?.status === "invalid_or_tampered" ? "Validation failed" : credential?.status === "not_present" ? "No manifest to validate" : "Not verified";
    return <section className="task-focus-summary" aria-label="Content Credentials result"><h3>Content Credentials check</h3><dl><div><dt>Embedded record</dt><dd>{presence}</dd></div><div><dt>Integrity</dt><dd>{integrity}</dd></div><div><dt>Issuer trust</dt><dd>Not assessed</dd></div></dl><p>{credential?.summary ?? "Content Credentials could not be checked in this browser."}</p><small>No issuer trust anchors are configured. This check does not certify authorship.</small></section>;
  }
  const before=scan.findings,after=file.verification?.outputScan.findings;
  const rows: Array<{label:string;matches:(finding:Finding)=>boolean}>=focus==="comfyui" ? [
    {label:"Workflow data",matches:f=>/^workflow$/i.test(f.rawKey??"")},
    {label:"Prompt / execution data",matches:f=>/^prompt$/i.test(f.rawKey??"")},
  ] : focus==="stable-diffusion" ? [
    {label:"Generation parameters",matches:f=>f.category==="ai_workflow" && /^(parameters|prompt|negative prompt|model|seed|sampler|steps|cfg|lora)$/i.test(f.rawKey??"")},
  ] : [{label:"Location data",matches:f=>f.category==="location"}];
  const unresolved=before.some(f=>f.id.startsWith("unsupported-"));
  const status=(matches:(finding:Finding)=>boolean)=>{
    if(!before.some(matches))return unresolved?"Not confirmed — unreadable metadata remains":"Not found in supported fields";
    if(!after)return "Found in original";
    return after.some(matches)?"Still present — review the copy":"Removed from verified copy";
  };
  return <section className="task-focus-summary" aria-label={`${focus} task result`}><h3>{focus==="comfyui"?"ComfyUI workflow check":focus==="stable-diffusion"?"Generation settings check":"Location data check"}</h3><dl>{rows.map(row=><div key={row.label}><dt>{row.label}</dt><dd>{status(row.matches)}</dd></div>)}</dl>{unresolved && <p>Some metadata could not be inspected or removed. Review the unresolved findings below before sharing.</p>}</section>;
}
