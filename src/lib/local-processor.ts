import { cleanImage } from "./image-metadata-core/clean";
import { scanImage } from "./image-metadata-core/scan";
import { verifyClean } from "./image-metadata-core/verify";
import type { CleanPolicy, CleanResult, ScanResult, VerificationResult, WorkerRequest, WorkerResponse } from "./image-metadata-core/types";

function requestId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

async function throughWorker(request: WorkerRequest, signal?: AbortSignal): Promise<WorkerResponse> {
  return new Promise((resolve, reject) => {
    if(signal?.aborted) { reject(new DOMException("Canceled", "AbortError")); return; }
    const instance = new Worker(new URL("../workers/metadata.worker.ts", import.meta.url), { type: "module" });
    const stop = () => { clearTimeout(timeout); signal?.removeEventListener("abort",abort); instance.terminate(); };
    const abort = () => { stop(); reject(new DOMException("Canceled", "AbortError")); };
    const timeout=setTimeout(()=>{stop();reject(Object.assign(new Error("Local processing timed out. Try a smaller file."),{code:"processing_timeout"}));},60_000);
    signal?.addEventListener("abort",abort,{once:true});
    instance.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.requestId !== request.requestId || event.data.type === "progress") return;
      stop();
      resolve(event.data);
    };
    instance.onerror = instance.onmessageerror = () => { stop(); reject(new Error("The local processing worker stopped unexpectedly.")); };
    const transfers = "buffer" in request ? [request.buffer] : [];
    try { instance.postMessage(request, transfers); } catch(error) { stop();reject(error); }
  });
}

export async function scanLocally(buffer: ArrayBuffer, signal?: AbortSignal): Promise<ScanResult> {
  signal?.throwIfAborted();
  if (typeof Worker === "undefined") return scanImage(buffer);
  const response = await throughWorker({ type: "scan", requestId: requestId(), fileId: "local", buffer },signal);
  if (response.type === "scan_result") return response.result;
  if (response.type === "error") throw Object.assign(new Error(response.safeMessage), { code: response.code });
  throw new Error("Unexpected worker response.");
}

export async function cleanLocally(buffer: ArrayBuffer, policy: CleanPolicy, signal?: AbortSignal): Promise<{ clean: CleanResult; verification: VerificationResult }> {
  signal?.throwIfAborted();
  if (typeof Worker === "undefined") {
    const before = await scanImage(buffer);
    const clean = await cleanImage(buffer, policy);
    if (!clean.ok || !clean.output) throw Object.assign(new Error(clean.safeMessage), { code: clean.errorCode });
    return { clean, verification: await verifyClean(before, clean.output, policy, buffer) };
  }
  const response = await throughWorker({ type: "clean", requestId: requestId(), fileId: "local", buffer, policy },signal);
  if (response.type === "clean_result") return { clean: response.result, verification: response.verification };
  if (response.type === "error") throw Object.assign(new Error(response.safeMessage), { code: response.code });
  throw new Error("Unexpected worker response.");
}

export async function validateBrowserImage(buffer: ArrayBuffer, mimeType: string) {
  if (typeof createImageBitmap !== "function") return;
  const bitmap = await createImageBitmap(new Blob([buffer], { type: mimeType }));
  try {
    if (bitmap.width < 1 || bitmap.height < 1) throw new Error("The image has invalid dimensions.");
  } finally { bitmap.close(); }
}
