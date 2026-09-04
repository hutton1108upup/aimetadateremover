import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("homepage", () => {
  it("puts the PRD outcome, local tool, and trust boundary in the first experience", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1, name: "Inspect and Clean AI Metadata Before You Publish" })).toBeVisible();
    expect(screen.getByText(/check prompts, workflows, c2pa, exif, gps and other image metadata locally/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /choose images/i })).toBeVisible();
    expect(screen.getByText("Free metadata tools")).toBeVisible();
    expect(screen.getByText("Original file preserved")).toBeVisible();
    expect(screen.getByRole("button", { name: /open navigation/i })).toBeVisible();
  });

  it("describes Humanize as unavailable rather than fabricating a result", () => {
    render(<Home />);
    expect(screen.getAllByText(/visual repair is not available yet/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/100% undetectable/i)).not.toBeInTheDocument();
  });
});
