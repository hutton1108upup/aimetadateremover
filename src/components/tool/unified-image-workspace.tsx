"use client";
/* eslint-disable @next/next/no-img-element -- local blob previews cannot use the Next image optimizer */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Download, FileImage, FolderOpen, LockKeyhole, Plus, ScanSearch, ShieldCheck, Trash2, UploadCloud, ZoomIn, ZoomOut } from "lucide-react";
import type { CleanPolicy } from "@/lib/image-metadata-core/types";
import { downloadLocal as download, useLocalWorkspace, type LocalImage, unresolvedCount } from "./use-local-workspace";
import { FindingRow } from "./finding-row";
import { VerificationCard } from "./verification-card";
import { FunnelReview } from "./funnel-review";


const safeSampleBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAApdEVYdHBhcmFtZXRlcnMAc3RlcHM9MzAgc2VlZD00MiBzYW1wbGVyPWV1bGVyj/t2VgAAAABJRU5ErkJggg==";

function createSafeSampleFile() {
  const binary = atob(safeSampleBase64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new File([bytes], "imagefinisher-safe-sample.png", { type: "image/png" });
}
export function UnifiedImageWorkspace({ variant = "embedded", defaultMode = "clean", acceptedFormats }: { variant?: "embedded" | "full"; defaultMode?: "inspect" | "clean"; acceptedFormats?: Array<"jpeg" | "png" | "webp"> }) {
  const { files, filesRef, busy, notice, addFiles: queueFiles, cleanFiles, removeFile, clearFiles, downloadOne, downloadZip } = useLocalWorkspace(acceptedFormats);
  const [activeId, setActiveId] = useState<string>();
  const [keepPrivacy, setKeepPrivacy] = useState(false);
  const [keepCredentials, setKeepCredentials] = useState(false);
  const [expanded, setExpanded] = useState<string>();
  const [previewView, setPreviewView] = useState<"original" | "cleaned">("cleaned");
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

  const policy: CleanPolicy = { mode: keepPrivacy ? "ai_workflow" : "publish", removeC2pa: !keepCredentials, removeColorProfile: false };
  const pngOnly = acceptedFormats?.length === 1 && acceptedFormats[0] === "png";
  const completed = files.filter(file => file.status === "ready");
  const partial = completed.filter(file => file.verification && unresolvedCount(file.verification));
  const failed = files.filter(file => file.error);
  const scanOnly = files.filter(file => file.scan?.cleanSupport === "scan_only");
  const activeProcessing = active && ["queued", "validating", "scanning", "cleaning", "verifying"].includes(active.status);
  const removed = active?.verification?.items.filter(item => item.after === "removed").length ?? 0;
  const unchanged = Boolean(active?.verification && !removed && !unresolvedCount(active.verification));

  async function addFiles(list: File[], source: "file" | "sample" = "file") {
    if (!busy && !filesRef.current.length) { setPreviewView("cleaned"); setZoom(100); setActiveId(undefined); }
    await queueFiles(list, source, defaultMode === "clean" ? policy : undefined);
  }

  async function updateSettings(nextPrivacy: boolean, nextCredentials: boolean) {
    setKeepPrivacy(nextPrivacy); setKeepCredentials(nextCredentials);
    const ids = filesRef.current.filter(file => defaultMode === "clean" || file.verification).map(file => file.id);
    if (ids.length) await cleanFiles(ids, { mode: nextPrivacy ? "ai_workflow" : "publish", removeC2pa: !nextCredentials, removeColorProfile: false });
  }

  return (
    <section className={`workspace-shell ${variant === "full" ? "workspace-full" : "workspace-embedded"}`} aria-label="Local image metadata workspace">
      <div className="local-notice"><span><ShieldCheck aria-hidden="true" /> Your files stay in this browser</span><span>Nothing gets uploaded</span></div>
      {notice && <p className="batch-notice" role="status">{notice}</p>}
      {files.length > 0 && <div className="batch-toolbar"><span>{files.length} files · {completed.length} ready to download · {partial.length} partial · {failed.length} failed{scanOnly.length > 0 ? ` · ${scanOnly.length} inspection only` : ""}</span><button className="button secondary" onClick={clearFiles}>Clear queue</button></div>}
      {files.length > 1 && completed.length > 0 && <div className="batch-download"><button className="button primary" disabled={busy} onClick={() => void downloadZip()}><Download aria-hidden="true" />Download completed images (ZIP)</button><p>{completed.length} of {files.length} files included · {partial.length} need review. Failed and inspection-only files are excluded.</p></div>}
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
              <p>{pngOnly ? "PNG images" : "JPG and PNG · WebP inspection only"} · No account needed</p>
              <p className="drop-policy">{defaultMode === "inspect" ? "Read-only check. Your file stays unchanged." : "Automatically removes supported AI/private data and PNG Content Credentials."}</p>
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
                <div aria-live="polite" className="sr-status">{active.error ?? fileStatus(active)}</div>
                {activeProcessing && <div className="processing-result" role="status"><ScanSearch aria-hidden="true" /><h3>{active.status === "cleaning" ? "Cleaning your copy…" : active.status === "verifying" ? "Verifying your copy…" : "Checking your image…"}</h3><p>{defaultMode === "clean" ? "Check → Clean → Verify. Your download will appear automatically." : "Reading supported metadata locally. Your file stays unchanged."}</p></div>}
                {active.error && <div className="error-banner" role="alert"><b>Could not process this image</b><p>{active.error}</p></div>}
                {!activeProcessing && active.scan && !active.error && <div className="panel-stack">
                  {active.verification ? <>
                    <div className="result-heading"><ShieldCheck aria-hidden="true" /><h3>{unresolvedCount(active.verification) ? "Partially cleaned — review remaining data" : unchanged ? "No supported data needed cleaning" : "Cleaning complete"}</h3></div>
                    {unchanged && <p className="panel-intro">No supported fields were removed. Download your unchanged original, or inspect another image.</p>}
                    <button className="button primary wide download-result" disabled={busy} onClick={() => unchanged ? download(active.file, active.file.name, active.file.type) : downloadOne(active)}><Download aria-hidden="true" />{unchanged ? "Download original" : "Download clean copy"}</button>
                    <VerificationCard verification={active.verification} />
                  </> : <>
                    <div className="result-strip"><span>{active.scan.findings.length} metadata finding{active.scan.findings.length === 1 ? "" : "s"}</span><b>{active.scan.cleanSupport === "scan_only" ? "Inspection only" : "Scan complete"}</b></div>
                    {active.scan.cleanSupport === "scan_only" ? <p className="batch-notice">This format can only be inspected. No cleaned copy was created.</p> : <>
                      <h3>{active.scan.findings.length ? "Here is what your image contains" : "No supported metadata detected"}</h3>
                      <p className="panel-intro">Your original is unchanged. {active.scan.findings.length ? "You can clean a copy here without selecting the image again." : "Other data may still exist outside this scanner’s coverage."}</p>
                      {active.scan.findings.some(finding => ["ai_workflow", "location", "provenance"].includes(finding.category)) && <button className="button primary wide" disabled={busy} onClick={() => void cleanFiles([active.id], policy)}>Clean and create a copy</button>}
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

      <p className="workspace-legal">Before choosing files, read our <Link href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy<span className="sr-only"> (opens in a new tab)</span></Link> and <Link href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service<span className="sr-only"> (opens in a new tab)</span></Link>. <Link href="/pricing" target="_blank" rel="noopener noreferrer">View upcoming plans<span className="sr-only"> (opens in a new tab)</span></Link>.</p>
      <div className="automatic-policy">
        <p>{defaultMode === "inspect" ? "Check what is inside your image. Nothing is changed unless you choose to clean a copy." : "Choose images to clean automatically. We remove supported AI and private metadata, plus embedded PNG Content Credentials. Image data and copyright stay intact."}</p>
        <details className="clean-settings"><summary>Cleaning settings</summary><div>
          <p>Optional preferences. Changes rebuild existing cleaned copies from your original; new images use these settings.</p>
          <label className="check-row"><input type="checkbox" checked={keepPrivacy} disabled={busy} onChange={event => void updateSettings(event.target.checked, keepCredentials)} /><span>Keep location, capture dates and device details</span></label>
          <label className="check-row"><input type="checkbox" checked={keepCredentials} disabled={busy} onChange={event => void updateSettings(keepPrivacy, event.target.checked)} /><span>Keep Content Credentials (source and edit history)</span></label>
          <p>Only embedded PNG credentials can be removed. JPEG credentials and other unsupported fields may remain. Your original is never overwritten.</p>
        </div></details>
      </div>
      <input ref={inputRef} className="visually-hidden" type="file" multiple accept={pngOnly ? "image/png" : "image/jpeg,image/png,image/webp"} aria-label={pngOnly ? "Choose PNG images" : "Choose JPG, PNG, or WebP images"} onChange={(event) => { const list = Array.from(event.target.files ?? []); event.target.value = ""; void addFiles(list); }} />
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
