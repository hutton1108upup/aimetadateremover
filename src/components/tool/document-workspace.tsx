"use client";
import { useEffect, useRef, useState } from "react";
import { Download, FileText, LockKeyhole, UploadCloud } from "lucide-react";
import type {
  DocumentCleanResult,
  DocumentKind,
  DocumentScan,
} from "@/lib/document-metadata";

export function DocumentWorkspace({ kind }: { kind: DocumentKind }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  useEffect(() => () => { requestRef.current += 1; }, []);
  const [file, setFile] = useState<File>();
  const [scan, setScan] = useState<DocumentScan>();
  const [result, setResult] = useState<DocumentCleanResult>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const label = kind === "pdf" ? "PDF" : "Word DOCX";
  async function choose(next?: File) {
    const request = ++requestRef.current;
    setFile(next);
    setScan(undefined);
    setResult(undefined);
    setError("");
    if (!next) return;
    if (next.size > 50 * 1024 * 1024) { setError("This file exceeds the 50 MB local processing limit."); setBusy(false); return; }
    setBusy(true);
    try {
      const tools = await import("@/lib/document-metadata");
      const checked = await (kind === "pdf"
        ? tools.scanPdf(await next.arrayBuffer())
        : tools.scanDocx(await next.arrayBuffer()));
      if (request === requestRef.current) setScan(checked);
    } catch (cause) {
      if (request === requestRef.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "This file could not be checked safely.",
        );
    } finally {
      if (request === requestRef.current) setBusy(false);
    }
  }
  async function clean() {
    if (!file) return;
    const request = ++requestRef.current;
    setBusy(true);
    setError("");
    try {
      const tools = await import("@/lib/document-metadata");
      const cleaned = await (kind === "pdf"
        ? tools.cleanPdf(await file.arrayBuffer())
        : tools.cleanDocx(await file.arrayBuffer()));
      if (request === requestRef.current) setResult(cleaned);
    } catch (cause) {
      if (request === requestRef.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "This file could not be cleaned safely.",
        );
    } finally {
      if (request === requestRef.current) setBusy(false);
    }
  }
  function download() {
    if (!result || !file) return;
    const url = URL.createObjectURL(
      new Blob([result.output], {
        type:
          kind === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file.name.replace(/\.(pdf|docx)$/i, "")}-clean.${kind}`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section
      className="workspace-shell workspace-embedded document-workspace"
      aria-label={`Local ${label} metadata workspace`}
    >
      <div className="local-notice">
        <span>
          <LockKeyhole aria-hidden="true" /> Your file stays in this browser
        </span>
        <span>Nothing gets uploaded</span>
      </div>
      {!file ? (
        <div
          className="dropzone"
          
          onClick={() => inputRef.current?.click()}
        >
          <span className="upload-icon">
            <UploadCloud aria-hidden="true" />
          </span>
          <h2>Choose one {label} file</h2>
          <p>{label} · one file per session · up to 50 MB · no account needed</p>
          <button
            className="button primary"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Choose file
          </button>
          <div className="trust-row">
            <span>Runs locally</span>
            <span>Original stays unchanged</span>
            <span>Output is rechecked</span>
          </div>
        </div>
      ) : (
        <div className="active-workspace document-active">
          <div className="preview-panel">
            <FileText aria-hidden="true" />
            <strong>{file.name}</strong>
            <span>
              {formatBytes(file.size)} · {label}
            </span>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => void choose(undefined)}
            >
              Choose another file
            </button>
          </div>
          <div className="action-panel" aria-live="polite">
            <p className="result-strip">
              <span>
                Checked locally · {scan?.properties.length ?? 0} supported
                properties
              </span>
              <b>
                {result
                  ? "Verified output"
                  : error
                    ? "Could not process"
                    : busy
                      ? "Processing…"
                      : "Ready to clean"}
              </b>
            </p>
            {error && (
              <div className="error-banner" role="alert">
                <b>Could not process this file</b>
                <p>{error}</p>
                <button
                  className="button secondary"
                  onClick={() => void choose(undefined)}
                >
                  Choose another file
                </button>
              </div>
            )}
            {scan && !result && !error && (
              <div className="verification-card">
                <h3>Found properties</h3>
                {scan.properties.length ? (
                  <table>
                    <tbody>
                      {scan.properties.map((item) => (
                        <tr key={item.key}>
                          <th>{item.label}</th>
                          <td>{item.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No supported properties found.</p>
                )}
                {scan.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            )}
            {scan && !result && !error && (
              <button
                className="button primary wide"
                disabled={busy}
                onClick={() => void clean()}
              >
                {busy ? "Cleaning…" : `Clean ${label} properties`}
              </button>
            )}
            {result && (
              <>
                <div className="result-heading">
                  <FileText aria-hidden="true" />
                  <h3>Output verified</h3>
                </div>
                <p className="panel-intro">
                  Removed {result.verification.removed.length} supported
                  properties. Remaining supported properties:{" "}
                  {result.verification.remaining.length}.
                </p>
                {result.verification.removed.length > 0 && <p className="panel-intro">Removed fields: {result.verification.removed.join(", ")}</p>}
                <button className="button primary wide" onClick={download}>
                  <Download aria-hidden="true" /> Download clean copy
                </button>
                <div className="verification-card">
                  <h3>Verification report</h3>
                  {result.verification.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept={
          kind === "pdf"
            ? "application/pdf,.pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
        }
        onChange={(event) => {
          const next = event.target.files?.[0];
          event.target.value = "";
          if (next) void choose(next);
        }}
      />
    </section>
  );
}
function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
