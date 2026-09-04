import { describe, expect, it } from "vitest";
import { getBatchLimits } from "../limits";
import type { WorkerRequest, WorkerResponse } from "../types";

describe("browser processing limits", () => {
  it("keeps a desktop batch inside the PRD memory boundary", () => {
    expect(getBatchLimits(1440)).toEqual({
      maxFiles: 30,
      maxFileBytes: 25 * 1024 * 1024,
      maxBatchBytes: 200 * 1024 * 1024,
      concurrency: 2,
    });
  });

  it("reduces batch size and concurrency for a phone", () => {
    expect(getBatchLimits(390)).toEqual({
      maxFiles: 10,
      maxFileBytes: 25 * 1024 * 1024,
      maxBatchBytes: 100 * 1024 * 1024,
      concurrency: 1,
    });
  });
});

describe("worker protocol", () => {
  it("uses request ids on every command and response", () => {
    const requests: WorkerRequest[] = [
      { type: "scan", requestId: "a", fileId: "file", buffer: new ArrayBuffer(0) },
      {
        type: "clean",
        requestId: "b",
        fileId: "file",
        buffer: new ArrayBuffer(0),
        policy: { mode: "ai_workflow", removeC2pa: false, removeColorProfile: false },
      },
      { type: "cancel", requestId: "c" },
    ];
    const responses: WorkerResponse[] = [
      { type: "progress", requestId: "a", stage: "scanning" },
      { type: "error", requestId: "b", code: "invalid_file", safeMessage: "Unsupported image.", retryable: false },
    ];

    expect(requests.map((message) => message.requestId)).toEqual(["a", "b", "c"]);
    expect(responses.map((message) => message.requestId)).toEqual(["a", "b"]);
  });
});
