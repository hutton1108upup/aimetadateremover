/// <reference lib="webworker" />
import { cleanImage } from "@/lib/image-metadata-core/clean";
import { scanImage } from "@/lib/image-metadata-core/scan";
import { verifyClean } from "@/lib/image-metadata-core/verify";
import type { WorkerRequest, WorkerResponse } from "@/lib/image-metadata-core/types";

const worker = self as unknown as DedicatedWorkerGlobalScope;
const canceled = new Set<string>();

worker.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type === "cancel") { canceled.add(request.requestId); return; }
  const progress: WorkerResponse = { type: "progress", requestId: request.requestId, stage: request.type === "scan" ? "scanning" : "cleaning" };
  worker.postMessage(progress);
  try {
    if (request.type === "scan") {
      const result = await scanImage(request.buffer);
      if (!canceled.has(request.requestId)) worker.postMessage({ type: "scan_result", requestId: request.requestId, result } satisfies WorkerResponse);
      return;
    }
    const before = await scanImage(request.buffer);
    const clean = await cleanImage(request.buffer, request.policy);
    if (!clean.ok || !clean.output) throw Object.assign(new Error(clean.safeMessage), { code: clean.errorCode });
    const verification = await verifyClean(before, clean.output, request.policy);
    if (!canceled.has(request.requestId)) {
      worker.postMessage({ type: "clean_result", requestId: request.requestId, result: clean, verification } satisfies WorkerResponse, [clean.output]);
    }
  } catch (error) {
    const issue = error as Error & { code?: string };
    worker.postMessage({ type: "error", requestId: request.requestId, code: issue.code ?? "processing_failed", safeMessage: issue.message || "This image could not be processed safely.", retryable: false } satisfies WorkerResponse);
  } finally {
    canceled.delete(request.requestId);
  }
};
