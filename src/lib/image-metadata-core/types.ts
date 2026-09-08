export type ImageFormat = "jpeg" | "png" | "webp";
export type FindingStatus = "action" | "review" | "informational";
export type CleanMode = "ai_workflow" | "privacy" | "full";
export type FileStage =
  | "queued"
  | "validating"
  | "scanning"
  | "ready_for_action"
  | "cleaning"
  | "verifying"
  | "ready"
  | "unsupported"
  | "failed";

export type MetadataCategory =
  | "ai_workflow"
  | "location"
  | "camera"
  | "creator"
  | "software"
  | "provenance"
  | "color"
  | "structure";

export interface Finding {
  id: string;
  label: string;
  category: MetadataCategory;
  status: FindingStatus;
  description: string;
  suggestedAction: string;
  removalImpact: string;
  rawKey?: string;
  rawValue?: string;
}

export interface ImageProperties {
  width?: number;
  height?: number;
  hasTransparency?: boolean;
  hasAnimation?: boolean;
  hasIcc?: boolean;
  orientation?: number;
}

export interface ScanResult {
  format: ImageFormat;
  findings: Finding[];
  properties: ImageProperties;
  warnings: string[];
  cleanSupport: "supported" | "scan_only" | "limited";
}

export interface CleanPolicy {
  mode: CleanMode;
  removeC2pa: boolean;
  removeColorProfile: boolean;
}

export interface MutationRecord {
  kind: "removed" | "preserved" | "unsupported";
  category: MetadataCategory;
  label: string;
}

export interface CleanResult {
  ok: boolean;
  output?: ArrayBuffer;
  mutations: MutationRecord[];
  errorCode?: string;
  safeMessage?: string;
  encodedPayloadReencoded: false;
}

export type VerificationState = "removed" | "preserved" | "still_present" | "unsupported" | "review_needed";

export interface VerificationItem {
  label: string;
  before: "found" | "not_found";
  after: VerificationState;
}

export interface VerificationResult {
  items: VerificationItem[];
  outputScan: ScanResult;
  encodedPayloadReencoded: false;
  dimensionsChanged?: boolean;
  iccPreserved?: boolean;
  transparencyPreserved?: boolean;
  encodedPayloadPreserved?: boolean;
  orientationPreserved?: boolean;
}

export type WorkerRequest =
  | { type: "scan"; requestId: string; fileId: string; buffer: ArrayBuffer }
  | { type: "clean"; requestId: string; fileId: string; buffer: ArrayBuffer; policy: CleanPolicy }
  | { type: "cancel"; requestId: string };

export type WorkerResponse =
  | { type: "progress"; requestId: string; stage: FileStage; percent?: number }
  | { type: "scan_result"; requestId: string; result: ScanResult }
  | { type: "clean_result"; requestId: string; result: CleanResult; verification: VerificationResult }
  | { type: "error"; requestId: string; code: string; safeMessage: string; retryable: boolean };
