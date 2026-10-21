export type DocumentKind = "pdf" | "docx";

export interface DocumentProperty {
  key: string;
  label: string;
  value: string;
  source: "pdf-info" | "pdf-xmp" | "docx-core" | "docx-app" | "docx-custom";
}

export interface DocumentScan {
  kind: DocumentKind;
  properties: DocumentProperty[];
  warnings: string[];
  canClean: boolean;
}

export interface DocumentVerification {
  removed: string[];
  remaining: DocumentProperty[];
  warnings: string[];
}

export interface DocumentCleanResult {
  output: ArrayBuffer;
  scan: DocumentScan;
  verification: DocumentVerification;
}

export const DOCUMENT_LIMITS = {
  pdfBytes: 50 * 1024 * 1024,
  docxBytes: 50 * 1024 * 1024,
  docxEntries: 4000,
  docxExpandedBytes: 200 * 1024 * 1024,
} as const;
