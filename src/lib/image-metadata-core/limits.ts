export interface BatchLimits {
  maxFiles: number;
  maxFileBytes: number;
  maxBatchBytes: number;
  concurrency: number;
}

const MEGABYTE = 1024 * 1024;

export function getBatchLimits(viewportWidth: number): BatchLimits {
  return viewportWidth < 768
    ? { maxFiles: 10, maxFileBytes: 25 * MEGABYTE, maxBatchBytes: 100 * MEGABYTE, concurrency: 1 }
    : { maxFiles: 30, maxFileBytes: 25 * MEGABYTE, maxBatchBytes: 200 * MEGABYTE, concurrency: 2 };
}
