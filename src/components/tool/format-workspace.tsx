"use client";

import { useState } from "react";
import { DocumentWorkspace } from "./document-workspace";
import { UnifiedImageWorkspace } from "./unified-image-workspace";

export function FormatWorkspace() {
  const [format, setFormat] = useState<"image" | "pdf" | "docx">("image");
  const tabs = [
    ["image", "Images"],
    ["pdf", "PDF"],
    ["docx", "Word (DOCX)"],
  ] as const;
  function onKeyDown(event: React.KeyboardEvent) {
    const index = tabs.findIndex(([value]) => value === format);
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index + tabs.length - 1) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : -1;
    if (next >= 0) {
      event.preventDefault();
      setFormat(tabs[next][0]);
      document.getElementById(`tab-${tabs[next][0]}`)?.focus();
    }
  }
  return (
    <div className="format-tool-card" id="choose-files">
      <div
        className="format-switcher"
        role="tablist"
        aria-label="Choose file format"
        onKeyDown={onKeyDown}
      >
        {tabs.map(([value, label]) => (
          <button
            key={value}
            id={`tab-${value}`}
            role="tab"
            tabIndex={format === value ? 0 : -1}
            aria-selected={format === value}
            aria-controls={`panel-${value}`}
            className={format === value ? "is-active" : ""}
            onClick={() => setFormat(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id={`panel-${format}`}
        role="tabpanel"
        aria-labelledby={`tab-${format}`}
      >
        {format === "image" ? (
          <UnifiedImageWorkspace
            key="image"
            variant="embedded"
            defaultMode="clean"
          />
        ) : (
          <DocumentWorkspace key={format} kind={format} />
        )}
      </div>
    </div>
  );
}
